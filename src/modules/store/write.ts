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

interface PulseWriteResult {
  readonly rootValue: unknown;
  readonly mutations: readonly PulseMutation[];
}

interface PulseWriteRootResult {
  readonly changed: boolean;
  readonly rootValue: unknown;
}

export interface PulseBatchWriteState {
  canAccumulateMutations: boolean;
  pendingMutations: Map<PulsePath, PulseMutation>;
  rootValue: unknown;
  version: number;
}

interface PulseWriteAncestorStep {
  readonly childKey: PropertyKey;
  readonly currentValue: unknown;
}

interface WriteStepResult {
  readonly changed: boolean;
  readonly value: unknown;
  readonly mutations: readonly PulseMutation[];
}

interface ExistingLeafWriteContext {
  readonly ancestors: PulseWriteAncestorStep[];
  readonly leafKey: PropertyKey;
  readonly previousLeafValue: unknown;
}

export function setValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
): PulseWriteResult {
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
    true,
    [],
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
    false,
    [],
  );

  return result.changed
    ? { changed: true, rootValue: result.value }
    : { changed: false, rootValue };
}

export function createPulseBatchWriteState(
  rootValue: unknown,
  version: number,
  canAccumulateMutations = true,
): PulseBatchWriteState {
  return {
    canAccumulateMutations,
    pendingMutations: new Map(),
    rootValue,
    version,
  };
}

const MISSING_CHILD_VALUE = Symbol("pulse.missing-child-value");

function cloneExistingWritableContainer(
  currentValue: Record<PropertyKey, unknown> | unknown[],
): Record<PropertyKey, unknown> | unknown[] {
  return Array.isArray(currentValue)
    ? currentValue.slice()
    : { ...currentValue };
}

function trySetExistingLeafValueAtPath(
  rootValue: unknown,
  path: PulsePath,
  nextValue: unknown,
  shouldCollectMutations: boolean,
): PulseWriteResult | null {
  const writeContext = createExistingLeafWriteContext(rootValue, path);

  if (!writeContext) {
    return null;
  }

  const { ancestors, leafKey, previousLeafValue } = writeContext;

  if (Object.is(previousLeafValue, nextValue)) {
    return {
      rootValue,
      mutations: [],
    };
  }

  if (canTraverseAsStructuredValue(previousLeafValue, nextValue)) {
    return null;
  }

  const nextRootValue = rebuildValueFromAncestorChain(ancestors, nextValue);

  return {
    rootValue: nextRootValue,
    mutations: shouldCollectMutations
      ? [
          {
            kind: "replace",
            path,
            key: leafKey,
            value: nextValue,
            previousValue: previousLeafValue,
          },
        ]
      : [],
  };
}

function createExistingLeafWriteContext(
  rootValue: unknown,
  path: PulsePath,
): ExistingLeafWriteContext | null {
  if (path.length === 0) {
    return null;
  }

  const leafSegment = path[path.length - 1] as PropertyKey;

  if (leafSegment === ARRAY_LENGTH_SEGMENT) {
    return null;
  }

  const ancestors: PulseWriteAncestorStep[] = [];
  let currentValue = rootValue;
  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index] as PropertyKey;

    if (segment === ARRAY_LENGTH_SEGMENT) {
      return null;
    }

    ancestors.push({
      childKey: segment,
      currentValue,
    });

    if (index === path.length - 1) {
      break;
    }

    const container = readExistingStructuredContainer(currentValue, segment);

    if (!container) {
      return null;
    }

    currentValue = container;
  }

  const previousLeafValue = readExistingLeafValue(currentValue, leafSegment);

  if (previousLeafValue === MISSING_CHILD_VALUE) {
    return null;
  }

  return {
    ancestors,
    leafKey: leafSegment,
    previousLeafValue,
  };
}

function readExistingStructuredContainer(
  currentValue: unknown,
  segment: PropertyKey,
): (Record<PropertyKey, unknown> | unknown[]) | null {
  const childValue = readExistingLeafValue(currentValue, segment);

  if (
    childValue === MISSING_CHILD_VALUE ||
    (!Array.isArray(childValue) && !isPlainObject(childValue))
  ) {
    return null;
  }

  return childValue;
}

function readExistingLeafValue(
  currentValue: unknown,
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

  if (!isPlainObject(currentValue)) {
    return MISSING_CHILD_VALUE;
  }

  if (!Object.prototype.hasOwnProperty.call(currentValue, segment)) {
    return MISSING_CHILD_VALUE;
  }

  return currentValue[segment];
}

function rebuildValueFromAncestorChain(
  ancestors: readonly PulseWriteAncestorStep[],
  nextLeafValue: unknown,
): unknown {
  let rebuiltValue = nextLeafValue;

  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index] as PulseWriteAncestorStep;
    const container = cloneAncestorContainer(
      ancestor.currentValue,
      ancestor.childKey,
      [],
    );
    writeChildValue(container, ancestor.childKey, rebuiltValue);
    rebuiltValue = container;
  }

  return rebuiltValue;
}

export function cloneAncestorContainer(
  currentValue: unknown,
  nextSegment: PropertyKey,
  traversedPath: PulsePath,
): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(currentValue) || isPlainObject(currentValue)) {
    return cloneExistingWritableContainer(currentValue);
  }

  if (currentValue === undefined) {
    return typeof nextSegment === "number" ? [] : {};
  }

  throw new TypeError(
    `Cannot write through non-traversable value at ${formatPulsePath(traversedPath)}.`,
  );
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
  shouldCollectMutations: boolean,
  traversedPath: PropertyKey[],
  pathIndex = 0,
): WriteStepResult {
  const currentValue = currentState.exists ? currentState.value : undefined;

  if (pathIndex === path.length) {
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
        [...traversedPath],
        mutations,
      );
    }

    return {
      changed: shouldCollectMutations ? mutations.length > 0 : true,
      value: nextValue,
      mutations,
    };
  }

  const segment = path[pathIndex] as PropertyKey;

  if (segment === ARRAY_LENGTH_SEGMENT) {
    return writeArrayLength(
      currentValue,
      nextValue,
      traversedPath,
      shouldCollectMutations,
      path,
      pathIndex,
    );
  }

  const container = cloneAncestorContainer(
    currentValue,
    segment,
    traversedPath,
  );
  const previousChildState = readChildState(currentValue, segment);
  traversedPath.push(segment);
  const nextChildResult = writeValueAtPath(
    previousChildState,
    path,
    nextValue,
    shouldCollectMutations,
    traversedPath,
    pathIndex + 1,
  );
  traversedPath.pop();

  if (!nextChildResult.changed) {
    return {
      changed: false,
      value: currentValue,
      mutations: [],
    };
  }

  const previousLength = Array.isArray(container) ? container.length : null;

  writeChildValue(container, segment, nextChildResult.value);

  if (
    shouldCollectMutations &&
    Array.isArray(container) &&
    previousLength !== container.length
  ) {
    const mutations = [...nextChildResult.mutations];
    mutations.push({
      kind: "replace",
      path: [...traversedPath, ARRAY_LENGTH_SEGMENT],
      key: ARRAY_LENGTH_SEGMENT,
      value: container.length,
      previousValue: previousLength,
    });

    return {
      changed: true,
      value: container,
      mutations,
    };
  }

  return {
    changed: true,
    value: container,
    mutations: nextChildResult.mutations,
  };
}

function writeArrayLength(
  currentValue: unknown,
  nextValue: unknown,
  traversedPath: readonly PropertyKey[],
  shouldCollectMutations: boolean,
  path: PulsePath,
  pathIndex: number,
): WriteStepResult {
  if (pathIndex !== path.length - 1) {
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
      [...traversedPath],
      mutations,
    );
  }

  return {
    changed: true,
    value: nextArrayValue,
    mutations,
  };
}

export function writeChildValue(
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
