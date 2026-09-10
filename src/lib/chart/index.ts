/**
 * Chart model v2 — public surface.
 *
 * Framework-free: no React, no Next, no DOM. Everything here is pure data and
 * pure functions so it can run in a test, in a worker, or during a build.
 *
 * The pieces:
 *   symbols.ts        the stitch catalogue — arithmetic, RS/WS meaning, artwork
 *   model.ts          the grid, the multi-cell invariant, the editing API
 *   validate.ts       structured integrity checks (stitch counts reconcile)
 *   legend.ts         legend and abbreviation list derived from the grid
 *   toInstructions.ts chart -> written rows with running stitch counts
 */

export {
  ART_CELL,
  NO_STITCH_ID,
  allSymbols,
  getSymbol,
  plainSymbol,
  plainSymbolId,
  symbolAllowedInCraft,
  symbolArtPath,
  symbolArtRects,
  symbolsForCraft,
  workedForm,
} from "./symbols";
export type {
  ArtRect,
  CableSpec,
  ChartCraft,
  RepeatStyle,
  StitchSymbol,
  SymbolArt,
  SymbolCategory,
  SymbolCraft,
  WorkedForm,
} from "./symbols";

export {
  addRepeatBox,
  anchorColumnOf,
  castOnCount,
  clearAt,
  cloneChart,
  createChart,
  fillRow,
  getCell,
  groupAt,
  placeSymbol,
  removeRepeatBox,
  repeatBoxForRow,
  rowCounts,
  rowGroups,
  rowGroupsInReadingOrder,
  rowNumber,
  rowSide,
  setColor,
  setNoStitch,
  symbolAt,
  usedColorIndexes,
  usedSymbolIds,
} from "./model";
export type {
  CellGroup,
  ChartCell,
  ChartError,
  ChartErrorCode,
  ChartResult,
  CreateChartOptions,
  RepeatBox,
  RowCounts,
  RowSide,
  SymbolChart,
  WorkedAs,
} from "./model";

export { isChartValid, validateChart } from "./validate";
export type { ChartIssue, ChartIssueCode, IssueSeverity, ValidationReport } from "./validate";

export { buildAbbreviationList, buildColorLegend, buildLegend, buildSymbolLegend } from "./legend";
export type { ChartLegend, ColorLegendEntry, LegendEntry } from "./legend";

export { chartToInstructionLines, chartToInstructions } from "./toInstructions";
export type { ChartInstructions, InstructionOptions, InstructionRun, RowInstruction } from "./toInstructions";
