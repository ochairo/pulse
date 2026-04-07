<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# <img src="./assets/pulse-logo.svg" alt="pulse logo" width="32" height="16"> pulse

Reacts where you watch.<br>
_Deep, exact-path reactivity for plain objects and arrays._

</div>

## Concept

`pulse` is an exact-path reactive runtime for plain objects and arrays.
It keeps reads, writes, and subscriptions scoped to the concrete node you access, while preserving normal property and index navigation for reachable child nodes.

## Install

```sh
pnpm add @ochairo/pulse
```

## Quick Start

```ts
import { pulse } from "@ochairo/pulse";
import type { User } from "./types";

const users = pulse<User[]>([
  { name: "Mary", age: 30 },
  { name: "Chloe", age: 25 },
]);

// Write through navigation.
users[0]?.name.set("Lois");

// Reads stay scoped to the exact path.
console.log(users[0]?.name.get());

// Exact listeners stay scoped to the exact path too.
users[0]?.prop("name").on((event) => {
  console.log(event.currentValue);
});

// Object branches also stay exact.
const state = pulse({ users: { basic: { name: "John" } } });

state.users.basic.prop("name").on((event) => {
  console.log(event.currentValue);
});

users[0]?.name.on((event) => {
  console.log(event.currentValue);
});

// Ancestor listeners do not fire for descendant-only changes.
state.users.on(() => {
  console.log("only fires when users itself changes");
});
```

`pulse` stays explicit by design:

- `get()` reads exactly the node you access
- `set()` writes exactly the node you access
- `on()` subscribes only to that exact node
- ancestor replacement can still notify a descendant if the descendant value actually changed

## Documentation

- [API](./docs/API.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/pulse/issues) • [Request Feature](https://github.com/ochairo/pulse/issues)

</div>
