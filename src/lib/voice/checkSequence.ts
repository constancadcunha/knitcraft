/**
 * Checking spoken stitches against the chart.
 *
 * Counting aloud already works: say "knit, purl, knit" and three stitches are
 * marked. But the chart knows what those three stitches were SUPPOSED to be, so
 * it can say when they diverge.
 *
 * This matters because of how knitting mistakes are discovered. A misplaced
 * purl is invisible until the fabric is held up rows later, at which point the
 * only fix is to rip back. Catching it at the stitch it happened turns a
 * ruined evening into a two-second correction.
 *
 * It is advisory, never blocking: the count always advances. A knitter who is
 * deliberately deviating, or whose recogniser misheard, must not be stopped.
 */

import {
  rowGroupsInReadingOrder,
  rowSide,
  workedForm,
  type SymbolChart,
} from "@/lib/chart";
import type { StitchCall } from "./stitchWords";

/** Spoken stitch id -> the chart symbol ids that satisfy it. */
const SPOKEN_TO_SYMBOLS: Record<string, string[]> = {
  knit: ["k", "ktbl"],
  purl: ["p", "ptbl"],
  "yarn-over": ["yo"],
  k2tog: ["k2tog"],
  ssk: ["ssk"],
  slip: ["sl1"],
  m1: ["m1l", "m1r"],
  kfb: ["kfb"],
  bobble: ["bobble"],
  // Any crossing satisfies a spoken "cable" — a knitter says "cable", not
  // "two over two right cross".
  cable: ["1/1 RC", "1/1 LC", "2/1 RC", "2/1 LC", "2/2 RC", "2/2 LC", "3/3 RC", "3/3 LC"],
  chain: ["ch"],
  "single-crochet": ["sc"],
  "half-double-crochet": ["hdc"],
  "double-crochet": ["dc"],
  "treble-crochet": ["tr"],
  "slip-stitch-crochet": ["slst"],
  cluster: ["cl3"],
  shell: ["shell5"],
  picot: ["picot"],
};

export interface StitchComparison {
  /** Position in the row, 0-based from the start of the row as worked. */
  position: number;
  expectedAbbr: string;
  heardAbbr: string;
  matches: boolean;
}

export interface SequenceCheck {
  comparisons: StitchComparison[];
  /** True when every spoken stitch matched what the chart expects. */
  ok: boolean;
  /** The first divergence, if any — what to tell the knitter about. */
  firstMismatch?: StitchComparison;
  /** Human-readable, ready to speak aloud. */
  message?: string;
  /** False when the chart could not say what to expect (past the row's end). */
  checked: boolean;
}

/**
 * Compare a run of spoken stitches against the chart.
 *
 * `startStitch` is how many stitches of the row are already worked, so the
 * comparison starts at the right place. Reading order is handled by the chart
 * module: right-side rows read right to left, wrong-side rows left to right,
 * and a symbol's meaning flips with the side it is worked from.
 */
export function checkSequence(
  chart: SymbolChart,
  rowIndex: number,
  startStitch: number,
  calls: readonly StitchCall[]
): SequenceCheck {
  if (!calls.length) return { comparisons: [], ok: true, checked: false };

  const side = rowSide(chart, rowIndex);
  const groups = rowGroupsInReadingOrder(chart, rowIndex);
  if (!groups.length) return { comparisons: [], ok: true, checked: false };

  // Expand groups into one entry per stitch consumed, so a 4-stitch cable
  // occupies four positions and the count stays aligned with the knitter's.
  const expected: Array<{ abbr: string; symbolId: string }> = [];
  for (const group of groups) {
    const symbol = group.symbol;
    if (!symbol) continue;
    const form = workedForm(symbol, side);
    const consumed = Math.max(1, symbol.stitchesConsumed);
    for (let i = 0; i < consumed; i += 1) {
      expected.push({ abbr: form.abbr, symbolId: symbol.id });
    }
  }

  const comparisons: StitchComparison[] = [];
  for (let i = 0; i < calls.length; i += 1) {
    const position = startStitch + i;
    const want = expected[position];
    // Past the end of the row: nothing to compare against.
    if (!want) break;

    const allowed = SPOKEN_TO_SYMBOLS[calls[i].stitch] ?? [];
    comparisons.push({
      position,
      expectedAbbr: want.abbr,
      heardAbbr: calls[i].abbr,
      matches: allowed.includes(want.symbolId),
    });
  }

  const firstMismatch = comparisons.find((c) => !c.matches);
  return {
    comparisons,
    ok: !firstMismatch,
    checked: comparisons.length > 0,
    firstMismatch,
    message: firstMismatch
      ? `Stitch ${firstMismatch.position + 1} should be ${firstMismatch.expectedAbbr}, not ${firstMismatch.heardAbbr}.`
      : undefined,
  };
}
