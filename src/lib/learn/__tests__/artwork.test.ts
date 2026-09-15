import { describe, expect, it } from "vitest";
import {
  LEARN_CRAFTS,
  lessonsForCraft,
  photoForLesson,
  type LearnEntry,
} from "../content";
import { artworkFor, thumbnailFor } from "../artworkFor";

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
      const svg = thumbnailFor(lesson);
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

describe("every lesson has a picture of its own", () => {
  it.each(LEARN_CRAFTS)("%s: nothing is left blank", (craft) => {
    for (const lesson of lessonsForCraft(craft)) {
      const hasArt = Boolean(photoForLesson(lesson)) || Boolean(artworkFor(lesson));
      expect(hasArt, `${lesson.id} has no photo and no diagram`).toBe(true);
    }
  });

  it("routes a technique lesson to its step sequence, not a generic swatch", () => {
    // Five technique lessons were falling through to a craft-level generic
    // because the resolver only knew stitch ids, so all five showed the same
    // picture while a distinct step-by-step diagram already existed for each.
    for (const id of ["bind-off", "gauge-swatch", "blocking", "mattress-seam", "patch-pockets"]) {
      const lesson = lessonsForCraft("knitting").find((l) => l.id === id);
      expect(lesson, id).toBeDefined();
      const art = artworkFor(lesson as LearnEntry);
      expect(art?.steps?.length, `${id} should have steps`).toBeGreaterThan(0);
    }
  });
});
