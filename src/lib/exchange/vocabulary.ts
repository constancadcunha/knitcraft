/**
 * Written stitch names -> chart symbols.
 *
 * This is the INVERSE of `src/lib/chart/toInstructions.ts`, and it has to
 * respect the same two facts that module does, or an imported pattern comes
 * back mirrored:
 *
 *  1. A chart symbol describes the RIGHT-SIDE appearance of a stitch. On a
 *     wrong-side row the knitter works the opposite stitch, so the word "p" on
 *     a WS row means the chart symbol `k`. There is therefore one lookup table
 *     PER SIDE, built from `workedForm(symbol, side).abbr`.
 *
 *  2. Nothing here may invent a stitch. If a word is not in the catalogue the
 *     caller is told so and the fragment is reported, never quietly replaced
 *     with a knit. A silently-substituted stitch is how an imported pattern
 *     stops matching the garment it came from.
 *
 * Aliases are admitted on top of the per-side abbreviations, but only where
 * they cannot change meaning — see `buildTable`.
 */

import {
  type ChartCraft,
  type RowSide,
  type StitchSymbol,
  symbolsForCraft,
  workedForm,
} from "@/lib/chart";

/**
 * Fold a written stitch name to a comparison key: lower case, no spaces, no
 * full stops. "k1 tbl" -> "k1tbl", "sl st" -> "slst", "2/2 RC" -> "2/2rc".
 * Digits and slashes survive because they carry meaning in cable names.
 */
export function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/[\s.]+/g, "");
}

export interface SymbolLookup {
  symbol: StitchSymbol;
  /**
   * True when the text named the CHART SYMBOL rather than this side's actual
   * working — "k2tog" written on a wrong-side row, where the knitter would
   * really write "p2tog". The reading is defensible (a symbol id names a
   * symbol) but it is not what the words say, so the caller must surface it.
   */
  crossSide: boolean;
}

/**
 * Long-hand names people write out in full, mapped to the abbreviation they
 * stand for. These go through the per-side table afterwards, so "knit" on a
 * wrong-side row correctly resolves to the PURL chart symbol — which is what a
 * garter-stitch pattern means when it says "Row 2 (WS): knit".
 */
const WORD_SYNONYMS: Record<string, string> = {
  knit: "k",
  knitstitch: "k",
  purl: "p",
  purlstitch: "p",
  yarnover: "yo",
  yon: "yo",
  yrn: "yo",
  makeoneleft: "m1L",
  makeoneright: "m1R",
  knitfrontandback: "kfb",
  slipstitch: "sl st",
  slip: "sl1",
  slipone: "sl1",
  chain: "ch",
  singlecrochet: "sc",
  halfdoublecrochet: "hdc",
  doublecrochet: "dc",
  treblecrochet: "tr",
  triplecrochet: "tr",
  doubletreble: "dtr",
  doubletreblecrochet: "dtr",
  magicring: "MR",
  magiccircle: "MR",
  makebobble: "MB",
  bobble: "MB",
  centraldoubledecrease: "cdd",
  nostitch: "—",
};

/**
 * The lookup table for one craft and one side of the fabric.
 *
 * Filled in two passes so the more specific reading always wins:
 *
 *   PASS 1 — this side's own working. `p` -> the knit symbol on a WS row.
 *            These are authoritative and can never be displaced.
 *   PASS 2 — the symbol's id and canonical abbreviation, added only where the
 *            key is still free. A free key means no real working is spelled
 *            that way on this side, so reading it as the symbol's name is the
 *            only sense it could carry. Where that name differs from this
 *            side's working the entry is flagged `crossSide` and the importer
 *            reports it rather than acting as though the words were plain.
 */
function buildTable(craft: ChartCraft, side: RowSide): Map<string, SymbolLookup> {
  const table = new Map<string, SymbolLookup>();
  const symbols = symbolsForCraft(craft);

  for (const symbol of symbols) {
    table.set(normalizeToken(workedForm(symbol, side).abbr), { symbol, crossSide: false });
  }

  for (const symbol of symbols) {
    const worked = normalizeToken(workedForm(symbol, side).abbr);
    for (const alias of [symbol.id, symbol.abbreviation]) {
      const key = normalizeToken(alias);
      if (!key || table.has(key)) continue;
      // "sl1" for "sl1 wyif" is the same stitch under a shorter name, so it is
      // not a cross-side reading; "k2tog" on a WS row is.
      table.set(key, { symbol, crossSide: !worked.startsWith(key) });
    }
  }

  return table;
}

const TABLES = new Map<string, Map<string, SymbolLookup>>();

function tableFor(craft: ChartCraft, side: RowSide): Map<string, SymbolLookup> {
  const key = `${craft}:${side}`;
  const existing = TABLES.get(key);
  if (existing) return existing;
  const built = buildTable(craft, side);
  TABLES.set(key, built);
  return built;
}

/** Resolve one bare stitch name (no count, no brackets) on a given side. */
export function lookupStitch(
  text: string,
  craft: ChartCraft,
  side: RowSide,
): SymbolLookup | null {
  const key = normalizeToken(text);
  if (!key) return null;
  const direct = tableFor(craft, side).get(key);
  if (direct) return direct;
  const synonym = WORD_SYNONYMS[key];
  return synonym ? (tableFor(craft, side).get(normalizeToken(synonym)) ?? null) : null;
}

/**
 * Would this name have resolved on the OTHER side of the fabric? Used only to
 * write a better message: "p2tog" on a row we have marked RS is almost always a
 * mislabelled row rather than a stitch we do not know.
 */
export function resolvesOnOtherSide(
  text: string,
  craft: ChartCraft,
  side: RowSide,
): boolean {
  const other: RowSide = side === "RS" ? "WS" : "RS";
  return lookupStitch(text, craft, side) === null && lookupStitch(text, craft, other) !== null;
}

export interface CountedStitch extends SymbolLookup {
  /** How many times in a row this stitch is worked. */
  count: number;
}

/**
 * Parse one instruction fragment — "k2", "5 sc", "ch 5", "2/2 RC", "k2tog" —
 * into a stitch and a repeat count.
 *
 * The whole fragment is tried against the catalogue FIRST. That ordering is
 * what keeps "k2tog" a decrease instead of two knits followed by a stray "tog",
 * and "sl1" a slipped stitch instead of "sl" repeated once.
 */
export function parseStitchFragment(
  text: string,
  craft: ChartCraft,
  side: RowSide,
): CountedStitch | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const whole = lookupStitch(trimmed, craft, side);
  if (whole) return { ...whole, count: 1 };

  // US crochet writes the count in front: "5 sc", "3 dc".
  const prefixed = /^(\d+)\s*(?:x\s*)?(.+)$/.exec(trimmed);
  if (prefixed) {
    const found = lookupStitch(prefixed[2], craft, side);
    const count = Number(prefixed[1]);
    if (found && count > 0) return { ...found, count };
  }

  // Knitting writes it behind: "k2", "p12", "ch 5".
  const suffixed = /^(.+?)\s*(\d+)$/.exec(trimmed);
  if (suffixed) {
    const found = lookupStitch(suffixed[1], craft, side);
    const count = Number(suffixed[2]);
    if (found && count > 0) return { ...found, count };
  }

  return null;
}

/**
 * Which craft a block of pattern text is written in.
 *
 * Decided by counting words that belong to exactly one craft's catalogue: "dc"
 * and "ch" are crochet, "ssk" and "yo" are knitting. Ties go to knitting, which
 * is what the app defaults to elsewhere, and the caller can always override.
 */
export function sniffCraft(text: string): ChartCraft {
  const words = text.toLowerCase().match(/[a-z0-9/]+/g) ?? [];
  let knitting = 0;
  let crochet = 0;
  for (const word of words) {
    const inKnit = lookupStitch(word, "knitting", "RS") !== null;
    const inCrochet = lookupStitch(word, "crocheting", "RS") !== null;
    if (inKnit && !inCrochet) knitting += 1;
    if (inCrochet && !inKnit) crochet += 1;
  }
  return crochet > knitting ? "crocheting" : "knitting";
}
