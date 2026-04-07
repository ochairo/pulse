import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

export const SECTION_DIVIDER = "-".repeat(72);
const BENCHMARK_PRESETS = {
  full: {
    maxCalibrationScale: 1_024,
    minSampleDurationMs: 40,
    sampleCount: 5,
    warmupIterations: 25,
  },
  quick: {
    maxCalibrationScale: 64,
    minSampleDurationMs: 12,
    sampleCount: 3,
    warmupIterations: 10,
  },
};

export function createDeepState(depth) {
  let value = { leaf: 0 };

  for (let level = 0; level < depth; level += 1) {
    value = { child: value };
  }

  return value;
}

export function getDeepLeaf(root, depth) {
  let node = root;

  for (let level = 0; level < depth; level += 1) {
    node = node.child;
  }

  return node.leaf;
}

export function replaceDeepLeafValue(rootValue, depth, nextLeafValue) {
  if (depth === 0) {
    return { ...rootValue, leaf: nextLeafValue };
  }

  return {
    ...rootValue,
    child: replaceDeepLeafValue(rootValue.child, depth - 1, nextLeafValue),
  };
}

export function createUsers(length) {
  return Array.from({ length }, (_, index) => ({
    id: index,
    name: `User ${index}`,
    age: 20 + (index % 20),
  }));
}

export function createWideGraph(width) {
  const root = {};

  for (let index = 0; index < width; index += 1) {
    root[`key${index}`] = {
      child: {
        grandchild: {
          value: index,
          flag: index % 2 === 0,
        },
      },
    };
  }

  return root;
}

export function getWideGraphLeaf(root, index) {
  return root[`key${index}`]?.child?.grandchild?.value;
}

export function prependUser(users, user) {
  return [user, ...users];
}

export function removeFirstUser(users) {
  return users.slice(1);
}

export function readFirstUserNames(users, count) {
  let value = "";

  for (let index = 0; index < count; index += 1) {
    const user = users[index];

    if (!user) {
      break;
    }

    value += user.name;
  }

  return value;
}

export function createMarketRows(length) {
  return Array.from({ length }, (_, index) => ({
    id: index,
    symbol: `SYM-${index % 12}`,
    venue: `V-${index % 6}`,
    price: 100 + index * 0.1,
    volume: 100_000 + index * 13,
    change: (index % 9) - 4,
    trades: 25 + (index % 50),
    heat: 10 + (index % 90),
    focused: index === 0,
  }));
}

export function createOffsetMarketRows(length, offset = 0) {
  return Array.from({ length }, (_, index) => ({
    id: index,
    symbol: `SYM-${(index + offset) % 12}`,
    venue: `V-${(index + offset) % 6}`,
    price: 100 + offset + index * 0.1,
    volume: 100_000 + offset * 100 + index * 13,
    change: ((index + offset) % 9) - 4,
    trades: 25 + ((index + offset) % 50),
    heat: 10 + ((index + offset) % 90),
    focused: index === 0,
  }));
}

export function swapArrayItems(items, leftIndex, rightIndex) {
  const nextItems = items.slice();
  const leftValue = nextItems[leftIndex];

  nextItems[leftIndex] = nextItems[rightIndex];
  nextItems[rightIndex] = leftValue;

  return nextItems;
}

export function removeArrayItem(items, index) {
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

export function appendMarketRows(items, count, offset = 0) {
  const appended = Array.from({ length: count }, (_, index) => ({
    id: items.length + index,
    symbol: `SYM-${(items.length + index + offset) % 12}`,
    venue: `V-${(items.length + index + offset) % 6}`,
    price: 100 + offset + (items.length + index) * 0.1,
    volume: 100_000 + offset * 100 + (items.length + index) * 13,
    change: ((items.length + index + offset) % 9) - 4,
    trades: 25 + ((items.length + index + offset) % 50),
    heat: 10 + ((items.length + index + offset) % 90),
    focused: false,
  }));

  return [...items, ...appended];
}

export function createWorkspaceState(projects = 24, tasksPerProject = 32) {
  return {
    session: {
      user: {
        id: "user-1",
        profile: {
          name: "Aiko",
          role: "admin",
          timezone: "UTC",
        },
      },
      preferences: {
        theme: "light",
        density: "comfortable",
        locale: "en-US",
      },
    },
    projects: Array.from({ length: projects }, (_, projectIndex) => ({
      id: `project-${projectIndex}`,
      title: `Project ${projectIndex}`,
      stats: {
        open: tasksPerProject,
        done: 0,
      },
      tasks: Array.from({ length: tasksPerProject }, (_, taskIndex) => ({
        id: `task-${projectIndex}-${taskIndex}`,
        title: `Task ${taskIndex}`,
        done: false,
        priority: taskIndex % 4,
      })),
    })),
  };
}

export function createEditableTable(rows, days) {
  return {
    rows: Array.from({ length: rows }, (_, rowIndex) => ({
      id: `row-${rowIndex}`,
      label: `Metric ${rowIndex}`,
      unit: "count",
      points: Array.from({ length: days }, (_, dayIndex) => ({
        day: dayIndex,
        value: (rowIndex * 7 + dayIndex) % 100,
      })),
    })),
  };
}

export function getTableCell(root, rowIndex, dayIndex) {
  return root.rows[rowIndex]?.points[dayIndex]?.value;
}

export function createNestedUsers(depth) {
  let value = { users: createUsers(2) };

  for (let level = 0; level < depth; level += 1) {
    value = { child: value };
  }

  return value;
}

export function getNestedUsers(root, depth) {
  let node = root;

  for (let level = 0; level < depth; level += 1) {
    node = node.child;
  }

  return node.users;
}

export function replaceManyUsers(users, indexes) {
  const nextUsers = users.slice();

  for (const index of indexes) {
    nextUsers[index] = {
      ...nextUsers[index],
      name: `Updated ${index}`,
      age: nextUsers[index].age + 1,
    };
  }

  return nextUsers;
}

export function replaceUserField(users, index, key, value) {
  const nextUsers = users.slice();
  nextUsers[index] = {
    ...nextUsers[index],
    [key]: value,
  };
  return nextUsers;
}

export function getEnvironment() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

function measureCase(benchmark, runConfig) {
  const sampleCount = benchmark.sampleCount ?? runConfig.sampleCount;
  const operationsPerSample = resolveOperationsPerSample(benchmark, runConfig);
  const samplesMs = [];
  let totalDurationMs = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const context = benchmark.setup?.();

    try {
      runBenchmarkIterations(
        benchmark,
        context,
        Math.min(runConfig.warmupIterations, operationsPerSample),
      );

      const start = performance.now();
      runBenchmarkIterations(benchmark, context, operationsPerSample);

      const durationMs = performance.now() - start;
      totalDurationMs += durationMs;
      samplesMs.push(durationMs / operationsPerSample);
    } finally {
      benchmark.teardown?.(context);
    }
  }

  const sortedSamplesMs = [...samplesMs].sort((left, right) => left - right);
  const averageMs = totalDurationMs / (operationsPerSample * sampleCount);
  const medianMs =
    sortedSamplesMs[Math.floor(sortedSamplesMs.length / 2)] ?? averageMs;
  const minMs = sortedSamplesMs[0] ?? averageMs;
  const maxMs = sortedSamplesMs[sortedSamplesMs.length - 1] ?? averageMs;
  const variance =
    samplesMs.reduce((total, sampleMs) => {
      const delta = sampleMs - averageMs;
      return total + delta * delta;
    }, 0) / samplesMs.length;
  const standardDeviationMs = Math.sqrt(variance);
  const relativeStdDevPct =
    averageMs === 0 ? 0 : (standardDeviationMs / averageMs) * 100;

  return {
    averageMs,
    durationMs: totalDurationMs,
    maxMs,
    medianMs,
    minMs,
    operationsPerSample,
    relativeStdDevPct,
    sampleCount,
  };
}

function resolveOperationsPerSample(benchmark, runConfig) {
  const baseIterations = benchmark.iterations;

  if (benchmark.calibrate === false) {
    return baseIterations;
  }

  const calibrationContext = benchmark.setup?.();

  try {
    runBenchmarkIterations(
      benchmark,
      calibrationContext,
      Math.min(runConfig.warmupIterations, baseIterations),
    );

    let operationsPerSample = baseIterations;
    let durationMs = measureBenchmarkDuration(
      benchmark,
      calibrationContext,
      operationsPerSample,
    );

    while (
      durationMs < runConfig.minSampleDurationMs &&
      operationsPerSample < baseIterations * runConfig.maxCalibrationScale
    ) {
      const growthFactor = Math.min(
        16,
        Math.max(
          2,
          Math.ceil(runConfig.minSampleDurationMs / Math.max(durationMs, 0.25)),
        ),
      );
      const nextOperationsPerSample = Math.min(
        baseIterations * runConfig.maxCalibrationScale,
        operationsPerSample * growthFactor,
      );

      if (nextOperationsPerSample === operationsPerSample) {
        break;
      }

      operationsPerSample = nextOperationsPerSample;
      durationMs = measureBenchmarkDuration(
        benchmark,
        calibrationContext,
        operationsPerSample,
      );
    }

    return operationsPerSample;
  } finally {
    benchmark.teardown?.(calibrationContext);
  }
}

function measureBenchmarkDuration(benchmark, context, iterations) {
  const start = performance.now();
  runBenchmarkIterations(benchmark, context, iterations);
  return performance.now() - start;
}

function runBenchmarkIterations(benchmark, context, iterations) {
  for (let index = 0; index < iterations; index += 1) {
    benchmark.task(context);
  }
}

export function runBenchmarkSuite(suiteTitle, sections, options = {}) {
  const { quiet = false } = options;
  const runConfig = createBenchmarkRunConfig(options);
  const suite = {
    benchmarkPreset: runConfig.preset,
    title: suiteTitle,
    environment: getEnvironment(),
    sections: [],
  };

  if (!quiet) {
    console.log(suiteTitle);
  }

  for (const section of sections) {
    const sectionResult = {
      title: section.title,
      cases: [],
    };

    if (!quiet) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log(section.title);
      console.log(SECTION_DIVIDER);
    }

    for (const benchmark of section.cases) {
      const result = measureCase(benchmark, runConfig);
      const benchmarkResult = {
        name: benchmark.name,
        averageMs: result.averageMs,
        configuredIterations: benchmark.iterations,
        durationMs: result.durationMs,
        iterations: result.operationsPerSample,
        maxMs: result.maxMs,
        medianMs: result.medianMs,
        minMs: result.minMs,
        relativeStdDevPct: result.relativeStdDevPct,
        sampleCount: result.sampleCount,
      };

      sectionResult.cases.push(benchmarkResult);

      if (!quiet) {
        console.log(
          `${benchmark.name}: median ${formatBenchmarkDuration(benchmarkResult.medianMs)}, mean ${formatBenchmarkDuration(benchmarkResult.averageMs)}, rsd ${benchmarkResult.relativeStdDevPct.toFixed(1)}% (${benchmarkResult.iterations} ops/sample from base ${benchmarkResult.configuredIterations}, ${benchmarkResult.sampleCount} samples)`,
        );
      }
    }

    suite.sections.push(sectionResult);
  }

  return suite;
}

export function createBenchmarkRunConfig(options = {}) {
  const presetName = options.preset ?? "full";
  const preset = BENCHMARK_PRESETS[presetName];

  if (!preset) {
    throw new TypeError(`Unknown benchmark preset: ${String(presetName)}.`);
  }

  return {
    ...preset,
    preset: presetName,
  };
}

export async function writeJsonReport(filePath, report) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function writeTextReport(filePath, text) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, text, "utf8");
}

function formatBenchmarkDuration(valueMs) {
  if (valueMs < 0.001) {
    return `${(valueMs * 1_000_000).toFixed(0)} ns/op`;
  }

  return `${valueMs.toFixed(3)} ms/op`;
}
