import { describe, expect, it, vi } from "vitest";
import { pulse } from "../../src/index.js";

describe("dynamic object keys", () => {
  for (const batched of [false, true]) {
    for (const observed of [false, true]) {
      for (const nested of [false, true]) {
        it(`keeps __proto__ as data (batch=${batched}, observed=${observed}, nested=${nested})`, () => {
          const state = pulse({ user: {} as Record<string, unknown> });
          const root = pulse<Record<string, unknown>>({});
          const target = nested ? state.user : root;
          const dispose = observed ? target.on(() => {}) : () => {};
          const original = target.get();
          const payload = { isAdmin: true };
          const write = (): void => target.prop("__proto__").set(payload);
          if (batched) {
            if (nested) state.batch(write);
            else root.batch(write);
          } else write();

          const result = target.get();
          expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
          expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(true);
          expect(result["__proto__"]).toEqual(payload);
          expect(result["isAdmin"]).toBeUndefined();
          expect(original).toEqual({});
          target.prop("next").set(1);
          expect(target.get()["next"]).toBe(1);
          expect(Object.prototype.hasOwnProperty.call(Object.prototype, "isAdmin")).toBe(false);
          dispose();
        });
      }
    }
  }

  it.each([null, "literal", { isAdmin: true }])("preserves a JSON own key when replaced with %j", (value) => {
    const state = pulse({ user: JSON.parse('{"__proto__":1}') as Record<string, unknown> });
    state.user.prop("__proto__").set(value);
    expect(Object.getPrototypeOf(state.get().user)).toBe(Object.prototype);
    expect(state.get().user["__proto__"]).toEqual(value);
    expect(Object.keys(state.get().user)).toEqual(["__proto__"]);
  });

  it("creates an own key when rebuilding a null-prototype dictionary", () => {
    const dictionary: Record<string, unknown> = Object.create(null);
    const state = pulse({ dictionary });
    state.dictionary.prop("__proto__").set({ injected: true });
    expect(state.get().dictionary["injected"]).toBeUndefined();
    expect(Object.keys(state.get().dictionary)).toEqual(["__proto__"]);
    expect(Object.getPrototypeOf(dictionary)).toBeNull();
  });
});

describe("subscription lifetime", () => {
  it.each([false, true])("removes both listeners and supports resubscription (reverse=%s)", (reverse) => {
    const state = pulse({ value: 0 });
    const first = vi.fn();
    const second = vi.fn();
    const disposers = [state.on(first), state.on(second)];
    if (reverse) disposers.reverse();
    for (const dispose of disposers) {
      dispose();
      dispose();
    }
    const active = vi.fn();
    const unsubscribe = state.on(active);
    state.set({ value: 1 });
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not deliver replacement data after unsubscribe while a child remains active", () => {
    const state = pulse({ value: 0 });
    const stale = vi.fn();
    const offFirst = state.on(() => {});
    const offStale = state.on(stale);
    const child = vi.fn();
    const offChild = state.value.on(child);
    offFirst();
    offStale();
    state.set({ value: 1 });
    expect(stale).not.toHaveBeenCalled();
    expect(child).toHaveBeenCalledTimes(1);
    offChild();
  });

  it("honors removal during dispatch after collapsing to a singleton", () => {
    const state = pulse(0);
    const last = vi.fn();
    let offLast = (): void => {};
    const offFirst = state.on(() => offLast());
    offLast = state.on(last);
    state.set(1);
    expect(last).not.toHaveBeenCalled();
    offFirst();
    const active = vi.fn();
    const offActive = state.on(active);
    state.set(2);
    expect(active).toHaveBeenCalledTimes(1);
    offActive();
  });
});
