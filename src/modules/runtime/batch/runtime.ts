import type { PulseMutation } from "../../contract/types.js";
import type { PulsePath } from "../../path/index.js";
import { collectPulseMutationsAtPaths } from "../../store/mutations.js";
import { notifyNodeTree, notifySpecificNodes } from "../notify/runtime.js";
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

    if (changedPath && !pending.changedPathSet.has(changedPath)) {
      pending.changedPathSet.add(changedPath);
      pending.changedPaths.push(changedPath);
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

    for (const node of affectedNodes) {
      if (pending.affectedNodeSet.has(node)) {
        continue;
      }

      pending.affectedNodeSet.add(node);
      pending.affectedNodes.push(node);
    }

    pending.directNodeValue = mergePendingDirectNodeValue(
      pending.directNodeValue,
      pending.affectedNodes,
      pending.changedPaths,
      directNodeValue,
    );

    return undefined;
  }

  runtime.pendingNotification = {
    affectedNodeSet: new Set(affectedNodes ?? []),
    affectedNodes: affectedNodes ? [...affectedNodes] : [],
    canNotifyDirectly: Boolean(affectedNodes && affectedNodes.length > 0),
    changedPathSet: changedPath ? new Set([changedPath]) : new Set(),
    changedPaths: changedPath ? [changedPath] : [],
    currentRootValue,
    directNodeValue: mergePendingDirectNodeValue(
      undefined,
      affectedNodes,
      changedPath ? [changedPath] : [],
      directNodeValue,
    ),
    previousRootValue,
    rootNode,
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
    pending.affectedNodes.length > 0 &&
    batchWriteState &&
    batchWriteState.canAccumulateMutations
  ) {
    const directMutations = Array.from(
      batchWriteState.pendingMutations.values(),
    );

    if (directMutations.length === 0) {
      return undefined;
    }

    return notifySpecificNodes(
      pending.affectedNodes,
      pending.previousRootValue,
      pending.currentRootValue,
      directMutations,
      undefined,
      pending.directNodeValue,
    );
  }

  const mayAffectListeners = createListenerPathMatcher(pending.rootNode);

  const relevantChangedPaths: PulsePath[] = [];

  for (const path of pending.changedPaths) {
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

  if (pending.canNotifyDirectly && pending.affectedNodes.length > 0) {
    return notifySpecificNodes(
      pending.affectedNodes,
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
  affectedNodes: readonly PulseNodeState<unknown, unknown>[] | undefined,
  changedPaths: readonly PulsePath[],
  nextDirectNodeValue: DirectNodeNotificationValue | undefined,
): DirectNodeNotificationValue | undefined {
  if (
    !affectedNodes ||
    affectedNodes.length !== 1 ||
    changedPaths.length !== 1
  ) {
    return undefined;
  }

  const [affectedNode] = affectedNodes;

  if (!affectedNode) {
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
