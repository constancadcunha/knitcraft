/**
 * Shaping: turning "get from A stitches to B stitches inside C rows" into
 * instructions a knitter can follow.
 *
 * The old app had no shaping engine at all. `shapes.ts` was a display mask that
 * greyed out cells of a rectangle and was never converted into a cast-on, a
 * bind-off or a decrease rate; the written instructions asserted rates instead
 * of solving them, which is how a sleeve ended up needing 92 rows of increases
 * inside a 79-row sleeve.
 *
 * Every function here is pure and total: it always reports whether the shaping
 * fits, it never silently emits a schedule that overruns its row budget, and
 * the numbers in the returned instruction string always match the returned
 * schedule exactly (they are generated from it).
 */

import { ordinal, plural, roundTo } from "./units";

/* -------------------------------------------------------------------------- */
/* Craft vocabulary                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Wording differs between crafts and the old engine handled it by swapping four
 * strings, which produced "Decrease 1 stitches at each end of every RS row" for
 * crochet — wrong grammar and a knitting-only convention.
 */
export interface ShapingTerms {
  readonly stitch: string;
  readonly stitches: string;
  readonly row: string;
  readonly rows: string;
  readonly work: string;
  readonly increase: string;
  readonly decrease: string;
  readonly bindOff: string;
  /** The abbreviation used for a plain worked stitch in an "even across a row" instruction. */
  readonly plainAbbr: string;
  readonly increaseAbbr: string;
  readonly decreaseAbbr: string;
}

export const KNIT_TERMS: ShapingTerms = {
  stitch: "st",
  stitches: "sts",
  row: "row",
  rows: "rows",
  work: "work",
  increase: "increase",
  decrease: "decrease",
  bindOff: "bind off",
  plainAbbr: "k",
  increaseAbbr: "M1",
  decreaseAbbr: "k2tog",
};

export const CROCHET_TERMS: ShapingTerms = {
  stitch: "st",
  stitches: "sts",
  row: "row",
  rows: "rows",
  work: "work",
  increase: "increase",
  decrease: "decrease",
  bindOff: "fasten off",
  plainAbbr: "sc",
  increaseAbbr: "2 sc in next st",
  decreaseAbbr: "sc2tog",
};

/* -------------------------------------------------------------------------- */
/* Distributing shaping rows down a piece                                      */
/* -------------------------------------------------------------------------- */

export interface ShapingGroup {
  /** Rows between shaping rows, counting the shaping row itself: 6 = "every 6th row". */
  readonly interval: number;
  readonly times: number;
}

export interface ShapingSchedule {
  /** Shaping events requested. */
  readonly count: number;
  /** Row budget they had to fit inside. */
  readonly overRows: number;
  /** Events actually scheduled. Equals `count` whenever `fits` is true. */
  readonly scheduledCount: number;
  readonly fits: boolean;
  readonly groups: readonly ShapingGroup[];
  /** 1-indexed row numbers, within the budget, on which shaping happens. */
  readonly rows: readonly number[];
  /** The last shaping row; never greater than `overRows`. */
  readonly rowsUsed: number;
  /** Plain rows left after the final shaping row. */
  readonly plainRowsAfter: number;
  readonly everyOtherRow: boolean;
  readonly instruction: string;
  readonly warnings: readonly string[];
}

export interface DistributeOptions {
  /**
   * Shaping may only fall on alternate rows — the normal case for a flat piece
   * shaped on right-side rows only. Every interval is then forced even, which
   * is the constraint the old engine ignored when it hardcoded "every 6th row".
   */
  readonly everyOtherRow?: boolean;
  /** What happens on a shaping row, e.g. "an increase row". Used in the prose. */
  readonly label?: string;
  readonly terms?: ShapingTerms;
  /** Put the shorter interval group first (the default, and the usual convention). */
  readonly shorterIntervalFirst?: boolean;
}

function intervalPhrase(interval: number, terms: ShapingTerms): string {
  if (interval === 1) return `every ${terms.row}`;
  if (interval === 2) return `every other ${terms.row}`;
  return `every ${ordinal(interval)} ${terms.row}`;
}

/**
 * Spread `count` shaping events as evenly as possible over `overRows` rows.
 *
 * This is the knitter's "magic formula". Dividing rows by events almost never
 * comes out whole, so a naive "every Nth row" either runs out of fabric or
 * leaves a slab of plain rows at the end. The classic solution splits the
 * difference between two adjacent intervals:
 *
 *     q = floor(rows / count)          the base interval
 *     r = rows mod count               the leftover rows
 *     -> work every q rows (count - r) times, then every (q + 1) rows r times
 *
 * which consumes q*(count-r) + (q+1)*r = q*count + r = rows exactly. The final
 * shaping row therefore lands on the last row of the budget: pass a reduced
 * budget if the design wants plain rows after the last increase.
 *
 * With `everyOtherRow`, the same maths runs in units of two rows so that every
 * interval comes out even and all shaping falls on the same side of the fabric.
 */
export function distributeShaping(
  count: number,
  overRows: number,
  options: DistributeOptions = {},
): ShapingSchedule {
  const terms = options.terms ?? KNIT_TERMS;
  const everyOtherRow = options.everyOtherRow ?? false;
  const label = options.label ?? `a shaping ${terms.row}`;
  const shorterFirst = options.shorterIntervalFirst ?? true;

  const requested = Math.max(0, Math.trunc(count));
  const budget = Math.max(0, Math.trunc(overRows));
  const unit = everyOtherRow ? 2 : 1;
  const slots = Math.floor(budget / unit);
  const warnings: string[] = [];

  if (requested === 0) {
    return {
      count: 0,
      overRows: budget,
      scheduledCount: 0,
      fits: true,
      groups: [],
      rows: [],
      rowsUsed: 0,
      plainRowsAfter: budget,
      everyOtherRow,
      instruction: `${cap(terms.work)} ${plural(budget, terms.row, terms.rows)} even, with no shaping.`,
      warnings,
    };
  }

  let scheduled = requested;
  let fits = true;
  if (slots < requested) {
    fits = false;
    scheduled = slots;
    warnings.push(
      `${requested} shaping ${requested === 1 ? terms.row : terms.rows} do not fit in ${plural(budget, terms.row, terms.rows)}` +
        `${everyOtherRow ? " worked on alternate rows" : ""}: at most ${slots} fit. Lengthen the piece, shape on every row, or reduce the shaping.`,
    );
  }

  if (scheduled === 0) {
    return {
      count: requested,
      overRows: budget,
      scheduledCount: 0,
      fits: false,
      groups: [],
      rows: [],
      rowsUsed: 0,
      plainRowsAfter: budget,
      everyOtherRow,
      instruction: `No shaping can be worked: ${plural(budget, terms.row, terms.rows)} is not enough for ${requested} shaping ${requested === 1 ? terms.row : terms.rows}.`,
      warnings,
    };
  }

  const q = Math.floor(slots / scheduled);
  const r = slots % scheduled;
  const shortGroup: ShapingGroup = { interval: q * unit, times: scheduled - r };
  const longGroup: ShapingGroup = { interval: (q + 1) * unit, times: r };
  const ordered = shorterFirst ? [shortGroup, longGroup] : [longGroup, shortGroup];
  const groups = ordered.filter((g) => g.times > 0);

  const rows: number[] = [];
  let cursor = 0;
  for (const group of groups) {
    for (let i = 0; i < group.times; i += 1) {
      cursor += group.interval;
      rows.push(cursor);
    }
  }

  const rowsUsed = rows.length > 0 ? rows[rows.length - 1] : 0;
  const phrases = groups.map((g) => `${intervalPhrase(g.interval, terms)} ${timesPhrase(g.times)}`);
  const instruction =
    `${cap(terms.work)} ${label} ${phrases.join(", then ")} ` +
    `(${plural(scheduled, `shaping ${terms.row}`, `shaping ${terms.rows}`)} over ${plural(budget, terms.row, terms.rows)}).`;

  return {
    count: requested,
    overRows: budget,
    scheduledCount: scheduled,
    fits,
    groups,
    rows,
    rowsUsed,
    plainRowsAfter: budget - rowsUsed,
    everyOtherRow,
    instruction,
    warnings,
  };
}

function timesPhrase(times: number): string {
  if (times === 1) return "once";
  if (times === 2) return "twice";
  return `${times} times`;
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Sleeve taper, solved rather than asserted.
 *
 * `availableRows` is the sleeve length minus the cuff and minus the plain
 * stretch below the underarm. Increases are worked at BOTH ends of the row, so
 * one shaping row adds two stitches — hence `(upper - cuff) / 2` events.
 */
export function taperSchedule(
  fromStitches: number,
  toStitches: number,
  availableRows: number,
  options: DistributeOptions = {},
): ShapingSchedule & { readonly stitchesPerShapingRow: number; readonly fromStitches: number; readonly toStitches: number } {
  const delta = toStitches - fromStitches;
  const stitchesPerShapingRow = 2;
  const events = Math.abs(Math.round(delta / stitchesPerShapingRow));
  const terms = options.terms ?? KNIT_TERMS;
  const label =
    options.label ??
    `${delta >= 0 ? "an increase" : "a decrease"} ${terms.row} (${delta >= 0 ? "inc" : "dec"} 1 ${terms.stitch} at each end)`;
  const schedule = distributeShaping(events, availableRows, { everyOtherRow: true, ...options, label });
  return { ...schedule, stitchesPerShapingRow, fromStitches, toStitches };
}

/* -------------------------------------------------------------------------- */
/* Stepped bind-off curves (armholes and necklines)                            */
/* -------------------------------------------------------------------------- */

export interface BindOffStep {
  readonly stitches: number;
  readonly times: number;
}

export interface BindOffCurve {
  /** Stitches removed from one edge. Always equals the sum of the steps. */
  readonly total: number;
  readonly steps: readonly BindOffStep[];
  /** How many shaping rows the curve takes. */
  readonly shapingRows: number;
  /** Rows from the first shaping row to the last, inclusive. */
  readonly rowsUsed: number;
  readonly edges: 1 | 2;
  readonly instruction: string;
  readonly warnings: readonly string[];
}

export interface BindOffOptions {
  /** 2 when the same curve is worked at both edges of a flat piece (an armhole). */
  readonly edges?: 1 | 2;
  /** Fraction taken off in the first, straight bind-off. */
  readonly initialFraction?: number;
  /** Fraction of the remainder worked as 2-stitch steps; the rest are singles. */
  readonly twoStepFraction?: number;
  readonly terms?: ShapingTerms;
  /** e.g. "armhole edge", used in the prose. */
  readonly edgeLabel?: string;
  /** How many rows are available; a warning is raised if the curve needs more. */
  readonly availableRows?: number;
}

/**
 * The standard stepped bind-off used for an armhole or a neckline curve.
 *
 * A curve cannot be cut in one straight line, and it cannot be worked one
 * stitch at a time either — the edge would be too shallow and would flare. The
 * traditional solution takes about half the stitches off in a single bind-off
 * at the base of the curve, then steps down in 2s, then finishes in 1s, which
 * approximates a quarter-circle. So a 20-stitch neck curve becomes
 * "bind off 10 sts once, 2 sts 3 times, then 1 st 4 times".
 *
 * The steps always sum to exactly the stitches requested — the remainder is
 * absorbed by the single-stitch steps, never rounded away.
 */
export function bindOffCurve(stitches: number, options: BindOffOptions = {}): BindOffCurve {
  const terms = options.terms ?? KNIT_TERMS;
  const edges = options.edges ?? 1;
  const initialFraction = options.initialFraction ?? 0.5;
  const twoStepFraction = options.twoStepFraction ?? 0.7;
  const edgeLabel = options.edgeLabel ?? "each edge";
  const warnings: string[] = [];

  const total = Math.max(0, Math.trunc(stitches));
  if (total === 0) {
    return {
      total: 0,
      steps: [],
      shapingRows: 0,
      rowsUsed: 0,
      edges,
      instruction: `No shaping at ${edgeLabel}.`,
      warnings,
    };
  }

  const initial = Math.min(total, Math.max(1, Math.round(total * initialFraction)));
  let remainder = total - initial;
  // The steps have to get SMALLER as the curve flattens. If the first bind-off
  // is already down to a single stitch there is no room for 2-stitch steps
  // after it, or the edge would bulge back outwards.
  const twos = initial >= 2 ? Math.floor((remainder * twoStepFraction) / 2) : 0;
  remainder -= twos * 2;
  const ones = remainder;

  const steps: BindOffStep[] = [];
  const pushStep = (count: number, times: number) => {
    if (times <= 0) return;
    const last = steps[steps.length - 1];
    // A 2-stitch initial bind-off followed by 2-stitch steps is one step of
    // three, not two steps that look identical to the knitter.
    if (last && last.stitches === count) {
      steps[steps.length - 1] = { stitches: count, times: last.times + times };
      return;
    }
    steps.push({ stitches: count, times });
  };
  pushStep(initial, 1);
  pushStep(2, twos);
  pushStep(1, ones);

  const shapingRows = steps.reduce((sum, s) => sum + s.times, 0);
  // With one edge the steps fall on alternate rows, so the span from the first
  // to the last is 2n-1. With two edges they fall on consecutive rows (one edge
  // per row), so the span is exactly 2n.
  const rowsUsed = edges === 2 ? shapingRows * 2 : shapingRows * 2 - 1;

  if (options.availableRows !== undefined && rowsUsed > options.availableRows) {
    warnings.push(
      `This curve needs ${plural(rowsUsed, terms.row, terms.rows)} but only ${plural(options.availableRows, terms.row, terms.rows)} are available. Deepen the armhole, or take more stitches off in the first bind-off.`,
    );
  }

  const phrases = steps.map(
    (s) => `${plural(s.stitches, terms.stitch, terms.stitches)} ${timesPhrase(s.times)}`,
  );
  const instruction =
    `${cap(terms.bindOff)} ${phrases.join(", then ")} at ${edgeLabel} ` +
    `(${plural(total, terms.stitch, terms.stitches)} removed per edge over ${plural(rowsUsed, terms.row, terms.rows)}).`;

  return { total, steps, shapingRows, rowsUsed, edges, instruction, warnings };
}

/* -------------------------------------------------------------------------- */
/* Distributing shaping across a single row                                    */
/* -------------------------------------------------------------------------- */

export interface EvenDistributionGroup {
  /** Plain stitches worked before the shaping in this group. */
  readonly plainStitches: number;
  readonly times: number;
}

export interface EvenDistribution {
  readonly from: number;
  readonly to: number;
  readonly delta: number;
  readonly direction: "increase" | "decrease" | "none";
  readonly groups: readonly EvenDistributionGroup[];
  /** Stitches consumed by the instruction. Always equals `from`. */
  readonly stitchesConsumed: number;
  readonly feasible: boolean;
  readonly instruction: string;
  readonly warnings: readonly string[];
}

export interface EvenDistributionOptions {
  readonly terms?: ShapingTerms;
  /** Override the increase/decrease abbreviation, e.g. "kfb", "ssk". */
  readonly method?: string;
  /**
   * Split the leading plain run in half and move the other half to the end, so
   * the first and last shaping sit an equal distance from the edges. This is
   * what a tech editor expects on a rib-to-body transition row.
   */
  readonly edgeBalanced?: boolean;
}

/**
 * "Increase N stitches evenly across the row" — solved, with the instruction
 * written out.
 *
 * With M stitches on the needle and N increases to place:
 *     q = floor(M / N), r = M mod N
 *     -> (N - r) groups of q plain stitches, then r groups of (q + 1)
 * The groups consume q*N + r = M stitches exactly, so the knitter never runs
 * out early or finishes with a stray tail of stitches.
 *
 * Decreases are the same maths with the decreases' own consumption removed
 * first: N k2togs eat 2N stitches, leaving M - 2N plain stitches to spread.
 */
export function evenlyDistributeIncreases(
  from: number,
  to: number,
  options: EvenDistributionOptions = {},
): EvenDistribution {
  const terms = options.terms ?? KNIT_TERMS;
  const start = Math.max(0, Math.trunc(from));
  const target = Math.max(0, Math.trunc(to));
  const delta = target - start;
  const warnings: string[] = [];

  if (delta === 0) {
    return {
      from: start,
      to: target,
      delta: 0,
      direction: "none",
      groups: [],
      stitchesConsumed: start,
      feasible: true,
      instruction: `${cap(terms.work)} one ${terms.row} even (${plural(start, terms.stitch, terms.stitches)}).`,
      warnings,
    };
  }

  const isIncrease = delta > 0;
  const events = Math.abs(delta);
  // Increases sit between existing stitches; decreases eat two stitches each.
  const plainAvailable = isIncrease ? start : start - 2 * events;
  const method = options.method ?? (isIncrease ? terms.increaseAbbr : terms.decreaseAbbr);

  let feasible = true;
  if (plainAvailable < events) {
    feasible = false;
    warnings.push(
      isIncrease
        ? `Cannot place ${events} increases in ${plural(start, terms.stitch, terms.stitches)}: there must be at least one plain ${terms.stitch} between increases. Work the increases over two rows.`
        : `Cannot place ${events} decreases in ${plural(start, terms.stitch, terms.stitches)}: ${events} ${terms.decreaseAbbr} alone consume ${2 * events} ${terms.stitches}. Work the decreases over two rows.`,
    );
  }

  const safePlain = Math.max(0, plainAvailable);
  const q = Math.floor(safePlain / events);
  const r = safePlain % events;
  const groups: EvenDistributionGroup[] = [];
  if (events - r > 0) groups.push({ plainStitches: q, times: events - r });
  if (r > 0) groups.push({ plainStitches: q + 1, times: r });

  const consumedPlain = groups.reduce((sum, g) => sum + g.plainStitches * g.times, 0);
  const stitchesConsumed = consumedPlain + (isIncrease ? 0 : 2 * events);

  const instruction = writeEvenInstruction(groups, {
    terms,
    method,
    isIncrease,
    to: target,
    edgeBalanced: options.edgeBalanced ?? false,
  });

  return {
    from: start,
    to: target,
    delta,
    direction: isIncrease ? "increase" : "decrease",
    groups,
    stitchesConsumed,
    feasible,
    instruction,
    warnings,
  };
}

function writeEvenInstruction(
  groups: readonly EvenDistributionGroup[],
  context: {
    terms: ShapingTerms;
    method: string;
    isIncrease: boolean;
    to: number;
    edgeBalanced: boolean;
  },
): string {
  const { terms, method, to, edgeBalanced } = context;
  if (groups.length === 0) return `${cap(terms.work)} one ${terms.row} even.`;

  const working: EvenDistributionGroup[] = groups.map((g) => ({ ...g }));
  let tail = 0;

  if (edgeBalanced && working[0].plainStitches > 1) {
    // Take half of the FIRST group's plain run and move it to the end of the
    // row, so the first and last shaping sit an equal distance from the edges
    // instead of the last one landing on the final stitch. The total number of
    // plain stitches consumed is unchanged.
    tail = Math.floor(working[0].plainStitches / 2);
    const shortened: EvenDistributionGroup = { plainStitches: working[0].plainStitches - tail, times: 1 };
    if (working[0].times > 1) {
      working[0] = { plainStitches: working[0].plainStitches, times: working[0].times - 1 };
      working.unshift(shortened);
    } else {
      working[0] = shortened;
    }
  }

  const reps = working
    .filter((g) => g.times > 0)
    .map((g) => {
      const plain = g.plainStitches > 0 ? `${terms.plainAbbr}${g.plainStitches}, ` : "";
      return g.times === 1 ? `${plain}${method}` : `*${plain}${method}; rep from * ${g.times} times`;
    });

  const tailText = tail > 0 ? `, ${terms.plainAbbr}${tail}` : "";
  return `${reps.join(", ")}${tailText} — ${plural(to, terms.stitch, terms.stitches)}.`;
}

/* -------------------------------------------------------------------------- */
/* Picking up stitches along an edge                                           */
/* -------------------------------------------------------------------------- */

export type EdgeKind = "vertical" | "horizontal" | "curve";

/**
 * Pick-up ratios. A knitted row is shorter than a stitch is wide, so picking up
 * one stitch per row along a vertical edge produces a band that ruffles; the
 * standard ratio is 3 stitches for every 4 rows. Along a cast-on or bound-off
 * edge it is 1:1, and around a curve about 2 stitches for every 3 rows.
 */
export const PICK_UP_RATIOS: Record<EdgeKind, number> = {
  vertical: 3 / 4,
  horizontal: 1,
  curve: 2 / 3,
};

export interface PickUpResult {
  readonly stitches: number;
  readonly edgeLength: number;
  readonly kind: EdgeKind;
  readonly ratio: number;
  readonly instruction: string;
}

/**
 * How many stitches to pick up along an edge.
 *
 * The old engine picked up `bandSts` — the band's WIDTH in stitches, 8 — along
 * a 108-row, 24.5 in front edge that needs about 80.
 */
export function pickUpStitches(
  edgeLength: number,
  kind: EdgeKind = "vertical",
  options: { terms?: ShapingTerms; multiple?: number } = {},
): PickUpResult {
  const terms = options.terms ?? KNIT_TERMS;
  const ratio = PICK_UP_RATIOS[kind];
  let stitches = Math.round(Math.max(0, edgeLength) * ratio);
  if (options.multiple && options.multiple > 1) {
    stitches = options.multiple * Math.max(1, Math.round(stitches / options.multiple));
  }
  const unit = kind === "horizontal" ? terms.stitches : terms.rows;
  const ratioText =
    kind === "horizontal"
      ? `1 ${terms.stitch} in every ${terms.stitch}`
      : kind === "vertical"
        ? `3 ${terms.stitches} for every 4 ${terms.rows}`
        : `2 ${terms.stitches} for every 3 ${terms.rows}`;
  return {
    stitches,
    edgeLength,
    kind,
    ratio,
    instruction: `Pick up and knit ${plural(stitches, terms.stitch, terms.stitches)} along the ${kind === "horizontal" ? "bound-off" : kind} edge (${ratioText} over ${Math.round(edgeLength)} ${unit}).`,
  };
}

/* -------------------------------------------------------------------------- */
/* Buttonholes                                                                 */
/* -------------------------------------------------------------------------- */

export interface ButtonholePlan {
  readonly buttonCount: number;
  /** 1-indexed rows of the band on which a buttonhole is worked. */
  readonly rows: readonly number[];
  readonly bandRows: number;
  readonly spacingRows: number;
  readonly instruction: string;
  readonly warnings: readonly string[];
}

/**
 * Space buttonholes along the LENGTH of a band.
 *
 * The old engine derived the buttonhole count from the ribbing's row count and
 * then spaced the holes across the band's 8-stitch WIDTH, consuming 16 stitches
 * on an 8-stitch band. Buttonholes are spaced vertically: the first sits a
 * little above the hem, the last a little below the neckband, and the rest are
 * distributed evenly between them.
 */
export function distributeButtonholes(
  bandRows: number,
  buttonCount: number,
  options: { bottomOffsetRows?: number; topOffsetRows?: number; minSpacingRows?: number; terms?: ShapingTerms } = {},
): ButtonholePlan {
  const terms = options.terms ?? KNIT_TERMS;
  const rowsTotal = Math.max(0, Math.trunc(bandRows));
  const count = Math.max(0, Math.trunc(buttonCount));
  const warnings: string[] = [];

  if (count === 0 || rowsTotal === 0) {
    return {
      buttonCount: count,
      rows: [],
      bandRows: rowsTotal,
      spacingRows: 0,
      instruction: "No buttonholes.",
      warnings,
    };
  }

  const bottom = Math.max(1, Math.trunc(options.bottomOffsetRows ?? Math.round(rowsTotal * 0.03) + 2));
  const top = Math.max(1, Math.trunc(options.topOffsetRows ?? Math.round(rowsTotal * 0.03) + 2));
  const first = bottom;
  const last = rowsTotal - top;

  if (last <= first) {
    warnings.push(`A band of ${plural(rowsTotal, terms.row, terms.rows)} is too short for ${count} buttonholes with the requested end margins.`);
    return {
      buttonCount: count,
      rows: [Math.max(1, Math.round(rowsTotal / 2))],
      bandRows: rowsTotal,
      spacingRows: 0,
      instruction: `Band too short: work a single buttonhole at the centre.`,
      warnings,
    };
  }

  const rows: number[] = [];
  if (count === 1) {
    rows.push(Math.round((first + last) / 2));
  } else {
    const span = last - first;
    for (let i = 0; i < count; i += 1) {
      rows.push(Math.round(first + (span * i) / (count - 1)));
    }
  }
  const spacingRows = count > 1 ? Math.round((last - first) / (count - 1)) : 0;

  // Buttonholes closer than a few rows apart tear the band between them, and
  // at zero spacing two "buttonholes" would land on the same row.
  const minSpacing = Math.max(1, Math.trunc(options.minSpacingRows ?? 4));
  if (count > 1 && spacingRows < minSpacing) {
    warnings.push(
      `${count} buttonholes over ${plural(rowsTotal, terms.row, terms.rows)} leaves only ${plural(spacingRows, terms.row, terms.rows)} between them; use fewer buttons or a longer band (minimum ${plural(minSpacing, terms.row, terms.rows)} apart).`,
    );
  }

  return {
    buttonCount: count,
    rows,
    bandRows: rowsTotal,
    spacingRows,
    instruction: `Work ${plural(count, "buttonhole")} on ${terms.rows} ${rows.join(", ")} of the band — the first ${plural(first, terms.row, terms.rows)} above the lower edge, the last ${plural(rowsTotal - last, terms.row, terms.rows)} below the top edge, spaced about ${plural(spacingRows, terms.row, terms.rows)} apart.`,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Running stitch-count invariant                                              */
/* -------------------------------------------------------------------------- */

export interface RowDelta {
  readonly row: number;
  readonly delta: number;
  readonly note?: string;
}

/**
 * Replay a piece's row-by-row stitch changes and report the running count.
 *
 * This is the assertion that separates a pattern engine from a string
 * templater. The old engine computed shoulder and neck stitches from the
 * CAST-ON count (76) and then consumed them at a row where only 58 stitches
 * were live, so 21 + 34 + 21 did not equal 58 and the pattern was unknittable.
 * Any construction that runs its rows through this cannot make that mistake.
 */
export function runningStitchCounts(castOn: number, deltas: readonly RowDelta[]): {
  readonly counts: readonly { row: number; stitches: number; delta: number; note?: string }[];
  readonly finalStitches: number;
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  let stitches = castOn;
  const counts: { row: number; stitches: number; delta: number; note?: string }[] = [];
  const errors: string[] = [];
  for (const d of deltas) {
    stitches += d.delta;
    if (stitches < 0) {
      errors.push(`Row ${d.row} takes the stitch count below zero (${stitches}). The shaping removes more stitches than are on the needle.`);
      stitches = 0;
    }
    counts.push({ row: d.row, stitches, delta: d.delta, note: d.note });
  }
  return { counts, finalStitches: stitches, valid: errors.length === 0, errors };
}

/** Assert that a set of parts sums to the live stitch count at that row. */
export function checkPartition(
  liveStitches: number,
  parts: readonly { name: string; stitches: number }[],
): { ok: boolean; total: number; message: string } {
  const total = parts.reduce((sum, p) => sum + p.stitches, 0);
  const ok = total === liveStitches;
  const breakdown = parts.map((p) => `${p.name} ${p.stitches}`).join(" + ");
  return {
    ok,
    total,
    message: ok
      ? `${breakdown} = ${total} sts, matching the ${liveStitches} sts on the needle.`
      : `${breakdown} = ${total} sts, but there are ${liveStitches} sts on the needle (out by ${roundTo(total - liveStitches, 0)}).`,
  };
}
