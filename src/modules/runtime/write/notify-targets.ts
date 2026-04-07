import {
  hasDescendantListenerNodes,
  hasLocalListeners,
  hasListenerNodesInSubtree,
  hasOnlyLocalListenerNode,
} from "../listener/topology.js";
import { forEachChildNode, type PulseNodeState } from "../state/runtime.js";

export function collectAffectedListenerNodes<T>(
  node: PulseNodeState<unknown, T>,
  extraNodes: readonly PulseNodeState<unknown, unknown>[],
): readonly PulseNodeState<unknown, unknown>[] | undefined {
  if (!hasListenerNodesInSubtree(node)) {
    return collectExtraAffectedListenerNodes(extraNodes);
  }

  if (extraNodes.length === 0 && hasOnlyLocalListenerNode(node)) {
    return [node as PulseNodeState<unknown, unknown>];
  }

  const affectedNodes: PulseNodeState<unknown, unknown>[] = [];
  const seenNodes = new Set<PulseNodeState<unknown, unknown>>();

  collectListenerNodesInSubtree(
    node as PulseNodeState<unknown, unknown>,
    affectedNodes,
    seenNodes,
  );

  for (const extraNode of extraNodes) {
    collectListenerNodesInSubtree(extraNode, affectedNodes, seenNodes);
  }

  return affectedNodes.length > 0 ? affectedNodes : undefined;
}

function collectExtraAffectedListenerNodes(
  extraNodes: readonly PulseNodeState<unknown, unknown>[],
): readonly PulseNodeState<unknown, unknown>[] | undefined {
  if (extraNodes.length === 0) {
    return undefined;
  }

  if (extraNodes.length === 1) {
    const [extraNode] = extraNodes;

    if (!extraNode || !hasListenerNodesInSubtree(extraNode)) {
      return undefined;
    }

    return hasOnlyLocalListenerNode(extraNode)
      ? [extraNode]
      : collectAffectedListenerNodes(extraNode, []);
  }

  const affectedNodes: PulseNodeState<unknown, unknown>[] = [];
  const seenNodes = new Set<PulseNodeState<unknown, unknown>>();

  for (const extraNode of extraNodes) {
    collectListenerNodesInSubtree(extraNode, affectedNodes, seenNodes);
  }

  return affectedNodes.length > 0 ? affectedNodes : undefined;
}

function collectListenerNodesInSubtree(
  node: PulseNodeState<unknown, unknown>,
  affectedNodes: PulseNodeState<unknown, unknown>[],
  seenNodes: Set<PulseNodeState<unknown, unknown>>,
): void {
  if (!hasListenerNodesInSubtree(node)) {
    return;
  }

  if (hasLocalListeners(node) && !seenNodes.has(node)) {
    seenNodes.add(node);
    affectedNodes.push(node);
  }

  if (!hasDescendantListenerNodes(node)) {
    return;
  }

  forEachChildNode(node, (childNode) => {
    collectListenerNodesInSubtree(childNode, affectedNodes, seenNodes);
  });
}
