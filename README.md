<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# pulse

Path-aware reactive runtime with explicit `get()`, `set()`, and `on()` semantics.<br>
_A fresh runtime concept built around observable state changes, not the old `.value` signal contract._

</div>

## Status

`pulse` now ships a production-ready v0 foundation for explicit deep reactive state.

Current contract:

- every node is a `Pulse<T>`
- nested nodes are reached through normal property or index access
- `on(...)` listeners on parent nodes receive descendant changes
- descendant listeners are suppressed when their resolved value is unchanged
- change events expose absolute mutation paths from the root pulse

This repository intentionally treats `pulse` as a new concept, not a minor `signals` revision.

## Quick Start

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
console.log(state.user.name.get()); // "Grace"
console.log(state.get().user.role); // "admin"
```

## Concept

`pulse` is built around three rules:

- reads are explicit through `get()`
- writes are explicit through `set(nextValue)`
- listeners receive change events instead of just the next value

That contract applies to both the root node and any reachable child node such as `state.user.name` or `state.rows[0]`.

## Guarantees

- nested object properties and array indexes are stable pulse nodes
- writes clone only along the updated path
- successful writes emit `set`, `replace`, or `delete` mutations with absolute root paths
- array length changes notify `length` nodes explicitly
- listener dispatch uses insertion-order snapshot semantics

## Current Boundaries

- method names `get`, `set`, and `on` are reserved and cannot be accessed as child properties through dot notation
- deep structural traversal is defined for plain objects and arrays; non-plain objects such as `Date`, `Map`, and class instances are treated as atomic values
- with `noUncheckedIndexedAccess`, open-ended array indexes remain safety-biased in TypeScript; tuple indexes stay precise

## Documentation

- [Architecture](./docs/ARCHITECTURE_PLAN.md)
- [Contract](./docs/CONTRACT.md)
- [API](./docs/API.md)
- [Usage](./docs/USAGE.md)
- [Release Plan](./docs/RELEASE_PLAN.md)

## Validation

```sh
pnpm validate
```

This runs runtime tests, strict source typechecking, public type tests, and the package build in one step.
