/**
 * Assembling a written pattern from a drafted garment.
 *
 * The bridge between the engine and the page a knitter reads. Everything here
 * is composed from parts that already own their arithmetic:
 *   panels        -> finished measurements
 *   panel areas   -> yarn, through the Munden formula
 *   each chart    -> row-by-row instructions with running stitch counts
 *   chart symbols -> the abbreviation list, derived from what is actually used
 *
 * Nothing is invented here and nothing is asked of a language model. The design
 * intent supplies only a name and prose; if it is absent the pattern is still
 * complete, just plainly named.
 */

import {
  buildAbbreviationList,
  chartToInstructions,
  type SymbolChart,
} from "@/lib/chart";
import {
  ballsFor,
  defaultYarnFor,
  estimateYarn,
  rectangleAreaCm2,
  type CycWeight,
  type Gauge,
  type PieceArea,
} from "@/lib/knit";
import type { GarmentDraft } from "@/lib/garments";
import type {
  Abbreviation,
  CraftType,
  Difficulty,
  GarmentSize,
  GarmentType,
  Instruction,
  Materials,
  Pattern,
  PatternSection,
  PatternSource,
} from "@/types";

export interface AssembleInput {
  id: string;
  name: string;
  craftType: CraftType;
  garmentType: GarmentType;
  size: GarmentSize;
  gauge: Gauge;
  draft: GarmentDraft;
  /** Yarn weight to cost the estimate at. Defaults to worsted. */
  cyc?: CycWeight;
  difficulty?: Difficulty;
  source?: PatternSource;
  sourceDescription?: string;
  /** Prose from the design intent. Never numbers. */
  notes?: string;
  now?: string;
}

/** A draft only ever holds yarn charts, but be explicit rather than assume. */
function asSymbolChart(chart: SymbolChart): SymbolChart | null {
  return chart.craft === "knitting" || chart.craft === "crocheting" ? chart : null;
}

/**
 * Build the written pattern.
 *
 * Each piece becomes a section whose instructions come from its chart, so the
 * words and the chart can never disagree — they are the same data rendered two
 * ways. That is the property the old engine lacked: it wrote prose from one set
 * of numbers and drew charts from another.
 */
export function assemblePattern(input: AssembleInput): Pattern {
  const now = input.now ?? new Date().toISOString();
  const { draft, gauge } = input;

  const areas: PieceArea[] = draft.pieces.map((piece) => ({
    name: piece.panel.name,
    areaCm2: rectangleAreaCm2(piece.panel.widthCm, piece.panel.heightCm),
  }));

  const estimate = estimateYarn({ pieces: areas, gauge });
  const yarn = defaultYarnFor(input.cyc ?? 4);
  const balls = ballsFor(estimate.metres, yarn);

  const measurements: Record<string, number> = {};
  for (const piece of draft.pieces) {
    measurements[`${piece.panel.name} width`] = Math.round(piece.panel.widthCm * 10) / 10;
    measurements[`${piece.panel.name} length`] = Math.round(piece.panel.heightCm * 10) / 10;
  }

  const abbreviationMap = new Map<string, string>();
  const sections: PatternSection[] = [];

  for (const piece of draft.pieces) {
    const chart = asSymbolChart(piece.chart);
    if (!chart) continue;

    for (const entry of buildAbbreviationList(chart)) {
      if (!abbreviationMap.has(entry.abbr)) abbreviationMap.set(entry.abbr, entry.meaning);
    }

    // The chart is clipped to an editable window, so the piece's real stitch
    // count has to come from the panel or the pattern says "cast on 60" for a
    // 106-stitch back.
    const start = piece.panel.start ?? "cast-on";
    // Only a piece that genuinely starts fresh is cast on. A hat's body
    // continues out of its brim, and a neckband is picked up from an existing
    // edge — writing "cast on" for those tells the knitter to start a second
    // piece that should never exist.
    const written = chartToInstructions(chart, {
      totalStitches: piece.panel.stitches,
      includeCastOn: start === "cast-on",
    });

    const opening =
      start === "cast-on"
        ? written.castOnText
        : start === "continue"
          ? `Continue from ${piece.panel.from ?? "the previous piece"} with the ${piece.panel.stitches} live stitches.`
          : `With the right side facing, pick up and knit ${piece.panel.stitches} stitches evenly from ${piece.panel.from ?? "the edge"}.`;

    const instructions: Instruction[] = [
      { rowNumber: 0, text: opening },
      ...written.rows.map((row) => ({ rowNumber: row.rowNumber, text: row.text })),
    ];

    sections.push({
      name: piece.panel.name,
      description: [
        `${piece.panel.stitches} stitches × ${piece.panel.rows} rows`,
        `${piece.panel.widthCm.toFixed(1)} × ${piece.panel.heightCm.toFixed(1)} cm`,
        piece.panel.worked === "round" ? "worked in the round" : "worked flat",
        piece.panel.note,
      ]
        .filter(Boolean)
        .join(" · "),
      instructions,
      chartId: chart.id,
    });
  }

  const abbreviations: Abbreviation[] = [...abbreviationMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([abbr, meaning]) => ({ abbr, meaning, videoKeywords: `how to ${meaning}` }));

  const materials: Materials = {
    yarns: [
      {
        yarn,
        role: "MC",
        metres: Math.round(estimate.metres),
        balls: balls.totalBalls,
      },
    ],
    needles: [],
    notions: [],
  };

  return {
    id: input.id,
    name: input.name,
    craftType: input.craftType,
    garmentType: input.garmentType,
    size: input.size,
    difficulty: input.difficulty ?? "intermediate",
    gauge,
    measurements,
    materials,
    abbreviations,
    sections,
    notes: [input.notes, ...draft.warnings].filter(Boolean).join("\n\n"),
    estimatedTime: estimateTime(estimate.metres),
    source: input.source ?? "wizard",
    ...(input.sourceDescription ? { sourceDescription: input.sourceDescription } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Rough working time from yarn used.
 *
 * Deliberately a range in prose rather than a number: how long a garment takes
 * varies several-fold between knitters, and a precise-looking figure would be
 * false confidence. Roughly 100 m an hour is a common working estimate.
 */
function estimateTime(metres: number): string {
  const hours = metres / 100;
  if (hours < 3) return "an evening or two";
  if (hours < 8) return "a weekend";
  if (hours < 20) return `about ${Math.round(hours)} hours`;
  return `${Math.round(hours / 5) * 5}–${Math.round((hours * 1.6) / 5) * 5} hours`;
}
