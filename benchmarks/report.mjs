import { fileURLToPath } from "node:url";
import { getEnvironment, writeJsonReport, writeTextReport } from "./shared.mjs";

const COMPARISON_LIBRARIES = ["pulse", "Legend-State", "MobX", "valtio"];

const SUMMARY_LIBRARY_GROUPS = {
  pulse: ["pulse"],
  "Legend-State": ["Legend-State"],
  MobX: ["MobX"],
  valtio: ["valtio"],
};

const SUMMARY_LIBRARIES = Object.keys(SUMMARY_LIBRARY_GROUPS);

function formatNanoseconds(valueMs) {
  const valueNs = Math.round(valueMs * 1_000_000);
  return `${valueNs.toLocaleString("en-US")} ns/op`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function getBenchmarkScore(benchmark) {
  return benchmark.medianMs ?? benchmark.averageMs;
}

function parseLibraryName(benchmarkName) {
  const sortedLibraries = [...COMPARISON_LIBRARIES].sort(
    (left, right) => right.length - left.length,
  );

  for (const library of sortedLibraries) {
    if (benchmarkName === library || benchmarkName.startsWith(`${library} `)) {
      return library;
    }
  }

  return null;
}

function geometricMean(values) {
  if (values.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const totalLog = values.reduce(
    (sum, value) => sum + Math.log(Math.max(value, Number.EPSILON)),
    0,
  );

  return Math.exp(totalLog / values.length);
}

function getBenchmarkScenarioName(benchmarkName) {
  const library = parseLibraryName(benchmarkName);

  if (library === null) {
    return benchmarkName;
  }

  if (benchmarkName === library) {
    return "";
  }

  return benchmarkName.slice(`${library} `.length);
}

function getSummaryLibraryScenarioValues(sectionCases, summaryLibrary) {
  const sourceLibraries = SUMMARY_LIBRARY_GROUPS[summaryLibrary];
  const scenarioBestTimes = new Map();

  for (const benchmark of sectionCases) {
    const library = parseLibraryName(benchmark.name);

    if (!sourceLibraries.includes(library)) {
      continue;
    }

    const scenarioName = getBenchmarkScenarioName(benchmark.name);
    const previousBest = scenarioBestTimes.get(scenarioName);

    const benchmarkScore = getBenchmarkScore(benchmark);

    if (previousBest === undefined || benchmarkScore < previousBest) {
      scenarioBestTimes.set(scenarioName, benchmarkScore);
    }
  }

  return [...scenarioBestTimes.values()];
}

function getSummaryLibraryScores(sectionCases, summaryLibrary) {
  const values = getSummaryLibraryScenarioValues(sectionCases, summaryLibrary);

  return {
    library: summaryLibrary,
    scoreMs: geometricMean(values),
    scenarioCount: values.length,
  };
}

function buildComparisonSummary(comparisonSuite) {
  const categories = comparisonSuite.sections.map((section) => {
    const scores = SUMMARY_LIBRARIES.map((library) =>
      getSummaryLibraryScores(section.cases, library),
    );

    const winner = scores.reduce((best, score) =>
      score.scoreMs < best.scoreMs ? score : best,
    );

    return {
      title: section.title,
      winner: winner.library,
      winnerScoreMs: winner.scoreMs,
      scenarioCount: Math.max(...scores.map((score) => score.scenarioCount)),
      scores,
    };
  });

  const categoryWinsByLibrary = Object.fromEntries(
    SUMMARY_LIBRARIES.map((library) => [
      library,
      categories.filter((category) => category.winner === library).length,
    ]),
  );

  const equalCategoryScores = SUMMARY_LIBRARIES.map((library) => ({
    library,
    categoryWins: categoryWinsByLibrary[library],
    scoreMs: geometricMean(
      categories.map((category) => {
        const score = category.scores.find(
          (entry) => entry.library === library,
        );
        return score?.scoreMs ?? Number.POSITIVE_INFINITY;
      }),
    ),
  })).sort((left, right) => left.scoreMs - right.scoreMs);

  const scenarioWeightedScores = SUMMARY_LIBRARIES.map((library) => {
    const values = comparisonSuite.sections.flatMap((section) =>
      getSummaryLibraryScenarioValues(section.cases, library),
    );

    return {
      library,
      categoryWins: categoryWinsByLibrary[library],
      scoreMs: geometricMean(values),
    };
  }).sort((left, right) => left.scoreMs - right.scoreMs);

  const mostCategoryWins =
    [...equalCategoryScores].sort((left, right) => {
      if (right.categoryWins !== left.categoryWins) {
        return right.categoryWins - left.categoryWins;
      }

      return left.scoreMs - right.scoreMs;
    })[0]?.library ?? null;

  return {
    categories,
    breadth: {
      mostCategoryWins,
      scores: SUMMARY_LIBRARIES.map((library) => ({
        library,
        categoryWins: categoryWinsByLibrary[library],
      })).sort((left, right) => {
        if (right.categoryWins !== left.categoryWins) {
          return right.categoryWins - left.categoryWins;
        }

        const leftScore = equalCategoryScores.find(
          (entry) => entry.library === left.library,
        );
        const rightScore = equalCategoryScores.find(
          (entry) => entry.library === right.library,
        );

        return (
          (leftScore?.scoreMs ?? Number.POSITIVE_INFINITY) -
          (rightScore?.scoreMs ?? Number.POSITIVE_INFINITY)
        );
      }),
    },
    overall: {
      equalCategory: {
        winner: equalCategoryScores[0]?.library ?? null,
        scores: equalCategoryScores,
      },
      scenarioWeighted: {
        winner: scenarioWeightedScores[0]?.library ?? null,
        scores: scenarioWeightedScores,
      },
    },
  };
}

function renderSuiteSection(section) {
  const lines = [
    `### ${section.title}`,
    "",
    "| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const benchmark of section.cases) {
    lines.push(
      `| ${benchmark.name} | ${formatNanoseconds(getBenchmarkScore(benchmark))} | ${formatNanoseconds(benchmark.averageMs)} | ${formatPercent(benchmark.relativeStdDevPct ?? 0)} | ${benchmark.sampleCount ?? 1} | ${benchmark.iterations} | ${benchmark.configuredIterations ?? benchmark.iterations} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function renderComparisonSummary(summary) {
  const libraryHeaders = SUMMARY_LIBRARIES.join(" | ");
  const libraryDivider = SUMMARY_LIBRARIES.map(() => "---:").join(" | ");
  const lines = [
    "## Comparison Summary",
    "",
    "Category winners use the lowest median within that category. For multi-scenario categories like Editable Table Costs, the category score is the geometric mean of that library's per-scenario medians.",
    "Store Creation Cost measures wrapping a 100-element user array. Wide Array Item Replace writes the last item in a 10k array to stress immutable container costs at scale.",
    "Hot Read Costs keeps store setup outside the timed loop and measures repeated root, deep-leaf, and table-cell reads on reused state.",
    "General App Cold Update keeps store creation inside the timed task. General App Hot Writes uses one setup per benchmark and measures steady-state updates on the same wrapped store.",
    "Subscription Lifecycle categories measure attach-detach cost without writes. Subscription Dispatch categories keep listener setup outside the timed loop and measure steady-state writes with an already-subscribed listener.",
    "Editable Table Subscription Lifecycle measures UI mount-unmount style listener attachment for 50 row listeners and a 20x30 visible window of cell listeners.",
    "Each case is sampled multiple times. Iteration counts are adaptively calibrated to reach a meaningful sample duration, then tables show median, mean, relative standard deviation, sample count, calibrated ops per sample, and base configured ops.",
    "Pulse uses batching only in scenarios where coordinated multi-write updates are the intended mutation model.",
    "Equal-Category Overall gives each top-level category the same weight.",
    "Scenario-Weighted Overall gives each benchmark row the same weight, so categories with more scenarios contribute more.",
    "Category Wins is shown separately as a breadth signal.",
    "",
    "### Category Winners",
    "",
    `| Category | ${libraryHeaders} | Winner |`,
    `| --- | ${libraryDivider} | --- |`,
  ];

  for (const category of summary.categories) {
    const scoreByLibrary = Object.fromEntries(
      category.scores.map((score) => [
        score.library,
        formatNanoseconds(score.scoreMs),
      ]),
    );

    const scoreColumns = SUMMARY_LIBRARIES.map(
      (library) => scoreByLibrary[library],
    ).join(" | ");

    lines.push(`| ${category.title} | ${scoreColumns} | ${category.winner} |`);
  }

  lines.push(
    "",
    "### Category Breadth",
    "",
    "| Library | Category Wins |",
    "| --- | ---: |",
  );

  for (const score of summary.breadth.scores) {
    lines.push(`| ${score.library} | ${score.categoryWins} |`);
  }

  lines.push(
    "",
    `Most category wins: ${summary.breadth.mostCategoryWins}`,
    "",
    "### Equal-Category Overall",
    "",
    "| Library | Category Wins | Equal-Category Score |",
    "| --- | ---: | ---: |",
  );

  for (const score of summary.overall.equalCategory.scores) {
    lines.push(
      `| ${score.library} | ${score.categoryWins} | ${formatNanoseconds(score.scoreMs)} |`,
    );
  }

  lines.push(
    "",
    `Equal-category overall winner: ${summary.overall.equalCategory.winner}`,
    "",
    "### Scenario-Weighted Overall",
    "",
    "| Library | Category Wins | Scenario-Weighted Score |",
    "| --- | ---: | ---: |",
  );

  for (const score of summary.overall.scenarioWeighted.scores) {
    lines.push(
      `| ${score.library} | ${score.categoryWins} | ${formatNanoseconds(score.scoreMs)} |`,
    );
  }

  lines.push(
    "",
    `Scenario-weighted overall winner: ${summary.overall.scenarioWeighted.winner}`,
    "",
  );

  return lines.join("\n");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Benchmarks",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Environment: Node ${report.environment.node} on ${report.environment.platform} ${report.environment.arch}`,
    "",
    "Shared-scenario comparisons are directional, not absolute. `pulse` includes deep proxy traversal and path-aware listener bookkeeping that the baseline libraries model differently.",
    "Cold scenarios keep state creation inside the timed task. Hot scenarios use `setup` once and measure steady-state reads or writes against an already wrapped store.",
    "Bulk comparison cases use each library's intended mutation model where available: `runInAction` for MobX, `batch` for Legend-State, and direct proxy mutation for Valtio.",
    "Subscription cases are library-shaped: Pulse and Legend-State use explicit node listeners, Valtio uses proxy subscriptions, and MobX uses tracked reactions for the row or table shape being observed.",
    "Store creation and wide-array cases isolate initialization and immutable container overhead. Subscription cases focus on exact-path node listeners.",
    "Operation timings are rendered in ns/op throughout this report for consistent comparison across fast and slow scenarios.",
  ];

  if (report.pulse) {
    lines.push("", "## Pulse Suite", "");

    for (const section of report.pulse.sections) {
      lines.push(renderSuiteSection(section));
    }
  }

  if (report.comparison) {
    lines.push("## Comparison Suite", "");

    for (const section of report.comparison.sections) {
      lines.push(renderSuiteSection(section));
    }
  }

  if (report.summary) {
    lines.push(renderComparisonSummary(report.summary));
  }

  return `${lines.join("\n")}\n`;
}

export function parseReportOptions(argv = process.argv.slice(2)) {
  const options = {
    includeComparison: true,
    includePulse: true,
    preset: "full",
  };

  for (const argument of argv) {
    if (argument === "--compare-only") {
      options.includePulse = false;
      continue;
    }

    if (argument === "--pulse-only") {
      options.includeComparison = false;
      continue;
    }

    if (argument.startsWith("--preset=")) {
      options.preset = argument.slice("--preset=".length);
      continue;
    }
  }

  return options;
}

export { renderMarkdownReport };

async function main(argv = process.argv.slice(2)) {
  const options = parseReportOptions(argv);

  if (!options.includePulse && !options.includeComparison) {
    throw new TypeError("At least one benchmark suite must be selected.");
  }

  console.log(
    `Generating benchmark report (${options.preset} preset): ${describeSelectedSuites(options)}`,
  );

  let comparison;
  if (options.includeComparison) {
    console.log("Running comparison suite...");
    const { runComparisonBenchmarkSuite } = await import("./compare.mjs");
    comparison = runComparisonBenchmarkSuite({
      preset: options.preset,
      quiet: true,
    });
  }

  let pulse;
  if (options.includePulse) {
    console.log("Running pulse suite...");
    const { runPulseBenchmarkSuite } = await import("./runtime.mjs");
    pulse = runPulseBenchmarkSuite({
      preset: options.preset,
      quiet: true,
    });
  }

  console.log("Rendering report...");

  const report = {
    generatedAt: new Date().toISOString(),
    environment: getEnvironment(),
    ...(pulse ? { pulse } : {}),
    ...(comparison ? { comparison } : {}),
    ...(comparison ? { summary: buildComparisonSummary(comparison) } : {}),
  };

  await writeJsonReport(
    "/Users/andres.oshiro/projects/ochairo/pulse/.release-artifacts/benchmark-latest.json",
    report,
  );
  await writeTextReport(
    "/Users/andres.oshiro/projects/ochairo/pulse/docs/BENCHMARKS.md",
    renderMarkdownReport(report),
  );

  console.log(
    "Wrote .release-artifacts/benchmark-latest.json and docs/BENCHMARKS.md",
  );
}

function describeSelectedSuites(options) {
  if (options.includePulse && options.includeComparison) {
    return "pulse + comparison";
  }

  return options.includePulse ? "pulse only" : "comparison only";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
