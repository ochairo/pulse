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
  appendMarketRows,
  createDeepState,
  createEditableTable,
  createMarketRows,
  createOffsetMarketRows,
  createUsers,
  createWideGraph,
  createWorkspaceState,
  getTableCell,
  prependUser,
  readFirstUserNames,
  removeFirstUser,
  removeArrayItem,
  replaceManyUsers,
  runBenchmarkSuite,
  swapArrayItems,
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

function createPulseArrayReindexState() {
  const store = pulse({ users: createUsers(256) });
  let renderedWindow = readFirstUserNames(store.users.get(), 32);

  return {
    nextId: 256,
    renderedWindow,
    store,
    unsubscribe: store.users.on(() => {
      renderedWindow = readFirstUserNames(store.users.get(), 32);
    }),
  };
}

function createLegendArrayReindexState() {
  const store = legendObservable({ users: createUsers(256) });
  let renderedWindow = readFirstUserNames(store.users.get(), 32);

  return {
    dispose: store.users.onChange(() => {
      renderedWindow = readFirstUserNames(store.users.get(), 32);
    }),
    nextId: 256,
    renderedWindow,
    store,
  };
}

function createMobxArrayReindexState() {
  const store = mobxObservable({ users: createUsers(256) });
  let renderedWindow = readFirstUserNames(store.users, 32);

  return {
    dispose: autorun(() => {
      renderedWindow = readFirstUserNames(store.users, 32);
    }),
    nextId: 256,
    renderedWindow,
    store,
  };
}

function createValtioArrayReindexState() {
  const store = proxy({ users: createUsers(256) });
  let renderedWindow = readFirstUserNames(store.users, 32);

  return {
    nextId: 256,
    renderedWindow,
    store,
    unsubscribe: subscribeValtioSync(store, () => {
      renderedWindow = readFirstUserNames(store.users, 32);
    }),
  };
}

function insertPulseArrayHead(context) {
  const nextUser = {
    id: context.nextId,
    name: `Inserted ${context.nextId}`,
    age: 20 + (context.nextId % 20),
  };

  context.nextId += 1;
  context.store.users.set(prependUser(context.store.users.get(), nextUser));
}

function insertLegendArrayHead(context) {
  const nextUser = {
    id: context.nextId,
    name: `Inserted ${context.nextId}`,
    age: 20 + (context.nextId % 20),
  };

  context.nextId += 1;
  context.store.users.set(prependUser(context.store.users.get(), nextUser));
}

function insertMobxArrayHead(context) {
  const nextUser = {
    id: context.nextId,
    name: `Inserted ${context.nextId}`,
    age: 20 + (context.nextId % 20),
  };

  context.nextId += 1;

  runInAction(() => {
    context.store.users = prependUser(context.store.users, nextUser);
  });
}

function insertValtioArrayHead(context) {
  const nextUser = {
    id: context.nextId,
    name: `Inserted ${context.nextId}`,
    age: 20 + (context.nextId % 20),
  };

  context.nextId += 1;
  context.store.users = prependUser(context.store.users, nextUser);
}

function removePulseArrayHead(context) {
  context.store.users.set(removeFirstUser(context.store.users.get()));
}

function removeLegendArrayHead(context) {
  context.store.users.set(removeFirstUser(context.store.users.get()));
}

function removeMobxArrayHead(context) {
  runInAction(() => {
    context.store.users = removeFirstUser(context.store.users);
  });
}

function removeValtioArrayHead(context) {
  context.store.users = removeFirstUser(context.store.users);
}

function createPulseDerivedConsumerState() {
  const users = pulse(createUsers(4));
  let derivedValue = "";
  const recompute = () => {
    derivedValue = `${users[0]?.name.get() ?? ""}|${users[1]?.name.get() ?? ""}`;
  };

  recompute();

  return {
    derivedValue,
    nextValue: 0,
    unsubscribers: [users[0]?.name.on(recompute), users[1]?.name.on(recompute)],
    users,
  };
}

function createLegendDerivedConsumerState() {
  const users = legendObservable(createUsers(4));
  let derivedValue = "";
  const recompute = () => {
    derivedValue = `${users[0].name.get()}|${users[1].name.get()}`;
  };

  recompute();

  return {
    derivedValue,
    disposers: [
      users[0].name.onChange(recompute),
      users[1].name.onChange(recompute),
    ],
    nextValue: 0,
    users,
  };
}

function createMobxDerivedConsumerState() {
  const users = mobxObservable(createUsers(4));
  let derivedValue = "";

  return {
    derivedValue,
    dispose: autorun(() => {
      derivedValue = `${users[0].name}|${users[1].name}`;
    }),
    nextValue: 0,
    users,
  };
}

function createValtioDerivedConsumerState() {
  const users = proxy(createUsers(4));
  let derivedValue = `${users[0].name}|${users[1].name}`;
  const recompute = () => {
    derivedValue = `${users[0].name}|${users[1].name}`;
  };

  return {
    derivedValue,
    nextValue: 0,
    unsubscribers: [
      subscribeValtioSync(users[0], recompute),
      subscribeValtioSync(users[1], recompute),
    ],
    users,
  };
}

function teardownPulseDerivedConsumerState(context) {
  disposeCallbacks(context.unsubscribers.filter(Boolean));
}

function teardownLegendDerivedConsumerState(context) {
  disposeCallbacks(context.disposers);
}

function teardownMobxDerivedConsumerState(context) {
  context.dispose();
}

function teardownValtioDerivedConsumerState(context) {
  disposeCallbacks(context.unsubscribers);
}

function writePulseDerivedSource(context) {
  context.nextValue += 1;
  context.users[0]?.name.set(`User ${context.nextValue}`);
}

function writeLegendDerivedSource(context) {
  context.nextValue += 1;
  context.users[0].name.set(`User ${context.nextValue}`);
}

function writeMobxDerivedSource(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[0].name = `User ${context.nextValue}`;
  });
}

function writeValtioDerivedSource(context) {
  context.nextValue += 1;
  context.users[0].name = `User ${context.nextValue}`;
}

function writePulseUnrelatedDerivedSource(context) {
  context.nextValue += 1;
  context.users[3]?.name.set(`User ${context.nextValue}`);
}

function writeLegendUnrelatedDerivedSource(context) {
  context.nextValue += 1;
  context.users[3].name.set(`User ${context.nextValue}`);
}

function writeMobxUnrelatedDerivedSource(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[3].name = `User ${context.nextValue}`;
  });
}

function writeValtioUnrelatedDerivedSource(context) {
  context.nextValue += 1;
  context.users[3].name = `User ${context.nextValue}`;
}

function batchWritePulseDerivedSources(context) {
  context.nextValue += 1;
  context.users.batch(() => {
    context.users[0]?.name.set(`User ${context.nextValue}`);
    context.users[1]?.name.set(`Friend ${context.nextValue}`);
  });
}

function batchWriteLegendDerivedSources(context) {
  context.nextValue += 1;
  legendBatch(() => {
    context.users[0].name.set(`User ${context.nextValue}`);
    context.users[1].name.set(`Friend ${context.nextValue}`);
  });
}

function batchWriteMobxDerivedSources(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[0].name = `User ${context.nextValue}`;
    context.users[1].name = `Friend ${context.nextValue}`;
  });
}

function batchWriteValtioDerivedSources(context) {
  context.nextValue += 1;
  context.users[0].name = `User ${context.nextValue}`;
  context.users[1].name = `Friend ${context.nextValue}`;
}

function batchWritePulseSameLeafTwice(context) {
  context.nextValue += 1;
  context.users.batch(() => {
    context.users[0]?.name.set(`First ${context.nextValue}`);
    context.users[0]?.name.set(`Second ${context.nextValue}`);
  });
}

function batchWriteLegendSameLeafTwice(context) {
  context.nextValue += 1;
  legendBatch(() => {
    context.users[0].name.set(`First ${context.nextValue}`);
    context.users[0].name.set(`Second ${context.nextValue}`);
  });
}

function batchWriteMobxSameLeafTwice(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[0].name = `First ${context.nextValue}`;
    context.users[0].name = `Second ${context.nextValue}`;
  });
}

function batchWriteValtioSameLeafTwice(context) {
  context.nextValue += 1;
  context.users[0].name = `First ${context.nextValue}`;
  context.users[0].name = `Second ${context.nextValue}`;
}

function createPulseListenerSelectivityState() {
  const users = pulse(createUsers(128));
  let sink = "";
  const unsubscribers = [];

  for (let index = 0; index < 100; index += 1) {
    const unsubscribe = users[index]?.name.on(() => {
      sink = users[index]?.name.get() ?? "";
    });

    if (unsubscribe) {
      unsubscribers.push(unsubscribe);
    }
  }

  return {
    nextValue: 0,
    sink,
    unsubscribers,
    users,
  };
}

function createLegendListenerSelectivityState() {
  const users = legendObservable(createUsers(128));
  let sink = "";
  const disposers = [];

  for (let index = 0; index < 100; index += 1) {
    disposers.push(
      users[index].name.onChange(() => {
        sink = users[index].name.get();
      }),
    );
  }

  return {
    disposers,
    nextValue: 0,
    sink,
    users,
  };
}

function createMobxListenerSelectivityState() {
  const users = mobxObservable(createUsers(128));
  let sink = "";
  const disposers = [];

  for (let index = 0; index < 100; index += 1) {
    disposers.push(
      autorun(() => {
        sink = users[index].name;
      }),
    );
  }

  return {
    disposers,
    nextValue: 0,
    sink,
    users,
  };
}

function createValtioListenerSelectivityState() {
  const users = proxy(createUsers(128));
  let sink = "";
  const unsubscribers = [];

  for (let index = 0; index < 100; index += 1) {
    unsubscribers.push(
      subscribeValtioSync(users[index], () => {
        sink = users[index].name;
      }),
    );
  }

  return {
    nextValue: 0,
    sink,
    unsubscribers,
    users,
  };
}

function teardownPulseListenerSelectivityState(context) {
  disposeCallbacks(context.unsubscribers);
}

function teardownLegendListenerSelectivityState(context) {
  disposeCallbacks(context.disposers);
}

function teardownMobxListenerSelectivityState(context) {
  disposeCallbacks(context.disposers);
}

function teardownValtioListenerSelectivityState(context) {
  disposeCallbacks(context.unsubscribers);
}

function writePulseSelectedLeaf(context) {
  context.nextValue += 1;
  context.users[0]?.name.set(`Selected ${context.nextValue}`);
}

function writeLegendSelectedLeaf(context) {
  context.nextValue += 1;
  context.users[0].name.set(`Selected ${context.nextValue}`);
}

function writeMobxSelectedLeaf(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[0].name = `Selected ${context.nextValue}`;
  });
}

function writeValtioSelectedLeaf(context) {
  context.nextValue += 1;
  context.users[0].name = `Selected ${context.nextValue}`;
}

function writePulseUnselectedLeaf(context) {
  context.nextValue += 1;
  context.users[127]?.name.set(`Unselected ${context.nextValue}`);
}

function writeLegendUnselectedLeaf(context) {
  context.nextValue += 1;
  context.users[127].name.set(`Unselected ${context.nextValue}`);
}

function writeMobxUnselectedLeaf(context) {
  context.nextValue += 1;
  runInAction(() => {
    context.users[127].name = `Unselected ${context.nextValue}`;
  });
}

function writeValtioUnselectedLeaf(context) {
  context.nextValue += 1;
  context.users[127].name = `Unselected ${context.nextValue}`;
}

function createPulseLargeTableState(rowCount = 1_000) {
  return {
    rowCount,
    nextIndex: 1,
    nextTick: 0,
    table: pulse({ rows: createMarketRows(rowCount) }),
  };
}

function createLegendLargeTableState(rowCount = 1_000) {
  return {
    rowCount,
    nextIndex: 1,
    nextTick: 0,
    table: legendObservable({ rows: createMarketRows(rowCount) }),
  };
}

function createMobxLargeTableState(rowCount = 1_000) {
  return {
    rowCount,
    nextIndex: 1,
    nextTick: 0,
    table: mobxObservable({ rows: createMarketRows(rowCount) }),
  };
}

function createValtioLargeTableState(rowCount = 1_000) {
  return {
    rowCount,
    nextIndex: 1,
    nextTick: 0,
    table: proxy({ rows: createMarketRows(rowCount) }),
  };
}

function replacePulseLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows.set(
    createOffsetMarketRows(context.table.rows.get().length, context.nextTick),
  );
}

function replaceLegendLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows.set(
    createOffsetMarketRows(context.table.rows.get().length, context.nextTick),
  );
}

function replaceMobxLargeTableRows(context) {
  context.nextTick += 1;
  runInAction(() => {
    context.table.rows = createOffsetMarketRows(
      context.table.rows.length,
      context.nextTick,
    );
  });
}

function replaceValtioLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows = createOffsetMarketRows(
    context.table.rows.length,
    context.nextTick,
  );
}

function updatePulseEveryTenthLargeTableRow(context) {
  context.nextTick += 1;
  context.table.batch(() => {
    for (let index = 0; index < context.table.rows.get().length; index += 10) {
      const row = context.table.rows[index];
      const price = row?.price.get();

      if (row && typeof price === "number") {
        row.price.set(price + context.nextTick);
      }
    }
  });
}

function updateLegendEveryTenthLargeTableRow(context) {
  context.nextTick += 1;
  legendBatch(() => {
    for (let index = 0; index < context.table.rows.get().length; index += 10) {
      const row = context.table.rows[index];
      row.price.set(row.price.get() + context.nextTick);
    }
  });
}

function updateMobxEveryTenthLargeTableRow(context) {
  context.nextTick += 1;
  runInAction(() => {
    for (let index = 0; index < context.table.rows.length; index += 10) {
      context.table.rows[index].price += context.nextTick;
    }
  });
}

function updateValtioEveryTenthLargeTableRow(context) {
  context.nextTick += 1;
  for (let index = 0; index < context.table.rows.length; index += 10) {
    context.table.rows[index].price += context.nextTick;
  }
}

function selectPulseLargeTableRow(context) {
  const rowCount = context.table.rows.get().length;

  if (rowCount === 0) {
    return;
  }

  const previousIndex = (context.nextIndex - 1) % rowCount;
  const nextIndex = context.nextIndex % rowCount;

  context.nextIndex += 1;
  context.table.batch(() => {
    context.table.rows[previousIndex]?.focused.set(false);
    context.table.rows[nextIndex]?.focused.set(true);
  });
}

function selectLegendLargeTableRow(context) {
  const rowCount = context.table.rows.get().length;

  if (rowCount === 0) {
    return;
  }

  const previousIndex = (context.nextIndex - 1) % rowCount;
  const nextIndex = context.nextIndex % rowCount;

  context.nextIndex += 1;
  legendBatch(() => {
    context.table.rows[previousIndex].focused.set(false);
    context.table.rows[nextIndex].focused.set(true);
  });
}

function selectMobxLargeTableRow(context) {
  const rowCount = context.table.rows.length;

  if (rowCount === 0) {
    return;
  }

  const previousIndex = (context.nextIndex - 1) % rowCount;
  const nextIndex = context.nextIndex % rowCount;

  context.nextIndex += 1;
  runInAction(() => {
    context.table.rows[previousIndex].focused = false;
    context.table.rows[nextIndex].focused = true;
  });
}

function selectValtioLargeTableRow(context) {
  const rowCount = context.table.rows.length;

  if (rowCount === 0) {
    return;
  }

  const previousIndex = (context.nextIndex - 1) % rowCount;
  const nextIndex = context.nextIndex % rowCount;

  context.nextIndex += 1;
  context.table.rows[previousIndex].focused = false;
  context.table.rows[nextIndex].focused = true;
}

function swapPulseLargeTableRows(context) {
  context.table.rows.set(swapArrayItems(context.table.rows.get(), 1, 998));
}

function swapLegendLargeTableRows(context) {
  context.table.rows.set(swapArrayItems(context.table.rows.get(), 1, 998));
}

function swapMobxLargeTableRows(context) {
  runInAction(() => {
    context.table.rows = swapArrayItems(context.table.rows, 1, 998);
  });
}

function swapValtioLargeTableRows(context) {
  context.table.rows = swapArrayItems(context.table.rows, 1, 998);
}

function removePulseLargeTableRow(context) {
  const rows = context.table.rows.get();

  if (rows.length <= 1) {
    context.table.rows.set(createMarketRows(context.rowCount));
  }

  const nextRows = context.table.rows.get();
  const index = context.nextIndex % nextRows.length;

  context.nextIndex += 1;
  context.table.rows.set(removeArrayItem(nextRows, index));
}

function removeLegendLargeTableRow(context) {
  const rows = context.table.rows.get();

  if (rows.length <= 1) {
    context.table.rows.set(createMarketRows(context.rowCount));
  }

  const nextRows = context.table.rows.get();
  const index = context.nextIndex % nextRows.length;

  context.nextIndex += 1;
  context.table.rows.set(removeArrayItem(nextRows, index));
}

function removeMobxLargeTableRow(context) {
  if (context.table.rows.length <= 1) {
    runInAction(() => {
      context.table.rows = createMarketRows(context.rowCount);
    });
  }

  const index = context.nextIndex % context.table.rows.length;

  context.nextIndex += 1;
  runInAction(() => {
    context.table.rows = removeArrayItem(context.table.rows, index);
  });
}

function removeValtioLargeTableRow(context) {
  if (context.table.rows.length <= 1) {
    context.table.rows = createMarketRows(context.rowCount);
  }

  const index = context.nextIndex % context.table.rows.length;

  context.nextIndex += 1;
  context.table.rows = removeArrayItem(context.table.rows, index);
}

function appendPulseLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows.set(
    appendMarketRows(context.table.rows.get(), 1_000, context.nextTick),
  );
}

function appendLegendLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows.set(
    appendMarketRows(context.table.rows.get(), 1_000, context.nextTick),
  );
}

function appendMobxLargeTableRows(context) {
  context.nextTick += 1;
  runInAction(() => {
    context.table.rows = appendMarketRows(
      context.table.rows,
      1_000,
      context.nextTick,
    );
  });
}

function appendValtioLargeTableRows(context) {
  context.nextTick += 1;
  context.table.rows = appendMarketRows(
    context.table.rows,
    1_000,
    context.nextTick,
  );
}

function clearPulseLargeTableRows(context) {
  context.table.rows.set([]);
}

function clearLegendLargeTableRows(context) {
  context.table.rows.set([]);
}

function clearMobxLargeTableRows(context) {
  runInAction(() => {
    context.table.rows = [];
  });
}

function clearValtioLargeTableRows(context) {
  context.table.rows = [];
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
        title: "Activation Costs",
        cases: [
          {
            name: "pulse wide graph deep leaf get on fresh state",
            iterations: 500,
            task: () => {
              const state = pulse(createWideGraph(5_000));
              state.key4999?.child.grandchild.value.get();
            },
          },
          {
            name: "Legend-State wide graph deep leaf get on fresh state",
            iterations: 500,
            task: () => {
              const state = legendObservable(createWideGraph(5_000));
              state.key4999.child.grandchild.value.get();
            },
          },
          {
            name: "MobX wide graph deep leaf get on fresh state",
            iterations: 500,
            task: () => {
              const state = mobxObservable(createWideGraph(5_000));
              state.key4999.child.grandchild.value;
            },
          },
          {
            name: "valtio wide graph deep leaf get on fresh state",
            iterations: 500,
            task: () => {
              const state = proxy(createWideGraph(5_000));
              state.key4999.child.grandchild.value;
            },
          },
          {
            name: "pulse wide graph deep leaf subscribe on fresh state",
            iterations: 500,
            task: () => {
              const state = pulse(createWideGraph(5_000));
              const unsubscribe = state.key4999?.child.grandchild.value.on(
                () => {},
              );

              unsubscribe?.();
            },
          },
          {
            name: "Legend-State wide graph deep leaf subscribe on fresh state",
            iterations: 500,
            task: () => {
              const state = legendObservable(createWideGraph(5_000));
              const dispose = state.key4999.child.grandchild.value.onChange(
                () => {},
              );

              dispose();
            },
          },
          {
            name: "MobX wide graph deep leaf subscribe on fresh state",
            iterations: 500,
            task: () => {
              const state = mobxObservable(createWideGraph(5_000));
              const dispose = autorun(() => {
                state.key4999.child.grandchild.value;
              });

              dispose();
            },
          },
          {
            name: "valtio wide graph deep leaf subscribe on fresh state",
            iterations: 500,
            task: () => {
              const state = proxy(createWideGraph(5_000));
              const unsubscribe = subscribeValtioSync(
                state.key4999.child.grandchild,
                () => {},
              );

              unsubscribe();
            },
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
        title: "Array Reindexing Costs",
        cases: [
          {
            name: "pulse head insert with visible window consumer",
            iterations: 1_000,
            setup: createPulseArrayReindexState,
            task: insertPulseArrayHead,
            teardown: (context) => {
              context.unsubscribe();
            },
          },
          {
            name: "Legend-State head insert with visible window consumer",
            iterations: 1_000,
            setup: createLegendArrayReindexState,
            task: insertLegendArrayHead,
            teardown: (context) => {
              context.dispose();
            },
          },
          {
            name: "MobX head insert with visible window consumer",
            iterations: 1_000,
            setup: createMobxArrayReindexState,
            task: insertMobxArrayHead,
            teardown: (context) => {
              context.dispose();
            },
          },
          {
            name: "valtio head insert with visible window consumer",
            iterations: 1_000,
            setup: createValtioArrayReindexState,
            task: insertValtioArrayHead,
            teardown: (context) => {
              context.unsubscribe();
            },
          },
          {
            name: "pulse head remove with visible window consumer",
            iterations: 1_000,
            setup: createPulseArrayReindexState,
            task: removePulseArrayHead,
            teardown: (context) => {
              context.unsubscribe();
            },
          },
          {
            name: "Legend-State head remove with visible window consumer",
            iterations: 1_000,
            setup: createLegendArrayReindexState,
            task: removeLegendArrayHead,
            teardown: (context) => {
              context.dispose();
            },
          },
          {
            name: "MobX head remove with visible window consumer",
            iterations: 1_000,
            setup: createMobxArrayReindexState,
            task: removeMobxArrayHead,
            teardown: (context) => {
              context.dispose();
            },
          },
          {
            name: "valtio head remove with visible window consumer",
            iterations: 1_000,
            setup: createValtioArrayReindexState,
            task: removeValtioArrayHead,
            teardown: (context) => {
              context.unsubscribe();
            },
          },
        ],
      },
      {
        title: "Large Table Structural Costs",
        cases: [
          {
            name: "pulse create 1,000 rows",
            iterations: 500,
            task: () => {
              pulse({ rows: createMarketRows(1_000) });
            },
          },
          {
            name: "Legend-State create 1,000 rows",
            iterations: 500,
            task: () => {
              legendObservable({ rows: createMarketRows(1_000) });
            },
          },
          {
            name: "MobX create 1,000 rows",
            iterations: 500,
            task: () => {
              mobxObservable({ rows: createMarketRows(1_000) });
            },
          },
          {
            name: "valtio create 1,000 rows",
            iterations: 500,
            task: () => {
              proxy({ rows: createMarketRows(1_000) });
            },
          },
          {
            name: "pulse create 10,000 rows",
            iterations: 100,
            task: () => {
              pulse({ rows: createMarketRows(10_000) });
            },
          },
          {
            name: "Legend-State create 10,000 rows",
            iterations: 100,
            task: () => {
              legendObservable({ rows: createMarketRows(10_000) });
            },
          },
          {
            name: "MobX create 10,000 rows",
            iterations: 100,
            task: () => {
              mobxObservable({ rows: createMarketRows(10_000) });
            },
          },
          {
            name: "valtio create 10,000 rows",
            iterations: 100,
            task: () => {
              proxy({ rows: createMarketRows(10_000) });
            },
          },
          {
            name: "pulse replace all 1,000 rows",
            iterations: 500,
            setup: () => createPulseLargeTableState(1_000),
            task: replacePulseLargeTableRows,
          },
          {
            name: "Legend-State replace all 1,000 rows",
            iterations: 500,
            setup: () => createLegendLargeTableState(1_000),
            task: replaceLegendLargeTableRows,
          },
          {
            name: "MobX replace all 1,000 rows",
            iterations: 500,
            setup: () => createMobxLargeTableState(1_000),
            task: replaceMobxLargeTableRows,
          },
          {
            name: "valtio replace all 1,000 rows",
            iterations: 500,
            setup: () => createValtioLargeTableState(1_000),
            task: replaceValtioLargeTableRows,
          },
          {
            name: "pulse partial update every 10th row in 1,000 rows",
            iterations: 500,
            setup: () => createPulseLargeTableState(1_000),
            task: updatePulseEveryTenthLargeTableRow,
          },
          {
            name: "Legend-State partial update every 10th row in 1,000 rows",
            iterations: 500,
            setup: () => createLegendLargeTableState(1_000),
            task: updateLegendEveryTenthLargeTableRow,
          },
          {
            name: "MobX partial update every 10th row in 1,000 rows",
            iterations: 500,
            setup: () => createMobxLargeTableState(1_000),
            task: updateMobxEveryTenthLargeTableRow,
          },
          {
            name: "valtio partial update every 10th row in 1,000 rows",
            iterations: 500,
            setup: () => createValtioLargeTableState(1_000),
            task: updateValtioEveryTenthLargeTableRow,
          },
          {
            name: "pulse select focused row in 1,000 rows",
            iterations: 1_000,
            setup: () => createPulseLargeTableState(1_000),
            task: selectPulseLargeTableRow,
          },
          {
            name: "Legend-State select focused row in 1,000 rows",
            iterations: 1_000,
            setup: () => createLegendLargeTableState(1_000),
            task: selectLegendLargeTableRow,
          },
          {
            name: "MobX select focused row in 1,000 rows",
            iterations: 1_000,
            setup: () => createMobxLargeTableState(1_000),
            task: selectMobxLargeTableRow,
          },
          {
            name: "valtio select focused row in 1,000 rows",
            iterations: 1_000,
            setup: () => createValtioLargeTableState(1_000),
            task: selectValtioLargeTableRow,
          },
          {
            name: "pulse swap two rows in 1,000 rows",
            iterations: 500,
            setup: () => createPulseLargeTableState(1_000),
            task: swapPulseLargeTableRows,
          },
          {
            name: "Legend-State swap two rows in 1,000 rows",
            iterations: 500,
            setup: () => createLegendLargeTableState(1_000),
            task: swapLegendLargeTableRows,
          },
          {
            name: "MobX swap two rows in 1,000 rows",
            iterations: 500,
            setup: () => createMobxLargeTableState(1_000),
            task: swapMobxLargeTableRows,
          },
          {
            name: "valtio swap two rows in 1,000 rows",
            iterations: 500,
            setup: () => createValtioLargeTableState(1_000),
            task: swapValtioLargeTableRows,
          },
          {
            name: "pulse remove one row from 1,000 rows",
            iterations: 500,
            setup: () => createPulseLargeTableState(1_000),
            task: removePulseLargeTableRow,
          },
          {
            name: "Legend-State remove one row from 1,000 rows",
            iterations: 500,
            setup: () => createLegendLargeTableState(1_000),
            task: removeLegendLargeTableRow,
          },
          {
            name: "MobX remove one row from 1,000 rows",
            iterations: 500,
            setup: () => createMobxLargeTableState(1_000),
            task: removeMobxLargeTableRow,
          },
          {
            name: "valtio remove one row from 1,000 rows",
            iterations: 500,
            setup: () => createValtioLargeTableState(1_000),
            task: removeValtioLargeTableRow,
          },
          {
            name: "pulse append 1,000 rows to 10,000 rows",
            iterations: 100,
            setup: () => createPulseLargeTableState(10_000),
            task: appendPulseLargeTableRows,
          },
          {
            name: "Legend-State append 1,000 rows to 10,000 rows",
            iterations: 100,
            setup: () => createLegendLargeTableState(10_000),
            task: appendLegendLargeTableRows,
          },
          {
            name: "MobX append 1,000 rows to 10,000 rows",
            iterations: 100,
            setup: () => createMobxLargeTableState(10_000),
            task: appendMobxLargeTableRows,
          },
          {
            name: "valtio append 1,000 rows to 10,000 rows",
            iterations: 100,
            setup: () => createValtioLargeTableState(10_000),
            task: appendValtioLargeTableRows,
          },
          {
            name: "pulse clear 1,000 rows",
            iterations: 1_000,
            setup: () => createPulseLargeTableState(1_000),
            task: clearPulseLargeTableRows,
          },
          {
            name: "Legend-State clear 1,000 rows",
            iterations: 1_000,
            setup: () => createLegendLargeTableState(1_000),
            task: clearLegendLargeTableRows,
          },
          {
            name: "MobX clear 1,000 rows",
            iterations: 1_000,
            setup: () => createMobxLargeTableState(1_000),
            task: clearMobxLargeTableRows,
          },
          {
            name: "valtio clear 1,000 rows",
            iterations: 1_000,
            setup: () => createValtioLargeTableState(1_000),
            task: clearValtioLargeTableRows,
          },
        ],
      },
      {
        title: "Derived Consumer Costs",
        cases: [
          {
            name: "pulse relevant source write",
            iterations: 5_000,
            setup: createPulseDerivedConsumerState,
            task: writePulseDerivedSource,
            teardown: teardownPulseDerivedConsumerState,
          },
          {
            name: "Legend-State relevant source write",
            iterations: 5_000,
            setup: createLegendDerivedConsumerState,
            task: writeLegendDerivedSource,
            teardown: teardownLegendDerivedConsumerState,
          },
          {
            name: "MobX relevant source write",
            iterations: 5_000,
            setup: createMobxDerivedConsumerState,
            task: writeMobxDerivedSource,
            teardown: teardownMobxDerivedConsumerState,
          },
          {
            name: "valtio relevant source write",
            iterations: 5_000,
            setup: createValtioDerivedConsumerState,
            task: writeValtioDerivedSource,
            teardown: teardownValtioDerivedConsumerState,
          },
          {
            name: "pulse unrelated source write",
            iterations: 5_000,
            setup: createPulseDerivedConsumerState,
            task: writePulseUnrelatedDerivedSource,
            teardown: teardownPulseDerivedConsumerState,
          },
          {
            name: "Legend-State unrelated source write",
            iterations: 5_000,
            setup: createLegendDerivedConsumerState,
            task: writeLegendUnrelatedDerivedSource,
            teardown: teardownLegendDerivedConsumerState,
          },
          {
            name: "MobX unrelated source write",
            iterations: 5_000,
            setup: createMobxDerivedConsumerState,
            task: writeMobxUnrelatedDerivedSource,
            teardown: teardownMobxDerivedConsumerState,
          },
          {
            name: "valtio unrelated source write",
            iterations: 5_000,
            setup: createValtioDerivedConsumerState,
            task: writeValtioUnrelatedDerivedSource,
            teardown: teardownValtioDerivedConsumerState,
          },
          {
            name: "pulse batched dual-source write",
            iterations: 3_000,
            setup: createPulseDerivedConsumerState,
            task: batchWritePulseDerivedSources,
            teardown: teardownPulseDerivedConsumerState,
          },
          {
            name: "Legend-State batched dual-source write",
            iterations: 3_000,
            setup: createLegendDerivedConsumerState,
            task: batchWriteLegendDerivedSources,
            teardown: teardownLegendDerivedConsumerState,
          },
          {
            name: "MobX batched dual-source write",
            iterations: 3_000,
            setup: createMobxDerivedConsumerState,
            task: batchWriteMobxDerivedSources,
            teardown: teardownMobxDerivedConsumerState,
          },
          {
            name: "valtio batched dual-source write",
            iterations: 3_000,
            setup: createValtioDerivedConsumerState,
            task: batchWriteValtioDerivedSources,
            teardown: teardownValtioDerivedConsumerState,
          },
        ],
      },
      {
        title: "Batch Collapse Costs",
        cases: [
          {
            name: "pulse same leaf written twice in coordinated update",
            iterations: 5_000,
            setup: createPulseDerivedConsumerState,
            task: batchWritePulseSameLeafTwice,
            teardown: teardownPulseDerivedConsumerState,
          },
          {
            name: "Legend-State same leaf written twice in coordinated update",
            iterations: 5_000,
            setup: createLegendDerivedConsumerState,
            task: batchWriteLegendSameLeafTwice,
            teardown: teardownLegendDerivedConsumerState,
          },
          {
            name: "MobX same leaf written twice in coordinated update",
            iterations: 5_000,
            setup: createMobxDerivedConsumerState,
            task: batchWriteMobxSameLeafTwice,
            teardown: teardownMobxDerivedConsumerState,
          },
          {
            name: "valtio same leaf written twice in coordinated update",
            iterations: 5_000,
            setup: createValtioDerivedConsumerState,
            task: batchWriteValtioSameLeafTwice,
            teardown: teardownValtioDerivedConsumerState,
          },
        ],
      },
      {
        title: "Listener Selectivity Costs",
        cases: [
          {
            name: "pulse write one subscribed leaf among 100 listeners",
            iterations: 2_000,
            setup: createPulseListenerSelectivityState,
            task: writePulseSelectedLeaf,
            teardown: teardownPulseListenerSelectivityState,
          },
          {
            name: "Legend-State write one subscribed leaf among 100 listeners",
            iterations: 2_000,
            setup: createLegendListenerSelectivityState,
            task: writeLegendSelectedLeaf,
            teardown: teardownLegendListenerSelectivityState,
          },
          {
            name: "MobX write one subscribed leaf among 100 listeners",
            iterations: 2_000,
            setup: createMobxListenerSelectivityState,
            task: writeMobxSelectedLeaf,
            teardown: teardownMobxListenerSelectivityState,
          },
          {
            name: "valtio write one subscribed leaf among 100 listeners",
            iterations: 2_000,
            setup: createValtioListenerSelectivityState,
            task: writeValtioSelectedLeaf,
            teardown: teardownValtioListenerSelectivityState,
          },
          {
            name: "pulse write unsubscribed leaf with 100 unrelated listeners",
            iterations: 2_000,
            setup: createPulseListenerSelectivityState,
            task: writePulseUnselectedLeaf,
            teardown: teardownPulseListenerSelectivityState,
          },
          {
            name: "Legend-State write unsubscribed leaf with 100 unrelated listeners",
            iterations: 2_000,
            setup: createLegendListenerSelectivityState,
            task: writeLegendUnselectedLeaf,
            teardown: teardownLegendListenerSelectivityState,
          },
          {
            name: "MobX write unsubscribed leaf with 100 unrelated listeners",
            iterations: 2_000,
            setup: createMobxListenerSelectivityState,
            task: writeMobxUnselectedLeaf,
            teardown: teardownMobxListenerSelectivityState,
          },
          {
            name: "valtio write unsubscribed leaf with 100 unrelated listeners",
            iterations: 2_000,
            setup: createValtioListenerSelectivityState,
            task: writeValtioUnselectedLeaf,
            teardown: teardownValtioListenerSelectivityState,
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
