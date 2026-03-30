import { fileURLToPath } from "node:url";
import { pulse } from "../dist/index.js";
import {
  createDeepState,
  createEditableTable,
  createNestedUsers,
  createUsers,
  getDeepLeaf,
  getNestedUsers,
  getTableCell,
  replaceManyUsers,
  runBenchmarkSuite,
} from "./shared.mjs";

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
            name: "deep object subtree replace",
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
        title: "Subscription Costs",
        cases: [
          {
            name: "leaf listener write",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users[0]?.name.on(() => {});
              users[0]?.name.set("Grace");
              unsubscribe?.();
            },
          },
          {
            name: "item listener write",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users[0]?.on(() => {});
              users[0]?.set({ id: 0, name: "Grace", age: 30 });
              unsubscribe?.();
            },
          },
          {
            name: "root listener write",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users.on(() => {});
              users[0]?.set({ id: 0, name: "Grace", age: 30 });
              unsubscribe();
            },
          },
          {
            name: "root listener with key filter",
            iterations: 5_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribe = users.on((event) => {
                event.changes.some((change) => change.key === "name");
              });
              users[0]?.name.set("Grace");
              unsubscribe();
            },
          },
          {
            name: "root listener with multi-key scan",
            iterations: 2_000,
            task: () => {
              const users = pulse(createUsers(1_000));
              const unsubscribe = users.on((event) => {
                const changedName = event.changes.some(
                  (change) => change.key === "name",
                );
                const changedAge = event.changes.some(
                  (change) => change.key === "age",
                );

                if (!changedName || !changedAge) {
                  throw new Error("Expected both name and age mutations.");
                }
              });

              users.set(replaceManyUsers(users.get(), [0, 25, 250, 999]));
              unsubscribe();
            },
          },
          {
            name: "root listener with multi-key scan in root batch",
            iterations: 2_000,
            task: () => {
              const users = pulse(createUsers(1_000));
              const unsubscribe = users.on((event) => {
                const changedName = event.changes.some(
                  (change) => change.key === "name",
                );
                const changedAge = event.changes.some(
                  (change) => change.key === "age",
                );

                if (!changedName || !changedAge) {
                  throw new Error("Expected both name and age mutations.");
                }
              });

              users.batch(() => {
                users.set(replaceManyUsers(users.get(), [0, 25, 250, 999]));
              });
              unsubscribe();
            },
          },
          {
            name: "ancestor listener fanout",
            iterations: 2_000,
            task: () => {
              const state = pulse({ user: { profile: { name: "Ada" } } });
              const unsubscribe = state.on(() => {});
              state.user.profile.name.set("Grace");
              unsubscribe();
            },
          },
          {
            name: "ten leaf listeners on same node",
            iterations: 2_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 10 }, () =>
                users[0]?.name.on(() => {}),
              );

              users[0]?.name.set("Grace");

              for (const unsubscribe of unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "hundred leaf listeners on same node",
            iterations: 1_000,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 100 }, () =>
                users[0]?.name.on(() => {}),
              );

              users[0]?.name.set("Grace");

              for (const unsubscribe of unsubscribers) {
                unsubscribe?.();
              }
            },
          },
          {
            name: "thousand leaf listeners on same node",
            iterations: 250,
            task: () => {
              const users = pulse(createUsers(2));
              const unsubscribers = Array.from({ length: 1_000 }, () =>
                users[0]?.name.on(() => {}),
              );

              users[0]?.name.set("Grace");

              for (const unsubscribe of unsubscribers) {
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
            name: "100x730 single cell write with root key filter",
            iterations: 1_000,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribe = table.on((event) => {
                event.changes.some((change) => change.key === "value");
              });
              getTableCell(table, 42, 511)?.set(123);
              unsubscribe();
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
          {
            name: "100x730 first month write across first 50 rows with root key filter",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribe = table.on((event) => {
                event.changes.some((change) => change.key === "value");
              });

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                  getTableCell(table, rowIndex, dayIndex)?.set(
                    rowIndex + dayIndex,
                  );
                }
              }

              unsubscribe();
            },
          },
          {
            name: "100x730 first month write across first 50 rows with root key filter in root batch",
            iterations: 100,
            task: () => {
              const table = pulse(createEditableTable(100, 730));
              const unsubscribe = table.on((event) => {
                event.changes.some((change) => change.key === "value");
              });

              table.batch(() => {
                for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
                    getTableCell(table, rowIndex, dayIndex)?.set(
                      rowIndex + dayIndex,
                    );
                  }
                }
              });

              unsubscribe();
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
