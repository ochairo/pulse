# Usage

## Nested State

```ts
import { pulse } from "@ochairo/pulse";

const state = pulse({
  user: { name: "Ada", role: "admin" },
  rows: [{ id: 1, title: "First" }],
});

state.user.name.on((event) => {
  console.log(event.previousValue); // "Ada"
  console.log(event.currentValue); // "Grace"
  console.log(event.changes[0]?.path); // ["user", "name"]
});

state.user.name.set("Grace");
state.get();
state.rows[0]?.get()?.title;
```

## Parent Listeners

Parent listeners receive descendant mutations with absolute paths.

```ts
const state = pulse({ user: { name: "Ada", role: "admin" } });

state.user.on((event) => {
  console.log(event.currentValue); // { name: "Grace", role: "admin" }
  console.log(event.changes); // [{ kind: "replace", path: ["user", "name"], ... }]
});

state.user.name.set("Grace");
```

## Descendant Suppression

Descendants are not notified when an ancestor replacement keeps their leaf value unchanged.

```ts
const state = pulse({ user: { name: "Ada", role: "admin" } });

state.user.name.on(() => {
  throw new Error("not reached");
});

state.user.set({ name: "Ada", role: "editor" });
```

## Sparse Array Growth

Writes can create missing array branches and length listeners are notified explicitly.

```ts
const rows = pulse([{ title: "A" }]);

rows.length.on((event) => {
  console.log(event.previousValue); // 1
  console.log(event.currentValue); // 2
});

rows[1].set({ title: "B" });
```

## Boundaries

- use plain objects and arrays for deep traversal
- treat functions, `Date`, `Map`, `Set`, and class instances as atomic values that do not expose child pulse nodes
- plain object keys named `length` remain ordinary properties; only arrays expose reactive `length`
- expect open-ended array indexes to follow TypeScript `noUncheckedIndexedAccess` rules, which means indexed element pulses resolve to `T | undefined` until narrowed
- avoid state keys named `get`, `set`, `on`, `then`, `catch`, or `finally` when you need those child pulse nodes to remain available
- for custom class instances, prefer interacting through `get()` and `set()` even if TypeScript still offers structural property access on the instance type
