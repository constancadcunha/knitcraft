/**
 * Written instructions -> navigable sections.
 *
 * A 183-row back is 183 written rows. Printed as one list it is a wall nobody
 * can hold their place in — the complaint this module exists to answer. The fix
 * is the one every published pattern uses: the piece is broken into PHASES
 * ("hem", "body", "shaping", "edging") and long phases into blocks of rows, so
 * a reader navigates to a heading rather than scrolling past two hundred lines.
 *
 * The grouping is derived, never authored. Two facts in the data carry it:
 *
 *  1. A ROW'S SHAPE. Two rows that read the same way are the same fabric. The
 *     hem is rib, the body is not, and the boundary between them is where the
 *     shape changes. Comparing a row to the one TWO rows back as well as the
 *     one before is what makes this work on flat knitting, where the fabric
 *     repeats every two rows (a stockinette RS row and its WS row never read
 *     alike, but every other row does).
 *
 *  2. A CHANGE IN THE STITCH COUNT. A row that leaves a different number of
 *     stitches than it was given is shaping, and shaping is what a knitter has
 *     to pay attention to. Those rows are pulled into their own section so they
 *     are never buried in the middle of a plain block.
 *
 * Nothing here renders; it is pure data so it can be tested without a DOM.
 */

import { chartToInstructions, type SymbolChart } from "@/lib/chart";
import type { Instruction } from "@/types";

/** One row as the browser needs it, whatever it was derived from. */
export interface BrowsableRow {
  rowNumber: number;
  /** "Row 7 (RS)" / "Rnd 7" — as the pattern prints it. */
  label: string;
  /** The instruction itself, without the label or the stitch count. */
  body: string;
  side: "RS" | "WS" | null;
  /** Stitches the row leaves, when known. */
  stitchesAfter: number | null;
  /** Rows with the same signature are the same fabric. Exposed for tests. */
  signature: string;
  /** True when the row changes the stitch count. */
  shaped: boolean;
}

export interface RowBook {
  /** "Cast on 106 sts." — pinned above the sections, never scrolled away. */
  castOnText: string | null;
  rows: BrowsableRow[];
}

export type PhaseKind = "ribbing" | "body" | "shaping" | "finishing";

export interface InstructionSection {
  id: string;
  kind: PhaseKind;
  /** "Hem / ribbing", "Body 2/5", "Shaping". */
  title: string;
  /** "Rows 25–44". */
  rangeLabel: string;
  /** "20 rows · ends 106 sts". */
  detail: string;
  rows: BrowsableRow[];
  fromRow: number;
  toRow: number;
}

/* -------------------------------------------------------------------------- */
/* Building rows                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Rows straight from a chart.
 *
 * `totalStitches` is the piece's real width. A chart is clipped to an editable
 * window, so without it a 106-stitch back reads "cast on 60" — pass
 * `panel.stitches` (or whatever the pattern was written from) and every count
 * in the prose is the piece's own.
 */
export function rowsFromChart(
  chart: SymbolChart,
  options: { totalStitches?: number } = {},
): RowBook {
  const written = chartToInstructions(chart, {
    ...(options.totalStitches ? { totalStitches: options.totalStitches } : {}),
  });

  return {
    castOnText: written.castOnText,
    rows: written.rows.map((row) => ({
      rowNumber: row.rowNumber,
      label: row.label,
      body: row.body,
      side: chart.worked === "round" ? null : row.side,
      stitchesAfter: row.stitchesAfter,
      // Symbol ids, not abbreviations: a symbol means the same thing on both
      // sides of the fabric even though it is WRITTEN differently ("k" on the
      // right side, "p" on the wrong), so this key is side-independent and two
      // rows of the same stockinette read as the same fabric.
      signature: row.runs.map((run) => `${run.symbolId}x${run.count}`).join("/"),
      shaped: row.stitchesBefore !== row.stitchesAfter,
    })),
  };
}

/**
 * Rows from an already-written pattern section.
 *
 * The stored pattern was assembled from the same charts by `assemblePattern`,
 * which knew each piece's true stitch count — so its text is the authority and
 * is read back rather than regenerated. The lines look like
 * "Row 7 (RS): k3, 2/2 RC, k2. (58 sts)".
 */
export function rowsFromWrittenInstructions(instructions: Instruction[]): RowBook {
  let castOnText: string | null = null;
  const rows: BrowsableRow[] = [];
  let previousCount: number | null = null;

  for (const instruction of instructions) {
    const text = instruction.text.trim();
    const split = text.indexOf(": ");
    // The cast-on line carries no row number and no "Row n:" prefix.
    if (instruction.rowNumber === 0 || split === -1 || !/^(row|rnd)\b/i.test(text)) {
      if (castOnText === null) castOnText = text;
      continue;
    }

    const label = text.slice(0, split);
    const rest = text.slice(split + 2);
    const counted = /\((\d+)\s*sts?\)\s*$/.exec(rest);
    const stitchesAfter = counted
      ? Number(counted[1])
      : (instruction.stitchesAfter ?? null);
    const body = (counted ? rest.slice(0, counted.index) : rest).trim().replace(/\.$/, "");
    const sided = /\((RS|WS)\)/.exec(label);

    rows.push({
      rowNumber: instruction.rowNumber,
      label,
      body,
      side: sided ? (sided[1] as "RS" | "WS") : null,
      stitchesAfter,
      // No symbol ids here, so the written shape stands in for them: the counts
      // are blanked so "k12, p2" and "k14, p2" are not called different fabric.
      signature: body.replace(/\d+/g, "#"),
      shaped:
        stitchesAfter !== null && previousCount !== null && stitchesAfter !== previousCount,
    });
    if (stitchesAfter !== null) previousCount = stitchesAfter;
  }

  return { castOnText, rows };
}

/* -------------------------------------------------------------------------- */
/* Grouping                                                                    */
/* -------------------------------------------------------------------------- */

export interface GroupOptions {
  /**
   * Longest block of rows under one heading. Twenty is about a phone screen of
   * reading and a comfortable sitting's worth of knitting; beyond that a reader
   * loses their place again, which is the whole complaint.
   */
  blockSize?: number;
}

export function groupRows(
  rows: BrowsableRow[],
  options: GroupOptions = {},
): InstructionSection[] {
  const blockSize = Math.max(4, options.blockSize ?? 20);
  if (rows.length === 0) return [];

  const segments = splitIntoSegments(rows);
  const sections: InstructionSection[] = [];

  segments.forEach((segment, index) => {
    const kind = classify(segment, index, segments.length, rows.length);
    const base = titleFor(kind, segment);
    const blocks = chunk(segment, blockSize);

    blocks.forEach((block, blockIndex) => {
      const title =
        blocks.length > 1 ? `${base} ${blockIndex + 1}/${blocks.length}` : base;
      const fromRow = block[0].rowNumber;
      const toRow = block[block.length - 1].rowNumber;
      const endCount = block[block.length - 1].stitchesAfter;

      sections.push({
        id: `${kind}-${fromRow}-${toRow}`,
        kind,
        title,
        rangeLabel: fromRow === toRow ? `Row ${fromRow}` : `Rows ${fromRow}–${toRow}`,
        detail: [
          `${block.length} row${block.length === 1 ? "" : "s"}`,
          endCount !== null ? `ends ${endCount} sts` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        rows: block,
        fromRow,
        toRow,
      });
    });
  });

  return sections;
}

/**
 * Break the rows where the fabric changes.
 *
 * A row continues the current segment when it reads like either of the two rows
 * before it — one row back for a fabric worked the same every row (crochet, or
 * anything in the round), two rows back for flat knitting, where the wrong-side
 * row is written differently but is the same fabric. A shaping row only ever
 * continues a segment that is already shaping.
 */
function splitIntoSegments(rows: BrowsableRow[]): BrowsableRow[][] {
  const segments: BrowsableRow[][] = [[rows[0]]];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const current = segments[segments.length - 1];
    const shapingSegment = current.some((r) => r.shaped);

    if (row.shaped === shapingSegment && sameFabric(rows, i)) current.push(row);
    else segments.push([row]);
  }

  return segments;
}

/** Does row `i` read like the fabric immediately before it? */
function sameFabric(rows: BrowsableRow[], i: number): boolean {
  const signature = rows[i].signature;
  if (signature === rows[i - 1].signature) return true;
  // Established alternation: flat knitting repeats every two rows.
  if (i >= 2 && signature === rows[i - 2].signature) return true;
  // The SECOND row of a piece has nothing two rows back to compare with. It
  // belongs with the first when the third row shows the fabric alternating
  // (rib, seed stitch, stockinette) rather than having actually changed.
  if (i === 1) return rows.length <= 2 || rows[2].signature === rows[0].signature;
  return false;
}

function classify(
  segment: BrowsableRow[],
  index: number,
  segmentCount: number,
  totalRows: number,
): PhaseKind {
  if (segment.some((row) => row.shaped)) return "shaping";
  if (segmentCount === 1) return "body";
  // A short run of a different fabric at either end of a piece is its edge: the
  // hem or cuff at the start, the collar or border at the finish.
  const short = segment.length <= Math.max(6, totalRows * 0.25);
  if (index === 0 && short) return "ribbing";
  if (index === segmentCount - 1 && short) return "finishing";
  return "body";
}

function titleFor(kind: PhaseKind, segment: BrowsableRow[]): string {
  if (kind === "shaping") return "Shaping";
  if (kind === "finishing") return "Edging";
  if (kind === "ribbing") return looksRibbed(segment) ? "Hem / ribbing" : "Border";
  return "Body";
}

/**
 * Does this fabric alternate between two stitches across the row? That is what
 * rib is, and calling a 2x2 rib hem "Border" would be needlessly vague. Crochet
 * borders (post stitches, shells) fall through to "Border", which is what a
 * crocheter calls them anyway.
 */
function looksRibbed(segment: BrowsableRow[]): boolean {
  return segment.some((row) => {
    const knits = /(^|[\s,*[])k(?:tbl)?\d/i.test(row.body);
    const purls = /(^|[\s,*[])p(?:tbl)?\d/i.test(row.body);
    return knits && purls;
  });
}

function chunk(rows: BrowsableRow[], size: number): BrowsableRow[][] {
  if (rows.length <= size) return [rows];
  const blocks: BrowsableRow[][] = [];
  // Split into near-equal blocks rather than a full-size run plus a stub, so a
  // 21-row body is 11 + 10 and not 20 + 1.
  const count = Math.ceil(rows.length / size);
  const per = Math.ceil(rows.length / count);
  for (let i = 0; i < rows.length; i += per) blocks.push(rows.slice(i, i + per));
  return blocks;
}

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* -------------------------------------------------------------------------- */

/** Index of the section holding a row number, or -1. */
export function sectionIndexForRow(
  sections: InstructionSection[],
  rowNumber: number | null | undefined,
): number {
  if (rowNumber === null || rowNumber === undefined) return -1;
  return sections.findIndex((s) => rowNumber >= s.fromRow && rowNumber <= s.toRow);
}

/**
 * The piece's true stitch count, recovered from the chart itself.
 *
 * A saved chart does not carry the panel it was drafted from, but a clipped
 * chart carries a repeat box labelled by the engine with the real width
 * ("Repeat this panel across 106 sts and 180 rows"). Reading it back is how the
 * tracker prints the same counts as the written pattern for a project that has
 * no written pattern at all.
 */
export function panelStitchesFromChart(chart: SymbolChart): number | undefined {
  for (const box of chart.repeats) {
    const found = /across\s+(\d+)\s+sts/i.exec(box.label ?? "");
    if (found) return Number(found[1]);
  }
  return undefined;
}
