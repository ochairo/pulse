import type { PulseChangeEvent, PulseMutation } from "../../contract/types.js";
import type { DirectNodeNotificationValue } from "../batch/runtime.js";
import {
  ARRAY_LENGTH_SEGMENT,
  isPathPrefix,
  pathsMatch,
  toPublicPulseMutation,
} from "../../path/index.js";
import {
  dispatchPulseListeners,
  shouldDispatchToExactPath,
} from "../listener/dispatch.js";
import {
  hasDescendantListenerNodes,
  hasLocalListeners,
  hasListenerNodesInSubtree,
  hasOnlyLocalListenerNode,
  readListenerSnapshot,
  readSingleListenerEntry,
} from "../listener/topology.js";
import {
  forEachChildNode,
  readChildNode,
  readNodePath,
  type PulseNodeState,
} from "../state/runtime.js";
import {
  readExactNodeMutationValues,
  readResolvedNodeValue,
  resolveExactPaths,
  toPublicPulseMutations,
} from "./values.js";

const SIMPLE_SPECIFIC_NOTIFY_PAIR_LIMIT = 64;

export function notifyNodeTree(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  triggerPaths?: readonly (readonly PropertyKey[])[],
): unknown {
  if (!hasListenerNodesInSubtree(node)) {
    return undefined;
  }

  const exactPaths = resolveExactPaths(triggerPaths, mutations);

  if (hasOnlyLocalListenerNode(node)) {
    return notifyNodeForMutations(
      node,
      previousRootValue,
      currentRootValue,
      mutations,
      exactPaths,
    );
  }

  return notifyMutationBuckets(
    collectNodeMutationBuckets(node, mutations),
    previousRootValue,
    currentRootValue,
    exactPaths,
  );
}

export function notifySpecificNodes(
  nodes: readonly PulseNodeState<unknown, unknown>[],
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  triggerPaths?: readonly (readonly PropertyKey[])[],
  directNodeValue?: DirectNodeNotificationValue,
): unknown {
  if (nodes.length === 0) {
    return undefined;
  }

  const exactPaths = resolveExactPaths(triggerPaths, mutations);

  if (nodes.length === 1) {
    const [node] = nodes;

    return node
      ? notifyNodeFromMutationScan(
          node,
          previousRootValue,
          currentRootValue,
          mutations,
          exactPaths,
          new Map(),
          new Map(),
          readDirectNodeValue(node, directNodeValue),
        )
      : undefined;
  }

  if (nodes.length * mutations.length <= SIMPLE_SPECIFIC_NOTIFY_PAIR_LIMIT) {
    return notifySpecificNodesDirect(
      nodes,
      previousRootValue,
      currentRootValue,
      mutations,
      exactPaths,
      directNodeValue,
    );
  }

  const previousValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();
  const currentValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();
  let firstError: unknown;
  const buckets = collectSpecificNodeMutationBuckets(nodes, mutations);

  for (const bucket of buckets) {
    const nodeError = notifyNodeForMutations(
      bucket.node,
      previousRootValue,
      currentRootValue,
      bucket.mutations,
      exactPaths,
      previousValueCache,
      currentValueCache,
      readDirectNodeValue(bucket.node, directNodeValue),
    );

    firstError ??= nodeError;
  }

  return firstError;
}

function notifySpecificNodesDirect(
  nodes: readonly PulseNodeState<unknown, unknown>[],
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  exactPaths: readonly (readonly PropertyKey[])[],
  directNodeValue?: DirectNodeNotificationValue,
): unknown {
  const previousValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();
  const currentValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();
  let firstError: unknown;

  for (const node of nodes) {
    const nodeError = notifyNodeFromMutationScan(
      node,
      previousRootValue,
      currentRootValue,
      mutations,
      exactPaths,
      previousValueCache,
      currentValueCache,
      readDirectNodeValue(node, directNodeValue),
    );

    firstError ??= nodeError;
  }

  return firstError;
}

function collectSpecificNodeMutationBuckets(
  nodes: readonly PulseNodeState<unknown, unknown>[],
  mutations: readonly PulseMutation[],
): readonly NodeMutationBucket[] {
  if (nodes.length === 0 || mutations.length === 0) {
    return [];
  }

  const rootNode = nodes[0]?.runtime.rootNode;

  if (!rootNode) {
    return [];
  }

  const targetNodes = new Set(nodes);
  const orderedBuckets = nodes.map((node) => ({
    node,
    mutations: [] as PulseMutation[],
  }));
  const bucketsByNode = new Map(
    orderedBuckets.map((bucket) => [bucket.node, bucket] as const),
  );
  const rootCacheEntry: ListenerTreePathCacheEntry = {
    children: new Map(),
    node: rootNode,
  };
  const descendantNodeCache = new Map<
    PulseNodeState<unknown, unknown>,
    readonly PulseNodeState<unknown, unknown>[]
  >();
  const descendantMutationsByFrontier = new Map<
    PulseNodeState<unknown, unknown>,
    PulseMutation[]
  >();

  for (const mutation of mutations) {
    let currentNode: PulseNodeState<unknown, unknown> | undefined = rootNode;
    let cacheEntry = rootCacheEntry;

    collectSpecificNodeMutation(
      currentNode,
      mutation,
      targetNodes,
      bucketsByNode,
    );

    for (const segment of mutation.path) {
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
        break;
      }

      collectSpecificNodeMutation(
        currentNode,
        mutation,
        targetNodes,
        bucketsByNode,
      );
    }

    if (currentNode && hasDescendantListenerNodes(currentNode)) {
      let descendantMutations = descendantMutationsByFrontier.get(currentNode);

      if (!descendantMutations) {
        descendantMutations = [];
        descendantMutationsByFrontier.set(currentNode, descendantMutations);
      }

      descendantMutations.push(mutation);
    }
  }

  for (const [
    frontierNode,
    frontierMutations,
  ] of descendantMutationsByFrontier) {
    const descendantNodes = readSpecificDescendantListenerNodes(
      frontierNode,
      targetNodes,
      descendantNodeCache,
    );

    for (const descendantNode of descendantNodes) {
      const bucket = bucketsByNode.get(descendantNode);

      if (!bucket) {
        continue;
      }

      for (const mutation of frontierMutations) {
        bucket.mutations.push(mutation);
      }
    }
  }

  return orderedBuckets.filter((bucket) => bucket.mutations.length > 0);
}

function notifyMutationBuckets(
  buckets: readonly NodeMutationBucket[],
  previousRootValue: unknown,
  currentRootValue: unknown,
  exactPaths: readonly (readonly PropertyKey[])[],
): unknown {
  let firstError: unknown;
  const previousValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();
  const currentValueCache = new Map<
    PulseNodeState<unknown, unknown>,
    unknown
  >();

  for (const bucket of buckets) {
    if (bucket.mutations.length === 0) {
      continue;
    }

    const nodeError = notifyNodeForMutations(
      bucket.node,
      previousRootValue,
      currentRootValue,
      bucket.mutations,
      exactPaths,
      previousValueCache,
      currentValueCache,
    );
    firstError ??= nodeError;
  }

  return firstError;
}

function collectNodeMutationBuckets(
  node: PulseNodeState<unknown, unknown>,
  mutations: readonly PulseMutation[],
): NodeMutationBucket[] {
  const bucketsByNode = new Map<
    PulseNodeState<unknown, unknown>,
    NodeMutationBucket
  >();
  const orderedBuckets: NodeMutationBucket[] = [];
  const rootCacheEntry: ListenerTreePathCacheEntry = {
    children: new Map(),
    node,
  };
  const descendantNodeCache = new Map<
    PulseNodeState<unknown, unknown>,
    readonly PulseNodeState<unknown, unknown>[]
  >();
  const descendantMutationsByFrontier = new Map<
    PulseNodeState<unknown, unknown>,
    PulseMutation[]
  >();

  for (const mutation of mutations) {
    let currentNode: PulseNodeState<unknown, unknown> | undefined = node;
    let cacheEntry = rootCacheEntry;

    collectNodeMutation(currentNode, mutation, bucketsByNode, orderedBuckets);

    for (const segment of mutation.path) {
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
        break;
      }

      collectNodeMutation(currentNode, mutation, bucketsByNode, orderedBuckets);
    }

    if (currentNode && hasDescendantListenerNodes(currentNode)) {
      let descendantMutations = descendantMutationsByFrontier.get(currentNode);

      if (!descendantMutations) {
        descendantMutations = [];
        descendantMutationsByFrontier.set(currentNode, descendantMutations);
      }

      descendantMutations.push(mutation);
    }
  }

  for (const [
    frontierNode,
    frontierMutations,
  ] of descendantMutationsByFrontier) {
    const descendantNodes = readDescendantListenerNodes(
      frontierNode,
      descendantNodeCache,
    );

    for (const descendantNode of descendantNodes) {
      collectNodeMutations(
        descendantNode,
        frontierMutations,
        bucketsByNode,
        orderedBuckets,
      );
    }
  }

  return orderedBuckets;
}

interface NodeMutationBucket {
  readonly node: PulseNodeState<unknown, unknown>;
  readonly mutations: PulseMutation[];
}

interface ListenerTreePathCacheEntry {
  children: Map<PropertyKey, ListenerTreePathCacheEntry>;
  node: PulseNodeState<unknown, unknown> | undefined;
}

function collectDescendantMutations(
  node: PulseNodeState<unknown, unknown>,
  descendants: PulseNodeState<unknown, unknown>[],
): void {
  forEachChildNode(node, (childNode) => {
    if (!hasListenerNodesInSubtree(childNode)) {
      return;
    }

    if (hasLocalListeners(childNode)) {
      descendants.push(childNode);
    }

    collectDescendantMutations(childNode, descendants);
  });
}

function readDescendantListenerNodes(
  node: PulseNodeState<unknown, unknown>,
  descendantNodeCache: Map<
    PulseNodeState<unknown, unknown>,
    readonly PulseNodeState<unknown, unknown>[]
  >,
): readonly PulseNodeState<unknown, unknown>[] {
  const cachedDescendants = descendantNodeCache.get(node);

  if (cachedDescendants) {
    return cachedDescendants;
  }

  const descendants: PulseNodeState<unknown, unknown>[] = [];
  collectDescendantMutations(node, descendants);
  descendantNodeCache.set(node, descendants);
  return descendants;
}

function collectSpecificDescendantMutations(
  node: PulseNodeState<unknown, unknown>,
  targetNodes: ReadonlySet<PulseNodeState<unknown, unknown>>,
  descendants: PulseNodeState<unknown, unknown>[],
): void {
  forEachChildNode(node, (childNode) => {
    if (!hasListenerNodesInSubtree(childNode)) {
      return;
    }

    if (hasLocalListeners(childNode) && targetNodes.has(childNode)) {
      descendants.push(childNode);
    }

    collectSpecificDescendantMutations(childNode, targetNodes, descendants);
  });
}

function readSpecificDescendantListenerNodes(
  node: PulseNodeState<unknown, unknown>,
  targetNodes: ReadonlySet<PulseNodeState<unknown, unknown>>,
  descendantNodeCache: Map<
    PulseNodeState<unknown, unknown>,
    readonly PulseNodeState<unknown, unknown>[]
  >,
): readonly PulseNodeState<unknown, unknown>[] {
  const cachedDescendants = descendantNodeCache.get(node);

  if (cachedDescendants) {
    return cachedDescendants;
  }

  const descendants: PulseNodeState<unknown, unknown>[] = [];
  collectSpecificDescendantMutations(node, targetNodes, descendants);
  descendantNodeCache.set(node, descendants);
  return descendants;
}

function notifyNodeForMutations<T>(
  node: PulseNodeState<unknown, T>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  exactPaths: readonly (readonly PropertyKey[])[],
  previousValueCache?: Map<PulseNodeState<unknown, unknown>, unknown>,
  currentValueCache?: Map<PulseNodeState<unknown, unknown>, unknown>,
  directNodeValue?: { currentValue: unknown; previousValue: unknown },
): unknown {
  if (!hasLocalListeners(node)) {
    return undefined;
  }

  const nodePath = readNodePath(node);

  if (!shouldDispatchToExactPath(nodePath, exactPaths)) {
    return undefined;
  }

  const exactMutationValues = readExactNodeMutationValues(nodePath, mutations);
  const previousValue = directNodeValue
    ? directNodeValue.previousValue
    : exactMutationValues
      ? exactMutationValues.previousValue
      : readResolvedNodeValue(
          node,
          previousRootValue,
          previousValueCache ?? new Map(),
        );
  const currentValue = directNodeValue
    ? directNodeValue.currentValue
    : exactMutationValues
      ? exactMutationValues.currentValue
      : readResolvedNodeValue(
          node,
          currentRootValue,
          currentValueCache ?? new Map(),
        );

  if (Object.is(previousValue, currentValue)) {
    return undefined;
  }

  return notifyNodeListeners(node, {
    currentValue: currentValue as T,
    previousValue: previousValue as T,
    changes: toPublicPulseMutations(mutations),
  });
}

function notifyNodeFromMutationScan<T>(
  node: PulseNodeState<unknown, T>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
  exactPaths: readonly (readonly PropertyKey[])[],
  previousValueCache: Map<PulseNodeState<unknown, unknown>, unknown>,
  currentValueCache: Map<PulseNodeState<unknown, unknown>, unknown>,
  directNodeValue?: DirectNodeNotificationValue,
): unknown {
  if (!hasLocalListeners(node)) {
    return undefined;
  }

  const nodePath = readNodePath(node);

  if (!shouldDispatchToExactPath(nodePath, exactPaths)) {
    return undefined;
  }

  let relevantMutationCount = 0;
  let firstRelevantMutation: PulseMutation | undefined;
  let exactMatchMutation: PulseMutation | undefined;

  for (const mutation of mutations) {
    if (!isMutationRelevantToNode(nodePath, mutation)) {
      continue;
    }

    relevantMutationCount += 1;
    firstRelevantMutation ??= mutation;

    if (!exactMatchMutation && pathsMatch(nodePath, mutation.path)) {
      exactMatchMutation = mutation;
    }
  }

  if (relevantMutationCount === 0) {
    return undefined;
  }

  const singleExactMutation =
    relevantMutationCount === 1 && firstRelevantMutation === exactMatchMutation
      ? firstRelevantMutation
      : undefined;

  const previousValue = directNodeValue
    ? directNodeValue.previousValue
    : singleExactMutation
      ? singleExactMutation.previousValue
      : readResolvedNodeValue(node, previousRootValue, previousValueCache);
  const currentValue = directNodeValue
    ? directNodeValue.currentValue
    : singleExactMutation
      ? singleExactMutation.kind === "delete"
        ? undefined
        : singleExactMutation.value
      : readResolvedNodeValue(node, currentRootValue, currentValueCache);

  if (Object.is(previousValue, currentValue)) {
    return undefined;
  }

  return notifyNodeListeners(node, {
    currentValue: currentValue as T,
    previousValue: previousValue as T,
    changes: collectPublicRelevantMutations(
      nodePath,
      mutations,
      relevantMutationCount,
      firstRelevantMutation,
    ),
  });
}

function isMutationRelevantToNode(
  nodePath: readonly PropertyKey[],
  mutation: PulseMutation,
): boolean {
  return (
    isPathPrefix(nodePath, mutation.path) ||
    isPathPrefix(mutation.path, nodePath)
  );
}

function collectPublicRelevantMutations(
  nodePath: readonly PropertyKey[],
  mutations: readonly PulseMutation[],
  relevantMutationCount: number,
  firstRelevantMutation: PulseMutation | undefined,
): readonly PulseMutation[] {
  if (relevantMutationCount === mutations.length) {
    return toPublicPulseMutations(mutations);
  }

  if (relevantMutationCount === 1 && firstRelevantMutation) {
    return [toPublicRelevantMutation(firstRelevantMutation)];
  }

  const relevantMutations = new Array<PulseMutation>(relevantMutationCount);
  let writeIndex = 0;

  for (const mutation of mutations) {
    if (!isMutationRelevantToNode(nodePath, mutation)) {
      continue;
    }

    relevantMutations[writeIndex] = toPublicRelevantMutation(mutation);
    writeIndex += 1;
  }

  return relevantMutations;
}

function toPublicRelevantMutation(mutation: PulseMutation): PulseMutation {
  return mutation.path.includes(ARRAY_LENGTH_SEGMENT) ||
    mutation.key === ARRAY_LENGTH_SEGMENT
    ? toPublicPulseMutation(mutation)
    : mutation;
}

function collectNodeMutation(
  node: PulseNodeState<unknown, unknown>,
  mutation: PulseMutation,
  bucketsByNode: Map<PulseNodeState<unknown, unknown>, NodeMutationBucket>,
  orderedBuckets: NodeMutationBucket[],
): void {
  if (!hasLocalListeners(node)) {
    return;
  }

  const existingBucket = bucketsByNode.get(node);

  if (existingBucket) {
    existingBucket.mutations.push(mutation);
    return;
  }

  const bucket: NodeMutationBucket = {
    node,
    mutations: [mutation],
  };

  bucketsByNode.set(node, bucket);
  orderedBuckets.push(bucket);
}

function collectSpecificNodeMutation(
  node: PulseNodeState<unknown, unknown> | undefined,
  mutation: PulseMutation,
  targetNodes: ReadonlySet<PulseNodeState<unknown, unknown>>,
  bucketsByNode: ReadonlyMap<
    PulseNodeState<unknown, unknown>,
    NodeMutationBucket
  >,
): void {
  if (!node || !hasLocalListeners(node) || !targetNodes.has(node)) {
    return;
  }

  const bucket = bucketsByNode.get(node);

  if (!bucket) {
    return;
  }

  bucket.mutations.push(mutation);
}

function collectNodeMutations(
  node: PulseNodeState<unknown, unknown>,
  mutations: readonly PulseMutation[],
  bucketsByNode: Map<PulseNodeState<unknown, unknown>, NodeMutationBucket>,
  orderedBuckets: NodeMutationBucket[],
): void {
  for (const mutation of mutations) {
    collectNodeMutation(node, mutation, bucketsByNode, orderedBuckets);
  }
}

function notifyNodeListeners<T>(
  node: PulseNodeState<unknown, T>,
  event: PulseChangeEvent<T>,
): unknown {
  const singleListenerEntry = readSingleListenerEntry(node);
  const listenerSnapshot = readListenerSnapshot(node);

  return dispatchPulseListeners(
    node.listeners,
    event,
    singleListenerEntry,
    listenerSnapshot,
    listenerSnapshot ? () => node.listenerSnapshot : undefined,
    listenerSnapshot
      ? (entry) =>
          node.singleListenerEntry === entry || node.listeners.has(entry)
      : undefined,
  );
}

function readDirectNodeValue(
  node: PulseNodeState<unknown, unknown>,
  directNodeValue: DirectNodeNotificationValue | undefined,
): DirectNodeNotificationValue | undefined {
  return directNodeValue && directNodeValue.node === node
    ? directNodeValue
    : undefined;
}
