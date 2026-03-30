# Changelog

## 0.1.0

- introduce the initial deep `pulse()` runtime with explicit `get()`, `set()`, and `on()` semantics
- support stable nested pulse nodes for plain objects, arrays, and array `length`
- deliver ancestor-aware change events with absolute mutation paths
- validate runtime behavior with runtime tests, strict source typechecking, and public type tests
