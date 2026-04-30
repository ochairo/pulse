<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# pulse

Reacts where you watch.<br>
_Deep, exact-path reactivity for plain objects and arrays._

[![npm version](https://img.shields.io/npm/v/@ochairo/pulse)](https://www.npmjs.com/package/@ochairo/pulse)
[![npm downloads](https://img.shields.io/npm/dm/@ochairo/pulse)](https://www.npmjs.com/package/@ochairo/pulse)
![CI](https://github.com/ochairo/pulse/workflows/validate/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)

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
- `derived()` creates a read-only pulse computed from a source
- ancestor replacement can still notify a descendant if the descendant value actually changed

## Derived Values

`derived` creates a read-only reactive value that updates when the source changes:

```ts
import { pulse, derived } from "@ochairo/pulse";

const count = pulse(0);
const isPositive = derived(count, (v) => v > 0);

console.log(isPositive.get()); // false

count.set(5);
console.log(isPositive.get()); // true

// Subscribe to changes
isPositive.on((event) => {
  console.log(event.currentValue); // only fires when the derived value actually changes
});

// Cleanup when done
isPositive.destroy();
```

`derived` skips notifications when the computed value is unchanged (`Object.is`).
The returned `ReadonlyPulse` is recognized by `isPulse()` and works with Beat's `Show`, `For`, and other reactive bindings.
