/**
 * Body measurement tables.
 *
 * THESE ARE BODY MEASUREMENTS, NEVER FINISHED GARMENT MEASUREMENTS.
 * Finished = body + ease (see `ease.ts`). The previous engine used the CYC
 * *body* chest ranges directly as finished chest, which produced garments with
 * zero ease that do not close over the wearer.
 *
 * Source: Craft Yarn Council "Standards & Guidelines for Crochet and Knitting"
 * (craftyarncouncil.com/standards) — women's body measurement chart, child and
 * baby chest/back-waist chart, head circumference chart, and foot chart.
 * CYC publishes in inches; the inch values are converted once, here, and the
 * centimetre value is what the engine computes with.
 *
 * Fields CYC does not publish are marked DRAFTING CONVENTION below and come
 * from standard bodice/glove drafting practice. They are conservative and are
 * only ever used as a starting point that a construction may override with a
 * user-supplied measurement.
 */

import { cmToIn, roundTo } from "./units";

export type AdultSize = "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL";

export type ChildSize = "0-3m" | "3-6m" | "6-12m" | "1-2yr" | "2-4yr" | "4-6yr";

export type SizeKey = AdultSize | ChildSize;

export const ADULT_SIZES: readonly AdultSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

export const CHILD_SIZES: readonly ChildSize[] = ["0-3m", "3-6m", "6-12m", "1-2yr", "2-4yr", "4-6yr"];

export const ALL_SIZES: readonly SizeKey[] = [...CHILD_SIZES, ...ADULT_SIZES];

/**
 * Every dimension a garment construction can need, in centimetres.
 * `shoulderWidth` is derived (see `SHOULDER_WIDTH` note) rather than stored,
 * so it can never contradict `crossBack` and `backNeckWidth`.
 */
export interface BodyMeasurementsCm {
  /** Full chest/bust circumference. The size's headline number. */
  readonly chest: number;
  readonly waist: number;
  readonly hip: number;
  /** Nape of neck to natural waist, down the centre back. CYC. */
  readonly backWaistLength: number;
  /** Shoulder point to shoulder point across the back. CYC. */
  readonly crossBack: number;
  /** Width of the back neck opening at the base of the neck. */
  readonly backNeckWidth: number;
  /** (crossBack - backNeckWidth) / 2 — one shoulder seam. */
  readonly shoulderWidth: number;
  /** Underarm to wrist, arm slightly bent. CYC "sleeve length to underarm". */
  readonly sleeveLengthToUnderarm: number;
  /** Widest part of the upper arm (bicep). CYC. */
  readonly upperArm: number;
  readonly wrist: number;
  /** Underarm to shoulder, vertically. CYC. Drives armhole depth, NOT a % of body length. */
  readonly armholeDepth: number;
  /** Base-of-neck circumference. Drafting convention, not CYC. */
  readonly neckCircumference: number;
  /** CYC head circumference chart. The only input a hat needs. */
  readonly headCircumference: number;
  /** Heel to longest toe. CYC foot chart. */
  readonly footLength: number;
  /** Around the ball of the foot. CYC foot chart. */
  readonly footCircumference: number;
  /** Around the palm excluding the thumb. Drafting convention, not CYC. */
  readonly handCircumference: number;
  /** Nape to hem for a standard hip-length sweater = backWaistLength + waist-to-hip. */
  readonly totalLength: number;
}

export type BodyMeasurementsIn = { readonly [K in keyof BodyMeasurementsCm]: number };

/** The stored table: everything except the derived `shoulderWidth`. */
type StoredBody = Omit<BodyMeasurementsCm, "shoulderWidth">;

/**
 * ADULT TABLE — CYC women's body measurements.
 *
 * chest/waist/hip/backWaistLength/crossBack/sleeveLengthToUnderarm/upperArm/
 * armholeDepth are CYC. CYC gives chest as a range (e.g. M = 36-38 in); we take
 * the UPPER value of the range as the size's nominal body chest, which is the
 * convention CYC itself recommends for drafting. XL/2XL/3XL are CYC's 1X/2X/3X.
 *
 * DRAFTING CONVENTION (not CYC): backNeckWidth, neckCircumference,
 * handCircumference, wrist, totalLength. Back neck sits at 13-16 cm across the
 * whole adult range — it is an absolute dimension, it does not scale with the
 * chest, which is exactly the mistake the old "back neck = 44% of back width"
 * formula made.
 *
 * headCircumference: CYC gives a single adult band (woman 53-58.5 cm, man
 * 56-61 cm) rather than a per-chest-size value, because head size correlates
 * only weakly with chest. The values below walk that band so a hat drafted from
 * a garment size is at least plausible; any hat construction should prefer a
 * measured head circumference when the user supplies one.
 *
 * footLength/footCircumference: CYC's foot chart is keyed by shoe size, not by
 * chest. These walk the women's shoe range (20.25-28 cm foot length) for the
 * same reason. Socks should be drafted from a measured foot where possible.
 */
const ADULT_BODY: Record<AdultSize, StoredBody> = {
  XS: {
    chest: 76, waist: 61, hip: 86,
    backWaistLength: 42, crossBack: 37, backNeckWidth: 13,
    sleeveLengthToUnderarm: 42, upperArm: 25, wrist: 15,
    armholeDepth: 16.5, neckCircumference: 32, headCircumference: 54,
    footLength: 22, footCircumference: 20.5, handCircumference: 17,
    totalLength: 58,
  },
  S: {
    chest: 86, waist: 67.5, hip: 91.5,
    backWaistLength: 43, crossBack: 38, backNeckWidth: 13.5,
    sleeveLengthToUnderarm: 43, upperArm: 26, wrist: 15.5,
    armholeDepth: 17.5, neckCircumference: 33, headCircumference: 55,
    footLength: 23.5, footCircumference: 21.5, handCircumference: 18,
    totalLength: 59.5,
  },
  M: {
    chest: 96.5, waist: 76, hip: 101.5,
    backWaistLength: 43.5, crossBack: 40.5, backNeckWidth: 14,
    sleeveLengthToUnderarm: 43, upperArm: 28, wrist: 16,
    armholeDepth: 19, neckCircumference: 34.5, headCircumference: 56,
    footLength: 24.5, footCircumference: 22.5, handCircumference: 19,
    totalLength: 61,
  },
  L: {
    chest: 106.5, waist: 86.5, hip: 111.5,
    backWaistLength: 44.5, crossBack: 43, backNeckWidth: 14.5,
    sleeveLengthToUnderarm: 44.5, upperArm: 30.5, wrist: 17,
    armholeDepth: 20.5, neckCircumference: 36, headCircumference: 56.5,
    footLength: 25.5, footCircumference: 23, handCircumference: 20,
    totalLength: 63,
  },
  XL: {
    chest: 117, waist: 96.5, hip: 122,
    backWaistLength: 45, crossBack: 44.5, backNeckWidth: 15,
    sleeveLengthToUnderarm: 44.5, upperArm: 34.5, wrist: 18,
    armholeDepth: 21.5, neckCircumference: 37.5, headCircumference: 57,
    footLength: 26.5, footCircumference: 24, handCircumference: 21.5,
    totalLength: 64.5,
  },
  "2XL": {
    chest: 127, waist: 106.5, hip: 134.5,
    backWaistLength: 45.5, crossBack: 45.5, backNeckWidth: 15.5,
    sleeveLengthToUnderarm: 45.5, upperArm: 39.5, wrist: 19,
    armholeDepth: 23, neckCircumference: 39, headCircumference: 58,
    footLength: 27.5, footCircumference: 25, handCircumference: 23,
    totalLength: 66,
  },
  // CYC repeats the 2X cross-back (45.5 cm) at 3X, so the shoulder width is
  // flat between those two sizes; the growth from 2X to 3X is all in the
  // chest, upper arm and armhole depth. That is the published table, not a typo.
  "3XL": {
    chest: 137, waist: 114, hip: 139.5,
    backWaistLength: 45.5, crossBack: 45.5, backNeckWidth: 15.5,
    sleeveLengthToUnderarm: 45.5, upperArm: 43, wrist: 20,
    armholeDepth: 24, neckCircumference: 40.5, headCircumference: 58.5,
    footLength: 28.5, footCircumference: 26, handCircumference: 24,
    totalLength: 67,
  },
};

/**
 * CHILD AND BABY TABLE.
 *
 * This is the fix for the single worst sizing bug in the old app: every child,
 * baby and "One Size" selection fell through `normalizeSize()` to "L" and was
 * drafted as a 107 cm (42 in) adult. A 0-3 month cardigan came out with a
 * 42-inch bust.
 *
 * chest and backWaistLength are CYC (baby chart: 3mo 40.5, 6mo 43, 12mo 45.5,
 * 18mo 48, 24mo 51 cm; child chart: 2y 53, 4y 58.5, 6y 63.5 cm, with back waist
 * lengths 2y 21.5, 4y 24, 6y 26.5 cm). A label like "2-4yr" takes the TOP of
 * its range, because children grow into garments and a pattern drafted to the
 * bottom of the range is outgrown before it is finished.
 *
 * headCircumference sits inside CYC's published bands (baby 35.5-40.5,
 * toddler 40.5-46, child 45.5-51 cm) and footLength inside CYC's child foot
 * chart (6-18mo 7.75-11.5, 2-3y 12-15.25, 4-5y 16.5-19 cm).
 *
 * DRAFTING CONVENTION: waist, hip, crossBack, backNeckWidth, upperArm, wrist,
 * armholeDepth, neckCircumference, handCircumference, sleeve and total length.
 * Note the hip is set close to the chest and above the waist for the three
 * baby sizes — babies have no waist, and a nappy adds 2-4 cm at the hip.
 */
const CHILD_BODY: Record<ChildSize, StoredBody> = {
  "0-3m": {
    chest: 40.5, waist: 42, hip: 44,
    backWaistLength: 15.5, crossBack: 17.5, backNeckWidth: 9,
    sleeveLengthToUnderarm: 13, upperArm: 13, wrist: 10,
    armholeDepth: 8.5, neckCircumference: 25, headCircumference: 38,
    footLength: 9, footCircumference: 11, handCircumference: 10,
    totalLength: 26,
  },
  "3-6m": {
    chest: 43, waist: 44, hip: 46,
    backWaistLength: 17, crossBack: 19, backNeckWidth: 9.5,
    sleeveLengthToUnderarm: 15, upperArm: 14, wrist: 11,
    armholeDepth: 9.5, neckCircumference: 26, headCircumference: 41,
    footLength: 10, footCircumference: 11.5, handCircumference: 11,
    totalLength: 28,
  },
  "6-12m": {
    chest: 45.5, waist: 46, hip: 48,
    backWaistLength: 18.5, crossBack: 20.5, backNeckWidth: 10,
    sleeveLengthToUnderarm: 17, upperArm: 15, wrist: 11.5,
    armholeDepth: 10, neckCircumference: 27, headCircumference: 45,
    footLength: 11.5, footCircumference: 12, handCircumference: 12,
    totalLength: 31,
  },
  "1-2yr": {
    chest: 53, waist: 51, hip: 55,
    backWaistLength: 21.5, crossBack: 22.5, backNeckWidth: 10.5,
    sleeveLengthToUnderarm: 21, upperArm: 16.5, wrist: 12.5,
    armholeDepth: 11.5, neckCircumference: 28, headCircumference: 47,
    footLength: 13.5, footCircumference: 14, handCircumference: 13,
    totalLength: 35,
  },
  "2-4yr": {
    chest: 58.5, waist: 53, hip: 58,
    backWaistLength: 24, crossBack: 24.5, backNeckWidth: 11,
    sleeveLengthToUnderarm: 25, upperArm: 18, wrist: 13.5,
    armholeDepth: 12.5, neckCircumference: 29, headCircumference: 49,
    footLength: 15.5, footCircumference: 15.5, handCircumference: 14.5,
    totalLength: 40,
  },
  "4-6yr": {
    chest: 63.5, waist: 56, hip: 63,
    backWaistLength: 26.5, crossBack: 26.5, backNeckWidth: 11.5,
    sleeveLengthToUnderarm: 29, upperArm: 19.5, wrist: 14.5,
    armholeDepth: 13.5, neckCircumference: 30, headCircumference: 51,
    footLength: 18, footCircumference: 16.5, handCircumference: 15.5,
    totalLength: 45,
  },
};

/**
 * One shoulder = half of what is left of the cross-back once the back neck is
 * taken out. Deriving it means shoulder + neck + shoulder always reconstructs
 * the cross-back exactly, which is the invariant the old engine broke when it
 * set shoulder = 28% of the cast-on and neck = the remainder of a *different*
 * stitch count (21 + 34 + 21 = 76 against 58 live stitches).
 */
function withShoulder(stored: StoredBody): BodyMeasurementsCm {
  return { ...stored, shoulderWidth: roundTo((stored.crossBack - stored.backNeckWidth) / 2, 2) };
}

const BODY_TABLE: Record<SizeKey, BodyMeasurementsCm> = (() => {
  const out = {} as Record<SizeKey, BodyMeasurementsCm>;
  for (const size of ADULT_SIZES) out[size] = withShoulder(ADULT_BODY[size]);
  for (const size of CHILD_SIZES) out[size] = withShoulder(CHILD_BODY[size]);
  return out;
})();

/** Body measurements in centimetres. Total over `SizeKey`, so it cannot miss. */
export function getBodyMeasurements(size: SizeKey): BodyMeasurementsCm {
  return BODY_TABLE[size];
}

/** The same measurements in inches, rounded to 2dp for display. */
export function getBodyMeasurementsIn(size: SizeKey): BodyMeasurementsIn {
  const cm = BODY_TABLE[size];
  const out = {} as Record<keyof BodyMeasurementsCm, number>;
  for (const key of Object.keys(cm) as (keyof BodyMeasurementsCm)[]) {
    out[key] = roundTo(cmToIn(cm[key]), 2);
  }
  return out as BodyMeasurementsIn;
}

export function isAdultSize(size: SizeKey): size is AdultSize {
  return (ADULT_SIZES as readonly string[]).includes(size);
}

export function isChildSize(size: SizeKey): size is ChildSize {
  return (CHILD_SIZES as readonly string[]).includes(size);
}

/** 0-3m / 3-6m / 6-12m — the sizes that need a nappy allowance and a wide neck. */
export function isBabySize(size: SizeKey): boolean {
  return size === "0-3m" || size === "3-6m" || size === "6-12m";
}

export function isSizeKey(value: string): value is SizeKey {
  return (ALL_SIZES as readonly string[]).includes(value);
}

/**
 * Aliases accepted from stored patterns, LLM output and free-text UI.
 * Deliberately conservative: anything not listed resolves to `null`.
 */
const SIZE_ALIASES: Record<string, SizeKey> = {
  "xxs": "XS",
  "extra small": "XS",
  "x-small": "XS",
  "small": "S",
  "medium": "M",
  "large": "L",
  "x-large": "XL",
  "extra large": "XL",
  "1x": "XL",
  "xxl": "2XL",
  "2x": "2XL",
  "xxxl": "3XL",
  "3x": "3XL",
  "newborn": "0-3m",
  "nb": "0-3m",
  "0-3 months": "0-3m",
  "3-6 months": "3-6m",
  "6-12 months": "6-12m",
  "1-2 years": "1-2yr",
  "2-4 years": "2-4yr",
  "4-6 years": "4-6yr",
  "12-18m": "1-2yr",
  "18-24m": "1-2yr",
};

/**
 * Resolve a free-text size to a table key, or `null` if there isn't one.
 *
 * Returning `null` is the entire point. The old `normalizeSize()` returned "L"
 * for anything it did not recognise, so "0-3m", "One Size" and a typo all
 * silently drafted an adult Large. Callers must handle `null` — by asking the
 * user, or by using `sizeForChest()` with a measured chest — never by guessing.
 */
export function resolveSize(raw: string | null | undefined): SizeKey | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isSizeKey(trimmed)) return trimmed;
  const upper = trimmed.toUpperCase();
  if (isSizeKey(upper)) return upper;
  // Normalise en/em dashes and stray whitespace: an en-dashed "0 - 3 m",
  // "0_3m" and "0 - 3 m" are all the same size key once flattened.
  const lower = trimmed.toLowerCase();
  const dashed = lower.replace(/[\u2010-\u2015\u2212_]/g, "-").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
  const compact = dashed.replace(/\s+/g, "");
  if (isSizeKey(compact)) return compact;
  return SIZE_ALIASES[lower] ?? SIZE_ALIASES[dashed] ?? SIZE_ALIASES[compact] ?? null;
}

/**
 * "One Size" is not a body size. Hats, cowls, scarves and blankets are drafted
 * from a target dimension, not from a chest measurement, so a caller that sees
 * this must route to a dimension-driven construction rather than a size table.
 */
export const ONE_SIZE = "One Size" as const;

export function isOneSize(raw: string | null | undefined): boolean {
  return typeof raw === "string" && raw.trim().toLowerCase().replace(/\s+/g, " ") === "one size";
}

/**
 * Closest table size for a measured chest circumference, for users who measure
 * rather than pick. Adults only by default: a 63 cm chest is a 6-year-old, not
 * an adult XS, and picking the wrong branch of the table is worse than asking.
 */
export function sizeForChest(chestCm: number, options: { includeChildren?: boolean } = {}): SizeKey {
  const pool = options.includeChildren ? ALL_SIZES : ADULT_SIZES;
  let best: SizeKey = pool[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const size of pool) {
    const delta = Math.abs(BODY_TABLE[size].chest - chestCm);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = size;
    }
  }
  return best;
}

/** Human label for a size, e.g. "2XL (adult)" / "2-4yr (child)". */
export function sizeLabel(size: SizeKey): string {
  return `${size} (${isChildSize(size) ? (isBabySize(size) ? "baby" : "child") : "adult"})`;
}
