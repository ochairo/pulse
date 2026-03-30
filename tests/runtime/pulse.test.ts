import { describe, expect, it, vi } from "vitest";
import { isPulse, pulse } from "../../src/index.js";

describe("pulse", () => {
  it("creates a root pulse with get()", () => {
    const count = pulse(0);

    expect(count.get()).toBe(0);
  });

  it("updates nested state through property pulses", () => {
    const state = pulse({ user: { name: "Ada", role: "admin" } });

    state.user.name.set("Grace");

    expect(state.user.name.get()).toBe("Grace");
    expect(state.get()).toEqual({ user: { name: "Grace", role: "admin" } });
  });

  it("notifies ancestor listeners with descendant mutation paths", () => {
    const state = pulse({ user: { name: "Ada", role: "admin" } });
    const listener = vi.fn();

    state.on(listener);
    state.user.name.set("Grace");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: { user: { name: "Grace", role: "admin" } },
      previousValue: { user: { name: "Ada", role: "admin" } },
      changes: [
        {
          kind: "replace",
          path: ["user", "name"],
          value: "Grace",
          previousValue: "Ada",
        },
      ],
    });
  });

  it("does not notify descendants when an ancestor replacement keeps their leaf value", () => {
    const state = pulse({ user: { name: "Ada", role: "admin" } });
    const nameListener = vi.fn();
    const userListener = vi.fn();

    state.user.name.on(nameListener);
    state.user.on(userListener);
    state.user.set({ name: "Ada", role: "editor" });

    expect(nameListener).not.toHaveBeenCalled();
    expect(userListener).toHaveBeenCalledTimes(1);
    expect(userListener).toHaveBeenCalledWith({
      currentValue: { name: "Ada", role: "editor" },
      previousValue: { name: "Ada", role: "admin" },
      changes: [
        {
          kind: "replace",
          path: ["user", "role"],
          value: "editor",
          previousValue: "admin",
        },
      ],
    });
  });

  it("notifies descendants when a missing ancestor branch becomes defined", () => {
    const state = pulse({ rows: [] as Array<{ name: string }> });
    const listener = vi.fn();

    state.rows[0].name.on(listener);
    state.rows[0].set({ name: "Ada" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: "Ada",
      previousValue: undefined,
      changes: [
        {
          kind: "set",
          path: ["rows", 0],
          value: { name: "Ada" },
          previousValue: undefined,
        },
      ],
    });
  });

  it("tracks array index writes and length changes", () => {
    const rows = pulse(["Ada"]);
    const lengthListener = vi.fn();

    rows.length.on(lengthListener);
    rows[1].set("Grace");

    expect(rows.get()).toEqual(["Ada", "Grace"]);
    expect(lengthListener).toHaveBeenCalledTimes(1);
    expect(lengthListener).toHaveBeenCalledWith({
      currentValue: 2,
      previousValue: 1,
      changes: [
        {
          kind: "replace",
          path: ["length"],
          value: 2,
          previousValue: 1,
        },
      ],
    });
  });

  it("notifies removed array indexes when length truncates", () => {
    const rows = pulse(["Ada", "Grace", "Lin"]);
    const removedListener = vi.fn();

    rows[2].on(removedListener);
    rows.length.set(1);

    expect(rows.get()).toEqual(["Ada"]);
    expect(removedListener).toHaveBeenCalledTimes(1);
    expect(removedListener).toHaveBeenCalledWith({
      currentValue: undefined,
      previousValue: "Lin",
      changes: [
        {
          kind: "delete",
          path: [2],
          previousValue: "Lin",
        },
      ],
    });
  });

  it("uses snapshot listener semantics during dispatch", () => {
    const count = pulse(0);
    const secondListener = vi.fn();
    let unsubscribeSecond = () => {};

    count.on(() => {
      unsubscribeSecond();
    });

    unsubscribeSecond = count.on(secondListener);

    count.set(1);

    expect(secondListener).not.toHaveBeenCalled();
  });

  it("does not notify on Object.is-equal writes", () => {
    const count = pulse(0);
    const listener = vi.fn();

    count.on(listener);
    count.set(0);

    expect(listener).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function", () => {
    const count = pulse(0);
    const listener = vi.fn();

    const unsubscribe = count.on(listener);
    unsubscribe();
    count.set(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("is recognized by isPulse", () => {
    const state = pulse({ user: { name: "Ada" } });

    expect(isPulse(state)).toBe(true);
    expect(isPulse(state.user)).toBe(true);
    expect(isPulse({ get() {}, set() {}, on() {} })).toBe(false);
  });
});
