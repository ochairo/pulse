import type { PulseMutation } from "../contract/types.js";
import {
  ARRAY_LENGTH_SEGMENT,
  formatPulsePath,
  type PulsePath,
} from "../path/index.js";
import { collectMutations } from "./mutations.js";
import {
  isPlainObject,
  readChildState,
  readExistingValue,
  type ValueState,
} from "./state.js";

export interface PulseWriteResult {
  readonly rootValue: unknown;
  readonly mutations: readonly PulseMutation[];
}

export interface PulseWriteRootResult {
  readonly changed: boolean;
  readonly rootValue: unknown;
}

export interface PulseBatchWriteState {
  clonedContainers: Map<string, Record<PropertyKey, unknown> | unknown[]>;
  canAccumulateMutations: boolean;
  pendingMutations: Map<PulsePath, PulseMutation>;
  rootValue: unknown;
}

interface WriteStepResult {
  readonly changed: boolean;
  readonly value: unknown;
  readonly mutations: readonly PulseMutation[];
}

export function setValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
): PulseWriteResult {
  const singleSegmentFastResult = trySetSingleSegmentLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    true,
  );

  if (singleSegmentFastResult) {
    return singleSegmentFastResult;
  }

  const twoSegmentFastResult = trySetTwoSegmentLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    true,
  );

  if (twoSegmentFastResult) {
    return twoSegmentFastResult;
  }

  const fastResult = trySetExistingLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    true,
  );

  if (fastResult) {
    return fastResult;
  }

  const result = writeValueAtPath(
    readExistingValue(rootValue),
    path,
    nextValue,
    [],
    true,
  );

  return result.changed
    ? { rootValue: result.value, mutations: result.mutations }
    : { rootValue, mutations: [] };
}

export function setValueAtPathWithoutMutations(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
): PulseWriteRootResult {
  const singleSegmentFastResult = trySetSingleSegmentLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    false,
  );

  if (singleSegmentFastResult) {
    return {
      changed: true,
      rootValue: singleSegmentFastResult.rootValue,
    };
  }

  const twoSegmentFastResult = trySetTwoSegmentLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    false,
  );

  if (twoSegmentFastResult) {
    return {
      changed: true,
      rootValue: twoSegmentFastResult.rootValue,
    };
  }

  const fastResult = trySetExistingLeafValueAtPath(
    rootValue,
    path,
    nextValue,
    false,
  );

  if (fastResult) {
    return {
      changed: true,
      rootValue: fastResult.rootValue,
    };
  }

  const result = writeValueAtPath(
    readExistingValue(rootValue),
    path,
    nextValue,
    [],
    false,
  );

  return result.changed
    ? { changed: true, rootValue: result.value }
    : { changed: false, rootValue };
}

export function createPulseBatchWriteState(
  rootValue: unknown,
): PulseBatchWriteState {
  return {
    canAccumulateMutations: true,
    clonedContainers: new Map(),
    pendingMutations: new Map(),
    rootValue,
  };
}

export function setValueAtPathInBatch(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  batchState: PulseBatchWriteState,
): PulseWriteRootResult {
  const draftResult = trySetValueAtPathWithDraftCache(
    rootValue,
    path,
    nextValue,
    batchState,
  );

  if (draftResult) {
    return draftResult;
  }

  const fallbackResult = setValueAtPathWithoutMutations(
    rootValue,
    path,
    nextValue,
  );

  if (!fallbackResult.changed) {
    return fallbackResult;
  }

  batchState.canAccumulateMutations = false;
  batchState.clonedContainers.clear();
  batchState.pendingMutations.clear();
  batchState.rootValue = fallbackResult.rootValue;
  return fallbackResult;
}

function trySetValueAtPathWithDraftCache(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  batchState: PulseBatchWriteState,
): PulseWriteRootResult | null {
  if (path.length === 0 || path.includes(ARRAY_LENGTH_SEGMENT)) {
    return null;
  }

  const rootContainer = getOrCreateDraftContainer(rootValue, "", batchState);

  if (!rootContainer) {
    return null;
  }

  let currentContainer = rootContainer;
  let prefixKey = "";

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index] as PropertyKey;
    prefixKey = appendDraftKey(prefixKey, segment);
    const nextContainer = getOrCreateDraftChildContainer(
      currentContainer,
      segment,
      prefixKey,
      batchState,
    );

    if (!nextContainer) {
      return null;
    }

    currentContainer = nextContainer;
  }

  const leafKey = path[path.length - 1] as PropertyKey;
  const previousLeafValue = readExistingChildValue(currentContainer, leafKey);

  if (previousLeafValue === MISSING_CHILD_VALUE) {
    return null;
  }

  if (Object.is(previousLeafValue, nextValue)) {
    return {
      changed: false,
      rootValue: batchState.rootValue,
    };
  }

  recordBatchReplaceMutation(batchState, path, previousLeafValue, nextValue);
  writeChildValue(currentContainer, leafKey, nextValue);

  return {
    changed: true,
    rootValue: batchState.rootValue,
  };
}

const MISSING_CHILD_VALUE = Symbol("pulse.missing-child-value");

function getOrCreateDraftContainer(
  currentValue: unknown,
  cacheKey: string,
  batchState: PulseBatchWriteState,
): (Record<PropertyKey, unknown> | unknown[]) | null {
  const cachedContainer = batchState.clonedContainers.get(cacheKey);

  if (cachedContainer) {
    return cachedContainer;
  }

  if (!Array.isArray(currentValue) && !isPlainObject(currentValue)) {
    return null;
  }

  const clonedContainer = cloneExistingWritableContainer(currentValue);
  batchState.clonedContainers.set(cacheKey, clonedContainer);
  batchState.rootValue = clonedContainer;
  return clonedContainer;
}

function getOrCreateDraftChildContainer(
  parentContainer: Record<PropertyKey, unknown> | unknown[],
  segment: PropertyKey,
  cacheKey: string,
  batchState: PulseBatchWriteState,
): (Record<PropertyKey, unknown> | unknown[]) | null {
  const cachedContainer = batchState.clonedContainers.get(cacheKey);

  if (cachedContainer) {
    return cachedContainer;
  }

  const childValue = readExistingChildValue(parentContainer, segment);

  if (childValue === MISSING_CHILD_VALUE) {
    return null;
  }

  if (!Array.isArray(childValue) && !isPlainObject(childValue)) {
    return null;
  }

  const clonedContainer = cloneExistingWritableContainer(childValue);
  writeChildValue(parentContainer, segment, clonedContainer);
  batchState.clonedContainers.set(cacheKey, clonedContainer);
  return clonedContainer;
}

function cloneExistingWritableContainer(
  currentValue: Record<PropertyKey, unknown> | unknown[],
): Record<PropertyKey, unknown> | unknown[] {
  return Array.isArray(currentValue)
    ? currentValue.slice()
    : { ...currentValue };
}

function readExistingChildValue(
  currentValue: Record<PropertyKey, unknown> | unknown[],
  segment: PropertyKey,
): unknown {
  if (Array.isArray(currentValue)) {
    if (
      typeof segment !== "number" ||
      segment < 0 ||
      segment >= currentValue.length
    ) {
      return MISSING_CHILD_VALUE;
    }

    return currentValue[segment];
  }

  if (!Object.prototype.hasOwnProperty.call(currentValue, segment)) {
    return MISSING_CHILD_VALUE;
  }

  return currentValue[segment];
}

function appendDraftKey(prefixKey: string, segment: PropertyKey): string {
  if (typeof segment === "number") {
    return `${prefixKey}|n:${segment}`;
  }

  if (typeof segment === "symbol") {
    return `${prefixKey}|y:${String(segment)}`;
  }

  return `${prefixKey}|s:${segment}`;
}

function recordBatchReplaceMutation(
  batchState: PulseBatchWriteState,
  path: PulsePath,
  previousValue: unknown,
  nextValue: unknown,
): void {
  if (!batchState.canAccumulateMutations) {
    return;
  }

  const existingMutation = batchState.pendingMutations.get(path);

  if (existingMutation) {
    if (Object.is(existingMutation.previousValue, nextValue)) {
      batchState.pendingMutations.delete(path);
      return;
    }

    batchState.pendingMutations.set(path, {
      kind: "replace",
      path,
      key: path[path.length - 1],
      value: nextValue,
      previousValue: existingMutation.previousValue,
    });
    return;
  }

  batchState.pendingMutations.set(path, {
    kind: "replace",
    path,
    key: path[path.length - 1],
    value: nextValue,
    previousValue,
  });
}

function trySetSingleSegmentLeafValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  shouldCollectMutations: boolean,
): PulseWriteResult | null {
  if (path.length !== 1) {
    return null;
  }

  const leafSegment = path[0] as PropertyKey;

  if (leafSegment === ARRAY_LENGTH_SEGMENT) {
    return null;
  }

  if (Array.isArray(rootValue)) {
    if (
      typeof leafSegment !== "number" ||
      leafSegment < 0 ||
      leafSegment >= rootValue.length
    ) {
      return null;
    }

    const previousLeafValue = rootValue[leafSegment];

    if (Object.is(previousLeafValue, nextValue)) {
      return {
        rootValue,
        mutations: [],
      };
    }

    if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
      return null;
    }

    const nextRootValue = rootValue.slice();
    nextRootValue[leafSegment] = nextValue;

    return {
      rootValue: nextRootValue,
      mutations: shouldCollectMutations
        ? [
            {
              kind: "replace",
              path,
              key: leafSegment,
              value: nextValue,
              previousValue: previousLeafValue,
            },
          ]
        : [],
    };
  }

  if (!isPlainObject(rootValue)) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(rootValue, leafSegment)) {
    return null;
  }

  const previousLeafValue = rootValue[leafSegment];

  if (Object.is(previousLeafValue, nextValue)) {
    return {
      rootValue,
      mutations: [],
    };
  }

  if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
    return null;
  }

  const nextRootValue = {
    ...rootValue,
    [leafSegment]: nextValue,
  };

  return {
    rootValue: nextRootValue,
    mutations: shouldCollectMutations
      ? [
          {
            kind: "replace",
            path,
            key: leafSegment,
            value: nextValue,
            previousValue: previousLeafValue,
          },
        ]
      : [],
  };
}

function trySetTwoSegmentLeafValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  shouldCollectMutations: boolean,
): PulseWriteResult | null {
  if (path.length !== 2) {
    return null;
  }

  const firstSegment = path[0] as PropertyKey;
  const leafSegment = path[1] as PropertyKey;

  if (
    firstSegment === ARRAY_LENGTH_SEGMENT ||
    leafSegment === ARRAY_LENGTH_SEGMENT
  ) {
    return null;
  }

  let parentValue: unknown;
  let nextRootValue: unknown;

  if (Array.isArray(rootValue)) {
    if (
      typeof firstSegment !== "number" ||
      firstSegment < 0 ||
      firstSegment >= rootValue.length
    ) {
      return null;
    }

    parentValue = rootValue[firstSegment];

    const nextParentValue = replaceExistingLeafOnContainer(
      parentValue,
      leafSegment,
      nextValue,
    );

    if (!nextParentValue) {
      return null;
    }

    const nextRootArray = rootValue.slice();
    nextRootArray[firstSegment] = nextParentValue.nextContainerValue;
    nextRootValue = nextRootArray;

    return {
      rootValue: nextRootValue,
      mutations: shouldCollectMutations
        ? [
            {
              kind: "replace",
              path,
              key: leafSegment,
              value: nextValue,
              previousValue: nextParentValue.previousLeafValue,
            },
          ]
        : [],
    };
  }

  if (!isPlainObject(rootValue)) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(rootValue, firstSegment)) {
    return null;
  }

  parentValue = rootValue[firstSegment];

  const nextParentValue = replaceExistingLeafOnContainer(
    parentValue,
    leafSegment,
    nextValue,
  );

  if (!nextParentValue) {
    return null;
  }

  nextRootValue = {
    ...rootValue,
    [firstSegment]: nextParentValue.nextContainerValue,
  };

  return {
    rootValue: nextRootValue,
    mutations: shouldCollectMutations
      ? [
          {
            kind: "replace",
            path,
            key: leafSegment,
            value: nextValue,
            previousValue: nextParentValue.previousLeafValue,
          },
        ]
      : [],
  };
}

function replaceExistingLeafOnContainer(
  containerValue: unknown,
  leafSegment: PropertyKey,
  nextValue: unknown,
): {
  nextContainerValue: unknown;
  previousLeafValue: unknown;
} | null {
  if (Array.isArray(containerValue)) {
    if (
      typeof leafSegment !== "number" ||
      leafSegment < 0 ||
      leafSegment >= containerValue.length
    ) {
      return null;
    }

    const previousLeafValue = containerValue[leafSegment];

    if (Object.is(previousLeafValue, nextValue)) {
      return {
        nextContainerValue: containerValue,
        previousLeafValue,
      };
    }

    if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
      return null;
    }

    const nextContainerValue = containerValue.slice();
    nextContainerValue[leafSegment] = nextValue;

    return {
      nextContainerValue,
      previousLeafValue,
    };
  }

  if (!isPlainObject(containerValue)) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(containerValue, leafSegment)) {
    return null;
  }

  const previousLeafValue = containerValue[leafSegment];

  if (Object.is(previousLeafValue, nextValue)) {
    return {
      nextContainerValue: containerValue,
      previousLeafValue,
    };
  }

  if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
    return null;
  }

  return {
    nextContainerValue: {
      ...containerValue,
      [leafSegment]: nextValue,
    },
    previousLeafValue,
  };
}

function trySetExistingLeafValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  shouldCollectMutations: boolean,
): PulseWriteResult | null {
  if (path.length === 0 || path.includes(ARRAY_LENGTH_SEGMENT)) {
    return null;
  }

  const containers: Array<Record<PropertyKey, unknown> | unknown[]> = [];
  const segments: PropertyKey[] = [];
  let currentValue = rootValue;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index] as PropertyKey;

    if (Array.isArray(currentValue)) {
      if (
        typeof segment !== "number" ||
        segment < 0 ||
        segment >= currentValue.length
      ) {
        return null;
      }

      containers.push(currentValue);
      segments.push(segment);
      currentValue = currentValue[segment];
      continue;
    }

    if (!isPlainObject(currentValue)) {
      return null;
    }

    if (!Object.prototype.hasOwnProperty.call(currentValue, segment)) {
      return null;
    }

    containers.push(currentValue);
    segments.push(segment);
    currentValue = currentValue[segment];
  }

  const leafSegment = path[path.length - 1] as PropertyKey;
  let previousLeafValue: unknown;

  if (Array.isArray(currentValue)) {
    if (
      typeof leafSegment !== "number" ||
      leafSegment < 0 ||
      leafSegment >= currentValue.length
    ) {
      return null;
    }

    previousLeafValue = currentValue[leafSegment];
  } else {
    if (!isPlainObject(currentValue)) {
      return null;
    }

    if (!Object.prototype.hasOwnProperty.call(currentValue, leafSegment)) {
      return null;
    }

    previousLeafValue = currentValue[leafSegment];
  }

  if (Object.is(previousLeafValue, nextValue)) {
    return {
      rootValue,
      mutations: [],
    };
  }

  if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
    return null;
  }

  let nextChildValue = nextValue;
  let nextRootValue: unknown;

  if (Array.isArray(currentValue)) {
    const nextContainer = currentValue.slice();
    nextContainer[leafSegment as number] = nextChildValue;
    nextChildValue = nextContainer;
  } else {
    nextChildValue = {
      ...currentValue,
      [leafSegment]: nextChildValue,
    };
  }

  if (containers.length === 0) {
    nextRootValue = nextChildValue;
  } else {
    nextRootValue = rebuildRootValue(containers, segments, nextChildValue);
  }

  return {
    rootValue: nextRootValue,
    mutations: shouldCollectMutations
      ? [
          {
            kind: "replace",
            path,
            key: leafSegment,
            value: nextValue,
            previousValue: previousLeafValue,
          },
        ]
      : [],
  };
}

function rebuildRootValue(
  containers: Array<Record<PropertyKey, unknown> | unknown[]>,
  segments: readonly PropertyKey[],
  nextChildValue: unknown,
): unknown {
  let rebuiltValue = nextChildValue;

  for (let index = containers.length - 1; index >= 0; index -= 1) {
    const container = containers[index] as
      | Record<PropertyKey, unknown>
      | unknown[];
    const segment = segments[index] as PropertyKey;

    if (Array.isArray(container)) {
      const nextContainer = container.slice();
      nextContainer[segment as number] = rebuiltValue;
      rebuiltValue = nextContainer;
      continue;
    }

    rebuiltValue = {
      ...container,
      [segment]: rebuiltValue,
    };
  }

  return rebuiltValue;
}

function canTraverseAsStructuredValue(
  previousValue: unknown,
  nextValue: unknown,
): boolean {
  return (
    (Array.isArray(previousValue) && Array.isArray(nextValue)) ||
    (isPlainObject(previousValue) && isPlainObject(nextValue))
  );
}

function writeValueAtPath(
  currentState: ValueState,
  path: PulsePath,
  nextValue: unknown,
  traversedPath: PulsePath,
  shouldCollectMutations: boolean,
): WriteStepResult {
  const currentValue = currentState.exists ? currentState.value : undefined;

  if (path.length === 0) {
    if (currentState.exists && Object.is(currentState.value, nextValue)) {
      return {
        changed: false,
        value: currentValue,
        mutations: [],
      };
    }

    const mutations: PulseMutation[] = [];

    if (shouldCollectMutations) {
      collectMutations(
        currentState,
        readExistingValue(nextValue),
        traversedPath,
        mutations,
      );
    }

    return {
      changed: shouldCollectMutations ? mutations.length > 0 : true,
      value: nextValue,
      mutations,
    };
  }

  const segment = path[0] as PropertyKey;
  const restPath = path.slice(1);

  if (segment === ARRAY_LENGTH_SEGMENT) {
    return writeArrayLength(
      currentValue,
      restPath,
      nextValue,
      traversedPath,
      shouldCollectMutations,
    );
  }

  const nextPath = [...traversedPath, segment];
  const container = cloneWritableContainer(
    currentValue,
    segment,
    traversedPath,
  );
  const previousChildState = readChildState(currentValue, segment);
  const nextChildResult = writeValueAtPath(
    previousChildState,
    restPath,
    nextValue,
    nextPath,
    shouldCollectMutations,
  );

  if (!nextChildResult.changed) {
    return {
      changed: false,
      value: currentValue,
      mutations: [],
    };
  }

  const previousLength = Array.isArray(container) ? container.length : null;

  writeChildValue(container, segment, nextChildResult.value);

  const mutations = [...nextChildResult.mutations];
  if (
    shouldCollectMutations &&
    Array.isArray(container) &&
    previousLength !== container.length
  ) {
    mutations.push({
      kind: "replace",
      path: [...traversedPath, ARRAY_LENGTH_SEGMENT],
      key: ARRAY_LENGTH_SEGMENT,
      value: container.length,
      previousValue: previousLength,
    });
  }

  return {
    changed: true,
    value: container,
    mutations,
  };
}

function writeArrayLength(
  currentValue: unknown,
  restPath: readonly PropertyKey[],
  nextValue: unknown,
  traversedPath: PulsePath,
  shouldCollectMutations: boolean,
): WriteStepResult {
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
    return {
      changed: false,
      value: arrayValue,
      mutations: [],
    };
  }

  const nextArrayValue = arrayValue.slice();
  nextArrayValue.length = normalizedLength;

  const mutations: PulseMutation[] = [];

  if (shouldCollectMutations) {
    collectMutations(
      readExistingValue(arrayValue),
      readExistingValue(nextArrayValue),
      traversedPath,
      mutations,
    );
  }

  return {
    changed: true,
    value: nextArrayValue,
    mutations,
  };
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
    return typeof nextSegment === "number" ? [] : {};
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

function normalizeArrayLength(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError("Array length must be a non-negative integer.");
  }

  return value;
}
