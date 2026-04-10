import type { PulseMutation, PulsePath } from "../contract/types.js";

export const ARRAY_LENGTH_SEGMENT = Symbol("pulse.array-length");

export type { PulsePath };

interface PulsePathPrefixMatcherNode {
  children: Map<PropertyKey, PulsePathPrefixMatcherNode>;
  terminal: boolean;
}

export interface PulsePathPrefixMatcher {
  readonly root: PulsePathPrefixMatcherNode;
}

export function normalizeChildKey(
  currentValue: unknown,
  property: PropertyKey,
): PropertyKey {
  if (typeof property !== "string") {
    return property;
  }

  if (Array.isArray(currentValue)) {
    if (property === "length") {
      return ARRAY_LENGTH_SEGMENT;
    }

    if (isArrayIndexString(property)) {
      return Number(property);
    }
  }

  if (currentValue === undefined && isArrayIndexString(property)) {
    return Number(property);
  }

  return property;
}

export function isRelevantMutationPath(
  nodePath: PulsePath,
  mutationPath: PulsePath,
): boolean {
  return (
    isPathPrefix(nodePath, mutationPath) || isPathPrefix(mutationPath, nodePath)
  );
}

export function pathsMatch(left: PulsePath, right: PulsePath): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((segment, index) => Object.is(segment, right[index]));
}

export function getPulsePathKey(path: PulsePath): string {
  if (path.length === 0) {
    return "<root>";
  }

  let key = "";

  for (const segment of path) {
    if (segment === ARRAY_LENGTH_SEGMENT) {
      key += "|l";
      continue;
    }

    if (typeof segment === "number") {
      key += `|n:${segment}`;
      continue;
    }

    if (typeof segment === "symbol") {
      key += `|y:${String(segment)}`;
      continue;
    }

    key += `|s:${segment}`;
  }

  return key;
}

export function formatPulsePath(path: PulsePath): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map((segment) => {
      if (segment === ARRAY_LENGTH_SEGMENT) {
        return ".length";
      }

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

export function toPublicPulseMutation(mutation: PulseMutation): PulseMutation {
  if (
    mutation.key !== ARRAY_LENGTH_SEGMENT &&
    !mutation.path.includes(ARRAY_LENGTH_SEGMENT)
  ) {
    return mutation;
  }

  const path = mutation.path.map((segment) =>
    segment === ARRAY_LENGTH_SEGMENT ? "length" : segment,
  );
  const key = path.length === 0 ? undefined : path[path.length - 1];

  if (mutation.kind === "delete") {
    return {
      kind: mutation.kind,
      path,
      key,
      previousValue: mutation.previousValue,
    };
  }

  return {
    kind: mutation.kind,
    path,
    key,
    value: mutation.value,
    previousValue: mutation.previousValue,
  };
}

function isArrayIndexString(value: string): boolean {
  return /^(0|[1-9]\d*)$/u.test(value);
}

export function isPathPrefix(prefix: PulsePath, fullPath: PulsePath): boolean {
  if (prefix.length > fullPath.length) {
    return false;
  }

  for (let index = 0; index < prefix.length; index += 1) {
    if (!Object.is(prefix[index], fullPath[index])) {
      return false;
    }
  }

  return true;
}

export function createPathPrefixMatcher(
  paths: readonly PulsePath[],
): PulsePathPrefixMatcher {
  const root: PulsePathPrefixMatcherNode = {
    children: new Map(),
    terminal: false,
  };

  for (const path of paths) {
    let currentNode = root;

    if (path.length === 0) {
      root.terminal = true;
      continue;
    }

    for (const segment of path) {
      let nextNode = currentNode.children.get(segment);

      if (!nextNode) {
        nextNode = {
          children: new Map(),
          terminal: false,
        };
        currentNode.children.set(segment, nextNode);
      }

      currentNode = nextNode;
    }

    currentNode.terminal = true;
  }

  return { root };
}

export function matchesPathPrefixMatcher(
  fullPath: PulsePath,
  matcher: PulsePathPrefixMatcher,
): boolean {
  let currentNode = matcher.root;

  if (currentNode.terminal) {
    return true;
  }

  for (const segment of fullPath) {
    const nextNode = currentNode.children.get(segment);

    if (!nextNode) {
      return false;
    }

    currentNode = nextNode;

    if (currentNode.terminal) {
      return true;
    }
  }

  return false;
}
