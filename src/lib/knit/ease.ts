/**
 * Ease: the difference between the body and the garment.
 *
 *     finished measurement = body measurement + ease
 *
 * Ease is the single most important number in a garment pattern and the old
 * engine did not have it. Its entire ease system was the dead ternary
 * `const cardiganEase = garment === "Cardigan" ? 0 : 0`, so every garment came
 * out exactly the size of the wearer's body — unwearable at any gauge.
 *
 * Fit classes follow the Craft Yarn Council's five bands (very close 0 cm,
 * close +2.5 to +5, standard +5 to +10, loose +10 to +15, oversized +15 and up,
 * measured at the chest). The per-category tables below place each fit
 * preference inside those bands for the garment in question.
 */

import type { BodyMeasurementsCm } from "./sizes";
import { roundTo } from "./units";

export type FitPreference = "negative" | "zero" | "classic" | "relaxed" | "oversized";

export const FIT_PREFERENCES: readonly FitPreference[] = [
  "negative",
  "zero",
  "classic",
  "relaxed",
  "oversized",
];

export type GarmentCategory =
  | "pullover"
  | "cardigan"
  | "vest"
  | "dropShoulder"
  | "hat"
  | "sock"
  | "mitten"
  | "cowl"
  | "scarf"
  | "shawl"
  | "blanket";

/**
 * Ease is expressed one of two ways:
 *  - `absolute`: cm added to the body measurement. Right for torsos, where the
 *    amount of room a body needs does not scale with its size.
 *  - `proportional`: finished = body x factor. Right for hats, socks and
 *    mittens, whose negative ease IS a percentage — a 10% squeeze on a 38 cm
 *    baby head and on a 58 cm adult head are different absolute numbers but the
 *    same fit.
 */
export type EaseAmount =
  | { readonly mode: "absolute"; readonly cm: number }
  | { readonly mode: "proportional"; readonly factor: number };

export const absoluteEase = (cm: number): EaseAmount => ({ mode: "absolute", cm });
export const proportionalEase = (factor: number): EaseAmount => ({ mode: "proportional", factor });

export interface EaseSpec {
  /** Ease at the category's primary circumference (see CATEGORY_PRIMARY_MEASURE). */
  readonly primary: EaseAmount;
  /** Ease at the upper arm, for categories with sleeves. */
  readonly upperArm: EaseAmount;
  /** Ease at the hip, for categories with a hem below the waist. */
  readonly hip: EaseAmount;
  readonly label: string;
  readonly note: string;
}

/**
 * Which body measurement each category's headline ease applies to. A hat has no
 * chest; drafting one from a chest measurement (as the old engine did, via a
 * shared "bust" field on every garment) is meaningless.
 */
export const CATEGORY_PRIMARY_MEASURE: Record<GarmentCategory, keyof BodyMeasurementsCm | null> = {
  pullover: "chest",
  cardigan: "chest",
  vest: "chest",
  dropShoulder: "chest",
  hat: "headCircumference",
  sock: "footCircumference",
  mitten: "handCircumference",
  cowl: null,
  scarf: null,
  shawl: null,
  blanket: null,
};

const NO_BODY_EASE: EaseSpec = {
  primary: absoluteEase(0),
  upperArm: absoluteEase(0),
  hip: absoluteEase(0),
  label: "n/a",
  note: "Drafted from target finished dimensions, not from a body measurement.",
};

const noBodyEaseRow = (): Record<FitPreference, EaseSpec> => ({
  negative: NO_BODY_EASE,
  zero: NO_BODY_EASE,
  classic: NO_BODY_EASE,
  relaxed: NO_BODY_EASE,
  oversized: NO_BODY_EASE,
});

/**
 * EASE TABLE, in centimetres at the chest (or as a factor for the
 * circumference-fit categories).
 *
 * Torso figures follow CYC's fit classes and standard designer practice:
 * fitted sweater +5, classic pullover +10, drop-shoulder/boxy +15 to +25,
 * cardigan +5 to +10 (the button band overlap is NOT part of this — see
 * CARDIGAN_BAND_ALLOWANCE_CM), vest +5 to +7.5.
 *
 * Upper-arm ease is +5 to +10 cm over the bicep for a set-in sleeve; below
 * about +4 cm the sleeve binds when the arm bends, which is why
 * `checkEase()` warns about it.
 *
 * Hats/socks/mittens are negative-ease garments THROUGHOUT: the fabric must
 * stretch to grip. So even the "relaxed" row sits at or below body size, and
 * "oversized" means a slouch or a boot sock rather than positive room. Use
 * DEFAULT_FIT unless the user has asked for something specific.
 */
export const EASE_TABLE: Record<GarmentCategory, Record<FitPreference, EaseSpec>> = {
  pullover: {
    negative: { primary: absoluteEase(-5), upperArm: absoluteEase(0), hip: absoluteEase(-2.5), label: "Negative ease", note: "Body-skimming; needs a stretchy fabric (rib, fine gauge)." },
    zero: { primary: absoluteEase(0), upperArm: absoluteEase(2.5), hip: absoluteEase(0), label: "Zero ease", note: "Finished chest equals body chest. Close, non-restrictive only in stretchy fabric." },
    classic: { primary: absoluteEase(10), upperArm: absoluteEase(7.5), hip: absoluteEase(10), label: "Classic fit", note: "CYC 'standard' fit. The safe default for a first sweater." },
    relaxed: { primary: absoluteEase(15), upperArm: absoluteEase(10), hip: absoluteEase(15), label: "Relaxed fit", note: "CYC 'loose'. Room for a layer underneath." },
    oversized: { primary: absoluteEase(20), upperArm: absoluteEase(14), hip: absoluteEase(20), label: "Oversized", note: "Deliberately slouchy. Check the shoulder does not fall past the arm." },
  },
  cardigan: {
    negative: { primary: absoluteEase(-2.5), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Negative ease", note: "Fitted cardigan; expect the fronts to pull at the bust." },
    zero: { primary: absoluteEase(0), upperArm: absoluteEase(2.5), hip: absoluteEase(2.5), label: "Zero ease", note: "Meets edge to edge with no overlap." },
    classic: { primary: absoluteEase(8), upperArm: absoluteEase(7.5), hip: absoluteEase(8), label: "Classic fit", note: "Standard buttoned cardigan. Band overlap is added separately." },
    relaxed: { primary: absoluteEase(13), upperArm: absoluteEase(10), hip: absoluteEase(13), label: "Relaxed fit", note: "Wearable open over a layer." },
    oversized: { primary: absoluteEase(20), upperArm: absoluteEase(14), hip: absoluteEase(20), label: "Oversized", note: "Coatigan proportions." },
  },
  vest: {
    negative: { primary: absoluteEase(-2.5), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Negative ease", note: "Layering vest worn under a jacket." },
    zero: { primary: absoluteEase(0), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Zero ease", note: "Close over a shirt." },
    classic: { primary: absoluteEase(6), upperArm: absoluteEase(0), hip: absoluteEase(6), label: "Classic fit", note: "Sits over a shirt without pulling. Armholes are cut deeper than a sleeved garment." },
    relaxed: { primary: absoluteEase(10), upperArm: absoluteEase(0), hip: absoluteEase(10), label: "Relaxed fit", note: "Slipover worn over a sweater." },
    oversized: { primary: absoluteEase(15), upperArm: absoluteEase(0), hip: absoluteEase(15), label: "Oversized", note: "Tabard proportions." },
  },
  dropShoulder: {
    negative: { primary: absoluteEase(0), upperArm: absoluteEase(2.5), hip: absoluteEase(0), label: "Minimum", note: "A drop shoulder cannot take negative ease: the sleeve head sits on the upper arm." },
    zero: { primary: absoluteEase(5), upperArm: absoluteEase(5), hip: absoluteEase(5), label: "Close boxy", note: "The least ease a drop shoulder can be cut with." },
    classic: { primary: absoluteEase(15), upperArm: absoluteEase(10), hip: absoluteEase(15), label: "Classic boxy", note: "The characteristic drop-shoulder fit; the sleeve top equals twice the armhole depth." },
    relaxed: { primary: absoluteEase(20), upperArm: absoluteEase(13), hip: absoluteEase(20), label: "Relaxed boxy", note: "Sweatshirt proportions." },
    oversized: { primary: absoluteEase(30), upperArm: absoluteEase(18), hip: absoluteEase(30), label: "Oversized", note: "Very deep armhole; sleeves must be shortened to compensate for the shoulder drop." },
  },
  hat: {
    negative: { primary: proportionalEase(0.88), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Snug", note: "12% negative ease. Ribbed brim only; will leave a mark." },
    zero: { primary: proportionalEase(0.92), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Close", note: "8% negative ease. Good for a watch cap in a firm fabric." },
    classic: { primary: proportionalEase(0.95), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Classic beanie", note: "5% negative ease — the standard hat number." },
    relaxed: { primary: proportionalEase(0.98), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Relaxed", note: "Barely negative; only holds if the brim is ribbed." },
    oversized: { primary: proportionalEase(1.06), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Slouch / beret", note: "Positive ease in the body, held on by a smaller ribbed brim." },
  },
  sock: {
    negative: { primary: proportionalEase(0.85), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Firm", note: "15% negative ease. Holds up without elastic; hard on the hands to knit." },
    zero: { primary: proportionalEase(0.88), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Close", note: "12% negative ease." },
    classic: { primary: proportionalEase(0.9), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Classic sock", note: "10% negative ease — the standard sock number." },
    relaxed: { primary: proportionalEase(0.95), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Relaxed", note: "5% negative; bed socks and boot socks." },
    oversized: { primary: proportionalEase(1.0), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "House sock", note: "Zero ease. Will slide down in a shoe." },
  },
  mitten: {
    negative: { primary: proportionalEase(0.9), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Firm", note: "10% negative ease." },
    zero: { primary: proportionalEase(0.92), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Close", note: "8% negative ease." },
    classic: { primary: proportionalEase(0.94), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Classic mitten", note: "6% negative ease — the standard mitten number." },
    relaxed: { primary: proportionalEase(0.97), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Relaxed", note: "Room for a liner." },
    oversized: { primary: proportionalEase(1.02), upperArm: absoluteEase(0), hip: absoluteEase(0), label: "Loose", note: "Positive ease; only for a mitten worn over a glove." },
  },
  cowl: noBodyEaseRow(),
  scarf: noBodyEaseRow(),
  shawl: noBodyEaseRow(),
  blanket: noBodyEaseRow(),
};

/** The fit to use when the user has not chosen one. */
export const DEFAULT_FIT: Record<GarmentCategory, FitPreference> = {
  pullover: "classic",
  cardigan: "classic",
  vest: "classic",
  dropShoulder: "classic",
  hat: "classic",
  sock: "classic",
  mitten: "classic",
  cowl: "classic",
  scarf: "classic",
  shawl: "classic",
  blanket: "classic",
};

/**
 * Button bands add circumference that is NOT ease: two 3 cm bands make the
 * cardigan 3 cm bigger round only where they overlap. The old engine added
 * 1.5 in to EACH front and then added a separate band piece on top, so a
 * declared 42 in cardigan measured 47.5 in. Constructions must add this once,
 * to the buttoned circumference, and never to each front.
 */
export const CARDIGAN_BAND_ALLOWANCE_CM = 3;

export interface FitClass {
  readonly name: string;
  /** Inclusive lower bound in cm; the band runs to the next class's bound. */
  readonly minCm: number;
  readonly description: string;
}

/** CYC's five published fit classes, in centimetres at the chest. */
export const CYC_FIT_CLASSES: readonly FitClass[] = [
  { name: "Very close-fitting", minCm: Number.NEGATIVE_INFINITY, description: "Zero or negative ease; the fabric stretches to fit." },
  { name: "Close-fitting", minCm: 2.5, description: "+2.5 to +5 cm (+1 to +2 in)." },
  { name: "Standard-fitting", minCm: 5, description: "+5 to +10 cm (+2 to +4 in)." },
  { name: "Loose-fitting", minCm: 10, description: "+10 to +15 cm (+4 to +6 in)." },
  { name: "Oversized", minCm: 15, description: "+15 cm (+6 in) and up." },
];

export function fitClassFor(easeCm: number): FitClass {
  let match = CYC_FIT_CLASSES[0];
  for (const cls of CYC_FIT_CLASSES) {
    if (easeCm >= cls.minCm) match = cls;
  }
  return match;
}

/** The ease in cm that `amount` represents for a given body measurement. */
export function easeCm(amount: EaseAmount, bodyCm: number): number {
  return amount.mode === "absolute" ? amount.cm : roundTo(bodyCm * (amount.factor - 1), 3);
}

/** finished = body + ease. The one equation this module exists to enforce. */
export function finishedFromBody(bodyCm: number, amount: EaseAmount): number {
  return roundTo(bodyCm + easeCm(amount, bodyCm), 3);
}

export function getEase(category: GarmentCategory, fit: FitPreference = DEFAULT_FIT[category]): EaseSpec {
  return EASE_TABLE[category][fit];
}

export interface AppliedEase {
  readonly category: GarmentCategory;
  readonly fit: FitPreference;
  /** Which body measurement the primary ease was applied to, if any. */
  readonly primaryMeasure: keyof BodyMeasurementsCm | null;
  readonly bodyCm: number;
  readonly finishedCm: number;
  readonly easeCm: number;
  readonly fitClass: FitClass;
  /** Finished upper arm circumference, for categories with sleeves. */
  readonly upperArmFinishedCm: number;
  readonly upperArmEaseCm: number;
  readonly hipFinishedCm: number;
  readonly hipEaseCm: number;
  readonly label: string;
  readonly note: string;
  readonly warnings: readonly string[];
}

/**
 * Apply a category + fit to a set of body measurements.
 *
 * Everything downstream — cast-on counts, sleeve widths, yarn estimates —
 * must start from the FINISHED numbers this returns, never from the body table.
 */
export function applyEase(
  body: BodyMeasurementsCm,
  category: GarmentCategory,
  fit: FitPreference = DEFAULT_FIT[category],
): AppliedEase {
  const spec = EASE_TABLE[category][fit];
  const measure = CATEGORY_PRIMARY_MEASURE[category];
  const bodyCm = measure ? body[measure] : 0;
  const finishedCm = measure ? finishedFromBody(bodyCm, spec.primary) : 0;
  const ease = measure ? roundTo(finishedCm - bodyCm, 3) : 0;

  const upperArmEase = easeCm(spec.upperArm, body.upperArm);
  const hipEase = easeCm(spec.hip, body.hip);

  const warnings: string[] = [];
  const hasSleeves = category === "pullover" || category === "cardigan" || category === "dropShoulder";
  if (hasSleeves && upperArmEase < 4) {
    // Under about +4 cm the sleeve binds at the bicep when the elbow bends.
    warnings.push(
      `Upper-arm ease of ${roundTo(upperArmEase, 1)} cm is below the +4 cm comfort minimum; the sleeve will bind unless the fabric is very stretchy.`,
    );
  }
  if (measure === "chest" && ease < 0) {
    warnings.push("Negative chest ease relies on the fabric stretching; check the swatch stretches and recovers before committing.");
  }

  return {
    category,
    fit,
    primaryMeasure: measure,
    bodyCm,
    finishedCm,
    easeCm: ease,
    fitClass: fitClassFor(ease),
    upperArmFinishedCm: roundTo(body.upperArm + upperArmEase, 3),
    upperArmEaseCm: upperArmEase,
    hipFinishedCm: roundTo(body.hip + hipEase, 3),
    hipEaseCm: hipEase,
    label: spec.label,
    note: spec.note,
    warnings,
  };
}

/**
 * Minimum finished neck opening.
 *
 * A pullover neckband has to pass over the head. The old engine emitted a 58 st
 * / 40 cm neckband for an adult Large — no adult head fits through 40 cm.
 *
 * A 1x1 or 2x2 ribbed band stretches to roughly 1.25x its relaxed circumference
 * and recovers, so its relaxed opening may be about 80% of the head. Any band
 * that does not stretch (garter, single crochet, a bound-off edge) must be at
 * least head circumference. A garment with a placket, buttons or a zip at the
 * neck is exempt — pass `hasOpening` and the check is skipped.
 */
export function minimumNeckOpeningCm(
  headCircumferenceCm: number,
  options: { ribbed?: boolean; hasOpening?: boolean } = {},
): number {
  if (options.hasOpening) return 0;
  const stretchAllowance = (options.ribbed ?? true) ? 0.8 : 1;
  return roundTo(headCircumferenceCm * stretchAllowance, 2);
}

/** Does this neckline actually pass over the head? */
export function checkNeckOpening(
  finishedOpeningCm: number,
  headCircumferenceCm: number,
  options: { ribbed?: boolean; hasOpening?: boolean } = {},
): { ok: boolean; minimumCm: number; message: string } {
  const minimumCm = minimumNeckOpeningCm(headCircumferenceCm, options);
  const ok = finishedOpeningCm >= minimumCm;
  return {
    ok,
    minimumCm,
    message: ok
      ? `Neck opening ${roundTo(finishedOpeningCm, 1)} cm clears the ${roundTo(minimumCm, 1)} cm minimum for a ${headCircumferenceCm} cm head.`
      : `Neck opening ${roundTo(finishedOpeningCm, 1)} cm is too small: a ${headCircumferenceCm} cm head needs at least ${roundTo(minimumCm, 1)} cm, or a placket/buttons at the neck.`,
  };
}
