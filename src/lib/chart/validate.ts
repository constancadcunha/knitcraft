/**
 * Chart integrity checks.
 *
 * Returns structured issues, never a boolean: the editor has to be able to put
 * a marker on row 7 column 12 and say what is wrong, and the pattern generator
 * has to be able to refuse to publish on ERROR while still shipping on WARNING.
 *
 * The load-bearing check is RECONCILIATION: row N's consumed stitches must equal
 * row N-1's produced stitches. That single invariant is what stops the app
 * emitting a chart that cannot physically be knitted — a lace row with a k2tog
 * and no yo, a cable panel that quietly loses two stitches, an increase row that
 * was drawn one cell too wide. Everything else here protects the multi-cell
 * representation that makes the arithmetic trustworthy in the first place.
 */

import {
  type ChartCell,
  type SymbolChart,
  rowCounts,
  rowGroups,
  rowNumber,
  rowSide,
} from "./model";
import { getSymbol, plainSymbolId, symbolAllowedInCraft } from "./symbols";

export type IssueSeverity = "error" | "warning";

export type ChartIssueCode =
  | "geometry/row-count"
  | "geometry/row-width"
  | "color/out-of-range"
  | "symbol/unknown"
  | "symbol/wrong-craft"
  | "span/overflow"
  | "span/missing-continuation"
  | "span/orphan-continuation"
  | "span/continuation-has-symbol"
  | "span/overlap"
  | "count/mismatch"
  | "count/empty-row"
  | "cable/wrong-side"
  | "repeat/out-of-bounds"
  | "repeat/inverted";

export interface ChartIssue {
  code: ChartIssueCode;
  severity: IssueSeverity;
  message: string;
  /** Bottom-up row index, when the issue is located on the grid. */
  row?: number;
  col?: number;
  /** Populated for count/mismatch so the UI can show "expected 58, got 56". */
  expected?: number;
  actual?: number;
}

export interface ValidationReport {
  issues: ChartIssue[];
  errors: ChartIssue[];
  warnings: ChartIssue[];
  valid: boolean;
}

export function validateChart(chart: SymbolChart): ValidationReport {
  const issues: ChartIssue[] = [];

  checkGeometry(chart, issues);
  for (let row = 0; row < chart.rows.length; row += 1) {
    checkRowSpans(chart, row, issues);
    checkRowCells(chart, row, issues);
  }
  checkReconciliation(chart, issues);
  checkRepeats(chart, issues);
  checkCableSides(chart, issues);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { issues, errors, warnings, valid: errors.length === 0 };
}

/** Convenience for call sites that only need a yes/no gate. */
export function isChartValid(chart: SymbolChart): boolean {
  return validateChart(chart).valid;
}

// ---------------------------------------------------------------------------

function checkGeometry(chart: SymbolChart, issues: ChartIssue[]) {
  if (chart.rows.length !== chart.height) {
    issues.push({
      code: "geometry/row-count",
      severity: "error",
      message: `chart declares ${chart.height} rows but holds ${chart.rows.length}`,
      expected: chart.height,
      actual: chart.rows.length,
    });
  }
  chart.rows.forEach((row, index) => {
    if (row.length !== chart.width) {
      issues.push({
        code: "geometry/row-width",
        severity: "error",
        message: `row ${rowNumber(index)} holds ${row.length} cells but the chart is ${chart.width} wide`,
        row: index,
        expected: chart.width,
        actual: row.length,
      });
    }
  });
}

function checkRowCells(chart: SymbolChart, rowIndex: number, issues: ChartIssue[]) {
  const row = chart.rows[rowIndex];
  row.forEach((cell: ChartCell, col) => {
    if (cell.colorIndex < 0 || cell.colorIndex >= chart.colors.length) {
      issues.push({
        code: "color/out-of-range",
        severity: "error",
        message: `row ${rowNumber(rowIndex)}, column ${col + 1}: colour index ${cell.colorIndex} is outside the ${chart.colors.length}-colour palette`,
        row: rowIndex,
        col,
      });
    }
    if (cell.symbolId === undefined) return;
    const symbol = getSymbol(cell.symbolId);
    if (!symbol) {
      issues.push({
        code: "symbol/unknown",
        severity: "error",
        message: `row ${rowNumber(rowIndex)}, column ${col + 1}: unknown stitch symbol "${cell.symbolId}"`,
        row: rowIndex,
        col,
      });
      return;
    }
    if (!symbolAllowedInCraft(symbol, chart.craft)) {
      issues.push({
        code: "symbol/wrong-craft",
        severity: "error",
        message: `row ${rowNumber(rowIndex)}, column ${col + 1}: "${symbol.abbreviation}" is a ${symbol.craft} symbol in a ${chart.craft} chart`,
        row: rowIndex,
        col,
      });
    }
  });
}

/**
 * Multi-cell integrity for one row, checked as three separate properties rather
 * than one walk, so each failure gets its own honest message:
 *
 *   - every anchor's span fits inside the row          -> span/overflow
 *   - no two anchor spans intersect                    -> span/overlap
 *   - each covered cell continues the right anchor     -> span/missing-continuation
 *   - each continuation is covered by that anchor      -> span/orphan-continuation
 */
function checkRowSpans(chart: SymbolChart, rowIndex: number, issues: ChartIssue[]) {
  const row = chart.rows[rowIndex];
  const n = rowNumber(rowIndex);

  /** Anchors are the cells that are not continuations of something else. */
  const anchors: { col: number; width: number; label: string }[] = [];
  row.forEach((cell, col) => {
    if (cell.continues !== undefined) return;
    const symbolId = cell.symbolId ?? plainSymbolId(chart.craft);
    const symbol = getSymbol(symbolId);
    anchors.push({ col, width: symbol?.width ?? 1, label: symbol?.abbreviation ?? symbolId });
  });

  /** Which anchor owns each column, once overflow has been excluded. */
  const owner = new Array<number | undefined>(row.length).fill(undefined);

  for (const anchor of anchors) {
    if (anchor.col + anchor.width > row.length) {
      issues.push({
        code: "span/overflow",
        severity: "error",
        message: `row ${n}, column ${anchor.col + 1}: ${anchor.label} spans ${anchor.width} cells and runs off the right edge`,
        row: rowIndex,
        col: anchor.col,
        expected: anchor.width,
        actual: row.length - anchor.col,
      });
      continue;
    }
    for (let c = anchor.col; c < anchor.col + anchor.width; c += 1) {
      const existing = owner[c];
      if (existing !== undefined) {
        issues.push({
          code: "span/overlap",
          severity: "error",
          message: `row ${n}, column ${c + 1}: covered by two symbols at once (anchors at columns ${existing + 1} and ${anchor.col + 1})`,
          row: rowIndex,
          col: c,
        });
        continue;
      }
      owner[c] = anchor.col;
    }
  }

  for (const anchor of anchors) {
    if (anchor.col + anchor.width > row.length) continue;
    for (let c = anchor.col + 1; c < anchor.col + anchor.width; c += 1) {
      const covered = row[c];
      if (covered.continues !== anchor.col) {
        issues.push({
          code: "span/missing-continuation",
          severity: "error",
          message: `row ${n}, column ${c + 1}: should continue the ${anchor.label} anchored at column ${anchor.col + 1}, but ${covered.continues === undefined ? "is a free cell" : `points at column ${covered.continues + 1}`}`,
          row: rowIndex,
          col: c,
        });
      }
      if (covered.symbolId !== undefined) {
        issues.push({
          code: "span/continuation-has-symbol",
          severity: "error",
          message: `row ${n}, column ${c + 1}: continuation cells must not carry their own symbol (found "${covered.symbolId}")`,
          row: rowIndex,
          col: c,
        });
      }
    }
  }

  row.forEach((cell, col) => {
    if (cell.continues === undefined) return;
    if (owner[col] !== cell.continues) {
      issues.push({
        code: "span/orphan-continuation",
        severity: "error",
        message: `row ${n}, column ${col + 1}: continuation points at column ${cell.continues + 1}, which owns no multi-cell symbol reaching this cell`,
        row: rowIndex,
        col,
      });
    }
  });
}

/**
 * Running stitch count. Every row after the first must eat exactly what the row
 * below it produced. Row 1 is exempt: what it eats is the cast-on / foundation.
 */
function checkReconciliation(chart: SymbolChart, issues: ChartIssue[]) {
  for (let rowIndex = 0; rowIndex < chart.rows.length; rowIndex += 1) {
    const counts = rowCounts(chart, rowIndex);
    if (counts.produced === 0 && counts.consumed === 0 && chart.rows[rowIndex].length > 0) {
      issues.push({
        code: "count/empty-row",
        severity: "warning",
        message: `row ${rowNumber(rowIndex)} works no stitches at all`,
        row: rowIndex,
      });
    }
    if (rowIndex === 0) continue;
    const below = rowCounts(chart, rowIndex - 1);
    if (counts.consumed !== below.produced) {
      issues.push({
        code: "count/mismatch",
        severity: "error",
        message: `row ${rowNumber(rowIndex)} works ${counts.consumed} sts but row ${rowNumber(rowIndex - 1)} left ${below.produced}`,
        row: rowIndex,
        expected: below.produced,
        actual: counts.consumed,
      });
    }
  }
}

function checkRepeats(chart: SymbolChart, issues: ChartIssue[]) {
  for (const box of chart.repeats) {
    if (box.startCol > box.endCol || box.startRow > box.endRow) {
      issues.push({
        code: "repeat/inverted",
        severity: "error",
        message: `repeat box "${box.id}" has its start after its end`,
      });
      continue;
    }
    if (box.startCol < 0 || box.endCol >= chart.width || box.startRow < 0 || box.endRow >= chart.height) {
      issues.push({
        code: "repeat/out-of-bounds",
        severity: "error",
        message: `repeat box "${box.id}" falls outside the ${chart.width}x${chart.height} chart`,
      });
    }
  }
}

/**
 * Cable crossings belong on right-side rows.
 *
 * Crossing on a wrong-side row is legal and occasionally deliberate, but it is
 * awkward to work and almost always a mistake in a generated chart — the
 * holding side inverts, so the crossing reads backwards from what the designer
 * intended. A warning, not an error: a knitter who means it may keep it.
 */
function checkCableSides(chart: SymbolChart, issues: ChartIssue[]): void {
  // Only flat knitting has wrong-side rows at all; every round of an
  // in-the-round chart is worked from the right side.
  if (chart.worked === "round") return;

  for (let row = 0; row < chart.rows.length; row += 1) {
    if (rowSide(chart, row) === "RS") continue;
    for (const group of rowGroups(chart, row)) {
      if (group.symbol?.category !== "cable") continue;
      issues.push({
        code: "cable/wrong-side",
        severity: "warning",
        message: `${group.symbol.abbreviation} crosses on row ${rowNumber(row)}, a wrong-side row; crossings are normally worked on right-side rows`,
        row,
        col: group.anchorCol,
      });
    }
  }
}
