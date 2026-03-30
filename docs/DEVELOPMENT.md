# Development

## Validation

```sh
pnpm validate
```

This runs runtime tests, strict source typechecking, public type tests, and the package build in one step.

## Benchmark

```sh
pnpm benchmark
```

This builds the package and runs the pulse-only scenario suite covering read costs, focused writes, structural writes, and listener-driven updates.
It also includes editable-table scenarios for a `100 x 730` dataset with single-cell writes and different subscription scopes.
Benchmark-only dependencies are isolated in `benchmarks/package.json`, so they do not become dependencies of the published pulse package.

```sh
pnpm benchmark:compare
```

This runs a comparison suite against `Legend-State`, `MobX`, and `Valtio` across a smaller set of shared scenarios.

```sh
pnpm benchmark:report
```

This writes machine-readable and markdown reports to `.release-artifacts/benchmark-latest.json` and `docs/BENCHMARKS.md`.

```sh
pnpm benchmark:all
```

This runs the pulse suite, the comparison suite, and regenerates the benchmark reports in one command.
