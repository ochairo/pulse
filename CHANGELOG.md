# Changelog

## 0.2.0

- stabilize the explicit `pulse()` contract around `get()`, `set()`, and `on()`
- support stable nested pulse nodes for plain objects, arrays, and reactive array `length`
- preserve ancestor-aware change events with absolute mutation paths and snapshot listener dispatch
- treat functions and non-plain objects as atomic leaves with no child pulse traversal
- align open-ended array indexing with `noUncheckedIndexedAccess` by typing indexed pulses as element-or-`undefined`
- harden reserved-key behavior for `get`, `set`, `on`, `then`, `catch`, and `finally`
- expand runtime regression coverage and public type tests for edge cases and contract boundaries
