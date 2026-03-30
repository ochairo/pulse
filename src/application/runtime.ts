import {
  PULSE_BRAND,
  type Pulse,
  type PulseChangeEvent,
  type PulseMutation,
} from "../types.js";
import {
  canTraversePulseValue,
  type PulsePath,
  collectPulseMutations,
  isRelevantMutationPath,
  normalizeChildKey,
  readValueAtPath,
  setValueAtPath,
  toPublicPulseMutation,
} from "../infrastructure/value.js";

type PulseListener<T> = (event: PulseChangeEvent<T>) => void;

interface PulseNodeState<TRoot, TValue> {
  readonly children: Map<PropertyKey, PulseNodeState<TRoot, unknown>>;
  readonly key: PropertyKey | null;
  readonly listeners: Set<PulseListener<TValue>>;
  readonly path: PulsePath;
  readonly runtime: PulseRuntime<TRoot>;
  readonly parent: PulseNodeState<TRoot, unknown> | null;
  proxy?: Pulse<TValue>;
}

interface PulseRuntime<TRoot> {
  rootValue: TRoot;
  rootNode: PulseNodeState<TRoot, TRoot>;
}

const authenticPulses = new WeakSet<object>();

export function createPulse<T>(initialValue: T): Pulse<T> {
  const runtime = createRuntime(initialValue);
  return getOrCreateProxy(runtime.rootNode);
}

export function isAuthenticPulse(value: unknown): value is Pulse<unknown> {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return false;
  }

  return authenticPulses.has(value);
}

function createRuntime<T>(initialValue: T): PulseRuntime<T> {
  const runtime = {} as PulseRuntime<T>;
  const rootNode: PulseNodeState<T, T> = {
    children: new Map(),
    key: null,
    listeners: new Set(),
    path: [],
    runtime,
    parent: null,
  };

  runtime.rootValue = initialValue;
  runtime.rootNode = rootNode;
  return runtime;
}

function getOrCreateProxy<T>(node: PulseNodeState<unknown, T>): Pulse<T> {
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
    return () => readNodeValue(node) as T;
  }

  if (property === "set") {
    return (nextValue: T) => writeNodeValue(node, nextValue);
  }

  if (property === "on") {
    return (listener: PulseListener<T>) => subscribeToNode(node, listener);
  }

  if (property === "then" || property === "catch" || property === "finally") {
    return undefined;
  }

  if (!canTraversePulseValue(readNodeValue(node))) {
    return undefined;
  }

  return getOrCreateProxy(
    getOrCreateChildNode(node as PulseNodeState<unknown, unknown>, property),
  );
}

function getOrCreateChildNode(
  node: PulseNodeState<unknown, unknown>,
  property: PropertyKey,
): PulseNodeState<unknown, unknown> {
  const normalizedKey = normalizeChildKey(readNodeValue(node), property);
  const existingNode = node.children.get(normalizedKey);

  if (existingNode) {
    return existingNode;
  }

  const childNode: PulseNodeState<unknown, unknown> = {
    children: new Map(),
    key: normalizedKey,
    listeners: new Set(),
    path: [...node.path, normalizedKey],
    runtime: node.runtime,
    parent: node,
  };

  node.children.set(normalizedKey, childNode);
  return childNode;
}

function readNodeValue<T>(node: PulseNodeState<unknown, T>): T {
  return readValueAtPath(node.runtime.rootValue, node.path) as T;
}

function writeNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
): void {
  const previousRootValue = node.runtime.rootValue;
  const nextRootValue = setValueAtPath(previousRootValue, node.path, nextValue);

  if (Object.is(previousRootValue, nextRootValue)) {
    return;
  }

  const mutations = collectPulseMutations(previousRootValue, nextRootValue);
  if (mutations.length === 0) {
    return;
  }

  node.runtime.rootValue = nextRootValue as never;
  notifyNodeTree(
    node.runtime.rootNode,
    previousRootValue,
    nextRootValue,
    mutations,
  );
}

function subscribeToNode<T>(
  node: PulseNodeState<unknown, T>,
  listener: PulseListener<T>,
): () => void {
  node.listeners.add(listener);
  return () => {
    node.listeners.delete(listener);
  };
}

function notifyNodeTree(
  node: PulseNodeState<unknown, unknown>,
  previousRootValue: unknown,
  currentRootValue: unknown,
  mutations: readonly PulseMutation[],
): void {
  const previousValue = readValueAtPath(previousRootValue, node.path);
  const currentValue = readValueAtPath(currentRootValue, node.path);

  if (!Object.is(previousValue, currentValue) && node.listeners.size > 0) {
    const relevantMutations = mutations.filter((mutation) =>
      isRelevantMutationPath(node.path, mutation.path),
    );

    if (relevantMutations.length > 0) {
      notifyNodeListeners(node, {
        currentValue,
        previousValue,
        changes: relevantMutations.map(toPublicPulseMutation),
      });
    }
  }

  for (const childNode of node.children.values()) {
    notifyNodeTree(childNode, previousRootValue, currentRootValue, mutations);
  }
}

function notifyNodeListeners<T>(
  node: PulseNodeState<unknown, T>,
  event: PulseChangeEvent<T>,
): void {
  for (const listener of Array.from(node.listeners)) {
    if (!node.listeners.has(listener)) {
      continue;
    }

    listener(event);
  }
}
