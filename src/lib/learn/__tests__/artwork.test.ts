import { describe, expect, it } from "vitest";
import {
  LEARN_CRAFTS,
  lessonsForCraft,
  photoForLesson,
  type LearnEntry,
} from "../content";
import { learnDiagram } from "../diagrams";
import { diagramFor } from "@/lib/diagrams";

/**
 * Mirrors the page's resolution exactly: an inexact diagram is a craft-level
 * generic, identical for every lesson that falls back to it, so it is dropped.
 */
function artworkFor(lesson: LearnEntry): string | null {
  if (lesson.diagram.source === "learn") return learnDiagram(lesson.diagram.id) ?? null;
  const resolved = diagramFor(lesson.diagram.id);
  return resolved.exact ? resolved.svg || null : null;
}

describe("no lesson shows another lesson's picture", () => {
  // The reported bug: "half of the images are repeated". The old page resolved
  // 45 image slots to 28 files.
  it.each(LEARN_CRAFTS)("%s photos are one-to-one", (craft) => {
    const seen = new Map<string, string>();
    for (const lesson of lessonsForCraft(craft)) {
      const photo = photoForLesson(lesson);
      if (!photo) continue;
      const clash = seen.get(photo.key);
      expect(clash, `${lesson.id} reuses the photo from ${clash}`).toBeUndefined();
      seen.set(photo.key, lesson.id);
    }
  });

  it.each(LEARN_CRAFTS)("%s diagrams are one-to-one", (craft) => {
    const seen = new Map<string, string>();
    for (const lesson of lessonsForCraft(craft)) {
      const svg = artworkFor(lesson);
      if (!svg) continue;
      const clash = seen.get(svg);
      expect(clash, `${lesson.id} draws the same picture as ${clash}`).toBeUndefined();
      seen.set(svg, lesson.id);
    }
  });
});

describe("every photograph is usable", () => {
  it("carries an author, a licence and a source", () => {
    for (const craft of LEARN_CRAFTS) {
      for (const lesson of lessonsForCraft(craft)) {
        const photo = photoForLesson(lesson);
        if (!photo) continue;
        expect(photo.author, lesson.id).toBeTruthy();
        expect(photo.licence, lesson.id).toBeTruthy();
        expect(photo.licenceUrl, lesson.id).toMatch(/^https?:/);
        expect(photo.sourceUrl, lesson.id).toMatch(/^https?:/);
        expect(photo.url, lesson.id).toMatch(/^https?:/);
      }
    }
  });
});
