import { describe, expect, it, vi } from "vitest";
import { derived, isPulse, pulse } from "../../src/index.js";

describe("derived", () => {
  it("computes initial value from source", () => {
    const count = pulse(5);
    const doubled = derived(count, (v) => v * 2);

    expect(doubled.get()).toBe(10);
  });

  it("updates when source changes", () => {
    const count = pulse(1);
    const doubled = derived(count, (v) => v * 2);

    count.set(3);

    expect(doubled.get()).toBe(6);
  });

  it("notifies listeners on derived value change", () => {
    const count = pulse(0);
    const isPositive = derived(count, (v) => v > 0);
    const listener = vi.fn();

    isPositive.on(listener);
    count.set(5);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        currentValue: true,
        previousValue: false,
      }),
    );
  });

  it("does not notify when derived value is unchanged", () => {
    const count = pulse(1);
    const isPositive = derived(count, (v) => v > 0);
    const listener = vi.fn();

    isPositive.on(listener);
    count.set(2);

    expect(listener).not.toHaveBeenCalled();
    expect(isPositive.get()).toBe(true);
  });

  it("supports string derivation", () => {
    const name = pulse("Ada");
    const upper = derived(name, (v) => v.toUpperCase());

    expect(upper.get()).toBe("ADA");

    name.set("Grace");

    expect(upper.get()).toBe("GRACE");
  });

  it("supports deriving from a readonly derived pulse", () => {
    const count = pulse(2);
    const doubled = derived(count, (v) => v * 2);
    const label = derived(doubled, (v) => `x${v}`);

    expect(label.get()).toBe("x4");

    count.set(3);

    expect(label.get()).toBe("x6");
  });

  it("works with object source and primitive output", () => {
    const state = pulse({ count: 0, label: "items" });
    const hasItems = derived(state, (v) => v.count > 0);

    expect(hasItems.get()).toBe(false);

    state.set({ count: 3, label: "items" });

    expect(hasItems.get()).toBe(true);
  });

  it("stops updating after destroy", () => {
    const count = pulse(0);
    const doubled = derived(count, (v) => v * 2);
    const listener = vi.fn();

    doubled.on(listener);
    count.set(1);

    expect(listener).toHaveBeenCalledTimes(1);

    doubled.destroy();
    count.set(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(doubled.get()).toBe(2);
  });

  it("unsubscribes derived listener independently", () => {
    const count = pulse(0);
    const doubled = derived(count, (v) => v * 2);
    const listener = vi.fn();

    const unsub = doubled.on(listener);
    count.set(1);

    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    count.set(2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(doubled.get()).toBe(4);
  });

  it("destroy is idempotent", () => {
    const count = pulse(0);
    const doubled = derived(count, (v) => v * 2);

    doubled.destroy();
    doubled.destroy();

    expect(doubled.get()).toBe(0);
  });

  it("is recognized by isPulse", () => {
    const count = pulse(0);
    const doubled = derived(count, (v) => v * 2);

    expect(isPulse(doubled)).toBe(true);
  });
});
