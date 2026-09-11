/**
 * Finished measurements for a torso garment.
 *
 * Every number a sweater, cardigan or vest construction uses is resolved here,
 * ONCE, from the body table plus ease. Nothing downstream reads `ctx.body`
 * directly for a circumference, because `finished = body + ease` is the
 * equation the old engine did not have (`const cardiganEase = ... ? 0 : 0`) and
 * having it in two places is how it comes back.
 *
 * SOURCES
 *  - Ease bands and the +4 cm armhole ease: Craft Yarn Council fit classes, and
 *    Sister Mountain, "How to Design and Grade a Knitted Set-In Sleeve"
 *    (sistermountain.com/blog/design-knit-set-in-sleeve) — initial underarm
 *    bind-off 1.5-2.5 cm, armhole depth = body depth + ease, sleeve cap
 *    7.5-10 cm shorter than the armhole.
 *  - Drop shoulder: top arm circumference = 2 x armhole depth, and the armhole
 *    itself is unshaped (Interweave, "Determining Sleeve Length for Drop
 *    Shoulder Designs"; knittinginspaceships.wordpress.com/2019/07/24).
 *  - Neckline: a crew neck opening is 18-23 cm wide and 7.5-12.5 cm deep, and
 *    "neck width + front depth >= 25.5 cm" is the classic over-the-head check
 *    (Sister Mountain, "How to Design Sweater Necklines"; The Knitwit, "Neck
 *    Size and Design for Garments").
 */

import {
  type AppliedEase,
  type FitPreference,
  type GarmentCategory,
  CARDIGAN_BAND_ALLOWANCE_CM,
  DEFAULT_FIT,
  applyEase,
  checkNeckOpening,
  clamp,
  minimumNeckOpeningCm,
  roundTo,
} from "../knit";
import { ribDepthCm } from "./catalog";
import type { GarmentContext } from "./context";
import type { ConstructionMethod, GarmentKind } from "./types";

export interface TorsoFit {
  readonly category: GarmentCategory;
  readonly fit: FitPreference;
  readonly ease: AppliedEase;

  /** Finished chest circumference, buttoned for a cardigan. */
  readonly chestCm: number;
  /** Finished upper arm circumference. */
  readonly upperArmCm: number;
  /** Finished cuff circumference, above the ribbing. */
  readonly cuffCm: number;
  /** Underarm to shoulder, with ease. Drop shoulder takes this from the sleeve. */
  readonly armholeDepthCm: number;
  /** Nape to hem. */
  readonly bodyLengthCm: number;
  readonly lengthToUnderarmCm: number;
  /** Underarm to cuff, already shortened by the shoulder drop where relevant. */
  readonly sleeveLengthCm: number;
  /** Shoulder point to shoulder point across the upper back, with ease. */
  readonly upperBackCm: number;
  /** One shoulder seam. */
  readonly shoulderWidthCm: number;

  readonly neckWidthCm: number;
  readonly frontNeckDepthCm: number;
  readonly backNeckDepthCm: number;
  /** Circumference of the finished neck opening, measured round the edge. */
  readonly neckOpeningCm: number;
  /** True when the neck can only clear the head with a fastening at one shoulder. */
  readonly needsShoulderOpening: boolean;
  readonly neckNote: string;

  readonly hemDepthCm: number;
  readonly cuffDepthCm: number;
  readonly neckBandDepthCm: number;
  /** Stitches bound off straight at each underarm, in cm. */
  readonly underarmCm: number;

  readonly warnings: readonly string[];
}

export function categoryFor(kind: GarmentKind, method: ConstructionMethod): GarmentCategory {
  if (kind === "vest" || kind === "tankTop") return "vest";
  if (kind === "cardigan") return "cardigan";
  return method === "dropShoulder" ? "dropShoulder" : "pullover";
}

/**
 * Perimeter of the neck opening, treated as an ellipse `width` across and
 * `frontDepth + backDepth` deep (Ramanujan's approximation).
 *
 * This is the number that has to clear the head. The audit found a 16-inch
 * neckband on an adult sweater; measuring the opening as an ellipse rather than
 * calling the neck width "the neckband" is what stops that.
 */
export function neckOpeningPerimeterCm(widthCm: number, depthCm: number): number {
  const a = Math.max(0.1, widthCm) / 2;
  const b = Math.max(0.1, depthCm) / 2;
  return roundTo(Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))), 2);
}

interface NeckSolution {
  widthCm: number;
  frontDepthCm: number;
  backDepthCm: number;
  openingCm: number;
  needsShoulderOpening: boolean;
  note: string;
}

/**
 * Make the neck opening clear the head.
 *
 * The order of the fixes is the order a designer uses them: deepen the front
 * neck first (a scoop is always acceptable), then widen towards a boat neck as
 * far as the shoulders allow, and only then add a fastening at one shoulder.
 * Babies genuinely need all three — a newborn's head is 38 cm against a 40.5 cm
 * chest, so a crew neck cut to the back-neck width cannot go on.
 */
function solveNeck(input: {
  headCm: number;
  widthCm: number;
  frontDepthCm: number;
  backDepthCm: number;
  maxWidthCm: number;
  maxFrontDepthCm: number;
  hasFrontOpening: boolean;
  ribbed: boolean;
}): NeckSolution {
  let width = input.widthCm;
  let front = input.frontDepthCm;
  const back = input.backDepthCm;
  const opening = () => neckOpeningPerimeterCm(width, front + back);

  if (input.hasFrontOpening) {
    // A cardigan's neck does not have to pass over the head at all.
    return {
      widthCm: roundTo(width, 1),
      frontDepthCm: roundTo(front, 1),
      backDepthCm: roundTo(back, 1),
      openingCm: opening(),
      needsShoulderOpening: false,
      note: "The front opening means the neckline does not have to stretch over the head, so it is cut to the shoulder line.",
    };
  }

  const minimum = minimumNeckOpeningCm(input.headCm, { ribbed: input.ribbed });
  let deepened = false;
  let widened = false;

  while (opening() < minimum && front < input.maxFrontDepthCm) {
    front = Math.min(input.maxFrontDepthCm, front + 0.5);
    deepened = true;
  }
  while (opening() < minimum && width < input.maxWidthCm) {
    width = Math.min(input.maxWidthCm, width + 0.5);
    widened = true;
  }

  const check = checkNeckOpening(opening(), input.headCm, { ribbed: input.ribbed });
  const fixes: string[] = [];
  if (deepened) fixes.push("the front neck was dropped");
  if (widened) fixes.push("the neck was widened towards the shoulders");

  return {
    widthCm: roundTo(width, 1),
    frontDepthCm: roundTo(front, 1),
    backDepthCm: roundTo(back, 1),
    openingCm: opening(),
    needsShoulderOpening: !check.ok,
    note: check.ok
      ? `${check.message}${fixes.length ? ` To get there, ${fixes.join(" and ")}.` : ""}`
      : `${check.message} The left shoulder seam is therefore worked with a button placket, which is how the opening is made big enough without cutting the neck past the shoulder points.`,
  };
}

export function torsoFit(ctx: GarmentContext, kind: GarmentKind, method: ConstructionMethod): TorsoFit {
  const body = ctx.body;
  const category = categoryFor(kind, method);
  const fit = ctx.fit ?? DEFAULT_FIT[category];
  const ease = applyEase(body, category, fit);
  const warnings: string[] = [...ease.warnings];

  const isCardigan = kind === "cardigan";
  const isVest = kind === "vest" || kind === "tankTop";

  const chestCm = roundTo(ease.finishedCm, 1);
  const upperArmCm = roundTo(ease.upperArmFinishedCm, 1);

  // Armhole depth. A set-in armhole is the measured depth plus about a fifth
  // again; a vest is cut 2.5 cm deeper because there is no sleeve to fill it;
  // a drop shoulder's depth is fixed by the sleeve, not the body — top arm
  // circumference is exactly twice the armhole depth.
  const setInDepth = body.armholeDepth + clamp(body.armholeDepth * 0.2, 1.5, 5);
  const armholeDepthCm = roundTo(
    method === "dropShoulder" ? upperArmCm / 2 : isVest ? setInDepth + body.armholeDepth * 0.13 : setInDepth,
    1,
  );

  const upperBackCm = roundTo(body.crossBack + clamp(body.crossBack * 0.03, 0.5, 1.5), 1);
  const bodyLengthCm = roundTo(ctx.options.targetHeightCm ?? body.totalLength, 1);
  const lengthToUnderarmCm = roundTo(Math.max(bodyLengthCm * 0.35, bodyLengthCm - armholeDepthCm), 1);

  // A drop shoulder puts part of the sleeve on the shoulder, so the sleeve is
  // shortened by the distance the shoulder seam has travelled down the arm.
  const shoulderDropCm = method === "dropShoulder" ? Math.max(0, (chestCm / 2 - upperBackCm) / 2) : 0;
  const sleeveFactor = ctx.options.sleeve?.lengthFactor ?? 1;
  const sleeveLengthCm = roundTo(Math.max(4, body.sleeveLengthToUnderarm * sleeveFactor - shoulderDropCm), 1);
  const cuffCm = roundTo(body.wrist + clamp(body.wrist * 0.25, 2, 6), 1);

  const hemDepthCm = ribDepthCm(ctx.scale, "hem");
  const cuffDepthCm = ribDepthCm(ctx.scale, "cuff");
  const neckBandDepthCm = ribDepthCm(ctx.scale, "neck");

  // Underarm: the straight bind-off at the base of the armhole. 1.5-2.5 cm,
  // narrower on small sizes.
  const underarmCm = roundTo(clamp(chestCm * 0.02, 1, 2.5), 1);

  const shoulderStartCm = (upperBackCm - (body.backNeckWidth + clamp(body.backNeckWidth * 0.3, 1.5, 5))) / 2;
  const neck = solveNeck({
    headCm: body.headCircumference,
    widthCm: body.backNeckWidth + clamp(body.backNeckWidth * 0.3, 1.5, 5),
    frontDepthCm: clamp(armholeDepthCm * 0.4, 3, 10),
    backDepthCm: roundTo(clamp(armholeDepthCm * 0.12, 1, 2.5), 1),
    maxWidthCm: Math.max(
      body.backNeckWidth,
      upperBackCm - 2 * Math.max(2.5, shoulderStartCm * 0.45),
    ),
    maxFrontDepthCm: armholeDepthCm * 0.6,
    hasFrontOpening: isCardigan,
    // Both crafts finish the neck in their own stretchy edge fabric — 2x2 rib
    // in knitting, back-loop or post ribbing in crochet — so both get the
    // ribbed allowance. A garter or plain bound-off edge would not.
    ribbed: true,
  });

  const shoulderWidthCm = roundTo((upperBackCm - neck.widthCm) / 2, 2);
  if (shoulderWidthCm < 2) {
    warnings.push(
      `The shoulder works out at only ${shoulderWidthCm} cm once the neck is cut wide enough to clear the head. Check the size: this is a very small garment for this head measurement.`,
    );
  }
  if (isCardigan && chestCm <= CARDIGAN_BAND_ALLOWANCE_CM * 2) {
    warnings.push("The finished chest is too small to carry front bands; pick a larger size.");
  }

  return {
    category,
    fit,
    ease,
    chestCm,
    upperArmCm,
    cuffCm,
    armholeDepthCm,
    bodyLengthCm,
    lengthToUnderarmCm,
    sleeveLengthCm,
    upperBackCm,
    shoulderWidthCm,
    neckWidthCm: neck.widthCm,
    frontNeckDepthCm: neck.frontDepthCm,
    backNeckDepthCm: neck.backDepthCm,
    neckOpeningCm: neck.openingCm,
    needsShoulderOpening: neck.needsShoulderOpening,
    neckNote: neck.note,
    hemDepthCm,
    cuffDepthCm,
    neckBandDepthCm,
    underarmCm,
    warnings,
  };
}
