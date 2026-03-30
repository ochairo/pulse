import type { PulseChangeEvent, PulseMutation } from "../contract/types.js";
import { ARRAY_LENGTH_SEGMENT, toPublicPulseMutation } from "../path/index.js";
import { readValueAtPath } from "../store/state.js";
import { dispatchPulseListeners } from "./listener-dispatcher.js";
import type { PulseNodeState } from "./state.js";

export function notifyNodeTree(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
): unknown {
  if (node.listenerTreeSize === 0) {
    return undefined;
  }

  if (node.listenerTreeSize === node.listeners.size) {
    return notifyRootOnlyNode(
      node,
      previousRootValue,
      currentRootValue,
      mutations,
    );
  }

  if (mutations.length === 1) {
    const mutation = mutations[0];

    if (!mutation) {
      return undefined;
    }

    return notifySingleMutationTree(
      node,
      previousRootValue,
      currentRootValue,
      mutation,
    );
  }

  return notifyMultiMutationTree(
    node,
    previousRootValue,
    currentRootValue,
    mutations,
  );
}

function notifyMultiMutationTree(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
): unknown {
  const visitedNodes = new Set<PulseNodeState<unknown, unknown>>();
  const orderedNodes: Array<PulseNodeState<unknown, unknown>> = [];
  const relevantMutationsByNode = new Map<
    PulseNodeState<unknown, unknown>,
    PulseMutation[]
  >();

  for (const mutation of mutations) {
    let currentNode: PulseNodeState<unknown, unknown> | undefined = node;

    collectNodeMutation(
      currentNode,
      mutation,
      visitedNodes,
      orderedNodes,
      relevantMutationsByNode,
    );

    for (const segment of mutation.path) {
      currentNode = currentNode.children.get(segment);

      if (!currentNode || currentNode.listenerTreeSize === 0) {
        break;
      }

      collectNodeMutation(
        currentNode,
        mutation,
        visitedNodes,
        orderedNodes,
        relevantMutationsByNode,
      );
    }

    if (
      currentNode &&
      currentNode.listenerTreeSize > currentNode.listeners.size
    ) {
      collectDescendantMutations(
        currentNode,
        mutation,
        visitedNodes,
        orderedNodes,
        relevantMutationsByNode,
      );
    }
  }

  let firstError: unknown;

  for (const currentNode of orderedNodes) {
    const relevantMutations = relevantMutationsByNode.get(currentNode);

    if (!relevantMutations || relevantMutations.length === 0) {
      continue;
    }

    const nodeError = notifySingleNode(
      currentNode,
      previousRootValue,
      currentRootValue,
      relevantMutations,
    );
    firstError ??= nodeError;
  }

  return firstError;
}

function notifySingleMutationTree(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutation: PulseMutation,
): unknown {
  const publicChanges = [toPublicPulseMutation(mutation)] as const;
  let firstError = notifySingleNodeForMutation(
    node,
    previousRootValue,
    currentRootValue,
    publicChanges,
  );
  let currentNode: PulseNodeState<unknown, unknown> | undefined = node;

  for (const segment of mutation.path) {
    currentNode = currentNode.children.get(segment);

    if (!currentNode || currentNode.listenerTreeSize === 0) {
      return firstError;
    }

    const nodeError = notifySingleNodeForMutation(
      currentNode,
      previousRootValue,
      currentRootValue,
      publicChanges,
    );
    firstError ??= nodeError;
  }

  if (
    currentNode &&
    currentNode.listenerTreeSize > currentNode.listeners.size
  ) {
    const descendantError = notifyDescendantsForMutation(
      currentNode,
      previousRootValue,
      currentRootValue,
      publicChanges,
    );
    firstError ??= descendantError;
  }

  return firstError;
}

function collectDescendantMutations(
  node: PulseNodeState<unknown, unknown>,
  mutation: PulseMutation,
  visitedNodes: Set<PulseNodeState<unknown, unknown>>,
  orderedNodes: Array<PulseNodeState<unknown, unknown>>,
  relevantMutationsByNode: Map<
    PulseNodeState<unknown, unknown>,
    PulseMutation[]
  >,
): void {
  for (const childNode of node.children.values()) {
    if (childNode.listenerTreeSize === 0) {
      continue;
    }

    collectNodeMutation(
      childNode,
      mutation,
      visitedNodes,
      orderedNodes,
      relevantMutationsByNode,
    );

    collectDescendantMutations(
      childNode,
      mutation,
      visitedNodes,
      orderedNodes,
      relevantMutationsByNode,
    );
  }
}

function notifyDescendantsForMutation(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  publicChanges: readonly PulseMutation[],
): unknown {
  let firstError: unknown;

  for (const childNode of node.children.values()) {
    if (childNode.listenerTreeSize === 0) {
      continue;
    }

    const nodeError = notifySingleNodeForMutation(
      childNode,
      previousRootValue,
      currentRootValue,
      publicChanges,
    );
    firstError ??= nodeError;

    const descendantError = notifyDescendantsForMutation(
      childNode,
      previousRootValue,
      currentRootValue,
      publicChanges,
    );
    firstError ??= descendantError;
  }

  return firstError;
}

function notifySingleNode(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
): unknown {
  if (node.listeners.size === 0) {
    return undefined;
  }

  const previousValue = readValueAtPath(previousRootValue, node.path);
  const currentValue = readValueAtPath(currentRootValue, node.path);

  if (Object.is(previousValue, currentValue)) {
    return undefined;
  }

  return notifyNodeListeners(node, {
    currentValue,
    previousValue,
    changes: toPublicPulseMutations(mutations),
  });
}

function collectNodeMutation(
  node: PulseNodeState<unknown, unknown>,
  mutation: PulseMutation,
  visitedNodes: Set<PulseNodeState<unknown, unknown>>,
  orderedNodes: Array<PulseNodeState<unknown, unknown>>,
  relevantMutationsByNode: Map<
    PulseNodeState<unknown, unknown>,
    PulseMutation[]
  >,
): void {
  if (node.listeners.size === 0) {
    return;
  }

  let relevantMutations = relevantMutationsByNode.get(node);

  if (!relevantMutations) {
    relevantMutations = [];
    relevantMutationsByNode.set(node, relevantMutations);
  }

  relevantMutations.push(mutation);

  if (visitedNodes.has(node)) {
    return;
  }

  visitedNodes.add(node);
  orderedNodes.push(node);
}

function notifySingleNodeForMutation(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  publicChanges: readonly PulseMutation[],
): unknown {
  if (node.listeners.size === 0) {
    return undefined;
  }

  const previousValue = readValueAtPath(previousRootValue, node.path);
  const currentValue = readValueAtPath(currentRootValue, node.path);

  if (Object.is(previousValue, currentValue)) {
    return undefined;
  }

  return notifyNodeListeners(node, {
    currentValue,
    previousValue,
    changes: publicChanges,
  });
}

function notifyRootOnlyNode<T>(
  node: PulseNodeState<unknown, T>,
  previousRootValue: T,
  currentRootValue: T,
  mutations: readonly PulseMutation[],
): unknown {
  if (
    node.listeners.size === 0 ||
    Object.is(previousRootValue, currentRootValue)
  ) {
    return undefined;
  }

  return notifyNodeListeners(node, {
    currentValue: currentRootValue,
    previousValue: previousRootValue,
    changes: toPublicPulseMutations(mutations),
  });
}

function toPublicPulseMutations(
  mutations: readonly PulseMutation[],
): readonly PulseMutation[] {
  if (mutations.length === 0) {
    return mutations;
  }

  for (const mutation of mutations) {
    if (
      mutation.key === ARRAY_LENGTH_SEGMENT ||
      mutation.path.includes(ARRAY_LENGTH_SEGMENT)
    ) {
      if (mutations.length === 1) {
        const mutation = mutations[0];

        return mutation ? [toPublicPulseMutation(mutation)] : mutations;
      }

      return mutations.map(toPublicPulseMutation);
    }
  }

  return mutations;
}

function notifyNodeListeners<T>(
  node: PulseNodeState<unknown, T>,
  event: PulseChangeEvent<T>,
): unknown {
  return dispatchPulseListeners(node.listeners, event);
}
