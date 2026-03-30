# Contract

This document defines the public contract of `@ochairo/pulse`.

## Stable Surface

- `pulse(initialValue)`
- `node.get()`
- `node.set(nextValue)`
- `node.on((event) => ...)`
- nested node access through properties and array indexes

## Node Model

Every reachable node is itself a `Pulse<T>`.

```ts
const state = pulse({
  user: { name: "Ada" },
  rows: [{ id: 1 }],
});

state.get();
state.user.get();
state.user.name.get();
state.rows[0].id.get();
```

Nodes are obtained through normal JavaScript navigation:

```ts
const state = pulse({ user: { name: "Ada" } });

state.user.name.set("Grace");
state.user.name.on((event) => console.log(event.currentValue));
```

## Event Model

The callback passed to `.on(...)` receives a change event object:

```ts
interface PulseChangeEvent<T> {
  currentValue: T;
  previousValue: T;
  changes: readonly PulseMutation[];
}
```

`currentValue` and `previousValue` are scoped to the node you subscribed to.

`changes` always uses absolute root paths.

Example:

```ts
const state = pulse({ user: { name: "Ada", role: "admin" } });

state.user.on((event) => {
  console.log(event.previousValue); // { name: "Ada", role: "admin" }
  console.log(event.currentValue); // { name: "Grace", role: "admin" }
  console.log(event.changes); // [{ kind: "replace", path: ["user", "name"], ... }]
});

state.user.name.set("Grace");
```

## Notification Rules

- ancestor listeners receive descendant mutations
- descendant listeners are notified when an ancestor replacement changes their resolved value
- descendant listeners are suppressed when an ancestor replacement leaves their resolved value unchanged
- listeners removed before their turn in the same dispatch are skipped

## Traversal Rules

- deep traversal is supported for plain objects and arrays
- array length is exposed as `node.length`
- writing through a missing branch creates plain object or array containers as needed
- writing through an existing non-plain object branch throws

## Type Rules

- plain properties preserve their property types
- tuple indexes preserve exact tuple member types
- open-ended arrays stay compatible with `noUncheckedIndexedAccess`

## Reserved Names

The method names `get`, `set`, and `on` are reserved on pulse nodes. If your state has keys with those names, dot-property pulse access will collide with the runtime methods.

## Current Non-Goals

- backward compatibility with `.value`
- `.field(key)`-style deep access
- tracked rendering semantics
- collection-specific helpers for `Map`, `Set`, `Date`, and class instances

Those behaviors are intentionally outside the current contract.
