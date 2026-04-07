import { PULSE_BRAND, type Pulse } from "../../contract/types.js";
import { ARRAY_LENGTH_SEGMENT, normalizeChildKey } from "../../path/index.js";
import { canTraversePulseValue } from "../../store/state.js";
import { batchPulseUpdates } from "../batch/runtime.js";
import type { PulseListener } from "../listener/dispatch.js";
import { subscribeToNode } from "../listener/topology.js";
import {
  getOrCreateNormalizedChildNode,
  readChildNode as readStoredChildNode,
  readNodeValue,
  readNodeValueState,
  type PulseNodeState,
} from "../state/runtime.js";
import { writeNodeValue } from "../write/runtime.js";

const pulseProxyHandler: ProxyHandler<PulseNodeState<unknown, unknown>> = {
  deleteProperty: () => false,
  get: (target, property) => readNodeProperty(target, property),
  set: () => false,
};

export function isAuthenticPulse(value: unknown): value is Pulse<unknown> {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return false;
  }

  try {
    return (value as Record<PropertyKey, unknown>)[PULSE_BRAND] === true;
  } catch {
    return false;
  }
}

export function getOrCreateProxy<T>(
  node: PulseNodeState<unknown, T>,
): Pulse<T> {
  if (node.proxy) {
    return node.proxy;
  }

  const proxy = new Proxy(
    node as PulseNodeState<unknown, unknown>,
    pulseProxyHandler,
  ) as unknown as Pulse<T>;

  node.proxy = proxy;
  return proxy;
}

function readNodeProperty<T>(
  node: PulseNodeState<unknown, T>,
  property: PropertyKey,
): unknown {
  if (typeof property === "string") {
    switch (property) {
      case "get":
        return getNodeGetAccessor(node) as () => T;
      case "prop":
        return getNodePropAccessor(node) as (
          key: PropertyKey,
        ) => Pulse<unknown>;
      case "set":
        return getNodeSetAccessor(node) as (nextValue: T) => void;
      case "on":
        return getNodeOnAccessor(node) as (
          listener: PulseListener<T>,
        ) => () => void;
      case "batch":
        if (node.parent !== null) {
          return undefined;
        }

        return getNodeBatchAccessor(node);
      case "then":
      case "catch":
      case "finally":
        return undefined;
      default:
        const cachedChild = readCachedNodeStringChild(node, property);

        if (cachedChild) {
          return cachedChild;
        }

        return readNodeChildFromCurrentState(node, property);
    }
  }

  if (property === PULSE_BRAND) {
    return true;
  }

  if (property === Symbol.toStringTag) {
    return "Pulse";
  }

  return readNodeChild(node, property, false);
}

function getNodeGetAccessor<T>(node: PulseNodeState<unknown, T>): () => T {
  node.getAccessor ??= () => readNodeValue(node) as T;
  return node.getAccessor;
}

function getNodePropAccessor<T>(
  node: PulseNodeState<unknown, T>,
): (key: PropertyKey) => unknown {
  node.propAccessor ??= (key: PropertyKey) => {
    const valueState = readNodeValueState(node);
    const currentValue = valueState.exists ? valueState.value : undefined;

    if (Array.isArray(currentValue) && !isSupportedArrayPropKey(key)) {
      return undefined;
    }

    return readNodeChildFromValue(node, key, currentValue);
  };
  return node.propAccessor;
}

function isSupportedArrayPropKey(key: PropertyKey): boolean {
  if (typeof key === "number") {
    return true;
  }

  return key === "length";
}

function getNodeSetAccessor<T>(
  node: PulseNodeState<unknown, T>,
): (nextValue: T) => void {
  node.setAccessor ??= (nextValue: T) => writeNodeValue(node, nextValue);
  return node.setAccessor;
}

function getNodeOnAccessor<T>(
  node: PulseNodeState<unknown, T>,
): (listener: PulseListener<T>) => () => void {
  node.onAccessor ??= (listener: PulseListener<T>) =>
    subscribeToNode(node, listener);
  return node.onAccessor;
}

function getNodeBatchAccessor<T>(
  node: PulseNodeState<unknown, T>,
): <TResult>(callback: () => TResult) => TResult {
  node.batchAccessor ??= <TResult>(callback: () => TResult) =>
    batchPulseUpdates(node.runtime, callback);
  return node.batchAccessor;
}

function readNodeChild<T>(
  node: PulseNodeState<unknown, T>,
  property: PropertyKey,
  allowReserved: boolean,
): Pulse<unknown> | undefined {
  if (
    !allowReserved &&
    (property === "get" ||
      property === "set" ||
      property === "on" ||
      property === "prop" ||
      property === "batch")
  ) {
    return undefined;
  }

  return readNodeChildFromCurrentState(node, property);
}

function readNodeChildFromCurrentState<T>(
  node: PulseNodeState<unknown, T>,
  property: PropertyKey,
): Pulse<unknown> | undefined {
  const valueState = readNodeValueState(node);
  return readNodeChildFromValue(
    node,
    property,
    valueState.exists ? valueState.value : undefined,
  );
}

function readNodeChildFromValue<T>(
  node: PulseNodeState<unknown, T>,
  property: PropertyKey,
  currentValue: unknown,
): Pulse<unknown> | undefined {
  if (!canTraversePulseValue(currentValue)) {
    return undefined;
  }

  const normalizedKey = normalizeChildKey(currentValue, property);
  const existingChildNode = readStoredChildNode(
    node as PulseNodeState<unknown, unknown>,
    normalizedKey,
  );

  if (
    existingChildNode &&
    existingChildNode.cachedVersion === node.runtime.version
  ) {
    return getOrCreateProxy(existingChildNode);
  }

  return getOrCreateProxy(
    getOrCreateNormalizedChildNode(
      node as PulseNodeState<unknown, unknown>,
      normalizedKey,
      currentValue,
    ),
  );
}

function readCachedNodeStringChild<T>(
  node: PulseNodeState<unknown, T>,
  property: string,
): Pulse<unknown> | undefined {
  const runtimeVersion = node.runtime.version;

  const directChild = readStoredChildNode(
    node as PulseNodeState<unknown, unknown>,
    property,
  );

  if (directChild && directChild.cachedVersion === runtimeVersion) {
    return getOrCreateProxy(directChild);
  }

  if (property === "length") {
    const lengthChild = readStoredChildNode(
      node as PulseNodeState<unknown, unknown>,
      ARRAY_LENGTH_SEGMENT,
    );

    if (lengthChild && lengthChild.cachedVersion === runtimeVersion) {
      return getOrCreateProxy(lengthChild);
    }

    return undefined;
  }

  const arrayIndex = readArrayIndex(property);

  if (arrayIndex === null) {
    return undefined;
  }

  const indexChild = readStoredChildNode(
    node as PulseNodeState<unknown, unknown>,
    arrayIndex,
  );
  return indexChild && indexChild.cachedVersion === runtimeVersion
    ? getOrCreateProxy(indexChild)
    : undefined;
}

function readArrayIndex(property: string): number | null {
  if (property.length === 0) {
    return null;
  }

  let index = 0;

  for (let offset = 0; offset < property.length; offset += 1) {
    const code = property.charCodeAt(offset);

    if (code < 48 || code > 57) {
      return null;
    }

    if (offset === 0 && code === 48 && property.length > 1) {
      return null;
    }

    index = index * 10 + (code - 48);
  }

  return index;
}
