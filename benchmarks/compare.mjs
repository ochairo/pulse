import { fileURLToPath } from "node:url";
import {
  batch as legendBatch,
  observable as legendObservable,
} from "@legendapp/state";
import {
  autorun,
  observe,
  observable as mobxObservable,
  observable,
  runInAction,
} from "mobx";
import { proxy, subscribe } from "valtio/vanilla";
import { pulse } from "../dist/index.js";
import {
  createDeepState,
  createEditableTable,
  createUsers,
  getTableCell,
  replaceManyUsers,
  runBenchmarkSuite,
} from "./shared.mjs";

function createMobxBox(value) {
  return observable.box(value);
}

function getLegendTablePoint(table$, rowIndex, dayIndex) {
  return table$.rows[rowIndex].points[dayIndex];
}

function getMobxTablePoint(table, rowIndex, dayIndex) {
  return table.rows[rowIndex].points[dayIndex];
}

function getValtioTablePoint(table, rowIndex, dayIndex) {
  return table.rows[rowIndex].points[dayIndex];
}

function trackMobxRow(row) {
  row.id;
  row.label;
  row.unit;

  for (const point of row.points) {
    point.day;
    point.value;
  }
}

function trackMobxTable(table) {
  for (const row of table.rows) {
    trackMobxRow(row);
  }
}

function createPulseTableState() {
  return {
    table: pulse(createEditableTable(100, 730)),
    nextValue: 1_000,
  };
}

function createLegendTableState() {
  return {
    table: legendObservable(createEditableTable(100, 730)),
    nextValue: 1_000,
  };
}

function createMobxTableState() {
  return {
    table: mobxObservable(createEditableTable(100, 730)),
    nextValue: 1_000,
  };
}

function createValtioTableState() {
  return {
    table: proxy(createEditableTable(100, 730)),
    nextValue: 1_000,
  };
}

function subscribeValtioSync(target, callback) {
  return subscribe(target, callback, true);
}

function writePulseCell(state, rowIndex, dayIndex) {
  state.nextValue += 1;
  getTableCell(state.table, rowIndex, dayIndex)?.set(state.nextValue);
}

function writeLegendCell(state, rowIndex, dayIndex) {
  state.nextValue += 1;
  getLegendTablePoint(state.table, rowIndex, dayIndex).value.set(
    state.nextValue,
  );
}

function writeMobxCell(state, rowIndex, dayIndex) {
  state.nextValue += 1;
  runInAction(() => {
    getMobxTablePoint(state.table, rowIndex, dayIndex).value = state.nextValue;
  });
}

function writeValtioCell(state, rowIndex, dayIndex) {
  state.nextValue += 1;
  getValtioTablePoint(state.table, rowIndex, dayIndex).value = state.nextValue;
}

function createPulseBulkState(withRowListeners = false) {
  const state = {
    table: pulse(createEditableTable(100, 730)),
    offset: 0,
    unsubscribers: [],
  };

  if (withRowListeners) {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      const unsubscribe = state.table.rows[rowIndex]?.on(() => {});
      if (unsubscribe) {
        state.unsubscribers.push(unsubscribe);
      }
    }
  }

  return state;
}

function createLegendBulkState(withRowListeners = false) {
  const state = {
    table: legendObservable(createEditableTable(100, 730)),
    offset: 0,
    disposers: [],
  };

  if (withRowListeners) {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      state.disposers.push(state.table.rows[rowIndex].onChange(() => {}));
    }
  }

  return state;
}

function createMobxBulkState(withRowListeners = false) {
  const state = {
    table: mobxObservable(createEditableTable(100, 730)),
    offset: 0,
    disposers: [],
  };

  if (withRowListeners) {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      const row = state.table.rows[rowIndex];
      state.disposers.push(
        autorun(() => {
          trackMobxRow(row);
        }),
      );
    }
  }

  return state;
}

function createValtioBulkState(withRowListeners = false) {
  const state = {
    table: proxy(createEditableTable(100, 730)),
    offset: 0,
    unsubscribers: [],
  };

  if (withRowListeners) {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      state.unsubscribers.push(
        subscribeValtioSync(state.table.rows[rowIndex], () => {}),
      );
    }
  }

  return state;
}

function writePulseFirstMonth(state) {
  state.offset += 1;
  state.table.batch(() => {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
        state.table.rows[rowIndex]?.points[dayIndex]?.value.set(
          state.offset + rowIndex + dayIndex,
        );
      }
    }
  });
}

function writeLegendFirstMonth(state) {
  state.offset += 1;
  legendBatch(() => {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
        state.table.rows[rowIndex].points[dayIndex].value.set(
          state.offset + rowIndex + dayIndex,
        );
      }
    }
  });
}

function writeMobxFirstMonth(state) {
  state.offset += 1;
  runInAction(() => {
    for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
      for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
        state.table.rows[rowIndex].points[dayIndex].value =
          state.offset + rowIndex + dayIndex;
      }
    }
  });
}

function writeValtioFirstMonth(state) {
  state.offset += 1;
  for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
    for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
      state.table.rows[rowIndex].points[dayIndex].value =
        state.offset + rowIndex + dayIndex;
    }
  }
}

function createEditableTableComparisonCases() {
  return [
    {
      name: "pulse 100x730 single cell write",
      iterations: 2_000,
      setup: createPulseTableState,
      task: (state) => {
        writePulseCell(state, 42, 511);
      },
    },
    {
      name: "Legend-State 100x730 single cell write",
      iterations: 2_000,
      setup: createLegendTableState,
      task: (state) => {
        writeLegendCell(state, 42, 511);
      },
    },
    {
      name: "MobX 100x730 single cell write",
      iterations: 2_000,
      setup: createMobxTableState,
      task: (state) => {
        writeMobxCell(state, 42, 511);
      },
    },
    {
      name: "valtio 100x730 single cell write",
      iterations: 2_000,
      setup: createValtioTableState,
      task: (state) => {
        writeValtioCell(state, 42, 511);
      },
    },
    {
      name: "pulse 100x730 single cell write with cell listener",
      iterations: 2_000,
      setup: () => {
        const state = createPulseTableState();
        state.unsubscribe = getTableCell(state.table, 42, 511)?.on(() => {});
        return state;
      },
      task: (state) => {
        writePulseCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "Legend-State 100x730 single cell write with cell listener",
      iterations: 2_000,
      setup: () => {
        const state = createLegendTableState();
        state.dispose = getLegendTablePoint(
          state.table,
          42,
          511,
        ).value.onChange(() => {});
        return state;
      },
      task: (state) => {
        writeLegendCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "MobX 100x730 single cell write with cell listener",
      iterations: 2_000,
      setup: () => {
        const state = createMobxTableState();
        state.dispose = observe(
          getMobxTablePoint(state.table, 42, 511),
          "value",
          () => {},
        );
        return state;
      },
      task: (state) => {
        writeMobxCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "valtio 100x730 single cell write with cell listener",
      iterations: 2_000,
      setup: () => {
        const state = createValtioTableState();
        state.unsubscribe = subscribeValtioSync(
          getValtioTablePoint(state.table, 42, 511),
          () => {},
        );
        return state;
      },
      task: (state) => {
        writeValtioCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "pulse 100x730 single cell write with row listener",
      iterations: 2_000,
      setup: () => {
        const state = createPulseTableState();
        state.unsubscribe = state.table.rows[42]?.on(() => {});
        return state;
      },
      task: (state) => {
        writePulseCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "Legend-State 100x730 single cell write with row listener",
      iterations: 2_000,
      setup: () => {
        const state = createLegendTableState();
        state.dispose = state.table.rows[42].onChange(() => {});
        return state;
      },
      task: (state) => {
        writeLegendCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "MobX 100x730 single cell write with row listener",
      iterations: 500,
      setup: () => {
        const state = createMobxTableState();
        state.dispose = autorun(() => {
          trackMobxRow(state.table.rows[42]);
        });
        return state;
      },
      task: (state) => {
        writeMobxCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "valtio 100x730 single cell write with row listener",
      iterations: 1_000,
      setup: () => {
        const state = createValtioTableState();
        state.unsubscribe = subscribeValtioSync(state.table.rows[42], () => {});
        return state;
      },
      task: (state) => {
        writeValtioCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "pulse 100x730 single cell write with root listener",
      iterations: 1_000,
      setup: () => {
        const state = createPulseTableState();
        state.unsubscribe = state.table.on(() => {});
        return state;
      },
      task: (state) => {
        writePulseCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "Legend-State 100x730 single cell write with root listener",
      iterations: 1_000,
      setup: () => {
        const state = createLegendTableState();
        state.dispose = state.table.onChange(() => {});
        return state;
      },
      task: (state) => {
        writeLegendCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "MobX 100x730 single cell write with root listener",
      iterations: 50,
      setup: () => {
        const state = createMobxTableState();
        state.dispose = autorun(() => {
          trackMobxTable(state.table);
        });
        return state;
      },
      task: (state) => {
        writeMobxCell(state, 42, 511);
      },
      teardown: (state) => {
        state.dispose?.();
      },
    },
    {
      name: "valtio 100x730 single cell write with root listener",
      iterations: 100,
      setup: () => {
        const state = createValtioTableState();
        state.unsubscribe = subscribeValtioSync(state.table, () => {});
        return state;
      },
      task: (state) => {
        writeValtioCell(state, 42, 511);
      },
      teardown: (state) => {
        state.unsubscribe?.();
      },
    },
    {
      name: "pulse 100x730 visible window listeners and cell write",
      iterations: 500,
      setup: () => {
        const state = createPulseTableState();
        state.unsubscribers = [];

        for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
          for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
            const unsubscribe = getTableCell(
              state.table,
              rowIndex,
              dayIndex,
            )?.on(() => {});
            if (unsubscribe) {
              state.unsubscribers.push(unsubscribe);
            }
          }
        }

        return state;
      },
      task: (state) => {
        writePulseCell(state, 42, 511);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
    {
      name: "Legend-State 100x730 visible window listeners and cell write",
      iterations: 500,
      setup: () => {
        const state = createLegendTableState();
        state.disposers = [];

        for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
          for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
            state.disposers.push(
              getLegendTablePoint(
                state.table,
                rowIndex,
                dayIndex,
              ).value.onChange(() => {}),
            );
          }
        }

        return state;
      },
      task: (state) => {
        writeLegendCell(state, 42, 511);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "MobX 100x730 visible window listeners and cell write",
      iterations: 200,
      setup: () => {
        const state = createMobxTableState();
        state.disposers = [];

        for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
          for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
            state.disposers.push(
              observe(
                state.table.rows[rowIndex].points[dayIndex],
                "value",
                () => {},
              ),
            );
          }
        }

        return state;
      },
      task: (state) => {
        writeMobxCell(state, 42, 511);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "valtio 100x730 visible window listeners and cell write",
      iterations: 250,
      setup: () => {
        const state = createValtioTableState();
        state.unsubscribers = [];

        for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
          for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
            state.unsubscribers.push(
              subscribeValtioSync(
                state.table.rows[rowIndex].points[dayIndex],
                () => {},
              ),
            );
          }
        }

        return state;
      },
      task: (state) => {
        writeValtioCell(state, 42, 511);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
    {
      name: "pulse 100x730 first month write across first 50 rows",
      iterations: 50,
      setup: () => createPulseBulkState(false),
      task: (state) => {
        writePulseFirstMonth(state);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
    {
      name: "Legend-State 100x730 first month write across first 50 rows",
      iterations: 50,
      setup: () => createLegendBulkState(false),
      task: (state) => {
        writeLegendFirstMonth(state);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "MobX 100x730 first month write across first 50 rows",
      iterations: 50,
      setup: () => createMobxBulkState(false),
      task: (state) => {
        writeMobxFirstMonth(state);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "valtio 100x730 first month write across first 50 rows",
      iterations: 50,
      setup: () => createValtioBulkState(false),
      task: (state) => {
        writeValtioFirstMonth(state);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
    {
      name: "pulse 100x730 first month write across first 50 rows with row listeners",
      iterations: 50,
      setup: () => createPulseBulkState(true),
      task: (state) => {
        writePulseFirstMonth(state);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
    {
      name: "Legend-State 100x730 first month write across first 50 rows with row listeners",
      iterations: 50,
      setup: () => createLegendBulkState(true),
      task: (state) => {
        writeLegendFirstMonth(state);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "MobX 100x730 first month write across first 50 rows with row listeners",
      iterations: 25,
      setup: () => createMobxBulkState(true),
      task: (state) => {
        writeMobxFirstMonth(state);
      },
      teardown: (state) => {
        for (const dispose of state.disposers) {
          dispose();
        }
      },
    },
    {
      name: "valtio 100x730 first month write across first 50 rows with row listeners",
      iterations: 25,
      setup: () => createValtioBulkState(true),
      task: (state) => {
        writeValtioFirstMonth(state);
      },
      teardown: (state) => {
        for (const unsubscribe of state.unsubscribers) {
          unsubscribe();
        }
      },
    },
  ];
}

export function runComparisonBenchmarkSuite(options = {}) {
  return runBenchmarkSuite(
    "comparison benchmark",
    [
      {
        title: "Primitive Root Write",
        cases: [
          {
            name: "pulse",
            iterations: 10_000,
            task: () => {
              const count = pulse(0);
              count.set(1);
            },
          },
          {
            name: "Legend-State",
            iterations: 10_000,
            task: () => {
              const count$ = legendObservable(0);
              count$.set(1);
            },
          },
          {
            name: "MobX",
            iterations: 10_000,
            task: () => {
              const count = createMobxBox(0);
              runInAction(() => {
                count.set(1);
              });
            },
          },
          {
            name: "valtio",
            iterations: 10_000,
            task: () => {
              const state = proxy({ count: 0 });
              state.count = 1;
            },
          },
        ],
      },
      {
        title: "Deep Nested Leaf Write",
        cases: [
          {
            name: "pulse",
            iterations: 1_000,
            task: () => {
              const depth = 50;
              const state = pulse(createDeepState(depth));
              let node = state;

              for (let level = 0; level < depth; level += 1) {
                node = node.child;
              }

              node.leaf.set(1);
            },
          },
          {
            name: "Legend-State",
            iterations: 1_000,
            task: () => {
              const depth = 50;
              const state$ = legendObservable(createDeepState(depth));
              let node = state$;

              for (let level = 0; level < depth; level += 1) {
                node = node.child;
              }

              node.leaf.set(1);
            },
          },
          {
            name: "MobX",
            iterations: 1_000,
            task: () => {
              const depth = 50;
              const state = mobxObservable(createDeepState(depth));
              let node = state;

              for (let level = 0; level < depth; level += 1) {
                node = node.child;
              }

              runInAction(() => {
                node.leaf = 1;
              });
            },
          },
          {
            name: "valtio",
            iterations: 1_000,
            task: () => {
              const depth = 50;
              const state = proxy(createDeepState(depth));
              let node = state;

              for (let level = 0; level < depth; level += 1) {
                node = node.child;
              }

              node.leaf = 1;
            },
          },
        ],
      },
      {
        title: "Array Item Field Write",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              users[0]?.name.set("Grace");
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            task: () => {
              const users$ = legendObservable(createUsers(2));
              users$[0].name.set("Grace");
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            task: () => {
              const users = mobxObservable(createUsers(2));
              runInAction(() => {
                users[0].name = "Grace";
              });
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            task: () => {
              const users = proxy(createUsers(2));
              users[0].name = "Grace";
            },
          },
        ],
      },
      {
        title: "Whole Array Multi-Row Replace",
        cases: [
          {
            name: "pulse",
            iterations: 1_000,
            task: () => {
              const state = pulse({ users: createUsers(200) });
              state.users.set(
                replaceManyUsers(state.users.get(), [5, 25, 50, 75, 100, 125]),
              );
            },
          },
          {
            name: "Legend-State",
            iterations: 1_000,
            task: () => {
              const state$ = legendObservable({ users: createUsers(200) });
              state$.users.set(
                replaceManyUsers(state$.users.get(), [5, 25, 50, 75, 100, 125]),
              );
            },
          },
          {
            name: "MobX",
            iterations: 1_000,
            task: () => {
              const state = mobxObservable({ users: createUsers(200) });
              runInAction(() => {
                state.users = replaceManyUsers(
                  state.users,
                  [5, 25, 50, 75, 100, 125],
                );
              });
            },
          },
          {
            name: "valtio",
            iterations: 1_000,
            task: () => {
              const state = proxy({ users: createUsers(200) });
              state.users = replaceManyUsers(
                state.users,
                [5, 25, 50, 75, 100, 125],
              );
            },
          },
        ],
      },
      {
        title: "Store Creation Cost",
        cases: [
          {
            name: "pulse",
            iterations: 1_000,
            task: () => {
              pulse(createUsers(100));
            },
          },
          {
            name: "Legend-State",
            iterations: 1_000,
            task: () => {
              legendObservable(createUsers(100));
            },
          },
          {
            name: "MobX",
            iterations: 1_000,
            task: () => {
              mobxObservable(createUsers(100));
            },
          },
          {
            name: "valtio",
            iterations: 1_000,
            task: () => {
              proxy(createUsers(100));
            },
          },
        ],
      },
      {
        title: "Wide Array Item Replace",
        cases: [
          {
            name: "pulse",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(10_000));
              users[9_999].set({ id: 9_999, name: "Grace", age: 30 });
            },
          },
          {
            name: "Legend-State",
            iterations: 1_000,
            task: () => {
              const users$ = legendObservable(createUsers(10_000));
              users$[9_999].set({ id: 9_999, name: "Grace", age: 30 });
            },
          },
          {
            name: "MobX",
            iterations: 1_000,
            task: () => {
              const users = mobxObservable(createUsers(10_000));
              runInAction(() => {
                users[9_999] = { id: 9_999, name: "Grace", age: 30 };
              });
            },
          },
          {
            name: "valtio",
            iterations: 1_000,
            task: () => {
              const users = proxy(createUsers(10_000));
              users[9_999] = { id: 9_999, name: "Grace", age: 30 };
            },
          },
        ],
      },
      {
        title: "Root Subscription Write",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            task: () => {
              const state = pulse({ count: 0 });
              const unsubscribe = state.on(() => {});
              state.count.set(1);
              unsubscribe();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            task: () => {
              const state$ = legendObservable({ count: 0 });
              const dispose = state$.onChange(() => {});
              state$.count.set(1);
              dispose();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            task: () => {
              const state = mobxObservable({ count: 0 });
              const dispose = autorun(() => {
                state.count;
              });
              runInAction(() => {
                state.count = 1;
              });
              dispose();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            task: () => {
              const state = proxy({ count: 0 });
              const unsubscribe = subscribeValtioSync(state, () => {});
              state.count = 1;
              unsubscribe();
            },
          },
        ],
      },
      {
        title: "Leaf Subscription Write",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users[0]?.name.on(() => {});
              users[0]?.name.set("Grace");
              unsubscribe?.();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            task: () => {
              const users$ = legendObservable(createUsers(2));
              const dispose = users$[0].name.onChange(() => {});
              users$[0].name.set("Grace");
              dispose();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            task: () => {
              const users = mobxObservable(createUsers(2));
              const dispose = observe(users[0], "name", () => {});
              runInAction(() => {
                users[0].name = "Grace";
              });
              dispose();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            task: () => {
              const users = proxy(createUsers(2));
              const unsubscribe = subscribeValtioSync(users[0], () => {});
              users[0].name = "Grace";
              unsubscribe();
            },
          },
        ],
      },
      {
        title: "Editable Table Costs",
        cases: createEditableTableComparisonCases(),
      },
    ],
    options,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runComparisonBenchmarkSuite();
}
