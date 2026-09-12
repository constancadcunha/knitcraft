/**
 * Resolving a lesson's artwork.
 *
 * `DiagramRef` carries a SOURCE as well as an id, and each source lives in a
 * different module. Routing everything through `diagramFor` (which only knows
 * stitch ids) meant five technique lessons — bind off, gauge swatch, blocking,
 * mattress seam, patch pockets — silently fell through to a craft-level
 * generic, so all five showed the same picture even though a distinct
 * step-by-step diagram already existed for each of them.
 */

import {
  diagramFor,
  fabricFor,
  techniqueDiagram,
  type RenderedStep,
} from "@/lib/diagrams";
import { learnDiagram } from "@/lib/learn/diagrams";
import type { LearnEntry } from "@/lib/learn/types";

export interface LessonArtwork {
  /** A single drawing, when the lesson has one. */
  svg?: string;
  /** A numbered sequence, when the technique is taught as steps. */
  steps?: RenderedStep[];
}

export function artworkFor(lesson: LearnEntry): LessonArtwork | null {
  const ref = lesson.diagram;

  switch (ref.source) {
    case "technique": {
      const technique = techniqueDiagram(ref.id);
      // A step sequence teaches a technique far better than one picture.
      return technique?.steps.length ? { steps: technique.steps } : null;
    }
    case "learn": {
      const svg = learnDiagram(ref.id);
      return svg ? { svg } : null;
    }
    case "fabric": {
      const resolved = fabricFor(ref.id);
      return resolved.svg ? { svg: resolved.svg } : null;
    }
    case "stitch":
    default: {
      const resolved = diagramFor(ref.id);
      // An inexact match is a craft-level generic, identical for everything
      // that falls back to it — showing it would repeat a picture across
      // unrelated lessons, which is the bug this module exists to prevent.
      return resolved.exact && resolved.svg ? { svg: resolved.svg } : null;
    }
  }
}

/** The single image to show on a card: the drawing, or the first step. */
export function thumbnailFor(lesson: LearnEntry): string | null {
  const art = artworkFor(lesson);
  if (!art) return null;
  return art.svg ?? art.steps?.[0]?.svg ?? null;
}
