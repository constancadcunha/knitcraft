/**
 * Legend derivation.
 *
 * A legend must contain exactly the symbols the chart actually uses — no more
 * (a legend listing symbols that are not on the chart is the classic published-
 * pattern defect) and no fewer. It is therefore always DERIVED from the grid,
 * never hand-maintained.
 *
 * Colour entries matter as much as symbol entries: a colourwork legend that
 * distinguishes yarns by colour alone is unreadable in black and white and
 * unusable by a colour-blind knitter, so each colour entry also carries the
 * index the chart shows.
 */

import {
  type SymbolChart,
  rowGroups,
  rowSide,
  usedColorIndexes,
} from "./model";
import { type StitchSymbol, type SymbolCategory, getSymbol } from "./symbols";

export interface LegendEntry {
  symbolId: string;
  symbol: StitchSymbol | undefined;
  /** Legend heading: the override if the chart supplies one, else the catalogue name. */
  label: string;
  abbreviation: string;
  category: SymbolCategory;
  /** How many times the symbol is worked across the whole chart (anchors only). */
  usageCount: number;
  /**
   * Description shown next to the glyph. For a flat chart that works the symbol
   * on both sides this states both workings, because "k" and "p" are the same
   * cell and knitters need to be told so explicitly.
   */
  description: string;
  /** Cells the glyph spans, so the legend can draw a cable at its true width. */
  width: number;
}

export interface ColorLegendEntry {
  colorIndex: number;
  /** Hex from the chart palette, or undefined if the index is out of range. */
  color: string | undefined;
  /** 1-based label shown on the chart, matching how knitters cite "colour 2". */
  label: string;
  usageCount: number;
}

export interface ChartLegend {
  symbols: LegendEntry[];
  colors: ColorLegendEntry[];
}

/** Legend ordering: basics first, then increases, decreases, cables, specials. */
const CATEGORY_ORDER: SymbolCategory[] = [
  "basic",
  "texture",
  "increase",
  "decrease",
  "cable",
  "crochet-basic",
  "crochet-compound",
  "special",
];

function categoryRank(category: SymbolCategory | undefined): number {
  const index = category ? CATEGORY_ORDER.indexOf(category) : -1;
  return index === -1 ? CATEGORY_ORDER.length : index;
}

/**
 * Build the legend for a chart. Only ANCHOR cells are counted, so a 2/2 RC
 * appears once per crossing and not once per covered cell.
 */
export function buildLegend(chart: SymbolChart): ChartLegend {
  return { symbols: buildSymbolLegend(chart), colors: buildColorLegend(chart) };
}

export function buildSymbolLegend(chart: SymbolChart): LegendEntry[] {
  const counts = new Map<string, number>();
  /** Sides a symbol is actually worked from, which decides how it is described. */
  const sides = new Map<string, Set<"RS" | "WS">>();
  const firstSeen = new Map<string, number>();

  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    const side = rowSide(chart, rowIndex);
    for (const group of rowGroups(chart, rowIndex)) {
      counts.set(group.symbolId, (counts.get(group.symbolId) ?? 0) + 1);
      if (!firstSeen.has(group.symbolId)) firstSeen.set(group.symbolId, rowIndex);
      const seen = sides.get(group.symbolId) ?? new Set<"RS" | "WS">();
      seen.add(side);
      sides.set(group.symbolId, seen);
    }
  }

  const entries: LegendEntry[] = [];
  for (const [symbolId, usageCount] of counts) {
    const symbol = getSymbol(symbolId);
    entries.push({
      symbolId,
      symbol,
      label: chart.legendOverrides?.[symbolId] ?? symbol?.name ?? symbolId,
      abbreviation: symbol?.abbreviation ?? symbolId,
      category: symbol?.category ?? "special",
      usageCount,
      description: describe(chart, symbol, sides.get(symbolId)),
      width: symbol?.width ?? 1,
    });
  }

  return entries.sort((a, b) => {
    const rank = categoryRank(a.category) - categoryRank(b.category);
    if (rank !== 0) return rank;
    return (firstSeen.get(a.symbolId) ?? 0) - (firstSeen.get(b.symbolId) ?? 0);
  });
}

function describe(
  chart: SymbolChart,
  symbol: StitchSymbol | undefined,
  sides: Set<"RS" | "WS"> | undefined,
): string {
  if (!symbol) return "unknown symbol — this chart references a stitch the catalogue does not define";
  if (symbol.notWorked) return symbol.instruction;

  const sameBothSides = symbol.rs.abbr === symbol.ws.abbr && symbol.rs.instruction === symbol.ws.instruction;
  // In the round there is no wrong side, so quoting a WS working is noise.
  if (chart.worked === "round" || sameBothSides) return symbol.rs.instruction;

  const usesRs = sides?.has("RS") ?? true;
  const usesWs = sides?.has("WS") ?? true;
  if (usesRs && !usesWs) return `${symbol.rs.instruction} (RS)`;
  if (usesWs && !usesRs) return `${symbol.ws.instruction} (WS)`;
  return `RS: ${symbol.rs.abbr} — ${symbol.rs.instruction}. WS: ${symbol.ws.abbr} — ${symbol.ws.instruction}.`;
}

export function buildColorLegend(chart: SymbolChart): ColorLegendEntry[] {
  const counts = new Map<number, number>();
  for (const row of chart.rows) {
    for (const cell of row) counts.set(cell.colorIndex, (counts.get(cell.colorIndex) ?? 0) + 1);
  }
  return usedColorIndexes(chart).map((colorIndex) => ({
    colorIndex,
    color: chart.colors[colorIndex],
    label: `Colour ${colorIndex + 1}`,
    usageCount: counts.get(colorIndex) ?? 0,
  }));
}

/**
 * The abbreviation list a written pattern must print. Derived from the same
 * grid as the legend, so it can never omit an abbreviation the instructions use.
 */
export function buildAbbreviationList(
  chart: SymbolChart,
): { abbr: string; meaning: string }[] {
  const seen = new Map<string, string>();
  for (let rowIndex = 0; rowIndex < chart.height; rowIndex += 1) {
    const side = rowSide(chart, rowIndex);
    for (const group of rowGroups(chart, rowIndex)) {
      const symbol = group.symbol;
      if (!symbol || symbol.notWorked) continue;
      const form = side === "RS" ? symbol.rs : symbol.ws;
      if (!seen.has(form.abbr)) seen.set(form.abbr, form.instruction);
    }
  }
  return Array.from(seen, ([abbr, meaning]) => ({ abbr, meaning })).sort((a, b) =>
    a.abbr.localeCompare(b.abbr),
  );
}
