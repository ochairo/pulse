import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";

export const SECTION_DIVIDER = "-".repeat(72);

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

function measureCase(benchmark) {
  const context = benchmark.setup?.();

  try {
    for (let index = 0; index < 25; index += 1) {
      benchmark.task(context);
    }

    const start = performance.now();

    for (let index = 0; index < benchmark.iterations; index += 1) {
      benchmark.task(context);
    }

    const durationMs = performance.now() - start;
    return {
      durationMs,
      averageMs: durationMs / benchmark.iterations,
    };
  } finally {
    benchmark.teardown?.(context);
  }
}

export function runBenchmarkSuite(suiteTitle, sections, options = {}) {
  const { quiet = false } = options;
  const suite = {
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
      const result = measureCase(benchmark);
      const benchmarkResult = {
        name: benchmark.name,
        iterations: benchmark.iterations,
        averageMs: result.averageMs,
        durationMs: result.durationMs,
      };

      sectionResult.cases.push(benchmarkResult);

      if (!quiet) {
        console.log(
          `${benchmark.name}: ${benchmarkResult.averageMs.toFixed(3)} ms/op (${benchmark.iterations} iterations)`,
        );
      }
    }

    suite.sections.push(sectionResult);
  }

  return suite;
}

export async function writeJsonReport(filePath, report) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function writeTextReport(filePath, text) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, text, "utf8");
}
