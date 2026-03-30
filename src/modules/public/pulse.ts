import type { Pulse } from "../contract/types.js";
import { createPulse, isAuthenticPulse } from "../runtime/dispatcher.js";

type PulseRoot<T> = Pulse<T> & {
  batch<TResult>(callback: () => TResult): TResult;
};

export function pulse<T>(initialValue: T): PulseRoot<T> {
  return createPulse(initialValue) as PulseRoot<T>;
}

export function isPulse(value: unknown): value is Pulse<unknown> {
  return isAuthenticPulse(value);
}
