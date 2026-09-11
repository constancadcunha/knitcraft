/**
 * Garment identity, defaults, and the dimension tables for the garments that
 * are NOT drafted from a body measurement.
 *
 * A scarf has no chest. A blanket has no ease. The old engine ran every garment
 * through one "bust" field, which is why a cowl and a cardigan came out of the
 * same arithmetic. Anything drafted from a target dimension is drafted from a
 * table here, and the table says where its numbers come from.
 */

import { type SizeKey, isBabySize, isChildSize } from "../knit";
import type { ConstructionMethod, Craft, GarmentKind } from "./types";

export const GARMENT_KINDS: readonly GarmentKind[] = [
  "sweater",
  "cardigan",
  "vest",
  "tankTop",
  "hat",
  "cowl",
  "scarf",
  "shawl",
  "socks",
  "mittens",
  "gloves",
  "headband",
  "legWarmers",
  "toteBag",
  "dishcloth",
  "babyBlanket",
  "throwBlanket",
  "other",
];

export const GARMENT_LABELS: Record<GarmentKind, string> = {
  sweater: "Sweater",
  cardigan: "Cardigan",
  vest: "Vest",
  tankTop: "Tank Top",
  hat: "Hat / Beanie",
  cowl: "Cowl",
  scarf: "Scarf",
  shawl: "Shawl",
  socks: "Socks",
  mittens: "Mittens",
  gloves: "Gloves",
  headband: "Headband",
  legWarmers: "Leg Warmers",
  toteBag: "Tote Bag",
  dishcloth: "Dishcloth",
  babyBlanket: "Baby Blanket",
  throwBlanket: "Throw Blanket",
  other: "Other",
};

/**
 * Every label the UI, stored patterns and the LLM are known to emit, mapped to
 * a construction. Unknown text falls to "other", which is a real gauge-driven
 * construction rather than a placeholder.
 */
const ALIASES: Record<string, GarmentKind> = {
  sweater: "sweater",
  pullover: "sweater",
  jumper: "sweater",
  jersey: "sweater",
  cardigan: "cardigan",
  cardi: "cardigan",
  vest: "vest",
  waistcoat: "vest",
  slipover: "vest",
  "tank top": "tankTop",
  tanktop: "tankTop",
  tank: "tankTop",
  camisole: "tankTop",
  hat: "hat",
  beanie: "hat",
  "hat / beanie": "hat",
  "hat/beanie": "hat",
  toque: "hat",
  cap: "hat",
  cowl: "cowl",
  snood: "cowl",
  "neck warmer": "cowl",
  "infinity scarf": "cowl",
  scarf: "scarf",
  shawl: "shawl",
  wrap: "shawl",
  shawlette: "shawl",
  socks: "socks",
  sock: "socks",
  mittens: "mittens",
  mitten: "mittens",
  mitts: "mittens",
  gloves: "gloves",
  glove: "gloves",
  "fingerless gloves": "gloves",
  headband: "headband",
  earwarmer: "headband",
  "ear warmer": "headband",
  "leg warmers": "legWarmers",
  legwarmers: "legWarmers",
  "leg warmer": "legWarmers",
  "tote bag": "toteBag",
  tote: "toteBag",
  bag: "toteBag",
  "market bag": "toteBag",
  dishcloth: "dishcloth",
  washcloth: "dishcloth",
  facecloth: "dishcloth",
  "baby blanket": "babyBlanket",
  blanket: "babyBlanket",
  "throw blanket": "throwBlanket",
  throw: "throwBlanket",
  afghan: "throwBlanket",
  lapghan: "throwBlanket",
  other: "other",
};

export function resolveGarmentKind(raw: string | null | undefined): GarmentKind {
  if (!raw) return "other";
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if ((GARMENT_KINDS as readonly string[]).includes(raw.trim())) return raw.trim() as GarmentKind;
  return ALIASES[key] ?? "other";
}

/** Does this garment need a body measurement, or is it drafted from a target? */
export function needsBodySize(kind: GarmentKind): boolean {
  switch (kind) {
    case "cowl":
    case "scarf":
    case "shawl":
    case "toteBag":
    case "dishcloth":
    case "babyBlanket":
    case "throwBlanket":
    case "other":
      return false;
    default:
      return true;
  }
}

/**
 * Default construction per garment and craft.
 *
 * Knitted sweaters default to a top-down raglan: it is seamless, it is the
 * commonest modern construction, and it is the most forgiving of a gauge that
 * turns out slightly off. Crochet garments default to a drop shoulder, because
 * crochet fabric is thicker and less elastic and a set-in cap in crochet needs
 * short rows most makers will not want on a first garment.
 */
export function defaultConstruction(kind: GarmentKind, craft: Craft): ConstructionMethod {
  switch (kind) {
    case "sweater":
    case "cardigan":
      return craft === "crochet" ? "dropShoulder" : "raglan";
    case "vest":
    case "tankTop":
      return "setInSleeve";
    default:
      return "none";
  }
}

/* -------------------------------------------------------------------------- */
/* Dimension tables for the garments with no body measurement                  */
/* -------------------------------------------------------------------------- */

export type WearerScale = "baby" | "child" | "adult";

export function wearerScale(size: SizeKey | null): WearerScale {
  if (!size) return "adult";
  if (isBabySize(size)) return "baby";
  if (isChildSize(size)) return "child";
  return "adult";
}

export interface CowlDims {
  readonly circumferenceCm: number;
  readonly heightCm: number;
}

/**
 * Cowl circumferences, from the standard cowl taxonomy: a "cowlette" or neck
 * warmer sits at 56-63 cm (22-25 in) — big enough to pass over the head and no
 * bigger; a standard cowl is 76-102 cm (30-40 in); an infinity scarf is
 * 150-180 cm (60-70 in) so it doubles round the neck. Heights follow the same
 * sources at about 20-30 cm for a neck cowl and 30 cm for a draped one.
 *
 * The minimum that matters is the head: `buildCowl` checks the circumference
 * against the wearer's head, because a cowl that does not go on is not a cowl.
 */
export const COWL_DIMS: Record<WearerScale, Record<"neck" | "standard" | "infinity", CowlDims>> = {
  adult: {
    neck: { circumferenceCm: 60, heightCm: 22 },
    standard: { circumferenceCm: 90, heightCm: 30 },
    infinity: { circumferenceCm: 150, heightCm: 25 },
  },
  child: {
    neck: { circumferenceCm: 48, heightCm: 16 },
    standard: { circumferenceCm: 66, heightCm: 20 },
    infinity: { circumferenceCm: 100, heightCm: 18 },
  },
  baby: {
    neck: { circumferenceCm: 42, heightCm: 13 },
    standard: { circumferenceCm: 52, heightCm: 15 },
    infinity: { circumferenceCm: 72, heightCm: 14 },
  },
};

export interface RectDims {
  readonly widthCm: number;
  readonly lengthCm: number;
  readonly borderCm: number;
}

/**
 * Scarves. Adult: 20 cm wide and roughly the wearer's height long (150-180 cm)
 * is the standard advice; a child's scarf is cut shorter so it cannot be stood
 * on, and a baby "scarf" is a 70 cm neck-length strip.
 */
export const SCARF_DIMS: Record<WearerScale, RectDims> = {
  adult: { widthCm: 20, lengthCm: 165, borderCm: 2 },
  child: { widthCm: 14, lengthCm: 110, borderCm: 1.5 },
  baby: { widthCm: 10, lengthCm: 70, borderCm: 1 },
};

/**
 * Blankets, at the standard finished sizes: receiving/baby blanket 76 x 102 cm
 * (30 x 40 in), crib 91 x 132 cm, throw 127 x 152 cm (50 x 60 in), lapghan
 * 91 x 122 cm. Borders are 5 cm on an adult throw, 4 cm on a baby blanket.
 */
export const BLANKET_DIMS: Record<"babyBlanket" | "throwBlanket", RectDims> = {
  babyBlanket: { widthCm: 76, lengthCm: 102, borderCm: 4 },
  throwBlanket: { widthCm: 127, lengthCm: 152, borderCm: 5 },
};

/** A dishcloth is a square; 22 cm is the usual finished side for a cotton cloth. */
export const DISHCLOTH_DIMS: RectDims = { widthCm: 22, lengthCm: 22, borderCm: 2 };

export interface ToteDims {
  readonly widthCm: number;
  readonly heightCm: number;
  readonly gussetCm: number;
  readonly strapLengthCm: number;
  readonly strapWidthCm: number;
}

/**
 * A shoulder tote: 38 cm wide, 40 cm deep, a 10 cm base gusset, and straps long
 * enough to clear a coat (60 cm each, 5 cm wide). A child's tote is two thirds
 * of that.
 */
export const TOTE_DIMS: Record<WearerScale, ToteDims> = {
  adult: { widthCm: 38, heightCm: 40, gussetCm: 10, strapLengthCm: 60, strapWidthCm: 5 },
  child: { widthCm: 26, heightCm: 26, gussetCm: 7, strapLengthCm: 40, strapWidthCm: 4 },
  baby: { widthCm: 22, heightCm: 22, gussetCm: 6, strapLengthCm: 34, strapWidthCm: 3.5 },
};

/**
 * Shawl wingspans. A "shawlette" is about 120 cm point to point, a full
 * triangular shawl 150-180 cm; the depth is not chosen, it FOLLOWS from the
 * increase geometry and the row gauge (see `buildShawl`).
 */
export const SHAWL_WINGSPAN_CM: Record<WearerScale, number> = {
  adult: 150,
  child: 100,
  baby: 80,
};

/** Headband widths. Narrow enough to sit above the ears, wide enough to cover them. */
export const HEADBAND_WIDTH_CM: Record<WearerScale, number> = {
  adult: 9,
  child: 7,
  baby: 5.5,
};

/**
 * Ribbing depth at a hem, cuff or brim. Ribbing shorter than about 4 cm on an
 * adult garment does not pull in enough to do its job.
 */
export function ribDepthCm(scale: WearerScale, where: "hem" | "cuff" | "brim" | "neck"): number {
  const adult = { hem: 6, cuff: 6, brim: 5, neck: 3 } as const;
  const factor = scale === "adult" ? 1 : scale === "child" ? 0.7 : 0.55;
  return Math.round(adult[where] * factor * 10) / 10;
}
