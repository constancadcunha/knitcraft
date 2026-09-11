/**
 * Turning an imported image grid into a chart someone can actually work.
 *
 * `src/lib/imageChart.ts` quantises a photograph to a grid of palette indices.
 * That is a picture, not yet a knitting chart, because of one constraint the
 * old app ignored entirely:
 *
 *   STRANDED COLOURWORK CARRIES AT MOST TWO COLOURS PER ROW.
 *
 * Every colour in a row must be carried along the back of that row. Two is the
 * tradition (Fair Isle is defined by it); three is awkward; ten is unworkable.
 * A photo quantised to ten colours produces a chart that looks lovely on screen
 * and cannot be knitted, which is exactly the kind of output that makes a
 * generated pattern worthless.
 *
 * So the import reduces each row to its most common colours and reassigns the
 * rest to the nearest kept colour. The picture degrades a little; the chart
 * becomes workable. Intarsia has no such limit, hence the option.
 */

import { createChart, type ChartCraft, type SymbolChart } from "@/lib/chart";

export interface ImportedGrid {
  grid: number[][];
  colors: string[];
}

export interface ImportOptions {
  id: string;
  name: string;
  craft: ChartCraft;
  /**
   * Colours allowed in any single row. 2 is stranded tradition. Pass
   * Infinity for intarsia, where each block has its own yarn and nothing is
   * carried across the back.
   */
  maxColoursPerRow?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Squared distance in RGB. Good enough to pick a nearest yarn shade. */
function distance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/**
 * Reduce one row to at most `limit` colours, remapping the rest to the nearest
 * colour that survived. Keeps the colours that cover the most stitches, since
 * those carry the row's shape.
 */
export function reduceRow(
  row: readonly number[],
  palette: readonly string[],
  limit: number
): number[] {
  if (!Number.isFinite(limit) || limit < 1) return [...row];

  const counts = new Map<number, number>();
  for (const index of row) counts.set(index, (counts.get(index) ?? 0) + 1);
  if (counts.size <= limit) return [...row];

  const keep = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([index]) => index);

  const rgb = palette.map(hexToRgb);
  const remap = new Map<number, number>();
  for (const index of counts.keys()) {
    if (keep.includes(index)) {
      remap.set(index, index);
      continue;
    }
    let best = keep[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of keep) {
      const d = distance(rgb[index] ?? [0, 0, 0], rgb[candidate] ?? [0, 0, 0]);
      if (d < bestDistance) {
        bestDistance = d;
        best = candidate;
      }
    }
    remap.set(index, best);
  }

  return row.map((index) => remap.get(index) ?? index);
}

export interface ImportResult {
  chart: SymbolChart;
  /** Rows whose colour count had to be reduced to make them workable. */
  rowsReduced: number;
  note?: string;
}

/** Convert an imported grid into a valid, workable chart. */
export function chartFromImage(
  imported: ImportedGrid,
  options: ImportOptions
): ImportResult {
  const height = imported.grid.length;
  const width = height > 0 ? imported.grid[0].length : 0;
  if (width < 1 || height < 1) {
    throw new Error("imported image produced an empty grid");
  }

  const limit = options.maxColoursPerRow ?? 2;
  const chart = createChart({
    id: options.id,
    name: options.name,
    craft: options.craft,
    width,
    height,
    colors: imported.colors.slice(),
  });

  // Colourwork is plain fabric throughout: only the colour changes, so the
  // stitch count is untouched and the chart is valid by construction.
  const plain = options.craft === "crocheting" ? "sc" : "k";

  let rowsReduced = 0;
  for (let row = 0; row < height; row += 1) {
    // An imported image reads top-down, but rows[0] is the BOTTOM row of a
    // knitting chart — so the picture has to be flipped or it comes out upside
    // down on the needles.
    const source = imported.grid[height - 1 - row] ?? [];
    const reduced = reduceRow(source, imported.colors, limit);
    if (reduced.some((value, i) => value !== source[i])) rowsReduced += 1;

    const cells = chart.rows[row];
    for (let col = 0; col < width; col += 1) {
      cells[col] = { colorIndex: reduced[col] ?? 0, symbolId: plain };
    }
  }

  return {
    chart,
    rowsReduced,
    note:
      rowsReduced > 0
        ? `${rowsReduced} row${rowsReduced === 1 ? "" : "s"} had colours merged so no row carries more than ${limit}. Stranded colourwork can only carry two yarns per row.`
        : undefined,
  };
}
