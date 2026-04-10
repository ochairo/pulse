import type { PulseChangeEvent } from "../../contract/types.js";
import {
  matchesPathPrefixMatcher,
  type PulsePathPrefixMatcher,
} from "../../path/index.js";

export type PulseListener<T> = (event: PulseChangeEvent<T>) => void;

export interface PulseListenerEntry<T> {
  readonly callback: PulseListener<T>;
}

export function dispatchPulseListeners<T>(
  listeners: ReadonlySet<PulseListenerEntry<T>>,
  event: PulseChangeEvent<T>,
  singleListener?: PulseListenerEntry<T> | null,
  snapshot?: readonly PulseListenerEntry<T>[] | null,
  readCurrentSnapshot?:
    | (() => readonly PulseListenerEntry<T>[] | null)
    | undefined,
  isEntryActive?: ((entry: PulseListenerEntry<T>) => boolean) | undefined,
): unknown {
  if (singleListener) {
    try {
      singleListener.callback(event);
      return undefined;
    } catch (error) {
      return error;
    }
  }

  let firstError: unknown;
  let shouldCheckActiveEntries = false;

  for (const entry of snapshot ?? Array.from(listeners)) {
    if (!shouldCheckActiveEntries && snapshot && readCurrentSnapshot) {
      shouldCheckActiveEntries = readCurrentSnapshot() !== snapshot;
    }

    if (shouldCheckActiveEntries) {
      const isActive = isEntryActive
        ? isEntryActive(entry)
        : listeners.has(entry);

      if (!isActive) {
        continue;
      }
    }

    try {
      entry.callback(event);
    } catch (error) {
      firstError ??= error;
    }
  }

  return firstError;
}

export function shouldDispatchToExactPath(
  nodePath: readonly PropertyKey[],
  exactPathMatcher: PulsePathPrefixMatcher,
): boolean {
  return matchesPathPrefixMatcher(nodePath, exactPathMatcher);
}
