/**
 * The Learn section's content index.
 *
 * Three sources, in order of richness:
 *   1. `entries/` — fully written lessons: numbered steps, prerequisites,
 *      pitfalls, sources. This is the real curriculum.
 *   2. `diagrams.ts` — 53 hand-drawn pixel diagrams covering techniques and
 *      reference topics, including the whole cross-stitch syllabus. Where no
 *      written entry exists yet, the diagram and its captions still teach.
 *   3. `craftKnowledge.ts` — the legacy stitch list, used only for crafts that
 *      have no written entries yet.
 *
 * Every image is drawn by us. The photographs the old page used are gone: ~20
 * were CC BY shown with no attribution, 12 were hotlinked from an
 * all-rights-reserved site, and 45 slots resolved to 28 files — so a knitted
 * slipped stitch was illustrated with a crochet photograph.
 */

import { STITCH_LIBRARY } from "@/lib/craftKnowledge";
import {
  LEARN_DIAGRAM_IDS,
  learnDiagramCaption,
  learnDiagramTitle,
} from "@/lib/learn/diagrams";
import { KNITTING_ENTRIES } from "@/lib/learn/entries/knitting";
import { photoCredit, type PhotoCredit } from "@/lib/diagrams";
import type { LearnCraft, LearnEntry } from "@/lib/learn/types";

export type { LearnCraft, LearnEntry } from "@/lib/learn/types";
export { DIFFICULTY_LABELS, DIFFICULTIES } from "@/lib/learn/types";

export const LEARN_CRAFTS: readonly LearnCraft[] = [
  "knitting",
  "crocheting",
  "cross-stitch",
];

export const CRAFT_LABEL: Record<LearnCraft, string> = {
  knitting: "Knitting",
  crocheting: "Crochet",
  "cross-stitch": "Cross stitch",
};

/** Diagram ids are prefixed by craft: k- knitting, c- crochet, x- cross stitch. */
function craftOfDiagram(id: string): LearnCraft | null {
  if (id.startsWith("k-")) return "knitting";
  if (id.startsWith("c-")) return "crocheting";
  if (id.startsWith("x-")) return "cross-stitch";
  return null;
}

/** The crafts that already have fully written lessons. */
const WRITTEN: Record<LearnCraft, readonly LearnEntry[]> = {
  knitting: KNITTING_ENTRIES,
  crocheting: [],
  "cross-stitch": [],
};

/**
 * A lesson built from a diagram alone: the title and captions the diagram was
 * drawn with. Less than a written entry, but accurate and never a placeholder.
 */
function fromDiagram(id: string, craft: LearnCraft): LearnEntry | null {
  const name = learnDiagramTitle(id);
  if (!name) return null;
  const points = learnDiagramCaption(id) ?? [];
  return {
    id,
    craft,
    kind: "reference",
    name,
    summary: points[0] ?? name,
    appearance: "",
    useFor: "",
    difficulty: "beginner",
    tags: [],
    prerequisites: [],
    related: [],
    steps: points.map((text, i) => ({ n: i + 1, text })),
    diagram: { source: "learn", id },
    sources: [],
  };
}

/** A lesson built from the legacy stitch list, for crafts not yet rewritten. */
function fromLegacy(entry: (typeof STITCH_LIBRARY)[number]): LearnEntry {
  return {
    id: entry.id,
    craft: entry.craftType as LearnCraft,
    kind: "stitch",
    name: entry.name,
    abbreviation: entry.abbreviation,
    summary: entry.appearance,
    appearance: entry.appearance,
    useFor: entry.useFor,
    difficulty: "beginner",
    tags: [],
    prerequisites: [],
    related: [],
    steps: entry.tutorial.split(/(?<=[.!?])\s+/).filter(Boolean).map((text, i) => ({ n: i + 1, text })),
    diagram: { source: "stitch", id: entry.id },
    sources: entry.sourceUrl ? [entry.sourceUrl] : [],
  };
}

function buildAll(): LearnEntry[] {
  const out: LearnEntry[] = [];
  const seen = new Set<string>();

  const take = (entry: LearnEntry | null) => {
    if (!entry) return;
    const key = `${entry.craft}:${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  for (const craft of LEARN_CRAFTS) for (const entry of WRITTEN[craft]) take(entry);

  // Legacy stitches only fill crafts with nothing written yet, so a rewritten
  // knitting lesson is never shadowed by its thinner predecessor.
  for (const entry of STITCH_LIBRARY) {
    const craft = entry.craftType as LearnCraft;
    if (WRITTEN[craft]?.length) continue;
    take(fromLegacy(entry));
  }

  for (const id of LEARN_DIAGRAM_IDS) {
    const craft = craftOfDiagram(id);
    if (craft) take(fromDiagram(id, craft));
  }

  return out;
}

export const ALL_LESSONS: readonly LearnEntry[] = buildAll();

export function lessonsForCraft(craft: LearnCraft): LearnEntry[] {
  return ALL_LESSONS.filter((lesson) => lesson.craft === craft);
}

export function lessonById(id: string): LearnEntry | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === id);
}

/** Free-text search across names, abbreviations, aka, tags and body text. */
export function searchLessons(
  lessons: readonly LearnEntry[],
  query: string
): LearnEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...lessons];
  return lessons.filter((lesson) => {
    const haystack = [
      lesson.name,
      lesson.abbreviation ?? "",
      lesson.summary,
      lesson.appearance,
      lesson.useFor,
      ...(lesson.aka ?? []),
      ...lesson.tags,
      ...lesson.steps.map((s) => s.text),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function countsByCraft(): Record<LearnCraft, number> {
  return {
    knitting: lessonsForCraft("knitting").length,
    crocheting: lessonsForCraft("crocheting").length,
    "cross-stitch": lessonsForCraft("cross-stitch").length,
  };
}

/** True when a lesson carries the full written treatment rather than captions. */
export function isWritten(lesson: LearnEntry): boolean {
  return lesson.sources.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Photographs                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A lesson's photograph, when one exists.
 *
 * A drawing shows a hand movement exactly; only a photograph shows how real
 * yarn behaves. So both are used: the photo is the hero and the diagram
 * explains the motion beneath it.
 *
 * Every photo comes from the curated, licence-verified set and is rendered with
 * its credit line — the old page showed ~20 CC BY images with no attribution
 * at all, which is what made them a problem, not the photographs themselves.
 */
/**
 * Lesson id -> curated photo key.
 *
 * STRICTLY ONE PHOTO PER LESSON, and one lesson per photo. Reusing a picture
 * across entries is the exact failure being fixed: the old page resolved 45
 * slots to 28 files, so six unrelated stitches all showed the same swatch and
 * a knitted slip stitch was illustrated with a crochet photograph. A test
 * enforces the uniqueness.
 */
const PHOTO_KEYS: Record<string, string> = {
  // knitting
  "cast-on": "cast-on",
  knit: "knit-purl-anatomy",
  stockinette: "stockinette",
  garter: "garter",
  ribbing: "ribbing",
  cable: "cable",
  brioche: "brioche",
  "stranded-colourwork": "stranded-colourwork",
  lace: "lace",
  "yarn-over": "yarn-over",
  "short-rows": "short-rows",
  "slipped-stitch": "slipped-stitch",
  "picking-up-stitches": "picking-up-stitches",
  kitchener: "grafting",
  "reading-flat-charts": "knit-chart-symbols",
  "k-dropped-stitch": "slipped-stitch-mistake",
  // crochet
  "granny-square": "granny-square",
  "v-stitch": "v-stitch",
  "working-in-the-round": "working-in-the-round",
  "foundation-chain": "foundation-chain",
  "c-us-uk-terms": "crochet-terms-us-uk",
};

export function photoForLesson(lesson: LearnEntry): PhotoCredit | undefined {
  const key = PHOTO_KEYS[lesson.id];
  return key ? photoCredit(key) : undefined;
}
