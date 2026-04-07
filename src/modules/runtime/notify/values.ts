import type { PulseMutation } from "../../contract/types.js";
import {
  ARRAY_LENGTH_SEGMENT,
  getPulsePathKey,
  pathsMatch,
  toPublicPulseMutation,
} from "../../path/index.js";
import { readChildState } from "../../store/state.js";
import type { PulseNodeState } from "../state/runtime.js";

export function readResolvedNodeValue<T>(
  node: PulseNodeState<unknown, T>,
  rootValue: unknown,
  valueCache: Map<PulseNodeState<unknown, unknown>, unknown>,
): unknown {
  const cacheNode = node as PulseNodeState<unknown, unknown>;

  if (valueCache.has(cacheNode)) {
    return valueCache.get(cacheNode);
  }

  let resolvedValue: unknown;

  if (node.parent === null || node.key === null) {
    resolvedValue = rootValue;
  } else {
    const parentValue = readResolvedNodeValue(
      node.parent,
      rootValue,
      valueCache,
    );
    resolvedValue = readNodeChildValue(parentValue, node.key);
  }

  valueCache.set(cacheNode, resolvedValue);
  return resolvedValue;
}

export function readExactNodeMutationValues(
  nodePath: readonly PropertyKey[],
  mutations: readonly PulseMutation[],
):
  | {
      readonly previousValue: unknown;
      readonly currentValue: unknown;
    }
  | undefined {
  if (mutations.length !== 1) {
    return undefined;
  }

  const [mutation] = mutations;

  if (!mutation || !pathsMatch(nodePath, mutation.path)) {
    return undefined;
  }

  return {
    previousValue: mutation.previousValue,
    currentValue: mutation.kind === "delete" ? undefined : mutation.value,
  };
}

export function toPublicPulseMutations(
  mutations: readonly PulseMutation[],
): readonly PulseMutation[] {
  if (mutations.length === 0) {
    return mutations;
  }

  let firstLengthMutationIndex = -1;

  for (let index = 0; index < mutations.length; index += 1) {
    const mutation = mutations[index] as PulseMutation;

    if (
      mutation.key === ARRAY_LENGTH_SEGMENT ||
      mutation.path.includes(ARRAY_LENGTH_SEGMENT)
    ) {
      firstLengthMutationIndex = index;
      break;
    }
  }

  if (firstLengthMutationIndex === -1) {
    return mutations;
  }

  if (mutations.length === 1) {
    const mutation = mutations[0];

    return mutation ? [toPublicPulseMutation(mutation)] : mutations;
  }

  const publicMutations = new Array<PulseMutation>(mutations.length);

  for (let index = 0; index < mutations.length; index += 1) {
    publicMutations[index] = toPublicPulseMutation(
      mutations[index] as PulseMutation,
    );
  }

  return publicMutations;
}

export function resolveExactPaths(
  triggerPaths: readonly (readonly PropertyKey[])[] | undefined,
  mutations: readonly PulseMutation[],
): readonly (readonly PropertyKey[])[] {
  if (!triggerPaths || triggerPaths.length === 0) {
    return mutations.map((mutation) => mutation.path);
  }

  if (mutations.length === 0) {
    return triggerPaths;
  }

  const exactPaths = new Map<string, readonly PropertyKey[]>();

  for (const path of triggerPaths) {
    exactPaths.set(getPulsePathKey(path), path);
  }

  for (const mutation of mutations) {
    exactPaths.set(getPulsePathKey(mutation.path), mutation.path);
  }

  return Array.from(exactPaths.values());
}

function readNodeChildValue(parentValue: unknown, key: PropertyKey): unknown {
  if (key === ARRAY_LENGTH_SEGMENT) {
    return Array.isArray(parentValue) ? parentValue.length : undefined;
  }

  const childState = readChildState(parentValue, key);
  return childState.exists ? childState.value : undefined;
}
