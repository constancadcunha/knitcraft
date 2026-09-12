/**
 * A chart pasted as text, read back into a chart.
 *
 * Makers keep charts in three shapes and all three land here:
 *
 *   SYMBOL GRID   k,k,p,p        cells name stitches from the catalogue
 *   KEYED GRID    X.X.           cells are arbitrary marks standing for colours
 *   COLOUR GRID   #1f1b2e,...    cells are hexes or palette indices
 *
 * The mode is DETECTED rather than asked for, because a maker pasting a grid
 * out of a spreadsheet does not know or care which of the three they have. The
 * detection is conservative: a grid only becomes a symbol grid when most of its
 * distinct marks are real stitches, so an "X and dot" colourwork chart is never
 * misread as a row of unknown stitches.
 *
 * ORIENTATION. A printed chart's first line is its TOP row, but `rows[0]` is the
 * BOTTOM row of the fabric — the one worked first. The grid is therefore
 * flipped on the way in. Skipping that flip is how an imported motif comes out
 * upside down on the needles, so it is the default and `topRowFirst: false`
 * exists only for a grid already stored bottom-up.
 */

import {
  type ChartCell,
  type ChartCraft,
  type ChartIssue,
  type RowSide,
  type SymbolChart,
  type WorkedAs,
  NO_STITCH_ID,
  createChart,
  getSymbol,
  plainSymbolId,
  validateChart,
} from "@/lib/chart";
import { generateId } from "@/lib/id";
import { lookupStitch, normalizeToken } from "./vocabulary";

export type GridMode = "symbols" | "colours";

export interface UnknownCell {
  /** 1-based line number in the pasted text. */
  line: number;
  /** 1-based column. */
  column: number;
  text: string;
}

export interface GridImportReport {
  chart: SymbolChart | null;
  mode: GridMode;
  rows: number;
  columns: number;
  /** Marks found in a keyed grid, in the order they were first seen. */
  keys: string[];
  /** Cells we could not read. In a symbol grid these become `nostitch`. */
  unknown: UnknownCell[];
  warnings: string[];
  issues: ChartIssue[];
}

export interface GridImportOptions {
  craft: ChartCraft;
  name?: string;
  id?: string;
  /** The first line of the text is the top row of the chart. Default true. */
  topRowFirst?: boolean;
  worked?: WorkedAs;
  startSide?: RowSide;
}

/**
 * Palette for a grid whose marks carry no colour of their own.
 *
 * These are chart DATA (`SymbolChart.colors` is a list of hexes that gets drawn
 * and stored), not interface styling, so they are literal values here rather
 * than design tokens. They are picked to stay distinguishable in greyscale,
 * because a printed chart is the one people actually knit from.
 */
const FALLBACK_PALETTE = [
  "#f5ede0",
  "#1f1b2e",
  "#e2483d",
  "#2f6fd0",
  "#3f9e56",
  "#f2b53c",
  "#7c53c3",
  "#e46fa4",
  "#2fa7a0",
  "#c2591f",
  "#8e87a3",
  "#efe4cb",
];

const HEX = /^#[0-9a-f]{6}$/i;
const BLANK_MARKS = new Set(["", ".", "-", "_", "·"]);

/** Split the pasted text into a ragged table of cell strings. */
function splitTable(text: string): { cells: string[][]; delimiter: string } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { cells: [], delimiter: "none" };

  const delimiter = lines.some((line) => line.includes("\t"))
    ? "tab"
    : lines.some((line) => line.includes(","))
      ? "comma"
      : lines.some((line) => line.includes(";"))
        ? "semicolon"
        : lines.some((line) => /\S\s{1,}\S/.test(line))
          ? "space"
          : "character";

  const split = (line: string): string[] => {
    switch (delimiter) {
      case "tab":
        return line.split("\t");
      case "comma":
        return line.split(",");
      case "semicolon":
        return line.split(";");
      case "space":
        return line.trim().split(/\s+/);
      default:
        // One character per cell. This is how a dense colourwork chart gets
        // pasted out of a text file: "XX..XX".
        return Array.from(line.trim());
    }
  };

  return { cells: lines.map((line) => split(line).map((cell) => cell.trim())), delimiter };
}

function detectMode(cells: string[][], craft: ChartCraft): GridMode {
  const distinct = new Set<string>();
  for (const row of cells) {
    for (const cell of row) {
      if (!BLANK_MARKS.has(cell)) distinct.add(cell);
    }
  }
  if (distinct.size === 0) return "symbols";

  const marks = [...distinct];
  if (marks.every((mark) => HEX.test(mark))) return "colours";
  if (marks.every((mark) => /^\d+$/.test(mark))) return "colours";

  const known = marks.filter((mark) => lookupStitch(mark, craft, "RS") !== null).length;
  // Half is deliberate: a grid of "k" and "p" with one stray mark is still a
  // symbol grid, while a grid of "X" and "O" is not one at all.
  if (known * 2 >= marks.length) return "symbols";
  return marks.length <= FALLBACK_PALETTE.length ? "colours" : "symbols";
}

export function chartFromGridText(
  text: string,
  options: GridImportOptions,
): GridImportReport {
  const { cells } = splitTable(text);
  const warnings: string[] = [];
  const unknown: UnknownCell[] = [];

  const height = cells.length;
  const width = Math.max(0, ...cells.map((row) => row.length));

  if (height < 1 || width < 1) {
    return {
      chart: null,
      mode: "symbols",
      rows: 0,
      columns: 0,
      keys: [],
      unknown,
      warnings: ["Nothing in that text looked like a grid of cells."],
      issues: [],
    };
  }

  const ragged = cells.filter((row) => row.length !== width).length;
  if (ragged > 0) {
    // Padding with `nostitch` rather than with plain fabric: a short row in a
    // pasted grid is missing information, not a row of knit stitches.
    warnings.push(
      `${ragged} row${ragged === 1 ? "" : "s"} had fewer than ${width} cells. The gaps were marked "no stitch" rather than filled in.`,
    );
  }

  const mode = detectMode(cells, options.craft);
  const topRowFirst = options.topRowFirst ?? true;
  const keys: string[] = [];
  const palette: string[] = [];

  /** Palette index for a mark in a colour grid, assigning one on first sight. */
  const colorIndexFor = (mark: string): number => {
    const key = mark.toLowerCase();
    const existing = keys.indexOf(key);
    if (existing !== -1) return existing;
    keys.push(key);
    palette.push(
      HEX.test(mark) ? mark.toLowerCase() : FALLBACK_PALETTE[keys.length - 1] ?? FALLBACK_PALETTE[0],
    );
    return keys.length - 1;
  };

  // Blank cells always mean "background", so they claim palette entry 0 before
  // any mark does. Otherwise a grid that starts with an X would knit the motif
  // in the background colour and the background in the motif colour.
  if (mode === "colours") colorIndexFor(".");

  const grid: ChartCell[][] = [];
  for (let line = 0; line < height; line += 1) {
    const source = cells[line];
    const row: ChartCell[] = [];
    for (let column = 0; column < width; column += 1) {
      const mark = source[column] ?? "";
      if (column >= source.length) {
        row.push({ colorIndex: 0, symbolId: NO_STITCH_ID });
        continue;
      }
      if (BLANK_MARKS.has(mark)) {
        row.push(
          mode === "colours"
            ? { colorIndex: 0 }
            : { colorIndex: 0, symbolId: plainSymbolId(options.craft) },
        );
        continue;
      }
      if (mode === "colours") {
        row.push({ colorIndex: colorIndexFor(mark), symbolId: plainSymbolId(options.craft) });
        continue;
      }
      const found = lookupStitch(mark, options.craft, "RS");
      if (!found) {
        unknown.push({ line: line + 1, column: column + 1, text: mark });
        row.push({ colorIndex: 0, symbolId: NO_STITCH_ID });
        continue;
      }
      row.push({ colorIndex: 0, symbolId: found.symbol.id });
    }
    grid.push(row);
  }

  if (unknown.length > 0) {
    const names = [...new Set(unknown.map((cell) => cell.text))].slice(0, 8);
    warnings.push(
      `${unknown.length} cell${unknown.length === 1 ? "" : "s"} used a mark this app has no stitch for (${names.join(", ")}). Those cells were marked "no stitch" rather than guessed at.`,
    );
  }

  const chart = createChart({
    id: options.id ?? generateId(),
    name: options.name ?? "Imported chart",
    craft: options.craft,
    width,
    height,
    colors: mode === "colours" ? palette.slice() : undefined,
    worked: options.worked ?? "flat",
    startSide: options.startSide ?? "RS",
  });

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    // rows[0] is the bottom of the fabric; a pasted chart's first line is its top.
    const source = grid[topRowFirst ? height - 1 - rowIndex : rowIndex];
    chart.rows[rowIndex] = expandSpans(source, width);
  }

  return {
    chart,
    mode,
    rows: height,
    columns: width,
    keys,
    unknown,
    warnings,
    issues: validateChart(chart).issues,
  };
}

/**
 * A grid cell names one stitch, but a 2/2 RC occupies four columns. Where a
 * multi-cell symbol appears, the cells it spans become continuations of it —
 * the invariant `src/lib/chart/model.ts` documents — and the marks that were
 * written there are overwritten, because a cable and the three cells under it
 * cannot both be worked.
 */
function expandSpans(row: ChartCell[], width: number): ChartCell[] {
  const out: ChartCell[] = row.map((cell) => ({ ...cell }));
  for (let col = 0; col < width; col += 1) {
    const cell = out[col];
    const span = getSymbol(cell.symbolId)?.width ?? 1;
    if (span <= 1) continue;
    if (col + span > width) {
      // A cable that runs off the edge is not workable; drop it to no stitch
      // rather than truncate it into a crossing that cannot be made.
      out[col] = { colorIndex: cell.colorIndex, symbolId: NO_STITCH_ID };
      continue;
    }
    for (let c = col + 1; c < col + span; c += 1) {
      out[c] = { colorIndex: out[c].colorIndex, continues: col };
    }
    col += span - 1;
  }
  return out;
}
