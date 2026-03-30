# API

## `pulse(initialValue)`

Creates a root pulse node.

```ts
function pulse<T>(initialValue: T): Pulse<T>
```

The returned value is both a pulse node and, when `T` is traversable, an entry point to nested pulse nodes.

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

## `node.on(listener)`

Subscribes to change events.

```ts
const unsubscribe = count.on((event) => {
  console.log(event.currentValue);
});
```

Listeners are ancestor-aware.

```ts
const state = pulse({ user: { name: "Ada" } });

state.on((event) => {
  console.log(event.changes[0]?.path); // ["user", "name"]
});

state.user.name.set("Grace");
```

## Nested Nodes

Object properties and array indexes expose child pulse nodes.

```ts
const state = pulse({ rows: [{ title: "A" }] });

state.rows[0].title.set("B");
state.rows.length.get(); // 1
```

Tuple indexes remain precise in TypeScript. Open-ended arrays follow `noUncheckedIndexedAccess` safety rules.

## `isPulse(value)`

Checks whether a value is an authentic pulse instance.
