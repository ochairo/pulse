import { PULSE_BRAND, type Pulse } from "../contract/types.js";
import { canTraversePulseValue } from "../store/state.js";
import { batchPulseUpdates } from "./batch.js";
import type { PulseListener } from "./listener-dispatcher.js";
import {
  getOrCreateChildNode,
  readNodeValue,
  subscribeToNode,
  type PulseNodeState,
} from "./state.js";
import { writeNodeValue } from "./write.js";

const authenticPulses = new WeakSet<object>();

export function isAuthenticPulse(value: unknown): value is Pulse<unknown> {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return false;
  }

  return authenticPulses.has(value);
}

export function getOrCreateProxy<T>(
  node: PulseNodeState<unknown, T>,
): Pulse<T> {
  if (node.proxy) {
    return node.proxy;
  }

  const target = Object.create(null) as object;
  const proxy = new Proxy(target, {
    deleteProperty: () => false,
    get: (_target, property) => readNodeProperty(node, property),
    set: () => false,
  }) as Pulse<T>;

  authenticPulses.add(proxy);
  node.proxy = proxy;
  return proxy;
}

function readNodeProperty<T>(
  node: PulseNodeState<unknown, T>,
  property: PropertyKey,
): unknown {
  if (property === PULSE_BRAND) {
    return true;
  }

  if (property === Symbol.toStringTag) {
    return "Pulse";
  }

  if (property === "get") {
    return getNodeGetAccessor(node) as () => T;
  }

  if (property === "prop") {
    return getNodePropAccessor(node) as (key: PropertyKey) => Pulse<unknown>;
  }

  if (property === "set") {
    return getNodeSetAccessor(node) as (nextValue: T) => void;
  }

  if (property === "on") {
    return getNodeOnAccessor(node) as (
      listener: PulseListener<T>,
    ) => () => void;
  }

  if (property === "batch") {
    if (node.parent !== null) {
      return undefined;
    }

    return getNodeBatchAccessor(node);
  }

  if (property === "then" || property === "catch" || property === "finally") {
    return undefined;
  }

  return readNodeChild(node, property, false);
}

function getNodeGetAccessor<T>(node: PulseNodeState<unknown, T>): () => T {
  node.getAccessor ??= () => readNodeValue(node) as T;
  return node.getAccessor;
}

function getNodePropAccessor<T>(
  node: PulseNodeState<unknown, T>,
): (key: PropertyKey) => Pulse<unknown> | undefined {
  node.propAccessor ??= (key: PropertyKey) => readNodeChild(node, key, true);
  return node.propAccessor;
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

  const currentValue = readNodeValue(node);

  if (!canTraversePulseValue(currentValue)) {
    return undefined;
  }

  return getOrCreateProxy(
    getOrCreateChildNode(
      node as PulseNodeState<unknown, unknown>,
      property,
      currentValue,
    ),
  );
}
