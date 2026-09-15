/**
 * "The stitches you may need to learn", derived from the chart you are about to
 * be handed.
 *
 * The user: "you deleted the options when you first start doing a project of
 * the material you need, the stitches you may need to learn etc but that is SO
 * needed and necessary."
 *
 * The list is DERIVED, never authored: it is exactly the symbols the drafted
 * charts actually use, in legend order, mapped to the Learn lesson that teaches
 * each one. That is the same rule `buildLegend` follows, and for the same
 * reason — a list of stitches that is maintained by hand drifts away from the
 * chart, and then it teaches the wrong thing.
 */

import { buildSymbolLegend, getSymbol, type SymbolChart } from "@/lib/chart";
import { ALL_LESSONS } from "@/lib/learn/content";
import type { LearnEntry } from "@/lib/learn/types";
import type { YarnCraft } from "@/types";

export interface StitchToLearn {
  symbolId: string;
  /** The catalogue name: "Knit", "Slip, slip, knit". */
  name: string;
  abbreviation: string;
  /** What it does, from the symbol catalogue. */
  instruction: string;
  /** The lesson that teaches it, when Learn has one. */
  lesson?: LearnEntry;
}

/**
 * Find the lesson for a chart symbol.
 *
 * `chartSymbol` on a lesson is the authoritative link and is tried first. The
 * abbreviation is the fallback, matched only within the same craft: "dc" is a
 * double crochet in one craft and nothing at all in the other, and a cross-
 * stitch lesson must never be offered for a knitted stitch.
 */
export function lessonForSymbol(symbolId: string, craft: YarnCraft): LearnEntry | undefined {
  const direct = ALL_LESSONS.find((lesson) => lesson.chartSymbol === symbolId);
  if (direct) return direct;

  const symbol = getSymbol(symbolId);
  if (!symbol) return undefined;
  const abbr = symbol.abbreviation.toLowerCase();

  return ALL_LESSONS.find(
    (lesson) =>
      lesson.craft === craft &&
      (lesson.abbreviation?.toLowerCase() === abbr ||
        lesson.name.toLowerCase() === symbol.name.toLowerCase())
  );
}

/** Where the Learn page should open for a lesson. */
export function lessonHref(lesson: LearnEntry | undefined): string {
  return lesson ? `/learn?craft=${encodeURIComponent(lesson.craft)}&lesson=${encodeURIComponent(lesson.id)}` : "/learn";
}

/**
 * Every stitch used across the drafted pieces, deduplicated, in legend order
 * (basics first, then increases, decreases, cables, specials).
 */
export function stitchesToLearn(charts: readonly SymbolChart[], craft: YarnCraft): StitchToLearn[] {
  const out: StitchToLearn[] = [];
  const seen = new Set<string>();

  for (const chart of charts) {
    for (const entry of buildSymbolLegend(chart)) {
      if (seen.has(entry.symbolId)) continue;
      seen.add(entry.symbolId);
      const symbol = getSymbol(entry.symbolId);
      out.push({
        symbolId: entry.symbolId,
        name: entry.label,
        abbreviation: entry.abbreviation,
        instruction: symbol?.rs.instruction ?? entry.description,
        lesson: lessonForSymbol(entry.symbolId, craft),
      });
    }
  }

  return out;
}
