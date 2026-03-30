export const PULSE_BRAND = Symbol("pulse.brand");

export type PulsePath = readonly PropertyKey[];

export interface PulseMutationSet {
  kind: "set" | "replace";
  path: PulsePath;
  value: unknown;
  previousValue: unknown;
}

export interface PulseMutationDelete {
  kind: "delete";
  path: PulsePath;
  previousValue: unknown;
}

export type PulseMutation = PulseMutationSet | PulseMutationDelete;

export interface PulseChangeEvent<T> {
  currentValue: T;
  previousValue: T;
  changes: readonly PulseMutation[];
}

interface PulseCore<T> {
  readonly [PULSE_BRAND]: true;
  get(): T;
  set(nextValue: T): void;
  on(callback: (event: PulseChangeEvent<T>) => void): () => void;
}

type TupleIndexKeys<TTuple extends readonly unknown[]> = Exclude<
  keyof TTuple,
  keyof (readonly unknown[])
>;

type IsTuple<TTuple extends readonly unknown[]> =
  number extends TTuple["length"] ? false : true;

type PulseArrayShape<TArray extends readonly unknown[]> = {
  readonly [index: number]: Pulse<TArray[number]>;
  readonly length: Pulse<TArray["length"]>;
} & (IsTuple<TArray> extends true
  ? {
      readonly [TKey in TupleIndexKeys<TArray>]: Pulse<TArray[TKey]>;
    }
  : {});

type PulseObjectShape<TValue extends object> = {
  readonly [TKey in keyof TValue]-?: Pulse<TValue[TKey]>;
};

type PulseShape<T> = T extends readonly unknown[]
  ? PulseArrayShape<T>
  : T extends object
    ? PulseObjectShape<T>
    : {};

export type Pulse<T> = PulseCore<T> & PulseShape<T>;
