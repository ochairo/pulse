import type { PulseMutation } from "../contract/types.js";
import {
  ARRAY_LENGTH_SEGMENT,
  getPulsePathKey,
  type PulsePath,
} from "../path/index.js";
import {
  getEnumerableOwnKeys,
  isPlainObject,
  MISSING_VALUE_STATE,
  readChildState,
  readExistingValue,
  type ValueState,
} from "./state.js";

export function collectPulseMutationsAtPaths(
  previousRootValue: unknown,
  currentRootValue: unknown,
  paths: readonly PulsePath[],
): readonly PulseMutation[] {
  if (paths.length === 0) {
    return [];
  }

  const uniquePaths = new Map<string, PulsePath>();

  for (const path of paths) {
    uniquePaths.set(getPulsePathKey(path), path);
    collectChangedArrayLengthPaths(
      previousRootValue,
      currentRootValue,
      path,
      uniquePaths,
    );
  }

  const mutations: PulseMutation[] = [];
  const previousCache = createValueStatePathCache(previousRootValue);
  const currentCache = createValueStatePathCache(currentRootValue);

  for (const path of uniquePaths.values()) {
    collectMutations(
      readCachedValueStateAtPath(previousCache, path),
      readCachedValueStateAtPath(currentCache, path),
      path,
      mutations,
    );
  }

  return mutations;
}

function collectChangedArrayLengthPaths(
  previousRootValue: unknown,
  currentRootValue: unknown,
  path: PulsePath,
  uniquePaths: Map<string, PulsePath>,
): void {
  let previousState = readExistingValue(previousRootValue);
  let currentState = readExistingValue(currentRootValue);
  const traversedPath: PropertyKey[] = [];

  for (const segment of path) {
    if (
      typeof segment === "number" &&
      previousState.exists &&
      currentState.exists &&
      Array.isArray(previousState.value) &&
      Array.isArray(currentState.value) &&
      previousState.value.length !== currentState.value.length
    ) {
      const lengthPath = [...traversedPath, ARRAY_LENGTH_SEGMENT];
      uniquePaths.set(getPulsePathKey(lengthPath), lengthPath);
    }

    traversedPath.push(segment);
    previousState = readChildState(
      previousState.exists ? previousState.value : undefined,
      segment,
    );
    currentState = readChildState(
      currentState.exists ? currentState.value : undefined,
      segment,
    );
  }
}

interface ValueStatePathCache {
  path: PulsePath;
  states: ValueState[];
}

function createValueStatePathCache(rootValue: unknown): ValueStatePathCache {
  return {
    path: [],
    states: [readExistingValue(rootValue)],
  };
}

function readCachedValueStateAtPath(
  cache: ValueStatePathCache,
  path: PulsePath,
): ValueState {
  const commonPrefixLength = getCommonPrefixLength(cache.path, path);
  const states = cache.states.slice(0, commonPrefixLength + 1);
  let currentState = states[states.length - 1] as ValueState;

  for (let index = commonPrefixLength; index < path.length; index += 1) {
    currentState = readStateAtSegment(currentState, path[index] as PropertyKey);
    states.push(currentState);
  }

  cache.path = path;
  cache.states = states;
  return currentState;
}

function getCommonPrefixLength(
  previousPath: PulsePath,
  nextPath: PulsePath,
): number {
  const sharedLength = Math.min(previousPath.length, nextPath.length);
  let index = 0;

  while (index < sharedLength) {
    if (!Object.is(previousPath[index], nextPath[index])) {
      break;
    }

    index += 1;
  }

  return index;
}

function readStateAtSegment(
  currentState: ValueState,
  segment: PropertyKey,
): ValueState {
  if (!currentState.exists) {
    return currentState;
  }

  if (segment === ARRAY_LENGTH_SEGMENT) {
    return Array.isArray(currentState.value)
      ? readExistingValue(currentState.value.length)
      : MISSING_VALUE_STATE;
  }

  return readChildState(currentState.value, segment);
}

export function collectMutations(
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
      key: getPathKey(path),
      value: currentState.value,
      previousValue: undefined,
    });
    return;
  }

  if (!currentState.exists) {
    mutations.push({
      kind: "delete",
      path,
      key: getPathKey(path),
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
    key: getPathKey(path),
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
    const previousElement = previousArrayValue[index];
    const currentElement = currentArrayValue[index];

    if (Object.is(previousElement, currentElement)) {
      continue;
    }

    collectMutations(
      readExistingValue(previousElement),
      readExistingValue(currentElement),
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
      path: [...path, ARRAY_LENGTH_SEGMENT],
      key: ARRAY_LENGTH_SEGMENT,
      value: currentArrayValue.length,
      previousValue: previousArrayValue.length,
    });
  }

  if (mutations.length === mutationCountBefore) {
    mutations.push({
      kind: "replace",
      path,
      key: getPathKey(path),
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
    const prevHas = Object.prototype.hasOwnProperty.call(
      previousObjectValue,
      key,
    );
    const currHas = Object.prototype.hasOwnProperty.call(
      currentObjectValue,
      key,
    );

    if (
      prevHas &&
      currHas &&
      Object.is(previousObjectValue[key], currentObjectValue[key])
    ) {
      continue;
    }

    collectMutations(
      prevHas
        ? readExistingValue(previousObjectValue[key])
        : MISSING_VALUE_STATE,
      currHas
        ? readExistingValue(currentObjectValue[key])
        : MISSING_VALUE_STATE,
      [...path, key],
      mutations,
    );
  }

  if (mutations.length === mutationCountBefore) {
    mutations.push({
      kind: "replace",
      path,
      key: getPathKey(path),
      value: currentObjectValue,
      previousValue: previousObjectValue,
    });
  }
}

function getPathKey(path: PulsePath): PropertyKey | undefined {
  return path.length === 0 ? undefined : path[path.length - 1];
}
