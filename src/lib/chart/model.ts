/**
 * Chart model v2 — the grid, its invariants, and the editing API.
 *
 * CLEAN BREAK from v1 (`ChartCell = { colorIndex }`). Two changes matter:
 *
 *  - A cell carries a colour index AND an optional stitch symbol, so a chart can
 *    express colourwork, texture, lace and cables at the same time (real Fair
 *    Isle and brioche charts do exactly this).
 *
 *  - `rows[0]` is the BOTTOM row of the fabric, i.e. row 1. Charts are read from
 *    the bottom up, always. v1 stored rows top-down and then inverted the row
 *    number in the UI, which is where the RS/WS confusion came from.
 *
 * ---------------------------------------------------------------------------
 * THE MULTI-CELL INVARIANT
 * ---------------------------------------------------------------------------
 * A 2/2 RC occupies four cells but is one stitch operation. It is stored as an
 * ANCHOR cell plus CONTINUATION cells:
 *
 *   col:        3        4        5        6
 *   cell:  {symbolId:"2/2 RC"}  {continues:3}  {continues:3}  {continues:3}
 *
 * Invariants, enforced by every mutator in this file and checked by validate.ts:
 *
 *   I1  The anchor is the LEFTMOST covered cell and is the only covered cell
 *       with a `symbolId`.
 *   I2  If a symbol of width w anchors at column c, then columns c+1 .. c+w-1
 *       all carry `continues === c` and no `symbolId`.
 *   I3  `continues` always points at a real anchor in the SAME row whose symbol
 *       width actually reaches this column. No orphans.
 *   I4  Groups never overlap and never run past the right edge.
 *
 * The three consequences the invariant buys:
 *   - RENDERING draws one glyph per anchor spanning w cells, and draws nothing
 *     for continuations. It never draws four half-cables.
 *   - COUNTING walks anchors only (`rowGroups`), so a 4-wide cable contributes
 *     4 consumed / 4 produced exactly once, never 16.
 *   - EDITING addresses the group, not the cell: `clearAt` on ANY covered cell
 *     removes the whole crossing, and `placeSymbol` clears every group it would
 *     partially overwrite before writing.
 *
 * Everything here is plain JSON-serialisable data — no classes, no Maps in the
 * stored shape — so a chart round-trips through localStorage unchanged.
 */

import {
  type ChartCraft,
  type StitchSymbol,
  NO_STITCH_ID,
  getSymbol,
  plainSymbol,
  plainSymbolId,
  symbolAllowedInCraft,
} from "./symbols";

export type { ChartCraft } from "./symbols";

/** Which face of the fabric a row is worked from. */
export type RowSide = "RS" | "WS";

/** Flat knitting alternates RS/WS; in the round every round is a RS round. */
export type WorkedAs = "flat" | "round";

export interface ChartCell {
  /** Index into `SymbolChart.colors`. */
  colorIndex: number;
  /**
   * Absent means the craft's plain stitch (knit for knitting, sc for crochet).
   * Present on anchors only; never set on a continuation cell.
   */
  symbolId?: string;
  /**
   * Set on continuation cells only: the column of the anchor that owns this
   * cell. See THE MULTI-CELL INVARIANT above.
   */
  continues?: number;
}

/**
 * A repeat box. `startCol`/`endCol` are inclusive and in left-to-right grid
 * coordinates regardless of reading direction. `times` is optional: when the
 * chart shows the repeat expanded, the count is implied by the grid.
 */
export interface RepeatBox {
  id: string;
  startCol: number;
  endCol: number;
  /** Inclusive row band, in bottom-up row indices. */
  startRow: number;
  endRow: number;
  times?: number;
  label?: string;
}

export interface SymbolChart {
  schemaVersion: 2;
  id: string;
  name: string;
  craft: ChartCraft;
  width: number;
  height: number;
  /** rows[0] is the BOTTOM row of the fabric and is worked first. */
  rows: ChartCell[][];
  colors: string[];
  worked: WorkedAs;
  /** Side that row 1 is worked from. Ignored when `worked === "round"`. */
  startSide: RowSide;
  repeats: RepeatBox[];
  /** Optional per-symbol legend text overriding the catalogue name. */
  legendOverrides?: Record<string, string>;
}

/** A resolved horizontal group: one anchor and the cells it owns. */
export interface CellGroup {
  /** Column of the anchor cell (leftmost covered column). */
  anchorCol: number;
  /** Cells covered. Equal to `symbol.width` for a well-formed chart. */
  width: number;
  /** Resolved symbol, or undefined when the cell references an unknown id. */
  symbol: StitchSymbol | undefined;
  /** The id actually stored, resolved to the craft default for plain cells. */
  symbolId: string;
  colorIndex: number;
}

export type ChartErrorCode =
  | "out-of-bounds"
  | "unknown-symbol"
  | "wrong-craft"
  | "does-not-fit"
  | "bad-repeat";

export interface ChartError {
  code: ChartErrorCode;
  message: string;
  row?: number;
  col?: number;
}

export type ChartResult<T> = { ok: true; value: T } | { ok: false; error: ChartError };

const ok = <T,>(value: T): ChartResult<T> => ({ ok: true, value });
const fail = <T,>(error: ChartError): ChartResult<T> => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export interface CreateChartOptions {
  id: string;
  name?: string;
  craft: ChartCraft;
  width: number;
  height: number;
  colors?: string[];
  worked?: WorkedAs;
  startSide?: RowSide;
}

export function createChart(options: CreateChartOptions): SymbolChart {
  const { id, craft, width, height } = options;
  if (width < 1 || height < 1) {
    throw new Error(`chart must be at least 1x1, got ${width}x${height}`);
  }
  return {
    schemaVersion: 2,
    id,
    name: options.name ?? "Untitled chart",
    craft,
    width,
    height,
    rows: Array.from({ length: height }, () =>
      Array.from({ length: width }, (): ChartCell => ({ colorIndex: 0 })),
    ),
    colors: options.colors ? options.colors.slice() : ["#f5ede0"],
    worked: options.worked ?? "flat",
    startSide: options.startSide ?? "RS",
    repeats: [],
  };
}

/** Deep copy. Charts are small enough that structural sharing is not worth the bugs. */
export function cloneChart(chart: SymbolChart): SymbolChart {
  return {
    ...chart,
    rows: chart.rows.map((row) => row.map((cell) => ({ ...cell }))),
    colors: chart.colors.slice(),
    repeats: chart.repeats.map((box) => ({ ...box })),
    legendOverrides: chart.legendOverrides ? { ...chart.legendOverrides } : undefined,
  };
}

function inBounds(chart: SymbolChart, row: number, col: number): boolean {
  return row >= 0 && row < chart.height && col >= 0 && col < chart.width;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function getCell(chart: SymbolChart, row: number, col: number): ChartCell | undefined {
  return inBounds(chart, row, col) ? chart.rows[row][col] : undefined;
}

/**
 * The column of the anchor that owns (row, col) — itself when the cell is not a
 * continuation. This is the lookup that makes "erasing any covered cell removes
 * the whole crossing" a one-liner.
 */
export function anchorColumnOf(chart: SymbolChart, row: number, col: number): number | undefined {
  const cell = getCell(chart, row, col);
  if (!cell) return undefined;
  if (cell.continues === undefined) return col;
  return inBounds(chart, row, cell.continues) ? cell.continues : undefined;
}

/** The resolved symbol worked at (row, col), following continuations to their anchor. */
export function symbolAt(chart: SymbolChart, row: number, col: number): StitchSymbol | undefined {
  const anchorCol = anchorColumnOf(chart, row, col);
  if (anchorCol === undefined) return undefined;
  const anchor = chart.rows[row][anchorCol];
  return anchor.symbolId === undefined ? plainSymbol(chart.craft) : getSymbol(anchor.symbolId);
}

/** The group covering (row, col), or undefined if the cell is out of bounds. */
export function groupAt(chart: SymbolChart, row: number, col: number): CellGroup | undefined {
  const anchorCol = anchorColumnOf(chart, row, col);
  if (anchorCol === undefined) return undefined;
  const anchor = chart.rows[row][anchorCol];
  const symbolId = anchor.symbolId ?? plainSymbolId(chart.craft);
  const symbol = getSymbol(symbolId);
  return {
    anchorCol,
    width: symbol?.width ?? 1,
    symbol,
    symbolId,
    colorIndex: anchor.colorIndex,
  };
}

/**
 * All groups in a row, left to right, each yielded exactly once.
 *
 * Tolerant of malformed data (it is also used by validate.ts to *find* the
 * damage): an orphaned continuation is reported as a 1-wide group so the walk
 * always terminates and always covers every column.
 */
export function rowGroups(chart: SymbolChart, rowIndex: number): CellGroup[] {
  const row = chart.rows[rowIndex];
  if (!row) return [];
  const groups: CellGroup[] = [];
  let col = 0;
  while (col < row.length) {
    const cell = row[col];
    if (cell.continues !== undefined) {
      // Orphan: nothing claimed this cell during the walk. Treat as 1 wide.
      groups.push({
        anchorCol: col,
        width: 1,
        symbol: undefined,
        symbolId: cell.symbolId ?? plainSymbolId(chart.craft),
        colorIndex: cell.colorIndex,
      });
      col += 1;
      continue;
    }
    const symbolId = cell.symbolId ?? plainSymbolId(chart.craft);
    const symbol = getSymbol(symbolId);
    const width = Math.max(1, Math.min(symbol?.width ?? 1, row.length - col));
    groups.push({ anchorCol: col, width, symbol, symbolId, colorIndex: cell.colorIndex });
    col += width;
  }
  return groups;
}

/**
 * Groups in the order the knitter actually works them.
 *
 * Charts are read RIGHT TO LEFT on right-side rows (the first stitch worked is
 * the rightmost cell) and LEFT TO RIGHT on wrong-side rows. Every round of an
 * in-the-round chart is read right to left. Getting this backwards is what made
 * the old row tracker number stitches from the wrong end.
 */
export function rowGroupsInReadingOrder(chart: SymbolChart, rowIndex: number): CellGroup[] {
  const groups = rowGroups(chart, rowIndex);
  return rowSide(chart, rowIndex) === "RS" ? groups.reverse() : groups;
}

/** 1-based row number. rows[0] is row 1 and is at the bottom of the chart. */
export function rowNumber(rowIndex: number): number {
  return rowIndex + 1;
}

/**
 * Which side a row is worked from.
 *
 * Flat: alternates from `startSide`, so with startSide "RS" the odd rows are RS.
 * Round: every round is worked with the right side facing, which is why hats,
 * cowls, socks and mittens must never be labelled "WS" on their even rounds.
 */
export function rowSide(chart: SymbolChart, rowIndex: number): RowSide {
  if (chart.worked === "round") return "RS";
  const even = rowIndex % 2 === 0;
  if (chart.startSide === "RS") return even ? "RS" : "WS";
  return even ? "WS" : "RS";
}

export interface RowCounts {
  /** Stitches of the previous row this row eats. */
  consumed: number;
  /** Stitches this row leaves on the needle or hook. */
  produced: number;
}

/**
 * Stitch arithmetic for one row. Walks ANCHORS ONLY, so a 4-wide cable counts
 * once (4 in, 4 out), never four times. `nostitch` contributes nothing.
 */
export function rowCounts(chart: SymbolChart, rowIndex: number): RowCounts {
  let consumed = 0;
  let produced = 0;
  for (const group of rowGroups(chart, rowIndex)) {
    if (!group.symbol) continue; // unknown symbol: validate.ts reports it
    consumed += group.symbol.stitchesConsumed;
    produced += group.symbol.stitchesProduced;
  }
  return { consumed, produced };
}

/** The cast-on / foundation count a chart implies: what its first row eats. */
export function castOnCount(chart: SymbolChart): number {
  return chart.height > 0 ? rowCounts(chart, 0).consumed : 0;
}

/** Distinct symbol ids actually used, anchors only, in bottom-up reading order. */
export function usedSymbolIds(chart: SymbolChart): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    for (const group of rowGroupsInReadingOrder(chart, rowIndex)) {
      if (!seen.has(group.symbolId)) {
        seen.add(group.symbolId);
        order.push(group.symbolId);
      }
    }
  }
  return order;
}

/** Distinct colour indices actually used, in ascending order. */
export function usedColorIndexes(chart: SymbolChart): number[] {
  const seen = new Set<number>();
  for (const row of chart.rows) {
    for (const cell of row) seen.add(cell.colorIndex);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * Remove whatever group covers (row, col), restoring every cell it owned to a
 * plain cell of the given colour. Idempotent, and safe on a plain cell.
 *
 * Mutates `row` in place — callers inside this module always work on a clone.
 */
function clearGroupInPlace(chart: SymbolChart, rowIndex: number, col: number) {
  const row = chart.rows[rowIndex];
  const anchorCol = anchorColumnOf(chart, rowIndex, col);
  if (anchorCol === undefined) return;
  const anchor = row[anchorCol];
  const symbol = getSymbol(anchor.symbolId ?? plainSymbolId(chart.craft));
  const width = symbol?.width ?? 1;
  for (let c = anchorCol; c < Math.min(anchorCol + width, row.length); c += 1) {
    row[c] = { colorIndex: row[c].colorIndex };
  }
  // Belt and braces: sweep up any continuation still pointing here, which can
  // only happen if the chart arrived malformed from storage.
  for (let c = 0; c < row.length; c += 1) {
    if (row[c].continues === anchorCol) row[c] = { colorIndex: row[c].colorIndex };
  }
}

/**
 * Place a symbol with its anchor at (row, col).
 *
 * Refuses (rather than silently truncating) when the symbol would run off the
 * right edge — a cable that does not fit is a chart bug, not a rendering
 * detail. Any group the placement would partially overwrite is removed whole,
 * so the invariant can never be left half-broken.
 */
export function placeSymbol(
  chart: SymbolChart,
  row: number,
  col: number,
  symbolId: string,
): ChartResult<SymbolChart> {
  if (!inBounds(chart, row, col)) {
    return fail({ code: "out-of-bounds", message: `cell ${row},${col} is outside the chart`, row, col });
  }
  const symbol = getSymbol(symbolId);
  if (!symbol) {
    return fail({ code: "unknown-symbol", message: `no stitch symbol "${symbolId}"`, row, col });
  }
  if (!symbolAllowedInCraft(symbol, chart.craft)) {
    return fail({
      code: "wrong-craft",
      message: `"${symbolId}" is a ${symbol.craft} symbol; this chart is ${chart.craft}`,
      row,
      col,
    });
  }
  if (col + symbol.width > chart.width) {
    return fail({
      code: "does-not-fit",
      message: `${symbol.abbreviation} is ${symbol.width} cells wide and does not fit at column ${col} in a ${chart.width}-cell chart`,
      row,
      col,
    });
  }

  const next = cloneChart(chart);
  // Clear every group that overlaps the target span, including one that starts
  // to the left and reaches into it.
  for (let c = col; c < col + symbol.width; c += 1) clearGroupInPlace(next, row, c);

  const target = next.rows[row];
  const anchorColor = target[col].colorIndex;
  target[col] = { colorIndex: anchorColor, symbolId };
  for (let c = col + 1; c < col + symbol.width; c += 1) {
    target[c] = { colorIndex: target[c].colorIndex, continues: col };
  }
  return ok(next);
}

/**
 * Erase the symbol at (row, col). Because it addresses the GROUP, erasing any
 * one of a cable's four cells removes the whole crossing.
 */
export function clearAt(chart: SymbolChart, row: number, col: number): ChartResult<SymbolChart> {
  if (!inBounds(chart, row, col)) {
    return fail({ code: "out-of-bounds", message: `cell ${row},${col} is outside the chart`, row, col });
  }
  const next = cloneChart(chart);
  clearGroupInPlace(next, row, col);
  return ok(next);
}

/** Mark (row, col) as a no-stitch placeholder. */
export function setNoStitch(chart: SymbolChart, row: number, col: number): ChartResult<SymbolChart> {
  return placeSymbol(chart, row, col, NO_STITCH_ID);
}

/**
 * Set a cell's colour. Colour is orthogonal to the symbol layer: a continuation
 * cell may carry its own colour, which is what two-colour cables and brioche
 * need. Colour edits therefore never disturb a group.
 */
export function setColor(
  chart: SymbolChart,
  row: number,
  col: number,
  colorIndex: number,
): ChartResult<SymbolChart> {
  if (!inBounds(chart, row, col)) {
    return fail({ code: "out-of-bounds", message: `cell ${row},${col} is outside the chart`, row, col });
  }
  if (colorIndex < 0 || colorIndex >= chart.colors.length) {
    return fail({
      code: "out-of-bounds",
      message: `colour index ${colorIndex} is outside this chart's ${chart.colors.length}-colour palette`,
      row,
      col,
    });
  }
  const next = cloneChart(chart);
  next.rows[row][col] = { ...next.rows[row][col], colorIndex };
  return ok(next);
}

export function addRepeatBox(chart: SymbolChart, box: RepeatBox): ChartResult<SymbolChart> {
  if (box.startCol > box.endCol || box.startRow > box.endRow) {
    return fail({ code: "bad-repeat", message: `repeat box "${box.id}" has inverted bounds` });
  }
  if (box.startCol < 0 || box.endCol >= chart.width || box.startRow < 0 || box.endRow >= chart.height) {
    return fail({ code: "bad-repeat", message: `repeat box "${box.id}" falls outside the chart` });
  }
  const next = cloneChart(chart);
  next.repeats = [...next.repeats.filter((r) => r.id !== box.id), { ...box }];
  return ok(next);
}

export function removeRepeatBox(chart: SymbolChart, boxId: string): SymbolChart {
  const next = cloneChart(chart);
  next.repeats = next.repeats.filter((r) => r.id !== boxId);
  return next;
}

/** The repeat box covering a row, if any. Innermost (narrowest) box wins. */
export function repeatBoxForRow(chart: SymbolChart, rowIndex: number): RepeatBox | undefined {
  return chart.repeats
    .filter((box) => rowIndex >= box.startRow && rowIndex <= box.endRow)
    .sort((a, b) => a.endCol - a.startCol - (b.endCol - b.startCol))[0];
}

/** Convenience for tests and importers: fill a whole row from an id list. */
export function fillRow(
  chart: SymbolChart,
  rowIndex: number,
  symbolIds: (string | undefined)[],
): ChartResult<SymbolChart> {
  let current = chart;
  let col = 0;
  for (const symbolId of symbolIds) {
    if (col >= current.width) {
      return fail({
        code: "does-not-fit",
        message: `row ${rowIndex} overflows: more symbols than the chart is wide`,
        row: rowIndex,
      });
    }
    if (symbolId === undefined) {
      const cleared = clearAt(current, rowIndex, col);
      if (!cleared.ok) return cleared;
      current = cleared.value;
      col += 1;
      continue;
    }
    const placed = placeSymbol(current, rowIndex, col, symbolId);
    if (!placed.ok) return placed;
    current = placed.value;
    col += getSymbol(symbolId)?.width ?? 1;
  }
  return ok(current);
}
