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
          key: "name",
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
          key: "role",
          value: "editor",
          previousValue: "admin",
        },
      ],
    });
  });

  it("notifies descendants when a missing ancestor branch becomes defined", () => {
    const state = pulse({ rows: [] as Array<{ name: string }> });
    const listener = vi.fn();
    const rows = state.rows as unknown as Record<
      number,
      {
        name: { on(callback: (value: unknown) => void): void };
        set(nextValue: { name: string }): void;
      }
    >;

    rows[0].name.on(listener);
    rows[0].set({ name: "Ada" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: "Ada",
      previousValue: undefined,
      changes: [
        {
          kind: "set",
          path: ["rows", 0],
          key: 0,
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
          key: "length",
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
          key: "length",
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
          key: 2,
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
          key: 1,
          previousValue: "Grace",
        },
        {
          kind: "delete",
          path: [2],
          key: 2,
          previousValue: "Lin",
        },
        {
          kind: "replace",
          path: ["length"],
          key: "length",
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

  it("continues notifying remaining listeners after a listener throws", () => {
    const count = pulse(0);
    const listenerError = new Error("listener failed");
    const secondListener = vi.fn();

    count.on(() => {
      throw listenerError;
    });
    count.on(secondListener);

    expect(() => count.set(1)).toThrow(listenerError);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(count.get()).toBe(1);
  });

  it("continues notifying later nodes after an earlier node listener throws", () => {
    const state = pulse({ user: { name: "Ada" } });
    const listenerError = new Error("root listener failed");
    const leafListener = vi.fn();

    state.on(() => {
      throw listenerError;
    });
    state.user.name.on(leafListener);

    expect(() => state.user.name.set("Grace")).toThrow(listenerError);
    expect(leafListener).toHaveBeenCalledTimes(1);
    expect(state.user.name.get()).toBe("Grace");
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

  it("batches multiple writes into one root notification", () => {
    const state = pulse({ user: { name: "Ada", age: 30 } });
    const rootListener = vi.fn();
    const nameListener = vi.fn();

    state.on(rootListener);
    state.user.name.on(nameListener);

    state.batch(() => {
      state.user.name.set("Grace");
      state.user.age.set(31);
    });

    expect(rootListener).toHaveBeenCalledTimes(1);
    expect(rootListener).toHaveBeenCalledWith({
      currentValue: { user: { name: "Grace", age: 31 } },
      previousValue: { user: { name: "Ada", age: 30 } },
      changes: [
        {
          kind: "replace",
          path: ["user", "name"],
          key: "name",
          value: "Grace",
          previousValue: "Ada",
        },
        {
          kind: "replace",
          path: ["user", "age"],
          key: "age",
          value: 31,
          previousValue: 30,
        },
      ],
    });
    expect(nameListener).toHaveBeenCalledTimes(1);
    expect(nameListener).toHaveBeenCalledWith({
      currentValue: "Grace",
      previousValue: "Ada",
      changes: [
        {
          kind: "replace",
          path: ["user", "name"],
          key: "name",
          value: "Grace",
          previousValue: "Ada",
        },
      ],
    });
  });

  it("defers listener dispatch until the batch completes", () => {
    const state = pulse({ user: { name: "Ada", age: 30 } });
    const listener = vi.fn();

    state.on(listener);

    state.batch(() => {
      state.user.name.set("Grace");

      expect(state.user.name.get()).toBe("Grace");
      expect(listener).not.toHaveBeenCalled();
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("collapses nested batches into a single flush", () => {
    const state = pulse({ count: 0, total: 0 });
    const listener = vi.fn();

    state.on(listener);

    state.batch(() => {
      state.count.set(1);

      state.batch(() => {
        state.total.set(2);
      });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      currentValue: { count: 1, total: 2 },
      previousValue: { count: 0, total: 0 },
      changes: [
        {
          kind: "replace",
          path: ["count"],
          key: "count",
          value: 1,
          previousValue: 0,
        },
        {
          kind: "replace",
          path: ["total"],
          key: "total",
          value: 2,
          previousValue: 0,
        },
      ],
    });
  });

  it("returns the callback result from batch", () => {
    const state = pulse({ count: 0 });

    const result = state.batch(() => {
      state.count.set(1);
      return state.count.get();
    });

    expect(result).toBe(1);
  });

  it("flushes notifications before rethrowing a batch callback error", () => {
    const state = pulse({ count: 0 });
    const listener = vi.fn();
    const callbackError = new Error("callback failed");

    state.on(listener);

    expect(() =>
      state.batch(() => {
        state.count.set(1);
        throw callbackError;
      }),
    ).toThrow(callbackError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(state.count.get()).toBe(1);
  });

  it("does not expose batch() on child paths", () => {
    const state = pulse({ user: { name: "Ada" } });

    expect(
      (state.user as unknown as Record<string, unknown>).batch,
    ).toBeUndefined();
  });

  it("does not batch writes to other roots", () => {
    const users = pulse({ count: 0 });
    const settings = pulse({ theme: "light" });
    const settingsListener = vi.fn();

    settings.on(settingsListener);

    users.batch(() => {
      settings.theme.set("dark");

      expect(settingsListener).toHaveBeenCalledTimes(1);
      expect(settings.theme.get()).toBe("dark");

      users.count.set(1);
    });

    expect(users.count.get()).toBe(1);
    expect(settingsListener).toHaveBeenCalledTimes(1);
  });

  it("keeps a root property named batch accessible through prop()", () => {
    const state = pulse({ batch: 1, user: { name: "Ada" } });

    state.prop("batch").set(2);

    expect(state.prop("batch").get()).toBe(2);
    expect(state.get()).toEqual({ batch: 2, user: { name: "Ada" } });
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
          key: "action",
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
          key: "createdAt",
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
          key: "counter",
          value: nextCounter,
          previousValue: counter,
        },
      ],
    });
  });

  it("throws when writing through non-plain object branches", () => {
    const state = pulse({
      meta: undefined as { createdAt: Date } | undefined,
    }) as unknown as {
      meta: {
        set(nextValue: { createdAt: Date }): void;
        createdAt: { time: { set(nextValue: number): void } };
      };
    };

    const time = state.meta.createdAt.time;

    state.meta.set({
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    expect(() => time.set(1)).toThrow(
      "Cannot write through non-traversable value at meta.createdAt.",
    );
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

  it("supports prop() for reserved keys and symbol keys", () => {
    const token = Symbol("token");
    const state = pulse({
      get: 1,
      set: 2,
      on: 3,
      prop: 4,
      then: 5,
      catch: 6,
      finally: 7,
      [token]: 8,
    });

    expect(state.prop("get").get()).toBe(1);
    expect(state.prop("set").get()).toBe(2);
    expect(state.prop("on").get()).toBe(3);
    expect(state.prop("prop").get()).toBe(4);
    expect(state.prop("then").get()).toBe(5);
    expect(state.prop("catch").get()).toBe(6);
    expect(state.prop("finally").get()).toBe(7);
    expect(state.prop(token).get()).toBe(8);

    state.prop("then").set(9);
    state.prop(token).set(10);

    expect(state.get()).toEqual({
      get: 1,
      set: 2,
      on: 3,
      prop: 4,
      then: 9,
      catch: 6,
      finally: 7,
      [token]: 10,
    });
  });

  it("supports prop() for array indexes and length", () => {
    const rows = pulse([{ title: "A" }]);

    rows.prop(0).set({ title: "B" });
    rows.prop("length").set(2);

    expect(rows.prop(0).get()).toEqual({ title: "B" });
    expect(rows.prop("length").get()).toBe(2);
    expect(rows.get()).toEqual([{ title: "B" }, undefined]);
  });

  it("is recognized by isPulse", () => {
    const state = pulse({ user: { name: "Ada" } });

    expect(isPulse(state)).toBe(true);
    expect(isPulse(state.user)).toBe(true);
    expect(isPulse({ get() {}, set() {}, on() {} })).toBe(false);
  });
});
