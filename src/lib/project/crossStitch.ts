/**
 * Cross-stitch fabric arithmetic.
 *
 * Cross stitch has no gauge swatch: the FABRIC fixes the size of every stitch
 * before a needle is threaded, so finished size is decided the moment you pick
 * Aida 14 over Aida 18. That makes these three numbers — stitches per inch,
 * finished size, cut size — the whole of cross-stitch "sizing", and they belong
 * with the deterministic engine rather than anywhere near a language model.
 *
 * The two fabric families count differently, which is the mistake to avoid:
 *   Aida is woven in blocks and takes ONE stitch per block, so its count IS the
 *   stitches per inch. Evenweave and linen are counted in THREADS and are
 *   normally worked over two of them, so 28 count evenweave and 14 count Aida
 *   give the same stitch size. Treating "28 count" as 28 stitches per inch
 *   halves the finished design, which is the classic beginner's ruined piece.
 */

import {
  type CrossStitchChart,
  type CrossStitchFabric,
  type CrossStitchSettings,
  type FlossColor,
  type StrandCount,
} from "@/types";

const CM_PER_INCH = 2.54;

/** Default bare fabric left on each side for hooping and framing: 3 inches. */
export const DEFAULT_MARGIN_CM = 7.5;

export function stitchesPerInch(fabric: CrossStitchFabric): number {
  return fabric.kind === "aida" ? fabric.count : fabric.count / fabric.over;
}

export function stitchesPerCm(fabric: CrossStitchFabric): number {
  return stitchesPerInch(fabric) / CM_PER_INCH;
}

export interface FinishedSize {
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
}

/** Size of the stitched area itself, with no margin. */
export function finishedSize(
  widthStitches: number,
  heightStitches: number,
  fabric: CrossStitchFabric,
): FinishedSize {
  const spi = stitchesPerInch(fabric);
  const widthIn = widthStitches / spi;
  const heightIn = heightStitches / spi;
  return {
    widthIn: round(widthIn, 2),
    heightIn: round(heightIn, 2),
    widthCm: round(widthIn * CM_PER_INCH, 1),
    heightCm: round(heightIn * CM_PER_INCH, 1),
  };
}

export interface CutSize {
  widthCm: number;
  heightCm: number;
}

/**
 * Fabric to cut: the design plus a margin on EVERY side, so the margin is added
 * twice to each dimension. Cutting a piece the size of the design is the other
 * classic ruined project — there is then nothing to hoop or to frame with.
 */
export function cutFabricSize(
  widthStitches: number,
  heightStitches: number,
  settings: Pick<CrossStitchSettings, "fabric" | "marginCm">,
): CutSize {
  const size = finishedSize(widthStitches, heightStitches, settings.fabric);
  const margin = Math.max(0, settings.marginCm) * 2;
  return {
    widthCm: round(size.widthCm + margin, 1),
    heightCm: round(size.heightCm + margin, 1),
  };
}

/** Finished and cut size for a whole chart, the numbers a pattern header prints. */
export function chartFinishedSize(chart: CrossStitchChart): FinishedSize {
  return finishedSize(chart.width, chart.height, chart.settings.fabric);
}

export function chartCutSize(chart: CrossStitchChart): CutSize {
  return cutFabricSize(chart.width, chart.height, chart.settings);
}

/* -------------------------------------------------------------------------- */
/* Floss                                                                       */
/* -------------------------------------------------------------------------- */

/** A DMC-style skein is 8 m of six-strand floss, i.e. 48 m of single strand. */
export const SKEIN_METRES = 8;
export const STRANDS_PER_SKEIN = 6;

/**
 * Thread used by one full cross, in multiples of the stitch side, per strand.
 *
 * Geometry: the two front diagonals are each side x sqrt(2), and the back of
 * the work adds roughly two more side-lengths getting from one to the next —
 * about 4.83 side-lengths in total.
 */
const GEOMETRIC_LENGTH_FACTOR = 2 * Math.SQRT2 + 2;

/**
 * Real thread used per geometric centimetre.
 *
 * Stripping the strands, the tail at the start and end of every needleful, and
 * the length discarded when thread frays all cost more than the stitch itself.
 * 1.6 is what makes this agree with the published coverage figure stitchers
 * actually plan against — about 1,700 full stitches from one skein worked with
 * two strands on 14 count Aida. `estimateSkeins` is tested against that.
 */
const REAL_WORLD_WASTE = 1.6;

/** Metres of thread for `stitches` full crosses, at the given fabric and strands. */
export function flossMetres(
  stitches: number,
  settings: Pick<CrossStitchSettings, "fabric" | "strands">,
): number {
  if (stitches <= 0) return 0;
  const sideCm = CM_PER_INCH / stitchesPerInch(settings.fabric);
  const perStrandCm = sideCm * GEOMETRIC_LENGTH_FACTOR * REAL_WORLD_WASTE;
  return round((perStrandCm * settings.strands * stitches) / 100, 2);
}

/** Whole skeins to buy. Always rounded up: half a skein cannot be bought. */
export function estimateSkeins(
  stitches: number,
  settings: Pick<CrossStitchSettings, "fabric" | "strands">,
): number {
  if (stitches <= 0) return 0;
  const metres = flossMetres(stitches, settings);
  return Math.max(1, Math.ceil(metres / (SKEIN_METRES * STRANDS_PER_SKEIN)));
}

export interface FlossUsage {
  colorIndex: number;
  floss: FlossColor;
  stitches: number;
  metres: number;
  skeins: number;
}

/**
 * Stitch count per shade, straight from the chart. This is the shopping list,
 * and it is counted rather than estimated — the only guess in it is the metres.
 */
export function flossUsage(chart: CrossStitchChart): FlossUsage[] {
  const counts = new Map<number, number>();
  for (const row of chart.rows) {
    for (const cell of row) {
      if (cell.colorIndex === undefined) continue;
      counts.set(cell.colorIndex, (counts.get(cell.colorIndex) ?? 0) + 1);
    }
  }
  // Backstitch and knots are stitched in floss too; count them so a colour used
  // only for outlines still appears on the shopping list.
  for (const segment of chart.backstitch) {
    counts.set(segment.colorIndex, (counts.get(segment.colorIndex) ?? 0) + 1);
  }
  for (const knot of chart.frenchKnots) {
    counts.set(knot.colorIndex, (counts.get(knot.colorIndex) ?? 0) + 1);
  }

  return chart.palette
    .map((floss, colorIndex) => {
      const stitches = counts.get(colorIndex) ?? 0;
      return {
        colorIndex,
        floss,
        stitches,
        metres: flossMetres(stitches, chart.settings),
        skeins: estimateSkeins(stitches, chart.settings),
      };
    })
    .filter((usage) => usage.stitches > 0);
}

/* -------------------------------------------------------------------------- */
/* Prose                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A speakable description of one row, for "read that" on the voice counter.
 *
 * Run-length encoded, because "4 blank, 6 in 310 black, 4 blank" is followable
 * by ear and "blank blank blank blank black black..." is not.
 */
export function describeCrossStitchRow(chart: CrossStitchChart, rowIndex: number): string {
  const cells = chart.rows[rowIndex];
  if (!cells || cells.length === 0) return `Row ${rowIndex + 1}: nothing to stitch.`;

  const runs: Array<{ colorIndex?: number; count: number }> = [];
  for (const cell of cells) {
    const last = runs[runs.length - 1];
    if (last && last.colorIndex === cell.colorIndex) last.count += 1;
    else runs.push({ colorIndex: cell.colorIndex, count: 1 });
  }

  const parts = runs.map((run) => {
    if (run.colorIndex === undefined) return `${run.count} blank`;
    const floss = chart.palette[run.colorIndex];
    const name = floss ? `${floss.code} ${floss.name}` : `colour ${run.colorIndex + 1}`;
    return `${run.count} in ${name}`;
  });

  return `Row ${rowIndex + 1}: ${parts.join(", ")}.`;
}

/** The strands line a pattern prints: "2 strands over 1; backstitch in 1". */
export function describeStrands(settings: CrossStitchSettings): string {
  const over = settings.fabric.kind === "evenweave" ? ` over ${settings.fabric.over}` : "";
  return `${strandWord(settings.strands)}${over}; backstitch in ${strandWord(settings.backstitchStrands)}`;
}

function strandWord(strands: StrandCount): string {
  return `${strands} strand${strands === 1 ? "" : "s"}`;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
