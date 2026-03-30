import { describe, expect, it, vi } from "vitest";
import { isPulse, pulse } from "../../src/index.js";

describe("pulse", () => {
  class Counter {
    constructor(public readonly value: number) {}

    next(): Counter {
      return new Counter(this.value + 1);
    }
  }

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

  it("creates arrays when numeric writes target missing branches", () => {
    const state = pulse({} as { rows?: string[] });
    const rows = state.rows as unknown as Record<
      number,
      { get(): string | undefined; set(nextValue: string): void }
    >;

    rows[0].set("Ada");

    expect(state.get()).toEqual({ rows: ["Ada"] });
    expect(rows[0].get()).toBe("Ada");
  });

  it("creates nested array branches for missing object paths", () => {
    const state = pulse(
      {} as {
        rows?: Array<{ title?: string }>;
      },
    );
    const rows = state.rows as unknown as Record<
      number,
      { title: { get(): string | undefined; set(nextValue: string): void } }
    >;

    rows[1].title.set("First");

    expect(state.get()).toEqual({
      rows: [undefined, { title: "First" }],
    });
    expect(rows[1].title.get()).toBe("First");
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

  it("supports plain object properties named length", () => {
    const state = pulse({ meta: { length: 1 } });
    const listener = vi.fn();

    state.meta.length.on(listener);
    state.meta.length.set(2);

    expect(state.meta.length.get()).toBe(2);
    expect(state.get()).toEqual({ meta: { length: 2 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: 2,
      previousValue: 1,
      changes: [
        {
          kind: "replace",
          path: ["meta", "length"],
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

  it("reports both index deletions and length replacement to array ancestors", () => {
    const rows = pulse(["Ada", "Grace", "Lin"]);
    const listener = vi.fn();

    rows.on(listener);
    rows.length.set(1);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: ["Ada"],
      previousValue: ["Ada", "Grace", "Lin"],
      changes: [
        {
          kind: "delete",
          path: [1],
          previousValue: "Grace",
        },
        {
          kind: "delete",
          path: [2],
          previousValue: "Lin",
        },
        {
          kind: "replace",
          path: ["length"],
          value: 1,
          previousValue: 3,
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

  it("does not call listeners added during the current dispatch", () => {
    const count = pulse(0);
    const lateListener = vi.fn();

    count.on(() => {
      count.on(lateListener);
    });

    count.set(1);
    expect(lateListener).not.toHaveBeenCalled();

    count.set(2);
    expect(lateListener).toHaveBeenCalledTimes(1);
  });

  it("does not notify on Object.is-equal writes", () => {
    const count = pulse(0);
    const listener = vi.fn();

    count.on(listener);
    count.set(0);

    expect(listener).not.toHaveBeenCalled();
  });

  it("throws on invalid array lengths", () => {
    const rows = pulse(["Ada"]);

    expect(() => rows.length.set(-1)).toThrow(TypeError);
    expect(() => rows.length.set(1.5)).toThrow(TypeError);
  });

  it("returns an unsubscribe function", () => {
    const count = pulse(0);
    const listener = vi.fn();

    const unsubscribe = count.on(listener);
    unsubscribe();
    count.set(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("treats function-valued fields as atomic leaves", () => {
    const previousAction = vi.fn();
    const nextAction = vi.fn();
    const state = pulse({
      user: {
        name: "Ada",
        action: previousAction,
      },
    });
    const listener = vi.fn();

    state.user.action.on(listener);

    expect(state.user.action.get()).toBe(previousAction);

    state.user.action.set(nextAction);

    expect(state.user.action.get()).toBe(nextAction);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: nextAction,
      previousValue: previousAction,
      changes: [
        {
          kind: "replace",
          path: ["user", "action"],
          value: nextAction,
          previousValue: previousAction,
        },
      ],
    });
  });

  it("treats non-plain objects as atomic leaves", () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    const nextCreatedAt = new Date("2024-01-02T00:00:00Z");
    const state = pulse({ meta: { createdAt } });
    const listener = vi.fn();

    state.meta.createdAt.on(listener);

    expect(
      (state.meta.createdAt as unknown as Record<string, unknown>).getTime,
    ).toBeUndefined();

    state.meta.createdAt.set(nextCreatedAt);

    expect(state.meta.createdAt.get()).toBe(nextCreatedAt);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: nextCreatedAt,
      previousValue: createdAt,
      changes: [
        {
          kind: "replace",
          path: ["meta", "createdAt"],
          value: nextCreatedAt,
          previousValue: createdAt,
        },
      ],
    });
  });

  it("treats custom class instances as atomic leaves at runtime", () => {
    const counter = new Counter(1);
    const nextCounter = counter.next();
    const state = pulse({ meta: { counter } });
    const listener = vi.fn();

    state.meta.counter.on(listener);

    expect(
      (state.meta.counter as unknown as Record<string, unknown>).value,
    ).toBeUndefined();
    expect(
      (state.meta.counter as unknown as Record<string, unknown>).next,
    ).toBeUndefined();

    state.meta.counter.set(nextCounter);

    expect(state.meta.counter.get()).toBe(nextCounter);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: nextCounter,
      previousValue: counter,
      changes: [
        {
          kind: "replace",
          path: ["meta", "counter"],
          value: nextCounter,
          previousValue: counter,
        },
      ],
    });
  });

  it("throws when writing through non-plain object branches", () => {
    const state = pulse({
      meta: { createdAt: new Date("2024-01-01T00:00:00Z") },
    }) as unknown as {
      meta: { createdAt: Record<string, { set(nextValue: unknown): void }> };
    };

    expect(state.meta.createdAt.time).toBeUndefined();
  });

  it("keeps promise-like property names reserved", async () => {
    const state = pulse({
      then: 1,
      catch: 2,
      finally: 3,
      value: 4,
    }) as unknown as Record<PropertyKey, unknown>;

    expect(state.then).toBeUndefined();
    expect(state.catch).toBeUndefined();
    expect(state.finally).toBeUndefined();
    await expect(Promise.resolve(state)).resolves.toBe(state);
  });

  it("is recognized by isPulse", () => {
    const state = pulse({ user: { name: "Ada" } });

    expect(isPulse(state)).toBe(true);
    expect(isPulse(state.user)).toBe(true);
    expect(isPulse({ get() {}, set() {}, on() {} })).toBe(false);
  });
});
