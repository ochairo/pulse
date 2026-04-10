# Benchmarks

Generated: 2026-04-10T15:13:10.817Z

Environment: Node v18.17.1 on darwin arm64

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
| root get on reused state | 53 ns/op | 48 ns/op | 9.8% | 2 | 100000 | 50000 |
| deep leaf get on reused state | 9,781 ns/op | 9,667 ns/op | 1.2% | 2 | 25000 | 25000 |
| editable table cell get on reused state | 475 ns/op | 473 ns/op | 0.5% | 2 | 25000 | 25000 |

### Activation Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| wide graph deep leaf get on fresh state | 591,318 ns/op | 585,050 ns/op | 1.1% | 2 | 500 | 500 |
| wide graph deep leaf subscribe on fresh state | 598,343 ns/op | 595,062 ns/op | 0.6% | 2 | 500 | 500 |

### Focused Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| primitive root write | 98 ns/op | 94 ns/op | 3.5% | 2 | 40000 | 10000 |
| deep leaf write | 49,151 ns/op | 48,870 ns/op | 0.6% | 2 | 2000 | 2000 |
| wide array item replace | 484,901 ns/op | 484,660 ns/op | 0.0% | 2 | 1000 | 1000 |
| array leaf field write | 1,220 ns/op | 1,083 ns/op | 12.7% | 2 | 5000 | 5000 |
| array item multi-key replace | 796 ns/op | 740 ns/op | 7.6% | 2 | 5000 | 5000 |

### Array Reindexing Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| head insert with visible window consumer | 332,587 ns/op | 330,629 ns/op | 0.6% | 2 | 1000 | 1000 |
| head remove with visible window consumer | 13,956 ns/op | 13,818 ns/op | 1.0% | 2 | 1000 | 1000 |

### Large Table Structural Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| create 1,000 rows | 59,936 ns/op | 59,074 ns/op | 1.5% | 2 | 500 | 500 |
| create 10,000 rows | 612,120 ns/op | 604,195 ns/op | 1.3% | 2 | 100 | 100 |
| replace all 1,000 rows | 62,105 ns/op | 60,787 ns/op | 2.2% | 2 | 500 | 500 |
| partial update every 10th row in 1,000 rows | 122,527 ns/op | 121,472 ns/op | 0.9% | 2 | 500 | 500 |
| select focused row in 1,000 rows | 3,715 ns/op | 3,233 ns/op | 14.9% | 2 | 2000 | 1000 |
| swap two rows in 1,000 rows | 1,363 ns/op | 1,101 ns/op | 23.8% | 2 | 4000 | 500 |
| remove one row from 1,000 rows | 2,764 ns/op | 2,686 ns/op | 2.9% | 2 | 2000 | 500 |
| append 1,000 rows to 10,000 rows | 540,705 ns/op | 537,495 ns/op | 0.6% | 2 | 100 | 100 |
| clear 1,000 rows | 286 ns/op | 256 ns/op | 11.9% | 2 | 8000 | 1000 |

### Derived Consumer Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| relevant source write with two-source consumer | 2,136 ns/op | 2,041 ns/op | 4.7% | 2 | 5000 | 5000 |
| unrelated source write with two-source consumer | 664 ns/op | 598 ns/op | 11.0% | 2 | 10000 | 5000 |
| batched dual-source write with two-source consumer | 3,665 ns/op | 3,530 ns/op | 3.8% | 2 | 3000 | 3000 |

### Batch Collapse Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| same leaf written twice in root batch | 2,384 ns/op | 2,338 ns/op | 2.0% | 2 | 5000 | 5000 |
| sibling leaf writes in root batch | 3,299 ns/op | 3,273 ns/op | 0.8% | 2 | 3000 | 3000 |

### Listener Selectivity Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| write one subscribed leaf among 100 listeners | 1,733 ns/op | 1,560 ns/op | 11.1% | 2 | 4000 | 2000 |
| write unsubscribed leaf with 100 unrelated listeners | 684 ns/op | 683 ns/op | 0.1% | 2 | 8000 | 2000 |

### Path Depth Scaling

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| depth 5 leaf write | 1,731 ns/op | 1,725 ns/op | 0.3% | 2 | 5000 | 5000 |
| depth 25 leaf write | 6,726 ns/op | 6,618 ns/op | 1.6% | 2 | 3000 | 3000 |
| depth 100 leaf write | 68,016 ns/op | 47,923 ns/op | 41.9% | 2 | 1500 | 1500 |
| depth 200 leaf write | 48,985 ns/op | 48,586 ns/op | 0.8% | 2 | 1000 | 1000 |

### Structural Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sparse array growth | 538 ns/op | 492 ns/op | 9.4% | 2 | 8000 | 2000 |
| array truncate via length | 48,332 ns/op | 47,906 ns/op | 0.9% | 2 | 2000 | 2000 |
| deep object branch replace | 7,414 ns/op | 7,343 ns/op | 1.0% | 2 | 2000 | 2000 |
| whole array multi-row replace | 47,654 ns/op | 47,649 ns/op | 0.0% | 2 | 1000 | 1000 |
| whole array multi-row replace in root batch | 260,659 ns/op | 175,312 ns/op | 48.7% | 2 | 1000 | 1000 |

### General App Write Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nested object leaf write | 4,708 ns/op | 4,695 ns/op | 0.3% | 2 | 5000 | 5000 |
| mixed array object leaf write | 61,471 ns/op | 61,271 ns/op | 0.3% | 2 | 3000 | 3000 |
| batched sibling object writes | 5,903 ns/op | 5,820 ns/op | 1.4% | 2 | 3000 | 3000 |
| batched list item multi-field writes | 63,700 ns/op | 63,593 ns/op | 0.2% | 2 | 1500 | 1500 |

### Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener subscribe and unsubscribe | 109 ns/op | 108 ns/op | 0.5% | 2 | 40000 | 5000 |
| leaf listener subscribe and unsubscribe | 883 ns/op | 849 ns/op | 4.0% | 2 | 5000 | 5000 |
| market row listener subscribe and unsubscribe | 3,933 ns/op | 3,913 ns/op | 0.5% | 2 | 5000 | 5000 |
| hundred leaf listeners subscribe and unsubscribe | 34,886 ns/op | 34,748 ns/op | 0.4% | 2 | 1000 | 1000 |

### Editable Table Subscription Lifecycle Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 row listeners subscribe and unsubscribe | 3,359,833 ns/op | 3,280,466 ns/op | 2.4% | 2 | 500 | 500 |
| visible window listeners subscribe and unsubscribe | 4,846,745 ns/op | 4,419,148 ns/op | 9.7% | 2 | 100 | 100 |

### Subscription Dispatch Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| root listener write | 757 ns/op | 743 ns/op | 1.9% | 2 | 5000 | 5000 |
| leaf listener write | 1,096 ns/op | 1,074 ns/op | 2.1% | 2 | 5000 | 5000 |
| item listener write | 2,156 ns/op | 1,964 ns/op | 9.8% | 2 | 5000 | 5000 |
| market row listener replace | 4,755 ns/op | 4,753 ns/op | 0.0% | 2 | 5000 | 5000 |
| market row listener replace in root batch | 5,094 ns/op | 5,059 ns/op | 0.7% | 2 | 5000 | 5000 |
| market row exact child listeners replace in root batch | 3,984 ns/op | 3,868 ns/op | 3.0% | 2 | 5000 | 5000 |
| hundred leaf listeners on same node | 2,201 ns/op | 1,868 ns/op | 17.8% | 2 | 2000 | 1000 |
| beat batched sweep mirror 10000 rows with per-field listeners | 113,843,492 ns/op | 111,369,221 ns/op | 2.2% | 2 | 10 | 10 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 100x730 single cell write | 3,301,404 ns/op | 3,267,450 ns/op | 1.0% | 2 | 1000 | 1000 |
| 100x730 single cell write with cell listener | 3,448,940 ns/op | 3,331,785 ns/op | 3.5% | 2 | 1000 | 1000 |
| 100x730 single cell write with row listener | 3,293,062 ns/op | 3,263,620 ns/op | 0.9% | 2 | 1000 | 1000 |
| 100x730 visible window listeners and cell write | 3,882,060 ns/op | 3,876,116 ns/op | 0.2% | 2 | 250 | 250 |
| 100x730 first month write across first 50 rows | 5,919,431 ns/op | 5,695,406 ns/op | 3.9% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows in root batch | 5,972,027 ns/op | 5,949,677 ns/op | 0.4% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners | 7,059,653 ns/op | 6,805,515 ns/op | 3.7% | 2 | 100 | 100 |
| 100x730 first month write across first 50 rows with row listeners in root batch | 6,975,897 ns/op | 6,870,880 ns/op | 1.5% | 2 | 100 | 100 |

## Comparison Suite

### Hot Read Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse root read | 33 ns/op | 29 ns/op | 13.9% | 2 | 200000 | 25000 |
| Legend-State root read | 288 ns/op | 229 ns/op | 25.5% | 2 | 25000 | 25000 |
| valtio root read | 22 ns/op | 22 ns/op | 0.1% | 2 | 200000 | 25000 |
| pulse deep leaf read | 2,684 ns/op | 2,641 ns/op | 1.6% | 2 | 10000 | 10000 |
| Legend-State deep leaf read | 175,846 ns/op | 167,228 ns/op | 5.2% | 2 | 10000 | 10000 |
| valtio deep leaf read | 1,909 ns/op | 1,906 ns/op | 0.2% | 2 | 10000 | 10000 |
| pulse table cell read | 431 ns/op | 417 ns/op | 3.3% | 2 | 25000 | 25000 |
| Legend-State table cell read | 2,295 ns/op | 2,250 ns/op | 2.0% | 2 | 25000 | 25000 |
| valtio table cell read | 151 ns/op | 148 ns/op | 2.1% | 2 | 25000 | 25000 |

### Activation Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse wide graph deep leaf get on fresh state | 506,478 ns/op | 504,998 ns/op | 0.3% | 2 | 500 | 500 |
| Legend-State wide graph deep leaf get on fresh state | 501,503 ns/op | 500,175 ns/op | 0.3% | 2 | 500 | 500 |
| valtio wide graph deep leaf get on fresh state | 42,342,453 ns/op | 41,924,765 ns/op | 1.0% | 2 | 500 | 500 |
| pulse wide graph deep leaf subscribe on fresh state | 961,090 ns/op | 957,609 ns/op | 0.4% | 2 | 500 | 500 |
| Legend-State wide graph deep leaf subscribe on fresh state | 508,935 ns/op | 507,732 ns/op | 0.2% | 2 | 500 | 500 |
| valtio wide graph deep leaf subscribe on fresh state | 42,372,713 ns/op | 42,130,435 ns/op | 0.6% | 2 | 500 | 500 |

### Primitive Root Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 5,985 ns/op | 3,117 ns/op | 92.0% | 2 | 20000 | 10000 |
| Legend-State | 748 ns/op | 734 ns/op | 1.9% | 2 | 10000 | 10000 |
| valtio | 1,938 ns/op | 1,812 ns/op | 6.9% | 2 | 10000 | 10000 |

### Deep Nested Leaf Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 8,192 ns/op | 7,735 ns/op | 5.9% | 2 | 1000 | 1000 |
| Legend-State | 153,675 ns/op | 153,553 ns/op | 0.1% | 2 | 1000 | 1000 |
| valtio | 106,458 ns/op | 105,596 ns/op | 0.8% | 2 | 1000 | 1000 |

### Array Item Field Write

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 1,279 ns/op | 1,000 ns/op | 27.9% | 2 | 5000 | 5000 |
| Legend-State | 3,964 ns/op | 3,945 ns/op | 0.5% | 2 | 5000 | 5000 |
| valtio | 9,269 ns/op | 9,145 ns/op | 1.4% | 2 | 5000 | 5000 |

### Whole Array Multi-Row Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 16,187 ns/op | 13,545 ns/op | 19.5% | 2 | 1000 | 1000 |
| Legend-State | 26,475 ns/op | 25,766 ns/op | 2.7% | 2 | 1000 | 1000 |
| valtio | 979,503 ns/op | 904,959 ns/op | 8.2% | 2 | 1000 | 1000 |

### Array Reindexing Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse head insert with visible window consumer | 285,667 ns/op | 283,982 ns/op | 0.6% | 2 | 1000 | 1000 |
| Legend-State head insert with visible window consumer | 782,329 ns/op | 776,602 ns/op | 0.7% | 2 | 1000 | 1000 |
| valtio head insert with visible window consumer | 682,280 ns/op | 674,083 ns/op | 1.2% | 2 | 1000 | 1000 |
| pulse head remove with visible window consumer | 15,965 ns/op | 14,394 ns/op | 10.9% | 2 | 1000 | 1000 |
| Legend-State head remove with visible window consumer | 29,323 ns/op | 28,390 ns/op | 3.3% | 2 | 1000 | 1000 |
| valtio head remove with visible window consumer | 29,577 ns/op | 29,415 ns/op | 0.5% | 2 | 1000 | 1000 |

### Large Table Structural Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse create 1,000 rows | 56,143 ns/op | 55,927 ns/op | 0.4% | 2 | 500 | 500 |
| Legend-State create 1,000 rows | 55,417 ns/op | 55,031 ns/op | 0.7% | 2 | 500 | 500 |
| valtio create 1,000 rows | 6,242,373 ns/op | 6,125,362 ns/op | 1.9% | 2 | 500 | 500 |
| pulse create 10,000 rows | 557,142 ns/op | 555,741 ns/op | 0.3% | 2 | 100 | 100 |
| Legend-State create 10,000 rows | 551,177 ns/op | 550,979 ns/op | 0.0% | 2 | 100 | 100 |
| valtio create 10,000 rows | 61,632,056 ns/op | 61,577,015 ns/op | 0.1% | 2 | 100 | 100 |
| pulse replace all 1,000 rows | 57,888 ns/op | 56,804 ns/op | 1.9% | 2 | 500 | 500 |
| Legend-State replace all 1,000 rows | 2,885,904 ns/op | 2,881,200 ns/op | 0.2% | 2 | 500 | 500 |
| valtio replace all 1,000 rows | 6,367,183 ns/op | 6,355,149 ns/op | 0.2% | 2 | 500 | 500 |
| pulse partial update every 10th row in 1,000 rows | 112,801 ns/op | 111,986 ns/op | 0.7% | 2 | 500 | 500 |
| Legend-State partial update every 10th row in 1,000 rows | 445,525 ns/op | 439,508 ns/op | 1.4% | 2 | 500 | 500 |
| valtio partial update every 10th row in 1,000 rows | 42,803 ns/op | 40,907 ns/op | 4.6% | 2 | 500 | 500 |
| pulse select focused row in 1,000 rows | 3,649 ns/op | 3,284 ns/op | 11.1% | 2 | 1000 | 1000 |
| Legend-State select focused row in 1,000 rows | 8,526 ns/op | 8,358 ns/op | 2.0% | 2 | 1000 | 1000 |
| valtio select focused row in 1,000 rows | 615 ns/op | 605 ns/op | 1.6% | 2 | 6000 | 1000 |
| pulse swap two rows in 1,000 rows | 677 ns/op | 671 ns/op | 0.9% | 2 | 4000 | 500 |
| Legend-State swap two rows in 1,000 rows | 498,141 ns/op | 497,750 ns/op | 0.1% | 2 | 500 | 500 |
| valtio swap two rows in 1,000 rows | 639,771 ns/op | 635,497 ns/op | 0.7% | 2 | 500 | 500 |
| pulse remove one row from 1,000 rows | 2,390 ns/op | 2,269 ns/op | 5.4% | 2 | 2000 | 500 |
| Legend-State remove one row from 1,000 rows | 733,766 ns/op | 732,866 ns/op | 0.1% | 2 | 500 | 500 |
| valtio remove one row from 1,000 rows | 521,080 ns/op | 513,770 ns/op | 1.4% | 2 | 500 | 500 |
| pulse append 1,000 rows to 10,000 rows | 1,272,063 ns/op | 854,280 ns/op | 48.9% | 2 | 100 | 100 |
| Legend-State append 1,000 rows to 10,000 rows | 62,768,896 ns/op | 62,559,485 ns/op | 0.3% | 2 | 100 | 100 |
| valtio append 1,000 rows to 10,000 rows | 66,527,096 ns/op | 66,354,584 ns/op | 0.3% | 2 | 100 | 100 |
| pulse clear 1,000 rows | 331 ns/op | 276 ns/op | 19.7% | 2 | 8000 | 1000 |
| Legend-State clear 1,000 rows | 2,731 ns/op | 2,596 ns/op | 5.2% | 2 | 2000 | 1000 |
| valtio clear 1,000 rows | 2,795 ns/op | 2,786 ns/op | 0.3% | 2 | 4000 | 1000 |

### Derived Consumer Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse relevant source write | 1,896 ns/op | 1,792 ns/op | 5.8% | 2 | 5000 | 5000 |
| Legend-State relevant source write | 4,756 ns/op | 4,747 ns/op | 0.2% | 2 | 5000 | 5000 |
| valtio relevant source write | 520 ns/op | 508 ns/op | 2.4% | 2 | 10000 | 5000 |
| pulse unrelated source write | 516 ns/op | 503 ns/op | 2.5% | 2 | 10000 | 5000 |
| Legend-State unrelated source write | 2,702 ns/op | 2,579 ns/op | 4.8% | 2 | 5000 | 5000 |
| valtio unrelated source write | 340 ns/op | 319 ns/op | 6.5% | 2 | 15000 | 5000 |
| pulse batched dual-source write | 3,575 ns/op | 3,321 ns/op | 7.6% | 2 | 3000 | 3000 |
| Legend-State batched dual-source write | 7,401 ns/op | 7,359 ns/op | 0.6% | 2 | 3000 | 3000 |
| valtio batched dual-source write | 1,062 ns/op | 1,045 ns/op | 1.6% | 2 | 6000 | 3000 |

### Batch Collapse Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse same leaf written twice in coordinated update | 2,211 ns/op | 2,183 ns/op | 1.3% | 2 | 5000 | 5000 |
| Legend-State same leaf written twice in coordinated update | 6,930 ns/op | 6,855 ns/op | 1.1% | 2 | 5000 | 5000 |
| valtio same leaf written twice in coordinated update | 1,015 ns/op | 967 ns/op | 5.0% | 2 | 5000 | 5000 |

### Listener Selectivity Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse write one subscribed leaf among 100 listeners | 2,394 ns/op | 1,842 ns/op | 29.9% | 2 | 2000 | 2000 |
| Legend-State write one subscribed leaf among 100 listeners | 4,272 ns/op | 3,997 ns/op | 6.9% | 2 | 2000 | 2000 |
| valtio write one subscribed leaf among 100 listeners | 521 ns/op | 488 ns/op | 6.7% | 2 | 8000 | 2000 |
| pulse write unsubscribed leaf with 100 unrelated listeners | 660 ns/op | 651 ns/op | 1.3% | 2 | 8000 | 2000 |
| Legend-State write unsubscribed leaf with 100 unrelated listeners | 2,860 ns/op | 2,744 ns/op | 4.2% | 2 | 2000 | 2000 |
| valtio write unsubscribed leaf with 100 unrelated listeners | 491 ns/op | 464 ns/op | 5.7% | 2 | 10000 | 2000 |

### Store Creation Cost

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 5,677 ns/op | 5,296 ns/op | 7.2% | 2 | 1000 | 1000 |
| Legend-State | 5,204 ns/op | 4,891 ns/op | 6.4% | 2 | 1000 | 1000 |
| valtio | 357,541 ns/op | 350,453 ns/op | 2.0% | 2 | 1000 | 1000 |

### Wide Array Item Replace

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 494,145 ns/op | 490,021 ns/op | 0.8% | 2 | 1000 | 1000 |
| Legend-State | 507,201 ns/op | 504,655 ns/op | 0.5% | 2 | 1000 | 1000 |
| valtio | 36,265,988 ns/op | 36,032,685 ns/op | 0.6% | 2 | 1000 | 1000 |

### General App Cold Update

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf | 62,116 ns/op | 61,892 ns/op | 0.4% | 2 | 3000 | 3000 |
| Legend-State nested object leaf | 70,252 ns/op | 68,540 ns/op | 2.5% | 2 | 3000 | 3000 |
| valtio nested object leaf | 3,450,396 ns/op | 3,408,424 ns/op | 1.2% | 2 | 3000 | 3000 |

### General App Hot Writes

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse nested object leaf write | 1,089 ns/op | 951 ns/op | 14.6% | 2 | 5000 | 5000 |
| Legend-State nested object leaf write | 28,096 ns/op | 16,266 ns/op | 72.7% | 2 | 5000 | 5000 |
| valtio nested object leaf write | 358 ns/op | 341 ns/op | 4.9% | 2 | 20000 | 5000 |
| pulse mixed array object leaf write | 1,081 ns/op | 1,056 ns/op | 2.4% | 2 | 6000 | 3000 |
| Legend-State mixed array object leaf write | 5,362 ns/op | 5,355 ns/op | 0.1% | 2 | 3000 | 3000 |
| valtio mixed array object leaf write | 382 ns/op | 372 ns/op | 2.6% | 2 | 12000 | 3000 |
| pulse batched sibling object writes | 2,523 ns/op | 2,344 ns/op | 7.6% | 2 | 3000 | 3000 |
| Legend-State batched sibling object writes | 9,373 ns/op | 9,194 ns/op | 1.9% | 2 | 3000 | 3000 |
| valtio batched sibling object writes | 801 ns/op | 780 ns/op | 2.7% | 2 | 6000 | 3000 |
| pulse batched list item multi-field writes | 3,827 ns/op | 3,487 ns/op | 9.8% | 2 | 1500 | 1500 |
| Legend-State batched list item multi-field writes | 16,217 ns/op | 16,104 ns/op | 0.7% | 2 | 1500 | 1500 |
| valtio batched list item multi-field writes | 1,174 ns/op | 1,129 ns/op | 4.0% | 2 | 4500 | 1500 |

### Root Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 101 ns/op | 81 ns/op | 24.2% | 2 | 40000 | 5000 |
| Legend-State | 248 ns/op | 245 ns/op | 1.1% | 2 | 20000 | 5000 |
| valtio | 74 ns/op | 72 ns/op | 2.4% | 2 | 40000 | 5000 |

### Root Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 940 ns/op | 819 ns/op | 14.7% | 2 | 5000 | 5000 |
| Legend-State | 1,705 ns/op | 1,663 ns/op | 2.6% | 2 | 5000 | 5000 |
| valtio | 243 ns/op | 241 ns/op | 0.5% | 2 | 30000 | 5000 |

### Leaf Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 306 ns/op | 294 ns/op | 4.4% | 2 | 15000 | 5000 |
| Legend-State | 1,186 ns/op | 1,152 ns/op | 3.0% | 2 | 5000 | 5000 |
| valtio | 127 ns/op | 125 ns/op | 1.5% | 2 | 40000 | 5000 |

### Leaf Subscription Dispatch

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse | 1,063 ns/op | 1,055 ns/op | 0.7% | 2 | 5000 | 5000 |
| Legend-State | 2,737 ns/op | 2,710 ns/op | 1.0% | 2 | 5000 | 5000 |
| valtio | 342 ns/op | 331 ns/op | 3.4% | 2 | 15000 | 5000 |

### Editable Table Subscription Lifecycle

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 50 row listeners subscribe and unsubscribe | 18,306 ns/op | 17,203 ns/op | 6.4% | 2 | 500 | 500 |
| Legend-State 50 row listeners subscribe and unsubscribe | 51,487 ns/op | 50,969 ns/op | 1.0% | 2 | 500 | 500 |
| valtio 50 row listeners subscribe and unsubscribe | 15,606,921 ns/op | 15,137,521 ns/op | 3.1% | 2 | 500 | 500 |
| pulse visible window listeners subscribe and unsubscribe | 413,502 ns/op | 410,642 ns/op | 0.7% | 2 | 100 | 100 |
| Legend-State visible window listeners subscribe and unsubscribe | 1,561,387 ns/op | 1,559,335 ns/op | 0.1% | 2 | 100 | 100 |
| valtio visible window listeners subscribe and unsubscribe | 221,406 ns/op | 206,668 ns/op | 7.1% | 2 | 100 | 100 |

### Editable Table Costs

| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pulse 100x730 single cell write | 1,399 ns/op | 1,389 ns/op | 0.7% | 2 | 4000 | 2000 |
| Legend-State 100x730 single cell write | 5,820 ns/op | 5,802 ns/op | 0.3% | 2 | 2000 | 2000 |
| valtio 100x730 single cell write | 349 ns/op | 347 ns/op | 0.8% | 2 | 16000 | 2000 |
| pulse 100x730 single cell write with cell listener | 2,616 ns/op | 2,556 ns/op | 2.3% | 2 | 2000 | 2000 |
| Legend-State 100x730 single cell write with cell listener | 6,306 ns/op | 6,271 ns/op | 0.6% | 2 | 2000 | 2000 |
| valtio 100x730 single cell write with cell listener | 407 ns/op | 393 ns/op | 3.5% | 2 | 10000 | 2000 |
| pulse 100x730 single cell write with row listener | 1,585 ns/op | 1,534 ns/op | 3.3% | 2 | 2000 | 2000 |
| Legend-State 100x730 single cell write with row listener | 5,895 ns/op | 5,861 ns/op | 0.6% | 2 | 2000 | 2000 |
| valtio 100x730 single cell write with row listener | 863 ns/op | 834 ns/op | 3.4% | 2 | 8000 | 1000 |
| pulse 100x730 single cell write with root listener | 1,504 ns/op | 1,451 ns/op | 3.7% | 2 | 4000 | 1000 |
| Legend-State 100x730 single cell write with root listener | 6,509 ns/op | 6,058 ns/op | 7.5% | 2 | 1000 | 1000 |
| valtio 100x730 single cell write with root listener | 535 ns/op | 516 ns/op | 3.5% | 2 | 800 | 100 |
| pulse 100x730 visible window listeners and cell write | 1,921 ns/op | 1,798 ns/op | 6.8% | 2 | 4000 | 500 |
| Legend-State 100x730 visible window listeners and cell write | 7,597 ns/op | 6,499 ns/op | 16.9% | 2 | 1000 | 500 |
| valtio 100x730 visible window listeners and cell write | 400 ns/op | 387 ns/op | 3.4% | 2 | 2000 | 250 |
| pulse 100x730 first month write across first 50 rows | 1,778,309 ns/op | 1,775,775 ns/op | 0.1% | 2 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows | 8,145,141 ns/op | 8,108,029 ns/op | 0.5% | 2 | 50 | 50 |
| valtio 100x730 first month write across first 50 rows | 608,708 ns/op | 576,056 ns/op | 5.7% | 2 | 50 | 50 |
| pulse 100x730 first month write across first 50 rows with row listeners | 2,104,167 ns/op | 2,100,992 ns/op | 0.2% | 2 | 50 | 50 |
| Legend-State 100x730 first month write across first 50 rows with row listeners | 9,833,610 ns/op | 9,374,417 ns/op | 4.9% | 2 | 50 | 50 |
| valtio 100x730 first month write across first 50 rows with row listeners | 855,292 ns/op | 830,715 ns/op | 3.0% | 2 | 25 | 25 |

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

| Category | pulse | Legend-State | valtio | Winner |
| --- | ---: | ---: | ---: | --- |
| Hot Read Costs | 337 ns/op | 4,878 ns/op | 185 ns/op | valtio |
| Activation Costs | 697,690 ns/op | 505,205 ns/op | 42,357,580 ns/op | Legend-State |
| Primitive Root Write | 5,985 ns/op | 748 ns/op | 1,938 ns/op | Legend-State |
| Deep Nested Leaf Write | 8,192 ns/op | 153,675 ns/op | 106,458 ns/op | pulse |
| Array Item Field Write | 1,279 ns/op | 3,964 ns/op | 9,269 ns/op | pulse |
| Whole Array Multi-Row Replace | 16,187 ns/op | 26,475 ns/op | 979,503 ns/op | pulse |
| Array Reindexing Costs | 67,532 ns/op | 151,460 ns/op | 142,055 ns/op | pulse |
| Large Table Structural Costs | 19,979 ns/op | 302,134 ns/op | 541,375 ns/op | pulse |
| Derived Consumer Costs | 1,518 ns/op | 4,565 ns/op | 572 ns/op | valtio |
| Batch Collapse Costs | 2,211 ns/op | 6,930 ns/op | 1,015 ns/op | valtio |
| Listener Selectivity Costs | 1,256 ns/op | 3,496 ns/op | 506 ns/op | valtio |
| Store Creation Cost | 5,677 ns/op | 5,204 ns/op | 357,541 ns/op | Legend-State |
| Wide Array Item Replace | 494,145 ns/op | 507,201 ns/op | 36,265,988 ns/op | pulse |
| General App Cold Update | 62,116 ns/op | 70,252 ns/op | 3,450,396 ns/op | pulse |
| General App Hot Writes | 1,836 ns/op | 12,302 ns/op | 599 ns/op | valtio |
| Root Subscription Lifecycle | 101 ns/op | 248 ns/op | 74 ns/op | valtio |
| Root Subscription Dispatch | 940 ns/op | 1,705 ns/op | 243 ns/op | valtio |
| Leaf Subscription Lifecycle | 306 ns/op | 1,186 ns/op | 127 ns/op | valtio |
| Leaf Subscription Dispatch | 1,063 ns/op | 2,737 ns/op | 342 ns/op | valtio |
| Editable Table Subscription Lifecycle | 87,002 ns/op | 283,534 ns/op | 1,858,889 ns/op | pulse |
| Editable Table Costs | 12,999 ns/op | 50,664 ns/op | 3,898 ns/op | valtio |

### Category Breadth

| Library | Category Wins |
| --- | ---: |
| valtio | 10 |
| pulse | 8 |
| Legend-State | 3 |

Most category wins: valtio

### Equal-Category Overall

| Library | Category Wins | Equal-Category Score |
| --- | ---: | ---: |
| pulse | 8 | 5,896 ns/op |
| Legend-State | 3 | 15,220 ns/op |
| valtio | 10 | 16,739 ns/op |

Equal-category overall winner: pulse

### Scenario-Weighted Overall

| Library | Category Wins | Scenario-Weighted Score |
| --- | ---: | ---: |
| pulse | 8 | 7,477 ns/op |
| valtio | 10 | 18,456 ns/op |
| Legend-State | 3 | 31,222 ns/op |

Scenario-weighted overall winner: pulse

