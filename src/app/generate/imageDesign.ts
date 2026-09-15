/**
 * Charting a photograph EXACTLY, as opposed to being inspired by it.
 *
 * The user asked for both, explicitly chosen: "either get the graph exactly
 * from the image (so image in form of a graph and you can choose how many
 * colours), or inspired from the image (so the AI sees the image, understands
 * where the garment is and creates the graph)".
 *
 * This module is the EXACT half, and it is deliberately model-free: turning a
 * picture into a grid is arithmetic, and arithmetic does not belong in a
 * language model. `src/lib/imageChart.ts` quantises the pixels; `chartFromImage`
 * enforces the constraint that makes the result knittable — stranded colourwork
 * carries at most two colours per row — and this module is the one piece that
 * was missing: getting the picture onto a grid that is the SIZE OF THE PIECE.
 *
 * A photo is ~72 x 96 cells and a sleeve panel might be 40 x 60 stitches. The
 * picture has to be resampled to the piece's own stitch and row count, or the
 * chart's counts stop matching the garment's.
 */

import { chartFromImage, type ImportedGrid } from "@/lib/motif";
import type { SymbolChart } from "@/lib/chart";

/**
 * Nearest-neighbour resample.
 *
 * Deliberately NOT interpolated: every cell must stay one of the palette
 * indices, because a chart cell is a stitch in one yarn. Averaging two palette
 * indices would invent a colour that is not in the palette — the classic bug in
 * naive image-to-chart converters.
 */
export function resampleGrid(
  grid: readonly (readonly number[])[],
  width: number,
  height: number
): number[][] {
  const sourceHeight = grid.length;
  const sourceWidth = sourceHeight > 0 ? grid[0].length : 0;
  if (sourceWidth < 1 || sourceHeight < 1 || width < 1 || height < 1) {
    return Array.from({ length: Math.max(1, height) }, () =>
      Array.from({ length: Math.max(1, width) }, () => 0)
    );
  }

  return Array.from({ length: height }, (_, row) => {
    // Sample the CENTRE of each target cell, not its corner: sampling corners
    // shifts the picture up and left by half a stitch and clips the last row.
    const sourceRow = Math.min(sourceHeight - 1, Math.floor(((row + 0.5) * sourceHeight) / height));
    return Array.from({ length: width }, (_, col) => {
      const sourceCol = Math.min(sourceWidth - 1, Math.floor(((col + 0.5) * sourceWidth) / width));
      return grid[sourceRow][sourceCol] ?? 0;
    });
  });
}

export interface ExactChartResult {
  chart: SymbolChart;
  /** Rows whose colour count had to be reduced to stay workable. */
  rowsReduced: number;
  note?: string;
}

/**
 * Chart a picture onto one piece, at that piece's own stitch and row count.
 *
 * The piece's `worked` and `startSide` are carried across: a hat body worked in
 * the round must not come back as a flat chart, or every other row's
 * instructions read backwards.
 */
export function exactChartForPiece(
  imported: ImportedGrid,
  target: SymbolChart,
  options: { maxColoursPerRow: number }
): ExactChartResult {
  // Fit inside the piece without stretching the motif into a different shape.
  const sourceWidth = imported.grid[0]?.length ?? 1;
  const sourceHeight = imported.grid.length || 1;
  const scale = Math.min(target.width / sourceWidth, target.height / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const fitted = resampleGrid(imported.grid, width, height);
  const left = Math.floor((target.width - width) / 2);
  const top = Math.floor((target.height - height) / 2);
  const grid = Array.from({ length: target.height }, (_, r) => Array.from({ length: target.width }, (_, c) => fitted[r - top]?.[c - left] ?? 0));
  const result = chartFromImage(
    { grid, colors: imported.colors.slice() },
    {
      id: target.id,
      name: target.name,
      craft: target.craft,
      maxColoursPerRow: options.maxColoursPerRow,
    }
  );

  return {
    ...result,
    chart: {
      ...result.chart,
      rows: target.rows.map((row, r) => row.map((cell, c) => ({ ...cell, colorIndex: cell.symbolId === "nostitch" ? 0 : result.chart.rows[r][c].colorIndex }))),
      worked: target.worked,
      startSide: target.startSide,
      repeats: target.repeats.map((box) => ({ ...box })),
    },
  };
}

/**
 * How many colours a row may carry.
 *
 * Two is not a preference, it is what stranded colourwork physically is: every
 * colour in a row is carried along the back of that row, and three floats make
 * a fabric nobody wants to knit. Intarsia has no limit because each block has
 * its own small ball and nothing is carried — so the limit is lifted only when
 * the knitter says they are working intarsia.
 */
export function coloursPerRowFor(technique: "stranded" | "intarsia"): number {
  return technique === "intarsia" ? Number.POSITIVE_INFINITY : 2;
}
