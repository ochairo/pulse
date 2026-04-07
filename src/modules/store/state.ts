const MISSING = Symbol("pulse.missing");

export type ValueState =
  | { readonly exists: false; readonly value: typeof MISSING }
  | { readonly exists: true; readonly value: unknown };

export const MISSING_VALUE_STATE: ValueState = {
  exists: false,
  value: MISSING,
};

export function canTraversePulseValue(value: unknown): boolean {
  return value === undefined || Array.isArray(value) || isPlainObject(value);
}

export function readChildState(
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

export function readExistingValue(value: unknown): ValueState {
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

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

export function isPlainObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  if (!isObjectLike(value) || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function getEnumerableOwnKeys(
  objectValue: Record<PropertyKey, unknown>,
): readonly PropertyKey[] {
  return Reflect.ownKeys(objectValue).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(objectValue, key),
  );
}
