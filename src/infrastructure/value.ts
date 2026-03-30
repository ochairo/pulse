import type { PulseMutation, PulsePath } from "../types.js";

const MISSING = Symbol("pulse.missing");

type ValueState =
  | { readonly exists: false; readonly value: typeof MISSING }
  | { readonly exists: true; readonly value: unknown };

const MISSING_VALUE_STATE: ValueState = { exists: false, value: MISSING };

export type { PulsePath };

export function normalizeChildKey(
  currentValue: unknown,
  property: PropertyKey,
): PropertyKey {
  if (typeof property !== "string") {
    return property;
  }

  if (property === "length") {
    return property;
  }

  if (Array.isArray(currentValue) && isArrayIndexString(property)) {
    return Number(property);
  }

  return property;
}

export function readValueAtPath(rootValue: unknown, path: PulsePath): unknown {
  const valueState = readValueStateAtPath(rootValue, path);
  return valueState.exists ? valueState.value : undefined;
}

export function setValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
): unknown {
  if (path.length === 0) {
    return Object.is(rootValue, nextValue) ? rootValue : nextValue;
  }

  return writeValueAtPath(rootValue, path, nextValue, []);
}

export function collectPulseMutations(
  previousRootValue: unknown,
  currentRootValue: unknown,
): readonly PulseMutation[] {
  const mutations: PulseMutation[] = [];
  collectMutations(
    readExistingValue(previousRootValue),
    readExistingValue(currentRootValue),
    [],
    mutations,
  );
  return mutations;
}

export function isRelevantMutationPath(
  nodePath: PulsePath,
  mutationPath: PulsePath,
): boolean {
  return (
    isPathPrefix(nodePath, mutationPath) || isPathPrefix(mutationPath, nodePath)
  );
}

export function formatPulsePath(path: PulsePath): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }

      if (typeof segment === "symbol") {
        return `[${String(segment)}]`;
      }

      return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment)
        ? `.${segment}`
        : `[${JSON.stringify(segment)}]`;
    })
    .join("")
    .replace(/^\./u, "");
}

function writeValueAtPath(
  currentValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  traversedPath: PulsePath,
): unknown {
  const [segment, ...restPath] = path;
  if (segment === undefined) {
    return nextValue;
  }

  if (segment === "length") {
    if (restPath.length > 0) {
      throw new TypeError(
        `Cannot write below array length at ${formatPulsePath(traversedPath)}.`,
      );
    }

    const arrayValue = currentValue === undefined ? [] : currentValue;
    if (!Array.isArray(arrayValue)) {
      throw new TypeError(
        `Cannot write array length at ${formatPulsePath(traversedPath)}.`,
      );
    }

    const normalizedLength = normalizeArrayLength(nextValue);
    if (arrayValue.length === normalizedLength) {
      return arrayValue;
    }

    const nextArrayValue = arrayValue.slice();
    nextArrayValue.length = normalizedLength;
    return nextArrayValue;
  }

  const nextPath = [...traversedPath, segment];
  const container = cloneWritableContainer(
    currentValue,
    segment,
    traversedPath,
  );
  const previousChildValue = readChildValue(currentValue, segment);
  const nextChildValue = writeValueAtPath(
    previousChildValue,
    restPath,
    nextValue,
    nextPath,
  );

  if (Object.is(previousChildValue, nextChildValue)) {
    return currentValue;
  }

  writeChildValue(container, segment, nextChildValue);
  return container;
}

function collectMutations(
  previousState: ValueState,
  currentState: ValueState,
  path: PulsePath,
  mutations: PulseMutation[],
): void {
  if (!previousState.exists && !currentState.exists) {
    return;
  }

  if (!previousState.exists) {
    mutations.push({
      kind: "set",
      path,
      value: currentState.value,
      previousValue: undefined,
    });
    return;
  }

  if (!currentState.exists) {
    mutations.push({
      kind: "delete",
      path,
      previousValue: previousState.value,
    });
    return;
  }

  if (Object.is(previousState.value, currentState.value)) {
    return;
  }

  if (Array.isArray(previousState.value) && Array.isArray(currentState.value)) {
    collectArrayMutations(
      previousState.value,
      currentState.value,
      path,
      mutations,
    );
    return;
  }

  if (isPlainObject(previousState.value) && isPlainObject(currentState.value)) {
    collectObjectMutations(
      previousState.value,
      currentState.value,
      path,
      mutations,
    );
    return;
  }

  mutations.push({
    kind: "replace",
    path,
    value: currentState.value,
    previousValue: previousState.value,
  });
}

function collectArrayMutations(
  previousArrayValue: readonly unknown[],
  currentArrayValue: readonly unknown[],
  path: PulsePath,
  mutations: PulseMutation[],
): void {
  const mutationCountBefore = mutations.length;
  const sharedLength = Math.min(
    previousArrayValue.length,
    currentArrayValue.length,
  );

  for (let index = 0; index < sharedLength; index += 1) {
    collectMutations(
      readExistingValue(previousArrayValue[index]),
      readExistingValue(currentArrayValue[index]),
      [...path, index],
      mutations,
    );
  }

  for (
    let index = sharedLength;
    index < previousArrayValue.length;
    index += 1
  ) {
    collectMutations(
      readExistingValue(previousArrayValue[index]),
      MISSING_VALUE_STATE,
      [...path, index],
      mutations,
    );
  }

  for (let index = sharedLength; index < currentArrayValue.length; index += 1) {
    collectMutations(
      MISSING_VALUE_STATE,
      readExistingValue(currentArrayValue[index]),
      [...path, index],
      mutations,
    );
  }

  if (previousArrayValue.length !== currentArrayValue.length) {
    mutations.push({
      kind: "replace",
      path: [...path, "length"],
      value: currentArrayValue.length,
      previousValue: previousArrayValue.length,
    });
  }

  if (mutations.length === mutationCountBefore) {
    mutations.push({
      kind: "replace",
      path,
      value: currentArrayValue,
      previousValue: previousArrayValue,
    });
  }
}

function collectObjectMutations(
  previousObjectValue: Record<PropertyKey, unknown>,
  currentObjectValue: Record<PropertyKey, unknown>,
  path: PulsePath,
  mutations: PulseMutation[],
): void {
  const mutationCountBefore = mutations.length;
  const keys = new Set<PropertyKey>([
    ...getEnumerableOwnKeys(previousObjectValue),
    ...getEnumerableOwnKeys(currentObjectValue),
  ]);

  for (const key of keys) {
    collectMutations(
      readOwnValue(previousObjectValue, key),
      readOwnValue(currentObjectValue, key),
      [...path, key],
      mutations,
    );
  }

  if (mutations.length === mutationCountBefore) {
    mutations.push({
      kind: "replace",
      path,
      value: currentObjectValue,
      previousValue: previousObjectValue,
    });
  }
}

function readValueStateAtPath(rootValue: unknown, path: PulsePath): ValueState {
  let currentState = readExistingValue(rootValue);

  for (const segment of path) {
    if (!currentState.exists) {
      return currentState;
    }

    if (segment === "length") {
      if (!Array.isArray(currentState.value)) {
        return MISSING_VALUE_STATE;
      }

      currentState = readExistingValue(currentState.value.length);
      continue;
    }

    currentState = readChildState(currentState.value, segment);
  }

  return currentState;
}

function readChildState(
  currentValue: unknown,
  segment: PropertyKey,
): ValueState {
  if (Array.isArray(currentValue)) {
    if (typeof segment !== "number") {
      return MISSING_VALUE_STATE;
    }

    return segment >= 0 && segment < currentValue.length
      ? readExistingValue(currentValue[segment])
      : MISSING_VALUE_STATE;
  }

  if (!isObjectLike(currentValue)) {
    return MISSING_VALUE_STATE;
  }

  return readOwnValue(currentValue as Record<PropertyKey, unknown>, segment);
}

function readExistingValue(value: unknown): ValueState {
  return { exists: true, value };
}

function readOwnValue(
  objectValue: Record<PropertyKey, unknown>,
  key: PropertyKey,
): ValueState {
  return Object.prototype.hasOwnProperty.call(objectValue, key)
    ? readExistingValue(objectValue[key])
    : MISSING_VALUE_STATE;
}

function readChildValue(currentValue: unknown, segment: PropertyKey): unknown {
  if (segment === "length") {
    return Array.isArray(currentValue) ? currentValue.length : undefined;
  }

  if (Array.isArray(currentValue) && typeof segment === "number") {
    return currentValue[segment];
  }

  if (!isObjectLike(currentValue)) {
    return undefined;
  }

  return Reflect.get(currentValue as object, segment);
}

function cloneWritableContainer(
  currentValue: unknown,
  nextSegment: PropertyKey,
  traversedPath: PulsePath,
): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(currentValue)) {
    return currentValue.slice();
  }

  if (isPlainObject(currentValue)) {
    return { ...currentValue };
  }

  if (currentValue === undefined) {
    return nextSegment === "length" || typeof nextSegment === "number"
      ? []
      : {};
  }

  throw new TypeError(
    `Cannot write through non-traversable value at ${formatPulsePath(traversedPath)}.`,
  );
}

function writeChildValue(
  container: Record<PropertyKey, unknown> | unknown[],
  segment: PropertyKey,
  nextChildValue: unknown,
): void {
  if (Array.isArray(container)) {
    if (typeof segment !== "number") {
      throw new TypeError(`Invalid array write segment: ${String(segment)}.`);
    }

    container[segment] = nextChildValue;
    return;
  }

  container[segment] = nextChildValue;
}

function isArrayIndexString(value: string): boolean {
  return /^(0|[1-9]\d*)$/u.test(value);
}

function normalizeArrayLength(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError("Array length must be a non-negative integer.");
  }

  return value;
}

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (!isObjectLike(value) || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getEnumerableOwnKeys(
  objectValue: Record<PropertyKey, unknown>,
): readonly PropertyKey[] {
  return Reflect.ownKeys(objectValue).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(objectValue, key),
  );
}

function isPathPrefix(prefix: PulsePath, fullPath: PulsePath): boolean {
  if (prefix.length > fullPath.length) {
    return false;
  }

  return prefix.every((segment, index) => Object.is(segment, fullPath[index]));
}
