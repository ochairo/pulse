import type { PulseMutation } from "../../contract/types.js";
import { ARRAY_LENGTH_SEGMENT } from "../../path/index.js";
import {
  cloneAncestorContainer,
  type PulseBatchWriteState,
  writeChildValue,
} from "../../store/write.js";
import { isPlainObject } from "../../store/state.js";
import {
  getOrCreateNormalizedChildNode,
  readNodePath,
  readNodeValueState,
  type PulseNodeState,
} from "../state/runtime.js";

export interface RebuiltPathState {
  readonly node: PulseNodeState<unknown, unknown>;
  readonly value: unknown;
}

export interface AncestorRebuildResult {
  readonly lengthNodes: readonly PulseNodeState<unknown, unknown>[];
  readonly pathStates: readonly RebuiltPathState[];
  readonly rootValue: unknown;
}

export function rebuildNodeAncestors<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
  mutations?: PulseMutation[],
): AncestorRebuildResult {
  const lengthNodes: PulseNodeState<unknown, unknown>[] = [];
  const pathStates: RebuiltPathState[] = [
    {
      node: node as PulseNodeState<unknown, unknown>,
      value: nextValue,
    },
  ];
  let rebuiltValue: unknown = nextValue;
  let childNode: PulseNodeState<unknown, unknown> = node as PulseNodeState<
    unknown,
    unknown
  >;
  let currentNode = node.parent;

  while (currentNode) {
    const childKey = childNode.key;

    if (childKey === null) {
      break;
    }

    const parentState = readNodeValueState(currentNode);
    const parentValue = parentState.exists ? parentState.value : undefined;
    const container = cloneRebuildContainer(currentNode, parentValue, childKey);
    const previousLength = Array.isArray(container) ? container.length : null;

    writeChildValue(container, childKey, rebuiltValue);
    pathStates.push({
      node: currentNode,
      value: container,
    });

    if (
      mutations &&
      Array.isArray(container) &&
      previousLength !== container.length
    ) {
      const lengthNode = getOrCreateNormalizedChildNode(
        currentNode,
        ARRAY_LENGTH_SEGMENT,
        container,
      );

      mutations.push({
        kind: "replace",
        path: readNodePath(lengthNode),
        key: ARRAY_LENGTH_SEGMENT,
        value: container.length,
        previousValue: previousLength,
      });
      lengthNodes.push(lengthNode);
    }

    rebuiltValue = container;
    childNode = currentNode;
    currentNode = currentNode.parent;
  }

  return {
    lengthNodes,
    pathStates,
    rootValue: rebuiltValue,
  };
}

export function rebuildNodeAncestorsInBatch<T>(
  node: PulseNodeState<unknown, T>,
  nextValue: T,
  batchState: PulseBatchWriteState,
  mutations: PulseMutation[],
): AncestorRebuildResult {
  const lengthNodes: PulseNodeState<unknown, unknown>[] = [];
  const pathStates: RebuiltPathState[] = [
    {
      node: node as PulseNodeState<unknown, unknown>,
      value: nextValue,
    },
  ];
  let rebuiltValue: unknown = nextValue;
  let childNode: PulseNodeState<unknown, unknown> = node as PulseNodeState<
    unknown,
    unknown
  >;
  let currentNode = node.parent;

  while (currentNode) {
    const childKey = childNode.key;

    if (childKey === null) {
      break;
    }

    const parentState = readNodeValueState(currentNode);
    const parentValue = parentState.exists ? parentState.value : undefined;
    const container = getOrCreateBatchDraftContainer(
      currentNode,
      parentValue,
      childKey,
      batchState,
    );
    const previousLength = Array.isArray(container) ? container.length : null;

    writeChildValue(container, childKey, rebuiltValue);
    pathStates.push({
      node: currentNode,
      value: container,
    });

    if (
      batchState.canAccumulateMutations &&
      Array.isArray(container) &&
      previousLength !== container.length
    ) {
      const lengthNode = getOrCreateNormalizedChildNode(
        currentNode,
        ARRAY_LENGTH_SEGMENT,
        container,
      );
      const mutation: PulseMutation = {
        kind: "replace",
        path: readNodePath(lengthNode),
        key: ARRAY_LENGTH_SEGMENT,
        value: container.length,
        previousValue: previousLength,
      };

      mutations.push(mutation);
      lengthNodes.push(lengthNode);
    }

    rebuiltValue = container;
    childNode = currentNode;
    currentNode = currentNode.parent;
  }

  return {
    lengthNodes,
    pathStates,
    rootValue: rebuiltValue,
  };
}

function cloneRebuildContainer(
  node: PulseNodeState<unknown, unknown>,
  currentValue: unknown,
  childKey: PropertyKey,
): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(currentValue)) {
    return currentValue.slice();
  }

  if (isPlainObject(currentValue)) {
    return { ...currentValue };
  }

  if (currentValue === undefined) {
    return typeof childKey === "number" ? [] : {};
  }

  return cloneAncestorContainer(currentValue, childKey, readNodePath(node));
}

function getOrCreateBatchDraftContainer(
  node: PulseNodeState<unknown, unknown>,
  currentValue: unknown,
  childKey: PropertyKey,
  batchState: PulseBatchWriteState,
): Record<PropertyKey, unknown> | unknown[] {
  if (
    node.batchDraftVersion === batchState.version &&
    node.batchDraftContainer !== undefined
  ) {
    return node.batchDraftContainer;
  }

  const container = cloneRebuildContainer(node, currentValue, childKey);
  node.batchDraftContainer = container;
  node.batchDraftVersion = batchState.version;
  return container;
}
