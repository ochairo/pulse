# API

`pulse` is path-aware and exact-path by design: reads stay scoped to the concrete node you access, and `on()` subscribes only to that node.

That exact-path rule is the core mental model:

- reading `state.user.name.get()` reads only `user.name`
- subscribing with `state.user.name.on(...)` listens only to `user.name`
- subscribing with `state.user.on(...)` does not listen to descendant-only changes under `user`
- replacing an ancestor can still notify a descendant when the descendant value actually changes as a result

## `pulse(initialValue)`

Creates a root pulse node.

```ts
function pulse<T>(initialValue: T): Pulse<T>
```

The returned value is both a pulse node and, when `T` is traversable, an entry point to nested pulse nodes.

## `root.batch(callback)`

Groups multiple writes for that root and flushes listeners once when the outermost batch completes.

```ts
import { pulse } from "@ochairo/pulse";

const state = pulse({ user: { name: "Ada", age: 30 } });

state.batch(() => {
  state.user.name.set("Grace");
  state.user.age.set(31);
});
```

Writes are still applied immediately, so reads inside the batch see the latest values. Listener notification is deferred until the batch completes.

`batch()` is root-only. Child paths such as `state.user` or `state.rows[0]` do not expose it, and batching one root does not batch unrelated roots.

## `node.get()`

Returns the current value.

```ts
const count = pulse(0);
count.get();
```

For nested nodes, the returned value is scoped to that path.

```ts
const state = pulse({ user: { name: "Ada" } });
state.user.name.get(); // "Ada"
```

## `node.prop(key)`

Returns a child pulse explicitly.

```ts
const state = pulse({ get: "metadata" });

state.prop("get").get(); // "metadata"
```

Use `prop(key)` when plain property syntax collides with pulse methods or when you need symbol-key access.

```ts
const token = Symbol("token");
const state = pulse({ [token]: 1, then: "value", batch: 1 });

state.prop(token).get(); // 1
state.prop("then").get(); // "value"
state.prop("batch").get(); // 1
```

`prop(key)` stays exact-path only. On arrays, only concrete child keys are supported: numeric indexes and `"length"`.

```ts
const users = pulse([
  { name: "Ada", age: 30 },
  { name: "Paul", age: 25 },
]);

users.prop(0)?.prop("name").on((event) => {
  console.log(event.currentValue);
});
```

## `node.set(nextValue)`

Writes the next value and notifies listeners when the write succeeds.

```ts
count.set(1);
```

Nested writes clone only along the updated path.

```ts
const state = pulse({ user: { name: "Ada", role: "admin" } });
state.user.name.set("Grace");
```

Writing through an existing non-plain object branch throws.
Non-plain object values themselves are atomic leaves, so child pulse nodes are not exposed for values such as `Date`, `Map`, or class instances.

## `node.on(listener)`

Subscribes to change events.

```ts
const unsubscribe = count.on((event) => {
  console.log(event.currentValue);
});
```

Listeners are exact-path subscriptions.

```ts
const state = pulse({ user: { name: "Ada" } });

state.user.name.on((event) => {
  console.log(event.changes[0]?.path); // ["user", "name"]
  console.log(event.changes[0]?.key); // "name"
});

state.user.name.set("Grace");
```

An exact listener fires when its own path changes directly, or when an ancestor replacement changes the value at that path. It does not fire for unrelated descendant mutations on a broader object or array node.

Listeners run with snapshot semantics. If one listener throws, later listeners still run and the first error is rethrown after dispatch completes. Each mutation also exposes `key`, which is the last segment of its absolute path.

## Nested Nodes

Object properties and array indexes expose child pulse nodes.

```ts
const state = pulse({ rows: [{ title: "A" }] });

state.rows[0]?.set({ title: "B" });
state.rows[0]?.get()?.title; // "B"
state.rows.length.get(); // 1
```

Tuple indexes remain precise in TypeScript. Open-ended arrays follow `noUncheckedIndexedAccess` safety rules, so indexed element pulses resolve to `T | undefined` until narrowed.

For plain objects, a property named `length` stays a normal child node. The synthetic `length` pulse exists only on array nodes.

Reserved names can still be reached through `prop(key)`.

## `isPulse(value)`

Checks whether a value is an authentic pulse instance.

## Benchmark Report

`docs/BENCHMARKS.md` is generated, not handwritten.

Run:

```sh
pnpm benchmark:report
```

The generated report may show:

- median and mean timings
- relative standard deviation
- sample count
- calibrated operations per sample for very fast benchmarks
- `ns/op` for extremely small operations instead of rounded `0.000 ms/op`
