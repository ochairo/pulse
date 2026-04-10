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
  const roots = collectAffectedListenerRoots(
    node as PulseNodeState<unknown, unknown>,
    extraNodes,
  );

  if (roots.length === 0) {
    return undefined;
  }

  if (roots.length === 1) {
    const [rootNode] = roots;

    if (rootNode && hasOnlyLocalListenerNode(rootNode)) {
      return [rootNode];
    }
  }

  const affectedNodes: PulseNodeState<unknown, unknown>[] = [];

  for (const rootNode of roots) {
    collectListenerNodesInSubtree(rootNode, affectedNodes);
  }

  return affectedNodes.length > 0 ? affectedNodes : undefined;
}

function collectAffectedListenerRoots(
  node: PulseNodeState<unknown, unknown>,
  extraNodes: readonly PulseNodeState<unknown, unknown>[],
): readonly PulseNodeState<unknown, unknown>[] {
  const roots: PulseNodeState<unknown, unknown>[] = [];

  if (hasListenerNodesInSubtree(node)) {
    insertAffectedRoot(roots, node);
  }

  for (const extraNode of extraNodes) {
    if (!hasListenerNodesInSubtree(extraNode)) {
      continue;
    }

    insertAffectedRoot(roots, extraNode);
  }

  return roots;
}

function insertAffectedRoot(
  roots: PulseNodeState<unknown, unknown>[],
  candidate: PulseNodeState<unknown, unknown>,
): void {
  for (let index = 0; index < roots.length; index += 1) {
    const rootNode = roots[index] as PulseNodeState<unknown, unknown>;

    if (isNodeAncestorOrSelf(rootNode, candidate)) {
      return;
    }

    if (isNodeAncestorOrSelf(candidate, rootNode)) {
      roots.splice(index, 1);
      index -= 1;
    }
  }

  roots.push(candidate);
}

function isNodeAncestorOrSelf(
  ancestorNode: PulseNodeState<unknown, unknown>,
  node: PulseNodeState<unknown, unknown>,
): boolean {
  let currentNode: PulseNodeState<unknown, unknown> | null = node;

  while (currentNode) {
    if (currentNode === ancestorNode) {
      return true;
    }

    currentNode = currentNode.parent;
  }

  return false;
}

function collectListenerNodesInSubtree(
  node: PulseNodeState<unknown, unknown>,
  affectedNodes: PulseNodeState<unknown, unknown>[],
): void {
  const pendingNodes: PulseNodeState<unknown, unknown>[] = [node];

  while (pendingNodes.length > 0) {
    const currentNode = pendingNodes.pop() as PulseNodeState<unknown, unknown>;

    if (!hasListenerNodesInSubtree(currentNode)) {
      continue;
    }

    if (hasLocalListeners(currentNode)) {
      affectedNodes.push(currentNode);
    }

    if (!hasDescendantListenerNodes(currentNode)) {
      continue;
    }

    forEachChildNode(currentNode, (childNode) => {
      if (hasListenerNodesInSubtree(childNode)) {
        pendingNodes.push(childNode);
      }
    });
  }
}
