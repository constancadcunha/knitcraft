/**
 * Garment constructions — the public data model.
 *
 * A construction turns (garment, craft, size, fit, gauge) into a complete,
 * knittable pattern: named pieces with real stitch and row counts, shaping
 * schedules SOLVED by `src/lib/knit/shaping`, row-by-row written instructions
 * carrying running stitch counts, a finished-measurement schematic, and a
 * starter chart grid so the chart editor is never handed an empty field.
 *
 * Everything in here is plain data. No React, no Next, no DOM — the same object
 * serialises to localStorage, renders on a page, and is asserted in a test.
 *
 * THE INVARIANT THIS MODEL EXISTS TO ENFORCE
 * ------------------------------------------
 * Every piece carries a `ledger`: the rows on which its stitch count changes,
 * and by how much. The written instructions are GENERATED from the ledger, so
 * the "(58 sts)" in the prose is the ledger's value by construction and cannot
 * drift from it. `reconciliations` records every place where a live count is
 * split into parts (shoulder + neck + shoulder), proved with `checkPartition`.
 *
 * The old engine computed shoulder and neck stitches from the CAST-ON count and
 * consumed them at a row where a different number of stitches was live, so
 * 21 + 34 + 21 did not equal the 58 stitches on the needle. That class of bug
 * is unrepresentable here: a construction cannot emit a partition without
 * running it through `checkPartition`, and `buildGarment` surfaces any failure.
 */

import type { SymbolChart } from "../chart";
import type {
  Craft,
  CycWeight,
  FitPreference,
  Gauge,
  RowDelta,
  SizeKey,
  YarnEstimate,
} from "../knit";

export type { Craft, FitPreference, Gauge, SizeKey };

/* -------------------------------------------------------------------------- */
/* Garment identity                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every garment the app can draft. These are stable ids; the human-facing
 * labels in `src/types/index.ts` (and any free text the LLM returns) are mapped
 * onto them by `resolveGarmentKind`.
 */
export type GarmentKind =
  | "sweater"
  | "cardigan"
  | "vest"
  | "tankTop"
  | "hat"
  | "cowl"
  | "scarf"
  | "shawl"
  | "socks"
  | "mittens"
  | "gloves"
  | "headband"
  | "legWarmers"
  | "toteBag"
  | "dishcloth"
  | "babyBlanket"
  | "throwBlanket"
  | "other";

/**
 * How a sleeved body is assembled. This is a first-class discriminant, not a
 * style note: it changes the piece list, the shaping, and the order of work.
 */
export type ConstructionMethod =
  | "setInSleeve"
  | "raglan"
  | "dropShoulder"
  /** Accessories and flat pieces that have no sleeve system at all. */
  | "none";

/** Flat pieces are worked in rows and turned; tubes are worked in rounds. */
export type WorkedAs = "flat" | "round";

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

export interface CowlOptions {
  /** neck 55 cm, standard 90 cm, infinity 150 cm (adult). */
  readonly style?: "neck" | "standard" | "infinity";
}

export interface SleeveOptions {
  /** Fraction of the full sleeve length. 1 = long, 0.6 = elbow, 0.3 = cap. */
  readonly lengthFactor?: number;
}

export interface CardiganOptions {
  readonly buttons?: number;
  readonly pockets?: boolean;
}

export interface HandwearOptions {
  /** Fingerless mitts / fingerless gloves: tubes instead of closed tips. */
  readonly fingerless?: boolean;
}

export interface HatOptions {
  /** A slouch adds height above the head; a watch cap adds a folded brim. */
  readonly style?: "beanie" | "slouch" | "watchCap";
}

export interface GarmentOptions {
  readonly cowl?: CowlOptions;
  readonly sleeve?: SleeveOptions;
  readonly cardigan?: CardiganOptions;
  readonly handwear?: HandwearOptions;
  readonly hat?: HatOptions;
  /** Override the target finished width/height/circumference, in cm. */
  readonly targetWidthCm?: number;
  readonly targetHeightCm?: number;
  readonly targetCircumferenceCm?: number;
  /** Name shown on the pattern. The LLM supplies design intent, never numbers. */
  readonly designName?: string;
}

export interface GarmentRequest {
  /** Garment id or any label/alias; see `resolveGarmentKind`. */
  readonly garment: GarmentKind | string;
  readonly craft: Craft;
  /** "M", "2-4yr", "One Size", or omitted. Unresolvable sizes are reported. */
  readonly size?: string;
  readonly fit?: FitPreference;
  /** The knitter's measured gauge. Defaults to the CYC mid-range for `yarnWeight`. */
  readonly gauge?: Gauge;
  readonly yarnWeight?: CycWeight;
  readonly construction?: ConstructionMethod;
  readonly options?: GarmentOptions;
}

/* -------------------------------------------------------------------------- */
/* Instructions                                                                */
/* -------------------------------------------------------------------------- */

export type InstructionKind =
  | "setup"
  | "work"
  | "shape"
  | "divide"
  | "join"
  | "finish"
  | "note";

export interface InstructionLine {
  /** Position within the piece, 0-based. */
  readonly index: number;
  /** First row/round this line covers, 1-based. null for a note. */
  readonly startRow: number | null;
  readonly endRow: number | null;
  /** Rows/rounds consumed. 0 for a note. */
  readonly rows: number;
  readonly stitchesBefore: number;
  readonly stitchesAfter: number;
  /** The line as the knitter reads it, ending "(58 sts)" when the count changes. */
  readonly text: string;
  readonly kind: InstructionKind;
}

export interface PieceSection {
  readonly name: string;
  /** Prose that belongs to the section as a whole, above the row instructions. */
  readonly note?: string;
  readonly lines: readonly InstructionLine[];
}

/** A proved split of a live stitch count into named parts. */
export interface Reconciliation {
  readonly where: string;
  readonly liveStitches: number;
  readonly parts: readonly { readonly name: string; readonly stitches: number }[];
  readonly ok: boolean;
  readonly message: string;
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

export interface GarmentPiece {
  readonly id: string;
  readonly name: string;
  /** How many of this piece to make (2 sleeves, 2 socks, 1 back). */
  readonly makeCount: number;
  readonly worked: WorkedAs;
  /** Stitches cast on / chained to start. */
  readonly castOn: number;
  /** Total rows or rounds worked. */
  readonly rows: number;
  /** Stitches live when the piece is finished (0 once bound off). */
  readonly finalStitches: number;
  /** Finished flat dimensions, for the schematic and the yarn area. */
  readonly widthCm: number;
  readonly heightCm: number;
  /** Single-layer flat area, used by the Munden yarn estimate. */
  readonly areaCm2: number;
  readonly sections: readonly PieceSection[];
  /** Rows on which the stitch count changes, and by how much. */
  readonly ledger: readonly RowDelta[];
  readonly reconciliations: readonly Reconciliation[];
  readonly warnings: readonly string[];
  /** A real, non-empty baseline grid sized from this piece's counts. */
  readonly starterChart: SymbolChart;
}

/* -------------------------------------------------------------------------- */
/* Schematic and materials                                                     */
/* -------------------------------------------------------------------------- */

export interface Measurement {
  readonly label: string;
  readonly cm: number;
  readonly inches: number;
  /** Circumference measurements are stated "around"; lengths are stated flat. */
  readonly kind: "circumference" | "width" | "length" | "depth";
}

/** One outline in the schematic drawing, in centimetres. */
export interface SchematicShape {
  readonly pieceId: string;
  readonly name: string;
  readonly widthCm: number;
  readonly heightCm: number;
  /** Narrow end of a tapered piece (a sleeve cuff), when it differs. */
  readonly minWidthCm?: number;
  readonly labels: readonly Measurement[];
}

export interface Schematic {
  readonly shapes: readonly SchematicShape[];
  readonly measurements: readonly Measurement[];
}

export interface Materials {
  readonly yarn: YarnEstimate;
  readonly balls: number;
  readonly totalBalls: number;
  readonly yarnNote: string;
  readonly cycWeight: CycWeight;
  readonly mainToolMm: number;
  readonly ribToolMm: number;
  readonly toolLabel: string;
  readonly notions: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* The pattern                                                                 */
/* -------------------------------------------------------------------------- */

export interface GarmentPattern {
  readonly garment: GarmentKind;
  readonly garmentLabel: string;
  readonly name: string;
  readonly craft: Craft;
  readonly construction: ConstructionMethod;
  readonly size: SizeKey | null;
  readonly sizeLabel: string;
  readonly fit: FitPreference;
  readonly gauge: Gauge;
  readonly gaugeStatement: string;
  /** One-paragraph description of how the garment is put together. */
  readonly constructionNotes: readonly string[];
  readonly pieces: readonly GarmentPiece[];
  readonly schematic: Schematic;
  readonly materials: Materials;
  /** Order of work, e.g. ["Back", "Front", "Sleeves", "Seams", "Neckband"]. */
  readonly assembly: readonly string[];
  readonly abbreviations: readonly { readonly abbr: string; readonly meaning: string }[];
  /** The chart the editor opens on. Never empty, for any garment. */
  readonly starterChart: SymbolChart;
  readonly warnings: readonly string[];
}
