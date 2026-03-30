# Release Plan

## Target

Prepare `@ochairo/pulse` for a public `0.2.0` release without changing the current core contract.

## Scope

- keep the explicit `get() / set() / on()` model
- keep deep traversal limited to plain objects and arrays
- keep ancestor-aware change delivery and strict TypeScript behavior

## Release Gates

### API Stability

- confirm `Pulse<T>` method names and nested node typing are frozen for `0.2.x`
- decide whether reserved keys `get`, `set`, and `on` need an escape hatch before `1.0`
- decide whether collection adapters for `Map`, `Set`, and `Date` are pre-`1.0` work or post-`1.0` extensions

### Validation

- run `pnpm validate`
- test package contents with `pnpm pack`
- verify import behavior from a clean consumer fixture before publishing
- keep CI running `pnpm validate` on pushes to `main` and pull requests

### Package Metadata

- repository, homepage, and bugs URLs are currently set to the GitHub `ochairo/pulse` location
- package-local `LICENSE` file is now present for independent publishing
- review keywords and description against the final public positioning

### Documentation

- keep the README quick-start aligned with the actual runtime
- document reserved-key behavior prominently
- add one consumer-oriented migration note if `pulse` will be presented next to `signals`

## Deferred Risks

- non-plain objects are still atomic values
- open-ended array indexes remain conservative under `noUncheckedIndexedAccess`
- introspection helpers such as `Object.keys(node)` are not part of the runtime contract

## Publish Checklist

1. Run `pnpm validate`.
2. Inspect the packed tarball contents.
3. Confirm README examples against the built package.
4. Publish as `0.2.0` only after the package metadata is complete.
