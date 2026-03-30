import type { PulseMutation, PulsePath } from "../contract/types.js";
import { collectPulseMutationsAtPaths } from "../store/mutations.js";
import { notifyNodeTree } from "./notify.js";
import type { PulseNodeState, PulseRuntime } from "./state.js";

export function batchPulseUpdates<T>(
  runtime: PulseRuntime<unknown>,
  callback: () => T,
): T {
  if (runtime.batchDepth === 0) {
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
): unknown {
  const runtime = rootNode.runtime;

  if (runtime.batchDepth === 0) {
    return notifyNodeTree(
      rootNode,
      previousRootValue,
      currentRootValue,
      mutations,
    );
  }

  const pending = runtime.pendingNotification;

  if (pending) {
    pending.currentRootValue = currentRootValue;

    if (changedPath) {
      pending.changedPaths.push(changedPath);
    }

    return undefined;
  }

  runtime.pendingNotification = {
    changedPaths: changedPath ? [changedPath] : [],
    currentRootValue,
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

  if (pending.rootNode.listenerTreeSize === 0) {
    return undefined;
  }

  const mutations =
    batchWriteState && batchWriteState.canAccumulateMutations
      ? [...batchWriteState.pendingMutations.values()]
      : collectPulseMutationsAtPaths(
          pending.previousRootValue,
          pending.currentRootValue,
          pending.changedPaths,
        );

  if (mutations.length === 0) {
    return undefined;
  }

  return notifyNodeTree(
    pending.rootNode,
    pending.previousRootValue,
    pending.currentRootValue,
    mutations,
  );
}
