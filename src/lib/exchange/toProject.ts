/**
 * Every import ends as a Project that opens in the tracker.
 *
 * That is the whole point of the feature: "if I give a chart, it shows in the
 * tracker; if I give something describing it by text, a chart shows
 * everything, and vice versa". So whatever came in — an image, a grid, a page
 * of written rows — leaves here as the same thing: one project, holding one
 * chart, with progress initialised for that chart and a WRITTEN pattern
 * derived from it.
 *
 * The written pattern is not a second source of truth. It is generated from
 * the chart by `chartToInstructions`, which is the only instruction writer in
 * the app, so the chart and the prose are provably the same artefact.
 */

import {
  type SymbolChart,
  buildAbbreviationList,
  chartToInstructions,
} from "@/lib/chart";
import { chartGeometry } from "@/lib/project/geometry";
import { createChartProgress, normalizeChartProgress } from "@/lib/project/progress";
import { createProject, createSavedChart } from "@/lib/project/factory";
import type { CycWeight } from "@/lib/knit";
import {
  type Difficulty,
  type GarmentSize,
  type GarmentType,
  type Instruction,
  type Pattern,
  type ProjectSource,
  type YarnCraft,
  type YarnProject,
  ONE_SIZE,
} from "@/types";

export interface ImportToProjectOptions {
  name: string;
  craft: YarnCraft;
  /** Defaults to "Other" / One Size — an import knows a chart, not a garment. */
  garmentType?: GarmentType;
  size?: GarmentSize;
  difficulty?: Difficulty;
  source: ProjectSource;
  id?: string;
  now?: string;
  cyc?: CycWeight;
  /** The piece this chart is, when the import knew ("Back", "Front"). */
  piece?: string;
}

/**
 * Written instructions for a chart, as a `Pattern` the pattern page can render.
 *
 * The gauge is rounded to whole stitches per 10 cm on purpose: `parsePattern`
 * reads a stored pattern's gauge back with an integer coercion, so a fractional
 * figure here would not survive an export and re-import. The project's own
 * `settings.gauge` keeps the exact number; this is the one a pattern prints.
 */
export function patternFromChart(
  chart: SymbolChart,
  project: YarnProject,
  now: string,
): Pattern {
  const instructions = chartToInstructions(chart, { showStitchCounts: true });
  const rows: Instruction[] = instructions.rows.map((row) => ({
    rowNumber: row.rowNumber,
    text: row.text,
    stitchesAfter: row.stitchesAfter,
  }));

  return {
    id: `${project.id}-pattern`,
    name: project.name,
    craftType: project.craftType,
    garmentType: project.garmentType,
    size: project.size,
    difficulty: project.difficulty,
    gauge: {
      ...project.settings.gauge,
      stitchesPer10cm: Math.round(project.settings.gauge.stitchesPer10cm),
      rowsPer10cm: Math.round(project.settings.gauge.rowsPer10cm),
    },
    measurements: {},
    materials: {
      yarns: [],
      needles: [
        {
          kind: project.craftType === "crocheting" ? "hook" : chart.worked === "round" ? "circular" : "straight",
          mm: project.settings.toolMm,
          use: "Main fabric",
        },
      ],
      notions: [],
    },
    abbreviations: buildAbbreviationList(chart).map((entry) => ({
      ...entry,
      // Search terms, never a hard-coded third-party URL — see types/index.ts.
      videoKeywords: `how to ${entry.abbr} ${project.craftType === "crocheting" ? "crochet" : "knitting"}`,
    })),
    sections: [
      {
        name: chart.name,
        description: instructions.castOnText,
        instructions: rows,
        chartId: chart.id,
      },
    ],
    notes: "",
    estimatedTime: "",
    source: "import",
    sourceDescription: project.source.description,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Wrap a chart as a complete, tracker-ready project.
 *
 * `progress.charts[chart.id]` is created here rather than lazily in the
 * tracker: `mutateChartProgress` is a no-op when the entry is missing, so an
 * imported project without it would silently refuse to count stitches.
 */
export function projectFromSymbolChart(
  chart: SymbolChart,
  options: ImportToProjectOptions,
): YarnProject {
  const now = options.now ?? new Date().toISOString();
  const base = createProject({
    id: options.id,
    name: options.name,
    craftType: options.craft,
    garmentType: options.garmentType ?? "Other",
    size: options.size ?? ONE_SIZE,
    difficulty: options.difficulty ?? "intermediate",
    source: options.source,
    cyc: options.cyc,
    now,
  });

  if (base.craftType === "cross-stitch") {
    // Unreachable: `options.craft` is a yarn craft. Stated so the narrowing is
    // explicit rather than a cast.
    throw new TypeError("projectFromSymbolChart needs a yarn craft");
  }

  const saved = createSavedChart({
    chart,
    name: chart.name,
    piece: options.piece ?? chart.name,
    order: 0,
    now,
  });

  const project: YarnProject = {
    ...base,
    // The chart decides how the fabric is worked; the garment default must not
    // override what the maker actually charted.
    settings: { ...base.settings, worked: chart.worked },
    charts: [saved],
    progress: {
      ...base.progress,
      activeChartId: chart.id,
      charts: {
        [chart.id]: normalizeChartProgress(chartGeometry(chart), createChartProgress(chart.id, now)),
      },
    },
    pattern: null,
  };

  return { ...project, pattern: patternFromChart(chart, project, now) };
}
