/**
 * Gauge: the conversion between centimetres of fabric and stitches/rows.
 *
 * Everything in a knitting pattern is this one multiplication. The old engine
 * had two hardcoded gauges (one per craft) and one of them,
 * `stitchesPerInch: 76 / 21`, was back-solved from a chart width so that a
 * Large back panel would come out at exactly 76 stitches. The user's own gauge
 * was never an input to anything.
 *
 * Canonical form (CYC convention): stitches and rows per 10 cm. CYC states its
 * gauge ranges over 4 in; 4 in is 10.16 cm, and the 1.6% difference is well
 * inside swatch measurement error, so the two are treated as the same number —
 * as every published pattern does.
 */

import { clamp, cmToIn, inToCm, roundTo, roundToEven, roundToMultiple } from "./units";

export interface Gauge {
  /** Stitches over 10 cm of width. */
  readonly stitchesPer10cm: number;
  /** Rows (flat) or rounds (in the round) over 10 cm of height. */
  readonly rowsPer10cm: number;
  /** The stitch pattern the swatch was worked in, e.g. "stockinette". */
  readonly measuredOver?: string;
  /** Gauge must be measured after blocking; an unblocked gauge is a guess. */
  readonly blocked?: boolean;
  /** Flat and in-the-round gauge differ measurably in the same yarn. */
  readonly inTheRound?: boolean;
}

/** Alias, because `src/types/index.ts` already exports an unrelated `Gauge`. */
export type KnitGauge = Gauge;

export function makeGauge(
  stitchesPer10cm: number,
  rowsPer10cm: number,
  options: Omit<Gauge, "stitchesPer10cm" | "rowsPer10cm"> = {},
): Gauge {
  if (!(stitchesPer10cm > 0) || !(rowsPer10cm > 0)) {
    throw new RangeError("Gauge must have positive stitch and row counts per 10 cm.");
  }
  return { stitchesPer10cm, rowsPer10cm, blocked: true, inTheRound: false, ...options };
}

/** Build a gauge from the US "N sts and M rows to 4 inches" statement. */
export function gaugeFromPerInch(
  stitchesPerInch: number,
  rowsPerInch: number,
  options: Omit<Gauge, "stitchesPer10cm" | "rowsPer10cm"> = {},
): Gauge {
  return makeGauge(stitchesPerInch * cmToIn(10), rowsPerInch * cmToIn(10), options);
}

/**
 * Build a gauge from a real swatch: "I got 23 stitches across 11 cm and
 * 31 rows over 10.5 cm". This is the honest input — asking the knitter to
 * pre-divide is where arithmetic errors enter.
 */
export function gaugeFromSwatch(
  stitches: number,
  overWidthCm: number,
  rows: number,
  overHeightCm: number,
  options: Omit<Gauge, "stitchesPer10cm" | "rowsPer10cm"> = {},
): Gauge {
  return makeGauge((stitches / overWidthCm) * 10, (rows / overHeightCm) * 10, options);
}

export function stitchesPerCm(gauge: Gauge): number {
  return gauge.stitchesPer10cm / 10;
}

export function rowsPerCm(gauge: Gauge): number {
  return gauge.rowsPer10cm / 10;
}

export interface GaugeInInches {
  readonly stitchesPer4in: number;
  readonly rowsPer4in: number;
  readonly stitchesPerInch: number;
  readonly rowsPerInch: number;
}

export function gaugeInInches(gauge: Gauge): GaugeInInches {
  const stitchesPerInch = gauge.stitchesPer10cm / 10 / cmToIn(1);
  const rowsPerInch = gauge.rowsPer10cm / 10 / cmToIn(1);
  return {
    stitchesPer4in: roundTo(stitchesPerInch * 4, 2),
    rowsPer4in: roundTo(rowsPerInch * 4, 2),
    stitchesPerInch: roundTo(stitchesPerInch, 3),
    rowsPerInch: roundTo(rowsPerInch, 3),
  };
}

/** The pattern's gauge statement, in the form CYC requires. */
export function describeGauge(gauge: Gauge): string {
  const inches = gaugeInInches(gauge);
  const unit = gauge.inTheRound ? "rounds" : "rows";
  const over = gauge.measuredOver ? ` in ${gauge.measuredOver}` : "";
  const blocked = gauge.blocked === false ? " (unblocked — re-measure after blocking)" : ", after blocking";
  return `${roundTo(gauge.stitchesPer10cm, 1)} sts and ${roundTo(gauge.rowsPer10cm, 1)} ${unit} = 10 cm / 4 in (${roundTo(inches.stitchesPer4in, 1)} sts and ${roundTo(inches.rowsPer4in, 1)} ${unit} over 4 in)${over}${blocked}.`;
}

/* -------------------------------------------------------------------------- */
/* Core conversions                                                            */
/* -------------------------------------------------------------------------- */

/** Stitches needed to make `widthCm` of fabric. */
export function stitchesFor(widthCm: number, gauge: Gauge): number {
  return Math.round(widthCm * stitchesPerCm(gauge));
}

/** Rows needed to make `heightCm` of fabric. */
export function rowsFor(heightCm: number, gauge: Gauge): number {
  return Math.round(heightCm * rowsPerCm(gauge));
}

/**
 * The width a given stitch count actually produces — the inverse of
 * `stitchesFor`. Deliberately unrounded: this feeds schematics and yarn areas,
 * and rounding here would let error accumulate across a dozen pieces.
 */
export function widthCmFor(stitches: number, gauge: Gauge): number {
  return stitches / stitchesPerCm(gauge);
}

/** The height a given row count actually produces — the inverse of `rowsFor`. */
export function heightCmFor(rows: number, gauge: Gauge): number {
  return rows / rowsPerCm(gauge);
}

export function widthInFor(stitches: number, gauge: Gauge): number {
  return roundTo(cmToIn(widthCmFor(stitches, gauge)), 2);
}

/* -------------------------------------------------------------------------- */
/* Stitch-pattern repeats                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A stitch pattern's repeat, written the way patterns write it:
 * "multiple of 4 sts + 2" is `{ multiple: 4, plus: 2 }`.
 */
export interface StitchRepeat {
  readonly multiple: number;
  readonly plus: number;
}

export const NO_REPEAT: StitchRepeat = { multiple: 1, plus: 0 };

export function parseRepeat(text: string): StitchRepeat | null {
  const m = /multiple\s+of\s+(\d+)(?:\s*(?:sts?|stitches)?)?(?:\s*(?:\+|plus)\s*(\d+))?/i.exec(text);
  if (!m) return null;
  return { multiple: Number(m[1]), plus: m[2] ? Number(m[2]) : 0 };
}

export function describeRepeat(repeat: StitchRepeat): string {
  if (repeat.multiple <= 1 && repeat.plus === 0) return "any number of sts";
  return repeat.plus > 0 ? `multiple of ${repeat.multiple} sts + ${repeat.plus}` : `multiple of ${repeat.multiple} sts`;
}

export interface SnapOptions {
  readonly repeat?: StitchRepeat;
  /** Selvedge/seam stitches per edge, worked outside the repeat. 1 for a seamed flat piece. */
  readonly selvedge?: number;
  /** In the round there are no selvedges and no "+ n" edge stitches. */
  readonly inTheRound?: boolean;
  /** Force an even total, for pieces shaped symmetrically at both ends. */
  readonly even?: boolean;
  readonly minimum?: number;
  /** How far the repeat may distort the piece before we complain. */
  readonly toleranceCm?: number;
}

export interface SnapResult {
  /** The count to cast on. */
  readonly stitches: number;
  /** What the raw gauge maths asked for, before snapping. */
  readonly requested: number;
  readonly delta: number;
  /** How much width the snap added or removed, in cm. */
  readonly distortionCm: number;
  readonly withinTolerance: boolean;
  readonly warnings: readonly string[];
}

/** The tolerance at which a repeat has distorted the piece enough to matter. */
export const DEFAULT_SNAP_TOLERANCE_CM = 2;

/**
 * Snap a raw stitch count to one the stitch pattern can actually be worked over.
 *
 *   flat:          n = multiple x round((N - plus - 2xselvedge) / multiple) + plus + 2xselvedge
 *   in the round:  n = multiple x round(N / multiple)          (no plus, no selvedge)
 *
 * The "+ n" edge stitches and the selvedges exist once per piece, not once per
 * repeat, which is why they come out of the count before rounding and go back
 * in after. In the round the pattern closes on itself, so the "+ n" balancing
 * stitches are dropped entirely — a very common pattern-writing error.
 */
export function snapToRepeat(count: number, gauge: Gauge, options: SnapOptions = {}): SnapResult {
  const repeat = options.repeat ?? NO_REPEAT;
  const inTheRound = options.inTheRound ?? gauge.inTheRound ?? false;
  const selvedge = inTheRound ? 0 : options.selvedge ?? 0;
  const plus = inTheRound ? 0 : repeat.plus;
  const tolerance = options.toleranceCm ?? DEFAULT_SNAP_TOLERANCE_CM;
  const warnings: string[] = [];

  const multiple = Math.max(1, Math.round(repeat.multiple));
  const fixed = plus + 2 * selvedge;
  let repeats = Math.round((count - fixed) / multiple);
  if (repeats < 1) {
    repeats = 1;
    warnings.push(
      `${count} sts is narrower than one full repeat of ${describeRepeat(repeat)}; the piece has been widened to a single repeat.`,
    );
  }
  let snapped = multiple * repeats + fixed;

  if (options.even && snapped % 2 !== 0) {
    // Widen by one whole repeat rather than one stitch: adding a lone stitch
    // would break the repeat we just snapped to.
    const evenByRepeat = multiple % 2 === 0 ? null : snapped + multiple;
    if (evenByRepeat !== null && evenByRepeat % 2 === 0) {
      snapped = evenByRepeat;
    } else {
      snapped = roundToEven(snapped);
      warnings.push("An even stitch count was required for symmetric shaping, so the repeat does not divide the piece exactly.");
    }
  }

  if (options.minimum !== undefined && snapped < options.minimum) {
    const needed = Math.ceil((options.minimum - fixed) / multiple);
    snapped = multiple * Math.max(1, needed) + fixed;
  }

  const distortionCm = roundTo(widthCmFor(snapped, gauge) - widthCmFor(count, gauge), 3);
  const withinTolerance = Math.abs(distortionCm) <= tolerance;
  if (!withinTolerance) {
    warnings.push(
      `Snapping to ${describeRepeat(repeat)} changed the width by ${roundTo(distortionCm, 1)} cm (tolerance ${tolerance} cm). Offer the next size, or a repeat that divides this width more closely.`,
    );
  }

  return { stitches: snapped, requested: count, delta: snapped - count, distortionCm, withinTolerance, warnings };
}

/** `stitchesFor` followed by `snapToRepeat` — the call a construction actually makes. */
export function stitchesForWidth(widthCm: number, gauge: Gauge, options: SnapOptions = {}): SnapResult {
  return snapToRepeat(stitchesFor(widthCm, gauge), gauge, options);
}

/**
 * Rows to a target height, optionally landing on a whole vertical repeat and/or
 * on a wrong-side row (so the next section starts on a right-side row).
 */
export function rowsForHeight(
  heightCm: number,
  gauge: Gauge,
  options: { rowRepeat?: number; endOnWrongSide?: boolean; minimum?: number } = {},
): number {
  let rows = rowsFor(heightCm, gauge);
  if (options.rowRepeat && options.rowRepeat > 1) rows = roundToMultiple(rows, options.rowRepeat);
  if (options.endOnWrongSide && rows % 2 !== 0) rows += 1;
  if (options.minimum !== undefined) rows = Math.max(options.minimum, rows);
  return Math.max(1, rows);
}

/* -------------------------------------------------------------------------- */
/* CYC yarn weight system                                                      */
/* -------------------------------------------------------------------------- */

export type CycWeight = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface YarnWeightSpec {
  readonly cyc: CycWeight;
  readonly name: string;
  readonly alsoKnownAs: readonly string[];
  /** Wraps per inch — how to identify an unlabelled or handspun yarn. */
  readonly wpi: readonly [number, number];
  /** Knit stockinette gauge range, stitches per 10 cm. */
  readonly knitGaugePer10cm: readonly [number, number];
  readonly knitNeedleMm: readonly [number, number];
  readonly knitNeedleUs: string;
  /**
   * Crochet gauge range in single crochet, stitches per 10 cm — except CYC
   * category 0, which CYC states in double crochet.
   */
  readonly crochetGaugePer10cm: readonly [number, number];
  readonly crochetHookMm: readonly [number, number];
  readonly crochetHookUs: string;
  /** A representative ball, used only as a default when no yarn is chosen. */
  readonly typicalBall: { readonly metres: number; readonly grams: number };
}

/**
 * CYC Standard Yarn Weight System (craftyarncouncil.com/standards/yarn-weight-system).
 * Gauge ranges are CYC's, stated over 4 in and used here as per 10 cm.
 * `typicalBall` is not CYC — it is a representative commercial put-up per
 * category, used only to give a skein count before the knitter picks a yarn.
 */
export const YARN_WEIGHTS: readonly YarnWeightSpec[] = [
  {
    cyc: 0, name: "Lace", alsoKnownAs: ["fingering", "10-count crochet thread"],
    wpi: [30, 40], knitGaugePer10cm: [33, 40], knitNeedleMm: [1.5, 2.25], knitNeedleUs: "000-1",
    crochetGaugePer10cm: [32, 42], crochetHookMm: [1.4, 2.25], crochetHookUs: "steel 6,7,8 or B-1",
    typicalBall: { metres: 800, grams: 100 },
  },
  {
    cyc: 1, name: "Super Fine", alsoKnownAs: ["sock", "fingering", "baby"],
    wpi: [14, 30], knitGaugePer10cm: [27, 32], knitNeedleMm: [2.25, 3.25], knitNeedleUs: "1-3",
    crochetGaugePer10cm: [21, 32], crochetHookMm: [2.25, 3.5], crochetHookUs: "B-1 to E-4",
    typicalBall: { metres: 400, grams: 100 },
  },
  {
    cyc: 2, name: "Fine", alsoKnownAs: ["sport", "baby"],
    wpi: [12, 18], knitGaugePer10cm: [23, 26], knitNeedleMm: [3.25, 3.75], knitNeedleUs: "3-5",
    crochetGaugePer10cm: [16, 20], crochetHookMm: [3.5, 4.5], crochetHookUs: "E-4 to 7",
    typicalBall: { metres: 250, grams: 100 },
  },
  {
    cyc: 3, name: "Light", alsoKnownAs: ["DK", "light worsted"],
    wpi: [11, 15], knitGaugePer10cm: [21, 24], knitNeedleMm: [3.75, 4.5], knitNeedleUs: "5-7",
    crochetGaugePer10cm: [12, 17], crochetHookMm: [4.5, 5.5], crochetHookUs: "7 to I-9",
    typicalBall: { metres: 230, grams: 100 },
  },
  {
    cyc: 4, name: "Medium", alsoKnownAs: ["worsted", "afghan", "aran"],
    wpi: [9, 12], knitGaugePer10cm: [16, 20], knitNeedleMm: [4.5, 5.5], knitNeedleUs: "7-9",
    crochetGaugePer10cm: [11, 14], crochetHookMm: [5.5, 6.5], crochetHookUs: "I-9 to K-10.5",
    typicalBall: { metres: 200, grams: 100 },
  },
  {
    cyc: 5, name: "Bulky", alsoKnownAs: ["chunky", "craft", "rug"],
    wpi: [6, 9], knitGaugePer10cm: [12, 15], knitNeedleMm: [5.5, 8], knitNeedleUs: "9-11",
    crochetGaugePer10cm: [8, 11], crochetHookMm: [6.5, 9], crochetHookUs: "K-10.5 to M-13",
    typicalBall: { metres: 120, grams: 100 },
  },
  {
    cyc: 6, name: "Super Bulky", alsoKnownAs: ["super chunky", "roving"],
    wpi: [5, 6], knitGaugePer10cm: [7, 11], knitNeedleMm: [8, 12.75], knitNeedleUs: "11-17",
    crochetGaugePer10cm: [7, 9], crochetHookMm: [9, 15], crochetHookUs: "M-13 to Q",
    typicalBall: { metres: 60, grams: 100 },
  },
  {
    cyc: 7, name: "Jumbo", alsoKnownAs: ["roving", "arm knitting"],
    wpi: [1, 5], knitGaugePer10cm: [1, 6], knitNeedleMm: [12.75, 25], knitNeedleUs: "17 and larger",
    crochetGaugePer10cm: [1, 6], crochetHookMm: [15, 25], crochetHookUs: "Q and larger",
    typicalBall: { metres: 30, grams: 100 },
  },
];

export function yarnWeight(cyc: CycWeight): YarnWeightSpec {
  return YARN_WEIGHTS[cyc];
}

export type Craft = "knitting" | "crochet";

/** Which CYC category a measured gauge belongs to. Returns null if it fits none. */
export function yarnWeightForGauge(stitchesPer10cm: number, craft: Craft = "knitting"): YarnWeightSpec | null {
  for (const spec of YARN_WEIGHTS) {
    const [lo, hi] = craft === "crochet" ? spec.crochetGaugePer10cm : spec.knitGaugePer10cm;
    if (stitchesPer10cm >= lo && stitchesPer10cm <= hi) return spec;
  }
  return null;
}

/** Mid-range gauge for a CYC weight — the starting guess before the knitter swatches. */
export function typicalGaugeFor(cyc: CycWeight, craft: Craft = "knitting"): Gauge {
  const spec = YARN_WEIGHTS[cyc];
  const [lo, hi] = craft === "crochet" ? spec.crochetGaugePer10cm : spec.knitGaugePer10cm;
  const stitches = (lo + hi) / 2;
  // Row gauge is not published by CYC. In stockinette the row:stitch ratio runs
  // about 1.33:1 across weights (e.g. worsted 20 sts / 26 rows); single crochet
  // is close to square at about 1.1:1 because an sc is nearly as tall as it is
  // wide. Both are starting points only — the knitter's swatch replaces them.
  const rows = craft === "crochet" ? stitches * 1.1 : stitches * 1.33;
  return makeGauge(roundTo(stitches, 1), roundTo(rows, 1), {
    measuredOver: craft === "crochet" ? "single crochet" : "stockinette",
    blocked: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Needle and hook sizes                                                       */
/* -------------------------------------------------------------------------- */

export interface NeedleSize {
  readonly mm: number;
  readonly us: string | null;
  readonly uk: string | null;
}

/** Metric -> US -> UK/Canadian knitting needle equivalents. */
export const NEEDLE_SIZES: readonly NeedleSize[] = [
  { mm: 2, us: "0", uk: "14" },
  { mm: 2.25, us: "1", uk: "13" },
  { mm: 2.5, us: "1.5", uk: null },
  { mm: 2.75, us: "2", uk: "12" },
  { mm: 3, us: null, uk: "11" },
  { mm: 3.25, us: "3", uk: "10" },
  { mm: 3.5, us: "4", uk: null },
  { mm: 3.75, us: "5", uk: "9" },
  { mm: 4, us: "6", uk: "8" },
  { mm: 4.5, us: "7", uk: "7" },
  { mm: 5, us: "8", uk: "6" },
  { mm: 5.5, us: "9", uk: "5" },
  { mm: 6, us: "10", uk: "4" },
  { mm: 6.5, us: "10.5", uk: "3" },
  { mm: 7, us: null, uk: "2" },
  { mm: 7.5, us: null, uk: "1" },
  { mm: 8, us: "11", uk: "0" },
  { mm: 9, us: "13", uk: "00" },
  { mm: 10, us: "15", uk: "000" },
  { mm: 12, us: "17", uk: null },
  { mm: 12.75, us: "17", uk: null },
  { mm: 15, us: "19", uk: null },
  { mm: 19, us: "35", uk: null },
  { mm: 20, us: "36", uk: null },
  { mm: 25, us: "50", uk: null },
];

export interface HookSize {
  readonly mm: number;
  readonly us: string;
}

/** Metric -> US crochet hook equivalents (aluminium/plastic, not steel). */
export const HOOK_SIZES: readonly HookSize[] = [
  { mm: 2.25, us: "B/1" },
  { mm: 2.75, us: "C/2" },
  { mm: 3.125, us: "D" },
  { mm: 3.25, us: "D/3" },
  { mm: 3.5, us: "E/4" },
  { mm: 3.75, us: "F/5" },
  { mm: 4, us: "G/6" },
  { mm: 4.25, us: "G" },
  { mm: 4.5, us: "7" },
  { mm: 5, us: "H/8" },
  { mm: 5.5, us: "I/9" },
  { mm: 6, us: "J/10" },
  { mm: 6.5, us: "K/10.5" },
  { mm: 8, us: "L/11" },
  { mm: 9, us: "M-N/13" },
  { mm: 10, us: "N-P/15" },
  { mm: 11.5, us: "P/16" },
  { mm: 15, us: "P-Q" },
  { mm: 16, us: "Q" },
  { mm: 19, us: "S" },
];

/** Steel hooks for thread crochet: US size -> mm. */
export const STEEL_HOOK_SIZES: readonly HookSize[] = [
  { mm: 0.75, us: "14" },
  { mm: 1, us: "12" },
  { mm: 1.3, us: "10" },
  { mm: 1.5, us: "8" },
  { mm: 1.65, us: "7" },
  { mm: 1.8, us: "6" },
  { mm: 1.9, us: "5" },
  { mm: 2, us: "4" },
  { mm: 2.2, us: "2" },
  { mm: 3.25, us: "0" },
];

export function needleForMm(mm: number): NeedleSize | null {
  return NEEDLE_SIZES.find((n) => Math.abs(n.mm - mm) < 0.01) ?? null;
}

export function hookForMm(mm: number): HookSize | null {
  return HOOK_SIZES.find((h) => Math.abs(h.mm - mm) < 0.01) ?? null;
}

/** Nearest real needle to an arbitrary mm value. */
export function nearestNeedle(mm: number): NeedleSize {
  return NEEDLE_SIZES.reduce((best, n) => (Math.abs(n.mm - mm) < Math.abs(best.mm - mm) ? n : best));
}

export function nearestHook(mm: number): HookSize {
  return HOOK_SIZES.reduce((best, h) => (Math.abs(h.mm - mm) < Math.abs(best.mm - mm) ? h : best));
}

/**
 * Suggested main needle/hook for a CYC weight: the middle of the published
 * range. Ribbing is conventionally worked 0.5-1 mm smaller so it pulls in;
 * `ribNeedleMm` returns that.
 */
export function suggestedNeedleMm(cyc: CycWeight, craft: Craft = "knitting"): number {
  const spec = YARN_WEIGHTS[cyc];
  const [lo, hi] = craft === "crochet" ? spec.crochetHookMm : spec.knitNeedleMm;
  const mid = (lo + hi) / 2;
  return craft === "crochet" ? nearestHook(mid).mm : nearestNeedle(mid).mm;
}

export function ribNeedleMm(mainMm: number): number {
  const target = mainMm - (mainMm >= 6 ? 1 : 0.5);
  return nearestNeedle(clamp(target, NEEDLE_SIZES[0].mm, mainMm)).mm;
}

/** Describe a needle the way a pattern's materials list does. */
export function describeNeedle(mm: number): string {
  const needle = needleForMm(mm) ?? nearestNeedle(mm);
  const us = needle.us ? ` / US ${needle.us}` : "";
  const uk = needle.uk ? ` / UK ${needle.uk}` : "";
  return `${needle.mm} mm${us}${uk}`;
}

/** Round trip helper for tests and for UI that offers inches. */
export function gaugeFromPer4in(stitchesPer4in: number, rowsPer4in: number, options: Omit<Gauge, "stitchesPer10cm" | "rowsPer10cm"> = {}): Gauge {
  return makeGauge((stitchesPer4in / inToCm(4)) * 10, (rowsPer4in / inToCm(4)) * 10, options);
}
