# Benchmarks

Generated: 2026-03-30T15:30:45.050Z

Environment: Node v25.2.1 on darwin arm64

Shared-scenario comparisons are directional, not absolute. `pulse` includes deep proxy traversal and path-aware listener bookkeeping that the baseline libraries model differently.
Bulk comparison cases use each library's intended mutation model where available: `runInAction` for MobX, `batch` for Legend-State, and direct proxy mutation for Valtio.
Subtree listener cases are also library-shaped: Pulse and Legend-State use explicit node listeners, Valtio uses subtree proxy subscriptions, and MobX uses tracked reactions for the row or table shape being observed.
Store creation and wide-array cases isolate initialization and immutable container overhead. Leaf and root subscription cases measure fine-grained vs coarse-grained notification cost.

## Pulse Suite

### Read Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| root get | 0.001 ms/op | 25000 |
| deep leaf get | 0.080 ms/op | 10000 |

### Focused Writes

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| primitive root write | 0.000 ms/op | 10000 |
| deep leaf write | 0.093 ms/op | 2000 |
| wide array item replace | 0.382 ms/op | 1000 |
| array leaf field write | 0.001 ms/op | 5000 |
| array item multi-key replace | 0.001 ms/op | 5000 |

### Structural Writes

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| sparse array growth | 0.001 ms/op | 2000 |
| array truncate via length | 0.038 ms/op | 2000 |
| deep object subtree replace | 0.013 ms/op | 2000 |
| whole array multi-row replace | 0.038 ms/op | 1000 |
| whole array multi-row replace in root batch | 0.045 ms/op | 1000 |

### Subscription Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| leaf listener write | 0.002 ms/op | 5000 |
| item listener write | 0.004 ms/op | 5000 |
| root listener write | 0.004 ms/op | 5000 |
| root listener with key filter | 0.001 ms/op | 5000 |
| root listener with multi-key scan | 0.063 ms/op | 2000 |
| root listener with multi-key scan in root batch | 0.063 ms/op | 2000 |
| ancestor listener fanout | 0.002 ms/op | 2000 |
| ten leaf listeners on same node | 0.006 ms/op | 2000 |
| hundred leaf listeners on same node | 0.049 ms/op | 1000 |
| thousand leaf listeners on same node | 0.376 ms/op | 250 |

### Editable Table Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| 100x730 single cell write | 2.237 ms/op | 1000 |
| 100x730 single cell write with cell listener | 2.240 ms/op | 1000 |
| 100x730 single cell write with row listener | 2.229 ms/op | 1000 |
| 100x730 single cell write with root key filter | 2.235 ms/op | 1000 |
| 100x730 visible window listeners and cell write | 2.916 ms/op | 250 |
| 100x730 first month write across first 50 rows | 4.962 ms/op | 100 |
| 100x730 first month write across first 50 rows in root batch | 5.044 ms/op | 100 |
| 100x730 first month write across first 50 rows with row listeners | 5.385 ms/op | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 4.884 ms/op | 100 |
| 100x730 first month write across first 50 rows with root key filter | 5.247 ms/op | 100 |
| 100x730 first month write across first 50 rows with root key filter in root batch | 4.894 ms/op | 100 |

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
| pulse | 0.047 ms/op | 1000 |
| Legend-State | 0.161 ms/op | 1000 |
| MobX | 0.078 ms/op | 1000 |
| valtio | 0.064 ms/op | 1000 |

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
| Legend-State | 0.027 ms/op | 1000 |
| MobX | 0.505 ms/op | 1000 |
| valtio | 0.684 ms/op | 1000 |

### Store Creation Cost

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.004 ms/op | 1000 |
| Legend-State | 0.004 ms/op | 1000 |
| MobX | 0.280 ms/op | 1000 |
| valtio | 0.288 ms/op | 1000 |

### Wide Array Item Replace

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.480 ms/op | 1000 |
| Legend-State | 0.482 ms/op | 1000 |
| MobX | 24.429 ms/op | 1000 |
| valtio | 30.638 ms/op | 1000 |

### Root Subscription Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.004 ms/op | 5000 |
| Legend-State | 0.003 ms/op | 5000 |
| MobX | 0.014 ms/op | 5000 |
| valtio | 0.002 ms/op | 5000 |

### Leaf Subscription Write

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse | 0.002 ms/op | 5000 |
| Legend-State | 0.007 ms/op | 5000 |
| MobX | 0.008 ms/op | 5000 |
| valtio | 0.006 ms/op | 5000 |

### Editable Table Costs

| Scenario | Average | Iterations |
| --- | ---: | ---: |
| pulse 100x730 single cell write | 0.002 ms/op | 2000 |
| Legend-State 100x730 single cell write | 0.006 ms/op | 2000 |
| MobX 100x730 single cell write | 0.001 ms/op | 2000 |
| valtio 100x730 single cell write | 0.000 ms/op | 2000 |
| pulse 100x730 single cell write with cell listener | 0.002 ms/op | 2000 |
| Legend-State 100x730 single cell write with cell listener | 0.010 ms/op | 2000 |
| MobX 100x730 single cell write with cell listener | 0.001 ms/op | 2000 |
| valtio 100x730 single cell write with cell listener | 0.000 ms/op | 2000 |
| pulse 100x730 single cell write with row listener | 0.006 ms/op | 2000 |
| Legend-State 100x730 single cell write with row listener | 0.006 ms/op | 2000 |
| MobX 100x730 single cell write with row listener | 0.159 ms/op | 500 |
| valtio 100x730 single cell write with row listener | 0.000 ms/op | 1000 |
| pulse 100x730 single cell write with root listener | 0.002 ms/op | 1000 |
| Legend-State 100x730 single cell write with root listener | 0.014 ms/op | 1000 |
| MobX 100x730 single cell write with root listener | 19.173 ms/op | 50 |
| valtio 100x730 single cell write with root listener | 0.001 ms/op | 100 |
| pulse 100x730 visible window listeners and cell write | 0.002 ms/op | 500 |
| Legend-State 100x730 visible window listeners and cell write | 0.006 ms/op | 500 |
| MobX 100x730 visible window listeners and cell write | 0.001 ms/op | 200 |
| valtio 100x730 visible window listeners and cell write | 0.000 ms/op | 250 |
| pulse 100x730 first month write across first 50 rows | 2.957 ms/op | 50 |
| Legend-State 100x730 first month write across first 50 rows | 7.896 ms/op | 50 |
| MobX 100x730 first month write across first 50 rows | 0.635 ms/op | 50 |
| valtio 100x730 first month write across first 50 rows | 0.461 ms/op | 50 |
| pulse 100x730 first month write across first 50 rows with row listeners | 1.744 ms/op | 50 |
| Legend-State 100x730 first month write across first 50 rows with row listeners | 9.457 ms/op | 50 |
| MobX 100x730 first month write across first 50 rows with row listeners | 9.439 ms/op | 25 |
| valtio 100x730 first month write across first 50 rows with row listeners | 0.560 ms/op | 25 |

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
| Deep Nested Leaf Write | 0.047 ms/op | 0.161 ms/op | 0.078 ms/op | 0.064 ms/op | pulse |
| Array Item Field Write | 0.004 ms/op | 0.004 ms/op | 0.008 ms/op | 0.012 ms/op | pulse |
| Whole Array Multi-Row Replace | 0.010 ms/op | 0.027 ms/op | 0.505 ms/op | 0.684 ms/op | pulse |
| Store Creation Cost | 0.004 ms/op | 0.004 ms/op | 0.280 ms/op | 0.288 ms/op | Legend-State |
| Wide Array Item Replace | 0.480 ms/op | 0.482 ms/op | 24.429 ms/op | 30.638 ms/op | pulse |
| Root Subscription Write | 0.004 ms/op | 0.003 ms/op | 0.014 ms/op | 0.002 ms/op | valtio |
| Leaf Subscription Write | 0.002 ms/op | 0.007 ms/op | 0.008 ms/op | 0.006 ms/op | pulse |
| Editable Table Costs | 0.016 ms/op | 0.056 ms/op | 0.066 ms/op | 0.003 ms/op | valtio |

### Category Breadth

| Library | Category Wins |
| --- | ---: |
| pulse | 5 |
| valtio | 2 |
| Legend-State | 1 |
| MobX | 1 |

Most category wins: pulse

### Equal-Category Overall

| Library | Category Wins | Equal-Category Score |
| --- | ---: | ---: |
| pulse | 5 | 0.009 ms/op |
| Legend-State | 1 | 0.015 ms/op |
| valtio | 2 | 0.038 ms/op |
| MobX | 1 | 0.056 ms/op |

Equal-category overall winner: pulse

### Scenario-Weighted Overall

| Library | Category Wins | Scenario-Weighted Score |
| --- | ---: | ---: |
| pulse | 5 | 0.011 ms/op |
| valtio | 2 | 0.014 ms/op |
| Legend-State | 1 | 0.026 ms/op |
| MobX | 1 | 0.060 ms/op |

Scenario-weighted overall winner: pulse

