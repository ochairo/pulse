import type { Pulse } from "../contract/types.js";
import {
  ARRAY_LENGTH_SEGMENT,
  type PulsePath,
  normalizeChildKey,
} from "../path/index.js";
import {
  readChildState,
  readExistingValue,
  readValueStateAtPath,
  type ValueState,
} from "../store/state.js";
import type { PulseBatchWriteState } from "../store/write.js";
import {
  createListenerEntry,
  type PulseListener,
  type PulseListenerEntry,
} from "./listener-dispatcher.js";

export interface PendingRuntimeNotification {
  changedPaths: PulsePath[];
  currentRootValue: unknown;
  previousRootValue: unknown;
  rootNode: PulseNodeState<unknown, unknown>;
}

export interface PulseNodeState<TRoot, TValue> {
  batchAccessor?: <TResult>(callback: () => TResult) => TResult;
  cachedValueState: ValueState | null;
  cachedVersion: number;
  children: Map<PropertyKey, PulseNodeState<TRoot, unknown>>;
  getAccessor?: () => TValue;
  readonly key: PropertyKey | null;
  listenerTreeSize: number;
  listeners: Set<PulseListenerEntry<TValue>>;
  onAccessor?: (listener: PulseListener<TValue>) => () => void;
  readonly path: PulsePath;
  propAccessor?: (key: PropertyKey) => unknown;
  readonly runtime: PulseRuntime<TRoot>;
  readonly parent: PulseNodeState<TRoot, unknown> | null;
  proxy?: Pulse<TValue>;
  setAccessor?: (nextValue: TValue) => void;
}

const EMPTY_CHILDREN = new Map<PropertyKey, PulseNodeState<unknown, unknown>>();
const EMPTY_LISTENERS = new Set<PulseListenerEntry<unknown>>();

export interface PulseRuntime<TRoot> {
  batchWriteState: PulseBatchWriteState | null;
  batchDepth: number;
  pendingNotification: PendingRuntimeNotification | null;
  rootValue: TRoot;
  rootNode: PulseNodeState<TRoot, TRoot>;
  version: number;
}

export function createRuntime<T>(initialValue: T): PulseRuntime<T> {
  const runtime = {} as PulseRuntime<T>;
  const rootNode: PulseNodeState<T, T> = {
    cachedValueState: readExistingValue(initialValue),
    cachedVersion: 0,
    children: EMPTY_CHILDREN as Map<PropertyKey, PulseNodeState<T, unknown>>,
    key: null,
    listenerTreeSize: 0,
    listeners: EMPTY_LISTENERS as Set<PulseListenerEntry<T>>,
    path: [],
    runtime,
    parent: null,
  };

  runtime.batchDepth = 0;
  runtime.batchWriteState = null;
  runtime.pendingNotification = null;
  runtime.rootValue = initialValue;
  runtime.rootNode = rootNode;
  runtime.version = 0;
  return runtime;
}

export function getOrCreateChildNode(
  node: PulseNodeState<unknown, unknown>,
  property: PropertyKey,
  currentValue: unknown,
): PulseNodeState<unknown, unknown> {
  const normalizedKey = normalizeChildKey(currentValue, property);
  const childValueState =
    normalizedKey === ARRAY_LENGTH_SEGMENT && Array.isArray(currentValue)
      ? readExistingValue(currentValue.length)
      : readChildState(currentValue, normalizedKey);
  const existingNode = node.children.get(normalizedKey);

  if (existingNode) {
    cacheNodeValueState(existingNode, childValueState);
    return existingNode;
  }

  const childNode: PulseNodeState<unknown, unknown> = {
    cachedValueState: childValueState,
    cachedVersion: node.runtime.version,
    children: EMPTY_CHILDREN,
    key: normalizedKey,
    listenerTreeSize: 0,
    listeners: EMPTY_LISTENERS,
    path: [...node.path, normalizedKey],
    runtime: node.runtime,
    parent: node,
  };

  getMutableChildren(node).set(normalizedKey, childNode);
  return childNode;
}

export function readNodeValue<T>(node: PulseNodeState<unknown, T>): T {
  const valueState = readNodeValueState(node);
  return valueState.exists ? (valueState.value as T) : (undefined as T);
}

export function subscribeToNode<T>(
  node: PulseNodeState<unknown, T>,
  listener: PulseListener<T>,
  keys?: readonly PropertyKey[],
): () => void {
  const entry = createListenerEntry(listener, keys);
  getMutableListeners(node).add(entry);

  if (node.parent === null) {
    node.listenerTreeSize += 1;

    return () => {
      if (!node.listeners.delete(entry)) {
        return;
      }

      node.listenerTreeSize -= 1;
    };
  }

  adjustListenerTreeSize(node, 1);

  return () => {
    if (!node.listeners.delete(entry)) {
      return;
    }

    adjustListenerTreeSize(node, -1);
  };
}

export function updateRuntimeRootValue<T>(
  runtime: PulseRuntime<T>,
  nextRootValue: T,
): void {
  runtime.version += 1;
  runtime.rootValue = nextRootValue;
  cacheNodeValueState(runtime.rootNode, readExistingValue(nextRootValue));
}

function readNodeValueState<T>(node: PulseNodeState<unknown, T>): ValueState {
  if (node.cachedVersion === node.runtime.version && node.cachedValueState) {
    return node.cachedValueState;
  }

  const valueState = readValueStateAtPath(node.runtime.rootValue, node.path);
  cacheNodeValueState(node, valueState);
  return valueState;
}

function cacheNodeValueState<T>(
  node: PulseNodeState<unknown, T>,
  valueState: ValueState,
): void {
  node.cachedValueState = valueState;
  node.cachedVersion = node.runtime.version;
}

function getMutableChildren(
  node: PulseNodeState<unknown, unknown>,
): Map<PropertyKey, PulseNodeState<unknown, unknown>> {
  if (node.children === EMPTY_CHILDREN) {
    node.children = new Map();
  }

  return node.children;
}

function getMutableListeners<T>(
  node: PulseNodeState<unknown, T>,
): Set<PulseListenerEntry<T>> {
  if (node.listeners === EMPTY_LISTENERS) {
    node.listeners = new Set();
  }

  return node.listeners;
}

function adjustListenerTreeSize<T>(
  node: PulseNodeState<unknown, T>,
  delta: number,
): void {
  let currentNode: PulseNodeState<unknown, unknown> | null =
    node as PulseNodeState<unknown, unknown>;

  while (currentNode) {
    currentNode.listenerTreeSize += delta;
    currentNode = currentNode.parent;
  }
}
