import { ARRAY_LENGTH_SEGMENT } from "../../path/index.js";
import { type PulseListener, type PulseListenerEntry } from "./dispatch.js";
import {
  adjustListenerNodeTreeSize,
  ensureMutableListeners,
  type PulseNodeState,
} from "../state/runtime.js";

export function subscribeToNode<T>(
  node: PulseNodeState<unknown, T>,
  listener: PulseListener<T>,
): () => void {
  const hadLocalListeners = hasLocalListeners(node);
  const entry: PulseListenerEntry<T> = { callback: listener };

  if (!hadLocalListeners) {
    node.singleListenerEntry = entry;
  } else if (node.singleListenerEntry) {
    const existingEntry = node.singleListenerEntry;
    const listeners = ensureMutableListeners(node);
    listeners.add(existingEntry);
    listeners.add(entry);
    node.singleListenerEntry = null;
  } else {
    ensureMutableListeners(node).add(entry);
  }

  if (!hadLocalListeners && node.key === ARRAY_LENGTH_SEGMENT) {
    node.runtime.lengthListenerVersion += 1;
  }

  node.listenerSnapshot = null;

  if (!hadLocalListeners) {
    adjustListenerNodeTreeSize(node, 1);
  }

  return () => {
    if (node.singleListenerEntry === entry) {
      node.singleListenerEntry = null;
      node.listenerSnapshot = null;

      if (node.key === ARRAY_LENGTH_SEGMENT) {
        node.runtime.lengthListenerVersion += 1;
      }

      adjustListenerNodeTreeSize(node, -1);
      return;
    }

    if (!node.listeners.delete(entry)) {
      return;
    }

    if (node.listeners.size === 0 && node.key === ARRAY_LENGTH_SEGMENT) {
      node.runtime.lengthListenerVersion += 1;
    }

    node.listenerSnapshot = null;
    node.singleListenerEntry = readSingleListener(node.listeners);

    if (!hasLocalListeners(node)) {
      adjustListenerNodeTreeSize(node, -1);
    }
  };
}

function readSingleListener<T>(
  listeners: ReadonlySet<PulseListenerEntry<T>>,
): PulseListenerEntry<T> | null {
  if (listeners.size !== 1) {
    return null;
  }

  const [entry] = listeners;
  return entry ?? null;
}

export function readSingleListenerEntry<T>(
  node: PulseNodeState<unknown, T>,
): PulseListenerEntry<T> | null {
  return node.singleListenerEntry ?? readSingleListener(node.listeners);
}

export function readListenerSnapshot<T>(
  node: PulseNodeState<unknown, T>,
): readonly PulseListenerEntry<T>[] | null {
  if (node.singleListenerEntry || node.listeners.size <= 1) {
    return null;
  }

  if (node.listenerSnapshot) {
    return node.listenerSnapshot;
  }

  const snapshot = Array.from(node.listeners);
  node.listenerSnapshot = snapshot;
  return snapshot;
}

export function hasListenerNodesInSubtree<T>(
  node: PulseNodeState<unknown, T>,
): boolean {
  return node.listenerNodeTreeSize > 0;
}

export function hasLocalListeners<T>(
  node: PulseNodeState<unknown, T>,
): boolean {
  return node.singleListenerEntry !== null || node.listeners.size > 0;
}

export function hasOnlyLocalListenerNode<T>(
  node: PulseNodeState<unknown, T>,
): boolean {
  return hasLocalListeners(node) && node.listenerNodeTreeSize === 1;
}

export function hasDescendantListenerNodes<T>(
  node: PulseNodeState<unknown, T>,
): boolean {
  return node.listenerNodeTreeSize > (hasLocalListeners(node) ? 1 : 0);
}
