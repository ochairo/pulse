# Benchmarks

Generated: 2026-03-30T13:52:10.064Z

Environment: Node v25.2.1 on darwin arm64

Shared-scenario comparisons are directional, not absolute. `pulse` includes deep proxy traversal and path-aware listener bookkeeping that the baseline libraries model differently.
Bulk comparison cases use each library's intended mutation model where available: `runInAction` for MobX, `batch` for Legend-State, and direct proxy mutation for Valtio.
Subtree listener cases are also library-shaped: Pulse and Legend-State use explicit node listeners, Valtio uses subtree proxy subscriptions, and MobX uses tracked reactions for the row or table shape being observed.
Store creation and wide-array cases isolate initialization and immutable container overhead. Leaf and root subscription cases measure fine-grained vs coarse-grained notification cost.

## Pulse Suite

### Read Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| root get | 0.000 ms/op | 25000 |
| deep leaf get | 0.108 ms/op | 10000 |

### Focused Writes

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| primitive root write | 0.000 ms/op | 10000 |
| deep leaf write | 0.113 ms/op | 2000 |
| wide array item replace | 0.383 ms/op | 1000 |
| array leaf field write | 0.001 ms/op | 5000 |
| array item multi-key replace | 0.001 ms/op | 5000 |

### Structural Writes

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| sparse array growth | 0.001 ms/op | 2000 |
| array truncate via length | 0.041 ms/op | 2000 |
| deep object subtree replace | 0.018 ms/op | 2000 |
| whole array multi-row replace | 0.038 ms/op | 1000 |
| whole array multi-row replace in root batch | 0.047 ms/op | 1000 |

### Subscription Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| leaf listener write | 0.004 ms/op | 5000 |
| item listener write | 0.005 ms/op | 5000 |
| root listener write | 0.002 ms/op | 5000 |
| root listener with key filter | 0.003 ms/op | 5000 |
| root listener with multi-key scan | 0.060 ms/op | 2000 |
| root listener with multi-key scan in root batch | 0.061 ms/op | 2000 |
| ancestor listener fanout | 0.002 ms/op | 2000 |
| ten leaf listeners on same node | 0.007 ms/op | 2000 |
| hundred leaf listeners on same node | 0.090 ms/op | 1000 |
| thousand leaf listeners on same node | 0.399 ms/op | 250 |

### Editable Table Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| 100x730 single cell write | 2.250 ms/op | 1000 |
| 100x730 single cell write with cell listener | 2.205 ms/op | 1000 |
| 100x730 single cell write with row listener | 2.226 ms/op | 1000 |
| 100x730 single cell write with root key filter | 2.487 ms/op | 1000 |
| 100x730 visible window listeners and cell write | 3.636 ms/op | 250 |
| 100x730 first month write across first 50 rows | 5.419 ms/op | 100 |
| 100x730 first month write across first 50 rows in root batch | 5.619 ms/op | 100 |
| 100x730 first month write across first 50 rows with row listeners | 5.810 ms/op | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 5.142 ms/op | 100 |
| 100x730 first month write across first 50 rows with root key filter | 5.618 ms/op | 100 |
| 100x730 first month write across first 50 rows with root key filter in root batch | 5.558 ms/op | 100 |

## Comparison Suite

### Primitive Root Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.001 ms/op | 10000 |
| Legend-State | 0.001 ms/op | 10000 |
| MobX | 0.000 ms/op | 10000 |
| valtio | 0.001 ms/op | 10000 |

### Deep Nested Leaf Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.046 ms/op | 1000 |
| Legend-State | 0.161 ms/op | 1000 |
| MobX | 0.077 ms/op | 1000 |
| valtio | 0.068 ms/op | 1000 |

### Array Item Field Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.004 ms/op | 5000 |
| Legend-State | 0.004 ms/op | 5000 |
| MobX | 0.008 ms/op | 5000 |
| valtio | 0.012 ms/op | 5000 |

### Whole Array Multi-Row Replace

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.010 ms/op | 1000 |
| Legend-State | 0.025 ms/op | 1000 |
| MobX | 0.504 ms/op | 1000 |
| valtio | 0.689 ms/op | 1000 |

### Store Creation Cost

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.004 ms/op | 1000 |
| Legend-State | 0.004 ms/op | 1000 |
| MobX | 0.274 ms/op | 1000 |
| valtio | 0.292 ms/op | 1000 |

### Wide Array Item Replace

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.478 ms/op | 1000 |
| Legend-State | 0.478 ms/op | 1000 |
| MobX | 24.347 ms/op | 1000 |
| valtio | 31.015 ms/op | 1000 |

### Root Subscription Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.001 ms/op | 5000 |
| Legend-State | 0.005 ms/op | 5000 |
| MobX | 0.003 ms/op | 5000 |
| valtio | 0.002 ms/op | 5000 |

### Leaf Subscription Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.002 ms/op | 5000 |
| Legend-State | 0.006 ms/op | 5000 |
| MobX | 0.008 ms/op | 5000 |
| valtio | 0.005 ms/op | 5000 |

### Editable Table Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse 100x730 single cell write | 0.005 ms/op | 2000 |
| Legend-State 100x730 single cell write | 0.006 ms/op | 2000 |
| MobX 100x730 single cell write | 0.001 ms/op | 2000 |
| valtio 100x730 single cell write | 0.000 ms/op | 2000 |
| pulse 100x730 single cell write with cell listener | 0.007 ms/op | 2000 |
| Legend-State 100x730 single cell write with cell listener | 0.006 ms/op | 2000 |
| MobX 100x730 single cell write with cell listener | 0.001 ms/op | 2000 |
| valtio 100x730 single cell write with cell listener | 0.001 ms/op | 2000 |
| pulse 100x730 single cell write with row listener | 0.002 ms/op | 2000 |
| Legend-State 100x730 single cell write with row listener | 0.006 ms/op | 2000 |
| MobX 100x730 single cell write with row listener | 0.161 ms/op | 500 |
| valtio 100x730 single cell write with row listener | 0.000 ms/op | 1000 |
| pulse 100x730 single cell write with root listener | 0.010 ms/op | 1000 |
| Legend-State 100x730 single cell write with root listener | 0.006 ms/op | 1000 |
| MobX 100x730 single cell write with root listener | 18.444 ms/op | 50 |
| valtio 100x730 single cell write with root listener | 0.001 ms/op | 100 |
| pulse 100x730 visible window listeners and cell write | 0.002 ms/op | 500 |
| Legend-State 100x730 visible window listeners and cell write | 0.006 ms/op | 500 |
| MobX 100x730 visible window listeners and cell write | 0.001 ms/op | 200 |
| valtio 100x730 visible window listeners and cell write | 0.000 ms/op | 250 |
| pulse 100x730 first month write across first 50 rows | 1.687 ms/op | 50 |
| Legend-State 100x730 first month write across first 50 rows | 7.942 ms/op | 50 |
| MobX 100x730 first month write across first 50 rows | 0.632 ms/op | 50 |
| valtio 100x730 first month write across first 50 rows | 0.508 ms/op | 50 |
| pulse 100x730 first month write across first 50 rows with row listeners | 1.786 ms/op | 50 |
| Legend-State 100x730 first month write across first 50 rows with row listeners | 8.076 ms/op | 50 |
| MobX 100x730 first month write across first 50 rows with row listeners | 9.476 ms/op | 25 |
| valtio 100x730 first month write across first 50 rows with row listeners | 3.945 ms/op | 25 |

## Comparison Summary

Category winners use the lowest average within that category. For multi-scenario categories like Editable Table Costs, the category score is the geometric mean of that library's scenarios in the category.
Store Creation Cost measures wrapping a 100-element user array. Wide Array Item Replace writes the last item in a 10k array to stress immutable container costs at scale.
Leaf Subscription Write measures subscribe-write-unsubscribe on a specific leaf field. Root Subscription Write does the same at the root level.
Pulse uses batching only in scenarios where coordinated multi-write updates are the intended mutation model.
Equal-Category Overall gives each top-level category the same weight.
Scenario-Weighted Overall gives each benchmark row the same weight, so categories with more scenarios contribute more.
Category Wins is shown separately as a breadth signal.

### Category Winners

| Category | pulse | Legend-State | MobX | valtio | Winner |
| --- | ---: | ---: | ---: | ---: | --- |
| Primitive Root Write | 0.001 ms/op | 0.001 ms/op | 0.000 ms/op | 0.001 ms/op | MobX |
| Deep Nested Leaf Write | 0.046 ms/op | 0.161 ms/op | 0.077 ms/op | 0.068 ms/op | pulse |
| Array Item Field Write | 0.004 ms/op | 0.004 ms/op | 0.008 ms/op | 0.012 ms/op | Legend-State |
| Whole Array Multi-Row Replace | 0.010 ms/op | 0.025 ms/op | 0.504 ms/op | 0.689 ms/op | pulse |
| Store Creation Cost | 0.004 ms/op | 0.004 ms/op | 0.274 ms/op | 0.292 ms/op | Legend-State |
| Wide Array Item Replace | 0.478 ms/op | 0.478 ms/op | 24.347 ms/op | 31.015 ms/op | Legend-State |
| Root Subscription Write | 0.001 ms/op | 0.005 ms/op | 0.003 ms/op | 0.002 ms/op | pulse |
| Leaf Subscription Write | 0.002 ms/op | 0.006 ms/op | 0.008 ms/op | 0.005 ms/op | pulse |
| Editable Table Costs | 0.022 ms/op | 0.046 ms/op | 0.066 ms/op | 0.005 ms/op | valtio |

### Category Breadth

| Library | Category Wins |
| --- | ---: |
| pulse | 4 |
| Legend-State | 3 |
| valtio | 1 |
| MobX | 1 |

Most category wins: pulse

### Equal-Category Overall

| Library | Category Wins | Equal-Category Score |
| --- | ---: | ---: |
| pulse | 4 | 0.008 ms/op |
| Legend-State | 3 | 0.015 ms/op |
| valtio | 1 | 0.040 ms/op |
| MobX | 1 | 0.047 ms/op |

Equal-category overall winner: pulse

### Scenario-Weighted Overall

| Library | Category Wins | Scenario-Weighted Score |
| --- | ---: | ---: |
| pulse | 4 | 0.012 ms/op |
| valtio | 1 | 0.017 ms/op |
| Legend-State | 3 | 0.024 ms/op |
| MobX | 1 | 0.053 ms/op |

Scenario-weighted overall winner: pulse

