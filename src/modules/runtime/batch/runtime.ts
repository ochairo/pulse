import type { PulseMutation } from "../../contract/types.js";
import type { PulsePath } from "../../path/index.js";
import { collectPulseMutationsAtPaths } from "../../store/mutations.js";
import {
  notifyNodeTree,
  notifySpecificNodes,
  tryNotifySpecificNodesByExactMutations,
} from "../notify/runtime.js";
import { hasListenerNodesInSubtree } from "../listener/topology.js";
import {
  readChildNode,
  type PulseNodeState,
  type PulseRuntime,
} from "../state/runtime.js";

export interface DirectNodeNotificationValue {
  readonly currentValue: unknown;
  readonly node: PulseNodeState<unknown, unknown>;
  readonly previousValue: unknown;
}

interface ListenerPathCacheEntry {
  children: Map<PropertyKey, ListenerPathCacheEntry>;
  node: PulseNodeState<unknown, unknown> | undefined;
}

function createListenerPathMatcher(
  rootNode: PulseNodeState<unknown, unknown>,
): (path: PulsePath) => boolean {
  const rootCache: ListenerPathCacheEntry = {
    children: new Map(),
    node: rootNode,
  };

  return (path) => pathMayAffectListenersWithCache(rootNode, path, rootCache);
}

function pathMayAffectListenersWithCache(
  rootNode: PulseNodeState<unknown, unknown>,
  path: PulsePath,
  rootCache: ListenerPathCacheEntry,
): boolean {
  if (path.length === 0) {
    return hasListenerNodesInSubtree(rootNode);
  }

  let currentNode: PulseNodeState<unknown, unknown> | undefined = rootNode;
  let cacheEntry = rootCache;

  for (const segment of path) {
    let nextCacheEntry = cacheEntry.children.get(segment);

    if (!nextCacheEntry) {
      nextCacheEntry = {
        children: new Map(),
        node: currentNode ? readChildNode(currentNode, segment) : undefined,
      };
      cacheEntry.children.set(segment, nextCacheEntry);
    }

    cacheEntry = nextCacheEntry;
    currentNode = cacheEntry.node;

    if (!currentNode || !hasListenerNodesInSubtree(currentNode)) {
      return false;
    }
  }

  if (path[path.length - 1] === "length") {
    return currentNode.parent
      ? hasListenerNodesInSubtree(currentNode.parent)
      : false;
  }

  return hasListenerNodesInSubtree(currentNode);
}

export function batchPulseUpdates<T>(
  runtime: PulseRuntime<unknown>,
  callback: () => T,
): T {
  if (runtime.batchDepth === 0) {
    runtime.batchVersion += 1;
    runtime.batchWriteState = null;
  }

  runtime.batchDepth += 1;

  let result!: T;
  let callbackError: unknown;
  let hasCallbackError = false;

  try {
    result = callback();
  } catch (error) {
    hasCallbackError = true;
    callbackError = error;
  }

  runtime.batchDepth -= 1;

  let flushError: unknown;
  if (runtime.batchDepth === 0) {
    flushError = flushPendingNotifications(runtime);
    runtime.batchWriteState = null;
  }

  if (hasCallbackError) {
    throw callbackError;
  }

  if (flushError !== undefined) {
    throw flushError;
  }

  return result;
}

export function notifyOrQueueNodeTree(
  rootNode: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  changedPath?: PulsePath,
  affectedNodes?: readonly PulseNodeState<unknown, unknown>[],
  directNodeValue?: DirectNodeNotificationValue,
): unknown {
  const runtime = rootNode.runtime;

  if (runtime.batchDepth === 0) {
    if (affectedNodes && affectedNodes.length > 0) {
      return notifySpecificNodes(
        affectedNodes,
        previousRootValue,
        currentRootValue,
        mutations,
        changedPath ? [changedPath] : undefined,
        directNodeValue,
      );
    }

    return notifyNodeTree(
      rootNode,
      previousRootValue,
      currentRootValue,
      mutations,
      changedPath ? [changedPath] : undefined,
    );
  }

  const pending = runtime.pendingNotification;

  if (pending) {
    pending.currentRootValue = currentRootValue;

    if (changedPath) {
      addPendingChangedPath(pending, changedPath);
    }

    if (!affectedNodes || affectedNodes.length === 0) {
      pending.canNotifyDirectly = false;
      pending.directNodeValue = undefined;
      return undefined;
    }

    if (!pending.canNotifyDirectly) {
      pending.directNodeValue = undefined;
      return undefined;
    }

    addPendingAffectedNodes(pending, affectedNodes);

    pending.directNodeValue = mergePendingDirectNodeValue(
      pending.directNodeValue,
      readSinglePendingAffectedNode(pending),
      hasSinglePendingChangedPath(pending),
      directNodeValue,
    );

    return undefined;
  }

  runtime.pendingNotification = {
    affectedNodeSet:
      affectedNodes && affectedNodes.length > 1 ? new Set(affectedNodes) : null,
    affectedNodes:
      affectedNodes && affectedNodes.length > 1 ? [...affectedNodes] : null,
    canNotifyDirectly: Boolean(affectedNodes && affectedNodes.length > 0),
    changedPathSet: null,
    changedPaths: null,
    currentRootValue,
    directNodeValue: mergePendingDirectNodeValue(
      undefined,
      affectedNodes && affectedNodes.length === 1
        ? affectedNodes[0]
        : undefined,
      Boolean(changedPath),
      directNodeValue,
    ),
    previousRootValue,
    rootNode,
    singleAffectedNode:
      affectedNodes && affectedNodes.length === 1
        ? (affectedNodes[0] ?? null)
        : null,
    singleChangedPath: changedPath ?? null,
  };

  return undefined;
}

function flushPendingNotifications(runtime: PulseRuntime<unknown>): unknown {
  const pending = runtime.pendingNotification;
  const batchWriteState = runtime.batchWriteState;
  runtime.pendingNotification = null;

  if (!pending) {
    return undefined;
  }

  if (!hasListenerNodesInSubtree(pending.rootNode)) {
    return undefined;
  }

  if (
    pending.canNotifyDirectly &&
    hasPendingAffectedNodes(pending) &&
    batchWriteState &&
    batchWriteState.canAccumulateMutations
  ) {
    const affectedNodes = materializePendingAffectedNodes(pending);
    const changedPaths = materializePendingChangedPaths(pending);
    const directMutationMap = batchWriteState.pendingMutations;

    if (directMutationMap.size === 0) {
      return undefined;
    }

    const exactNotifyResult = tryNotifySpecificNodesByExactMutations(
      affectedNodes,
      directMutationMap,
      pending.directNodeValue,
    );

    if (exactNotifyResult.handled) {
      return exactNotifyResult.error;
    }

    const directMutations = Array.from(directMutationMap.values());

    return notifySpecificNodes(
      affectedNodes,
      pending.previousRootValue,
      pending.currentRootValue,
      directMutations,
      changedPaths,
      pending.directNodeValue,
    );
  }

  const mayAffectListeners = createListenerPathMatcher(pending.rootNode);

  const relevantChangedPaths: PulsePath[] = [];
  const changedPaths = materializePendingChangedPaths(pending);

  for (const path of changedPaths) {
    if (mayAffectListeners(path)) {
      relevantChangedPaths.push(path);
    }
  }

  const mutations =
    batchWriteState && batchWriteState.canAccumulateMutations
      ? collectRelevantBatchMutations(
          mayAffectListeners,
          batchWriteState.pendingMutations.values(),
        )
      : collectPulseMutationsAtPaths(
          pending.previousRootValue,
          pending.currentRootValue,
          relevantChangedPaths,
        );

  if (mutations.length === 0) {
    return undefined;
  }

  if (pending.canNotifyDirectly && hasPendingAffectedNodes(pending)) {
    const affectedNodes = materializePendingAffectedNodes(pending);

    return notifySpecificNodes(
      affectedNodes,
      pending.previousRootValue,
      pending.currentRootValue,
      mutations,
      relevantChangedPaths,
      pending.directNodeValue,
    );
  }

  return notifyNodeTree(
    pending.rootNode,
    pending.previousRootValue,
    pending.currentRootValue,
    mutations,
    relevantChangedPaths,
  );
}

function collectRelevantBatchMutations(
  mayAffectListeners: (path: PulsePath) => boolean,
  mutations: Iterable<PulseMutation>,
): PulseMutation[] {
  const relevantMutations: PulseMutation[] = [];

  for (const mutation of mutations) {
    if (mayAffectListeners(mutation.path)) {
      relevantMutations.push(mutation);
    }
  }

  return relevantMutations;
}

function mergePendingDirectNodeValue(
  existingDirectNodeValue: DirectNodeNotificationValue | undefined,
  affectedNode: PulseNodeState<unknown, unknown> | undefined,
  hasSingleChangedPath: boolean,
  nextDirectNodeValue: DirectNodeNotificationValue | undefined,
): DirectNodeNotificationValue | undefined {
  if (!affectedNode || !hasSingleChangedPath) {
    return undefined;
  }

  if (
    existingDirectNodeValue &&
    existingDirectNodeValue.node === affectedNode
  ) {
    if (!nextDirectNodeValue || nextDirectNodeValue.node !== affectedNode) {
      return undefined;
    }

    return {
      currentValue: nextDirectNodeValue.currentValue,
      node: affectedNode,
      previousValue: existingDirectNodeValue.previousValue,
    };
  }

  if (!nextDirectNodeValue || nextDirectNodeValue.node !== affectedNode) {
    return undefined;
  }

  return nextDirectNodeValue;
}

function addPendingChangedPath(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
  changedPath: PulsePath,
): void {
  const singleChangedPath = pending.singleChangedPath;

  if (!singleChangedPath && !pending.changedPaths) {
    pending.singleChangedPath = changedPath;
    return;
  }

  if (singleChangedPath === changedPath) {
    return;
  }

  let changedPathSet = pending.changedPathSet;
  let changedPaths = pending.changedPaths;

  if (!changedPathSet || !changedPaths) {
    changedPathSet = new Set<PulsePath>();
    changedPaths = [];

    if (singleChangedPath) {
      changedPathSet.add(singleChangedPath);
      changedPaths.push(singleChangedPath);
      pending.singleChangedPath = null;
    }

    pending.changedPathSet = changedPathSet;
    pending.changedPaths = changedPaths;
  }

  if (changedPathSet.has(changedPath)) {
    return;
  }

  changedPathSet.add(changedPath);
  changedPaths.push(changedPath);
}

function addPendingAffectedNodes(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
  affectedNodes: readonly PulseNodeState<unknown, unknown>[],
): void {
  if (affectedNodes.length === 1) {
    const [affectedNode] = affectedNodes;

    if (affectedNode) {
      addPendingAffectedNode(pending, affectedNode);
    }

    return;
  }

  for (const affectedNode of affectedNodes) {
    addPendingAffectedNode(pending, affectedNode);
  }
}

function addPendingAffectedNode(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
  affectedNode: PulseNodeState<unknown, unknown>,
): void {
  const singleAffectedNode = pending.singleAffectedNode;

  if (!singleAffectedNode && !pending.affectedNodes) {
    pending.singleAffectedNode = affectedNode;
    return;
  }

  if (singleAffectedNode === affectedNode) {
    return;
  }

  let affectedNodeSet = pending.affectedNodeSet;
  let affectedNodes = pending.affectedNodes;

  if (!affectedNodeSet || !affectedNodes) {
    affectedNodeSet = new Set<PulseNodeState<unknown, unknown>>();
    affectedNodes = [];

    if (singleAffectedNode) {
      affectedNodeSet.add(singleAffectedNode);
      affectedNodes.push(singleAffectedNode);
      pending.singleAffectedNode = null;
    }

    pending.affectedNodeSet = affectedNodeSet;
    pending.affectedNodes = affectedNodes;
  }

  if (affectedNodeSet.has(affectedNode)) {
    return;
  }

  affectedNodeSet.add(affectedNode);
  affectedNodes.push(affectedNode);
}

function hasPendingAffectedNodes(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
): boolean {
  return Boolean(pending.singleAffectedNode || pending.affectedNodes?.length);
}

function materializePendingAffectedNodes(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
): readonly PulseNodeState<unknown, unknown>[] {
  if (pending.affectedNodes) {
    return pending.affectedNodes;
  }

  return pending.singleAffectedNode ? [pending.singleAffectedNode] : [];
}

function materializePendingChangedPaths(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
): readonly PulsePath[] {
  if (pending.changedPaths) {
    return pending.changedPaths;
  }

  return pending.singleChangedPath ? [pending.singleChangedPath] : [];
}

function readSinglePendingAffectedNode(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
): PulseNodeState<unknown, unknown> | undefined {
  return pending.affectedNodes
    ? undefined
    : (pending.singleAffectedNode ?? undefined);
}

function hasSinglePendingChangedPath(
  pending: PulseRuntime<unknown>["pendingNotification"] extends infer T
    ? Exclude<T, null>
    : never,
): boolean {
  return !pending.changedPaths && pending.singleChangedPath !== null;
}
