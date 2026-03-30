import {
  createPulseBatchWriteState,
  setValueAtPathInBatch,
  setValueAtPath,
  setValueAtPathWithoutMutations,
} from "../store/write.js";
import { notifyOrQueueNodeTree } from "./batch.js";
import { updateRuntimeRootValue, type PulseNodeState } from "./state.js";

export function writeNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  if (node.path.length === 0) {
    writeRootNodeValue(node, nextValue);
    return;
  }

  const hasListeners = node.runtime.rootNode.listenerTreeSize > 0;
  const previousRootValue = node.runtime.rootValue;

  if (node.runtime.batchDepth > 0) {
    if (!hasListeners) {
      const writeResult = setValueAtPathWithoutMutations(
        previousRootValue,
        node.path,
        nextValue,
      );

      if (!writeResult.changed) {
        return;
      }

      updateRuntimeRootValue(node.runtime, writeResult.rootValue as never);
      return;
    }

    node.runtime.batchWriteState ??=
      createPulseBatchWriteState(previousRootValue);

    const writeResult = setValueAtPathInBatch(
      previousRootValue,
      node.path,
      nextValue,
      node.runtime.batchWriteState,
    );

    if (!writeResult.changed) {
      return;
    }

    updateRuntimeRootValue(node.runtime, writeResult.rootValue as never);

    const notificationError = notifyOrQueueNodeTree(
      node.runtime.rootNode,
      previousRootValue,
      writeResult.rootValue,
      [],
      node.path,
    );

    if (notificationError !== undefined) {
      throw notificationError;
    }

    return;
  }

  if (!hasListeners) {
    const writeResult = setValueAtPathWithoutMutations(
      previousRootValue,
      node.path,
      nextValue,
    );

    if (!writeResult.changed) {
      return;
    }

    updateRuntimeRootValue(node.runtime, writeResult.rootValue as never);
    return;
  }

  const writeResult = setValueAtPath(previousRootValue, node.path, nextValue);
  const nextRootValue = writeResult.rootValue;

  if (Object.is(previousRootValue, nextRootValue)) {
    return;
  }

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
  );

  if (notificationError !== undefined) {
    throw notificationError;
  }
}

function writeRootNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  const previousRootValue = node.runtime.rootValue as T;
  const hasListeners = node.runtime.rootNode.listenerTreeSize > 0;

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
      [],
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
  );

  if (notificationError !== undefined) {
    throw notificationError;
  }
}
