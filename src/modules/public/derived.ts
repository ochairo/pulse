import {
  PULSE_BRAND,
  type Pulse,
  type PulseChangeEvent,
} from "../contract/types.js";
import { createPulse } from "../runtime/dispatcher/create.js";

export interface ReadonlyPulse<T> {
  readonly [PULSE_BRAND]: true;
  get(): T;
  on(callback: (event: PulseChangeEvent<T>) => void): () => void;
  destroy(): void;
}

export function derived<T, U>(
  source: Pulse<T>,
  fn: (value: T) => U,
): ReadonlyPulse<U> {
  const internal = createPulse(fn(source.get()));
  let destroyed = false;

  const unsubscribe = source.on((event) => {
    if (destroyed) return;
    const next = fn(event.currentValue);
    if (!Object.is(next, internal.get())) {
      internal.set(next);
    }
  });

  return {
    [PULSE_BRAND]: true as const,
    get: () => internal.get(),
    on: (callback: (event: PulseChangeEvent<U>) => void) =>
      internal.on(callback),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
    },
  };
}
