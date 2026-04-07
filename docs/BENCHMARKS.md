# Benchmarks

Generated: 2026-04-07T15:58:38.182Z

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
| root get | 72 ns/op | 73 ns/op | 4.8% | 3 | 150000 | 25000 |
| deep leaf get | 31,751 ns/op | 31,798 ns/op | 0.4% | 3 | 10000 | 10000 |

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root get on reused state | 48 ns/op | 48 ns/op | 0.3% | 3 | 500000 | 50000 |
| deep leaf get on reused state | 10,345 ns/op | 10,378 ns/op | 0.5% | 3 | 25000 | 25000 |
| editable table cell get on reused state | 502 ns/op | 504 ns/op | 0.7% | 3 | 25000 | 25000 |

### Activation Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wide graph deep leaf get on fresh state | 430,711 ns/op | 431,186 ns/op | 0.5% | 3 | 500 | 500 |
| wide graph deep leaf subscribe on fresh state | 429,466 ns/op | 430,275 ns/op | 0.3% | 3 | 500 | 500 |

### Focused Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| primitive root write | 88 ns/op | 88 ns/op | 0.4% | 3 | 240000 | 10000 |
| deep leaf write | 45,908 ns/op | 45,851 ns/op | 0.5% | 3 | 2000 | 2000 |
| wide array item replace | 358,059 ns/op | 368,704 ns/op | 4.2% | 3 | 1000 | 1000 |
| array leaf field write | 1,004 ns/op | 1,002 ns/op | 0.9% | 3 | 15000 | 5000 |
| array item multi-key replace | 645 ns/op | 641 ns/op | 1.2% | 3 | 20000 | 5000 |

### Array Reindexing Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| head insert with visible window consumer | 1,327,512 ns/op | 1,331,133 ns/op | 0.5% | 3 | 1000 | 1000 |
| head remove with visible window consumer | 52,452 ns/op | 52,280 ns/op | 0.7% | 3 | 1000 | 1000 |

### Large Table Structural Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| create 1,000 rows | 44,932 ns/op | 45,068 ns/op | 0.6% | 3 | 500 | 500 |
| create 10,000 rows | 453,567 ns/op | 454,099 ns/op | 0.4% | 3 | 100 | 100 |
| replace all 1,000 rows | 46,642 ns/op | 46,662 ns/op | 0.7% | 3 | 500 | 500 |
| partial update every 10th row in 1,000 rows | 106,919 ns/op | 106,667 ns/op | 0.8% | 3 | 500 | 500 |
| select focused row in 1,000 rows | 2,049 ns/op | 2,030 ns/op | 2.6% | 3 | 6000 | 1000 |
| swap two rows in 1,000 rows | 567 ns/op | 565 ns/op | 1.8% | 3 | 24000 | 500 |
| remove one row from 1,000 rows | 3,155 ns/op | 2,868 ns/op | 25.4% | 3 | 6000 | 500 |
| append 1,000 rows to 10,000 rows | 380,573 ns/op | 380,613 ns/op | 1.2% | 3 | 100 | 100 |
| clear 1,000 rows | 225 ns/op | 233 ns/op | 6.0% | 3 | 64000 | 1000 |

### Derived Consumer Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| relevant source write with two-source consumer | 1,508 ns/op | 1,507 ns/op | 0.9% | 3 | 10000 | 5000 |
| unrelated source write with two-source consumer | 507 ns/op | 516 ns/op | 4.4% | 3 | 25000 | 5000 |
| batched dual-source write with two-source consumer | 3,089 ns/op | 3,075 ns/op | 1.6% | 3 | 6000 | 3000 |

### Batch Collapse Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| same leaf written twice in root batch | 2,129 ns/op | 2,133 ns/op | 0.5% | 3 | 10000 | 5000 |
| sibling leaf writes in root batch | 3,028 ns/op | 3,019 ns/op | 0.7% | 3 | 6000 | 3000 |

### Listener Selectivity Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| write one subscribed leaf among 100 listeners | 1,121 ns/op | 1,115 ns/op | 1.2% | 3 | 12000 | 2000 |
| write unsubscribed leaf with 100 unrelated listeners | 578 ns/op | 578 ns/op | 2.5% | 3 | 22000 | 2000 |

### Path Depth Scaling

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| depth 5 leaf write | 1,562 ns/op | 1,569 ns/op | 0.8% | 3 | 10000 | 5000 |
| depth 25 leaf write | 6,232 ns/op | 6,192 ns/op | 1.0% | 3 | 3000 | 3000 |
| depth 100 leaf write | 23,375 ns/op | 23,446 ns/op | 0.5% | 3 | 1500 | 1500 |
| depth 200 leaf write | 46,172 ns/op | 46,194 ns/op | 0.1% | 3 | 1000 | 1000 |

### Structural Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sparse array growth | 388 ns/op | 390 ns/op | 0.6% | 3 | 52000 | 2000 |
| array truncate via length | 36,189 ns/op | 36,168 ns/op | 0.1% | 3 | 2000 | 2000 |
| deep object branch replace | 6,634 ns/op | 6,621 ns/op | 1.2% | 3 | 2000 | 2000 |
| whole array multi-row replace | 36,108 ns/op | 36,111 ns/op | 0.5% | 3 | 1000 | 1000 |
| whole array multi-row replace in root batch | 49,318 ns/op | 45,944 ns/op | 10.4% | 3 | 1000 | 1000 |

### General App Write Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nested object leaf write | 4,207 ns/op | 4,195 ns/op | 0.7% | 3 | 5000 | 5000 |
| mixed array object leaf write | 56,703 ns/op | 56,736 ns/op | 0.1% | 3 | 3000 | 3000 |
| batched sibling object writes | 5,381 ns/op | 5,358 ns/op | 0.9% | 3 | 3000 | 3000 |
| batched list item multi-field writes | 58,972 ns/op | 58,970 ns/op | 0.2% | 3 | 1500 | 1500 |

### Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener subscribe and unsubscribe | 105 ns/op | 105 ns/op | 0.3% | 3 | 120000 | 5000 |
| leaf listener subscribe and unsubscribe | 747 ns/op | 748 ns/op | 0.5% | 3 | 20000 | 5000 |
| item listener subscribe and unsubscribe | 577 ns/op | 578 ns/op | 0.9% | 3 | 20000 | 5000 |
| market row listener subscribe and unsubscribe | 3,441 ns/op | 3,416 ns/op | 1.1% | 3 | 5000 | 5000 |
| ten leaf listeners subscribe and unsubscribe | 4,104 ns/op | 4,132 ns/op | 1.2% | 3 | 4000 | 2000 |
| hundred leaf listeners subscribe and unsubscribe | 32,901 ns/op | 32,792 ns/op | 0.6% | 3 | 1000 | 1000 |
| thousand leaf listeners subscribe and unsubscribe | 312,523 ns/op | 312,492 ns/op | 0.4% | 3 | 250 | 250 |

### Editable Table Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 row listeners subscribe and unsubscribe | 2,191,645 ns/op | 2,194,747 ns/op | 0.2% | 3 | 500 | 500 |
| visible window listeners subscribe and unsubscribe | 2,679,482 ns/op | 2,682,881 ns/op | 0.2% | 3 | 100 | 100 |

### Subscription Dispatch Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener write | 279 ns/op | 282 ns/op | 3.3% | 3 | 70000 | 5000 |
| leaf listener write | 868 ns/op | 886 ns/op | 3.2% | 3 | 15000 | 5000 |
| item listener write | 1,558 ns/op | 1,549 ns/op | 0.9% | 3 | 10000 | 5000 |
| market row listener replace | 3,500 ns/op | 3,456 ns/op | 3.8% | 3 | 5000 | 5000 |
| market row listener replace in root batch | 2,898 ns/op | 2,885 ns/op | 1.6% | 3 | 5000 | 5000 |
| ten leaf listeners on same node | 904 ns/op | 897 ns/op | 1.8% | 3 | 20000 | 2000 |
| hundred leaf listeners on same node | 1,514 ns/op | 1,521 ns/op | 1.4% | 3 | 10000 | 1000 |
| thousand leaf listeners on same node | 8,654 ns/op | 8,645 ns/op | 0.2% | 3 | 1500 | 250 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100x730 single cell write | 2,176,459 ns/op | 2,175,732 ns/op | 0.1% | 3 | 1000 | 1000 |
| 100x730 single cell write with cell listener | 2,179,586 ns/op | 2,179,495 ns/op | 0.0% | 3 | 1000 | 1000 |
| 100x730 single cell write with row listener | 2,174,106 ns/op | 2,175,171 ns/op | 0.1% | 3 | 1000 | 1000 |
| 100x730 visible window listeners and cell write | 2,700,623 ns/op | 2,700,536 ns/op | 0.4% | 3 | 250 | 250 |
| 100x730 first month write across first 50 rows | 4,337,675 ns/op | 4,339,177 ns/op | 0.1% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows in root batch | 3,861,748 ns/op | 3,869,356 ns/op | 0.4% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners | 4,597,500 ns/op | 4,717,987 ns/op | 3.9% | 3 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 4,552,281 ns/op | 4,564,200 ns/op | 0.5% | 3 | 100 | 100 |

## Comparison Suite

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse root read | 22 ns/op | 23 ns/op | 2.3% | 3 | 600000 | 25000 |
| Legend-State root read | 189 ns/op | 192 ns/op | 3.7% | 3 | 75000 | 25000 |
| MobX root read | 35 ns/op | 35 ns/op | 0.2% | 3 | 675000 | 25000 |
| valtio root read | 11 ns/op | 11 ns/op | 0.5% | 3 | 1200000 | 25000 |
| pulse deep leaf read | 2,535 ns/op | 2,536 ns/op | 0.4% | 3 | 10000 | 10000 |
| Legend-State deep leaf read | 148,646 ns/op | 150,523 ns/op | 2.1% | 3 | 10000 | 10000 |
| MobX deep leaf read | 3,061 ns/op | 3,065 ns/op | 0.9% | 3 | 10000 | 10000 |
| valtio deep leaf read | 918 ns/op | 921 ns/op | 0.6% | 3 | 20000 | 10000 |
| pulse table cell read | 367 ns/op | 367 ns/op | 0.8% | 3 | 50000 | 25000 |
| Legend-State table cell read | 2,238 ns/op | 2,241 ns/op | 0.3% | 3 | 25000 | 25000 |
| MobX table cell read | 316 ns/op | 316 ns/op | 0.4% | 3 | 50000 | 25000 |
| valtio table cell read | 125 ns/op | 125 ns/op | 1.5% | 3 | 100000 | 25000 |

### Activation Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse wide graph deep leaf get on fresh state | 485,926 ns/op | 483,299 ns/op | 1.3% | 3 | 500 | 500 |
| Legend-State wide graph deep leaf get on fresh state | 485,913 ns/op | 486,180 ns/op | 0.2% | 3 | 500 | 500 |
| MobX wide graph deep leaf get on fresh state | 30,697,142 ns/op | 30,569,639 ns/op | 0.6% | 3 | 500 | 500 |
| valtio wide graph deep leaf get on fresh state | 39,240,460 ns/op | 39,143,918 ns/op | 0.5% | 3 | 500 | 500 |
| pulse wide graph deep leaf subscribe on fresh state | 782,190 ns/op | 769,866 ns/op | 2.8% | 3 | 500 | 500 |
| Legend-State wide graph deep leaf subscribe on fresh state | 492,904 ns/op | 491,943 ns/op | 0.3% | 3 | 500 | 500 |
| MobX wide graph deep leaf subscribe on fresh state | 31,563,619 ns/op | 31,597,629 ns/op | 1.0% | 3 | 500 | 500 |
| valtio wide graph deep leaf subscribe on fresh state | 39,246,820 ns/op | 39,241,644 ns/op | 0.0% | 3 | 500 | 500 |

### Primitive Root Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 64 ns/op | 84 ns/op | 36.0% | 3 | 70000 | 10000 |
| Legend-State | 642 ns/op | 644 ns/op | 1.3% | 3 | 20000 | 10000 |
| MobX | 152 ns/op | 152 ns/op | 0.3% | 3 | 100000 | 10000 |
| valtio | 1,362 ns/op | 1,220 ns/op | 18.2% | 3 | 20000 | 10000 |

### Deep Nested Leaf Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 6,751 ns/op | 6,962 ns/op | 4.4% | 3 | 2000 | 1000 |
| Legend-State | 148,238 ns/op | 158,513 ns/op | 9.2% | 3 | 1000 | 1000 |
| MobX | 80,204 ns/op | 80,157 ns/op | 0.2% | 3 | 1000 | 1000 |
| valtio | 165,552 ns/op | 147,183 ns/op | 40.1% | 3 | 1000 | 1000 |

### Array Item Field Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 638 ns/op | 643 ns/op | 1.0% | 3 | 30000 | 5000 |
| Legend-State | 3,540 ns/op | 3,511 ns/op | 2.5% | 3 | 5000 | 5000 |
| MobX | 6,003 ns/op | 5,953 ns/op | 2.8% | 3 | 5000 | 5000 |
| valtio | 7,290 ns/op | 7,051 ns/op | 15.6% | 3 | 5000 | 5000 |

### Whole Array Multi-Row Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 7,944 ns/op | 8,335 ns/op | 6.8% | 3 | 2000 | 1000 |
| Legend-State | 22,588 ns/op | 22,645 ns/op | 0.5% | 3 | 1000 | 1000 |
| MobX | 514,612 ns/op | 513,026 ns/op | 0.5% | 3 | 1000 | 1000 |
| valtio | 873,564 ns/op | 853,136 ns/op | 4.1% | 3 | 1000 | 1000 |

### Array Reindexing Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse head insert with visible window consumer | 1,204,150 ns/op | 1,205,770 ns/op | 0.3% | 3 | 1000 | 1000 |
| Legend-State head insert with visible window consumer | 1,027,323 ns/op | 1,038,573 ns/op | 4.2% | 3 | 1000 | 1000 |
| MobX head insert with visible window consumer | 106,886 ns/op | 107,219 ns/op | 0.4% | 3 | 1000 | 1000 |
| valtio head insert with visible window consumer | 569,248 ns/op | 570,484 ns/op | 0.3% | 3 | 1000 | 1000 |
| pulse head remove with visible window consumer | 47,702 ns/op | 48,317 ns/op | 2.1% | 3 | 1000 | 1000 |
| Legend-State head remove with visible window consumer | 35,456 ns/op | 35,404 ns/op | 2.5% | 3 | 1000 | 1000 |
| MobX head remove with visible window consumer | 1,005 ns/op | 1,003 ns/op | 0.7% | 3 | 24000 | 1000 |
| valtio head remove with visible window consumer | 24,070 ns/op | 24,288 ns/op | 2.0% | 3 | 1000 | 1000 |

### Large Table Structural Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse create 1,000 rows | 44,892 ns/op | 44,848 ns/op | 0.2% | 3 | 500 | 500 |
| Legend-State create 1,000 rows | 44,651 ns/op | 44,650 ns/op | 0.0% | 3 | 500 | 500 |
| MobX create 1,000 rows | 4,936,257 ns/op | 4,934,454 ns/op | 0.1% | 3 | 500 | 500 |
| valtio create 1,000 rows | 5,578,324 ns/op | 5,574,818 ns/op | 0.3% | 3 | 500 | 500 |
| pulse create 10,000 rows | 441,755 ns/op | 441,753 ns/op | 0.3% | 3 | 100 | 100 |
| Legend-State create 10,000 rows | 445,054 ns/op | 445,177 ns/op | 0.1% | 3 | 100 | 100 |
| MobX create 10,000 rows | 62,107,523 ns/op | 61,901,118 ns/op | 0.8% | 3 | 100 | 100 |
| valtio create 10,000 rows | 57,335,908 ns/op | 57,500,045 ns/op | 0.7% | 3 | 100 | 100 |
| pulse replace all 1,000 rows | 46,238 ns/op | 46,554 ns/op | 1.3% | 3 | 500 | 500 |
| Legend-State replace all 1,000 rows | 3,253,979 ns/op | 3,244,953 ns/op | 0.8% | 3 | 500 | 500 |
| MobX replace all 1,000 rows | 5,058,091 ns/op | 5,061,767 ns/op | 0.1% | 3 | 500 | 500 |
| valtio replace all 1,000 rows | 5,129,475 ns/op | 5,169,300 ns/op | 1.1% | 3 | 500 | 500 |
| pulse partial update every 10th row in 1,000 rows | 101,891 ns/op | 143,962 ns/op | 41.4% | 3 | 500 | 500 |
| Legend-State partial update every 10th row in 1,000 rows | 456,347 ns/op | 457,623 ns/op | 0.5% | 3 | 500 | 500 |
| MobX partial update every 10th row in 1,000 rows | 42,792 ns/op | 43,003 ns/op | 0.7% | 3 | 500 | 500 |
| valtio partial update every 10th row in 1,000 rows | 31,354 ns/op | 31,790 ns/op | 2.7% | 3 | 500 | 500 |
| pulse select focused row in 1,000 rows | 2,019 ns/op | 2,099 ns/op | 5.4% | 3 | 5000 | 1000 |
| Legend-State select focused row in 1,000 rows | 7,721 ns/op | 7,618 ns/op | 3.3% | 3 | 2000 | 1000 |
| MobX select focused row in 1,000 rows | 675 ns/op | 679 ns/op | 0.9% | 3 | 24000 | 1000 |
| valtio select focused row in 1,000 rows | 545 ns/op | 544 ns/op | 0.2% | 3 | 32000 | 1000 |
| pulse swap two rows in 1,000 rows | 526 ns/op | 531 ns/op | 1.5% | 3 | 24000 | 500 |
| Legend-State swap two rows in 1,000 rows | 969,257 ns/op | 959,903 ns/op | 2.1% | 3 | 500 | 500 |
| MobX swap two rows in 1,000 rows | 58,998 ns/op | 58,512 ns/op | 2.3% | 3 | 500 | 500 |
| valtio swap two rows in 1,000 rows | 594,214 ns/op | 604,350 ns/op | 3.1% | 3 | 500 | 500 |
| pulse remove one row from 1,000 rows | 3,036 ns/op | 2,725 ns/op | 29.9% | 3 | 6000 | 500 |
| Legend-State remove one row from 1,000 rows | 1,114,602 ns/op | 1,123,263 ns/op | 1.5% | 3 | 500 | 500 |
| MobX remove one row from 1,000 rows | 49,001 ns/op | 48,909 ns/op | 0.6% | 3 | 500 | 500 |
| valtio remove one row from 1,000 rows | 440,069 ns/op | 444,541 ns/op | 1.8% | 3 | 500 | 500 |
| pulse append 1,000 rows to 10,000 rows | 280,477 ns/op | 279,303 ns/op | 1.0% | 3 | 100 | 100 |
| Legend-State append 1,000 rows to 10,000 rows | 100,473,493 ns/op | 100,272,372 ns/op | 0.6% | 3 | 100 | 100 |
| MobX append 1,000 rows to 10,000 rows | 17,355,444 ns/op | 17,355,806 ns/op | 0.1% | 3 | 100 | 100 |
| valtio append 1,000 rows to 10,000 rows | 66,535,640 ns/op | 66,551,491 ns/op | 1.1% | 3 | 100 | 100 |
| pulse clear 1,000 rows | 221 ns/op | 229 ns/op | 5.6% | 3 | 64000 | 1000 |
| Legend-State clear 1,000 rows | 2,400 ns/op | 2,386 ns/op | 1.0% | 3 | 5000 | 1000 |
| MobX clear 1,000 rows | 327 ns/op | 327 ns/op | 0.3% | 3 | 48000 | 1000 |
| valtio clear 1,000 rows | 1,732 ns/op | 1,750 ns/op | 3.8% | 3 | 18000 | 1000 |

### Derived Consumer Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse relevant source write | 1,463 ns/op | 1,469 ns/op | 2.3% | 3 | 10000 | 5000 |
| Legend-State relevant source write | 4,779 ns/op | 4,819 ns/op | 1.5% | 3 | 5000 | 5000 |
| MobX relevant source write | 839 ns/op | 840 ns/op | 1.1% | 3 | 20000 | 5000 |
| valtio relevant source write | 440 ns/op | 445 ns/op | 1.6% | 3 | 30000 | 5000 |
| pulse unrelated source write | 445 ns/op | 449 ns/op | 1.7% | 3 | 30000 | 5000 |
| Legend-State unrelated source write | 2,493 ns/op | 2,499 ns/op | 1.0% | 3 | 5000 | 5000 |
| MobX unrelated source write | 287 ns/op | 289 ns/op | 1.2% | 3 | 80000 | 5000 |
| valtio unrelated source write | 274 ns/op | 274 ns/op | 0.2% | 3 | 45000 | 5000 |
| pulse batched dual-source write | 3,030 ns/op | 2,988 ns/op | 2.3% | 3 | 6000 | 3000 |
| Legend-State batched dual-source write | 7,243 ns/op | 7,258 ns/op | 0.6% | 3 | 3000 | 3000 |
| MobX batched dual-source write | 1,101 ns/op | 1,100 ns/op | 0.3% | 3 | 12000 | 3000 |
| valtio batched dual-source write | 844 ns/op | 855 ns/op | 1.9% | 3 | 15000 | 3000 |

### Batch Collapse Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse same leaf written twice in coordinated update | 1,929 ns/op | 1,940 ns/op | 0.9% | 3 | 10000 | 5000 |
| Legend-State same leaf written twice in coordinated update | 6,714 ns/op | 6,717 ns/op | 0.5% | 3 | 5000 | 5000 |
| MobX same leaf written twice in coordinated update | 1,077 ns/op | 1,080 ns/op | 0.6% | 3 | 15000 | 5000 |
| valtio same leaf written twice in coordinated update | 833 ns/op | 830 ns/op | 0.5% | 3 | 15000 | 5000 |

### Listener Selectivity Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse write one subscribed leaf among 100 listeners | 1,123 ns/op | 1,116 ns/op | 1.3% | 3 | 16000 | 2000 |
| Legend-State write one subscribed leaf among 100 listeners | 3,733 ns/op | 3,750 ns/op | 1.2% | 3 | 4000 | 2000 |
| MobX write one subscribed leaf among 100 listeners | 673 ns/op | 677 ns/op | 1.6% | 3 | 18000 | 2000 |
| valtio write one subscribed leaf among 100 listeners | 393 ns/op | 395 ns/op | 0.7% | 3 | 60000 | 2000 |
| pulse write unsubscribed leaf with 100 unrelated listeners | 558 ns/op | 561 ns/op | 1.2% | 3 | 44000 | 2000 |
| Legend-State write unsubscribed leaf with 100 unrelated listeners | 2,574 ns/op | 2,575 ns/op | 1.5% | 3 | 6000 | 2000 |
| MobX write unsubscribed leaf with 100 unrelated listeners | 315 ns/op | 317 ns/op | 1.1% | 3 | 64000 | 2000 |
| valtio write unsubscribed leaf with 100 unrelated listeners | 305 ns/op | 307 ns/op | 1.4% | 3 | 64000 | 2000 |

### Store Creation Cost

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 3,825 ns/op | 3,788 ns/op | 1.5% | 3 | 4000 | 1000 |
| Legend-State | 3,728 ns/op | 3,733 ns/op | 0.7% | 3 | 4000 | 1000 |
| MobX | 233,880 ns/op | 233,881 ns/op | 0.0% | 3 | 1000 | 1000 |
| valtio | 327,871 ns/op | 504,059 ns/op | 54.9% | 3 | 1000 | 1000 |

### Wide Array Item Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 353,941 ns/op | 353,972 ns/op | 0.1% | 3 | 1000 | 1000 |
| Legend-State | 353,962 ns/op | 353,907 ns/op | 0.2% | 3 | 1000 | 1000 |
| MobX | 24,621,599 ns/op | 24,637,824 ns/op | 0.2% | 3 | 1000 | 1000 |
| valtio | 37,346,500 ns/op | 37,356,091 ns/op | 0.1% | 3 | 1000 | 1000 |

### General App Cold Update

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf | 55,359 ns/op | 55,304 ns/op | 0.2% | 3 | 3000 | 3000 |
| Legend-State nested object leaf | 59,889 ns/op | 59,942 ns/op | 0.2% | 3 | 3000 | 3000 |
| MobX nested object leaf | 2,233,822 ns/op | 2,235,001 ns/op | 0.3% | 3 | 3000 | 3000 |
| valtio nested object leaf | 3,279,045 ns/op | 3,278,362 ns/op | 0.3% | 3 | 3000 | 3000 |

### General App Hot Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf write | 720 ns/op | 764 ns/op | 12.3% | 3 | 20000 | 5000 |
| Legend-State nested object leaf write | 4,230 ns/op | 4,248 ns/op | 1.0% | 3 | 5000 | 5000 |
| MobX nested object leaf write | 362 ns/op | 362 ns/op | 0.4% | 3 | 60000 | 5000 |
| valtio nested object leaf write | 245 ns/op | 245 ns/op | 0.7% | 3 | 50000 | 5000 |
| pulse mixed array object leaf write | 992 ns/op | 997 ns/op | 1.4% | 3 | 24000 | 3000 |
| Legend-State mixed array object leaf write | 5,383 ns/op | 5,376 ns/op | 0.7% | 3 | 3000 | 3000 |
| MobX mixed array object leaf write | 495 ns/op | 501 ns/op | 1.8% | 3 | 24000 | 3000 |
| valtio mixed array object leaf write | 321 ns/op | 322 ns/op | 0.7% | 3 | 39000 | 3000 |
| pulse batched sibling object writes | 1,788 ns/op | 1,830 ns/op | 3.7% | 3 | 9000 | 3000 |
| Legend-State batched sibling object writes | 9,182 ns/op | 9,183 ns/op | 0.2% | 3 | 3000 | 3000 |
| MobX batched sibling object writes | 748 ns/op | 748 ns/op | 0.2% | 3 | 18000 | 3000 |
| valtio batched sibling object writes | 677 ns/op | 675 ns/op | 0.5% | 3 | 18000 | 3000 |
| pulse batched list item multi-field writes | 3,048 ns/op | 3,161 ns/op | 5.8% | 3 | 4500 | 1500 |
| Legend-State batched list item multi-field writes | 15,823 ns/op | 15,838 ns/op | 0.7% | 3 | 1500 | 1500 |
| MobX batched list item multi-field writes | 1,362 ns/op | 1,365 ns/op | 0.9% | 3 | 9000 | 1500 |
| valtio batched list item multi-field writes | 997 ns/op | 1,006 ns/op | 1.5% | 3 | 24000 | 1500 |

### Root Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 62 ns/op | 64 ns/op | 4.1% | 3 | 300000 | 5000 |
| Legend-State | 276 ns/op | 276 ns/op | 0.5% | 3 | 60000 | 5000 |
| MobX | 455 ns/op | 452 ns/op | 1.2% | 3 | 50000 | 5000 |
| valtio | 68 ns/op | 68 ns/op | 0.7% | 3 | 180000 | 5000 |

### Root Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 290 ns/op | 289 ns/op | 0.5% | 3 | 60000 | 5000 |
| Legend-State | 1,628 ns/op | 1,634 ns/op | 0.6% | 3 | 10000 | 5000 |
| MobX | 415 ns/op | 416 ns/op | 0.6% | 3 | 30000 | 5000 |
| valtio | 218 ns/op | 218 ns/op | 0.5% | 3 | 100000 | 5000 |

### Leaf Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 298 ns/op | 298 ns/op | 1.1% | 3 | 80000 | 5000 |
| Legend-State | 1,169 ns/op | 1,168 ns/op | 0.5% | 3 | 15000 | 5000 |
| MobX | 337 ns/op | 336 ns/op | 0.7% | 3 | 60000 | 5000 |
| valtio | 120 ns/op | 120 ns/op | 0.4% | 3 | 160000 | 5000 |

### Leaf Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 836 ns/op | 848 ns/op | 4.6% | 3 | 15000 | 5000 |
| Legend-State | 2,659 ns/op | 2,632 ns/op | 1.7% | 3 | 5000 | 5000 |
| MobX | 326 ns/op | 325 ns/op | 1.1% | 3 | 60000 | 5000 |
| valtio | 296 ns/op | 297 ns/op | 0.7% | 3 | 80000 | 5000 |

### Editable Table Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 50 row listeners subscribe and unsubscribe | 17,090 ns/op | 17,392 ns/op | 3.2% | 3 | 1000 | 500 |
| Legend-State 50 row listeners subscribe and unsubscribe | 56,976 ns/op | 56,994 ns/op | 1.5% | 3 | 500 | 500 |
| MobX 50 row listeners subscribe and unsubscribe | 13,459,709 ns/op | 13,653,677 ns/op | 2.4% | 3 | 250 | 250 |
| valtio 50 row listeners subscribe and unsubscribe | 8,236,337 ns/op | 8,165,843 ns/op | 3.1% | 3 | 500 | 500 |
| pulse visible window listeners subscribe and unsubscribe | 394,503 ns/op | 395,957 ns/op | 1.1% | 3 | 100 | 100 |
| Legend-State visible window listeners subscribe and unsubscribe | 1,630,222 ns/op | 1,634,826 ns/op | 0.6% | 3 | 100 | 100 |
| MobX visible window listeners subscribe and unsubscribe | 328,104 ns/op | 328,598 ns/op | 0.3% | 3 | 50 | 50 |
| valtio visible window listeners subscribe and unsubscribe | 194,294 ns/op | 174,184 ns/op | 17.6% | 3 | 100 | 100 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 100x730 single cell write | 1,196 ns/op | 1,215 ns/op | 3.4% | 3 | 12000 | 2000 |
| Legend-State 100x730 single cell write | 5,382 ns/op | 5,396 ns/op | 0.4% | 3 | 4000 | 2000 |
| MobX 100x730 single cell write | 615 ns/op | 611 ns/op | 1.5% | 3 | 44000 | 2000 |
| valtio 100x730 single cell write | 321 ns/op | 322 ns/op | 0.3% | 3 | 64000 | 2000 |
| pulse 100x730 single cell write with cell listener | 2,072 ns/op | 2,399 ns/op | 24.9% | 3 | 2000 | 2000 |
| Legend-State 100x730 single cell write with cell listener | 6,000 ns/op | 6,122 ns/op | 5.3% | 3 | 2000 | 2000 |
| MobX 100x730 single cell write with cell listener | 634 ns/op | 600 ns/op | 9.0% | 3 | 40000 | 2000 |
| valtio 100x730 single cell write with cell listener | 336 ns/op | 337 ns/op | 0.9% | 3 | 60000 | 2000 |
| pulse 100x730 single cell write with row listener | 1,219 ns/op | 1,281 ns/op | 7.2% | 3 | 10000 | 2000 |
| Legend-State 100x730 single cell write with row listener | 5,669 ns/op | 5,755 ns/op | 2.7% | 3 | 4000 | 2000 |
| MobX 100x730 single cell write with row listener | 167,087 ns/op | 165,070 ns/op | 2.0% | 3 | 500 | 500 |
| valtio 100x730 single cell write with row listener | 385 ns/op | 386 ns/op | 1.7% | 3 | 32000 | 1000 |
| pulse 100x730 single cell write with root listener | 1,189 ns/op | 1,213 ns/op | 3.5% | 3 | 12000 | 1000 |
| Legend-State 100x730 single cell write with root listener | 5,628 ns/op | 5,756 ns/op | 3.2% | 3 | 3000 | 1000 |
| MobX 100x730 single cell write with root listener | 18,507,703 ns/op | 18,564,025 ns/op | 0.8% | 3 | 50 | 50 |
| valtio 100x730 single cell write with root listener | 429 ns/op | 430 ns/op | 2.1% | 3 | 6400 | 100 |
| pulse 100x730 visible window listeners and cell write | 1,309 ns/op | 1,277 ns/op | 4.0% | 3 | 8000 | 500 |
| Legend-State 100x730 visible window listeners and cell write | 5,533 ns/op | 5,526 ns/op | 0.3% | 3 | 2500 | 500 |
| MobX 100x730 visible window listeners and cell write | 513 ns/op | 612 ns/op | 23.6% | 3 | 12800 | 200 |
| valtio 100x730 visible window listeners and cell write | 324 ns/op | 499 ns/op | 50.4% | 3 | 16000 | 250 |
| pulse 100x730 first month write across first 50 rows | 1,611,185 ns/op | 1,612,913 ns/op | 0.4% | 3 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows | 7,924,876 ns/op | 7,936,488 ns/op | 0.5% | 3 | 50 | 50 |
| MobX 100x730 first month write across first 50 rows | 661,070 ns/op | 662,190 ns/op | 5.0% | 3 | 50 | 50 |
| valtio 100x730 first month write across first 50 rows | 495,988 ns/op | 552,463 ns/op | 14.9% | 3 | 50 | 50 |
| pulse 100x730 first month write across first 50 rows with row listeners | 1,902,409 ns/op | 1,902,607 ns/op | 0.1% | 3 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows with row listeners | 8,165,257 ns/op | 8,171,478 ns/op | 0.3% | 3 | 50 | 50 |
| MobX 100x730 first month write across first 50 rows with row listeners | 9,167,757 ns/op | 9,191,088 ns/op | 0.5% | 3 | 25 | 25 |
| valtio 100x730 first month write across first 50 rows with row listeners | 607,192 ns/op | 702,598 ns/op | 22.1% | 3 | 25 | 25 |

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
| Hot Read Costs | 275 ns/op | 3,974 ns/op | 324 ns/op | 109 ns/op | valtio |
| Activation Costs | 616,511 ns/op | 489,396 ns/op | 31,127,365 ns/op | 39,243,640 ns/op | Legend-State |
| Primitive Root Write | 64 ns/op | 642 ns/op | 152 ns/op | 1,362 ns/op | pulse |
| Deep Nested Leaf Write | 6,751 ns/op | 148,238 ns/op | 80,204 ns/op | 165,552 ns/op | pulse |
| Array Item Field Write | 638 ns/op | 3,540 ns/op | 6,003 ns/op | 7,290 ns/op | pulse |
| Whole Array Multi-Row Replace | 7,944 ns/op | 22,588 ns/op | 514,612 ns/op | 873,564 ns/op | pulse |
| Array Reindexing Costs | 239,668 ns/op | 190,852 ns/op | 10,365 ns/op | 117,054 ns/op | MobX |
| Large Table Structural Costs | 13,844 ns/op | 339,143 ns/op | 208,218 ns/op | 455,511 ns/op | pulse |
| Derived Consumer Costs | 1,254 ns/op | 4,419 ns/op | 642 ns/op | 467 ns/op | valtio |
| Batch Collapse Costs | 1,929 ns/op | 6,714 ns/op | 1,077 ns/op | 833 ns/op | valtio |
| Listener Selectivity Costs | 792 ns/op | 3,099 ns/op | 460 ns/op | 346 ns/op | valtio |
| Store Creation Cost | 3,825 ns/op | 3,728 ns/op | 233,880 ns/op | 327,871 ns/op | Legend-State |
| Wide Array Item Replace | 353,941 ns/op | 353,962 ns/op | 24,621,599 ns/op | 37,346,500 ns/op | pulse |
| General App Cold Update | 55,359 ns/op | 59,889 ns/op | 2,233,822 ns/op | 3,279,045 ns/op | pulse |
| General App Hot Writes | 1,405 ns/op | 7,584 ns/op | 653 ns/op | 480 ns/op | valtio |
| Root Subscription Lifecycle | 62 ns/op | 276 ns/op | 455 ns/op | 68 ns/op | pulse |
| Root Subscription Dispatch | 290 ns/op | 1,628 ns/op | 415 ns/op | 218 ns/op | valtio |
| Leaf Subscription Lifecycle | 298 ns/op | 1,169 ns/op | 337 ns/op | 120 ns/op | valtio |
| Leaf Subscription Dispatch | 836 ns/op | 2,659 ns/op | 326 ns/op | 296 ns/op | valtio |
| Editable Table Subscription Lifecycle | 82,111 ns/op | 304,769 ns/op | 2,101,472 ns/op | 1,265,017 ns/op | pulse |
| Editable Table Costs | 10,537 ns/op | 44,918 ns/op | 62,552 ns/op | 2,904 ns/op | valtio |

### Category Breadth

| Library | Category Wins |
| --- | ---: |
| pulse | 9 |
| valtio | 9 |
| Legend-State | 2 |
| MobX | 1 |

Most category wins: pulse

### Equal-Category Overall

| Library | Category Wins | Equal-Category Score |
| --- | ---: | ---: |
| pulse | 9 | 3,721 ns/op |
| Legend-State | 2 | 13,902 ns/op |
| valtio | 9 | 14,222 ns/op |
| MobX | 1 | 15,126 ns/op |

Equal-category overall winner: pulse

### Scenario-Weighted Overall

| Library | Category Wins | Scenario-Weighted Score |
| --- | ---: | ---: |
| pulse | 9 | 5,417 ns/op |
| valtio | 9 | 14,940 ns/op |
| MobX | 1 | 20,846 ns/op |
| Legend-State | 2 | 28,951 ns/op |

Scenario-weighted overall winner: pulse

