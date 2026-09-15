/**
 * Free patterns — the data model for the link directory.
 *
 * WHY THIS IS A DIRECTORY AND NOT A PATTERN LIBRARY
 * -------------------------------------------------
 * "Free to read" is not "free to redistribute". Every designer in this catalogue
 * publishes their pattern at no charge on their own site or in a free magazine;
 * none of them has licensed us to reproduce it. Knitty states the position
 * plainly at the foot of every pattern it publishes:
 *
 *     "Pattern & images (c) 2026 <designer>. All rights reserved.
 *      Reproduction prohibited."
 *
 * So this module stores FACTS about a pattern — title, designer, where it lives,
 * craft, garment, size, yarn weight, the published gauge, what techniques it
 * uses — and links out for the instructions. Facts are not copyrightable; the
 * pattern text is, and it is not here. There is no `instructions` field, no
 * `rows` field and no photograph field on `FreePattern`, deliberately: those are
 * the three shapes a well-meaning future edit would reach for, and leaving them
 * out is what makes the mistake unrepresentable rather than merely discouraged.
 *
 * This app has already had to clean up one licensing problem (see
 * `src/lib/diagrams/attribution.ts`, where ~20 Creative Commons photographs were
 * shipped with no credit line). The rule that came out of it holds here too: a
 * picture may only enter the app as a `PhotoCredit`, with a named author, a
 * licence, a licence URL and a link to the source. None of these patterns'
 * photographs can satisfy that, so the card art is a chart WE generate from the
 * design's own published gauge — clearly labelled as ours, not the designer's.
 *
 * WHAT "IMMEDIATELY ADD THEM FOR THE TRACKER" MEANS HERE
 * -----------------------------------------------------
 * Each entry carries exactly the structured data `draftGarment()` needs — craft,
 * garment, size, yarn weight and (where the designer published one) the gauge —
 * so `starterProjectFor()` in `./tracker` can hand the tracker a real project
 * with real stitch and row counts derived from the engine. That project is a
 * STARTING POINT drafted to the design's dimensions. It is not the designer's
 * pattern, and `./tracker` names it so in the project itself.
 */

import type { MotifKind } from "@/lib/motif";
import type {
  CycWeight,
  Difficulty,
  Gauge,
  GarmentSize,
  GarmentType,
  YarnCraft,
} from "@/types";

/** Where the free pattern actually lives, and when we last proved it loads. */
export interface PatternSourceRef {
  /** The site as a human names it, e.g. "Knitty" or "Tin Can Knits". */
  readonly site: string;
  /** Direct link to the free pattern. Never a scraped PDF, never a mirror. */
  readonly url: string;
  /**
   * ISO date on which this URL was fetched with curl and returned HTTP 200,
   * and the designer, craft and yarn weight below were read off the page.
   */
  readonly verified: string;
}

/**
 * One free pattern in the directory.
 *
 * Every field is either a fact read off the source page or our own editorial
 * classification. Nothing here is the designer's prose.
 */
export interface FreePattern {
  /** Stable slug. Used in URLs, as a motif seed, and as a React key. */
  readonly id: string;
  /** The design's name, as the designer titled it. A title is a fact, not prose. */
  readonly title: string;
  /** The named designer. Never blank — an uncredited pattern does not go in. */
  readonly designer: string;
  readonly source: PatternSourceRef;

  readonly craft: YarnCraft;
  readonly garment: GarmentType;
  /**
   * The size to draft the starting point in. Must satisfy
   * `garmentSupportsSize(garment, size)`; the catalogue test proves it does, so
   * `createProject` can never throw on an entry.
   */
  readonly size: GarmentSize;
  /** Our reading of the techniques the designer lists, not their own label. */
  readonly difficulty: Difficulty;
  /** CYC category of the yarn the designer calls for. */
  readonly cyc: CycWeight;
  /**
   * The gauge printed on the source page, where there is one. Left undefined
   * rather than guessed: `starterProjectFor` then falls back to the CYC
   * mid-range, which is honest about not knowing.
   */
  readonly gauge?: Gauge;

  /** Our own one-line factual description. Not the designer's blurb. */
  readonly summary: string;
  /** Techniques and materials, for search and for the card. */
  readonly tags: readonly string[];
  /** Which motif the generated starting chart should draw. */
  readonly motif: MotifKind;
}

export type { CycWeight, Difficulty, Gauge, GarmentSize, GarmentType, MotifKind, YarnCraft };
