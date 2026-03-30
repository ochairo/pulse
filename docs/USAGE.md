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
  console.log(event.changes[0]?.key); // "name"
});

state.user.name.set("Grace");
state.get();
state.rows[0]?.get()?.title;
```

## Typed Array State

Open-ended arrays keep indexed access honest, so consumer code narrows at the item pulse boundary.

```ts
import { pulse } from "@ochairo/pulse";
import type { User } from "./types";

const state = pulse<User[]>([{ name: "Ada" }, { name: "Paul" }]);

state.on((event) => {
  console.log(event.previousValue); // [{ name: "Ada" }, { name: "Paul" }]
  console.log(event.currentValue); // [{ name: "Grace" }, { name: "Paul" }]
});

state[0]?.on((event) => {
  console.log(event.previousValue?.name); // "Ada"
  console.log(event.currentValue?.name); // "Grace"
});

state[0]?.set({ name: "Grace" });
state[0]?.get()?.name; // "Grace"
state.get(); // [{ name: "Grace" }, { name: "Paul" }]
```

## Reserved Keys and Symbols

Use `prop(key)` when you need a child key that collides with pulse methods or when the key is a symbol.

```ts
const token = Symbol("token");
const state = pulse({
  get: "metadata",
  then: "value",
  [token]: 1,
});

state.prop("get").get();
state.prop("then").set("next");
state.prop(token).get();
```

## Parent Listeners

Parent listeners receive descendant mutations with absolute paths.

```ts
const state = pulse({ user: { name: "Ada", role: "admin" } });

state.user.on((event) => {
  console.log(event.currentValue); // { name: "Grace", role: "admin" }
  console.log(event.changes); // [{ kind: "replace", path: ["user", "name"], key: "name", ... }]
});

state.user.name.set("Grace");
```

When you only care about the final changed key, `change.key` avoids manual path slicing.

```ts
state.on((event) => {
  const nameChanged = event.changes.some((change) => change.key === "name");

  if (nameChanged) {
    // other process
  }
});
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

rows.prop(1).set({ title: "B" });
```

## UI Integration

Plain DOM rendering can stay explicit.

```ts
const state = pulse({ count: 0 });
const text = document.querySelector("[data-count]")!;
const button = document.querySelector("button")!;

const render = () => {
  text.textContent = String(state.count.get());
};

render();

const unsubscribe = state.count.on(() => {
  render();
});

button.addEventListener("click", () => {
  state.count.set(state.count.get() + 1);
});

window.addEventListener("beforeunload", unsubscribe);
```

React can stay explicit too.

```ts
import { useEffect, useState } from "react";

function usePulseValue(node) {
  const [value, setValue] = useState(node.get());

  useEffect(() => {
    setValue(node.get());
    return node.on((event) => {
      setValue(event.currentValue);
    });
  }, [node]);

  return value;
}
```

## Boundaries

- use plain objects and arrays for deep traversal
- treat functions, `Date`, `Map`, `Set`, and class instances as atomic values that do not expose child pulse nodes
- plain object keys named `length` remain ordinary properties; only arrays expose reactive `length`
- expect open-ended array indexes to follow TypeScript `noUncheckedIndexedAccess` rules, which means indexed element pulses resolve to `T | undefined` until narrowed
- use `prop(key)` for state keys named `get`, `set`, `on`, `prop`, `then`, `catch`, or `finally`, and for symbol keys
- for custom class instances, prefer interacting through `get()` and `set()` even if TypeScript still offers structural property access on the instance type
