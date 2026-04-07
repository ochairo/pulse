import type { PulseMutation } from "../../contract/types.js";
import {
  ARRAY_LENGTH_SEGMENT,
  isPathPrefix,
  pathsMatch,
} from "../../path/index.js";
import { readChildState, readExistingValue } from "../../store/state.js";
import {
  createPulseBatchWriteState,
  setValueAtPath,
  setValueAtPathWithoutMutations,
} from "../../store/write.js";
import { collectMutations } from "../../store/mutations.js";
import {
  notifyOrQueueNodeTree,
  type DirectNodeNotificationValue,
} from "../batch/runtime.js";
import { hasListenerNodesInSubtree } from "../listener/topology.js";
import { collectAffectedListenerNodes } from "./notify-targets.js";
import {
  type RebuiltPathState,
  rebuildNodeAncestors,
  rebuildNodeAncestorsInBatch,
} from "./rebuild.js";
import {
  trySetDirectRootChildValueWithoutMutations,
  writeRootNodeValue,
} from "./root.js";
import {
  cacheNodeValueState,
  getOrCreateNormalizedChildNode,
  readChildNode,
  readNodePath,
  readNodeValueState,
  updateRuntimeRootValue,
  type PulseNodeState,
} from "../state/runtime.js";

export function writeNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  if (node.parent === null) {
    writeRootNodeValue(node, nextValue);
    return;
  }

  const hasListeners = hasListenerNodesInSubtree(node.runtime.rootNode);
  let nodePath: readonly PropertyKey[] | undefined;

  const readWritePath = (): readonly PropertyKey[] => {
    nodePath ??= readNodePath(node);
    return nodePath;
  };

  if (node.runtime.batchDepth === 0 && !hasListeners) {
    const directRootWrite = trySetDirectRootChildValueWithoutMutations(
      node,
      nextValue,
    );

    if (directRootWrite) {
      if (!directRootWrite.changed) {
        return;
      }

      updateRuntimeRootValue(node.runtime, directRootWrite.rootValue as never);
      cacheWrittenNodeState(node, nextValue);
      return;
    }
  }

  const previousRootValue = node.runtime.rootValue;
  const needsMutationAwareWrite =
    hasListeners && shouldCollectMutationsForWrite(node);

  if (node.runtime.batchDepth > 0) {
    node.runtime.batchWriteState ??= createPulseBatchWriteState(
      previousRootValue,
      node.runtime.batchVersion,
      hasListeners,
    );

    const writeResult =
      node.key === ARRAY_LENGTH_SEGMENT
        ? {
            ...setValueAtPathWithoutMutations(
              previousRootValue,
              readWritePath(),
              nextValue,
            ),
            affectedNodes: undefined,
            directNodeValue: undefined,
          }
        : setNodeValueInBatch(node, nextValue, node.runtime.batchWriteState);

    if (!writeResult.changed) {
      return;
    }

    updateRuntimeRootValue(node.runtime, writeResult.rootValue as never);
    refreshOrCacheWrittenPathStates(node, readRebuiltPathStates(writeResult));

    if (!needsMutationAwareWrite) {
      return;
    }

    const notificationError = notifyOrQueueNodeTree(
      node.runtime.rootNode,
      previousRootValue,
      writeResult.rootValue,
      [],
      readWritePath(),
      writeResult.affectedNodes,
      writeResult.directNodeValue,
    );

    if (notificationError !== undefined) {
      throw notificationError;
    }

    return;
  }

  if (!needsMutationAwareWrite) {
    const writeResult =
      node.key === ARRAY_LENGTH_SEGMENT
        ? setValueAtPathWithoutMutations(
            previousRootValue,
            readWritePath(),
            nextValue,
          )
        : setNodeValueWithoutMutations(node, nextValue);

    if (!writeResult.changed) {
      return;
    }

    updateRuntimeRootValue(node.runtime, writeResult.rootValue as never);
    refreshOrCacheWrittenPathStates(node, readRebuiltPathStates(writeResult));
    return;
  }

  const writeResult =
    node.key === ARRAY_LENGTH_SEGMENT
      ? {
          ...setValueAtPath(previousRootValue, readWritePath(), nextValue),
          affectedNodes: undefined,
          directNodeValue: undefined,
        }
      : setNodeValueWithMutations(node, nextValue);
  const nextRootValue = writeResult.rootValue;

  if (Object.is(previousRootValue, nextRootValue)) {
    return;
  }

  const mutations = writeResult.mutations;
  if (mutations.length === 0) {
    return;
  }

  updateRuntimeRootValue(node.runtime, nextRootValue as never);
  refreshOrCacheWrittenPathStates(node, readRebuiltPathStates(writeResult));
  const notificationError = notifyOrQueueNodeTree(
    node.runtime.rootNode,
    previousRootValue,
    nextRootValue,
    mutations,
    readWritePath(),
    writeResult.affectedNodes,
    writeResult.directNodeValue,
  );

  if (notificationError !== undefined) {
    throw notificationError;
  }
}

interface NodeWriteResult {
  readonly affectedNodes:
    | readonly PulseNodeState<unknown, unknown>[]
    | undefined;
  readonly changed: boolean;
  readonly directNodeValue: DirectNodeNotificationValue | undefined;
  readonly pathStates: readonly RebuiltPathState[];
  readonly rootValue: unknown;
  readonly mutations: readonly PulseMutation[];
}

function cacheWrittenNodeState<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  cacheNodeValueState(node, readExistingValue(nextValue));
}

function cacheWrittenPathStates(pathStates: readonly RebuiltPathState[]): void {
  for (const pathState of pathStates) {
    cacheNodeValueState(pathState.node, readExistingValue(pathState.value));
  }
}

function refreshOrCacheWrittenPathStates<T>(
  node: PulseNodeState<unknown, T>,
  pathStates: readonly RebuiltPathState[] | undefined,
): void {
  if (pathStates) {
    cacheWrittenPathStates(pathStates);
    return;
  }

  refreshWrittenPathNodeStates(node);
}

function readRebuiltPathStates(
  value: unknown,
): readonly RebuiltPathState[] | undefined {
  if (typeof value !== "object" || value === null || !("pathStates" in value)) {
    return undefined;
  }

  return (value as { pathStates?: readonly RebuiltPathState[] }).pathStates;
}

function refreshWrittenPathNodeStates<T>(
  node: PulseNodeState<unknown, T>,
): void {
  const pathNodes: PulseNodeState<unknown, unknown>[] = [];
  let currentNode: PulseNodeState<unknown, unknown> | null =
    node as PulseNodeState<unknown, unknown>;

  while (currentNode) {
    pathNodes.push(currentNode);
    currentNode = currentNode.parent;
  }

  pathNodes.reverse();

  let parentValueState = readExistingValue(node.runtime.rootValue);

  for (let index = 1; index < pathNodes.length; index += 1) {
    const childNode = pathNodes[index] as PulseNodeState<unknown, unknown>;
    const childKey = childNode.key;

    if (childKey === null) {
      continue;
    }

    const childValueState =
      childKey === ARRAY_LENGTH_SEGMENT && Array.isArray(parentValueState.value)
        ? readExistingValue(parentValueState.value.length)
        : readChildState(
            parentValueState.exists ? parentValueState.value : undefined,
            childKey,
          );

    cacheNodeValueState(childNode, childValueState);
    parentValueState = childValueState;
  }
}

function setNodeValueWithoutMutations<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): {
  changed: boolean;
  pathStates: readonly RebuiltPathState[];
  rootValue: unknown;
} {
  const directRootWrite = trySetDirectRootChildValueWithoutMutations(
    node,
    nextValue,
  );

  if (directRootWrite) {
    return {
      ...directRootWrite,
      pathStates: [
        {
          node: node as PulseNodeState<unknown, unknown>,
          value: nextValue,
        },
      ],
    };
  }

  const currentNodeState = readNodeValueState(node);

  if (currentNodeState.exists && Object.is(currentNodeState.value, nextValue)) {
    return {
      changed: false,
      pathStates: [],
      rootValue: node.runtime.rootValue,
    };
  }

  const rebuildResult = rebuildNodeAncestors(node, nextValue);

  return {
    changed: true,
    pathStates: rebuildResult.pathStates,
    rootValue: rebuildResult.rootValue,
  };
}

function setNodeValueWithMutations<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): NodeWriteResult {
  const currentNodeState = readNodeValueState(node);

  if (currentNodeState.exists && Object.is(currentNodeState.value, nextValue)) {
    return {
      affectedNodes: undefined,
      changed: false,
      directNodeValue: undefined,
      pathStates: [],
      rootValue: node.runtime.rootValue,
      mutations: [],
    };
  }

  const mutations: PulseMutation[] = [];
  collectMutations(
    currentNodeState,
    readExistingValue(nextValue),
    readNodePath(node),
    mutations,
  );

  if (mutations.length === 0) {
    return {
      affectedNodes: undefined,
      changed: false,
      directNodeValue: undefined,
      pathStates: [],
      rootValue: node.runtime.rootValue,
      mutations: [],
    };
  }

  stabilizeMutationPaths(node, mutations);
  const rebuildResult = rebuildNodeAncestors(node, nextValue, mutations);

  return {
    changed: true,
    directNodeValue: {
      currentValue: nextValue,
      node: node as PulseNodeState<unknown, unknown>,
      previousValue: currentNodeState.value,
    },
    rootValue: rebuildResult.rootValue,
    pathStates: rebuildResult.pathStates,
    mutations,
    affectedNodes: collectAffectedListenerNodes(
      node,
      rebuildResult.lengthNodes,
    ),
  };
}

function setNodeValueInBatch<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
  batchState: ReturnType<typeof createPulseBatchWriteState>,
): {
  changed: boolean;
  rootValue: unknown;
  affectedNodes: readonly PulseNodeState<unknown, unknown>[] | undefined;
  directNodeValue: DirectNodeNotificationValue | undefined;
  pathStates: readonly RebuiltPathState[];
} {
  const currentNodeState = readNodeValueState(node);

  if (currentNodeState.exists && Object.is(currentNodeState.value, nextValue)) {
    return {
      changed: false,
      rootValue: batchState.rootValue,
      affectedNodes: undefined,
      directNodeValue: undefined,
      pathStates: [],
    };
  }

  const mutations: PulseMutation[] = [];

  if (batchState.canAccumulateMutations) {
    collectMutations(
      currentNodeState,
      readExistingValue(nextValue),
      readNodePath(node),
      mutations,
    );

    if (mutations.length === 0) {
      return {
        changed: false,
        rootValue: batchState.rootValue,
        affectedNodes: undefined,
        directNodeValue: undefined,
        pathStates: [],
      };
    }

    stabilizeMutationPaths(node, mutations);
  }

  const rebuildResult = rebuildNodeAncestorsInBatch(
    node,
    nextValue,
    batchState,
    mutations,
  );
  batchState.rootValue = rebuildResult.rootValue;

  if (batchState.canAccumulateMutations) {
    for (const mutation of mutations) {
      recordPendingMutation(batchState, mutation);
    }
  }

  return {
    changed: true,
    rootValue: rebuildResult.rootValue,
    pathStates: rebuildResult.pathStates,
    directNodeValue: {
      currentValue: nextValue,
      node: node as PulseNodeState<unknown, unknown>,
      previousValue: currentNodeState.value,
    },
    affectedNodes: collectAffectedListenerNodes(
      node,
      rebuildResult.lengthNodes,
    ),
  };
}

function stabilizeMutationPaths<T>(
  node: PulseNodeState<unknown, T>,
  mutations: PulseMutation[],
): void {
  for (let index = 0; index < mutations.length; index += 1) {
    const mutation = mutations[index] as PulseMutation;
    const stablePath = readStableMutationPath(node, mutation.path);

    if (stablePath === mutation.path) {
      continue;
    }

    mutations[index] =
      mutation.kind === "delete"
        ? {
            kind: "delete",
            path: stablePath,
            key:
              stablePath.length === 0
                ? undefined
                : stablePath[stablePath.length - 1],
            previousValue: mutation.previousValue,
          }
        : {
            kind: mutation.kind,
            path: stablePath,
            key:
              stablePath.length === 0
                ? undefined
                : stablePath[stablePath.length - 1],
            value: mutation.value,
            previousValue: mutation.previousValue,
          };
  }
}

function readStableMutationPath<T>(
  node: PulseNodeState<unknown, T>,
  path: readonly PropertyKey[],
): readonly PropertyKey[] {
  const nodePath = readNodePath(node);

  if (pathsMatch(nodePath, path)) {
    return nodePath;
  }

  if (!isPathPrefix(nodePath, path)) {
    return path;
  }

  let currentNode = node as PulseNodeState<unknown, unknown>;

  for (let index = nodePath.length; index < path.length; index += 1) {
    const segment = path[index] as PropertyKey;
    const currentValueState = readNodeValueState(currentNode);
    const currentValue = currentValueState.exists
      ? currentValueState.value
      : undefined;

    currentNode = getOrCreateNormalizedChildNode(
      currentNode,
      segment,
      currentValue,
    );
  }

  return readNodePath(currentNode);
}

function recordPendingMutation(
  batchState: ReturnType<typeof createPulseBatchWriteState>,
  mutation: PulseMutation,
): void {
  const existingMutation = batchState.pendingMutations.get(mutation.path);
  const nextValue = mutation.kind === "delete" ? undefined : mutation.value;

  if (!existingMutation) {
    batchState.pendingMutations.set(mutation.path, mutation);
    return;
  }

  if (Object.is(existingMutation.previousValue, nextValue)) {
    batchState.pendingMutations.delete(mutation.path);
    return;
  }

  if (mutation.kind === "delete") {
    batchState.pendingMutations.set(mutation.path, {
      kind: "delete",
      path: mutation.path,
      key: mutation.key,
      previousValue: existingMutation.previousValue,
    });
    return;
  }

  batchState.pendingMutations.set(mutation.path, {
    kind: existingMutation.previousValue === undefined ? "set" : "replace",
    path: mutation.path,
    key: mutation.key,
    value: mutation.value,
    previousValue: existingMutation.previousValue,
  });
}

function shouldCollectMutationsForWrite<T>(
  node: PulseNodeState<unknown, T>,
): boolean {
  if (node.parent === null) {
    return true;
  }

  if (hasListenerNodesInSubtree(node)) {
    return true;
  }

  if (node.key === ARRAY_LENGTH_SEGMENT) {
    return node.parent ? hasListenerNodesInSubtree(node.parent) : false;
  }

  if (
    node.ancestorLengthListenerVersion === node.runtime.lengthListenerVersion
  ) {
    return node.ancestorHasLengthListener;
  }

  let currentNode: PulseNodeState<unknown, unknown> | null = node.parent;
  let ancestorHasLengthListener = false;

  while (currentNode) {
    const lengthNode = readChildNode(currentNode, ARRAY_LENGTH_SEGMENT);

    if (lengthNode && hasListenerNodesInSubtree(lengthNode)) {
      ancestorHasLengthListener = true;
      break;
    }

    currentNode = currentNode.parent;
  }

  node.ancestorHasLengthListener = ancestorHasLengthListener;
  node.ancestorLengthListenerVersion = node.runtime.lengthListenerVersion;
  return ancestorHasLengthListener;
}
