import { fileURLToPath } from "node:url";
import { pulse } from "../dist/index.js";
import {
  createDeepState,
  createEditableTable,
  createMarketRows,
  createNestedUsers,
  createUsers,
  createWorkspaceState,
  getDeepLeaf,
  getNestedUsers,
  getTableCell,
  replaceManyUsers,
  runBenchmarkSuite,
} from "./shared.mjs";

function attachPulseVisibleWindowListeners(table) {
  const unsubscribers = [];

  for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
    for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
      const unsubscribe = getTableCell(table, rowIndex, dayIndex)?.on(() => {});

      if (unsubscribe) {
        unsubscribers.push(unsubscribe);
      }
    }
  }

  return unsubscribers;
}

function disposeCallbacks(callbacks) {
  for (const callback of callbacks) {
    callback();
  }
}

export function runPulseBenchmarkSuite(options = {}) {
  return runBenchmarkSuite(
    "pulse benchmark",
    [
      {
        title: "Read Costs",
        cases: [
          {
            name: "root get",
            iterations: 25_000,
            task: () => {
              const state = pulse({ count: 1 });
              state.get();
            },
          },
          {
            name: "deep leaf get",
            iterations: 10_000,
            task: () => {
              const depth = 200;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).get();
            },
          },
        ],
      },
      {
        title: "Hot Read Costs",
        cases: [
          {
            name: "root get on reused state",
            iterations: 50_000,
            setup: () => ({ state: pulse({ count: 1 }) }),
            task: (context) => {
              context.state.get();
            },
          },
          {
            name: "deep leaf get on reused state",
            iterations: 25_000,
            setup: () => {
              const depth = 200;

              return {
                depth,
                state: pulse(createDeepState(depth)),
              };
            },
            task: (context) => {
              getDeepLeaf(context.state, context.depth).get();
            },
          },
          {
            name: "editable table cell get on reused state",
            iterations: 25_000,
            setup: () => ({ table: pulse(createEditableTable(100, 730)) }),
            task: (context) => {
              getTableCell(context.table, 42, 511)?.get();
            },
          },
        ],
      },
      {
        title: "Focused Writes",
        cases: [
          {
            name: "primitive root write",
            iterations: 10_000,
            task: () => {
              const count = pulse(0);
              count.set(1);
            },
          },
          {
            name: "deep leaf write",
            iterations: 2_000,
            task: () => {
              const depth = 200;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).set(1);
            },
          },
          {
            name: "wide array item replace",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(10_000));
              users[9_999].set({ id: 9_999, name: "Grace", age: 30 });
            },
          },
          {
            name: "array leaf field write",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              users[0]?.name.set("Grace");
            },
          },
          {
            name: "array item multi-key replace",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              users[0]?.set({ id: 0, name: "Grace", age: 31 });
            },
          },
        ],
      },
      {
        title: "Path Depth Scaling",
        cases: [
          {
            name: "depth 5 leaf write",
            iterations: 5_000,
            task: () => {
              const depth = 5;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).set(1);
            },
          },
          {
            name: "depth 25 leaf write",
            iterations: 3_000,
            task: () => {
              const depth = 25;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).set(1);
            },
          },
          {
            name: "depth 100 leaf write",
            iterations: 1_500,
            task: () => {
              const depth = 100;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).set(1);
            },
          },
          {
            name: "depth 200 leaf write",
            iterations: 1_000,
            task: () => {
              const depth = 200;
              const state = pulse(createDeepState(depth));
              getDeepLeaf(state, depth).set(1);
            },
          },
        ],
      },
      {
        title: "Structural Writes",
        cases: [
          {
            name: "sparse array growth",
            iterations: 2_000,
            task: () => {
              const rows = pulse([{ title: "A" }]);
              rows[25].set({ title: "Z" });
            },
          },
          {
            name: "array truncate via length",
            iterations: 2_000,
            task: () => {
              const rows = pulse(createUsers(1_000));
              rows.length.set(10);
            },
          },
          {
            name: "deep object branch replace",
            iterations: 2_000,
            task: () => {
              const depth = 25;
              const state = pulse(createNestedUsers(depth));
              getNestedUsers(state, depth).set(createUsers(2));
            },
          },
          {
            name: "whole array multi-row replace",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(1_000));
              users.set(replaceManyUsers(users.get(), [0, 25, 250, 999]));
            },
          },
          {
            name: "whole array multi-row replace in root batch",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(1_000));
              users.batch(() => {
                users.set(replaceManyUsers(users.get(), [0, 25, 250, 999]));
              });
            },
          },
        ],
      },
      {
        title: "General App Write Costs",
        cases: [
          {
            name: "nested object leaf write",
            iterations: 5_000,
            task: () => {
              const state = pulse(createWorkspaceState(4, 8));
              state.session.user.profile.name.set("Ren");
            },
          },
          {
            name: "mixed array object leaf write",
            iterations: 3_000,
            task: () => {
              const state = pulse(createWorkspaceState(24, 32));
              state.projects[12]?.tasks[18]?.done.set(true);
            },
          },
          {
            name: "batched sibling object writes",
            iterations: 3_000,
            task: () => {
              const state = pulse(createWorkspaceState(4, 8));

              state.batch(() => {
                state.session.preferences.theme.set("dark");
                state.session.preferences.density.set("compact");
                state.session.preferences.locale.set("ja-JP");
              });
            },
          },
          {
            name: "batched list item multi-field writes",
            iterations: 1_500,
            task: () => {
              const state = pulse(createWorkspaceState(24, 32));

              state.batch(() => {
                state.projects[12]?.tasks[18]?.title.set("Updated task");
                state.projects[12]?.tasks[18]?.done.set(true);
                state.projects[12]?.tasks[18]?.priority.set(3);
              });
            },
          },
        ],
      },
      {
        title: "Subscription Lifecycle Costs",
        cases: [
          {
            name: "root listener subscribe and unsubscribe",
            iterations: 5_000,
            task: () => {
              const state = pulse({ count: 0 });
              const unsubscribe = state.on(() => {});
              unsubscribe();
            },
          },
          {
            name: "leaf listener subscribe and unsubscribe",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users[0]?.name.on(() => {});
              unsubscribe?.();
            },
          },
          {
            name: "item listener subscribe and unsubscribe",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users[0]?.on(() => {});
              unsubscribe?.();
            },
          },
          {
            name: "market row listener subscribe and unsubscribe",
            iterations: 5_000,
            task: () => {
              const rows = pulse(createMarketRows(64));
              const unsubscribe = rows[12]?.on(() => {});
              unsubscribe?.();
            },
          },
          {
            name: "ten leaf listeners subscribe and unsubscribe",
            iterations: 2_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 10 }, () =>
                users[0]?.name.on(() => {}),
              );

              for (const unsubscribe of unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "hundred leaf listeners subscribe and unsubscribe",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 100 }, () =>
                users[0]?.name.on(() => {}),
              );

              for (const unsubscribe of unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "thousand leaf listeners subscribe and unsubscribe",
            iterations: 250,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 1_000 }, () =>
                users[0]?.name.on(() => {}),
              );

              for (const unsubscribe of unsubscribers) {
                unsubscribe?.();
              }
            },
          },
        ],
      },
      {
        title: "Editable Table Subscription Lifecycle Costs",
        cases: [
          {
            name: "50 row listeners subscribe and unsubscribe",
            iterations: 500,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                const unsubscribe = table.rows[rowIndex]?.on(() => {});

                if (unsubscribe) {
                  unsubscribers.push(unsubscribe);
                }
              }

              disposeCallbacks(unsubscribers);
            },
          },
          {
            name: "visible window listeners subscribe and unsubscribe",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              disposeCallbacks(attachPulseVisibleWindowListeners(table));
            },
          },
        ],
      },
      {
        title: "Subscription Dispatch Costs",
        cases: [
          {
            name: "root listener write",
            iterations: 5_000,
            setup: () => {
              const state = pulse({ count: 0 });
              return {
                nextValue: 0,
                state,
                unsubscribe: state.on(() => {}),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.state.count.set(context.nextValue);
            },
            teardown: (context) => {
              context.unsubscribe();
            },
          },
          {
            name: "leaf listener write",
            iterations: 5_000,
            setup: () => {
              const users = pulse(createUsers(2));
              return {
                nextValue: 0,
                users,
                unsubscribe: users[0]?.name.on(() => {}),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.users[0]?.name.set(`Grace ${context.nextValue}`);
            },
            teardown: (context) => {
              context.unsubscribe?.();
            },
          },
          {
            name: "item listener write",
            iterations: 5_000,
            setup: () => {
              const users = pulse(createUsers(2));
              return {
                nextValue: 0,
                users,
                unsubscribe: users[0]?.on(() => {}),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.users[0]?.set({
                id: 0,
                name: `Grace ${context.nextValue}`,
                age: 30 + (context.nextValue % 10),
              });
            },
            teardown: (context) => {
              context.unsubscribe?.();
            },
          },
          {
            name: "market row listener replace",
            iterations: 5_000,
            setup: () => {
              const rows = pulse(createMarketRows(64));
              return {
                row: rows[12],
                unsubscribe: rows[12]?.on(() => {}),
              };
            },
            task: (context) => {
              const currentRow = context.row?.get();

              if (context.row && currentRow) {
                context.row.set({
                  ...currentRow,
                  price: currentRow.price + 1,
                  change: currentRow.change + 0.25,
                  volume: currentRow.volume + 500,
                  trades: currentRow.trades + 1,
                  heat: currentRow.heat + 1,
                });
              }
            },
            teardown: (context) => {
              context.unsubscribe?.();
            },
          },
          {
            name: "market row listener replace in root batch",
            iterations: 5_000,
            setup: () => {
              const rows = pulse(createMarketRows(64));
              return {
                rows,
                row: rows[12],
                unsubscribe: rows[12]?.on(() => {}),
              };
            },
            task: (context) => {
              const currentRow = context.row?.get();

              if (context.row && currentRow) {
                context.rows.batch(() => {
                  context.row.set({
                    ...currentRow,
                    price: currentRow.price + 1,
                    change: currentRow.change + 0.25,
                    volume: currentRow.volume + 500,
                    trades: currentRow.trades + 1,
                    heat: currentRow.heat + 1,
                  });
                });
              }
            },
            teardown: (context) => {
              context.unsubscribe?.();
            },
          },
          {
            name: "ten leaf listeners on same node",
            iterations: 2_000,
            setup: () => {
              const users = pulse(createUsers(2));
              return {
                nextValue: 0,
                users,
                unsubscribers: Array.from({ length: 10 }, () =>
                  users[0]?.name.on(() => {}),
                ),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.users[0]?.name.set(`Grace ${context.nextValue}`);
            },
            teardown: (context) => {
              for (const unsubscribe of context.unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "hundred leaf listeners on same node",
            iterations: 1_000,
            setup: () => {
              const users = pulse(createUsers(2));
              return {
                nextValue: 0,
                users,
                unsubscribers: Array.from({ length: 100 }, () =>
                  users[0]?.name.on(() => {}),
                ),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.users[0]?.name.set(`Grace ${context.nextValue}`);
            },
            teardown: (context) => {
              for (const unsubscribe of context.unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "thousand leaf listeners on same node",
            iterations: 250,
            setup: () => {
              const users = pulse(createUsers(2));
              return {
                nextValue: 0,
                users,
                unsubscribers: Array.from({ length: 1_000 }, () =>
                  users[0]?.name.on(() => {}),
                ),
              };
            },
            task: (context) => {
              context.nextValue += 1;
              context.users[0]?.name.set(`Grace ${context.nextValue}`);
            },
            teardown: (context) => {
              for (const unsubscribe of context.unsubscribers) {
                unsubscribe?.();
              }
            },
          },
        ],
      },
      {
        title: "Editable Table Costs",
        cases: [
          {
            name: "100x730 single cell write",
            iterations: 1_000,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              getTableCell(table, 42, 511)?.set(123);
            },
          },
          {
            name: "100x730 single cell write with cell listener",
            iterations: 1_000,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribe = getTableCell(table, 42, 511)?.on(() => {});
              getTableCell(table, 42, 511)?.set(123);
              unsubscribe?.();
            },
          },
          {
            name: "100x730 single cell write with row listener",
            iterations: 1_000,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribe = table.rows[42]?.on(() => {});
              getTableCell(table, 42, 511)?.set(123);
              unsubscribe?.();
            },
          },
          {
            name: "100x730 visible window listeners and cell write",
            iterations: 250,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribers = [];

              for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
                for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
                  const unsubscribe = getTableCell(
                    table,
                    rowIndex,
                    dayIndex,
                  )?.on(() => {});

                  if (unsubscribe) {
                    unsubscribers.push(unsubscribe);
                  }
                }
              }

              getTableCell(table, 42, 511)?.set(123);

              for (const unsubscribe of unsubscribers) {
                unsubscribe();
              }
            },
          },
          {
            name: "100x730 first month write across first 50 rows",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                  getTableCell(table, rowIndex, dayIndex)?.set(
                    rowIndex + dayIndex,
                  );
                }
              }
            },
          },
          {
            name: "100x730 first month write across first 50 rows in root batch",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));

              table.batch(() => {
                for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                    getTableCell(table, rowIndex, dayIndex)?.set(
                      rowIndex + dayIndex,
                    );
                  }
                }
              });
            },
          },
          {
            name: "100x730 first month write across first 50 rows with row listeners",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                const unsubscribe = table.rows[rowIndex]?.on(() => {});

                if (unsubscribe) {
                  unsubscribers.push(unsubscribe);
                }
              }

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                  getTableCell(table, rowIndex, dayIndex)?.set(
                    rowIndex + dayIndex,
                  );
                }
              }

              for (const unsubscribe of unsubscribers) {
                unsubscribe();
              }
            },
          },
          {
            name: "100x730 first month write across first 50 rows with row listeners in root batch",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                const unsubscribe = table.rows[rowIndex]?.on(() => {});

                if (unsubscribe) {
                  unsubscribers.push(unsubscribe);
                }
              }

              table.batch(() => {
                for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                    getTableCell(table, rowIndex, dayIndex)?.set(
                      rowIndex + dayIndex,
                    );
                  }
                }
              });

              for (const unsubscribe of unsubscribers) {
                unsubscribe();
              }
            },
          },
        ],
      },
    ],
    options,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPulseBenchmarkSuite();
}
