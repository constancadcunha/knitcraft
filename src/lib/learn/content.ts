/**
 * The Learn section's content index.
 *
 * Assembled from two sources that already exist and are tested:
 *   - STITCH_LIBRARY in src/lib/craftKnowledge: 31 stitches with real teaching
 *     text (appearance, what it is for, how to work it)
 *   - src/lib/learn/diagrams: 53 hand-drawn pixel diagrams covering techniques,
 *     reference tables, and the whole cross-stitch curriculum
 *
 * Every image is drawn by us. The photographs the old page used are gone: ~20
 * were CC BY shown with no attribution and 12 were hotlinked from an
 * all-rights-reserved site, and 45 slots resolved to only 28 distinct files —
 * so a knitted slipped stitch was illustrated with a crochet photograph.
 */

import { STITCH_LIBRARY } from "@/lib/craftKnowledge";
import {
  LEARN_DIAGRAM_IDS,
  learnDiagramCaption,
  learnDiagramTitle,
} from "@/lib/learn/diagrams";

export type LearnCraft = "knitting" | "crocheting" | "cross-stitch";

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

export interface StitchLesson {
  kind: "stitch";
  id: string;
  craft: LearnCraft;
  name: string;
  abbreviation: string;
  appearance: string;
  useFor: string;
  tutorial: string;
  videoQuery: string;
}

export interface TopicLesson {
  kind: "topic";
  id: string;
  craft: LearnCraft;
  name: string;
  /** Caption lines from the diagram, used as the lesson body. */
  points: readonly string[];
}

export type Lesson = StitchLesson | TopicLesson;

const STITCH_LESSONS: StitchLesson[] = STITCH_LIBRARY.map((entry) => ({
  kind: "stitch",
  id: entry.id,
  craft: entry.craftType as LearnCraft,
  name: entry.name,
  abbreviation: entry.abbreviation,
  appearance: entry.appearance,
  useFor: entry.useFor,
  tutorial: entry.tutorial,
  videoQuery: entry.videoQuery,
}));

const TOPIC_LESSONS: TopicLesson[] = LEARN_DIAGRAM_IDS.flatMap((id) => {
  const craft = craftOfDiagram(id);
  const name = learnDiagramTitle(id);
  if (!craft || !name) return [];
  return [{ kind: "topic", id, craft, name, points: learnDiagramCaption(id) ?? [] }];
});

export const ALL_LESSONS: readonly Lesson[] = [...STITCH_LESSONS, ...TOPIC_LESSONS];

export function lessonsForCraft(craft: LearnCraft): Lesson[] {
  return ALL_LESSONS.filter((lesson) => lesson.craft === craft);
}

/** Free-text search across names, abbreviations and body text. */
export function searchLessons(lessons: readonly Lesson[], query: string): Lesson[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...lessons];
  return lessons.filter((lesson) => {
    if (lesson.name.toLowerCase().includes(needle)) return true;
    if (lesson.kind === "stitch") {
      return (
        lesson.abbreviation.toLowerCase().includes(needle) ||
        lesson.appearance.toLowerCase().includes(needle) ||
        lesson.useFor.toLowerCase().includes(needle) ||
        lesson.tutorial.toLowerCase().includes(needle)
      );
    }
    return lesson.points.some((p) => p.toLowerCase().includes(needle));
  });
}

export function countsByCraft(): Record<LearnCraft, number> {
  return {
    knitting: lessonsForCraft("knitting").length,
    crocheting: lessonsForCraft("crocheting").length,
    "cross-stitch": lessonsForCraft("cross-stitch").length,
  };
}
