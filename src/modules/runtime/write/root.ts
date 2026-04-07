import { ARRAY_LENGTH_SEGMENT } from "../../path/index.js";
import { isPlainObject } from "../../store/state.js";
import { setValueAtPath } from "../../store/write.js";
import {
  notifyOrQueueNodeTree,
  type DirectNodeNotificationValue,
} from "../batch/runtime.js";
import { hasListenerNodesInSubtree } from "../listener/topology.js";
import {
  readNodePath,
  updateRuntimeRootValue,
  type PulseNodeState,
} from "../state/runtime.js";

export function trySetDirectRootChildValueWithoutMutations<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): { changed: boolean; rootValue: unknown } | null {
  const parentNode = node.parent;
  const childKey = node.key;

  if (
    !parentNode ||
    parentNode.parent !== null ||
    childKey === null ||
    childKey === ARRAY_LENGTH_SEGMENT
  ) {
    return null;
  }

  const rootValue = node.runtime.rootValue;

  if (Array.isArray(rootValue)) {
    if (typeof childKey !== "number" || childKey < 0) {
      return null;
    }

    if (
      childKey < rootValue.length &&
      Object.is(rootValue[childKey], nextValue)
    ) {
      return {
        changed: false,
        rootValue,
      };
    }

    const nextRootValue = rootValue.slice();
    nextRootValue[childKey] = nextValue;
    return {
      changed: true,
      rootValue: nextRootValue,
    };
  }

  if (!isPlainObject(rootValue)) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(rootValue, childKey) &&
    Object.is(rootValue[childKey], nextValue)
  ) {
    return {
      changed: false,
      rootValue,
    };
  }

  return {
    changed: true,
    rootValue: {
      ...rootValue,
      [childKey]: nextValue,
    },
  };
}

export function writeRootNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  const previousRootValue = node.runtime.rootValue as T;
  const hasListeners = hasListenerNodesInSubtree(node.runtime.rootNode);

  if (Object.is(previousRootValue, nextValue)) {
    return;
  }

  if (node.runtime.batchDepth > 0) {
    updateRuntimeRootValue(node.runtime, nextValue as never);

    if (!hasListeners) {
      return;
    }

    const notificationError = notifyOrQueueNodeTree(
      node.runtime.rootNode,
      previousRootValue,
      nextValue,
      [],
      readNodePath(node),
      undefined,
      {
        currentValue: nextValue,
        node: node as PulseNodeState<unknown, unknown>,
        previousValue: previousRootValue,
      } satisfies DirectNodeNotificationValue,
    );

    if (notificationError !== undefined) {
      throw notificationError;
    }

    return;
  }

  if (!hasListeners) {
    updateRuntimeRootValue(node.runtime, nextValue as never);
    return;
  }

  const writeResult = setValueAtPath(previousRootValue, [], nextValue);
  const nextRootValue = writeResult.rootValue;
  const mutations = writeResult.mutations;

  if (mutations.length === 0) {
    return;
  }

  updateRuntimeRootValue(node.runtime, nextRootValue as never);

  const notificationError = notifyOrQueueNodeTree(
    node.runtime.rootNode,
    previousRootValue,
    nextRootValue,
    mutations,
    readNodePath(node),
    undefined,
    {
      currentValue: nextRootValue,
      node: node as PulseNodeState<unknown, unknown>,
      previousValue: previousRootValue,
    } satisfies DirectNodeNotificationValue,
  );

  if (notificationError !== undefined) {
    throw notificationError;
  }
}
