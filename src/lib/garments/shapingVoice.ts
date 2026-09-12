/**
 * Shaping wording, per craft AND per how the piece is worked.
 *
 * `KNIT_TERMS` and `CROCHET_TERMS` say "row" because that is the common case.
 * A piece worked in the round has rounds, and a schedule that tells a knitter
 * to "increase every other row" while they are working a tube is the kind of
 * small wrongness that makes a whole pattern feel machine-written.
 */

import type { ShapingTerms } from "../knit";
import type { GarmentContext } from "./context";
import type { WorkedAs } from "./types";

export function termsFor(ctx: GarmentContext, worked: WorkedAs): ShapingTerms {
  const base = ctx.voice.terms;
  if (worked !== "round") return base;
  return { ...base, row: "round", rows: "rounds" };
}

/** Shaping-function options carrying the right craft and round/row wording. */
export function shapingOptions(ctx: GarmentContext, worked: WorkedAs): { terms: ShapingTerms } {
  return { terms: termsFor(ctx, worked) };
}

/**
 * Terms whose "row" unit is a STITCH.
 *
 * `distributeButtonholes` spaces holes along the length of a band. On a band
 * picked up along a front edge and worked outwards, that length runs along the
 * picked-up STITCHES, not up the band's few rows — so the same solver is used
 * with the unit renamed rather than a second, subtly different solver written.
 */
export function stitchwiseTerms(ctx: GarmentContext): ShapingTerms {
  const base = ctx.voice.terms;
  return { ...base, row: "stitch", rows: "stitches" };
}
