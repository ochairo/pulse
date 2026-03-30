import type { PulseChangeEvent } from "../contract/types.js";

export type PulseListener<T> = (event: PulseChangeEvent<T>) => void;

export interface PulseListenerEntry<T> {
  readonly callback: PulseListener<T>;
  readonly keyFilter: ReadonlySet<PropertyKey> | undefined;
}

function matchesKeyFilter<T>(
  entry: PulseListenerEntry<T>,
  event: PulseChangeEvent<T>,
): boolean {
  if (entry.keyFilter === undefined) {
    return true;
  }

  for (const change of event.changes) {
    if (change.key !== undefined && entry.keyFilter.has(change.key)) {
      return true;
    }
  }

  return false;
}

export function createListenerEntry<T>(
  callback: PulseListener<T>,
  keys: readonly PropertyKey[] | undefined,
): PulseListenerEntry<T> {
  return {
    callback,
    keyFilter:
      keys !== undefined && keys.length > 0 ? new Set(keys) : undefined,
  };
}

export function dispatchPulseListeners<T>(
  listeners: ReadonlySet<PulseListenerEntry<T>>,
  event: PulseChangeEvent<T>,
): unknown {
  if (listeners.size === 1) {
    const [entry] = listeners;

    if (!entry || !listeners.has(entry)) {
      return undefined;
    }

    if (!matchesKeyFilter(entry, event)) {
      return undefined;
    }

    try {
      entry.callback(event);
      return undefined;
    } catch (error) {
      return error;
    }
  }

  const snapshot = Array.from(listeners);
  let firstError: unknown;

  for (const entry of snapshot) {
    if (!listeners.has(entry)) {
      continue;
    }

    if (!matchesKeyFilter(entry, event)) {
      continue;
    }

    try {
      entry.callback(event);
    } catch (error) {
      firstError ??= error;
    }
  }

  return firstError;
}
