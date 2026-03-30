import type { PulseChangeEvent } from "../contract/types.js";

export type PulseListener<T> = (event: PulseChangeEvent<T>) => void;

export function dispatchPulseListeners<T>(
  listeners: ReadonlySet<PulseListener<T>>,
  event: PulseChangeEvent<T>,
): unknown {
  if (listeners.size === 1) {
    const [listener] = listeners;

    if (!listener || !listeners.has(listener)) {
      return undefined;
    }

    try {
      listener(event);
      return undefined;
    } catch (error) {
      return error;
    }
  }

  const snapshot = Array.from(listeners);
  let firstError: unknown;

  for (const listener of snapshot) {
    if (!listeners.has(listener)) {
      continue;
    }

    try {
      listener(event);
    } catch (error) {
      firstError ??= error;
    }
  }

  return firstError;
}
