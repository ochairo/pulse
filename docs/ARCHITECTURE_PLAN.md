# Architecture

## Intent

`pulse` is a new reactive runtime project.

It is intentionally not modeled as a compatibility layer over the existing `signals` package.
The runtime is built around explicit `get() / set() / on()` semantics and path-aware change delivery.

## Dependency Direction

```text
  public entry point -> application -> infrastructure
```

## Layer Roles

### Public Entry Point

- exports the stable package surface
- keeps package boundaries thin

### Application

- owns pulse node identity and proxy creation
- coordinates write execution and listener notification
- applies the public contract at each pulse node

### Infrastructure

- immutable path writes
- subtree mutation diffing
- path normalization and relevance checks

## Current Source Layout

- `src/index.ts`: public exports
- `src/pulse.ts`: thin public factory facade
- `src/types.ts`: public type contract
- `src/application/runtime.ts`: pulse runtime orchestration and proxy node lifecycle
- `src/infrastructure/value.ts`: path reads, immutable writes, and mutation collection

## Runtime Model

- one runtime owns the current root value and the lazily created node tree
- each accessed path gets a stable proxy node cached in the runtime tree
- writes replace only the branches along the modified path
- notifications walk the existing node tree and deliver events only where resolved values changed

## Deliberate Tradeoffs

- deep traversal is limited to plain objects and arrays to keep semantics predictable
- mutation paths are absolute, which keeps event inspection simple across nested listeners
- tuple typing is precise, while open-ended arrays stay aligned with strict TypeScript index safety
