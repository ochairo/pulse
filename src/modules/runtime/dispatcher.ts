import type { InternalRootPulse } from "../contract/types.js";
import { getOrCreateProxy, isAuthenticPulse } from "./proxy.js";
import { createRuntime } from "./state.js";

export function createPulse<T>(initialValue: T): InternalRootPulse<T> {
  const runtime = createRuntime(initialValue);
  return getOrCreateProxy(runtime.rootNode) as InternalRootPulse<T>;
}

export { isAuthenticPulse };
