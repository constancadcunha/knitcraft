/**
 * Unit conversion and rounding primitives shared by the whole knit engine.
 *
 * Centimetres are the single source of truth everywhere in `src/lib/knit`.
 * Inches are a presentation concern: every table is stored in cm and converted
 * on the way out. The old engine mixed the two (CYC inch tables read as cm-ish
 * "profiles") which is one of the reasons its numbers never reconciled.
 */

export const CM_PER_INCH = 2.54;

/** Metres per yard, for the yardage estimator's US-facing output. */
export const METRES_PER_YARD = 0.9144;

export function cmToIn(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function metresToYards(metres: number): number {
  return metres / METRES_PER_YARD;
}

export function yardsToMetres(yards: number): number {
  return yards * METRES_PER_YARD;
}

/** Round to `dp` decimal places. Used for display values, never for counts. */
export function roundTo(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/**
 * Round to the nearest even number. Symmetric shaping (a decrease at each end
 * of a row, a piece split down the centre) requires an even stitch count, so
 * body panels and sleeves are always snapped even.
 */
export function roundToEven(n: number): number {
  return 2 * Math.round(n / 2);
}

/**
 * Round to the nearest odd number. Needed for centred motifs and for mitten
 * thumb gussets, which grow symmetrically around one centre stitch.
 */
export function roundToOdd(n: number): number {
  const even = roundToEven(n);
  if (even === n) return n % 2 === 1 ? n : n + 1;
  return 2 * Math.floor(n / 2) + 1;
}

/** Round to the nearest multiple of `multiple` (>= 1). */
export function roundToMultiple(n: number, multiple: number): number {
  if (multiple <= 0) return Math.round(n);
  return multiple * Math.round(n / multiple);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** "1 stitch" / "2 stitches" — the old generator emitted "1 stitches". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 22 -> "22nd". */
export function ordinal(n: number): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
