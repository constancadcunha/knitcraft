/**
 * Chart -> the shape progress tracking needs.
 *
 * Everything downstream (the tracker page, the voice counter, the undo stack)
 * works in STITCH INDICES: "stitch 7 of row 12, in the order it is worked".
 * That is not the same as a column index, for three reasons the old tracker got
 * wrong, and this module is where all three are resolved once:
 *
 *  1. READING DIRECTION. A right-side row is worked right to left, so its first
 *     stitch is the rightmost cell. The old tracker numbered every row from the
 *     left, so "you are on stitch 3" pointed at the wrong end of half the rows.
 *
 *  2. MULTI-CELL SYMBOLS. A 2/2 cable fills four grid cells but is ONE thing the
 *     knitter does and says once. Counting cells would make every cabled row
 *     read long by the width of its cables.
 *
 *  3. CELLS THAT ARE NOT STITCHES. A "no stitch" cell is a hole in a shaped
 *     piece; bare fabric in a cross-stitch design is not a stitch either.
 *     Neither is ever counted or advanced through.
 *
 * Geometry is derived from an immutable chart, so it is memoised per chart
 * object: the tracker can call it every render without recomputing an 8,000
 * cell grid each time.
 */

import {
  NO_STITCH_ID,
  type RowSide,
  type SymbolChart,
  rowGroupsInReadingOrder,
  rowSide,
} from "@/lib/chart";
import {
  type CraftType,
  type CrossStitchChart,
  type ProjectChart,
  isCrossStitchChart,
} from "@/types";

/** One thing the maker does, once. */
export interface RowStitch {
  /** Position in the order the row is worked, 0-based. */
  index: number;
  /** Grid column of the anchor cell (the leftmost cell it covers). */
  anchorCol: number;
  /** Every grid column this stitch occupies. One entry unless it is a cable. */
  columns: number[];
  /** Chart symbol id for yarn charts; undefined for cross stitch. */
  symbolId?: string;
  /** Palette index, when the cell carries one. */
  colorIndex?: number;
}

export interface RowGeometry {
  rowIndex: number;
  /** As printed in the pattern. rows[0] is row 1 in both chart kinds. */
  rowNumber: number;
  /** null for cross stitch, which has no right or wrong side. */
  side: RowSide | null;
  stitches: RowStitch[];
  /** `stitches.length`, hoisted because it is read far more than the list. */
  count: number;
}

export interface ChartGeometry {
  chartId: string;
  craft: CraftType;
  rowCount: number;
  rows: RowGeometry[];
  totalStitches: number;
  /**
   * True when work runs on past the end of a row without turning — an
   * in-the-round chart. Flat knitting and cross stitch both stop at the row
   * end, so counting cannot spill into the next row by accident.
   */
  continuous: boolean;
}

const CACHE = new WeakMap<ProjectChart, ChartGeometry>();

/** Geometry for a chart. Memoised on the chart object, which is immutable. */
export function chartGeometry(chart: ProjectChart): ChartGeometry {
  const cached = CACHE.get(chart);
  if (cached) return cached;
  const geometry = isCrossStitchChart(chart)
    ? crossStitchGeometry(chart)
    : symbolChartGeometry(chart);
  CACHE.set(chart, geometry);
  return geometry;
}

function symbolChartGeometry(chart: SymbolChart): ChartGeometry {
  const rows: RowGeometry[] = [];
  let total = 0;

  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    const stitches: RowStitch[] = [];
    for (const group of rowGroupsInReadingOrder(chart, rowIndex)) {
      // A hole in a shaped piece. Never counted, never landed on.
      if (group.symbolId === NO_STITCH_ID) continue;
      stitches.push({
        index: stitches.length,
        anchorCol: group.anchorCol,
        columns: Array.from({ length: group.width }, (_, i) => group.anchorCol + i),
        symbolId: group.symbolId,
        colorIndex: group.colorIndex,
      });
    }
    total += stitches.length;
    rows.push({
      rowIndex,
      rowNumber: rowIndex + 1,
      side: rowSide(chart, rowIndex),
      stitches,
      count: stitches.length,
    });
  }

  return {
    chartId: chart.id,
    craft: chart.craft,
    rowCount: chart.height,
    rows,
    totalStitches: total,
    continuous: chart.worked === "round",
  };
}

/**
 * Cross stitch is worked from the top of the design down and every row reads
 * left to right — there is no wrong side and nothing is turned. Bare fabric
 * (a cell with no `colorIndex`) is skipped exactly as a "no stitch" is.
 */
function crossStitchGeometry(chart: CrossStitchChart): ChartGeometry {
  const rows: RowGeometry[] = [];
  let total = 0;

  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    const cells = chart.rows[rowIndex] ?? [];
    const stitches: RowStitch[] = [];
    for (let col = 0; col < cells.length; col += 1) {
      const cell = cells[col];
      if (!cell || cell.colorIndex === undefined) continue;
      stitches.push({
        index: stitches.length,
        anchorCol: col,
        columns: [col],
        colorIndex: cell.colorIndex,
      });
    }
    total += stitches.length;
    rows.push({
      rowIndex,
      rowNumber: rowIndex + 1,
      side: null,
      stitches,
      count: stitches.length,
    });
  }

  return {
    chartId: chart.id,
    craft: "cross-stitch",
    rowCount: chart.height,
    rows,
    totalStitches: total,
    continuous: false,
  };
}

/** Stitches in a row, or 0 if the row does not exist. */
export function rowStitchCount(geometry: ChartGeometry, rowIndex: number): number {
  return geometry.rows[rowIndex]?.count ?? 0;
}

/** The row geometry, or undefined when the index is out of range. */
export function rowAt(geometry: ChartGeometry, rowIndex: number): RowGeometry | undefined {
  return geometry.rows[rowIndex];
}

/**
 * Row index for a printed row number. Both chart kinds number rows[0] as row 1,
 * so this is a subtraction — but it is a named subtraction, because the old
 * tracker inverted it (`chart.height - n`) and silently tracked the wrong row.
 */
export function rowIndexForNumber(geometry: ChartGeometry, rowNumber: number): number | null {
  const index = rowNumber - 1;
  return index >= 0 && index < geometry.rowCount ? index : null;
}

/** Grid columns covered by the first `count` stitches of a row, in any order. */
export function columnsForStitches(
  geometry: ChartGeometry,
  rowIndex: number,
  count: number,
): number[] {
  const row = geometry.rows[rowIndex];
  if (!row) return [];
  const columns: number[] = [];
  for (const stitch of row.stitches.slice(0, Math.max(0, count))) {
    columns.push(...stitch.columns);
  }
  return columns;
}
