<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# <img src="./assets/pulse-logo.svg" alt="pulse logo" width="32" height="16"> pulse

Deep reactive state that feels like plain data.<br>
_Explicit APIs for plain objects and arrays. No magic._

</div>

## Concept

`pulse` is a reactive runtime for plain object and array state.
It keeps reads, writes, and subscriptions explicit while preserving normal property and index navigation for reachable child nodes.

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

// Subscribe to "name" mutations only.
users.prop("name").on((event) =>
  console.log(event.currentValue)
);

// Write through navigation.
users[0]?.name.set("Lois");
```

## Documentation

- [API](./docs/API.md)
- [Benchmarks](./docs/BENCHMARKS.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/pulse/issues) • [Request Feature](https://github.com/ochairo/pulse/issues)

</div>
