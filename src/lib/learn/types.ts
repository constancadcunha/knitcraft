/**
 * src/lib/learn/types.ts — the content model for the Learn section.
 *
 * WHAT WENT WRONG BEFORE
 * ----------------------
 * The old Learn page was backed by `StitchEntry`, a ten-field record whose only
 * image field was a URL string. Because the model could not express "this is a
 * drawing of THIS stitch", 45 image slots collapsed onto 28 files and one photo
 * of flat stockinette ended up illustrating a decrease, an increase, short rows,
 * i-cord and a gauge swatch. A crochet slip-stitch photo illustrated a KNITTED
 * slipped stitch and, separately, a mattress seam.
 *
 * So the model here makes the failure unrepresentable in three ways:
 *
 *   1. `diagram` is a discriminated reference into a diagram library, not a URL.
 *      There is no way to write a string that happens to point at the wrong
 *      picture: an id either resolves to a drawing authored for this entry or
 *      the resolver throws. The Learn tests then assert that no two entries
 *      resolve to byte-identical SVG, which is exactly the check that would have
 *      caught the six-way Stockinette.jpg reuse on the first commit.
 *
 *   2. `photo` is optional, and its type carries the licence with it. A
 *      photograph is a supplement — "this is what real yarn does" — never the
 *      thing that carries correctness. ~20 CC BY images shipped with no credit
 *      line anywhere in the source tree; a `PhotoCredit` cannot exist without an
 *      author, a licence, a licence URL and a source URL.
 *
 *   3. `steps` is a required non-empty list of structured steps. The old data
 *      had 81 authored step cards that were all silently discarded by a
 *      `startsWith("http")` filter, because steps and images shared one field.
 *      They are separate fields here and the page cannot filter one away.
 *
 * TERMINOLOGY IS PART OF CORRECTNESS
 * ----------------------------------
 * US and UK crochet names are offset by one height: US double crochet is UK
 * treble. A reader who follows a UK pattern with US instructions gets fabric
 * that is a third too short and never finds out why. Every entry where the names
 * diverge carries a `terminology` note, and the model makes it a field rather
 * than a sentence buried in prose so the page can render it as a warning.
 */

import type { FabricKind, PhotoCredit } from "@/lib/diagrams";

/**
 * The three crafts the Learn section teaches.
 *
 * Deliberately NOT `CraftType` from `@/types`, which is the pattern engine's
 * two-value union ("knitting" | "crocheting"). Cross stitch has no gauge, no
 * yarn weight and no shaping, so it must never reach the knitwear maths; giving
 * Learn its own wider union keeps that boundary a compile error rather than a
 * runtime surprise. `toCraftType` below is the one sanctioned narrowing.
 */
export type LearnCraft = "knitting" | "crocheting" | "cross-stitch";

export const LEARN_CRAFTS: readonly LearnCraft[] = ["knitting", "crocheting", "cross-stitch"];

/** Display names. Cross stitch is two words as a noun, hyphenated as a modifier. */
export const CRAFT_LABELS: Record<LearnCraft, string> = {
  knitting: "Knitting",
  crocheting: "Crochet",
  "cross-stitch": "Cross stitch",
};

/**
 * Five rungs, chosen so that each one names a real change in what the hands are
 * doing rather than a vague "intermediate".
 */
export type Difficulty = "first-hour" | "beginner" | "confident" | "adventurous" | "advanced";

export const DIFFICULTIES: readonly Difficulty[] = [
  "first-hour",
  "beginner",
  "confident",
  "adventurous",
  "advanced",
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  "first-hour": "First hour",
  beginner: "Beginner",
  confident: "Confident",
  adventurous: "Adventurous",
  advanced: "Advanced",
};

/** Sort key. Exported so the page and the curriculum agree on the ordering. */
export function difficultyRank(level: Difficulty): number {
  return DIFFICULTIES.indexOf(level);
}

/**
 * What kind of thing an entry is. The page uses this to choose a card shape;
 * the curriculum uses it to avoid opening a path with a reference table.
 *
 *   stitch     — a stitch you work, with a fabric it produces.
 *   technique  — a manoeuvre: casting on, seaming, starting a thread.
 *   reference  — a table or a rule you look up: yarn weights, abbreviations.
 *   concept    — something to understand rather than do: gauge, fabric count.
 */
export type EntryKind = "stitch" | "technique" | "reference" | "concept";

/**
 * One step of a how-to.
 *
 * `n` is assigned by `steps()` below rather than typed by hand — the old data
 * had numbered step cards built by 81 separate `S(1, ...)`, `S(2, ...)` calls,
 * which is exactly the shape that lets a "step 2, step 2, step 4" through.
 */
export interface LessonStep {
  /** 1-based, contiguous, assigned by the `steps` helper. */
  n: number;
  /** One action, imperative mood. */
  text: string;
  /** WHY the step is done this way — what tutorials leave out. */
  note?: string;
}

/** Build a contiguous, correctly-numbered step list. */
export function steps(
  items: ReadonlyArray<string | { text: string; note?: string }>,
): readonly LessonStep[] {
  return items.map((item, i) =>
    typeof item === "string" ? { n: i + 1, text: item } : { n: i + 1, text: item.text, note: item.note },
  );
}

/**
 * Where an entry's drawing comes from. A discriminated union rather than a
 * string, so "which library owns this id" is answered at the type level.
 *
 *   stitch    — a hand-authored stitch drawing in src/lib/diagrams.
 *   technique — a numbered step sequence in src/lib/diagrams.
 *   fabric    — a procedural texture tile in src/lib/diagrams.
 *   learn     — authored in src/lib/learn/diagrams.ts, for everything the
 *               shared library has no drawing for (all of cross stitch, plus
 *               the knitting and crochet gaps the audit listed).
 */
export type DiagramRef =
  | { source: "stitch"; id: string }
  | { source: "technique"; id: string }
  | { source: "fabric"; id: FabricKind }
  | { source: "learn"; id: string };

/**
 * A photograph, always paired with the reason it earns its place. A drawing can
 * show a hand movement exactly; only a photograph can show how real yarn or real
 * fabric behaves, so `why` has to say which of those two jobs it is doing.
 */
export interface LearnPhoto {
  credit: PhotoCredit;
  /** Caption shown under the image. Describes what is actually in frame. */
  caption: string;
  /** Why a photo rather than a diagram — the editorial justification. */
  why: string;
}

/**
 * US/UK divergence. Crochet is the dangerous one (US dc = UK tr), but knitting
 * has its own traps (UK "tension" = US "gauge", UK needle numbering runs
 * backwards) and cross stitch has a few (UK "thread" vs US "floss").
 */
export interface TerminologyNote {
  /** The US name, which is what this app's instructions use throughout. */
  us: string;
  /** The UK name for the SAME physical stitch. */
  uk: string;
  /** What goes wrong if the two are confused. Always concrete. */
  consequence: string;
}

/** Measurable facts about the fabric a stitch pattern makes. */
export interface FabricFacts {
  /** Stitch multiple, e.g. "multiple of 2" or "multiple of 6 + 1". */
  multiple?: string;
  /** Rows or rounds in one vertical repeat. */
  rowRepeat?: number;
  /** Does it look the same on both sides? */
  reversible?: boolean;
  /** Does the fabric curl at the edges without a border? */
  curls?: boolean;
  /** Relative stretch, for choosing cuffs and hems. */
  stretch?: "none" | "low" | "medium" | "high";
}

/** A small lookup table rendered inside a reference entry. */
export interface LearnTable {
  caption: string;
  columns: readonly string[];
  /** Each row has exactly `columns.length` cells — asserted by the tests. */
  rows: readonly (readonly string[])[];
  /** Where the numbers come from. Required: an uncited table is a rumour. */
  source: string;
}

/**
 * One Learn entry. Ids are unique across ALL crafts, so a related-entry link
 * never needs to say which craft it means, and a deep link cannot be ambiguous.
 */
export interface LearnEntry {
  id: string;
  craft: LearnCraft;
  kind: EntryKind;
  name: string;
  /**
   * The abbreviation as it appears in a written pattern. Unique within a craft
   * — the tests enforce it — because the search index resolves an abbreviation
   * typed by a reader straight to one entry.
   */
  abbreviation?: string;
  /** Other names, UK names, common misspellings. Search matches these too. */
  aka?: readonly string[];
  /** One sentence. Shown on the card. */
  summary: string;
  /** What the finished fabric or stitch looks like. */
  appearance: string;
  /** When to reach for it. */
  useFor: string;
  difficulty: Difficulty;
  /** Lower-case, hyphenated. Used by search facets. */
  tags: readonly string[];
  /** Entry ids that should be learned first. Must form a DAG. */
  prerequisites: readonly string[];
  /** Entry ids worth reading next. May be cross-craft. */
  related: readonly string[];
  /** Symbol id in src/lib/chart/symbols.ts, where the stitch has one. */
  chartSymbol?: string;
  /** The how-to. Never empty. */
  steps: readonly LessonStep[];
  /** What goes wrong, and how to recognise it in your own work. */
  pitfalls?: readonly string[];
  terminology?: TerminologyNote;
  fabric?: FabricFacts;
  table?: LearnTable;
  diagram: DiagramRef;
  photo?: LearnPhoto;
  /** Where the instruction was checked. At least one. */
  sources: readonly string[];
}

/**
 * Narrow a Learn craft to the pattern engine's `CraftType`. Returns undefined
 * for cross stitch, which has no representation there — callers must handle it
 * rather than defaulting to knitting, which is how a crochet slip stitch came to
 * illustrate a knitted one.
 */
export function toCraftType(craft: LearnCraft): "knitting" | "crocheting" | undefined {
  if (craft === "knitting") return "knitting";
  if (craft === "crocheting") return "crocheting";
  return undefined;
}
