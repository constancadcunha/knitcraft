/**
 * What a construction returns, and the helpers every construction shares.
 */

import type { StitchFabric } from "../knit";
import type { GarmentContext } from "./context";
import type {
  ConstructionMethod,
  GarmentPiece,
  Measurement,
  SchematicShape,
} from "./types";

export interface ConstructionResult {
  readonly construction: ConstructionMethod;
  /** How the garment is put together, in the order a maker needs to know it. */
  readonly constructionNotes: readonly string[];
  readonly pieces: readonly GarmentPiece[];
  /** The finished-measurement table. */
  readonly measurements: readonly Measurement[];
  /** Order of work. */
  readonly assembly: readonly string[];
  /** Which fabric the yarn estimate should be costed at. */
  readonly fabric: StitchFabric;
  readonly warnings?: readonly string[];
  /** Overrides the schematic derived from the pieces, when a piece is a tube. */
  readonly schematicShapes?: readonly SchematicShape[];
  readonly abbreviations?: readonly { readonly abbr: string; readonly meaning: string }[];
}

export type ConstructionFn = (ctx: GarmentContext) => ConstructionResult;

/** The default schematic: one outline per piece, at its finished flat size. */
export function shapesFromPieces(ctx: GarmentContext, pieces: readonly GarmentPiece[]): SchematicShape[] {
  return pieces.map((piece) => ({
    pieceId: piece.id,
    name: piece.makeCount > 1 ? `${piece.name} (make ${piece.makeCount})` : piece.name,
    widthCm: piece.widthCm,
    heightCm: piece.heightCm,
    labels: [
      ctx.measure(`${piece.name} width`, piece.widthCm, "width"),
      ctx.measure(`${piece.name} length`, piece.heightCm, "length"),
    ],
  }));
}

/** The fabric a garment's yarn estimate is costed at, per craft. */
export function fabricFor(ctx: GarmentContext, knitFabric: StitchFabric = "stockinette"): StitchFabric {
  if (ctx.craft === "knitting") return knitFabric;
  switch (ctx.crochetStitch) {
    case "sc":
      return "crochetSingle";
    case "dc":
      return "crochetDouble";
    default:
      return "crochetHalfDouble";
  }
}

/**
 * The abbreviations a pattern in this craft actually uses. Kept short and
 * honest: a list that names abbreviations the pattern never uses is noise, and
 * one that misses an abbreviation the pattern does use is a support ticket.
 */
export function baseAbbreviations(ctx: GarmentContext): { abbr: string; meaning: string }[] {
  if (ctx.craft === "crochet") {
    const stitch = ctx.crochetStitch;
    const names: Record<string, string> = {
      sc: "single crochet",
      hdc: "half double crochet",
      dc: "double crochet",
    };
    return [
      { abbr: "ch", meaning: "chain" },
      { abbr: "sl st", meaning: "slip stitch" },
      { abbr: stitch, meaning: `${names[stitch]} (US terms)` },
      { abbr: `${stitch}2tog`, meaning: `${names[stitch]} 2 together — one decrease` },
      { abbr: "rep", meaning: "repeat" },
      { abbr: "st(s)", meaning: "stitch(es)" },
      { abbr: "rnd(s)", meaning: "round(s)" },
    ];
  }
  return [
    { abbr: "k", meaning: "knit" },
    { abbr: "p", meaning: "purl" },
    { abbr: "k2tog", meaning: "knit 2 together — a right-leaning decrease" },
    { abbr: "ssk", meaning: "slip, slip, knit — a left-leaning decrease" },
    { abbr: "M1", meaning: "make one — a lifted increase between two stitches" },
    { abbr: "RS / WS", meaning: "right side / wrong side of the fabric" },
    { abbr: "st(s)", meaning: "stitch(es)" },
    { abbr: "rnd(s)", meaning: "round(s)" },
  ];
}
