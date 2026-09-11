/**
 * The cross-stitch chart model.
 *
 * Deliberately NOT src/lib/chart's SymbolChart. A knitting chart is a grid of
 * stitches that consume and produce stitches, where symbols can span cells and
 * rows alternate reading direction. A cross-stitch chart is a different object:
 *
 *  - every cell is the same size and consumes nothing; there is no stitch
 *    arithmetic to reconcile, so no validation of counts
 *  - it is read the same way on every row, always left to right, top to bottom
 *  - a cell holds a FLOSS COLOUR, and conventionally also a symbol so the chart
 *    stays readable in black and white and to colour-blind stitchers
 *  - backstitch and French knots do not live in cells at all: backstitch runs
 *    along the LINES BETWEEN holes, and a knot sits on an intersection
 *
 * That last point is why this cannot be a grid of cells alone, and why forcing
 * cross stitch into the knitting model would have been wrong.
 */

export interface FlossColour {
  /** Manufacturer code, e.g. DMC "310". */
  code: string;
  name: string;
  hex: string;
  /** Single character or short string drawn in the cell on a symbol chart. */
  symbol: string;
}

export type StitchKind = "full" | "half" | "quarter" | "three-quarter";

export interface CrossStitchCell {
  /** Index into the chart palette, or null for unstitched fabric. */
  colour: number | null;
  kind?: StitchKind;
}

/**
 * A point on the GRID OF HOLES, not a cell. For a chart w cells wide there are
 * w + 1 holes across, so x runs 0..width inclusive.
 */
export interface HolePoint {
  x: number;
  y: number;
}

/** Backstitch runs hole to hole, including diagonally. */
export interface BackstitchLine {
  from: HolePoint;
  to: HolePoint;
  colour: number;
}

export interface FrenchKnot {
  at: HolePoint;
  colour: number;
}

export interface CrossStitchChart {
  schemaVersion: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  palette: FlossColour[];
  /** rows[0] is the TOP row: cross-stitch charts read top-down. */
  rows: CrossStitchCell[][];
  backstitch: BackstitchLine[];
  frenchKnots: FrenchKnot[];
}

export function createCrossStitchChart(options: {
  id: string;
  name?: string;
  width: number;
  height: number;
  palette?: FlossColour[];
}): CrossStitchChart {
  const { id, width, height } = options;
  if (width < 1 || height < 1) {
    throw new Error(`chart must be at least 1x1, got ${width}x${height}`);
  }
  return {
    schemaVersion: 1,
    id,
    name: options.name ?? "Untitled",
    width,
    height,
    palette: options.palette ?? [],
    rows: Array.from({ length: height }, () =>
      Array.from({ length: width }, (): CrossStitchCell => ({ colour: null }))
    ),
    backstitch: [],
    frenchKnots: [],
  };
}

function inBounds(chart: CrossStitchChart, x: number, y: number): boolean {
  return x >= 0 && x < chart.width && y >= 0 && y < chart.height;
}

/** A hole may sit on the far edge, so the valid range is inclusive of width/height. */
export function holeInBounds(chart: CrossStitchChart, p: HolePoint): boolean {
  return p.x >= 0 && p.x <= chart.width && p.y >= 0 && p.y <= chart.height;
}

export function cloneCrossStitchChart(chart: CrossStitchChart): CrossStitchChart {
  return {
    ...chart,
    palette: chart.palette.map((c) => ({ ...c })),
    rows: chart.rows.map((row) => row.map((cell) => ({ ...cell }))),
    backstitch: chart.backstitch.map((b) => ({ ...b, from: { ...b.from }, to: { ...b.to } })),
    frenchKnots: chart.frenchKnots.map((k) => ({ ...k, at: { ...k.at } })),
  };
}

export function setStitch(
  chart: CrossStitchChart,
  x: number,
  y: number,
  colour: number | null,
  kind: StitchKind = "full"
): CrossStitchChart {
  if (!inBounds(chart, x, y)) return chart;
  if (colour !== null && !chart.palette[colour]) return chart;

  const next = cloneCrossStitchChart(chart);
  next.rows[y][x] = colour === null ? { colour: null } : { colour, kind };
  return next;
}

export function addBackstitch(
  chart: CrossStitchChart,
  line: BackstitchLine
): CrossStitchChart {
  if (!holeInBounds(chart, line.from) || !holeInBounds(chart, line.to)) return chart;
  // A zero-length line is a stray click, not a stitch.
  if (line.from.x === line.to.x && line.from.y === line.to.y) return chart;
  if (!chart.palette[line.colour]) return chart;

  const next = cloneCrossStitchChart(chart);
  next.backstitch.push({ ...line, from: { ...line.from }, to: { ...line.to } });
  return next;
}

export function addFrenchKnot(chart: CrossStitchChart, knot: FrenchKnot): CrossStitchChart {
  if (!holeInBounds(chart, knot.at)) return chart;
  if (!chart.palette[knot.colour]) return chart;
  const next = cloneCrossStitchChart(chart);
  next.frenchKnots.push({ ...knot, at: { ...knot.at } });
  return next;
}

export interface ColourUsage {
  colourIndex: number;
  floss: FlossColour;
  /** Full crosses and part stitches, counted separately — they cost different thread. */
  fullStitches: number;
  partStitches: number;
  backstitchLength: number;
  frenchKnots: number;
  /** Full-cross equivalents, for floss estimation. */
  stitchEquivalent: number;
}

/**
 * Count every colour's usage.
 *
 * Part stitches are counted separately because a half stitch uses roughly half
 * the thread of a full cross, and a chart heavy in three-quarter stitches would
 * otherwise be over-estimated. Backstitch is measured in hole-to-hole length so
 * diagonal runs are not counted as though they were straight.
 */
export function colourUsage(chart: CrossStitchChart): ColourUsage[] {
  const usage = chart.palette.map((floss, colourIndex): ColourUsage => ({
    colourIndex,
    floss,
    fullStitches: 0,
    partStitches: 0,
    backstitchLength: 0,
    frenchKnots: 0,
    stitchEquivalent: 0,
  }));

  const PART_WEIGHT: Record<StitchKind, number> = {
    full: 1,
    half: 0.5,
    quarter: 0.25,
    "three-quarter": 0.75,
  };

  for (const row of chart.rows) {
    for (const cell of row) {
      if (cell.colour === null) continue;
      const entry = usage[cell.colour];
      if (!entry) continue;
      const kind = cell.kind ?? "full";
      if (kind === "full") entry.fullStitches += 1;
      else entry.partStitches += 1;
      entry.stitchEquivalent += PART_WEIGHT[kind];
    }
  }

  for (const line of chart.backstitch) {
    const entry = usage[line.colour];
    if (!entry) continue;
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    entry.backstitchLength += length;
    // Backstitch is a single pass rather than a cross, so it costs about a
    // third of what the same span of full crosses would.
    entry.stitchEquivalent += length / 3;
  }

  for (const knot of chart.frenchKnots) {
    const entry = usage[knot.colour];
    if (!entry) continue;
    entry.frenchKnots += 1;
    entry.stitchEquivalent += 1;
  }

  return usage.map((u) => ({
    ...u,
    stitchEquivalent: Math.round(u.stitchEquivalent * 100) / 100,
    backstitchLength: Math.round(u.backstitchLength * 100) / 100,
  }));
}

/** Total stitches on the chart, for the "N stitches" headline. */
export function totalStitches(chart: CrossStitchChart): number {
  return chart.rows.reduce(
    (sum, row) => sum + row.reduce((n, cell) => n + (cell.colour === null ? 0 : 1), 0),
    0
  );
}
