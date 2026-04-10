import type { Pulse } from "../../contract/types.js";
import { ARRAY_LENGTH_SEGMENT, type PulsePath } from "../../path/index.js";
import {
  readChildState,
  readExistingValue,
  type ValueState,
} from "../../store/state.js";
import type { PulseBatchWriteState } from "../../store/write.js";
import {
  type PulseListener,
  type PulseListenerEntry,
} from "../listener/dispatch.js";

export interface PendingRuntimeNotification {
  affectedNodeSet: Set<PulseNodeState<unknown, unknown>> | null;
  affectedNodes: PulseNodeState<unknown, unknown>[] | null;
  canNotifyDirectly: boolean;
  changedPaths: PulsePath[] | null;
  changedPathSet: Set<PulsePath> | null;
  currentRootValue: unknown;
  directNodeValue:
    | {
        currentValue: unknown;
        node: PulseNodeState<unknown, unknown>;
        previousValue: unknown;
      }
    | undefined;
  previousRootValue: unknown;
  rootNode: PulseNodeState<unknown, unknown>;
  singleAffectedNode: PulseNodeState<unknown, unknown> | null;
  singleChangedPath: PulsePath | null;
}

export interface PulseNodeState<TRoot, TValue> {
  ancestorHasLengthListener: boolean;
  ancestorLengthListenerVersion: number;
  batchAccessor?: <TResult>(callback: () => TResult) => TResult;
  batchDraftContainer?: Record<PropertyKey, unknown> | unknown[];
  batchDraftVersion: number;
  cachedValueState: ValueState | null;
  cachedVersion: number;
  children: Map<PropertyKey, PulseNodeState<TRoot, unknown>>;
  singleChildKey: PropertyKey | null;
  singleChildNode: PulseNodeState<TRoot, unknown> | null;
  getAccessor?: () => TValue;
  readonly key: PropertyKey | null;
  listenerNodeTreeSize: number;
  listeners: Set<PulseListenerEntry<TValue>>;
  listenerSnapshot: readonly PulseListenerEntry<TValue>[] | null;
  singleListenerEntry: PulseListenerEntry<TValue> | null;
  onAccessor?: (listener: PulseListener<TValue>) => () => void;
  path: PulsePath | null;
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
  batchVersion: number;
  lengthListenerVersion: number;
  pendingNotification: PendingRuntimeNotification | null;
  rootValue: TRoot;
  rootNode: PulseNodeState<TRoot, TRoot>;
  version: number;
}

const EMPTY_ROOT_PATH: PulsePath = [];

export function createRuntime<T>(initialValue: T): PulseRuntime<T> {
  const runtime = {} as PulseRuntime<T>;
  const rootNode: PulseNodeState<T, T> = {
    ancestorHasLengthListener: false,
    ancestorLengthListenerVersion: 0,
    batchDraftVersion: -1,
    cachedValueState: readExistingValue(initialValue),
    cachedVersion: 0,
    children: EMPTY_CHILDREN as Map<PropertyKey, PulseNodeState<T, unknown>>,
    key: null,
    listenerNodeTreeSize: 0,
    listeners: EMPTY_LISTENERS as Set<PulseListenerEntry<T>>,
    listenerSnapshot: null,
    singleListenerEntry: null,
    singleChildKey: null,
    singleChildNode: null,
    path: EMPTY_ROOT_PATH,
    runtime,
    parent: null,
  };

  runtime.batchDepth = 0;
  runtime.batchVersion = 0;
  runtime.batchWriteState = null;
  runtime.lengthListenerVersion = 0;
  runtime.pendingNotification = null;
  runtime.rootValue = initialValue;
  runtime.rootNode = rootNode;
  runtime.version = 0;
  return runtime;
}

export function getOrCreateNormalizedChildNode(
  node: PulseNodeState<unknown, unknown>,
  normalizedKey: PropertyKey,
  currentValue: unknown,
): PulseNodeState<unknown, unknown> {
  const existingNode = readChildNode(node, normalizedKey);

  if (existingNode) {
    if (existingNode.cachedVersion === node.runtime.version) {
      return existingNode;
    }

    const childValueState =
      normalizedKey === ARRAY_LENGTH_SEGMENT && Array.isArray(currentValue)
        ? readExistingValue(currentValue.length)
        : readChildState(currentValue, normalizedKey);
    cacheNodeValueState(existingNode, childValueState);
    return existingNode;
  }

  const childValueState =
    normalizedKey === ARRAY_LENGTH_SEGMENT && Array.isArray(currentValue)
      ? readExistingValue(currentValue.length)
      : readChildState(currentValue, normalizedKey);

  const childNode: PulseNodeState<unknown, unknown> = {
    ancestorHasLengthListener: false,
    ancestorLengthListenerVersion: -1,
    batchDraftVersion: -1,
    cachedValueState: childValueState,
    cachedVersion: node.runtime.version,
    children: EMPTY_CHILDREN,
    key: normalizedKey,
    listenerNodeTreeSize: 0,
    listeners: EMPTY_LISTENERS,
    listenerSnapshot: null,
    singleListenerEntry: null,
    singleChildKey: null,
    singleChildNode: null,
    path: null,
    runtime: node.runtime,
    parent: node,
  };

  storeChildNode(node, normalizedKey, childNode);
  return childNode;
}

export function readChildNode(
  node: PulseNodeState<unknown, unknown>,
  key: PropertyKey,
): PulseNodeState<unknown, unknown> | undefined {
  if (node.singleChildNode && node.singleChildKey === key) {
    return node.singleChildNode;
  }

  return node.children.get(key);
}

export function forEachChildNode(
  node: PulseNodeState<unknown, unknown>,
  callback: (child: PulseNodeState<unknown, unknown>) => void,
): void {
  if (node.singleChildNode) {
    callback(node.singleChildNode);
    return;
  }

  for (const childNode of node.children.values()) {
    callback(childNode);
  }
}

export function readNodeValue<T>(node: PulseNodeState<unknown, T>): T {
  const valueState = readNodeValueState(node);
  return valueState.exists ? (valueState.value as T) : (undefined as T);
}

export function updateRuntimeRootValue<T>(
  runtime: PulseRuntime<T>,
  nextRootValue: T,
): void {
  runtime.version += 1;
  runtime.rootValue = nextRootValue;
  cacheNodeValueState(runtime.rootNode, readExistingValue(nextRootValue));
}

export function readNodeValueState<T>(
  node: PulseNodeState<unknown, T>,
): ValueState {
  if (node.cachedVersion === node.runtime.version && node.cachedValueState) {
    return node.cachedValueState;
  }

  let valueState: ValueState;

  if (node.parent === null || node.key === null) {
    valueState = readExistingValue(node.runtime.rootValue);
  } else {
    const parentValueState = readNodeValueState(node.parent);

    if (!parentValueState.exists) {
      valueState = parentValueState;
    } else if (
      node.key === ARRAY_LENGTH_SEGMENT &&
      Array.isArray(parentValueState.value)
    ) {
      valueState = readExistingValue(parentValueState.value.length);
    } else {
      valueState = readChildState(parentValueState.value, node.key);
    }
  }

  cacheNodeValueState(node, valueState);
  return valueState;
}

export function cacheNodeValueState<T>(
  node: PulseNodeState<unknown, T>,
  valueState: ValueState,
): void {
  node.cachedValueState = valueState;
  node.cachedVersion = node.runtime.version;
}

export function readNodePath<T>(node: PulseNodeState<unknown, T>): PulsePath {
  if (node.path !== null) {
    return node.path;
  }

  const uncachedNodes: PulseNodeState<unknown, unknown>[] = [];
  let currentNode: PulseNodeState<unknown, unknown> | null =
    node as PulseNodeState<unknown, unknown>;

  while (
    currentNode &&
    currentNode.path === null &&
    currentNode.parent &&
    currentNode.key !== null
  ) {
    uncachedNodes.push(currentNode);
    currentNode = currentNode.parent;
  }

  let currentPath = currentNode?.path ?? EMPTY_ROOT_PATH;

  for (let index = uncachedNodes.length - 1; index >= 0; index -= 1) {
    const uncachedNode = uncachedNodes[index] as PulseNodeState<
      unknown,
      unknown
    >;
    const nextPath = [...currentPath, uncachedNode.key as PropertyKey];
    uncachedNode.path = nextPath;
    currentPath = nextPath;
  }

  return currentPath;
}

function getMutableChildren(
  node: PulseNodeState<unknown, unknown>,
): Map<PropertyKey, PulseNodeState<unknown, unknown>> {
  if (node.children === EMPTY_CHILDREN) {
    node.children = new Map();
  }

  return node.children;
}

function storeChildNode(
  node: PulseNodeState<unknown, unknown>,
  key: PropertyKey,
  child: PulseNodeState<unknown, unknown>,
): void {
  if (node.singleChildNode && node.singleChildKey === key) {
    node.singleChildNode = child;
    return;
  }

  if (node.singleChildNode) {
    const children = getMutableChildren(node);
    children.set(node.singleChildKey as PropertyKey, node.singleChildNode);
    node.singleChildKey = null;
    node.singleChildNode = null;
    children.set(key, child);
    return;
  }

  if (node.children !== EMPTY_CHILDREN) {
    node.children.set(key, child);
    return;
  }

  node.singleChildKey = key;
  node.singleChildNode = child;
}

export function ensureMutableListeners<T>(
  node: PulseNodeState<unknown, T>,
): Set<PulseListenerEntry<T>> {
  if (node.listeners === EMPTY_LISTENERS) {
    node.listeners = new Set();
  }

  return node.listeners;
}

export function adjustListenerNodeTreeSize<T>(
  node: PulseNodeState<unknown, T>,
  delta: number,
): void {
  let currentNode: PulseNodeState<unknown, unknown> | null =
    node as PulseNodeState<unknown, unknown>;

  while (currentNode) {
    currentNode.listenerNodeTreeSize += delta;
    currentNode = currentNode.parent;
  }
}
