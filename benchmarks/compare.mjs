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
  createWorkspaceState,
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

function createPulseDeepReadState() {
  const depth = 100;

  return {
    depth,
    state: pulse(createDeepState(depth)),
  };
}

function createLegendDeepReadState() {
  const depth = 100;

  return {
    depth,
    state: legendObservable(createDeepState(depth)),
  };
}

function createMobxDeepReadState() {
  const depth = 100;

  return {
    depth,
    state: mobxObservable(createDeepState(depth)),
  };
}

function createValtioDeepReadState() {
  const depth = 100;

  return {
    depth,
    state: proxy(createDeepState(depth)),
  };
}

function readPulseDeepLeaf(state) {
  let node = state.state;

  for (let level = 0; level < state.depth; level += 1) {
    node = node.child;
  }

  node.leaf.get();
}

function readLegendDeepLeaf(state) {
  let node = state.state;

  for (let level = 0; level < state.depth; level += 1) {
    node = node.child;
  }

  node.leaf.get();
}

function readMobxDeepLeaf(state) {
  let node = state.state;

  for (let level = 0; level < state.depth; level += 1) {
    node = node.child;
  }

  node.leaf;
}

function readValtioDeepLeaf(state) {
  let node = state.state;

  for (let level = 0; level < state.depth; level += 1) {
    node = node.child;
  }

  node.leaf;
}

function readPulseTableCell(state) {
  getTableCell(state.table, 42, 511)?.get();
}

function readLegendTableCell(state) {
  getLegendTablePoint(state.table, 42, 511).value.get();
}

function readMobxTableCell(state) {
  getMobxTablePoint(state.table, 42, 511).value;
}

function readValtioTableCell(state) {
  getValtioTablePoint(state.table, 42, 511).value;
}

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

function attachLegendVisibleWindowListeners(table) {
  const disposers = [];

  for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
    for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
      disposers.push(
        getLegendTablePoint(table, rowIndex, dayIndex).value.onChange(() => {}),
      );
    }
  }

  return disposers;
}

function attachMobxVisibleWindowListeners(table) {
  const disposers = [];

  for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
    for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
      disposers.push(
        observe(table.rows[rowIndex].points[dayIndex], "value", () => {}),
      );
    }
  }

  return disposers;
}

function attachValtioVisibleWindowListeners(table) {
  const unsubscribers = [];

  for (let rowIndex = 20; rowIndex < 40; rowIndex += 1) {
    for (let dayIndex = 500; dayIndex < 530; dayIndex += 1) {
      unsubscribers.push(
        subscribeValtioSync(table.rows[rowIndex].points[dayIndex], () => {}),
      );
    }
  }

  return unsubscribers;
}

function disposeCallbacks(callbacks) {
  for (const callback of callbacks) {
    callback();
  }
}

function createPulseWorkspaceState() {
  return {
    workspace: pulse(createWorkspaceState(24, 32)),
    nextValue: 0,
  };
}

function createLegendWorkspaceState() {
  return {
    workspace: legendObservable(createWorkspaceState(24, 32)),
    nextValue: 0,
  };
}

function createMobxWorkspaceState() {
  return {
    workspace: mobxObservable(createWorkspaceState(24, 32)),
    nextValue: 0,
  };
}

function createValtioWorkspaceState() {
  return {
    workspace: proxy(createWorkspaceState(24, 32)),
    nextValue: 0,
  };
}

function createPulseRootSubscriptionState() {
  return {
    state: pulse({ count: 0 }),
    nextValue: 0,
  };
}

function createLegendRootSubscriptionState() {
  return {
    state: legendObservable({ count: 0 }),
    nextValue: 0,
  };
}

function createMobxRootSubscriptionState() {
  return {
    state: mobxObservable({ count: 0 }),
    nextValue: 0,
  };
}

function createValtioRootSubscriptionState() {
  return {
    state: proxy({ count: 0 }),
    nextValue: 0,
  };
}

function subscribePulseRoot(state, callback) {
  return state.state.on(callback);
}

function subscribeLegendRoot(state, callback) {
  return state.state.onChange(callback);
}

function subscribeMobxRoot(state, callback) {
  return autorun(() => {
    state.state.count;
    callback();
  });
}

function subscribeValtioRoot(state, callback) {
  return subscribeValtioSync(state.state, callback);
}

function writePulseRoot(state) {
  state.nextValue += 1;
  state.state.count.set(state.nextValue);
}

function writeLegendRoot(state) {
  state.nextValue += 1;
  state.state.count.set(state.nextValue);
}

function writeMobxRoot(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.state.count = state.nextValue;
  });
}

function writeValtioRoot(state) {
  state.nextValue += 1;
  state.state.count = state.nextValue;
}

function createPulseLeafSubscriptionState() {
  return {
    users: pulse(createUsers(2)),
    nextValue: 0,
  };
}

function createLegendLeafSubscriptionState() {
  return {
    users: legendObservable(createUsers(2)),
    nextValue: 0,
  };
}

function createMobxLeafSubscriptionState() {
  return {
    users: mobxObservable(createUsers(2)),
    nextValue: 0,
  };
}

function createValtioLeafSubscriptionState() {
  return {
    users: proxy(createUsers(2)),
    nextValue: 0,
  };
}

function subscribePulseLeaf(state, callback) {
  return state.users[0]?.name.on(callback);
}

function subscribeLegendLeaf(state, callback) {
  return state.users[0].name.onChange(callback);
}

function subscribeMobxLeaf(state, callback) {
  return observe(state.users[0], "name", callback);
}

function subscribeValtioLeaf(state, callback) {
  return subscribeValtioSync(state.users[0], callback);
}

function writePulseLeaf(state) {
  state.nextValue += 1;
  state.users[0]?.name.set(`User ${state.nextValue}`);
}

function writeLegendLeaf(state) {
  state.nextValue += 1;
  state.users[0].name.set(`User ${state.nextValue}`);
}

function writeMobxLeaf(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.users[0].name = `User ${state.nextValue}`;
  });
}

function writeValtioLeaf(state) {
  state.nextValue += 1;
  state.users[0].name = `User ${state.nextValue}`;
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

function writePulseWorkspaceProfileName(state) {
  state.nextValue += 1;
  state.workspace.session.user.profile.name.set(`User ${state.nextValue}`);
}

function writeLegendWorkspaceProfileName(state) {
  state.nextValue += 1;
  state.workspace.session.user.profile.name.set(`User ${state.nextValue}`);
}

function writeMobxWorkspaceProfileName(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.workspace.session.user.profile.name = `User ${state.nextValue}`;
  });
}

function writeValtioWorkspaceProfileName(state) {
  state.nextValue += 1;
  state.workspace.session.user.profile.name = `User ${state.nextValue}`;
}

function writePulseWorkspaceTaskDone(state) {
  state.nextValue += 1;
  state.workspace.projects[12]?.tasks[18]?.done.set(state.nextValue % 2 === 0);
}

function writeLegendWorkspaceTaskDone(state) {
  state.nextValue += 1;
  state.workspace.projects[12].tasks[18].done.set(state.nextValue % 2 === 0);
}

function writeMobxWorkspaceTaskDone(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.workspace.projects[12].tasks[18].done = state.nextValue % 2 === 0;
  });
}

function writeValtioWorkspaceTaskDone(state) {
  state.nextValue += 1;
  state.workspace.projects[12].tasks[18].done = state.nextValue % 2 === 0;
}

function writePulseWorkspacePreferences(state) {
  state.nextValue += 1;
  state.workspace.batch(() => {
    state.workspace.session.preferences.theme.set(
      state.nextValue % 2 === 0 ? "dark" : "light",
    );
    state.workspace.session.preferences.density.set(
      state.nextValue % 2 === 0 ? "compact" : "comfortable",
    );
    state.workspace.session.preferences.locale.set(
      state.nextValue % 2 === 0 ? "ja-JP" : "en-US",
    );
  });
}

function writeLegendWorkspacePreferences(state) {
  state.nextValue += 1;
  legendBatch(() => {
    state.workspace.session.preferences.theme.set(
      state.nextValue % 2 === 0 ? "dark" : "light",
    );
    state.workspace.session.preferences.density.set(
      state.nextValue % 2 === 0 ? "compact" : "comfortable",
    );
    state.workspace.session.preferences.locale.set(
      state.nextValue % 2 === 0 ? "ja-JP" : "en-US",
    );
  });
}

function writeMobxWorkspacePreferences(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.workspace.session.preferences.theme =
      state.nextValue % 2 === 0 ? "dark" : "light";
    state.workspace.session.preferences.density =
      state.nextValue % 2 === 0 ? "compact" : "comfortable";
    state.workspace.session.preferences.locale =
      state.nextValue % 2 === 0 ? "ja-JP" : "en-US";
  });
}

function writeValtioWorkspacePreferences(state) {
  state.nextValue += 1;
  state.workspace.session.preferences.theme =
    state.nextValue % 2 === 0 ? "dark" : "light";
  state.workspace.session.preferences.density =
    state.nextValue % 2 === 0 ? "compact" : "comfortable";
  state.workspace.session.preferences.locale =
    state.nextValue % 2 === 0 ? "ja-JP" : "en-US";
}

function writePulseWorkspaceTaskFields(state) {
  state.nextValue += 1;
  state.workspace.batch(() => {
    state.workspace.projects[12]?.tasks[18]?.title.set(
      `Task ${state.nextValue}`,
    );
    state.workspace.projects[12]?.tasks[18]?.done.set(
      state.nextValue % 2 === 0,
    );
    state.workspace.projects[12]?.tasks[18]?.priority.set(state.nextValue % 4);
  });
}

function writeLegendWorkspaceTaskFields(state) {
  state.nextValue += 1;
  legendBatch(() => {
    state.workspace.projects[12].tasks[18].title.set(`Task ${state.nextValue}`);
    state.workspace.projects[12].tasks[18].done.set(state.nextValue % 2 === 0);
    state.workspace.projects[12].tasks[18].priority.set(state.nextValue % 4);
  });
}

function writeMobxWorkspaceTaskFields(state) {
  state.nextValue += 1;
  runInAction(() => {
    state.workspace.projects[12].tasks[18].title = `Task ${state.nextValue}`;
    state.workspace.projects[12].tasks[18].done = state.nextValue % 2 === 0;
    state.workspace.projects[12].tasks[18].priority = state.nextValue % 4;
  });
}

function writeValtioWorkspaceTaskFields(state) {
  state.nextValue += 1;
  state.workspace.projects[12].tasks[18].title = `Task ${state.nextValue}`;
  state.workspace.projects[12].tasks[18].done = state.nextValue % 2 === 0;
  state.workspace.projects[12].tasks[18].priority = state.nextValue % 4;
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
        title: "Hot Read Costs",
        cases: [
          {
            name: "pulse root read",
            iterations: 25_000,
            setup: createPulseRootSubscriptionState,
            task: (state) => {
              state.state.get();
            },
          },
          {
            name: "Legend-State root read",
            iterations: 25_000,
            setup: createLegendRootSubscriptionState,
            task: (state) => {
              state.state.get();
            },
          },
          {
            name: "MobX root read",
            iterations: 25_000,
            setup: createMobxRootSubscriptionState,
            task: (state) => {
              state.state.count;
            },
          },
          {
            name: "valtio root read",
            iterations: 25_000,
            setup: createValtioRootSubscriptionState,
            task: (state) => {
              state.state.count;
            },
          },
          {
            name: "pulse deep leaf read",
            iterations: 10_000,
            setup: createPulseDeepReadState,
            task: readPulseDeepLeaf,
          },
          {
            name: "Legend-State deep leaf read",
            iterations: 10_000,
            setup: createLegendDeepReadState,
            task: readLegendDeepLeaf,
          },
          {
            name: "MobX deep leaf read",
            iterations: 10_000,
            setup: createMobxDeepReadState,
            task: readMobxDeepLeaf,
          },
          {
            name: "valtio deep leaf read",
            iterations: 10_000,
            setup: createValtioDeepReadState,
            task: readValtioDeepLeaf,
          },
          {
            name: "pulse table cell read",
            iterations: 25_000,
            setup: createPulseTableState,
            task: readPulseTableCell,
          },
          {
            name: "Legend-State table cell read",
            iterations: 25_000,
            setup: createLegendTableState,
            task: readLegendTableCell,
          },
          {
            name: "MobX table cell read",
            iterations: 25_000,
            setup: createMobxTableState,
            task: readMobxTableCell,
          },
          {
            name: "valtio table cell read",
            iterations: 25_000,
            setup: createValtioTableState,
            task: readValtioTableCell,
          },
        ],
      },
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
        title: "General App Cold Update",
        cases: [
          {
            name: "pulse nested object leaf",
            iterations: 3_000,
            task: () => {
              const state = pulse(createWorkspaceState(24, 32));
              state.session.user.profile.name.set("Ren");
            },
          },
          {
            name: "Legend-State nested object leaf",
            iterations: 3_000,
            task: () => {
              const state = legendObservable(createWorkspaceState(24, 32));
              state.session.user.profile.name.set("Ren");
            },
          },
          {
            name: "MobX nested object leaf",
            iterations: 3_000,
            task: () => {
              const state = mobxObservable(createWorkspaceState(24, 32));
              runInAction(() => {
                state.session.user.profile.name = "Ren";
              });
            },
          },
          {
            name: "valtio nested object leaf",
            iterations: 3_000,
            task: () => {
              const state = proxy(createWorkspaceState(24, 32));
              state.session.user.profile.name = "Ren";
            },
          },
        ],
      },
      {
        title: "General App Hot Writes",
        cases: [
          {
            name: "pulse nested object leaf write",
            iterations: 5_000,
            setup: createPulseWorkspaceState,
            task: writePulseWorkspaceProfileName,
          },
          {
            name: "Legend-State nested object leaf write",
            iterations: 5_000,
            setup: createLegendWorkspaceState,
            task: writeLegendWorkspaceProfileName,
          },
          {
            name: "MobX nested object leaf write",
            iterations: 5_000,
            setup: createMobxWorkspaceState,
            task: writeMobxWorkspaceProfileName,
          },
          {
            name: "valtio nested object leaf write",
            iterations: 5_000,
            setup: createValtioWorkspaceState,
            task: writeValtioWorkspaceProfileName,
          },
          {
            name: "pulse mixed array object leaf write",
            iterations: 3_000,
            setup: createPulseWorkspaceState,
            task: writePulseWorkspaceTaskDone,
          },
          {
            name: "Legend-State mixed array object leaf write",
            iterations: 3_000,
            setup: createLegendWorkspaceState,
            task: writeLegendWorkspaceTaskDone,
          },
          {
            name: "MobX mixed array object leaf write",
            iterations: 3_000,
            setup: createMobxWorkspaceState,
            task: writeMobxWorkspaceTaskDone,
          },
          {
            name: "valtio mixed array object leaf write",
            iterations: 3_000,
            setup: createValtioWorkspaceState,
            task: writeValtioWorkspaceTaskDone,
          },
          {
            name: "pulse batched sibling object writes",
            iterations: 3_000,
            setup: createPulseWorkspaceState,
            task: writePulseWorkspacePreferences,
          },
          {
            name: "Legend-State batched sibling object writes",
            iterations: 3_000,
            setup: createLegendWorkspaceState,
            task: writeLegendWorkspacePreferences,
          },
          {
            name: "MobX batched sibling object writes",
            iterations: 3_000,
            setup: createMobxWorkspaceState,
            task: writeMobxWorkspacePreferences,
          },
          {
            name: "valtio batched sibling object writes",
            iterations: 3_000,
            setup: createValtioWorkspaceState,
            task: writeValtioWorkspacePreferences,
          },
          {
            name: "pulse batched list item multi-field writes",
            iterations: 1_500,
            setup: createPulseWorkspaceState,
            task: writePulseWorkspaceTaskFields,
          },
          {
            name: "Legend-State batched list item multi-field writes",
            iterations: 1_500,
            setup: createLegendWorkspaceState,
            task: writeLegendWorkspaceTaskFields,
          },
          {
            name: "MobX batched list item multi-field writes",
            iterations: 1_500,
            setup: createMobxWorkspaceState,
            task: writeMobxWorkspaceTaskFields,
          },
          {
            name: "valtio batched list item multi-field writes",
            iterations: 1_500,
            setup: createValtioWorkspaceState,
            task: writeValtioWorkspaceTaskFields,
          },
        ],
      },
      {
        title: "Root Subscription Lifecycle",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            setup: createPulseRootSubscriptionState,
            task: (state) => {
              const unsubscribe = subscribePulseRoot(state, () => {});
              unsubscribe();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            setup: createLegendRootSubscriptionState,
            task: (state) => {
              const dispose = subscribeLegendRoot(state, () => {});
              dispose();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            setup: createMobxRootSubscriptionState,
            task: (state) => {
              const dispose = subscribeMobxRoot(state, () => {});
              dispose();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            setup: createValtioRootSubscriptionState,
            task: (state) => {
              const unsubscribe = subscribeValtioRoot(state, () => {});
              unsubscribe();
            },
          },
        ],
      },
      {
        title: "Root Subscription Dispatch",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            setup: () => {
              const state = createPulseRootSubscriptionState();
              state.unsubscribe = subscribePulseRoot(state, () => {});
              return state;
            },
            task: writePulseRoot,
            teardown: (state) => {
              state.unsubscribe?.();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            setup: () => {
              const state = createLegendRootSubscriptionState();
              state.dispose = subscribeLegendRoot(state, () => {});
              return state;
            },
            task: writeLegendRoot,
            teardown: (state) => {
              state.dispose?.();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            setup: () => {
              const state = createMobxRootSubscriptionState();
              state.dispose = subscribeMobxRoot(state, () => {});
              return state;
            },
            task: writeMobxRoot,
            teardown: (state) => {
              state.dispose?.();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            setup: () => {
              const state = createValtioRootSubscriptionState();
              state.unsubscribe = subscribeValtioRoot(state, () => {});
              return state;
            },
            task: writeValtioRoot,
            teardown: (state) => {
              state.unsubscribe?.();
            },
          },
        ],
      },
      {
        title: "Leaf Subscription Lifecycle",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            setup: createPulseLeafSubscriptionState,
            task: (state) => {
              const unsubscribe = subscribePulseLeaf(state, () => {});
              unsubscribe?.();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            setup: createLegendLeafSubscriptionState,
            task: (state) => {
              const dispose = subscribeLegendLeaf(state, () => {});
              dispose();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            setup: createMobxLeafSubscriptionState,
            task: (state) => {
              const dispose = subscribeMobxLeaf(state, () => {});
              dispose();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            setup: createValtioLeafSubscriptionState,
            task: (state) => {
              const unsubscribe = subscribeValtioLeaf(state, () => {});
              unsubscribe();
            },
          },
        ],
      },
      {
        title: "Leaf Subscription Dispatch",
        cases: [
          {
            name: "pulse",
            iterations: 5_000,
            setup: () => {
              const state = createPulseLeafSubscriptionState();
              state.unsubscribe = subscribePulseLeaf(state, () => {});
              return state;
            },
            task: writePulseLeaf,
            teardown: (state) => {
              state.unsubscribe?.();
            },
          },
          {
            name: "Legend-State",
            iterations: 5_000,
            setup: () => {
              const state = createLegendLeafSubscriptionState();
              state.dispose = subscribeLegendLeaf(state, () => {});
              return state;
            },
            task: writeLegendLeaf,
            teardown: (state) => {
              state.dispose?.();
            },
          },
          {
            name: "MobX",
            iterations: 5_000,
            setup: () => {
              const state = createMobxLeafSubscriptionState();
              state.dispose = subscribeMobxLeaf(state, () => {});
              return state;
            },
            task: writeMobxLeaf,
            teardown: (state) => {
              state.dispose?.();
            },
          },
          {
            name: "valtio",
            iterations: 5_000,
            setup: () => {
              const state = createValtioLeafSubscriptionState();
              state.unsubscribe = subscribeValtioLeaf(state, () => {});
              return state;
            },
            task: writeValtioLeaf,
            teardown: (state) => {
              state.unsubscribe?.();
            },
          },
        ],
      },
      {
        title: "Editable Table Subscription Lifecycle",
        cases: [
          {
            name: "pulse 50 row listeners subscribe and unsubscribe",
            iterations: 500,
            setup: createPulseTableState,
            task: (state) => {
              const unsubscribers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                const unsubscribe = state.table.rows[rowIndex]?.on(() => {});

                if (unsubscribe) {
                  unsubscribers.push(unsubscribe);
                }
              }

              disposeCallbacks(unsubscribers);
            },
          },
          {
            name: "Legend-State 50 row listeners subscribe and unsubscribe",
            iterations: 500,
            setup: createLegendTableState,
            task: (state) => {
              const disposers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                disposers.push(state.table.rows[rowIndex].onChange(() => {}));
              }

              disposeCallbacks(disposers);
            },
          },
          {
            name: "MobX 50 row listeners subscribe and unsubscribe",
            iterations: 250,
            setup: createMobxTableState,
            task: (state) => {
              const disposers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                const row = state.table.rows[rowIndex];

                disposers.push(
                  autorun(() => {
                    trackMobxRow(row);
                  }),
                );
              }

              disposeCallbacks(disposers);
            },
          },
          {
            name: "valtio 50 row listeners subscribe and unsubscribe",
            iterations: 500,
            setup: createValtioTableState,
            task: (state) => {
              const unsubscribers = [];

              for (let rowIndex = 0; rowIndex < 50; rowIndex += 1) {
                unsubscribers.push(
                  subscribeValtioSync(state.table.rows[rowIndex], () => {}),
                );
              }

              disposeCallbacks(unsubscribers);
            },
          },
          {
            name: "pulse visible window listeners subscribe and unsubscribe",
            iterations: 100,
            setup: createPulseTableState,
            task: (state) => {
              disposeCallbacks(attachPulseVisibleWindowListeners(state.table));
            },
          },
          {
            name: "Legend-State visible window listeners subscribe and unsubscribe",
            iterations: 100,
            setup: createLegendTableState,
            task: (state) => {
              disposeCallbacks(attachLegendVisibleWindowListeners(state.table));
            },
          },
          {
            name: "MobX visible window listeners subscribe and unsubscribe",
            iterations: 50,
            setup: createMobxTableState,
            task: (state) => {
              disposeCallbacks(attachMobxVisibleWindowListeners(state.table));
            },
          },
          {
            name: "valtio visible window listeners subscribe and unsubscribe",
            iterations: 100,
            setup: createValtioTableState,
            task: (state) => {
              disposeCallbacks(attachValtioVisibleWindowListeners(state.table));
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
