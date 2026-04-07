# Benchmarks

Generated: 2026-04-07T14:59:01.742Z

Environment: Node v24.14.1 on darwin arm64

Shared-scenario comparisons are directional, not absolute. `pulse` includes deep proxy traversal and path-aware listener bookkeeping that the baseline libraries model differently.
Cold scenarios keep state creation inside the timed task. Hot scenarios use `setup` once and measure steady-state reads or writes against an already wrapped store.
Bulk comparison cases use each library's intended mutation model where available: `runInAction` for MobX, `batch` for Legend-State, and direct proxy mutation for Valtio.
Subscription cases are library-shaped: Pulse and Legend-State use explicit node listeners, Valtio uses proxy subscriptions, and MobX uses tracked reactions for the row or table shape being observed.
Store creation and wide-array cases isolate initialization and immutable container overhead. Subscription cases focus on exact-path node listeners.
Operation timings are rendered in ns/op throughout this report for consistent comparison across fast and slow scenarios.

## Pulse Suite

### Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root get | 64 ns/op | 64 ns/op | 0.9% | 3 | 225000 | 25000 |
| deep leaf get | 27,766 ns/op | 27,770 ns/op | 0.2% | 3 | 10000 | 10000 |

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root get on reused state | 40 ns/op | 41 ns/op | 1.2% | 3 | 700000 | 50000 |
| deep leaf get on reused state | 10,534 ns/op | 10,586 ns/op | 1.1% | 3 | 25000 | 25000 |
| editable table cell get on reused state | 508 ns/op | 506 ns/op | 0.9% | 3 | 25000 | 25000 |

### Focused Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| primitive root write | 78 ns/op | 79 ns/op | 2.3% | 3 | 220000 | 10000 |
| deep leaf write | 40,950 ns/op | 40,903 ns/op | 0.5% | 3 | 2000 | 2000 |
| wide array item replace | 361,111 ns/op | 361,271 ns/op | 0.1% | 3 | 1000 | 1000 |
| array leaf field write | 842 ns/op | 843 ns/op | 0.4% | 3 | 15000 | 5000 |
| array item multi-key replace | 544 ns/op | 542 ns/op | 0.9% | 3 | 25000 | 5000 |

### Path Depth Scaling

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| depth 5 leaf write | 1,355 ns/op | 1,371 ns/op | 1.9% | 3 | 10000 | 5000 |
| depth 25 leaf write | 5,425 ns/op | 5,432 ns/op | 0.9% | 3 | 3000 | 3000 |
| depth 100 leaf write | 20,698 ns/op | 20,742 ns/op | 0.6% | 3 | 1500 | 1500 |
| depth 200 leaf write | 40,970 ns/op | 40,873 ns/op | 0.4% | 3 | 1000 | 1000 |

### Structural Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sparse array growth | 347 ns/op | 345 ns/op | 1.1% | 3 | 44000 | 2000 |
| array truncate via length | 37,262 ns/op | 37,306 ns/op | 0.2% | 3 | 2000 | 2000 |
| deep object branch replace | 5,989 ns/op | 5,997 ns/op | 2.0% | 3 | 2000 | 2000 |
| whole array multi-row replace | 36,959 ns/op | 36,942 ns/op | 0.7% | 3 | 1000 | 1000 |
| whole array multi-row replace in root batch | 42,429 ns/op | 46,271 ns/op | 19.8% | 3 | 1000 | 1000 |

### General App Write Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nested object leaf write | 4,170 ns/op | 4,160 ns/op | 0.5% | 3 | 5000 | 5000 |
| mixed array object leaf write | 61,415 ns/op | 61,409 ns/op | 0.1% | 3 | 3000 | 3000 |
| batched sibling object writes | 5,138 ns/op | 5,150 ns/op | 0.8% | 3 | 3000 | 3000 |
| batched list item multi-field writes | 63,877 ns/op | 63,822 ns/op | 0.2% | 3 | 1500 | 1500 |

### Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener subscribe and unsubscribe | 92 ns/op | 92 ns/op | 2.6% | 3 | 140000 | 5000 |
| leaf listener subscribe and unsubscribe | 713 ns/op | 721 ns/op | 2.3% | 3 | 30000 | 5000 |
| item listener subscribe and unsubscribe | 556 ns/op | 554 ns/op | 1.2% | 3 | 25000 | 5000 |
| market row listener subscribe and unsubscribe | 3,498 ns/op | 3,517 ns/op | 1.0% | 3 | 5000 | 5000 |
| ten leaf listeners subscribe and unsubscribe | 3,903 ns/op | 3,900 ns/op | 0.7% | 3 | 4000 | 2000 |
| hundred leaf listeners subscribe and unsubscribe | 31,680 ns/op | 31,648 ns/op | 0.3% | 3 | 1000 | 1000 |
| thousand leaf listeners subscribe and unsubscribe | 304,198 ns/op | 303,956 ns/op | 0.2% | 3 | 250 | 250 |

### Editable Table Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 row listeners subscribe and unsubscribe | 2,205,384 ns/op | 2,204,615 ns/op | 0.1% | 3 | 500 | 500 |
| visible window listeners subscribe and unsubscribe | 2,684,912 ns/op | 2,688,399 ns/op | 0.2% | 3 | 100 | 100 |

### Subscription Dispatch Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener write | 271 ns/op | 271 ns/op | 1.0% | 3 | 50000 | 5000 |
| leaf listener write | 788 ns/op | 808 ns/op | 4.0% | 3 | 15000 | 5000 |
| item listener write | 1,510 ns/op | 1,538 ns/op | 3.8% | 3 | 10000 | 5000 |
| market row listener replace | 3,158 ns/op | 3,179 ns/op | 2.8% | 3 | 5000 | 5000 |
| market row listener replace in root batch | 2,754 ns/op | 2,787 ns/op | 2.7% | 3 | 5000 | 5000 |
| ten leaf listeners on same node | 899 ns/op | 906 ns/op | 2.3% | 3 | 20000 | 2000 |
| hundred leaf listeners on same node | 1,498 ns/op | 1,491 ns/op | 1.0% | 3 | 10000 | 1000 |
| thousand leaf listeners on same node | 8,636 ns/op | 8,657 ns/op | 1.0% | 3 | 1500 | 250 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100x730 single cell write | 2,187,223 ns/op | 2,188,872 ns/op | 0.1% | 3 | 1000 | 1000 |
| 100x730 single cell write with cell listener | 2,193,763 ns/op | 2,195,974 ns/op | 0.1% | 3 | 1000 | 1000 |
| 100x730 single cell write with row listener | 2,193,949 ns/op | 2,194,269 ns/op | 0.3% | 3 | 1000 | 1000 |
| 100x730 visible window listeners and cell write | 2,691,833 ns/op | 2,693,228 ns/op | 0.1% | 3 | 250 | 250 |
| 100x730 first month write across first 50 rows | 4,289,741 ns/op | 4,308,917 ns/op | 0.7% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows in root batch | 3,772,217 ns/op | 3,770,367 ns/op | 0.1% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners | 4,474,749 ns/op | 4,476,877 ns/op | 0.2% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 4,325,106 ns/op | 4,321,184 ns/op | 0.6% | 3 | 100 | 100 |

## Comparison Suite

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse root read | 23 ns/op | 23 ns/op | 3.3% | 3 | 525000 | 25000 |
| Legend-State root read | 208 ns/op | 211 ns/op | 3.2% | 3 | 75000 | 25000 |
| MobX root read | 36 ns/op | 36 ns/op | 0.3% | 3 | 500000 | 25000 |
| valtio root read | 11 ns/op | 11 ns/op | 0.8% | 3 | 1200000 | 25000 |
| pulse deep leaf read | 2,555 ns/op | 2,557 ns/op | 1.0% | 3 | 10000 | 10000 |
| Legend-State deep leaf read | 151,427 ns/op | 152,225 ns/op | 0.8% | 3 | 10000 | 10000 |
| MobX deep leaf read | 3,131 ns/op | 3,131 ns/op | 0.2% | 3 | 10000 | 10000 |
| valtio deep leaf read | 968 ns/op | 969 ns/op | 0.6% | 3 | 20000 | 10000 |
| pulse table cell read | 398 ns/op | 396 ns/op | 1.1% | 3 | 50000 | 25000 |
| Legend-State table cell read | 2,279 ns/op | 2,279 ns/op | 0.4% | 3 | 25000 | 25000 |
| MobX table cell read | 323 ns/op | 325 ns/op | 1.6% | 3 | 50000 | 25000 |
| valtio table cell read | 131 ns/op | 130 ns/op | 0.8% | 3 | 100000 | 25000 |

### Primitive Root Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 134 ns/op | 1,863 ns/op | 131.4% | 3 | 60000 | 10000 |
| Legend-State | 647 ns/op | 653 ns/op | 1.2% | 3 | 20000 | 10000 |
| MobX | 148 ns/op | 150 ns/op | 2.8% | 3 | 100000 | 10000 |
| valtio | 1,078 ns/op | 1,223 ns/op | 20.9% | 3 | 10000 | 10000 |

### Deep Nested Leaf Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 6,927 ns/op | 8,175 ns/op | 24.0% | 3 | 1000 | 1000 |
| Legend-State | 148,526 ns/op | 148,559 ns/op | 0.3% | 3 | 1000 | 1000 |
| MobX | 80,198 ns/op | 80,270 ns/op | 0.5% | 3 | 1000 | 1000 |
| valtio | 66,965 ns/op | 108,215 ns/op | 61.8% | 3 | 1000 | 1000 |

### Array Item Field Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 681 ns/op | 686 ns/op | 4.7% | 3 | 15000 | 5000 |
| Legend-State | 3,572 ns/op | 3,559 ns/op | 0.7% | 3 | 5000 | 5000 |
| MobX | 6,058 ns/op | 6,057 ns/op | 1.1% | 3 | 5000 | 5000 |
| valtio | 6,346 ns/op | 6,281 ns/op | 2.2% | 3 | 5000 | 5000 |

### Whole Array Multi-Row Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 8,191 ns/op | 10,860 ns/op | 37.1% | 3 | 1000 | 1000 |
| Legend-State | 23,169 ns/op | 23,446 ns/op | 2.1% | 3 | 1000 | 1000 |
| MobX | 507,650 ns/op | 507,230 ns/op | 0.2% | 3 | 1000 | 1000 |
| valtio | 912,604 ns/op | 886,020 ns/op | 5.2% | 3 | 1000 | 1000 |

### Store Creation Cost

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 3,728 ns/op | 3,763 ns/op | 1.4% | 3 | 1000 | 1000 |
| Legend-State | 3,928 ns/op | 3,968 ns/op | 5.2% | 3 | 4000 | 1000 |
| MobX | 234,338 ns/op | 234,546 ns/op | 0.2% | 3 | 1000 | 1000 |
| valtio | 389,744 ns/op | 391,189 ns/op | 1.3% | 3 | 1000 | 1000 |

### Wide Array Item Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 359,444 ns/op | 360,831 ns/op | 0.7% | 3 | 1000 | 1000 |
| Legend-State | 367,914 ns/op | 383,606 ns/op | 6.0% | 3 | 1000 | 1000 |
| MobX | 25,612,424 ns/op | 25,608,865 ns/op | 0.0% | 3 | 1000 | 1000 |
| valtio | 38,301,473 ns/op | 38,225,889 ns/op | 0.4% | 3 | 1000 | 1000 |

### General App Cold Update

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf | 57,726 ns/op | 57,626 ns/op | 0.3% | 3 | 3000 | 3000 |
| Legend-State nested object leaf | 63,174 ns/op | 63,431 ns/op | 0.7% | 3 | 3000 | 3000 |
| MobX nested object leaf | 2,281,074 ns/op | 2,284,722 ns/op | 0.3% | 3 | 3000 | 3000 |
| valtio nested object leaf | 3,355,429 ns/op | 3,356,910 ns/op | 0.2% | 3 | 3000 | 3000 |

### General App Hot Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf write | 476 ns/op | 512 ns/op | 12.6% | 3 | 25000 | 5000 |
| Legend-State nested object leaf write | 4,270 ns/op | 4,306 ns/op | 2.6% | 3 | 5000 | 5000 |
| MobX nested object leaf write | 375 ns/op | 378 ns/op | 2.4% | 3 | 35000 | 5000 |
| valtio nested object leaf write | 250 ns/op | 252 ns/op | 1.2% | 3 | 90000 | 5000 |
| pulse mixed array object leaf write | 709 ns/op | 712 ns/op | 4.4% | 3 | 18000 | 3000 |
| Legend-State mixed array object leaf write | 5,326 ns/op | 5,347 ns/op | 0.7% | 3 | 3000 | 3000 |
| MobX mixed array object leaf write | 519 ns/op | 521 ns/op | 1.1% | 3 | 42000 | 3000 |
| valtio mixed array object leaf write | 339 ns/op | 337 ns/op | 0.8% | 3 | 36000 | 3000 |
| pulse batched sibling object writes | 1,388 ns/op | 1,443 ns/op | 7.7% | 3 | 12000 | 3000 |
| Legend-State batched sibling object writes | 9,465 ns/op | 9,471 ns/op | 0.9% | 3 | 3000 | 3000 |
| MobX batched sibling object writes | 784 ns/op | 784 ns/op | 1.2% | 3 | 15000 | 3000 |
| valtio batched sibling object writes | 713 ns/op | 722 ns/op | 1.9% | 3 | 18000 | 3000 |
| pulse batched list item multi-field writes | 2,487 ns/op | 2,478 ns/op | 1.3% | 3 | 9000 | 1500 |
| Legend-State batched list item multi-field writes | 16,000 ns/op | 15,969 ns/op | 0.9% | 3 | 1500 | 1500 |
| MobX batched list item multi-field writes | 1,414 ns/op | 1,413 ns/op | 0.3% | 3 | 9000 | 1500 |
| valtio batched list item multi-field writes | 1,003 ns/op | 1,002 ns/op | 0.6% | 3 | 12000 | 1500 |

### Root Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 41 ns/op | 42 ns/op | 4.3% | 3 | 320000 | 5000 |
| Legend-State | 300 ns/op | 304 ns/op | 1.9% | 3 | 60000 | 5000 |
| MobX | 449 ns/op | 455 ns/op | 1.8% | 3 | 30000 | 5000 |
| valtio | 72 ns/op | 73 ns/op | 2.7% | 3 | 300000 | 5000 |

### Root Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 230 ns/op | 230 ns/op | 2.3% | 3 | 60000 | 5000 |
| Legend-State | 1,647 ns/op | 1,657 ns/op | 2.7% | 3 | 10000 | 5000 |
| MobX | 406 ns/op | 406 ns/op | 1.8% | 3 | 50000 | 5000 |
| valtio | 225 ns/op | 226 ns/op | 2.2% | 3 | 55000 | 5000 |

### Leaf Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 244 ns/op | 246 ns/op | 1.7% | 3 | 80000 | 5000 |
| Legend-State | 1,158 ns/op | 1,159 ns/op | 0.3% | 3 | 10000 | 5000 |
| MobX | 350 ns/op | 352 ns/op | 1.4% | 3 | 60000 | 5000 |
| valtio | 123 ns/op | 123 ns/op | 0.6% | 3 | 160000 | 5000 |

### Leaf Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 871 ns/op | 851 ns/op | 4.2% | 3 | 20000 | 5000 |
| Legend-State | 2,675 ns/op | 2,677 ns/op | 0.2% | 3 | 5000 | 5000 |
| MobX | 330 ns/op | 335 ns/op | 2.0% | 3 | 35000 | 5000 |
| valtio | 300 ns/op | 302 ns/op | 1.2% | 3 | 40000 | 5000 |

### Editable Table Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 50 row listeners subscribe and unsubscribe | 12,425 ns/op | 12,786 ns/op | 4.2% | 3 | 1000 | 500 |
| Legend-State 50 row listeners subscribe and unsubscribe | 56,187 ns/op | 56,565 ns/op | 1.4% | 3 | 500 | 500 |
| MobX 50 row listeners subscribe and unsubscribe | 14,636,784 ns/op | 14,550,676 ns/op | 2.3% | 3 | 250 | 250 |
| valtio 50 row listeners subscribe and unsubscribe | 10,409,032 ns/op | 10,645,366 ns/op | 12.7% | 3 | 500 | 500 |
| pulse visible window listeners subscribe and unsubscribe | 317,282 ns/op | 320,332 ns/op | 1.4% | 3 | 100 | 100 |
| Legend-State visible window listeners subscribe and unsubscribe | 1,635,981 ns/op | 1,636,037 ns/op | 0.2% | 3 | 100 | 100 |
| MobX visible window listeners subscribe and unsubscribe | 331,076 ns/op | 369,529 ns/op | 14.9% | 3 | 50 | 50 |
| valtio visible window listeners subscribe and unsubscribe | 137,777 ns/op | 147,839 ns/op | 10.8% | 3 | 100 | 100 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 100x730 single cell write | 1,245 ns/op | 1,231 ns/op | 5.5% | 3 | 12000 | 2000 |
| Legend-State 100x730 single cell write | 5,658 ns/op | 5,588 ns/op | 2.1% | 3 | 4000 | 2000 |
| MobX 100x730 single cell write | 520 ns/op | 519 ns/op | 0.5% | 3 | 22000 | 2000 |
| valtio 100x730 single cell write | 330 ns/op | 331 ns/op | 0.2% | 3 | 64000 | 2000 |
| pulse 100x730 single cell write with cell listener | 1,953 ns/op | 1,994 ns/op | 3.7% | 3 | 6000 | 2000 |
| Legend-State 100x730 single cell write with cell listener | 5,960 ns/op | 5,960 ns/op | 0.7% | 3 | 2000 | 2000 |
| MobX 100x730 single cell write with cell listener | 547 ns/op | 582 ns/op | 8.8% | 3 | 40000 | 2000 |
| valtio 100x730 single cell write with cell listener | 354 ns/op | 355 ns/op | 1.9% | 3 | 56000 | 2000 |
| pulse 100x730 single cell write with row listener | 1,197 ns/op | 1,227 ns/op | 4.3% | 3 | 12000 | 2000 |
| Legend-State 100x730 single cell write with row listener | 5,794 ns/op | 5,797 ns/op | 0.8% | 3 | 2000 | 2000 |
| MobX 100x730 single cell write with row listener | 160,541 ns/op | 163,521 ns/op | 2.9% | 3 | 500 | 500 |
| valtio 100x730 single cell write with row listener | 380 ns/op | 383 ns/op | 2.0% | 3 | 32000 | 1000 |
| pulse 100x730 single cell write with root listener | 1,191 ns/op | 1,219 ns/op | 3.9% | 3 | 9000 | 1000 |
| Legend-State 100x730 single cell write with root listener | 5,674 ns/op | 5,766 ns/op | 2.9% | 3 | 3000 | 1000 |
| MobX 100x730 single cell write with root listener | 19,875,764 ns/op | 19,932,394 ns/op | 0.7% | 3 | 50 | 50 |
| valtio 100x730 single cell write with root listener | 434 ns/op | 442 ns/op | 2.7% | 3 | 6400 | 100 |
| pulse 100x730 visible window listeners and cell write | 1,217 ns/op | 1,217 ns/op | 1.7% | 3 | 16000 | 500 |
| Legend-State 100x730 visible window listeners and cell write | 5,634 ns/op | 5,807 ns/op | 5.0% | 3 | 2500 | 500 |
| MobX 100x730 visible window listeners and cell write | 513 ns/op | 514 ns/op | 1.7% | 3 | 12800 | 200 |
| valtio 100x730 visible window listeners and cell write | 331 ns/op | 333 ns/op | 1.2% | 3 | 16000 | 250 |
| pulse 100x730 first month write across first 50 rows | 1,490,030 ns/op | 1,499,314 ns/op | 1.1% | 3 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows | 8,138,433 ns/op | 8,152,624 ns/op | 0.7% | 3 | 50 | 50 |
| MobX 100x730 first month write across first 50 rows | 658,673 ns/op | 661,134 ns/op | 0.6% | 3 | 50 | 50 |
| valtio 100x730 first month write across first 50 rows | 498,050 ns/op | 551,415 ns/op | 13.9% | 3 | 50 | 50 |
| pulse 100x730 first month write across first 50 rows with row listeners | 1,742,048 ns/op | 1,741,003 ns/op | 0.5% | 3 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows with row listeners | 8,297,193 ns/op | 8,303,010 ns/op | 0.2% | 3 | 50 | 50 |
| MobX 100x730 first month write across first 50 rows with row listeners | 9,520,607 ns/op | 9,492,826 ns/op | 0.7% | 3 | 25 | 25 |
| valtio 100x730 first month write across first 50 rows with row listeners | 618,055 ns/op | 614,681 ns/op | 1.0% | 3 | 25 | 25 |

## Comparison Summary

Category winners use the lowest median within that category. For multi-scenario categories like Editable Table Costs, the category score is the geometric mean of that library's per-scenario medians.
Store Creation Cost measures wrapping a 100-element user array. Wide Array Item Replace writes the last item in a 10k array to stress immutable container costs at scale.
Hot Read Costs keeps store setup outside the timed loop and measures repeated root, deep-leaf, and table-cell reads on reused state.
General App Cold Update keeps store creation inside the timed task. General App Hot Writes uses one setup per benchmark and measures steady-state updates on the same wrapped store.
Subscription Lifecycle categories measure attach-detach cost without writes. Subscription Dispatch categories keep listener setup outside the timed loop and measure steady-state writes with an already-subscribed listener.
Editable Table Subscription Lifecycle measures UI mount-unmount style listener attachment for 50 row listeners and a 20x30 visible window of cell listeners.
Each case is sampled multiple times. Iteration counts are adaptively calibrated to reach a meaningful sample duration, then tables show median, mean, relative standard deviation, sample count, calibrated ops per sample, and base configured ops.
Pulse uses batching only in scenarios where coordinated multi-write updates are the intended mutation model.
Equal-Category Overall gives each top-level category the same weight.
Scenario-Weighted Overall gives each benchmark row the same weight, so categories with more scenarios contribute more.
Category Wins is shown separately as a breadth signal.

### Category Winners

| Category | pulse | Legend-State | MobX | valtio | Winner |
| --- | ---: | ---: | ---: | ---: | --- |
| Hot Read Costs | 286 ns/op | 4,159 ns/op | 330 ns/op | 113 ns/op | valtio |
| Primitive Root Write | 134 ns/op | 647 ns/op | 148 ns/op | 1,078 ns/op | pulse |
| Deep Nested Leaf Write | 6,927 ns/op | 148,526 ns/op | 80,198 ns/op | 66,965 ns/op | pulse |
| Array Item Field Write | 681 ns/op | 3,572 ns/op | 6,058 ns/op | 6,346 ns/op | pulse |
| Whole Array Multi-Row Replace | 8,191 ns/op | 23,169 ns/op | 507,650 ns/op | 912,604 ns/op | pulse |
| Store Creation Cost | 3,728 ns/op | 3,928 ns/op | 234,338 ns/op | 389,744 ns/op | pulse |
| Wide Array Item Replace | 359,444 ns/op | 367,914 ns/op | 25,612,424 ns/op | 38,301,473 ns/op | pulse |
| General App Cold Update | 57,726 ns/op | 63,174 ns/op | 2,281,074 ns/op | 3,355,429 ns/op | pulse |
| General App Hot Writes | 1,039 ns/op | 7,661 ns/op | 681 ns/op | 496 ns/op | valtio |
| Root Subscription Lifecycle | 41 ns/op | 300 ns/op | 449 ns/op | 72 ns/op | pulse |
| Root Subscription Dispatch | 230 ns/op | 1,647 ns/op | 406 ns/op | 225 ns/op | valtio |
| Leaf Subscription Lifecycle | 244 ns/op | 1,158 ns/op | 350 ns/op | 123 ns/op | valtio |
| Leaf Subscription Dispatch | 871 ns/op | 2,675 ns/op | 330 ns/op | 300 ns/op | valtio |
| Editable Table Subscription Lifecycle | 62,786 ns/op | 303,184 ns/op | 2,201,337 ns/op | 1,197,548 ns/op | pulse |
| Editable Table Costs | 10,130 ns/op | 45,785 ns/op | 60,348 ns/op | 2,953 ns/op | valtio |

### Category Breadth

| Library | Category Wins |
| --- | ---: |
| pulse | 9 |
| valtio | 6 |
| Legend-State | 0 |
| MobX | 0 |

Most category wins: pulse

### Equal-Category Overall

| Library | Category Wins | Equal-Category Score |
| --- | ---: | ---: |
| pulse | 9 | 2,213 ns/op |
| Legend-State | 0 | 9,538 ns/op |
| valtio | 6 | 10,627 ns/op |
| MobX | 0 | 14,675 ns/op |

Equal-category overall winner: pulse

### Scenario-Weighted Overall

| Library | Category Wins | Scenario-Weighted Score |
| --- | ---: | ---: |
| pulse | 9 | 2,775 ns/op |
| valtio | 6 | 4,840 ns/op |
| MobX | 0 | 12,986 ns/op |
| Legend-State | 0 | 14,100 ns/op |

Scenario-weighted overall winner: pulse

