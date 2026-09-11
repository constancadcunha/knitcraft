/**
 * Turning a design intent into an actual charted motif.
 *
 * Without this the studio could only recolour a blank stocking-stitch grid, so
 * asking for "an aran jumper with big twisting cables" produced a plain chart
 * in autumn colours — the user's complaint that the output "isn't even what I
 * described".
 *
 * Everything here writes a chart that must still VALIDATE: stitch counts have
 * to reconcile row to row, cables may not run off the edge, and crossings
 * belong on right-side rows. `applyMotif` checks its own output and falls back
 * to the untouched chart rather than returning something unworkable.
 */

import {
  cloneChart,
  isChartValid,
  placeSymbol,
  validateChart,
  type SymbolChart,
} from "@/lib/chart";

export type MotifKind = "colourwork" | "cable" | "lace" | "texture" | "plain";

export interface MotifOptions {
  kind: MotifKind;
  /** Hex colours from the design. Index 0 is the background. */
  palette?: string[];
  /** Anything deterministic — the pattern name — so the same design redraws the same. */
  seed?: string;
}

/** Cheap deterministic hash so a design always redraws identically. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * A design's drawing parameters, pulled from independent slices of one hash.
 *
 * Collapsing the seed to a single small number gave only a handful of distinct
 * motifs, so two different designs could draw identically — and "every pattern
 * looks the same" is half of what made the old output feel generated. Each
 * field below moves independently, so the variant space is the product of them.
 */
interface Variant {
  /** Phase shift across the stitches. */
  offset: number;
  /** Rows in one band repeat, motif band plus plain ground. */
  period: number;
  /** Which of the peerie shapes to draw. */
  shape: number;
  /** Where the colour sequence starts. */
  colourRotation: number;
  /** Rows between cable crossings. */
  crossEvery: number;
  /** Stitches between eyelet repeats. */
  laceRepeat: number;
}

function variantFor(seedText: string): Variant {
  const h = hash(seedText);
  return {
    offset: h % 4,
    period: 6 + ((h >>> 3) % 5),        // 6..10 rows
    shape: (h >>> 7) % 3,
    colourRotation: (h >>> 11) % 3,
    crossEvery: 6 + ((h >>> 15) % 3) * 2, // 6, 8 or 10 rows
    laceRepeat: 4 + ((h >>> 19) % 4),     // 4..7 stitches
  };
}

const KNIT = { plain: "k", purl: "p" } as const;
const CROCHET = { plain: "dc", purl: "bpdc" } as const;

function vocabulary(chart: SymbolChart) {
  return chart.craft === "crocheting" ? CROCHET : KNIT;
}

/** Write a symbol straight into a cell. Only safe for one-cell symbols. */
function put(chart: SymbolChart, row: number, col: number, symbolId: string, colorIndex = 0) {
  const cells = chart.rows[row];
  if (!cells || col < 0 || col >= cells.length) return;
  cells[col] = { colorIndex, symbolId };
}

/* -------------------------------------------------------------------------- */
/* Colourwork                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Horizontal bands of motifs, the way Fair Isle is actually worked: every row
 * is plain fabric and only the COLOUR changes, so the stitch count is
 * untouched and the chart is valid by construction.
 */
function drawColourwork(chart: SymbolChart, variant: Variant, colours: number) {
  const v = vocabulary(chart);
  const contrast = Math.max(1, colours - 1);
  const { period, offset, shape, colourRotation } = variant;
  const bandRows = Math.max(3, period - 3);

  for (let row = 0; row < chart.height; row += 1) {
    const rowInBand = row % period;
    const inBand = rowInBand < bandRows;
    const bandIndex = Math.floor(row / period);
    const bandColour = 1 + ((bandIndex + colourRotation) % contrast);

    for (let col = 0; col < chart.width; col += 1) {
      let colorIndex = 0;
      if (inBand) {
        const x = (col + offset) % 4;
        const mid = Math.floor(bandRows / 2);
        const distance = Math.abs(rowInBand - mid);
        // Three peerie shapes: a diamond lattice, a vertical stripe pair, and
        // a stepped chevron. Each reads clearly at stitch scale.
        const onMotif =
          shape === 0
            ? distance === 0 || (distance === 1 ? x === 1 || x === 3 : x === 2)
            : shape === 1
              ? x === (rowInBand + offset) % 4 || x === (rowInBand + offset + 2) % 4
              : (col + rowInBand + offset) % 4 === 0;
        if (onMotif) colorIndex = bandColour;
      } else if (rowInBand === bandRows + 1 && (col + offset) % 2 === 0) {
        // A single alternating row separates the bands.
        colorIndex = bandColour;
      }
      put(chart, row, col, v.plain, colorIndex);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Texture                                                                     */
/* -------------------------------------------------------------------------- */

/** Seed stitch: knit and purl alternating, offset every row. Always valid. */
function drawTexture(chart: SymbolChart, variant: Variant) {
  const v = vocabulary(chart);
  // shape 0 is seed stitch; 1 and 2 widen it into moss and basketweave.
  const block = variant.shape === 0 ? 1 : variant.shape === 1 ? 2 : 3;
  for (let row = 0; row < chart.height; row += 1) {
    for (let col = 0; col < chart.width; col += 1) {
      const raised =
        (Math.floor(row / block) + Math.floor((col + variant.offset) / block)) % 2 === 0;
      put(chart, row, col, raised ? v.purl : v.plain, 0);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Cable                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cable panels on a purl ground.
 *
 * Crossings go on right-side rows only: crossing on a wrong-side row inverts
 * the holding side, so it reads backwards from what was intended (validateChart
 * warns about exactly this).
 */
function drawCable(chart: SymbolChart, variant: Variant): SymbolChart {
  const v = vocabulary(chart);
  if (chart.craft === "crocheting") {
    // Crochet gets its texture from post stitches rather than crossings.
    for (let row = 0; row < chart.height; row += 1) {
      for (let col = 0; col < chart.width; col += 1) {
        put(chart, row, col, (col + variant.offset) % 4 < 2 ? "fpdc" : "bpdc", 0);
      }
    }
    return chart;
  }

  // Purl ground.
  for (let row = 0; row < chart.height; row += 1) {
    for (let col = 0; col < chart.width; col += 1) put(chart, row, col, v.purl, 0);
  }

  // A 4-stitch cable needs 4 columns plus 2 purl stitches either side.
  const panelWidth = 8;
  if (chart.width < panelWidth) return chart;

  const panels: number[] = [];
  for (let left = 2; left + 4 <= chart.width - 2; left += panelWidth) panels.push(left);
  if (panels.length === 0) return chart;

  // Knit columns run the full height of each panel.
  for (const left of panels) {
    for (let row = 0; row < chart.height; row += 1) {
      for (let col = left; col < left + 4; col += 1) put(chart, row, col, v.plain, 0);
    }
  }

  // Crossings every 6 rows on right-side rows. rows[0] is row 1 and is a RS
  // row on a flat chart that starts on the right side.
  let result = chart;
  const startSideIsRs = chart.startSide === "RS";
  for (let row = 0; row < result.height; row += 1) {
    const isRs = result.worked === "round" || (startSideIsRs ? row % 2 === 0 : row % 2 === 1);
    if (!isRs || row % variant.crossEvery !== 2) continue;
    for (const left of panels) {
      const lean = (Math.floor(row / variant.crossEvery) + panels.indexOf(left) + variant.shape) % 2 === 0;
      const placed = placeSymbol(result, row, left, lean ? "2/2 RC" : "2/2 LC");
      if (placed.ok) result = placed.value;
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Lace                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Eyelet repeat.
 *
 * Each yarn-over is paired with a decrease in the SAME row, so the row's
 * stitch count is unchanged — that pairing is what makes lace chartable at all,
 * and the audit found the old engine produced "decreases and no yo".
 */
function drawLace(chart: SymbolChart, variant: Variant) {
  const v = vocabulary(chart);

  for (let row = 0; row < chart.height; row += 1) {
    for (let col = 0; col < chart.width; col += 1) put(chart, row, col, v.plain, 0);
  }
  if (chart.craft === "crocheting" || chart.width < 6) return;

  const repeat = variant.laceRepeat + 2;
  for (let row = 0; row < chart.height; row += 1) {
    // Eyelets on every 4th row, and only on right-side rows so the decrease
    // leans the way the chart shows it.
    const isRs = chart.startSide === "RS" ? row % 2 === 0 : row % 2 === 1;
    if (!isRs || row % 4 !== 0) continue;

    const offset = (Math.floor(row / 4) + variant.offset) % 2 === 0 ? 0 : Math.floor(repeat / 2);
    for (let start = offset; start + 1 < chart.width; start += repeat) {
      // yo then k2tog: +1 then -1, so the row nets zero.
      put(chart, row, start, "yo", 0);
      put(chart, row, start + 1, "k2tog", 0);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

export interface MotifResult {
  chart: SymbolChart;
  /** False when the motif could not be applied and the chart is unchanged. */
  applied: boolean;
  reason?: string;
}

/**
 * Draw a motif onto a chart.
 *
 * The result is validated before it is returned: a motif that would leave the
 * stitch counts unreconcilable is discarded rather than handed to someone who
 * is about to knit it.
 */
export function applyMotif(input: SymbolChart, options: MotifOptions): MotifResult {
  if (options.kind === "plain") return { chart: input, applied: false, reason: "plain fabric" };

  const variant = variantFor(options.seed ?? input.name);
  let chart = cloneChart(input);

  if (options.palette && options.palette.length >= 2) {
    chart = { ...chart, colors: options.palette.slice(0, 6) };
  }

  switch (options.kind) {
    case "colourwork":
      drawColourwork(chart, variant, chart.colors.length);
      break;
    case "texture":
      drawTexture(chart, variant);
      break;
    case "cable":
      chart = drawCable(chart, variant);
      break;
    case "lace":
      drawLace(chart, variant);
      break;
  }

  if (!isChartValid(chart)) {
    const report = validateChart(chart);
    return {
      chart: input,
      applied: false,
      reason: report.errors[0]?.message ?? "the motif did not produce a workable chart",
    };
  }

  return { chart, applied: true };
}
