import { expectTypeOf } from "vitest";
import { pulse, type Pulse, type PulseChangeEvent } from "../../src/index.js";

const count = pulse(0);
const state = pulse({ user: { name: "Ada" }, rows: [{ id: 1 }] });
const tupleState = pulse({ rows: [{ id: 1 }] as [{ id: number }] });
const maybeState = pulse({ user: undefined as { name: string } | undefined });
const actionState = pulse({
  user: { action: (() => undefined) as () => void },
});
const dateState = pulse({ meta: { createdAt: new Date() } });
const mapState = pulse({ meta: { items: new Map<string, number>() } });
const objectLengthState = pulse({ meta: { length: 1 } });
const promiseKeyState = pulse({ then: 1, catch: 2, finally: 3 });

expectTypeOf(count.get()).toEqualTypeOf<number>();
expectTypeOf(state.user.name.get()).toEqualTypeOf<string>();
expectTypeOf(state.rows.length.get()).toEqualTypeOf<number>();
expectTypeOf(state.rows[0]).toEqualTypeOf<
  Pulse<{ id: number } | undefined> | undefined
>();
expectTypeOf(state.rows[0]!.get()).toEqualTypeOf<{ id: number } | undefined>();
expectTypeOf(tupleState.rows[0].id.get()).toEqualTypeOf<number>();
expectTypeOf(maybeState.user.get()).toEqualTypeOf<
  { name: string } | undefined
>();
expectTypeOf(actionState.user.action.get()).toEqualTypeOf<() => void>();
expectTypeOf(dateState.meta.createdAt.get()).toEqualTypeOf<Date>();
expectTypeOf(mapState.meta.items.get()).toEqualTypeOf<Map<string, number>>();
expectTypeOf(objectLengthState.meta.length.get()).toEqualTypeOf<number>();

count.on((event) => {
  expectTypeOf(event).toEqualTypeOf<PulseChangeEvent<number>>();
  expectTypeOf(event.currentValue).toEqualTypeOf<number>();
  expectTypeOf(event.previousValue).toEqualTypeOf<number>();
});

state.user.name.on((event) => {
  expectTypeOf(event).toEqualTypeOf<PulseChangeEvent<string>>();
});

const typedCount: Pulse<number> = count;
void typedCount;

// @ts-expect-error optional branches must be narrowed before deep access
maybeState.user.name;

// @ts-expect-error open-ended array elements must be narrowed before deep access
state.rows[0].id;

// @ts-expect-error function-valued leaves are atomic and cannot be traversed
actionState.user.action.name;

// @ts-expect-error non-plain built-in objects are atomic and cannot be traversed
dateState.meta.createdAt.getTime;

// @ts-expect-error non-plain built-in objects are atomic and cannot be traversed
mapState.meta.items.size;

// @ts-expect-error promise-like keys are reserved to avoid thenable collisions
promiseKeyState.then;

// @ts-expect-error promise-like keys are reserved to avoid thenable collisions
promiseKeyState.catch;

// @ts-expect-error promise-like keys are reserved to avoid thenable collisions
promiseKeyState.finally;

const fakePulse = {
  get() {
    return 1;
  },
  set() {},
  on() {
    return () => {};
  },
};

// @ts-expect-error pulses must come from pulse()
const invalidPulse: Pulse<number> = fakePulse;
void invalidPulse;

export {};
