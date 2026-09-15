/**
 * A written pattern, read back into a chart.
 *
 * "If I give something describing it by text, a chart shows everything" — so
 * this is the inverse of `chartToInstructions`. It is the riskiest import in
 * the app, because a pattern is prose and prose does not have to be
 * well-formed, so the whole module is built around one rule:
 *
 *   NEVER INVENT A STITCH, AND NEVER LOSE A ROW.
 *
 * Concretely that means:
 *   - A fragment we cannot resolve is recorded in `ParsedRow.unparsed` and
 *     contributes NOTHING to the grid. It is never rounded off to a knit.
 *   - A row we only half-read still occupies its row number, padded with
 *     `nostitch`, so row 12 stays row 12 and the tracker does not silently
 *     shift the maker four rows up their sleeve.
 *   - Every row the pattern annotates with "(58 sts)" is checked against what
 *     we actually parsed. A disagreement is a warning, because that is exactly
 *     the signature of a dropped stitch.
 *   - A row that CHANGES the stitch count is a shaping row. If we could not
 *     read it completely it goes in `unresolvedShaping`, which the UI shows
 *     before anything else: losing a decrease is the difference between a
 *     sleeve and a tube.
 */

import {
  type ChartCell,
  type ChartCraft,
  type RowSide,
  type StitchSymbol,
  type SymbolChart,
  type WorkedAs,
  NO_STITCH_ID,
  createChart,
  getSymbol,
  validateChart,
  type ChartIssue,
} from "@/lib/chart";
import { generateId } from "@/lib/id";
import {
  type CountedStitch,
  lookupStitch,
  parseStitchFragment,
  resolvesOnOtherSide,
  sniffCraft,
} from "./vocabulary";

/* -------------------------------------------------------------------------- */
/* Report shapes                                                               */
/* -------------------------------------------------------------------------- */

export interface SkippedLine {
  /** 1-based line number in the text the maker pasted. */
  lineNumber: number;
  text: string;
  reason: string;
}

export interface ParsedRow {
  rowNumber: number;
  lineNumber: number;
  side: RowSide;
  /** The row's instruction body, as written. */
  text: string;
  /** The count the pattern itself printed, e.g. "(58 sts)". Null when absent. */
  declaredStitches: number | null;
  /** Stitches this row eats, from what we parsed. */
  consumed: number;
  /** Stitches this row leaves, from what we parsed. */
  produced: number;
  /** False when any fragment of the row could not be resolved. */
  understood: boolean;
  /** The fragments we could not turn into a stitch, verbatim. */
  unparsed: string[];
  /** True when the row changes the stitch count — a shaping row. */
  shaping: boolean;
}

export interface TextImportReport {
  /** Null when nothing at all could be read as a row. */
  chart: SymbolChart | null;
  craft: ChartCraft;
  worked: WorkedAs;
  startSide: RowSide;
  /** The cast-on / foundation count the text stated, when it stated one. */
  castOn: number | null;
  /** Every row line we recognised, in row order. */
  rows: ParsedRow[];
  /** Lines we took nothing from, each with why. Blank lines are not listed. */
  skipped: SkippedLine[];
  warnings: string[];
  /**
   * Shaping rows we could not read completely. These are the dangerous ones:
   * the caller must show them before offering to save anything.
   */
  unresolvedShaping: ParsedRow[];
  /** Structural problems in the chart we built, from `validateChart`. */
  issues: ChartIssue[];
}

export interface TextImportOptions {
  /** Override the sniffed craft. */
  craft?: ChartCraft;
  name?: string;
  id?: string;
}

/* -------------------------------------------------------------------------- */
/* Line classification                                                         */
/* -------------------------------------------------------------------------- */

/**
 * "Row 7 (RS): ...", "Rnd 12: ...", "Rows 3-8 (WS): ...".
 *
 * The range form matters: published patterns collapse plain rows into
 * "Rows 2-10: purl", and expanding that is the difference between a 10-row
 * chart and a 2-row one.
 */
const ROW_LINE =
  /^\s*(rows?|rnds?|rounds?|r)\s*(\d+)\s*(?:(?:[-–—]|to)\s*(\d+))?\s*(?:\(\s*(rs|ws|right side|wrong side)\s*\))?\s*[:.)]\s*(.+?)\s*$/i;

/** "(58 sts)" / "(58 stitches)" / "— 58 sts" at the end of a row. */
const DECLARED_COUNT = /[(\[\-–—]\s*(\d+)\s*(?:sts?|stitches|stitch)\s*[)\]]?\s*\.?\s*$/i;

const CAST_ON = /\bcast\s*on\s*(\d+)|\bco\s*(\d+)\b/i;
const FOUNDATION_CHAIN = /\b(?:foundation|found\.?|start)[^\n]*?\bch\s*(\d+)|^\s*ch\s*(\d+)\s*\.?\s*$/i;

function sideFromLabel(raw: string | undefined): RowSide | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value === "rs" || value === "right side") return "RS";
  if (value === "ws" || value === "wrong side") return "WS";
  return null;
}

/* -------------------------------------------------------------------------- */
/* Body parsing                                                                */
/* -------------------------------------------------------------------------- */

type Piece =
  | { kind: "stitch"; symbol: StitchSymbol; count: number; crossSide: boolean; text: string }
  /** "k to end" / "p to last 3 sts": width is only known once the budget is. */
  | { kind: "fill"; symbol: StitchSymbol; leaveLast: number; text: string }
  | { kind: "unparsed"; text: string };

/** Split on commas that are not inside brackets. */
function splitSegments(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of body) {
    if (char === "[" || char === "(") depth += 1;
    if (char === "]" || char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out.map((part) => part.trim()).filter(Boolean);
}

/** "[k2tog] 3 times", "[yo, k1] twice", "(k1, p1) x4". */
const BRACKET_REPEAT =
  /^[[(]\s*(.+?)\s*[\])]\s*(?:(?:x\s*)?(\d+)\s*(?:times?|more times?)?|(twice)|(once))\s*$/i;

/** "k to end", "p to last 3 sts", "knit across", "p all sts". */
const FILL_PHRASE =
  /^(.+?)\s+(?:to\s+(?:the\s+)?end(?:\s+of\s+(?:the\s+)?row)?|across|all\s+(?:sts|stitches)|to\s+last\s+(\d+)\s*(?:sts?|stitches)?)\s*$/i;

/**
 * Turn one comma-separated segment into pieces. Recurses through bracketed
 * repeats, which is how "[yo, k2tog] 6 times" expands without a special case.
 */
function parseSegment(segment: string, craft: ChartCraft, side: RowSide): Piece[] {
  const bracket = BRACKET_REPEAT.exec(segment);
  if (bracket) {
    const times = bracket[3] ? 2 : bracket[4] ? 1 : Number(bracket[2]);
    const inner = splitSegments(bracket[1]).flatMap((part) => parseSegment(part, craft, side));
    if (!Number.isFinite(times) || times < 1) return [{ kind: "unparsed", text: segment }];
    const out: Piece[] = [];
    for (let i = 0; i < times; i += 1) out.push(...inner.map((piece) => ({ ...piece })));
    return out;
  }

  const fill = FILL_PHRASE.exec(segment);
  if (fill) {
    const found = lookupStitch(fill[1], craft, side);
    if (found) {
      return [
        {
          kind: "fill",
          symbol: found.symbol,
          leaveLast: fill[2] ? Number(fill[2]) : 0,
          text: segment,
        },
      ];
    }
  }

  const stitch = parseStitchFragment(segment, craft, side);
  if (stitch) return [pieceFor(stitch, segment)];

  return [{ kind: "unparsed", text: segment }];
}

function pieceFor(stitch: CountedStitch, text: string): Piece {
  return {
    kind: "stitch",
    symbol: stitch.symbol,
    count: stitch.count,
    crossSide: stitch.crossSide,
    text,
  };
}

/** Stitches of the previous row a run of pieces eats. Fills count as nothing yet. */
function consumedBy(pieces: Piece[]): number {
  let total = 0;
  for (const piece of pieces) {
    if (piece.kind === "stitch") total += piece.symbol.stitchesConsumed * piece.count;
  }
  return total;
}

/**
 * "*k2, p2; rep from * to last 2 sts, k2" — the repeat form `toInstructions`
 * itself emits, and the one nearly every published pattern uses.
 */
const STAR_REPEAT = /^(.*?)\*\s*(.+?)\s*[;,.]?\s*rep(?:eat)?\s+from\s*\*\s*(.*)$/i;

interface BodyResult {
  pieces: Piece[];
  notes: string[];
}

/**
 * Expand a row body into a flat list of pieces.
 *
 * `budget` is how many stitches the previous row left — the only number that
 * can say how many times "rep from * to end" actually repeats, or how long
 * "k to end" runs. When it is unknown the repeat is expanded ONCE and a note
 * says so, because guessing a repeat count is how an import quietly halves a
 * sweater.
 */
function parseBody(
  body: string,
  craft: ChartCraft,
  side: RowSide,
  budget: number | null,
): BodyResult {
  const notes: string[] = [];
  const star = STAR_REPEAT.exec(body);

  if (!star) {
    return {
      pieces: expandFills(
        splitSegments(body).flatMap((segment) => parseSegment(segment, craft, side)),
        budget,
        notes,
      ),
      notes,
    };
  }

  const before = splitSegments(star[1]).flatMap((s) => parseSegment(s, craft, side));
  const inner = splitSegments(star[2]).flatMap((s) => parseSegment(s, craft, side));
  const tail = star[3];

  // "to last 2 sts, k2" / "to end" / "3 more times".
  const toLast = /^to\s+last\s+(\d+)\s*(?:sts?|stitches)?\s*[,.]?\s*(.*)$/i.exec(tail);
  const moreTimes = /^(\d+)\s*more\s*times?/i.exec(tail);
  const afterText = toLast ? toLast[2] : /^to\s+end/i.test(tail) ? "" : tail.replace(/^[,.]\s*/, "");
  const after = afterText.trim()
    ? splitSegments(afterText).flatMap((s) => parseSegment(s, craft, side))
    : [];

  const innerConsumed = consumedBy(inner);
  let reps = 1;
  if (moreTimes) {
    reps = Number(moreTimes[1]) + 1;
  } else if (budget !== null && innerConsumed > 0) {
    const reserved = toLast ? Number(toLast[1]) : consumedBy(after);
    const room = budget - consumedBy(before) - reserved;
    reps = Math.max(1, Math.floor(room / innerConsumed));
    if (room % innerConsumed !== 0) {
      notes.push(
        `the repeat "*${star[2]}" does not divide evenly into ${room} stitches — it was worked ${reps} times, leaving ${room - reps * innerConsumed} unaccounted for`,
      );
    }
  } else {
    notes.push(
      `"rep from *" was worked once only: nothing in the text says how many stitches this row starts with`,
    );
  }

  const pieces: Piece[] = [...before];
  for (let i = 0; i < reps; i += 1) pieces.push(...inner.map((piece) => ({ ...piece })));
  pieces.push(...after);
  return { pieces: expandFills(pieces, budget, notes), notes };
}

/** Resolve "k to end" now that the row's stitch budget is known. */
function expandFills(pieces: Piece[], budget: number | null, notes: string[]): Piece[] {
  if (!pieces.some((piece) => piece.kind === "fill")) return pieces;

  const fills = pieces.filter((piece): piece is Extract<Piece, { kind: "fill" }> => piece.kind === "fill");
  const leaveLast = fills.reduce((sum, fill) => sum + fill.leaveLast, 0);

  if (budget === null) {
    notes.push(
      `"${fills[0].text}" could not be sized: nothing in the text says how many stitches this row starts with`,
    );
    return pieces.map((piece) =>
      piece.kind === "fill" ? { kind: "unparsed" as const, text: piece.text } : piece,
    );
  }

  const room = budget - consumedBy(pieces) - leaveLast;
  const each = Math.floor(room / fills.length);
  if (each < 1) {
    notes.push(`"${fills[0].text}" has no stitches left to cover`);
    return pieces.map((piece) =>
      piece.kind === "fill" ? { kind: "unparsed" as const, text: piece.text } : piece,
    );
  }

  let remaining = room;
  return pieces.map((piece) => {
    if (piece.kind !== "fill") return piece;
    const count = Math.max(1, Math.min(each, remaining));
    remaining -= count;
    return {
      kind: "stitch" as const,
      symbol: piece.symbol,
      count,
      crossSide: false,
      text: piece.text,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Grid placement                                                              */
/* -------------------------------------------------------------------------- */

/** Grid CELLS a row's pieces occupy. Layout, not stitch count — see symbols.ts. */
function gridWidthOf(pieces: Piece[]): number {
  let width = 0;
  for (const piece of pieces) {
    if (piece.kind === "stitch") width += piece.symbol.width * piece.count;
  }
  return width;
}

/**
 * Write one row of the grid directly.
 *
 * Direct rather than through `placeSymbol` for two reasons: we are CONSTRUCTING
 * a row rather than editing one, so there is no existing group to displace, and
 * `placeSymbol` clones the whole chart per stitch, which is quadratic on a
 * 100-row import. The multi-cell invariant is maintained here explicitly —
 * anchor carries the symbol, the cells it spans carry `continues`.
 *
 * Reading order is the same one `rowGroupsInReadingOrder` uses: right to left
 * on a RS row, left to right on a WS row. Getting this backwards mirrors every
 * imported cable.
 */
function writeRow(chart: SymbolChart, rowIndex: number, pieces: Piece[], side: RowSide): void {
  const ids: string[] = [];
  for (const piece of pieces) {
    if (piece.kind !== "stitch") continue;
    for (let i = 0; i < piece.count; i += 1) ids.push(piece.symbol.id);
  }

  const total = gridWidthOf(pieces);
  // A RS row is worked from the right edge inwards, so the first stitch worked
  // sits in the LAST column and any padding falls on the left.
  const gridIds = side === "RS" ? ids.slice().reverse() : ids;
  const start = side === "RS" ? chart.width - total : 0;

  const row: ChartCell[] = Array.from({ length: chart.width }, () => ({
    colorIndex: 0,
    symbolId: NO_STITCH_ID,
  }));

  let col = start;
  for (const id of gridIds) {
    const width = getSymbol(id)?.width ?? 1;
    if (col < 0 || col + width > chart.width) break;
    row[col] = { colorIndex: 0, symbolId: id };
    for (let c = col + 1; c < col + width; c += 1) row[c] = { colorIndex: 0, continues: col };
    col += width;
  }

  chart.rows[rowIndex] = row;
}

/* -------------------------------------------------------------------------- */
/* The importer                                                                */
/* -------------------------------------------------------------------------- */

interface RawRow {
  rowNumber: number;
  lineNumber: number;
  declaredSide: RowSide | null;
  body: string;
  declaredStitches: number | null;
  isRound: boolean;
}

export function chartFromPatternText(
  text: string,
  options: TextImportOptions = {},
): TextImportReport {
  const craft = options.craft ?? sniffCraft(text);
  const lines = text.split(/\r?\n/);
  const skipped: SkippedLine[] = [];
  const warnings: string[] = [];

  let castOn: number | null = null;
  const raw: RawRow[] = [];
  let anyRound = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    const match = ROW_LINE.exec(trimmed);
    if (match) {
      const first = Number(match[2]);
      const last = match[3] ? Number(match[3]) : first;
      const isRound = /^(rnd|round)/i.test(match[1]);
      if (isRound) anyRound = true;
      const declaredSide = sideFromLabel(match[4]);
      const body = match[5];
      const counted = DECLARED_COUNT.exec(body);
      const declaredStitches = counted ? Number(counted[1]) : null;
      const cleanBody = counted ? body.slice(0, counted.index).replace(/[.,\s]+$/, "") : body;

      if (last < first || last - first > 500) {
        skipped.push({ lineNumber, text: trimmed, reason: "the row range does not make sense" });
        return;
      }
      // "Rows 2-10: purl" is one line describing nine rows. Each gets its own
      // entry so the chart has nine rows and the tracker counts nine.
      for (let number = first; number <= last; number += 1) {
        raw.push({ rowNumber: number, lineNumber, declaredSide, body: cleanBody, declaredStitches, isRound });
      }
      return;
    }

    const co = CAST_ON.exec(trimmed);
    if (co && castOn === null) {
      castOn = Number(co[1] ?? co[2]);
      return;
    }
    const chain = FOUNDATION_CHAIN.exec(trimmed);
    if (chain && castOn === null) {
      castOn = Number(chain[1] ?? chain[2]);
      return;
    }

    skipped.push({
      lineNumber,
      text: trimmed,
      reason: "not a row instruction — nothing was taken from it",
    });
  });

  if (raw.length === 0) {
    return {
      chart: null,
      craft,
      worked: anyRound ? "round" : "flat",
      startSide: "RS",
      castOn,
      rows: [],
      skipped,
      warnings: [
        'No row instructions were found. Rows need to start with "Row 1:", "Rnd 1:" or "Rows 1-4:".',
      ],
      unresolvedShaping: [],
      issues: [],
    };
  }

  raw.sort((a, b) => a.rowNumber - b.rowNumber);

  const worked: WorkedAs = anyRound ? "round" : "flat";

  // Which side the chart STARTS on is derived from the first labelled row, not
  // assumed: "Row 2 (WS)" and "Row 1 (WS)" imply opposite starts. Without any
  // label a flat chart starts on the right side, the universal convention.
  let startSide: RowSide = "RS";
  const firstLabelled = raw.find((row) => row.declaredSide !== null);
  if (worked === "flat" && firstLabelled?.declaredSide) {
    const oddRow = firstLabelled.rowNumber % 2 === 1;
    startSide = firstLabelled.declaredSide === (oddRow ? "RS" : "WS") ? "RS" : "WS";
  }

  const highest = raw[raw.length - 1].rowNumber;
  const seen = new Set(raw.map((row) => row.rowNumber));
  for (let number = 1; number <= highest; number += 1) {
    if (!seen.has(number)) {
      warnings.push(`Row ${number} is missing from the text; it was left blank in the chart.`);
    }
  }

  // -- pass one: parse every row body, carrying the stitch budget forward ----
  const parsed: { row: ParsedRow; pieces: Piece[] }[] = [];
  let budget: number | null = castOn;
  let previousDeclared: number | null = castOn;

  for (const entry of raw) {
    const side = sideFor(worked, startSide, entry.rowNumber);
    if (entry.declaredSide && entry.declaredSide !== side) {
      // Flat rows alternate. A label that breaks the alternation is a real
      // contradiction in the source, and silently trusting either reading would
      // purl what should be knitted for the rest of the piece.
      warnings.push(
        `Row ${entry.rowNumber} is labelled ${entry.declaredSide}, but rows alternate from a ${startSide} first row, which makes it ${side}. The chart follows the alternation.`,
      );
    }
    // The row's own annotation is the most trustworthy budget there is, but it
    // states what the row LEAVES, so it only helps when nothing shapes.
    const { pieces, notes } = parseBody(entry.body, craft, side, budget ?? entry.declaredStitches);

    let consumed = 0;
    let produced = 0;
    const unparsed: string[] = [];
    for (const piece of pieces) {
      if (piece.kind === "unparsed") {
        unparsed.push(piece.text);
        continue;
      }
      if (piece.kind !== "stitch") continue;
      consumed += piece.symbol.stitchesConsumed * piece.count;
      produced += piece.symbol.stitchesProduced * piece.count;
      if (piece.crossSide) {
        warnings.push(
          `Row ${entry.rowNumber} is a ${side} row but says "${piece.text}". That was read as the chart symbol ${piece.symbol.id}, which on a ${side} row is worked "${side === "RS" ? piece.symbol.rs.abbr : piece.symbol.ws.abbr}".`,
        );
      }
    }

    for (const note of notes) warnings.push(`Row ${entry.rowNumber}: ${note}.`);

    for (const fragment of unparsed) {
      const hint = resolvesOnOtherSide(fragment, craft, side)
        ? ` — "${fragment}" is a ${side === "RS" ? "wrong" : "right"}-side working, so this row may be labelled with the wrong side`
        : "";
      skipped.push({
        lineNumber: entry.lineNumber,
        text: fragment,
        reason: `row ${entry.rowNumber}: no stitch in the ${craft} catalogue is written "${fragment}"${hint}`,
      });
    }

    const declared = entry.declaredStitches;
    const shaping =
      (unparsed.length === 0 && consumed !== produced) ||
      (declared !== null && previousDeclared !== null && declared !== previousDeclared);

    if (declared !== null && unparsed.length === 0 && declared !== produced) {
      warnings.push(
        `Row ${entry.rowNumber} says it ends with ${declared} sts but the stitches written add up to ${produced}. Something in that row was not read.`,
      );
    }

    parsed.push({
      row: {
        rowNumber: entry.rowNumber,
        lineNumber: entry.lineNumber,
        side,
        text: entry.body,
        declaredStitches: declared,
        consumed,
        produced,
        understood: unparsed.length === 0 && pieces.length > 0,
        unparsed,
        shaping,
      },
      pieces,
    });

    if (declared !== null) previousDeclared = declared;
    budget = produced > 0 ? produced : budget;
  }

  // -- pass two: build the grid ---------------------------------------------
  const width = Math.max(...parsed.map((entry) => gridWidthOf(entry.pieces)), 0);
  if (width < 1) {
    return {
      chart: null,
      craft,
      worked,
      startSide,
      castOn,
      rows: parsed.map((entry) => entry.row),
      skipped,
      warnings: [...warnings, "None of the rows contained a stitch this app knows how to chart."],
      unresolvedShaping: parsed.filter((entry) => entry.row.shaping && !entry.row.understood).map((e) => e.row),
      issues: [],
    };
  }

  const chart = createChart({
    id: options.id ?? generateId(),
    name: options.name ?? "Imported pattern",
    craft,
    width,
    height: highest,
    worked,
    startSide,
  });

  // A row the text never mentioned is filled with `nostitch`, not with knits:
  // the row number has to stay put so the tracker counts the right rows, but
  // inventing a row of plain fabric would be inventing stitches. It is called
  // out in `warnings` above.
  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    if (!seen.has(rowIndex + 1)) {
      chart.rows[rowIndex] = Array.from({ length: width }, () => ({
        colorIndex: 0,
        symbolId: NO_STITCH_ID,
      }));
    }
  }
  for (const entry of parsed) {
    writeRow(chart, entry.row.rowNumber - 1, entry.pieces, entry.row.side);
  }

  const rows = parsed.map((entry) => entry.row);
  return {
    chart,
    craft,
    worked,
    startSide,
    castOn,
    rows,
    skipped,
    warnings,
    unresolvedShaping: rows.filter((row) => row.shaping && !row.understood),
    issues: validateChart(chart).issues,
  };
}

/** The same rule `rowSide` uses, expressed over 1-based row numbers. */
function sideFor(worked: WorkedAs, startSide: RowSide, rowNumber: number): RowSide {
  if (worked === "round") return "RS";
  const odd = rowNumber % 2 === 1;
  return startSide === "RS" ? (odd ? "RS" : "WS") : odd ? "WS" : "RS";
}
