import type { Pulse } from "./types.js";
import { createPulse, isAuthenticPulse } from "./application/runtime.js";

export function pulse<T>(initialValue: T): Pulse<T> {
  return createPulse(initialValue);
}

export function isPulse(value: unknown): value is Pulse<unknown> {
  return isAuthenticPulse(value);
}
