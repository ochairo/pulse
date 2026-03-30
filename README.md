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

const users = pulse<User[]>([{ name: "Ada", age: 30 }, { name: "Paul", age: 25 }]);

// Subscribe to the whole array with structural change awareness.
users.on((event) => {
  event.previousValue;
  event.currentValue;

  const isNameChanged = event.changes.some((change) => change.key === "name");

  if (isNameChanged) {
    console.log("A user name changed.");
  }
});

// Update through normal navigation.
users[0]?.set({ name: "Grace", age: 30 });
```

```ts
// Batch multiple updates with a single notification.
users.batch(() => {
  users[0]?.name.set("Ada");
  users[1]?.age.set(26);
});

// Reads are also normal.
users[0]?.get()?.name;
users.get();

// You can also subscribe to a single item or a single field:
users[0]?.on((event) => {
  event.previousValue;
  event.currentValue;
});

// Or even a non-plain object leaf:
users[0]?.name.on((event) => {
  event.previousValue;
  event.currentValue;
});

// Writes through non-plain object branches throw:
users[0]?.name.set("Grace");
```

`batch()` exists only on the root pulse. Child paths keep `get()`, `set()`, and `on()`.

## Documentation

- [Usage](./docs/USAGE.md)
- [API](./docs/API.md)
- [Contract](./docs/CONTRACT.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/pulse/issues) • [Request Feature](https://github.com/ochairo/pulse/issues)

</div>
