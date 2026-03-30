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
- treat `Date`, `Map`, `Set`, and class instances as atomic values
- expect open-ended array indexes to follow TypeScript `noUncheckedIndexedAccess` rules
- avoid state keys named `get`, `set`, or `on` when you need dot-property pulse access
