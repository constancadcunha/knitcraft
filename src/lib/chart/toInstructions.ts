/**
 * Chart -> written row-by-row instructions.
 *
 * This is how a chart becomes a pattern, and it is meant to be the ONLY source
 * of written instructions in the app. Chart and prose are then provably the
 * same artefact and cannot contradict each other, which is where published
 * errata come from and why the old app could draw one thing and print another.
 *
 * Four things it gets right that the old string templater did not:
 *
 *  1. READING DIRECTION. A chart is read bottom-up; right-side rows are read
 *     RIGHT TO LEFT (the first stitch worked is the rightmost cell) and
 *     wrong-side rows LEFT TO RIGHT. Every round of an in-the-round chart is
 *     read right to left and numbered "Rnd", never "WS".
 *
 *  2. RS/WS MEANING. A chart symbol describes the RIGHT-SIDE appearance, so on a
 *     wrong-side row the knit symbol is written "p", ssk becomes "ssp", and a
 *     cable's holding side flips. `workedForm` supplies the right one.
 *
 *  3. RUN-LENGTH COMPRESSION. "k2, p2" rather than "k, k, p, p". Runs merge only
 *     when both the symbol and the colour match, so a colour change always
 *     breaks the run.
 *
 *  4. RUNNING STITCH COUNTS. Every row ends "(58 sts)" — the number of stitches
 *     the row LEAVES. This is the number a knitter checks against, and the one
 *     the voice counter can announce.
 */

import {
  type CellGroup,
  type RepeatBox,
  type RowSide,
  type SymbolChart,
  castOnCount,
  repeatBoxForRow,
  rowCounts,
  rowGroupsInReadingOrder,
  rowNumber,
  rowSide,
} from "./model";
import { type StitchSymbol, workedForm } from "./symbols";

export interface InstructionRun {
  symbolId: string;
  /** Abbreviation for the side this row is worked from. */
  abbr: string;
  /** How many consecutive stitches this run covers. */
  count: number;
  colorIndex: number;
  /** Stitches of the row below that this run eats. */
  consumed: number;
  /** Stitches this run leaves. */
  produced: number;
  /** Rendered fragment, e.g. "k5" or "[2/2 RC] twice". */
  text: string;
}

export interface RowInstruction {
  rowIndex: number;
  rowNumber: number;
  side: RowSide;
  /** "Row 7 (RS)" for flat charts, "Rnd 7" in the round. */
  label: string;
  /** The instructions without the label or the stitch count. */
  body: string;
  /** The full line: "Row 7 (RS): k3, 2/2 RC, k2. (24 sts)". */
  text: string;
  /** Stitches available at the start of the row (what it consumes). */
  stitchesBefore: number;
  /** Stitches left at the end of the row (what it produces). */
  stitchesAfter: number;
  runs: InstructionRun[];
}

export interface ChartInstructions {
  /** Stitches the first row eats — the cast-on or foundation count. */
  castOn: number;
  castOnText: string;
  rows: RowInstruction[];
  /** Cast-on line plus every row, one per line. */
  text: string;
}

export interface InstructionOptions {
  /**
   * Names for the palette entries ("MC", "CC1", "Cream"). Supply these and each
   * run is annotated with its colour whenever the colour changes. Omit them and
   * colour is left out of the prose entirely, which is what a texture-only
   * chart wants.
   */
  colorNames?: string[];
  /** Append "(N sts)" to each row. Default true. */
  showStitchCounts?: boolean;
  /** Emit the leading cast-on / foundation line. Default true. */
  includeCastOn?: boolean;
  /**
   * The piece's REAL stitch count, when the chart is only a repeat window onto
   * a wider panel.
   *
   * A chart is clipped to an editable size (60 stitches), so a 106-stitch back
   * charted at 60 would otherwise tell the knitter to cast on 60 and produce a
   * garment half the width. Supply the true count and the cast-on line, the
   * per-row counts and the repeat wording all use it.
   */
  totalStitches?: number;
}

// ---------------------------------------------------------------------------

export function chartToInstructions(
  chart: SymbolChart,
  options: InstructionOptions = {},
): ChartInstructions {
  const showCounts = options.showStitchCounts ?? true;
  const includeCastOn = options.includeCastOn ?? true;

  // Scaling row counts to the real panel width is only sound when the chart
  // does not shape: if any row consumed or produced a different number than the
  // cast-on, the counts are the chart's own and must not be rewritten.
  const chartCastOn = castOnCount(chart);
  const isPlainPanel = chart.rows.every((_, i) => {
    const c = rowCounts(chart, i);
    return c.consumed === chartCastOn && c.produced === chartCastOn;
  });
  const scaleTo =
    options.totalStitches && isPlainPanel && options.totalStitches !== chartCastOn
      ? options.totalStitches
      : undefined;

  const rows: RowInstruction[] = [];
  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    rows.push(buildRow(chart, rowIndex, options, showCounts, scaleTo));
  }

  // When the chart is a window onto a wider panel, the piece's real stitch
  // count governs the prose; the chart only supplies the stitch pattern.
  const castOn = options.totalStitches ?? castOnCount(chart);
  const castOnText =
    chart.craft === "knitting"
      ? `Cast on ${castOn} ${plural(castOn)}.`
      : `Foundation: ch ${castOn}.`;

  const lines = [...(includeCastOn ? [castOnText] : []), ...rows.map((row) => row.text)];
  return { castOn, castOnText, rows, text: lines.join("\n") };
}

/** Just the lines, for a caller that wants to lay them out itself. */
export function chartToInstructionLines(
  chart: SymbolChart,
  options: InstructionOptions = {},
): string[] {
  return chartToInstructions(chart, options).text.split("\n");
}

// ---------------------------------------------------------------------------

function buildRow(
  chart: SymbolChart,
  rowIndex: number,
  options: InstructionOptions,
  showCounts: boolean,
  /** Real panel width, when the chart is only a repeat window. */
  scaleTo?: number,
): RowInstruction {
  const side = rowSide(chart, rowIndex);
  const counts = rowCounts(chart, rowIndex);
  const label =
    chart.worked === "round" ? `Rnd ${rowNumber(rowIndex)}` : `Row ${rowNumber(rowIndex)} (${side})`;

  // No-stitch cells are placeholders that keep the grid rectangular; they are
  // never worked, so they never reach the prose.
  const groups = rowGroupsInReadingOrder(chart, rowIndex).filter((g) => !g.symbol?.notWorked);

  const box = repeatBoxForRow(chart, rowIndex);
  const { body, runs } = box
    ? renderWithRepeat(groups, box, side, options)
    : renderPlain(groups, side, options);

  const produced = scaleTo ?? counts.produced;
  const consumed = scaleTo ?? counts.consumed;
  const suffix = showCounts ? ` (${produced} ${plural(produced)})` : "";
  const text = `${label}: ${body}.${suffix}`;

  return {
    rowIndex,
    rowNumber: rowNumber(rowIndex),
    side,
    label,
    body,
    text,
    stitchesBefore: consumed,
    stitchesAfter: produced,
    runs,
  };
}

function renderPlain(
  groups: CellGroup[],
  side: RowSide,
  options: InstructionOptions,
): { body: string; runs: InstructionRun[] } {
  const runs = compress(groups, side);
  return { body: joinRuns(runs, options), runs };
}

/**
 * A repeat box collapses the middle of the row into "*...; rep from * ...".
 *
 * The box is contiguous in column space, so in reading order its groups are
 * contiguous too — everything before it is worked once, everything after it is
 * worked once, and the knitter is told how many stitches remain when the repeat
 * ends. Only one box per row is honoured (the narrowest); nested repeats are a
 * later problem.
 */
function renderWithRepeat(
  groups: CellGroup[],
  box: RepeatBox,
  side: RowSide,
  options: InstructionOptions,
): { body: string; runs: InstructionRun[] } {
  const before: CellGroup[] = [];
  const inside: CellGroup[] = [];
  const after: CellGroup[] = [];
  let phase: 0 | 1 | 2 = 0;

  for (const group of groups) {
    const isInside = group.anchorCol >= box.startCol && group.anchorCol <= box.endCol;
    if (isInside) {
      phase = 1;
      inside.push(group);
    } else if (phase === 0) {
      before.push(group);
    } else {
      phase = 2;
      after.push(group);
    }
  }

  if (inside.length === 0) return renderPlain(groups, side, options);

  const beforeRuns = compress(before, side);
  // A box spanning the whole row means "this fabric repeats", not "print every
  // stitch between the asterisks". Reduce it to its smallest repeating unit, or
  // a 2x2 rib across 60 stitches prints p2,k2 thirty times inside the repeat.
  const insideRuns = compress(smallestPeriod(inside), side);
  const afterRuns = compress(after, side);

  const remaining = afterRuns.reduce((sum, run) => sum + run.consumed, 0);
  let body = "";
  if (beforeRuns.length) body += `${joinRuns(beforeRuns, options)}, `;
  body += `*${joinRuns(insideRuns, options)}`;
  body += afterRuns.length
    ? `; rep from * to last ${remaining} ${plural(remaining)}, ${joinRuns(afterRuns, options)}`
    : "; rep from * to end";

  return { body, runs: [...beforeRuns, ...insideRuns, ...afterRuns] };
}

/**
 * The shortest run of groups that, repeated, reproduces the whole sequence.
 *
 * Returns the input unchanged when it does not repeat cleanly — a partial
 * final repeat would make the instruction wrong, and a wrong instruction is
 * worse than a long one.
 */
function smallestPeriod(groups: CellGroup[]): CellGroup[] {
  const n = groups.length;
  if (n < 2) return groups;

  const same = (a: CellGroup, b: CellGroup) =>
    a.symbolId === b.symbolId && a.colorIndex === b.colorIndex && a.width === b.width;

  for (let period = 1; period <= n / 2; period += 1) {
    if (n % period !== 0) continue;
    let holds = true;
    for (let i = period; i < n && holds; i += 1) {
      if (!same(groups[i], groups[i - period])) holds = false;
    }
    if (holds) return groups.slice(0, period);
  }
  return groups;
}

/**
 * Merge adjacent identical groups into runs. Identity is symbol AND colour: a
 * colour change must break the run or the prose would lose the yarn change.
 */
function compress(groups: CellGroup[], side: RowSide): InstructionRun[] {
  const runs: InstructionRun[] = [];
  const symbols: (StitchSymbol | undefined)[] = [];
  for (const group of groups) {
    const previous = runs[runs.length - 1];
    if (previous && previous.symbolId === group.symbolId && previous.colorIndex === group.colorIndex) {
      previous.count += 1;
      previous.consumed += group.symbol?.stitchesConsumed ?? 0;
      previous.produced += group.symbol?.stitchesProduced ?? 0;
      continue;
    }
    runs.push({
      symbolId: group.symbolId,
      abbr: group.symbol ? workedForm(group.symbol, side).abbr : `<${group.symbolId}?>`,
      count: 1,
      colorIndex: group.colorIndex,
      consumed: group.symbol?.stitchesConsumed ?? 0,
      produced: group.symbol?.stitchesProduced ?? 0,
      text: "",
    });
    symbols.push(group.symbol);
  }
  runs.forEach((run, index) => {
    run.text = renderRun(run, symbols[index]);
  });
  return runs;
}

function renderRun(run: InstructionRun, symbol: StitchSymbol | undefined): string {
  const style = symbol?.repeatStyle ?? "bracket-times";
  const separator = symbol?.repeatSeparator ?? "";

  if (style === "count-suffix") {
    // "k" x5 -> "k5"; "ch" x5 -> "ch 5". A single knit is written "k1", which
    // is what patterns print, not a bare "k".
    return `${run.abbr}${separator}${run.count}`;
  }
  if (style === "count-prefix") {
    // US crochet convention: "5 sc", and a single stitch is just "sc".
    return run.count === 1 ? run.abbr : `${run.count} ${run.abbr}`;
  }
  if (run.count === 1) return run.abbr;
  if (run.count === 2) return `[${run.abbr}] twice`;
  return `[${run.abbr}] ${run.count} times`;
}

function joinRuns(runs: InstructionRun[], options: InstructionOptions): string {
  if (runs.length === 0) return "no stitches worked";
  const names = options.colorNames;
  const parts: string[] = [];
  let lastColor: number | undefined;
  for (const run of runs) {
    let text = run.text;
    if (names && names.length > 1 && run.colorIndex !== lastColor) {
      const name = names[run.colorIndex];
      if (name) text += ` in ${name}`;
    }
    lastColor = run.colorIndex;
    parts.push(text);
  }
  return parts.join(", ");
}

function plural(count: number): string {
  return count === 1 ? "st" : "sts";
}
