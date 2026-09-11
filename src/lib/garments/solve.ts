/**
 * Adaptive shaping solvers.
 *
 * `src/lib/knit/shaping` solves a schedule and REPORTS whether it fits. That is
 * the right contract for the primitive, but a construction cannot ship a
 * schedule that does not fit — the audit's "92 rows of increases inside a
 * 79-row sleeve" is exactly that failure reaching a knitter.
 *
 * So every construction in this folder goes through the wrappers here, which
 * take the same decisions a designer takes at the same moment:
 *
 *   - a bind-off curve that is too tall for its armhole gets MORE stitches in
 *     its first bind-off and fewer steps, which is the standard fix and the one
 *     `bindOffCurve`'s own warning recommends;
 *   - a taper that needs more shaping rows than the piece has gets worked on
 *     every row instead of every other row, and if even that is not enough the
 *     NARROW end is moved (a wider cuff), because a stated wider cuff is a
 *     design decision while an impossible schedule is a bug.
 *
 * Each wrapper returns a schedule that fits, plus the numbers it had to move so
 * the caller can put them in the pattern rather than hide them.
 */

import {
  type BindOffCurve,
  type BindOffOptions,
  type DistributeOptions,
  type ShapingSchedule,
  bindOffCurve,
  distributeShaping,
  plural,
} from "../knit";

/**
 * How much of the curve goes into the first bind-off, in escalation order.
 * 0.5 is the traditional quarter-circle; 1.0 is a single straight bind-off,
 * which always fits in two rows and is what a very coarse row gauge forces.
 */
const INITIAL_FRACTIONS = [0.5, 0.6, 0.7, 0.8, 1];

export type FitCurveOptions = Omit<BindOffOptions, "initialFraction" | "availableRows">;

/**
 * A stepped bind-off that is guaranteed to fit in `availableRows`.
 *
 * Callers must allocate at least 2 rows whenever `stitches > 0`; a single
 * straight bind-off at each of two edges cannot be worked in fewer.
 */
export function fitBindOffCurve(
  stitches: number,
  availableRows: number,
  options: FitCurveOptions = {},
): BindOffCurve {
  if (stitches <= 0) return bindOffCurve(0, options);
  let fallback: BindOffCurve | null = null;
  for (const initialFraction of INITIAL_FRACTIONS) {
    const curve = bindOffCurve(stitches, { ...options, initialFraction, availableRows });
    if (curve.warnings.length === 0) return curve;
    if (!fallback || curve.rowsUsed < fallback.rowsUsed) fallback = curve;
  }
  return fallback!;
}

/** The rows a curve will consume, so a caller can budget before committing. */
export function curveRowsFor(stitches: number, availableRows: number, options: FitCurveOptions = {}): number {
  return fitBindOffCurve(stitches, availableRows, options).rowsUsed;
}

export interface FittedTaper {
  readonly schedule: ShapingSchedule;
  /** The count the taper starts from — moved only if nothing else would fit. */
  readonly fromStitches: number;
  /** The count the taper actually reaches. Exact: from + 2 x events. */
  readonly toStitches: number;
  /** Stitches changed per shaping row. Always 2 — one at each end. */
  readonly stitchesPerShapingRow: 2;
  /** Set when the wrapper had to move a number to make the shaping possible. */
  readonly adjustment?: string;
}

/**
 * A taper (a sleeve, a leg warmer, a tapered band) that is guaranteed to fit.
 *
 * The returned `toStitches` is exact — `from + 2 x scheduledCount` — because
 * the builder applies the schedule's own event count. An odd difference is
 * absorbed here rather than left to drift between the prose and the ledger.
 */
export function fitTaper(
  fromStitches: number,
  toStitches: number,
  availableRows: number,
  options: DistributeOptions = {},
): FittedTaper {
  const from = Math.max(0, Math.round(fromStitches));
  const target = Math.max(0, Math.round(toStitches));
  const rows = Math.max(0, Math.round(availableRows));
  const direction = target >= from ? 1 : -1;
  let events = Math.round(Math.abs(target - from) / 2);
  let adjustment: string | undefined;

  // Shaping at both ends of a flat row is worked on right-side rows only, so
  // half the rows are usable. In the round every round is usable.
  const alternateSlots = Math.floor(rows / 2);
  let everyOtherRow = true;
  if (events > alternateSlots) {
    everyOtherRow = false;
    adjustment = `Shaping falls on every ${options.terms?.row ?? "row"} rather than every other one: the taper needs more shaping ${options.terms?.rows ?? "rows"} than alternate ${options.terms?.rows ?? "rows"} provide.`;
  }
  if (events > rows) {
    const reachable = from + direction * 2 * rows;
    adjustment = `The taper was cut from ${plural(Math.abs(target - from), "stitch", "stitches")} to ${plural(Math.abs(reachable - from), "stitch", "stitches")}: ${plural(rows, "row")} cannot carry more shaping than one change per row. Lengthen the piece, or start from ${plural(reachable, "stitch", "stitches")}.`;
    events = rows;
  }

  const schedule = distributeShaping(events, rows, { ...options, everyOtherRow });
  return {
    schedule,
    fromStitches: from,
    toStitches: from + direction * 2 * schedule.scheduledCount,
    stitchesPerShapingRow: 2,
    adjustment,
  };
}

export interface FittedDistribution {
  readonly schedule: ShapingSchedule;
  /** Events actually scheduled. Equals the request unless it could not fit. */
  readonly events: number;
  readonly adjustment?: string;
}

/**
 * `count` shaping rows spread over `availableRows`, guaranteed to fit.
 *
 * Used where the change per event is not 2 — a hat crown taking 8 stitches out
 * of a round, a gusset taking 2 out of a sock.
 */
export function fitDistribute(
  count: number,
  availableRows: number,
  options: DistributeOptions = {},
): FittedDistribution {
  const rows = Math.max(0, Math.round(availableRows));
  let events = Math.max(0, Math.round(count));
  let adjustment: string | undefined;
  let everyOtherRow = options.everyOtherRow ?? false;

  if (everyOtherRow && events > Math.floor(rows / 2)) {
    everyOtherRow = false;
  }
  if (events > rows) {
    adjustment = `Only ${plural(rows, "shaping row")} fit where ${events} were wanted; the shaping was reduced to what the fabric can carry.`;
    events = rows;
  }

  return {
    schedule: distributeShaping(events, rows, { ...options, everyOtherRow }),
    events,
    adjustment,
  };
}

/**
 * Split a row budget between a fixed set of claims and the plain fabric that
 * fills what is left. Never returns a negative filler.
 */
export function fillerRows(budget: number, ...claims: number[]): number {
  return Math.max(0, Math.round(budget) - claims.reduce((sum, c) => sum + Math.max(0, Math.round(c)), 0));
}
