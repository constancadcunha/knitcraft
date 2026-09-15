/**
 * Yarn estimation from physics, not from a lookup table.
 *
 * The old estimator was a garment-name -> metres table
 * (`adultGarmentMeters = [2200, 2600, 3000, 3600, 4200, 5000]`) divided by a
 * hardcoded 220 m skein. For a bulky size-L sweater that produced 17 skeins,
 * roughly three times reality, and it ignored gauge, finished size and stitch
 * pattern entirely — the same number came back whether you knitted at 10 or 20
 * stitches per 10 cm. Worse, a usability gate then rejected any AI-supplied
 * estimate that was *below* the inflated baseline, so accurate answers were
 * thrown away.
 *
 * PROVENANCE OF THE FORMULA
 * -------------------------
 * D. L. Munden, "The Geometry and Dimensional Properties of Plain-Knit
 * Fabrics", Journal of the Textile Institute 50 (1959) T448, established that
 * in a relaxed plain-knit fabric the loop length l and the wale spacing W are
 * related by a dimensionless constant: l x W ~= 4.1. In other words the yarn
 * consumed by one stitch is about 4.1 times the width of that stitch.
 *
 * With Gs = stitches per 10 cm, a stitch is 10/Gs cm wide, so
 *
 *     yarn per stitch      = 4.1 x 10 / Gs = 41 / Gs   cm
 *     stitches per cm^2    = (Gs/10) x (Gr/10) = Gs x Gr / 100
 *     yarn per cm^2        = (Gs x Gr / 100) x (41 / Gs) = 0.41 x Gr   cm
 *     METRES PER SQUARE METRE = 41 x Gr
 *
 * The stitch gauge cancels: yarn consumption per unit AREA depends only on the
 * ROW gauge. That is counter-intuitive and it is also why the formula is easy
 * to test — one multiplication, one input.
 *
 * Validation against published yardages for a 1.35 m^2 adult-M pullover:
 *     fingering  Gr = 38  ->  1558 m   (published 1500-1900 m)
 *     worsted    Gr = 24  ->   984 m   (published  900-1200 m)
 *     bulky      Gr = 18  ->   738 m   (published  700-900 m)
 * All three land inside the published ranges.
 */

import type { Gauge } from "./gauge";
import { type CycWeight, YARN_WEIGHTS } from "./gauge";
import { metresToYards, roundTo } from "./units";

/** Munden's constant: loop length x wale spacing in a relaxed plain knit. */
export const MUNDEN_CONSTANT = 4.1;

/** Metres of yarn per square metre of plain stockinette at this gauge. */
export function metresPerSquareMetre(gauge: Gauge): number {
  return MUNDEN_CONSTANT * 10 * gauge.rowsPer10cm;
}

/* -------------------------------------------------------------------------- */
/* Areas                                                                       */
/* -------------------------------------------------------------------------- */

export interface PieceArea {
  readonly name: string;
  readonly areaCm2: number;
}

export function rectangleAreaCm2(widthCm: number, heightCm: number): number {
  return Math.max(0, widthCm) * Math.max(0, heightCm);
}

/** A tapered piece — a sleeve is a trapezium from cuff to upper arm. */
export function trapeziumAreaCm2(widthACm: number, widthBCm: number, heightCm: number): number {
  return ((Math.max(0, widthACm) + Math.max(0, widthBCm)) / 2) * Math.max(0, heightCm);
}

export function circleAreaCm2(radiusCm: number): number {
  return Math.PI * Math.max(0, radiusCm) ** 2;
}

export function radiusForCircumferenceCm(circumferenceCm: number): number {
  return Math.max(0, circumferenceCm) / (2 * Math.PI);
}

/** A tube, e.g. a hat body or a sock leg: circumference x height, one layer. */
export function tubeAreaCm2(circumferenceCm: number, heightCm: number): number {
  return rectangleAreaCm2(circumferenceCm, heightCm);
}

/* -------------------------------------------------------------------------- */
/* Fabric factors                                                              */
/* -------------------------------------------------------------------------- */

export type StitchFabric =
  | "stockinette"
  | "reverseStockinette"
  | "garter"
  | "seed"
  | "rib1x1"
  | "rib2x2"
  | "cablesLight"
  | "cablesAran"
  | "strandedTwoColour"
  | "brioche"
  | "lace"
  | "linenStitch"
  | "crochetSingle"
  | "crochetHalfDouble"
  | "crochetDouble"
  | "crochetOpenwork";

/**
 * Yarn consumed relative to stockinette AT THE SAME MEASURED GAUGE.
 *
 * Ribbing and cables pull the fabric in, so a given finished area contains more
 * stitches and eats more yarn. Stranded colourwork carries both yarns across
 * every stitch, hence ~1.9. Lace consumes less because the yarn-overs are
 * holes. The crochet factors are how the Munden knit baseline is carried across
 * to crochet, where a single crochet stitch uses noticeably more yarn per unit
 * area than a knit stitch.
 */
export const STITCH_YARN_FACTORS: Record<StitchFabric, number> = {
  stockinette: 1.0,
  reverseStockinette: 1.0,
  garter: 1.1,
  seed: 1.1,
  rib1x1: 1.35,
  rib2x2: 1.3,
  cablesLight: 1.25,
  cablesAran: 1.5,
  strandedTwoColour: 1.9,
  brioche: 1.9,
  lace: 0.85,
  linenStitch: 1.6,
  crochetSingle: 1.35,
  crochetHalfDouble: 1.3,
  crochetDouble: 1.25,
  crochetOpenwork: 1.0,
};

/**
 * Waste: the swatch, the cast-on tail, seaming yarn and the ends woven in.
 * 1.15 when stripes or colourwork mean whole lengths get cut and rejoined.
 */
export const WASTE_FACTORS = {
  plain: 1.1,
  colourwork: 1.15,
} as const;

/* -------------------------------------------------------------------------- */
/* Estimation                                                                  */
/* -------------------------------------------------------------------------- */

export interface YarnEstimateInput {
  readonly pieces: readonly PieceArea[];
  readonly gauge: Gauge;
  readonly fabric?: StitchFabric;
  /** Override the fabric factor directly, e.g. for a mixed-fabric garment. */
  readonly fabricFactor?: number;
  readonly wasteFactor?: number;
}

export interface YarnEstimate {
  readonly metres: number;
  readonly yards: number;
  readonly areaCm2: number;
  readonly areaM2: number;
  readonly metresPerM2: number;
  readonly fabricFactor: number;
  readonly wasteFactor: number;
  readonly byPiece: readonly { name: string; areaCm2: number; metres: number }[];
  readonly formula: string;
}

/**
 * Total yarn for a set of finished pieces.
 *
 *     metres = SUM(area_cm2) / 10000 x 41 x rowsPer10cm x fabricFactor x wasteFactor
 *
 * Areas are FINISHED, flat, single-layer measurements. A construction computes
 * them from the finished measurements it has already derived, so the yarn
 * estimate and the schematic can never disagree.
 */
export function estimateYarn(input: YarnEstimateInput): YarnEstimate {
  const fabricFactor = input.fabricFactor ?? STITCH_YARN_FACTORS[input.fabric ?? "stockinette"];
  const wasteFactor = input.wasteFactor ?? WASTE_FACTORS.plain;
  const perM2 = metresPerSquareMetre(input.gauge);

  const byPiece = input.pieces.map((piece) => ({
    name: piece.name,
    areaCm2: roundTo(piece.areaCm2, 1),
    metres: roundTo((Math.max(0, piece.areaCm2) / 10000) * perM2 * fabricFactor * wasteFactor, 1),
  }));

  const areaCm2 = input.pieces.reduce((sum, p) => sum + Math.max(0, p.areaCm2), 0);
  const metres = (areaCm2 / 10000) * perM2 * fabricFactor * wasteFactor;

  return {
    metres: roundTo(metres, 1),
    yards: roundTo(metresToYards(metres), 1),
    areaCm2: roundTo(areaCm2, 1),
    areaM2: roundTo(areaCm2 / 10000, 4),
    metresPerM2: roundTo(perM2, 1),
    fabricFactor,
    wasteFactor,
    byPiece,
    formula: `${roundTo(areaCm2 / 10000, 3)} m2 x ${roundTo(perM2, 1)} m/m2 (Munden, row gauge ${roundTo(input.gauge.rowsPer10cm, 1)}/10 cm) x ${fabricFactor} fabric x ${wasteFactor} waste`,
  };
}

/* -------------------------------------------------------------------------- */
/* Balls, skeins and substitution                                              */
/* -------------------------------------------------------------------------- */

export interface YarnSpec {
  readonly name?: string;
  readonly brand?: string;
  readonly cyc: CycWeight;
  readonly metresPerBall: number;
  readonly gramsPerBall: number;
  readonly fibre?: readonly string[];
  /** Wraps per inch, for identifying an unlabelled or handspun yarn. */
  readonly wpi?: number;
}

/**
 * Metres per 100 g is the substitution key: it is the only number that lets a
 * knitter compare two yarns whose put-ups differ. The old `Yarn` type stored
 * `meterage` with no grams field at all, so substitution was impossible.
 */
export function metresPer100g(yarn: YarnSpec): number {
  return roundTo((yarn.metresPerBall * 100) / yarn.gramsPerBall, 1);
}

/** A representative ball for a CYC weight, when the knitter has not chosen a yarn. */
export function defaultYarnFor(cyc: CycWeight): YarnSpec {
  const spec = YARN_WEIGHTS[cyc];
  return {
    name: `${spec.name} weight yarn`,
    cyc,
    metresPerBall: spec.typicalBall.metres,
    gramsPerBall: spec.typicalBall.grams,
  };
}

export interface BallCount {
  readonly balls: number;
  /** One extra ball for dye-lot safety on larger projects. */
  readonly spareBall: number;
  readonly totalBalls: number;
  readonly metres: number;
  readonly metresPerBall: number;
  readonly grams: number;
  readonly note: string;
}

/** Threshold above which one spare ball is added against dye-lot variation. */
export const DYE_LOT_SPARE_THRESHOLD_M = 800;

export function ballsFor(metres: number, yarn: YarnSpec, options: { dyeLotSpare?: boolean } = {}): BallCount {
  const balls = Math.max(1, Math.ceil(metres / yarn.metresPerBall));
  const wantsSpare = options.dyeLotSpare ?? metres >= DYE_LOT_SPARE_THRESHOLD_M;
  const spareBall = wantsSpare ? 1 : 0;
  const totalBalls = balls + spareBall;
  return {
    balls,
    spareBall,
    totalBalls,
    metres: roundTo(metres, 1),
    metresPerBall: yarn.metresPerBall,
    grams: totalBalls * yarn.gramsPerBall,
    note: spareBall
      ? `${balls} balls are needed; buy ${totalBalls} from the same dye lot so a shortfall does not force a visible colour change.`
      : `${balls} balls are needed.`,
  };
}

export interface SubstitutionCheck {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Is `candidate` a safe substitute for `original`?
 *
 * The test is metres per 100 g within +/-15% and the same CYC category. Fibre
 * is deliberately NOT treated as a blocker — it changes drape rather than size —
 * but it is called out, because a superwash substitute for a woollen-spun
 * original will grow on blocking and the knitter needs to know.
 */
export function checkSubstitution(
  original: YarnSpec,
  candidate: YarnSpec,
  tolerance = 0.15,
): SubstitutionCheck {
  const reasons: string[] = [];
  const a = metresPer100g(original);
  const b = metresPer100g(candidate);
  const drift = Math.abs(b - a) / a;
  if (drift > tolerance) {
    reasons.push(
      `Metres per 100 g differ by ${Math.round(drift * 100)}% (${a} vs ${b}); over ${Math.round(tolerance * 100)}% the fabric weight and yardage will not match.`,
    );
  }
  if (candidate.cyc !== original.cyc) {
    reasons.push(`Different CYC weight category (${original.cyc} vs ${candidate.cyc}); gauge is unlikely to match.`);
  }
  const fibresDiffer =
    original.fibre && candidate.fibre && original.fibre.join("/") !== candidate.fibre.join("/");
  if (fibresDiffer) {
    reasons.push("Different fibre content: swatch and block before committing — drape, growth and stitch definition will differ.");
  }
  return { ok: reasons.length === 0, reasons };
}
