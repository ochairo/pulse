import type { PulseMutation, PulsePath } from "../contract/types.js";

export const ARRAY_LENGTH_SEGMENT = Symbol("pulse.array-length");

export type { PulsePath };

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

function isPathPrefix(prefix: PulsePath, fullPath: PulsePath): boolean {
  if (prefix.length > fullPath.length) {
    return false;
  }

  return prefix.every((segment, index) => Object.is(segment, fullPath[index]));
}
