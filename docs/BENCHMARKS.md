# Benchmarks

Generated: 2026-04-10T15:02:26.462Z

Environment: Node v24.14.1 on darwin arm64

Shared-scenario comparisons are directional, not absolute. `pulse` includes deep proxy traversal and path-aware listener bookkeeping that the baseline libraries model differently.
Cold scenarios keep state creation inside the timed task. Hot scenarios use `setup` once and measure steady-state reads or writes against an already wrapped store.
Bulk comparison cases use each library's intended mutation model where available: `batch` for Legend-State and direct proxy mutation for Valtio.
Subscription cases are library-shaped: Pulse and Legend-State use explicit node listeners, and Valtio uses proxy subscriptions.
Use `benchmark:all` for the fastest full-suite smoke pass, `benchmark:report` for the balanced everyday report, and `benchmark:report:full` for the heavier publication-grade pass.
Store creation and wide-array cases isolate initialization and immutable container overhead. Subscription cases focus on exact-path node listeners.
Operation timings are rendered in ns/op throughout this report for consistent comparison across fast and slow scenarios.

## Pulse Suite

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root get on reused state | 26 ns/op | 24 ns/op | 6.1% | 2 | 200000 | 50000 |
| deep leaf get on reused state | 7,677 ns/op | 6,370 ns/op | 20.5% | 2 | 25000 | 25000 |
| editable table cell get on reused state | 408 ns/op | 392 ns/op | 4.0% | 2 | 25000 | 25000 |

### Activation Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wide graph deep leaf get on fresh state | 489,794 ns/op | 485,874 ns/op | 0.8% | 2 | 500 | 500 |
| wide graph deep leaf subscribe on fresh state | 772,236 ns/op | 770,674 ns/op | 0.2% | 2 | 500 | 500 |

### Focused Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| primitive root write | 61 ns/op | 60 ns/op | 1.3% | 2 | 30000 | 10000 |
| deep leaf write | 27,691 ns/op | 27,593 ns/op | 0.4% | 2 | 2000 | 2000 |
| wide array item replace | 365,677 ns/op | 364,195 ns/op | 0.4% | 2 | 1000 | 1000 |
| array leaf field write | 770 ns/op | 732 ns/op | 5.1% | 2 | 5000 | 5000 |
| array item multi-key replace | 499 ns/op | 473 ns/op | 5.4% | 2 | 10000 | 5000 |

### Array Reindexing Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| head insert with visible window consumer | 244,164 ns/op | 240,414 ns/op | 1.6% | 2 | 1000 | 1000 |
| head remove with visible window consumer | 12,002 ns/op | 11,480 ns/op | 4.5% | 2 | 1000 | 1000 |

### Large Table Structural Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| create 1,000 rows | 46,816 ns/op | 46,231 ns/op | 1.3% | 2 | 500 | 500 |
| create 10,000 rows | 460,593 ns/op | 457,982 ns/op | 0.6% | 2 | 100 | 100 |
| replace all 1,000 rows | 48,064 ns/op | 47,900 ns/op | 0.3% | 2 | 500 | 500 |
| partial update every 10th row in 1,000 rows | 104,309 ns/op | 103,583 ns/op | 0.7% | 2 | 500 | 500 |
| select focused row in 1,000 rows | 2,407 ns/op | 2,199 ns/op | 9.5% | 2 | 2000 | 1000 |
| swap two rows in 1,000 rows | 651 ns/op | 591 ns/op | 10.1% | 2 | 4000 | 500 |
| remove one row from 1,000 rows | 4,217 ns/op | 3,567 ns/op | 18.2% | 2 | 3000 | 500 |
| append 1,000 rows to 10,000 rows | 275,120 ns/op | 270,274 ns/op | 1.8% | 2 | 100 | 100 |
| clear 1,000 rows | 198 ns/op | 196 ns/op | 0.7% | 2 | 8000 | 1000 |

### Derived Consumer Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| relevant source write with two-source consumer | 2,094 ns/op | 1,861 ns/op | 12.5% | 2 | 5000 | 5000 |
| unrelated source write with two-source consumer | 488 ns/op | 485 ns/op | 0.8% | 2 | 10000 | 5000 |
| batched dual-source write with two-source consumer | 3,421 ns/op | 3,323 ns/op | 2.9% | 2 | 3000 | 3000 |

### Batch Collapse Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| same leaf written twice in root batch | 2,505 ns/op | 2,276 ns/op | 10.0% | 2 | 5000 | 5000 |
| sibling leaf writes in root batch | 2,929 ns/op | 2,866 ns/op | 2.2% | 2 | 3000 | 3000 |

### Listener Selectivity Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| write one subscribed leaf among 100 listeners | 1,546 ns/op | 1,475 ns/op | 4.8% | 2 | 2000 | 2000 |
| write unsubscribed leaf with 100 unrelated listeners | 655 ns/op | 632 ns/op | 3.6% | 2 | 8000 | 2000 |

### Path Depth Scaling

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| depth 5 leaf write | 1,735 ns/op | 1,642 ns/op | 5.7% | 2 | 5000 | 5000 |
| depth 25 leaf write | 6,130 ns/op | 6,107 ns/op | 0.4% | 2 | 3000 | 3000 |
| depth 100 leaf write | 24,635 ns/op | 24,420 ns/op | 0.9% | 2 | 1500 | 1500 |
| depth 200 leaf write | 46,715 ns/op | 46,539 ns/op | 0.4% | 2 | 1000 | 1000 |

### Structural Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sparse array growth | 390 ns/op | 382 ns/op | 2.1% | 2 | 16000 | 2000 |
| array truncate via length | 38,259 ns/op | 38,121 ns/op | 0.4% | 2 | 2000 | 2000 |
| deep object branch replace | 6,553 ns/op | 6,545 ns/op | 0.1% | 2 | 2000 | 2000 |
| whole array multi-row replace | 37,223 ns/op | 37,095 ns/op | 0.3% | 2 | 1000 | 1000 |
| whole array multi-row replace in root batch | 56,130 ns/op | 53,086 ns/op | 5.7% | 2 | 1000 | 1000 |

### General App Write Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nested object leaf write | 4,450 ns/op | 4,407 ns/op | 1.0% | 2 | 5000 | 5000 |
| mixed array object leaf write | 59,940 ns/op | 59,614 ns/op | 0.5% | 2 | 3000 | 3000 |
| batched sibling object writes | 5,516 ns/op | 5,464 ns/op | 1.0% | 2 | 3000 | 3000 |
| batched list item multi-field writes | 63,557 ns/op | 63,091 ns/op | 0.7% | 2 | 1500 | 1500 |

### Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener subscribe and unsubscribe | 108 ns/op | 99 ns/op | 8.2% | 2 | 20000 | 5000 |
| leaf listener subscribe and unsubscribe | 867 ns/op | 801 ns/op | 8.3% | 2 | 5000 | 5000 |
| market row listener subscribe and unsubscribe | 3,690 ns/op | 3,655 ns/op | 1.0% | 2 | 5000 | 5000 |
| hundred leaf listeners subscribe and unsubscribe | 34,171 ns/op | 34,165 ns/op | 0.0% | 2 | 1000 | 1000 |

### Editable Table Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 row listeners subscribe and unsubscribe | 2,231,020 ns/op | 2,226,495 ns/op | 0.2% | 2 | 500 | 500 |
| visible window listeners subscribe and unsubscribe | 2,737,828 ns/op | 2,729,384 ns/op | 0.3% | 2 | 100 | 100 |

### Subscription Dispatch Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener write | 333 ns/op | 320 ns/op | 4.2% | 2 | 15000 | 5000 |
| leaf listener write | 1,114 ns/op | 1,067 ns/op | 4.4% | 2 | 5000 | 5000 |
| item listener write | 1,940 ns/op | 1,838 ns/op | 5.5% | 2 | 5000 | 5000 |
| market row listener replace | 3,758 ns/op | 3,708 ns/op | 1.4% | 2 | 5000 | 5000 |
| market row listener replace in root batch | 3,975 ns/op | 3,960 ns/op | 0.4% | 2 | 5000 | 5000 |
| market row exact child listeners replace in root batch | 3,015 ns/op | 2,959 ns/op | 1.9% | 2 | 5000 | 5000 |
| hundred leaf listeners on same node | 1,604 ns/op | 1,595 ns/op | 0.6% | 2 | 4000 | 1000 |
| beat batched sweep mirror 10000 rows with per-field listeners | 90,257,438 ns/op | 89,035,883 ns/op | 1.4% | 2 | 10 | 10 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100x730 single cell write | 2,239,280 ns/op | 2,237,568 ns/op | 0.1% | 2 | 1000 | 1000 |
| 100x730 single cell write with cell listener | 2,307,218 ns/op | 2,272,792 ns/op | 1.5% | 2 | 1000 | 1000 |
| 100x730 single cell write with row listener | 2,247,943 ns/op | 2,245,216 ns/op | 0.1% | 2 | 1000 | 1000 |
| 100x730 visible window listeners and cell write | 2,789,477 ns/op | 2,781,539 ns/op | 0.3% | 2 | 250 | 250 |
| 100x730 first month write across first 50 rows | 4,440,399 ns/op | 4,435,631 ns/op | 0.1% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows in root batch | 4,975,516 ns/op | 4,958,491 ns/op | 0.3% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners | 4,656,602 ns/op | 4,653,266 ns/op | 0.1% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 5,668,234 ns/op | 5,616,340 ns/op | 0.9% | 2 | 100 | 100 |

