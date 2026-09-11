/**
 * The shared data model.
 *
 * Three rules hold everything here together:
 *
 *  1. THE ENGINE OWNS THE NUMBERS. Every measurement, stitch count and size in
 *     this file is either produced by `src/lib/knit` or checked against it. A
 *     type here may carry a number; it may never invent one. The old model kept
 *     its own size list, which disagreed with the engine's — every child size
 *     and "One Size" silently drafted an adult L. `GarmentSize` is now derived
 *     from `SizeKey`, so that bug is not expressible.
 *
 *  2. NO SENTINELS. The old chart model smuggled ribbing and notions through
 *     `colorIndex` values that meant "this is not really a colour". Ribbing and
 *     notions are real fields now (`RibbingSpec`, `NotionMarker`), and a cross
 *     stitch cell with no floss in it simply has no `colorIndex` at all.
 *
 *  3. EVERYTHING IS JSON. This is a client-only app: the whole model round-trips
 *     through `JSON.stringify`/`JSON.parse` into localStorage. No `Date`, no
 *     `Map`, no `Set`, no class instances, no functions. Timestamps are ISO
 *     strings. See `src/lib/project/persistence.ts`.
 */

import type { ChartCraft, SymbolChart } from "@/lib/chart";
import {
  ADULT_SIZES,
  CHILD_SIZES,
  ONE_SIZE,
  isChildSize,
  isOneSize,
  isSizeKey,
  resolveSize,
  type Craft as KnitCraft,
  type CycWeight,
  type FitPreference,
  type GarmentCategory,
  type Gauge,
  type SizeKey,
  type YarnSpec,
} from "@/lib/knit";

export type { Gauge, SizeKey, YarnSpec, CycWeight, FitPreference, GarmentCategory };

/* -------------------------------------------------------------------------- */
/* Crafts                                                                      */
/* -------------------------------------------------------------------------- */

export type CraftType = "knitting" | "crocheting" | "cross-stitch";

export const CRAFT_TYPES: readonly CraftType[] = ["knitting", "crocheting", "cross-stitch"];

/**
 * The two crafts that build fabric stitch by stitch from yarn. These are
 * exactly the crafts `src/lib/chart` can draw, and `satisfies` proves it: if the
 * chart module ever drops one, this line stops compiling rather than failing at
 * runtime inside a chart editor.
 */
export const YARN_CRAFTS = ["knitting", "crocheting"] as const satisfies readonly ChartCraft[];

export type YarnCraft = (typeof YARN_CRAFTS)[number];

export function isYarnCraft(craft: CraftType): craft is YarnCraft {
  return craft === "knitting" || craft === "crocheting";
}

export function isCrossStitchCraft(craft: CraftType): craft is "cross-stitch" {
  return craft === "cross-stitch";
}

export const CRAFT_LABELS: Record<CraftType, string> = {
  knitting: "Knitting",
  crocheting: "Crochet",
  "cross-stitch": "Cross stitch",
};

/**
 * `src/lib/knit` spells the crochet craft "crochet"; `src/lib/chart` spells it
 * "crocheting". Both are already published and tested, so rather than edit
 * either vocabulary we translate in exactly one place — here.
 */
export function toKnitCraft(craft: YarnCraft): KnitCraft {
  return craft === "crocheting" ? "crochet" : "knitting";
}

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export const DIFFICULTIES: readonly Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

/* -------------------------------------------------------------------------- */
/* Sizes                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A size a project can actually be drafted in.
 *
 * `SizeKey` is the engine's own union (7 adult + 6 child sizes, every one of
 * which has a full body-measurement row). "One Size" is not a body size at all:
 * it means "drafted from a target finished dimension" — a cowl circumference, a
 * blanket width — and a construction that sees it must route to a
 * dimension-driven draft instead of the size table. It is admitted here, rather
 * than as a loose string, so the UI can offer it while the type still tells a
 * caller it needs different handling.
 */
export type GarmentSize = SizeKey | typeof ONE_SIZE;

/**
 * The size list, in the order a human expects to see it. It is BUILT FROM the
 * engine's tables rather than re-typed beside them, which is what stops the two
 * from drifting apart again. (The old list offered "XXL", which the engine calls
 * "2XL", and six child sizes it could not size at all.)
 */
export const AVAILABLE_SIZES: readonly GarmentSize[] = [
  ...ADULT_SIZES,
  ...CHILD_SIZES,
  ONE_SIZE,
];

export const BODY_SIZES: readonly SizeKey[] = [...ADULT_SIZES, ...CHILD_SIZES];

/** A size the body-measurement table can answer for. Narrows away "One Size". */
export function isBodySize(size: GarmentSize): size is SizeKey {
  return size !== ONE_SIZE;
}

export function isGarmentSize(value: string): value is GarmentSize {
  return isSizeKey(value) || isOneSize(value);
}

/**
 * Coerce anything (stored data, LLM output, a URL param) to a size the engine
 * supports, or `null`. Returning `null` is the point: the old `normalizeSize()`
 * fell back to "L", which is how a 0-3 month cardigan came out with a 42 inch
 * bust. Callers must ask the user rather than guess.
 */
export function toGarmentSize(raw: string | null | undefined): GarmentSize | null {
  if (isOneSize(raw)) return ONE_SIZE;
  return resolveSize(raw);
}

export { ONE_SIZE };

/* -------------------------------------------------------------------------- */
/* Garments                                                                    */
/* -------------------------------------------------------------------------- */

export const GARMENT_TYPES = [
  "Sweater",
  "Cardigan",
  "Vest",
  "Tank Top",
  "Hat",
  "Scarf",
  "Cowl",
  "Mittens",
  "Gloves",
  "Socks",
  "Shawl",
  "Baby Blanket",
  "Throw Blanket",
  "Tote Bag",
  "Dishcloth",
  "Headband",
  "Leg Warmers",
  "Sampler",
  "Hoop Art",
  "Bookmark",
  "Ornament",
  "Framed Picture",
  "Cushion",
  "Other",
] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number];

export function isGarmentType(value: string): value is GarmentType {
  return (GARMENT_TYPES as readonly string[]).includes(value);
}

/**
 * How a garment gets its dimensions.
 *  - "body": from the body-measurement table plus ease. Needs a real size.
 *  - "dimension": from a target finished measurement. "One Size" only.
 *  - "either": normally sized, but also sensible as a one-size make (a hat
 *    drafted from a measured head, a scarf in a child length).
 */
export type SizingMode = "body" | "dimension" | "either";

export interface GarmentSpec {
  readonly id: GarmentType;
  readonly label: string;
  /** Crafts this make is offered for. Cross stitch shares almost nothing with yarn. */
  readonly crafts: readonly CraftType[];
  readonly sizing: SizingMode;
  /**
   * Which ease row `src/lib/knit/ease` should use. `null` means the engine has
   * no ease table for it and the piece is drafted from flat dimensions.
   */
  readonly category: GarmentCategory | null;
  /** The pieces a finished make is built from. NAMES ONLY — never stitch counts. */
  readonly pieces: readonly string[];
}

const YARN: readonly CraftType[] = ["knitting", "crocheting"];
const STITCH: readonly CraftType[] = ["cross-stitch"];
const ALL_CRAFTS: readonly CraftType[] = ["knitting", "crocheting", "cross-stitch"];

/**
 * The garment catalogue.
 *
 * This replaces the old `GARMENT_TEMPLATES`, which hard-coded stitch counts
 * ("Back: 76 x 106") that contradicted both the gauge-derived numbers and the
 * size table. Pieces are named here; every number about them comes from the
 * engine at draft time.
 */
export const GARMENT_CATALOG: Record<GarmentType, GarmentSpec> = {
  Sweater: { id: "Sweater", label: "Sweater", crafts: YARN, sizing: "body", category: "pullover", pieces: ["Back", "Front", "Left Sleeve", "Right Sleeve", "Neckband"] },
  Cardigan: { id: "Cardigan", label: "Cardigan", crafts: YARN, sizing: "body", category: "cardigan", pieces: ["Back", "Left Front", "Right Front", "Left Sleeve", "Right Sleeve", "Button Band", "Neckband"] },
  Vest: { id: "Vest", label: "Vest", crafts: YARN, sizing: "body", category: "vest", pieces: ["Back", "Front", "Neckband", "Armhole Bands"] },
  "Tank Top": { id: "Tank Top", label: "Tank top", crafts: YARN, sizing: "body", category: "vest", pieces: ["Back", "Front", "Neckband", "Armhole Bands"] },
  Hat: { id: "Hat", label: "Hat / beanie", crafts: YARN, sizing: "either", category: "hat", pieces: ["Brim", "Body", "Crown"] },
  Scarf: { id: "Scarf", label: "Scarf", crafts: YARN, sizing: "dimension", category: "scarf", pieces: ["Scarf"] },
  Cowl: { id: "Cowl", label: "Cowl", crafts: YARN, sizing: "dimension", category: "cowl", pieces: ["Cowl"] },
  Mittens: { id: "Mittens", label: "Mittens", crafts: YARN, sizing: "either", category: "mitten", pieces: ["Cuff", "Hand", "Thumb"] },
  Gloves: { id: "Gloves", label: "Gloves", crafts: YARN, sizing: "either", category: "mitten", pieces: ["Cuff", "Hand", "Fingers", "Thumb"] },
  Socks: { id: "Socks", label: "Socks", crafts: YARN, sizing: "either", category: "sock", pieces: ["Cuff", "Leg", "Heel", "Foot", "Toe"] },
  Shawl: { id: "Shawl", label: "Shawl", crafts: YARN, sizing: "dimension", category: "shawl", pieces: ["Shawl"] },
  "Baby Blanket": { id: "Baby Blanket", label: "Baby blanket", crafts: YARN, sizing: "dimension", category: "blanket", pieces: ["Blanket", "Border"] },
  "Throw Blanket": { id: "Throw Blanket", label: "Throw blanket", crafts: YARN, sizing: "dimension", category: "blanket", pieces: ["Blanket", "Border"] },
  "Tote Bag": { id: "Tote Bag", label: "Tote bag", crafts: YARN, sizing: "dimension", category: null, pieces: ["Front", "Back", "Base", "Straps"] },
  Dishcloth: { id: "Dishcloth", label: "Dishcloth", crafts: YARN, sizing: "dimension", category: null, pieces: ["Cloth"] },
  Headband: { id: "Headband", label: "Headband", crafts: YARN, sizing: "either", category: "hat", pieces: ["Headband"] },
  "Leg Warmers": { id: "Leg Warmers", label: "Leg warmers", crafts: YARN, sizing: "either", category: "sock", pieces: ["Left", "Right"] },
  Sampler: { id: "Sampler", label: "Sampler", crafts: STITCH, sizing: "dimension", category: null, pieces: ["Design"] },
  "Hoop Art": { id: "Hoop Art", label: "Hoop art", crafts: STITCH, sizing: "dimension", category: null, pieces: ["Design"] },
  Bookmark: { id: "Bookmark", label: "Bookmark", crafts: STITCH, sizing: "dimension", category: null, pieces: ["Design"] },
  Ornament: { id: "Ornament", label: "Ornament", crafts: STITCH, sizing: "dimension", category: null, pieces: ["Design"] },
  "Framed Picture": { id: "Framed Picture", label: "Framed picture", crafts: STITCH, sizing: "dimension", category: null, pieces: ["Design"] },
  Cushion: { id: "Cushion", label: "Cushion", crafts: ALL_CRAFTS, sizing: "dimension", category: null, pieces: ["Front", "Back"] },
  Other: { id: "Other", label: "Something else", crafts: ALL_CRAFTS, sizing: "dimension", category: null, pieces: ["Piece"] },
};

/** Garments offered for a craft. Cross stitch gets samplers, not sleeves. */
export function garmentsForCraft(craft: CraftType): GarmentSpec[] {
  return GARMENT_TYPES.map((id) => GARMENT_CATALOG[id]).filter((spec) =>
    spec.crafts.includes(craft),
  );
}

/**
 * The sizes this garment may legally be made in.
 *
 * A cowl in "M" is meaningless and a sweater in "One Size" is undraftable, so
 * the UI must offer only what the engine can honour — which is what makes the
 * child-size regression impossible rather than merely fixed.
 */
export function sizesForGarment(garment: GarmentType): readonly GarmentSize[] {
  const { sizing } = GARMENT_CATALOG[garment];
  if (sizing === "dimension") return [ONE_SIZE];
  if (sizing === "body") return BODY_SIZES;
  return AVAILABLE_SIZES;
}

export function garmentSupportsSize(garment: GarmentType, size: GarmentSize): boolean {
  return sizesForGarment(garment).includes(size);
}

/** The size to open a size picker on: the middle adult size, or One Size. */
export function defaultSizeForGarment(garment: GarmentType): GarmentSize {
  const sizes = sizesForGarment(garment);
  return sizes.includes("M") ? "M" : sizes[0];
}

export function sizeAudience(size: GarmentSize): "adult" | "child" | "one-size" {
  if (!isBodySize(size)) return "one-size";
  return isChildSize(size) ? "child" : "adult";
}

/* -------------------------------------------------------------------------- */
/* Cross stitch                                                                */
/* -------------------------------------------------------------------------- */

export const AIDA_COUNTS = [11, 14, 16, 18] as const;
export const EVENWEAVE_COUNTS = [28, 32] as const;

export type AidaCount = (typeof AIDA_COUNTS)[number];
export type EvenweaveCount = (typeof EVENWEAVE_COUNTS)[number];
export type FabricCount = AidaCount | EvenweaveCount;

/**
 * The fabric, which is the cross-stitch equivalent of gauge: it alone decides
 * how big the finished piece is.
 *
 * Aida is woven in blocks and takes one stitch per block, so its count IS the
 * stitches per inch. Evenweave and linen are counted in threads and are
 * normally worked "over two" — 28 count evenweave gives 14 stitches per inch.
 * Modelling them as one union with a free `count` would let an "Aida 28" exist,
 * which is not a fabric anyone sells; splitting them makes it unrepresentable.
 */
export type CrossStitchFabric =
  | { readonly kind: "aida"; readonly count: AidaCount; readonly color?: string }
  | {
      readonly kind: "evenweave";
      readonly count: EvenweaveCount;
      /** Threads per stitch. 2 is standard; 1 is petit point. */
      readonly over: 1 | 2;
      readonly color?: string;
    };

/** Strands of six-strand floss in the needle. */
export type StrandCount = 1 | 2 | 3 | 4 | 5 | 6;

export type FlossBrand = "DMC" | "Anchor" | "Madeira" | "Other";

export interface FlossColor {
  /** Manufacturer shade code, e.g. DMC "310". Free text: brands number differently. */
  code: string;
  brand: FlossBrand;
  name: string;
  /** Screen approximation of the thread. Threads are not screens; treat as a hint. */
  hex: string;
  /** The chart symbol printed in this colour's squares, for mono printing. */
  symbol: string;
}

export interface CrossStitchSettings {
  fabric: CrossStitchFabric;
  /** Strands for full stitches. Two over 14 count Aida is the usual starting point. */
  strands: StrandCount;
  /** Backstitch is normally worked one strand finer than the filling. */
  backstitchStrands: StrandCount;
  /** Bare fabric left around the design for framing or hooping, per side. */
  marginCm: number;
}

export type CrossStitchStitchKind =
  | "full"
  | "half"
  | "quarter"
  | "three-quarter";

/** Which corner of the square a fractional stitch occupies. */
export type CellCorner = "tl" | "tr" | "bl" | "br";

export interface CrossStitchCell {
  /**
   * Index into `CrossStitchChart.palette`. ABSENT means bare fabric — there is
   * no sentinel index for "no thread", because that is exactly the hack that
   * made the old chart model unreadable.
   */
  colorIndex?: number;
  /** Defaults to "full". */
  stitch?: CrossStitchStitchKind;
  /** Required for "quarter" and "three-quarter"; meaningless otherwise. */
  corner?: CellCorner;
}

/** A point on the fabric lattice: (0,0) is the top-left corner of cell (0,0). */
export interface GridPoint {
  x: number;
  y: number;
}

/**
 * Backstitch runs along the edges and diagonals of squares, not inside them, so
 * it cannot live in a cell. Outlines are what make a cross-stitch design read,
 * and the old colour-grid model could not express them at all.
 */
export interface BackstitchSegment {
  id: string;
  from: GridPoint;
  to: GridPoint;
  colorIndex: number;
}

export interface FrenchKnot {
  id: string;
  at: GridPoint;
  colorIndex: number;
}

export interface CrossStitchChart {
  /** Matches the SymbolChart schema number so one guard covers both. */
  schemaVersion: 2;
  craft: "cross-stitch";
  id: string;
  name: string;
  width: number;
  height: number;
  /**
   * rows[0] is the TOP row of the design. This is the opposite of a knitting
   * chart, where rows[0] is the bottom row and is worked first: cross stitch is
   * a picture worked from the top down, not a fabric grown upward.
   */
  rows: CrossStitchCell[][];
  palette: FlossColor[];
  backstitch: BackstitchSegment[];
  frenchKnots: FrenchKnot[];
  settings: CrossStitchSettings;
}

/** Either kind of chart. Discriminated by `craft`, which never overlaps. */
export type ProjectChart = SymbolChart | CrossStitchChart;

export function isCrossStitchChart(chart: ProjectChart): chart is CrossStitchChart {
  return chart.craft === "cross-stitch";
}

export function isSymbolChart(chart: ProjectChart): chart is SymbolChart {
  return chart.craft !== "cross-stitch";
}

/* -------------------------------------------------------------------------- */
/* Ribbing and notions — formerly smuggled through `colorIndex`                 */
/* -------------------------------------------------------------------------- */

export type RibbingPattern = "1x1" | "2x2" | "2x1" | "garter" | "seed" | "moss";

export type RibbingPlacement = "hem" | "cuff" | "neck" | "band" | "brim";

export interface RibbingSpec {
  pattern: RibbingPattern;
  /** Rows/rounds of ribbing worked before the charted section. */
  rows: number;
  placement: RibbingPlacement;
  /** Ribbing is conventionally worked a needle size down so the edge pulls in. */
  needleStepDown: boolean;
}

export type NotionKind =
  | "button"
  | "buttonhole"
  | "zipper"
  | "stitch-marker"
  | "seam"
  | "pocket"
  | "eyelet";

/**
 * A notion pinned to a position in a chart. `rowIndex`/`colIndex` are grid
 * indices in the owning chart's own coordinate system (bottom-up for yarn
 * charts, top-down for cross stitch), NOT worked row numbers.
 */
export interface NotionMarker {
  id: string;
  kind: NotionKind;
  rowIndex: number;
  colIndex: number;
  label?: string;
}

/* -------------------------------------------------------------------------- */
/* Charts as they live inside a project                                        */
/* -------------------------------------------------------------------------- */

export type ChartRole = "chart" | "swatch" | "reference";

/**
 * A chart saved in a project: the chart itself plus everything about how it is
 * used in the make. Generic so a knitting project cannot hold a cross-stitch
 * chart, nor the reverse.
 */
export interface SavedChart<C extends ProjectChart = ProjectChart> {
  id: string;
  name: string;
  chart: C;
  role: ChartRole;
  /** Which piece of the garment this is ("Back", "Left Sleeve", "Design"). */
  piece: string;
  /** Position in the construction order the knitter works in. */
  order: number;
  /** Ribbing worked before this piece's charted rows, if any. */
  ribbing: RibbingSpec | null;
  notions: NotionMarker[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Small data-URL preview. Optional: it is the single biggest thing we store. */
  thumbnail?: string;
}

export type YarnSavedChart = SavedChart<SymbolChart>;
export type CrossStitchSavedChart = SavedChart<CrossStitchChart>;

/* -------------------------------------------------------------------------- */
/* Written pattern                                                             */
/* -------------------------------------------------------------------------- */

export interface Abbreviation {
  abbr: string;
  meaning: string;
  /** Search terms for a how-to video; never a hard-coded third-party URL. */
  videoKeywords: string;
}

export interface Instruction {
  rowNumber: number;
  text: string;
  /** Stitches on the needle after this row, when the engine knows. */
  stitchesAfter?: number;
}

export interface PatternSection {
  /** Stable within a pattern; progress is keyed by it. */
  name: string;
  description: string;
  instructions: Instruction[];
  /** The chart this section is written from, when it has one. */
  chartId?: string;
}

export interface NeedleSpec {
  kind: "straight" | "circular" | "dpn" | "hook";
  mm: number;
  /** Circulars only. */
  lengthCm?: number;
  use: string;
}

export interface YarnRequirement {
  yarn: YarnSpec;
  /** The role this yarn plays: "MC", "CC1", "Cream". */
  role: string;
  hex?: string;
  /** Metres the engine computed for THIS size. Never a model's guess. */
  metres: number;
  balls: number;
}

export interface FlossRequirement {
  floss: FlossColor;
  /** Stitches worked in this shade, counted from the chart. */
  stitches: number;
  skeins: number;
}

export interface FabricRequirement {
  fabric: CrossStitchFabric;
  /** Cut size including margin, from `src/lib/project/crossStitch`. */
  cutWidthCm: number;
  cutHeightCm: number;
}

export interface Materials {
  yarns: YarnRequirement[];
  needles: NeedleSpec[];
  notions: string[];
  /** Cross stitch only. */
  floss?: FlossRequirement[];
  fabric?: FabricRequirement;
}

/** Finished measurements, in centimetres, keyed by name ("chest", "length"). */
export type FinishedMeasurements = Record<string, number>;

export type PatternSource = "wizard" | "text" | "image" | "import";

export interface Pattern {
  id: string;
  name: string;
  craftType: CraftType;
  garmentType: GarmentType;
  size: GarmentSize;
  difficulty: Difficulty;
  /** Per-10cm gauge, the same shape `src/lib/knit` computes with. */
  gauge: Gauge;
  measurements: FinishedMeasurements;
  materials: Materials;
  abbreviations: Abbreviation[];
  sections: PatternSection[];
  notes: string;
  /** Rough working time, as prose ("a weekend", "30-40 hours"). */
  estimatedTime: string;
  source: PatternSource;
  sourceDescription?: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Where the knitter is. `stitchIndex` counts stitches ALREADY WORKED in the
 * row, in reading order, so 0 means "at the start of the row" and a full row
 * means "row finished". Reading order is the chart module's
 * (`rowGroupsInReadingOrder`): right to left on RS rows, left to right on WS
 * rows, always left to right for cross stitch.
 */
export interface ChartCursor {
  rowIndex: number;
  stitchIndex: number;
}

/**
 * One reverted step. Entries store the PREVIOUS values of only the rows an
 * operation touched, which is what keeps undo persistable: a full snapshot per
 * stitch would be megabytes by the end of a sleeve.
 */
export interface ProgressUndoEntry {
  /** Human wording for the step, spoken back on undo ("counted 5"). */
  label: string;
  cursor: ChartCursor;
  /** rowIndex -> previous completed-stitch count, or null if the row had none. */
  rows: Record<number, number | null>;
  at: string;
}

/**
 * Progress through one chart.
 *
 * Completion is stored as "the first N stitches of row R, in reading order, are
 * worked", NOT as a set of completed cells. That is how knitting actually
 * happens — you cannot work stitch 40 before stitch 39 — and it is three orders
 * of magnitude smaller: a fully worked 76x106 piece is ~700 bytes here against
 * the ~103 KB the old `{"row,col": true}` map took, which is what filled the
 * localStorage quota and silently threw away people's counts.
 */
export interface ChartProgress {
  chartId: string;
  /** rowIndex -> stitches worked in that row. Absent means none. */
  rowStitches: Record<number, number>;
  cursor: ChartCursor;
  undo: ProgressUndoEntry[];
  updatedAt: string;
}

/** Progress through a written section, which is tracked by whole rows. */
export interface SectionProgress {
  sectionName: string;
  /** Worked row NUMBERS (as printed), ascending and unique. */
  completedRows: number[];
}

export interface ProjectProgress {
  /** The chart the tracker and voice counter are working on. */
  activeChartId: string | null;
  currentSectionIndex: number;
  charts: Record<string, ChartProgress>;
  sections: Record<string, SectionProgress>;
  startedAt: string | null;
  lastWorkedAt: string | null;
  completedAt: string | null;
}

/** Most steps we keep. Bounded so a long session cannot grow without limit. */
export const UNDO_LIMIT = 50;

/* -------------------------------------------------------------------------- */
/* Projects                                                                    */
/* -------------------------------------------------------------------------- */

/** Bumped whenever a stored shape changes. See `src/lib/project/persistence.ts`. */
export const PROJECT_SCHEMA_VERSION = 3;

export interface YarnSettings {
  craft: YarnCraft;
  gauge: Gauge;
  fit: FitPreference;
  cyc: CycWeight;
  /** Needle or hook diameter in millimetres. */
  toolMm: number;
  worked: "flat" | "round";
}

export interface ProjectSource {
  kind: PatternSource;
  description?: string;
  /** Data URL of the inspiration photo, when there was one. */
  imagePreview?: string;
}

interface ProjectBase {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  garmentType: GarmentType;
  size: GarmentSize;
  difficulty: Difficulty;
  progress: ProjectProgress;
  source: ProjectSource;
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface YarnProject extends ProjectBase {
  craftType: YarnCraft;
  settings: YarnSettings;
  charts: YarnSavedChart[];
  pattern: Pattern | null;
}

export interface CrossStitchProject extends ProjectBase {
  craftType: "cross-stitch";
  settings: CrossStitchSettings;
  charts: CrossStitchSavedChart[];
  pattern: Pattern | null;
}

/**
 * A project owns its charts, its written pattern, its progress and its craft
 * settings. Nothing else persists: there is no free-floating chart and no
 * orphan pattern, which is what let the old model show a chart in the sidebar
 * whose project had been deleted.
 */
export type Project = YarnProject | CrossStitchProject;

export function isYarnProject(project: Project): project is YarnProject {
  return project.craftType !== "cross-stitch";
}

export function isCrossStitchProject(project: Project): project is CrossStitchProject {
  return project.craftType === "cross-stitch";
}

/* -------------------------------------------------------------------------- */
/* Wizard input                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What the create flow collects. Deliberately NOT a `Project`: it is unvalidated
 * user intent, it holds a `File` (which is not JSON-serialisable) and it is
 * never persisted.
 */
export interface WizardConfig {
  startingPoint: "text" | "photo-inspiration" | "photo-chart" | "import-chart" | null;
  imageFile: File | null;
  imagePreview: string | null;
  textDescription: string;
  craftType: CraftType;
  garmentType: GarmentType;
  size: GarmentSize;
  difficulty: Difficulty;
  fit: FitPreference;
  extraNotes: string;
  includeRibbing: boolean;
  stitchPreference: string;
  selectedColors: string[];
  colorLimit: number;
  /** Cross stitch only; ignored for yarn crafts. */
  crossStitch: CrossStitchSettings | null;
}
