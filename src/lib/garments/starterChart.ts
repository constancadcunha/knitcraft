/**
 * The starter chart.
 *
 * THE BUG THIS FIXES, in the user's words: "half of the options (like cowl,
 * gloves etc) when you try to create a chart they show just an empty (not even
 * a baseline) field". The old app only had hard-coded grids for a handful of
 * garment names; everything else opened a 0x0 editor.
 *
 * Every construction now hands the editor a real grid, sized from the stitch
 * and row counts it actually computed, pre-filled with the craft's fabric so
 * the knitter has something to edit rather than a void. A chart wider or taller
 * than a comfortable editing window is clipped to one repeat panel and carries
 * a repeat box saying so — the counts stay honest, the editor stays usable.
 */

import {
  type ChartCraft,
  type SymbolChart,
  createChart,
  getSymbol,
} from "../chart";
import type { Craft } from "../knit";
import type { WorkedAs } from "./types";

/** The largest grid worth opening an editor on. Beyond this, show one panel. */
export const MAX_CHART_WIDTH = 60;
export const MAX_CHART_HEIGHT = 60;

/** Baseline palette — main colour plus one contrast, on-brand for the pixel art. */
const STARTER_COLORS = ["#f5ede0", "#2b2b2b"];

export interface StarterChartInput {
  readonly id: string;
  readonly name: string;
  readonly craft: Craft;
  /** Real stitch count of the piece. */
  readonly stitches: number;
  /** Real row/round count of the piece. */
  readonly rows: number;
  readonly worked: WorkedAs;
  /** Stitch multiple the fabric repeats over, if the piece has one. */
  readonly repeat?: number;
  /** Rows of edge fabric at the bottom (a rib hem, a garter border). */
  readonly edgeRows?: number;
  /** Crochet fabric stitch. Ignored for knitting. */
  readonly crochetStitch?: "sc" | "hdc" | "dc";
}

export function chartCraftFor(craft: Craft): ChartCraft {
  return craft === "crochet" ? "crocheting" : "knitting";
}

/**
 * Clip a real count to an editable window, landing on a whole repeat where the
 * fabric has one so the panel tiles correctly.
 */
function windowFor(actual: number, max: number, repeat = 1): number {
  const safe = Math.max(1, Math.round(actual));
  if (safe <= max) return safe;
  const mult = Math.max(1, Math.round(repeat));
  const windowed = Math.floor(max / mult) * mult;
  return Math.max(mult, windowed);
}

export function starterChartFor(input: StarterChartInput): SymbolChart {
  const craft = chartCraftFor(input.craft);
  const repeat = Math.max(1, Math.round(input.repeat ?? (input.craft === "knitting" ? 4 : 1)));
  const width = windowFor(input.stitches, MAX_CHART_WIDTH, repeat);
  const height = windowFor(input.rows, MAX_CHART_HEIGHT, 2);
  const clipped = width < Math.round(input.stitches) || height < Math.round(input.rows);

  let chart = createChart({
    id: input.id,
    name: input.name,
    craft,
    width,
    height,
    colors: STARTER_COLORS.slice(),
    worked: input.worked === "round" ? "round" : "flat",
    startSide: "RS",
  });

  // Edge fabric at the bottom of the piece: a 2x2 rib for knitting, post
  // ribbing for crochet worked in dc/hdc, plain sc otherwise. Capped so a short
  // chart is not entirely edge.
  const edgeRows = Math.min(
    Math.max(0, Math.round(input.edgeRows ?? Math.min(6, Math.floor(height / 4)))),
    Math.max(0, height - 1),
  );

  const stitch = input.crochetStitch ?? "hdc";
  const plainId = input.craft === "crochet" ? stitch : "k";
  const purlId = input.craft === "crochet" ? (stitch === "sc" ? "sc" : "bpdc") : "p";
  const postId = input.craft === "crochet" ? (stitch === "sc" ? "sc" : "fpdc") : "k";

  // Fill the grid directly rather than through placeSymbol.
  //
  // placeSymbol is the immutable EDITING api: it clones the whole chart on
  // every call so an edit can never half-apply. Calling it once per cell to
  // build a fresh chart is quadratic — a 60x60 panel did 3,600 full grid
  // clones and took ~240 ms, which the chart editor pays every time you pick a
  // garment. We own this chart until we return it, so we can write the cells.
  //
  // Safe because every id used here is exactly one cell wide, so there are no
  // continuation cells and the multi-cell invariant cannot be broken. That is
  // asserted below rather than assumed.
  for (const id of [plainId, purlId, postId]) {
    const symbol = getSymbol(id);
    if (!symbol || symbol.width !== 1) {
      throw new Error(`starter chart needs 1-cell symbols; "${id}" is ${symbol ? `${symbol.width} wide` : "unknown"}`);
    }
  }

  for (let row = 0; row < height; row += 1) {
    const inEdge = row < edgeRows;
    const cells = chart.rows[row];
    for (let col = 0; col < width; col += 1) {
      // 2x2 rib: two columns of knit, two of purl. In the round every round is
      // worked the same way, so the column pattern is all the chart needs.
      const ribKnit = col % 4 < 2;
      cells[col] = {
        colorIndex: 0,
        symbolId: inEdge ? (ribKnit ? postId : purlId) : plainId,
      };
    }
  }

  if (clipped) {
    const boxed = {
      id: "panel",
      startCol: 0,
      endCol: width - 1,
      startRow: 0,
      endRow: height - 1,
      label: `Repeat this panel across ${Math.round(input.stitches)} sts and ${Math.round(input.rows)} ${input.worked === "round" ? "rounds" : "rows"}`,
    };
    chart = { ...chart, repeats: [boxed] };
  }

  return chart;
}
