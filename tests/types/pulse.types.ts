import { expectTypeOf } from "vitest";
import { pulse, type Pulse, type PulseChangeEvent } from "../../src/index.js";

const count = pulse(0);
const state = pulse({ user: { name: "Ada" }, rows: [{ id: 1 }] });
const tupleState = pulse({ rows: [{ id: 1 }] as [{ id: number }] });
const maybeState = pulse({ user: undefined as { name: string } | undefined });

expectTypeOf(count.get()).toEqualTypeOf<number>();
expectTypeOf(state.user.name.get()).toEqualTypeOf<string>();
expectTypeOf(state.rows.length.get()).toEqualTypeOf<number>();
expectTypeOf(tupleState.rows[0].id.get()).toEqualTypeOf<number>();
expectTypeOf(maybeState.user.get()).toEqualTypeOf<
  { name: string } | undefined
>();

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
