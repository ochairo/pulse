export const PULSE_BRAND = Symbol("pulse.brand");

export type PulsePath = readonly PropertyKey[];

export interface PulseMutationSet {
  kind: "set" | "replace";
  path: PulsePath;
  key: PropertyKey | undefined;
  value: unknown;
  previousValue: unknown;
}

export interface PulseMutationDelete {
  kind: "delete";
  path: PulsePath;
  key: PropertyKey | undefined;
  previousValue: unknown;
}

export type PulseMutation = PulseMutationSet | PulseMutationDelete;

export interface PulseChangeEvent<T> {
  currentValue: T;
  previousValue: T;
  changes: readonly PulseMutation[];
}

export interface PulseKeyView<T> {
  on(callback: (event: PulseChangeEvent<T>) => void): () => void;
}

interface PulseCore<T> {
  readonly [PULSE_BRAND]: true;
  get(): T;
  prop<TKey extends PulseChildKey<T>>(
    key: TKey,
  ): Pulse<PulseChildValue<T, TKey>>;
  prop(key: PropertyKey): PulseKeyView<T>;
  set(nextValue: T): void;
  on(callback: (event: PulseChangeEvent<T>) => void): () => void;
}

interface RootPulseCore<T> extends PulseCore<T> {
  batch<TResult>(callback: () => TResult): TResult;
}

type ReservedPulseKey =
  | "get"
  | "set"
  | "on"
  | "prop"
  | "then"
  | "catch"
  | "finally";

type ReservedRootPulseKey = ReservedPulseKey | "batch";

type AtomicPulseObject =
  | Date
  | RegExp
  | Error
  | Promise<unknown>
  | Map<unknown, unknown>
  | ReadonlyMap<unknown, unknown>
  | Set<unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

type TupleIndexKeys<TTuple extends readonly unknown[]> = Exclude<
  keyof TTuple,
  keyof (readonly unknown[])
>;

type IsTuple<TTuple extends readonly unknown[]> =
  number extends TTuple["length"] ? false : true;

type PulseArrayElement<TArray extends readonly unknown[]> =
  IsTuple<TArray> extends true ? TArray[number] : TArray[number] | undefined;

type PulseArrayChildValue<
  TArray extends readonly unknown[],
  TKey extends PropertyKey,
> = TKey extends "length"
  ? TArray["length"]
  : IsTuple<TArray> extends true
    ? TKey extends keyof TArray
      ? TArray[TKey]
      : TKey extends number
        ? PulseArrayElement<TArray>
        : never
    : TKey extends number
      ? PulseArrayElement<TArray>
      : never;

type PulseChildKey<T> = T extends readonly unknown[]
  ? TupleIndexKeys<T> | number | "length"
  : T extends (...args: infer _Args) => unknown
    ? never
    : T extends AtomicPulseObject
      ? never
      : T extends object
        ? keyof T
        : never;

type PulseChildValue<T, TKey extends PropertyKey> = T extends readonly unknown[]
  ? PulseArrayChildValue<T, TKey>
  : T extends (...args: infer _Args) => unknown
    ? never
    : T extends AtomicPulseObject
      ? never
      : T extends object
        ? TKey extends keyof T
          ? T[TKey]
          : never
        : never;

type PulseArrayShape<TArray extends readonly unknown[]> = {
  readonly [index: number]: Pulse<PulseArrayElement<TArray>>;
  readonly length: Pulse<TArray["length"]>;
} & (IsTuple<TArray> extends true
  ? {
      readonly [TKey in TupleIndexKeys<TArray>]: Pulse<TArray[TKey]>;
    }
  : {});

type PulseObjectShape<TValue extends object> = {
  readonly [TKey in Exclude<keyof TValue, ReservedPulseKey>]-?: Pulse<
    TValue[TKey]
  >;
};

type RootPulseObjectShape<TValue extends object> = {
  readonly [TKey in Exclude<keyof TValue, ReservedRootPulseKey>]-?: Pulse<
    TValue[TKey]
  >;
};

type PulseShape<T> = T extends readonly unknown[]
  ? PulseArrayShape<T>
  : T extends (...args: infer _Args) => unknown
    ? {}
    : T extends AtomicPulseObject
      ? {}
      : T extends object
        ? PulseObjectShape<T>
        : {};

type RootPulseShape<T> = T extends readonly unknown[]
  ? PulseArrayShape<T>
  : T extends (...args: infer _Args) => unknown
    ? {}
    : T extends AtomicPulseObject
      ? {}
      : T extends object
        ? RootPulseObjectShape<T>
        : {};

export type Pulse<T> = PulseCore<T> & PulseShape<T>;
export type InternalRootPulse<T> = RootPulseCore<T> & RootPulseShape<T>;
