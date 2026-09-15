/**
 * Progress through a chart: where the maker is, what is worked, and how to undo.
 *
 * Every function here is pure — `(geometry, progress, argument) -> progress` —
 * so the tracker page, the keyboard shortcuts and the voice counter all drive
 * the same arithmetic and cannot drift apart. The old app had two trackers with
 * duplicated toggle logic and no cursor at all, so "next", "row twelve" and
 * "undo" had nothing to operate on and a reload lost the maker's place.
 *
 * THE INVARIANT: `cursor.stitchIndex` always equals `rowStitches[cursor.rowIndex]`
 * — the number of stitches worked so far in the current row. Every function
 * re-establishes it, and `normalizeChartProgress` repairs it for data loaded
 * from storage (a chart may have been edited since it was saved).
 *
 * WHY COUNTS RATHER THAN A SET OF CELLS: you cannot work stitch 40 before
 * stitch 39. Storing "the first N stitches of this row are done" is both the
 * truth about knitting and ~150x smaller than the old `{"row,col": true}` map,
 * which is what filled localStorage and silently discarded people's counting.
 */

import {
  type ChartProgress,
  type ProgressUndoEntry,
  UNDO_LIMIT,
} from "@/types";
import type { VoiceCommand } from "@/lib/voice/parseCommand";
import {
  type ChartGeometry,
  rowIndexForNumber,
  rowStitchCount,
} from "./geometry";

export interface ProgressOptions {
  /** ISO timestamp to stamp the change with. Injected so tests are deterministic. */
  now?: string;
}

interface RowChange {
  rowIndex: number;
  next: number;
}

/* -------------------------------------------------------------------------- */
/* Construction                                                                */
/* -------------------------------------------------------------------------- */

export function createChartProgress(chartId: string, now = new Date().toISOString()): ChartProgress {
  return {
    chartId,
    rowStitches: {},
    cursor: { rowIndex: 0, stitchIndex: 0 },
    undo: [],
    updatedAt: now,
  };
}

/**
 * Clamp a stored progress back into the bounds of the chart it belongs to.
 *
 * Charts are editable, so a saved cursor can point past the end of a chart that
 * has since been shortened. Repairing is right and crashing is not: the maker's
 * place is approximately recoverable, and a tracker that throws loses the lot.
 */
export function normalizeChartProgress(
  geometry: ChartGeometry,
  progress: ChartProgress,
): ChartProgress {
  const rowStitches: Record<number, number> = {};
  for (const key of Object.keys(progress.rowStitches ?? {})) {
    const rowIndex = Number(key);
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= geometry.rowCount) continue;
    const raw = progress.rowStitches[rowIndex];
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) continue;
    const clamped = Math.min(Math.floor(raw), rowStitchCount(geometry, rowIndex));
    if (clamped > 0) rowStitches[rowIndex] = clamped;
  }

  const rowIndex = clampRow(geometry, progress.cursor?.rowIndex ?? 0);
  return {
    ...progress,
    rowStitches,
    cursor: { rowIndex, stitchIndex: rowStitches[rowIndex] ?? 0 },
    undo: Array.isArray(progress.undo) ? progress.undo.slice(-UNDO_LIMIT) : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Selectors                                                                   */
/* -------------------------------------------------------------------------- */

export function stitchesDoneInRow(progress: ChartProgress, rowIndex: number): number {
  return progress.rowStitches[rowIndex] ?? 0;
}

export function isRowComplete(
  geometry: ChartGeometry,
  progress: ChartProgress,
  rowIndex: number,
): boolean {
  const total = rowStitchCount(geometry, rowIndex);
  // An empty row (every cell a "no stitch") is vacuously complete; treating it
  // as incomplete would stall a tracker that can never reach 0 of 0.
  return stitchesDoneInRow(progress, rowIndex) >= total;
}

export function remainingInRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  rowIndex = progress.cursor.rowIndex,
): number {
  return Math.max(0, rowStitchCount(geometry, rowIndex) - stitchesDoneInRow(progress, rowIndex));
}

export function completedRowCount(geometry: ChartGeometry, progress: ChartProgress): number {
  let done = 0;
  for (let rowIndex = 0; rowIndex < geometry.rowCount; rowIndex += 1) {
    if (rowStitchCount(geometry, rowIndex) > 0 && isRowComplete(geometry, progress, rowIndex)) {
      done += 1;
    }
  }
  return done;
}

export function totalStitchesDone(geometry: ChartGeometry, progress: ChartProgress): number {
  let total = 0;
  for (let rowIndex = 0; rowIndex < geometry.rowCount; rowIndex += 1) {
    total += Math.min(stitchesDoneInRow(progress, rowIndex), rowStitchCount(geometry, rowIndex));
  }
  return total;
}

/** 0..1 by stitches, which is a truer measure of effort than rows. */
export function progressFraction(geometry: ChartGeometry, progress: ChartProgress): number {
  if (geometry.totalStitches === 0) return 0;
  return totalStitchesDone(geometry, progress) / geometry.totalStitches;
}

export function isChartComplete(geometry: ChartGeometry, progress: ChartProgress): boolean {
  return geometry.totalStitches > 0 && totalStitchesDone(geometry, progress) >= geometry.totalStitches;
}

export function canUndo(progress: ChartProgress): boolean {
  return progress.undo.length > 0;
}

/** What `VoiceCounter` needs to render and speak. */
export interface TrackerView {
  rowIndex: number;
  rowNumber: number;
  totalRows: number;
  stitchesDone: number;
  stitchesInRow: number;
  remaining: number;
  side: "RS" | "WS" | null;
  rowComplete: boolean;
  chartComplete: boolean;
  fraction: number;
}

export function trackerView(geometry: ChartGeometry, progress: ChartProgress): TrackerView {
  const rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  const row = geometry.rows[rowIndex];
  const stitchesInRow = row?.count ?? 0;
  const stitchesDone = Math.min(stitchesDoneInRow(progress, rowIndex), stitchesInRow);
  return {
    rowIndex,
    rowNumber: row?.rowNumber ?? 1,
    totalRows: geometry.rowCount,
    stitchesDone,
    stitchesInRow,
    remaining: stitchesInRow - stitchesDone,
    side: row?.side ?? null,
    rowComplete: stitchesDone >= stitchesInRow,
    chartComplete: isChartComplete(geometry, progress),
    fraction: progressFraction(geometry, progress),
  };
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Count stitches forward from the cursor.
 *
 * Counting stops at the end of a flat row: the maker has to turn the work, and
 * silently rolling into the next row would hide a miscount until the piece is
 * the wrong shape. An in-the-round chart has no turn, so there counting does
 * carry over — that is what `ChartGeometry.continuous` is for.
 */
export function increment(
  geometry: ChartGeometry,
  progress: ChartProgress,
  by = 1,
  options: ProgressOptions = {},
): ChartProgress {
  const amount = Math.floor(by);
  if (!Number.isFinite(amount) || amount <= 0) return progress;

  const changes: RowChange[] = [];
  let rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  let done = stitchesDoneInRow(progress, rowIndex);
  let remaining = amount;

  while (remaining > 0) {
    const space = rowStitchCount(geometry, rowIndex) - done;
    const take = Math.min(space, remaining);
    if (take > 0) {
      changes.push({ rowIndex, next: done + take });
      done += take;
      remaining -= take;
    }
    if (remaining === 0) break;
    if (!geometry.continuous) break;
    if (rowIndex + 1 >= geometry.rowCount) break;
    rowIndex += 1;
    done = stitchesDoneInRow(progress, rowIndex);
  }

  return commit(geometry, progress, changes, { rowIndex }, `counted ${amount}`, options);
}

/**
 * Take stitches back. Unlike counting forward, this walks backwards ACROSS row
 * boundaries: "back three" at the start of a row means the maker has noticed a
 * mistake at the end of the row below and is unpicking into it.
 */
export function decrement(
  geometry: ChartGeometry,
  progress: ChartProgress,
  by = 1,
  options: ProgressOptions = {},
): ChartProgress {
  const amount = Math.floor(by);
  if (!Number.isFinite(amount) || amount <= 0) return progress;

  const changes: RowChange[] = [];
  let rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  let remaining = amount;

  while (remaining > 0) {
    const done = stitchesDoneInRow(progress, rowIndex);
    const take = Math.min(done, remaining);
    if (take > 0) {
      changes.push({ rowIndex, next: done - take });
      remaining -= take;
    }
    if (remaining === 0 || rowIndex === 0) break;
    rowIndex -= 1;
  }

  return commit(geometry, progress, changes, { rowIndex }, `back ${amount}`, options);
}

/** "Twenty four" — the maker has counted the row themselves and is telling us. */
export function setCount(
  geometry: ChartGeometry,
  progress: ChartProgress,
  count: number,
  options: ProgressOptions = {},
): ChartProgress {
  const rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  const clamped = clamp(Math.floor(count), 0, rowStitchCount(geometry, rowIndex));
  if (!Number.isFinite(clamped)) return progress;
  return commit(
    geometry,
    progress,
    [{ rowIndex, next: clamped }],
    { rowIndex },
    `set count to ${clamped}`,
    options,
  );
}

/**
 * Jump to a printed row number.
 *
 * Rows below are deliberately NOT marked done: a maker who says "row twelve" is
 * telling us where they are, not claiming everything beneath it is finished.
 * An out-of-range row is ignored rather than clamped — mishearing "row twenty"
 * as "row two hundred" must not silently move the cursor to the end.
 */
export function gotoRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  rowNumber: number,
  options: ProgressOptions = {},
): ChartProgress {
  const rowIndex = rowIndexForNumber(geometry, Math.floor(rowNumber));
  if (rowIndex === null) return progress;
  return commit(geometry, progress, [], { rowIndex }, `row ${rowNumber}`, options);
}

/** Finish the current row and move on. The commonest command there is. */
export function nextRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  options: ProgressOptions = {},
): ChartProgress {
  const rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  const full = rowStitchCount(geometry, rowIndex);
  const target = Math.min(rowIndex + 1, Math.max(0, geometry.rowCount - 1));
  return commit(
    geometry,
    progress,
    [{ rowIndex, next: full }],
    { rowIndex: target },
    `finished row ${rowIndex + 1}`,
    options,
  );
}

/** Step back a row without unpicking it — for checking the row below. */
export function prevRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  options: ProgressOptions = {},
): ChartProgress {
  const rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  if (rowIndex === 0) return progress;
  return commit(geometry, progress, [], { rowIndex: rowIndex - 1 }, `row ${rowIndex}`, options);
}

/** Start the current row again. */
export function resetRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  options: ProgressOptions = {},
): ChartProgress {
  const rowIndex = clampRow(geometry, progress.cursor.rowIndex);
  return commit(geometry, progress, [{ rowIndex, next: 0 }], { rowIndex }, "reset row", options);
}

/** Tick a whole row off, or untick it if it was already done. */
export function toggleRow(
  geometry: ChartGeometry,
  progress: ChartProgress,
  rowIndex: number,
  options: ProgressOptions = {},
): ChartProgress {
  if (rowIndex < 0 || rowIndex >= geometry.rowCount) return progress;
  const full = rowStitchCount(geometry, rowIndex);
  const next = isRowComplete(geometry, progress, rowIndex) ? 0 : full;
  return commit(
    geometry,
    progress,
    [{ rowIndex, next }],
    { rowIndex },
    next === 0 ? `cleared row ${rowIndex + 1}` : `marked row ${rowIndex + 1}`,
    options,
  );
}

/**
 * Tap a stitch: "I am here". Everything before it in the row becomes worked,
 * everything after it does not. Tapping the stitch that is already the last
 * worked one steps back by one, so a tap is its own undo.
 */
export function markStitch(
  geometry: ChartGeometry,
  progress: ChartProgress,
  rowIndex: number,
  stitchIndex: number,
  options: ProgressOptions = {},
): ChartProgress {
  if (rowIndex < 0 || rowIndex >= geometry.rowCount) return progress;
  const total = rowStitchCount(geometry, rowIndex);
  if (stitchIndex < 0 || stitchIndex >= total) return progress;
  const current = stitchesDoneInRow(progress, rowIndex);
  const next = current === stitchIndex + 1 ? stitchIndex : stitchIndex + 1;
  return commit(
    geometry,
    progress,
    [{ rowIndex, next }],
    { rowIndex },
    `stitch ${stitchIndex + 1} of row ${rowIndex + 1}`,
    options,
  );
}

/** Wipe the chart's progress. Undoable, like everything else. */
export function resetChart(
  geometry: ChartGeometry,
  progress: ChartProgress,
  options: ProgressOptions = {},
): ChartProgress {
  const changes: RowChange[] = Object.keys(progress.rowStitches).map((key) => ({
    rowIndex: Number(key),
    next: 0,
  }));
  return commit(geometry, progress, changes, { rowIndex: 0 }, "reset chart", options);
}

/**
 * Step back one operation.
 *
 * The stack holds only the PREVIOUS values of the rows each step touched, so
 * fifty steps of history cost a few hundred bytes and survive a reload — which
 * matters, because "undo" is most often said after putting the work down.
 */
export function undo(progress: ChartProgress, options: ProgressOptions = {}): ChartProgress {
  const entry = progress.undo[progress.undo.length - 1];
  if (!entry) return progress;

  const rowStitches: Record<number, number> = { ...progress.rowStitches };
  for (const key of Object.keys(entry.rows)) {
    const rowIndex = Number(key);
    const previous = entry.rows[rowIndex];
    if (previous === null || previous === undefined || previous <= 0) delete rowStitches[rowIndex];
    else rowStitches[rowIndex] = previous;
  }

  const rowIndex = entry.cursor.rowIndex;
  return {
    ...progress,
    rowStitches,
    cursor: { rowIndex, stitchIndex: rowStitches[rowIndex] ?? 0 },
    undo: progress.undo.slice(0, -1),
    updatedAt: options.now ?? new Date().toISOString(),
  };
}

/** Wording for the step `undo` would take back, for the UI and for speech. */
export function undoLabel(progress: ChartProgress): string | null {
  return progress.undo[progress.undo.length - 1]?.label ?? null;
}

/* -------------------------------------------------------------------------- */
/* Voice                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Map a parsed voice command onto the progress model.
 *
 * The speech-only commands ("where am I", "read that", "pause") change nothing
 * and return the progress untouched: they are answered by the component that
 * owns the speaker, from the same `trackerView` this module exposes.
 */
export function applyVoiceCommand(
  geometry: ChartGeometry,
  progress: ChartProgress,
  command: VoiceCommand,
  options: ProgressOptions = {},
): ChartProgress {
  switch (command.kind) {
    // Each named stitch in a spoken run marks one thing worked.
    case "sequence":
      return increment(geometry, progress, command.calls.length, options);
    case "increment":
      return increment(geometry, progress, command.by, options);
    case "decrement":
      return decrement(geometry, progress, command.by, options);
    case "setCount":
      return setCount(geometry, progress, command.count, options);
    case "gotoRow":
      return gotoRow(geometry, progress, command.row, options);
    case "nextRow":
    case "markRow":
      return nextRow(geometry, progress, options);
    case "prevRow":
      return prevRow(geometry, progress, options);
    case "resetRow":
      return resetRow(geometry, progress, options);
    case "undo":
      return undo(progress, options);
    case "status":
    case "readNext":
    case "repeat":
    case "pause":
      return progress;
  }
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampRow(geometry: ChartGeometry, rowIndex: number): number {
  if (!Number.isFinite(rowIndex)) return 0;
  return clamp(Math.floor(rowIndex), 0, Math.max(0, geometry.rowCount - 1));
}

/**
 * Apply row changes and a cursor move as one undoable step.
 *
 * Returns the progress unchanged when nothing actually moved, so that repeated
 * no-op commands (a misheard "next row" at the end of a chart) do not fill the
 * undo stack with steps that take nothing back.
 */
function commit(
  geometry: ChartGeometry,
  progress: ChartProgress,
  changes: RowChange[],
  cursor: { rowIndex: number },
  label: string,
  options: ProgressOptions,
): ChartProgress {
  const effective = changes.filter(
    (change) => stitchesDoneInRow(progress, change.rowIndex) !== change.next,
  );
  const rowIndex = clampRow(geometry, cursor.rowIndex);
  const cursorMoved = rowIndex !== progress.cursor.rowIndex;
  if (effective.length === 0 && !cursorMoved) return progress;

  const now = options.now ?? new Date().toISOString();
  const rowStitches: Record<number, number> = { ...progress.rowStitches };
  const previous: Record<number, number | null> = {};

  for (const change of effective) {
    previous[change.rowIndex] = progress.rowStitches[change.rowIndex] ?? null;
    // A zero is stored as an absent key: the map only ever holds started rows.
    if (change.next <= 0) delete rowStitches[change.rowIndex];
    else rowStitches[change.rowIndex] = change.next;
  }

  const entry: ProgressUndoEntry = {
    label,
    cursor: { ...progress.cursor },
    rows: previous,
    at: now,
  };

  return {
    ...progress,
    rowStitches,
    cursor: { rowIndex, stitchIndex: rowStitches[rowIndex] ?? 0 },
    undo: [...progress.undo, entry].slice(-UNDO_LIMIT),
    updatedAt: now,
  };
}
