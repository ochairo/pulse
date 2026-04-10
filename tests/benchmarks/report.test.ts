import { describe, expect, it } from "vitest";
import { createComparisonBenchmarkSections } from "../../benchmarks/compare.mjs";
import {
  parseReportOptions,
  renderMarkdownReport,
} from "../../benchmarks/report.mjs";

const ALLOWED_LIBRARY_PREFIXES = ["pulse", "Legend-State", "valtio"];

describe("benchmark report", () => {
  it("keeps the comparison suite limited to the supported libraries", () => {
    const sections = createComparisonBenchmarkSections();

    for (const section of sections) {
      for (const benchmark of section.cases) {
        const benchmarkLibrary = ALLOWED_LIBRARY_PREFIXES.find(
          (library) =>
            benchmark.name === library ||
            benchmark.name.startsWith(`${library} `),
        );

        expect(benchmarkLibrary).toBeDefined();
      }
    }
  });

  it("parses quick suite selection flags", () => {
    expect(parseReportOptions(["--preset=quick", "--compare-only"])).toEqual({
      includeComparison: true,
      includePulse: false,
      preset: "quick",
    });

    expect(parseReportOptions(["--pulse-only"])).toEqual({
      includeComparison: false,
      includePulse: true,
      preset: "full",
    });
  });

  it("renders benchmark timings in ns/op and calibrated ops columns", () => {
    const markdown = renderMarkdownReport({
      comparison: {
        sections: [
          {
            title: "Comparison Section",
            cases: [
              {
                name: "pulse root read",
                averageMs: 0.0004,
                configuredIterations: 1_000,
                iterations: 8_000,
                relativeStdDevPct: 4.2,
                sampleCount: 3,
                medianMs: 0.0003,
              },
            ],
          },
        ],
      },
      environment: {
        arch: "arm64",
        node: "v24.14.1",
        platform: "darwin",
      },
      generatedAt: "2026-04-06T00:00:00.000Z",
      pulse: {
        sections: [
          {
            title: "Pulse Section",
            cases: [
              {
                name: "root get",
                averageMs: 0.0004,
                configuredIterations: 500,
                iterations: 4_000,
                relativeStdDevPct: 2.1,
                sampleCount: 3,
                medianMs: 0.0003,
              },
            ],
          },
        ],
      },
      summary: {
        breadth: {
          mostCategoryWins: "pulse",
          scores: [{ library: "pulse", categoryWins: 1 }],
        },
        categories: [
          {
            title: "Comparison Section",
            winner: "pulse",
            winnerScoreMs: 0.0003,
            scenarioCount: 1,
            scores: [
              {
                library: "pulse",
                scoreMs: 0.0003,
                scenarioCount: 1,
              },
            ],
          },
        ],
        overall: {
          equalCategory: {
            winner: "pulse",
            scores: [
              {
                library: "pulse",
                categoryWins: 1,
                scoreMs: 0.0003,
              },
            ],
          },
          scenarioWeighted: {
            winner: "pulse",
            scores: [
              {
                library: "pulse",
                categoryWins: 1,
                scoreMs: 0.0003,
              },
            ],
          },
        },
      },
    });

    expect(markdown).toContain(
      "| Scenario | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |",
    );
    expect(markdown).toContain("300 ns/op");
    expect(markdown).toContain(
      "| root get | 300 ns/op | 400 ns/op | 2.1% | 3 | 4000 | 500 |",
    );
    expect(markdown).toContain("| pulse | 1 | 300 ns/op |");
    expect(markdown).toContain(
      "Operation timings are rendered in ns/op throughout this report",
    );
    expect(markdown).not.toContain("ms/op");
    expect(markdown.match(/## Pulse Suite/g)).toHaveLength(1);
  });

  it("renders compare-only reports without a pulse section", () => {
    const markdown = renderMarkdownReport({
      comparison: {
        sections: [
          {
            title: "Comparison Section",
            cases: [],
          },
        ],
      },
      environment: {
        arch: "arm64",
        node: "v24.14.1",
        platform: "darwin",
      },
      generatedAt: "2026-04-06T00:00:00.000Z",
      summary: {
        breadth: {
          mostCategoryWins: "pulse",
          scores: [{ library: "pulse", categoryWins: 1 }],
        },
        categories: [],
        overall: {
          equalCategory: {
            winner: "pulse",
            scores: [
              {
                library: "pulse",
                categoryWins: 1,
                scoreMs: 0.001,
              },
            ],
          },
          scenarioWeighted: {
            winner: "pulse",
            scores: [
              {
                library: "pulse",
                categoryWins: 1,
                scoreMs: 0.001,
              },
            ],
          },
        },
      },
    });

    expect(markdown).not.toContain("## Pulse Suite");
    expect(markdown).toContain("## Comparison Suite");
  });
});
