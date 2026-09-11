import { stitchesPerInch, type Fabric } from "./fabric";

/**
 * Floss estimation, derived from geometry rather than a lookup table.
 *
 * A full cross is two diagonals of the stitch square, plus a short travel on
 * the back. For a stitch of side `s`:
 *
 *     two diagonals   = 2 x sqrt(2) x s   = 2.83 s
 *     back travel     ~ 1 x s
 *     thread per cross ~ 3.83 s           (call it 3.85)
 *
 * The stitch side is 25.4 / stitchesPerInch mm, so finer fabric uses less
 * thread per stitch — which is why the same design costs less floss on 18-count
 * than on 11-count.
 *
 * WASTE_FACTOR covers what geometry cannot: the tail left when starting and
 * ending, thread stripped and discarded, unpicking, and the last few
 * centimetres of a length being too short to use. 1.5 is deliberately
 * generous; running out of a dye lot partway through is far worse than buying
 * one skein too many.
 */

/** Thread consumed per full cross, as a multiple of the stitch side. */
export const THREAD_PER_CROSS = 3.85;

export const WASTE_FACTOR = 1.5;

/** A DMC-style skein: 8 metres of six-strand floss. */
export const SKEIN_METRES = 8;
export const STRANDS_PER_SKEIN = 6;

/** Millimetres of working thread (already at `strands` thickness) per stitch. */
export function threadPerStitchMm(fabric: Fabric): number {
  const sideMm = 25.4 / stitchesPerInch(fabric);
  return THREAD_PER_CROSS * sideMm;
}

export interface FlossEstimate {
  /** Metres of working thread at the chosen strand count. */
  workingMetres: number;
  /** Metres of single strand, which is what a skein is measured in. */
  singleStrandMetres: number;
  skeins: number;
  formula: string;
}

/**
 * Floss needed for one colour, given how many stitches it covers.
 *
 * A skein holds SKEIN_METRES of six-strand floss, so it yields
 * `SKEIN_METRES x 6 / strands` metres of working thread — stitching with two
 * strands gets three times the length that stitching with six would.
 */
export function estimateFloss({
  stitches,
  fabric,
  strands,
  wasteFactor = WASTE_FACTOR,
}: {
  stitches: number;
  fabric: Fabric;
  strands: number;
  wasteFactor?: number;
}): FlossEstimate {
  if (strands < 1 || strands > STRANDS_PER_SKEIN) {
    throw new Error(`strands must be 1-${STRANDS_PER_SKEIN}, got ${strands}`);
  }

  const perStitchMm = threadPerStitchMm(fabric);
  const workingMetres = (Math.max(0, stitches) * perStitchMm * wasteFactor) / 1000;
  const singleStrandMetres = workingMetres * strands;
  const metresPerSkein = (SKEIN_METRES * STRANDS_PER_SKEIN) / strands;

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    workingMetres: round(workingMetres),
    singleStrandMetres: round(singleStrandMetres),
    // Nobody buys a third of a skein.
    skeins: Math.max(1, Math.ceil(workingMetres / metresPerSkein)),
    formula:
      `${stitches} stitches x ${round(perStitchMm)} mm x ${wasteFactor} waste ` +
      `= ${round(workingMetres)} m at ${strands} strands ` +
      `(${round(metresPerSkein)} m per skein)`,
  };
}

/** Stitches one skein covers — the figure stitchers actually quote. */
export function stitchesPerSkein(fabric: Fabric, strands: number, wasteFactor = WASTE_FACTOR): number {
  const metresPerSkein = (SKEIN_METRES * STRANDS_PER_SKEIN) / strands;
  const perStitchM = (threadPerStitchMm(fabric) * wasteFactor) / 1000;
  return Math.floor(metresPerSkein / perStitchM);
}
