import { runComparisonBenchmarkSuite } from "./compare.mjs";
import { runPulseBenchmarkSuite } from "./runtime.mjs";
import { getEnvironment, writeJsonReport, writeTextReport } from "./shared.mjs";

const COMPARISON_LIBRARIES = ["pulse", "Legend-State", "MobX", "valtio"];

const SUMMARY_LIBRARY_GROUPS = {
  pulse: ["pulse"],
  "Legend-State": ["Legend-State"],
  MobX: ["MobX"],
  valtio: ["valtio"],
};

const SUMMARY_LIBRARIES = Object.keys(SUMMARY_LIBRARY_GROUPS);

function formatMilliseconds(value) {
  return `${value.toFixed(3)} ms/op`;
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

    if (previousBest === undefined || benchmark.averageMs < previousBest) {
      scenarioBestTimes.set(scenarioName, benchmark.averageMs);
    }
  }

  return [...scenarioBestTimes.values()];
}

function getSummaryLibraryScores(sectionCases, summaryLibrary) {
  const values = getSummaryLibraryScenarioValues(sectionCases, summaryLibrary);

  return {
    library: summaryLibrary,
    averageMs: geometricMean(values),
    scenarioCount: values.length,
  };
}

function buildComparisonSummary(comparisonSuite) {
  const categories = comparisonSuite.sections.map((section) => {
    const scores = SUMMARY_LIBRARIES.map((library) =>
      getSummaryLibraryScores(section.cases, library),
    );

    const winner = scores.reduce((best, score) =>
      score.averageMs < best.averageMs ? score : best,
    );

    return {
      title: section.title,
      winner: winner.library,
      winnerAverageMs: winner.averageMs,
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
    averageMs: geometricMean(
      categories.map((category) => {
        const score = category.scores.find(
          (entry) => entry.library === library,
        );
        return score?.averageMs ?? Number.POSITIVE_INFINITY;
      }),
    ),
  })).sort((left, right) => left.averageMs - right.averageMs);

  const scenarioWeightedScores = SUMMARY_LIBRARIES.map((library) => {
    const values = comparisonSuite.sections.flatMap((section) =>
      getSummaryLibraryScenarioValues(section.cases, library),
    );

    return {
      library,
      categoryWins: categoryWinsByLibrary[library],
      averageMs: geometricMean(values),
    };
  }).sort((left, right) => left.averageMs - right.averageMs);

  const mostCategoryWins =
    [...equalCategoryScores].sort((left, right) => {
      if (right.categoryWins !== left.categoryWins) {
        return right.categoryWins - left.categoryWins;
      }

      return left.averageMs - right.averageMs;
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
          (leftScore?.averageMs ?? Number.POSITIVE_INFINITY) -
          (rightScore?.averageMs ?? Number.POSITIVE_INFINITY)
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
    "| Scenario | Average | Iterations |",
    "| --- | ---: | ---: |",
  ];

  for (const benchmark of section.cases) {
    lines.push(
      `| ${benchmark.name} | ${formatMilliseconds(benchmark.averageMs)} | ${benchmark.iterations} |`,
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
    "Category winners use the lowest average within that category. For multi-scenario categories like Editable Table Costs, the category score is the geometric mean of that library's scenarios in the category.",
    "Store Creation Cost measures wrapping a 100-element user array. Wide Array Item Replace writes the last item in a 10k array to stress immutable container costs at scale.",
    "Leaf Subscription Write measures subscribe-write-unsubscribe on a specific leaf field. Root Subscription Write does the same at the root level.",
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
        formatMilliseconds(score.averageMs),
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
      `| ${score.library} | ${score.categoryWins} | ${formatMilliseconds(score.averageMs)} |`,
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
      `| ${score.library} | ${score.categoryWins} | ${formatMilliseconds(score.averageMs)} |`,
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
    "Bulk comparison cases use each library's intended mutation model where available: `runInAction` for MobX, `batch` for Legend-State, and direct proxy mutation for Valtio.",
    "Subtree listener cases are also library-shaped: Pulse and Legend-State use explicit node listeners, Valtio uses subtree proxy subscriptions, and MobX uses tracked reactions for the row or table shape being observed.",
    "Store creation and wide-array cases isolate initialization and immutable container overhead. Leaf and root subscription cases measure fine-grained vs coarse-grained notification cost.",
    "",
    "## Pulse Suite",
    "",
  ];

  for (const section of report.pulse.sections) {
    lines.push(renderSuiteSection(section));
  }

  lines.push("## Comparison Suite", "");

  for (const section of report.comparison.sections) {
    lines.push(renderSuiteSection(section));
  }

  lines.push(renderComparisonSummary(report.summary));

  return `${lines.join("\n")}\n`;
}

async function main() {
  const comparison = runComparisonBenchmarkSuite({ quiet: true });
  const report = {
    generatedAt: new Date().toISOString(),
    environment: getEnvironment(),
    pulse: runPulseBenchmarkSuite({ quiet: true }),
    comparison,
    summary: buildComparisonSummary(comparison),
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

await main();
