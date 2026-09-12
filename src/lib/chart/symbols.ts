/**
 * Stitch symbol catalogue — chart model v2.
 *
 * This is the single source of truth for what a chart cell *means*. Nothing else
 * in the app may hard-code a glyph, an abbreviation or a stitch count.
 *
 * Three ideas carry the whole file:
 *
 * 1. ARITHMETIC. Every symbol declares `stitchesConsumed` (how many stitches of
 *    the previous row it eats) and `stitchesProduced` (how many stitches it
 *    leaves on the needle/hook). `produced - consumed` is the delta that drives
 *    the running stitch count, and it is what makes a chart verifiable: row N's
 *    consumption must equal row N-1's production. See validate.ts.
 *
 * 2. RS/WS. A knitting chart symbol is defined by how the stitch LOOKS from the
 *    right side. When a flat chart's wrong-side row is worked, the knitter is
 *    looking at the back of the fabric, so a "knit" symbol must be PURLED,
 *    k2tog becomes p2tog, ssk becomes ssp, and a cable held at the back is
 *    instead held at the front. Every symbol therefore carries a `rs` and a `ws`
 *    worked form. (Craft Yarn Council chart standards, "Knit Chart Symbols":
 *    the master key is stated as "k on RS, p on WS".)
 *
 * 3. WIDTH. `width` is how many grid CELLS the glyph occupies. For a cable this
 *    equals both consumed and produced (a 2/2 RC is 4 in, 4 out, 4 columns wide)
 *    which is exactly why cables are representable in a grid at all. For a
 *    decrease, width stays 1 while consumed is 2 or 3 — the rectangle is kept
 *    square by `nostitch` padding cells, per chart convention. Width is a
 *    LAYOUT property; never compute stitch counts from it.
 *
 * Drawing DATA lives here (pixel-art bitmaps, on-brand for the retro/comic
 * direction); the renderer does not. `symbolArtRects()` turns a bitmap into
 * run-length-merged rectangles that a canvas or SVG renderer can blit directly.
 */

export type ChartCraft = "knitting" | "crocheting";

/** Which craft a symbol belongs to. "both" covers craft-neutral cells (no-stitch). */
export type SymbolCraft = ChartCraft | "both";

export type SymbolCategory =
  | "basic"
  | "texture"
  | "increase"
  | "decrease"
  | "cable"
  | "crochet-basic"
  | "crochet-compound"
  | "special";

/**
 * How a run of N identical symbols is written out.
 * - "count-suffix": `k` x5 -> "k5"; with `repeatSeparator: " "`, `ch` x5 -> "ch 5"
 * - "count-prefix": `sc` x5 -> "5 sc" (US crochet convention)
 * - "bracket-times": `k2tog` x3 -> "[k2tog] 3 times"
 */
export type RepeatStyle = "count-suffix" | "count-prefix" | "bracket-times";

/** How a symbol is actually worked on one particular side of the fabric. */
export interface WorkedForm {
  /** Abbreviation as it appears in the written row, e.g. "k" on RS, "p" on WS. */
  abbr: string;
  /** Long-form fragment for the abbreviations list / legend / special stitches. */
  instruction: string;
}

/** Extra data a cable crossing needs, for the renderer and for prose. */
export interface CableSpec {
  /** Number of stitches in the group that ends up on top. */
  front: number;
  /** Number of stitches in the group that ends up behind. */
  back: number;
  /**
   * Which way the TOP strand leans. This is the naming convention: "RC" = right
   * cross = the front strand travels up to the right.
   */
  cross: "right" | "left";
  /** True for the "P" variants (2/1 RPC etc.) where the background group is purled. */
  purledBackground: boolean;
}

/**
 * A pixel-art bitmap. One string per pixel row, top to bottom.
 * Characters: "." transparent, "#" ink, "+" accent ink, ":" shade/fill.
 */
export interface SymbolArt {
  /** Cells spanned; `cols` is always ART_CELL * width. */
  width: number;
  cols: number;
  rows: number;
  pixels: string[];
}

export interface StitchSymbol {
  id: string;
  craft: SymbolCraft;
  /** Human name for the legend, e.g. "Knit 2 together". */
  name: string;
  /** Canonical abbreviation used in the legend and the abbreviations list. */
  abbreviation: string;
  category: SymbolCategory;
  /** Stitches of the previous row consumed. */
  stitchesConsumed: number;
  /** Stitches left on the needle/hook. */
  stitchesProduced: number;
  /** Grid cells spanned horizontally. > 1 makes this a multi-cell symbol. */
  width: number;
  /** Canonical written-instruction fragment (the RS working). */
  instruction: string;
  /** Worked form on a right-side row (and on every round of an in-the-round chart). */
  rs: WorkedForm;
  /** Worked form on a wrong-side row of a flat chart. */
  ws: WorkedForm;
  repeatStyle: RepeatStyle;
  /** Inserted between abbreviation and count for "count-suffix". Default "". */
  repeatSeparator?: string;
  /** True for cells that are not worked at all and never counted. */
  notWorked?: boolean;
  /**
   * Stitch height in chain-units, for crochet. sl st 0.25, sc 1, hdc 1.5,
   * dc 2, tr 3, dtr 4. Radial chart rendering needs this to grow the radius
   * per round; grid rendering ignores it.
   */
  chainHeight?: number;
  cable?: CableSpec;
  art: SymbolArt;
}

/** Pixel resolution of one chart cell's artwork. Odd, so symmetric glyphs centre. */
export const ART_CELL = 9;

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

function art(pixels: string[], width = 1): SymbolArt {
  const cols = ART_CELL * width;
  // Fail loudly at module load if a glyph is mis-typed: a ragged bitmap would
  // otherwise silently render a corrupt symbol.
  if (pixels.length !== ART_CELL) {
    throw new Error(`symbol art must have ${ART_CELL} rows, got ${pixels.length}`);
  }
  for (const row of pixels) {
    if (row.length !== cols) {
      throw new Error(`symbol art row must be ${cols} chars, got ${row.length}: "${row}"`);
    }
  }
  return { width, cols, rows: ART_CELL, pixels };
}

function blank(width: number): string[][] {
  const cols = ART_CELL * width;
  return Array.from({ length: ART_CELL }, () => Array.from({ length: cols }, () => "."));
}

function plot(grid: string[][], x: number, y: number, ink: string) {
  if (y < 0 || y >= grid.length) return;
  const row = grid[y];
  if (x < 0 || x >= row.length) return;
  row[x] = ink;
}

function finish(grid: string[][], width: number): SymbolArt {
  return art(
    grid.map((row) => row.join("")),
    width,
  );
}

/**
 * Cable crossing artwork, generated because it is parametric: two thick
 * diagonal bands across `width` cells. The band that ends up on TOP is drawn
 * unbroken; the band behind is drawn with a gap where they cross, which is the
 * standard way charts show which strand is in front. "RC" leans the top band up
 * to the right, "LC" up to the left.
 */
function cableArt(spec: CableSpec, width: number): SymbolArt {
  const grid = blank(width);
  const cols = ART_CELL * width;
  const lastX = cols - 1;
  const lastY = ART_CELL - 1;
  // The crossing happens in the middle; the under-strand is interrupted there.
  const gapHalf = Math.max(1, Math.round(cols * 0.09));
  const midX = (cols - 1) / 2;

  const drawBand = (rising: boolean, onTop: boolean) => {
    for (let x = 0; x <= lastX; x += 1) {
      const t = x / lastX;
      // rising === true draws "/" (bottom-left to top-right).
      const y = rising ? Math.round(lastY * (1 - t)) : Math.round(lastY * t);
      if (!onTop && Math.abs(x - midX) <= gapHalf) continue;
      plot(grid, x, y, onTop ? "#" : "+");
      plot(grid, x, y + 1, onTop ? "#" : "+");
    }
  };

  const topRises = spec.cross === "right";
  drawBand(!topRises, false); // the strand behind, drawn first and broken
  drawBand(topRises, true); // the strand in front, drawn last and unbroken

  // For the "P" variants shade the cells occupied by the purled background
  // group. A right cross carries the front group rightwards, so the background
  // group ends up on the left.
  if (spec.purledBackground) {
    const bgCells = spec.back;
    const startCell = spec.cross === "right" ? 0 : width - bgCells;
    for (let c = startCell; c < startCell + bgCells; c += 1) {
      for (let y = 0; y < ART_CELL; y += 1) {
        for (let x = c * ART_CELL; x < (c + 1) * ART_CELL; x += 1) {
          if (grid[y][x] === ".") plot(grid, x, y, ":");
        }
      }
    }
  }

  return finish(grid, width);
}

/** n stems rising from n cells and converging to a single point: a cluster. */
function clusterArt(n: number): SymbolArt {
  const grid = blank(n);
  const cols = ART_CELL * n;
  const apex = Math.floor((cols - 1) / 2);
  for (let c = 0; c < n; c += 1) {
    const base = c * ART_CELL + Math.floor(ART_CELL / 2);
    for (let y = 1; y <= ART_CELL - 2; y += 1) {
      const t = (y - 1) / (ART_CELL - 3);
      plot(grid, Math.round(base + (apex - base) * t), y, "#");
    }
  }
  for (let x = 1; x < cols - 1; x += 1) plot(grid, x, 1, "#");
  return finish(grid, n);
}

/** One stem fanning out into n tops: a shell (n dc worked into one stitch). */
function shellArt(n: number): SymbolArt {
  const grid = blank(n);
  const cols = ART_CELL * n;
  const root = Math.floor((cols - 1) / 2);
  for (let c = 0; c < n; c += 1) {
    const top = c * ART_CELL + Math.floor(ART_CELL / 2);
    for (let y = 1; y <= ART_CELL - 2; y += 1) {
      const t = (y - 1) / (ART_CELL - 3);
      plot(grid, Math.round(top + (root - top) * t), y, "#");
    }
  }
  for (let x = 1; x < cols - 1; x += 1) plot(grid, x, 1, "#");
  return finish(grid, n);
}

// ---------------------------------------------------------------------------
// Knitting symbols
// ---------------------------------------------------------------------------

const KNIT_SYMBOLS: StitchSymbol[] = [
  {
    id: "k",
    craft: "knitting",
    name: "Knit",
    abbreviation: "k",
    category: "basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "knit",
    rs: { abbr: "k", instruction: "knit" },
    ws: { abbr: "p", instruction: "purl" },
    repeatStyle: "count-suffix",
    /**
     * A BLANK square. This is the standard chart convention, not an omission.
     *
     * Knit is by far the most common stitch, so charts leave it empty and let
     * everything else stand out against it — that is what makes a chart
     * readable at a glance. Drawing a little "V" in every knit cell renders a
     * picture of the finished fabric instead of a chart, which is dense and
     * hard to read, and it is what the app did before.
     *
     * The legend still lists it, with an empty swatch, exactly as a printed
     * pattern does.
     */
    art: art([
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "p",
    craft: "knitting",
    name: "Purl",
    abbreviation: "p",
    category: "basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "purl",
    rs: { abbr: "p", instruction: "purl" },
    ws: { abbr: "k", instruction: "knit" },
    repeatStyle: "count-suffix",
    art: art([
      ".........",
      ".........",
      ".........",
      ".........",
      ".#######.",
      ".#######.",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "ktbl",
    craft: "knitting",
    name: "Knit through back loop (twisted)",
    abbreviation: "k1 tbl",
    category: "texture",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "knit 1 through the back loop",
    rs: { abbr: "k1 tbl", instruction: "knit 1 through the back loop" },
    ws: { abbr: "p1 tbl", instruction: "purl 1 through the back loop" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".#.....#.",
      ".#.....#.",
      ".#######.",
      "..#...#..",
      "...#.#...",
      "...#.#...",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "ptbl",
    craft: "knitting",
    name: "Purl through back loop (twisted)",
    abbreviation: "p1 tbl",
    category: "texture",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "purl 1 through the back loop",
    rs: { abbr: "p1 tbl", instruction: "purl 1 through the back loop" },
    ws: { abbr: "k1 tbl", instruction: "knit 1 through the back loop" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".........",
      "....#....",
      ".#######.",
      ".#######.",
      "....#....",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "sl1",
    craft: "knitting",
    name: "Slip 1 purlwise",
    abbreviation: "sl1",
    category: "texture",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    // The yarn is always carried on the WRONG side of the fabric, so the
    // written form flips between wyib (RS) and wyif (WS) even though the
    // physical action is identical.
    instruction: "slip 1 purlwise with the yarn held at the wrong side of the work",
    rs: { abbr: "sl1 wyib", instruction: "slip 1 purlwise with the yarn held at the back" },
    ws: { abbr: "sl1 wyif", instruction: "slip 1 purlwise with the yarn held at the front" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".........",
      ".........",
      "...###...",
      "..#...#..",
      ".##...##.",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "yo",
    craft: "knitting",
    name: "Yarn over",
    abbreviation: "yo",
    category: "increase",
    stitchesConsumed: 0,
    stitchesProduced: 1,
    width: 1,
    instruction: "yarn over",
    rs: { abbr: "yo", instruction: "yarn over" },
    ws: { abbr: "yo", instruction: "yarn over" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      "...###...",
      "..#...#..",
      ".#.....#.",
      ".#.....#.",
      ".#.....#.",
      "..#...#..",
      "...###...",
      ".........",
    ]),
  },
  {
    id: "m1l",
    craft: "knitting",
    name: "Make one left",
    abbreviation: "m1L",
    category: "increase",
    stitchesConsumed: 0,
    stitchesProduced: 1,
    width: 1,
    instruction:
      "lift the strand between the stitches from the front and knit it through the back loop",
    rs: {
      abbr: "m1L",
      instruction:
        "lift the strand between the stitches from the front and knit it through the back loop",
    },
    ws: {
      abbr: "m1Lp",
      instruction:
        "lift the strand between the stitches from the front and purl it through the back loop",
    },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".........",
      "...#.....",
      "..#......",
      ".#######.",
      "..#......",
      "...#.....",
      ".........",
      ".........",
    ]),
  },
  {
    id: "m1r",
    craft: "knitting",
    name: "Make one right",
    abbreviation: "m1R",
    category: "increase",
    stitchesConsumed: 0,
    stitchesProduced: 1,
    width: 1,
    instruction:
      "lift the strand between the stitches from the back and knit it through the front loop",
    rs: {
      abbr: "m1R",
      instruction:
        "lift the strand between the stitches from the back and knit it through the front loop",
    },
    ws: {
      abbr: "m1Rp",
      instruction:
        "lift the strand between the stitches from the back and purl it through the front loop",
    },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".........",
      ".....#...",
      "......#..",
      ".#######.",
      "......#..",
      ".....#...",
      ".........",
      ".........",
    ]),
  },
  {
    id: "kfb",
    craft: "knitting",
    name: "Knit front and back",
    abbreviation: "kfb",
    category: "increase",
    stitchesConsumed: 1,
    stitchesProduced: 2,
    width: 1,
    instruction: "knit into the front and then the back of the same stitch",
    rs: { abbr: "kfb", instruction: "knit into the front and then the back of the same stitch" },
    ws: { abbr: "pfb", instruction: "purl into the front and then the back of the same stitch" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".#.....#.",
      ".#.....#.",
      "..#...#..",
      "...#.#...",
      "....#....",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "k2tog",
    craft: "knitting",
    name: "Knit 2 together",
    abbreviation: "k2tog",
    category: "decrease",
    stitchesConsumed: 2,
    stitchesProduced: 1,
    width: 1,
    instruction: "knit 2 stitches together",
    rs: { abbr: "k2tog", instruction: "knit 2 stitches together" },
    ws: { abbr: "p2tog", instruction: "purl 2 stitches together" },
    repeatStyle: "bracket-times",
    // Right-leaning stroke: k2tog leans right on the RS.
    art: art([
      ".........",
      ".......#.",
      "......#..",
      ".....#...",
      "....#....",
      "...#.....",
      "..#......",
      ".#.......",
      ".........",
    ]),
  },
  {
    id: "ssk",
    craft: "knitting",
    name: "Slip, slip, knit",
    abbreviation: "ssk",
    category: "decrease",
    stitchesConsumed: 2,
    stitchesProduced: 1,
    width: 1,
    instruction: "slip 2 stitches knitwise one at a time, then knit them together through the back loops",
    rs: {
      abbr: "ssk",
      instruction:
        "slip 2 stitches knitwise one at a time, then knit them together through the back loops",
    },
    ws: {
      abbr: "ssp",
      instruction:
        "slip 2 stitches knitwise one at a time, return them to the left needle and purl them together through the back loops",
    },
    repeatStyle: "bracket-times",
    // Left-leaning stroke: ssk leans left on the RS.
    art: art([
      ".........",
      ".#.......",
      "..#......",
      "...#.....",
      "....#....",
      ".....#...",
      "......#..",
      ".......#.",
      ".........",
    ]),
  },
  {
    id: "k3tog",
    craft: "knitting",
    name: "Knit 3 together",
    abbreviation: "k3tog",
    category: "decrease",
    stitchesConsumed: 3,
    stitchesProduced: 1,
    width: 1,
    instruction: "knit 3 stitches together",
    rs: { abbr: "k3tog", instruction: "knit 3 stitches together" },
    ws: { abbr: "p3tog", instruction: "purl 3 stitches together" },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".......#.",
      "......#..",
      ".....#...",
      "....#....",
      "...#.....",
      "..#......",
      ".#.......",
      "....#....",
    ]),
  },
  {
    id: "sssk",
    craft: "knitting",
    name: "Slip, slip, slip, knit",
    abbreviation: "sssk",
    category: "decrease",
    stitchesConsumed: 3,
    stitchesProduced: 1,
    width: 1,
    instruction:
      "slip 3 stitches knitwise one at a time, then knit them together through the back loops",
    rs: {
      abbr: "sssk",
      instruction:
        "slip 3 stitches knitwise one at a time, then knit them together through the back loops",
    },
    ws: {
      abbr: "sssp",
      instruction:
        "slip 3 stitches knitwise one at a time, return them to the left needle and purl them together through the back loops",
    },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      ".#.......",
      "..#......",
      "...#.....",
      "....#....",
      ".....#...",
      "......#..",
      ".......#.",
      "....#....",
    ]),
  },
  {
    id: "cdd",
    craft: "knitting",
    name: "Centred double decrease",
    abbreviation: "cdd",
    category: "decrease",
    stitchesConsumed: 3,
    stitchesProduced: 1,
    width: 1,
    instruction: "slip 2 stitches together knitwise, k1, pass the 2 slipped stitches over",
    // The symbol name is stable across sides (a legend entry reading "cdd (WS)"
    // helps nobody); only the working changes.
    rs: {
      abbr: "cdd",
      instruction: "slip 2 stitches together knitwise, k1, pass the 2 slipped stitches over",
    },
    ws: {
      abbr: "cdd",
      instruction: "slip 2 stitches together purlwise, p1, pass the 2 slipped stitches over",
    },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      "....#....",
      "....#....",
      "....#....",
      "....#....",
      "...###...",
      "..#.#.#..",
      ".#..#..#.",
      ".........",
    ]),
  },
  {
    id: "bobble",
    craft: "knitting",
    name: "Make bobble",
    abbreviation: "MB",
    category: "texture",
    // A bobble is made and decreased away inside one stitch, so it is 1 in, 1 out.
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction:
      "make bobble: (k1, yo, k1, yo, k1) in the next stitch, turn, p5, turn, k5, then pass the 4th, 3rd, 2nd and 1st stitches over the 5th",
    rs: {
      abbr: "MB",
      instruction:
        "make bobble: (k1, yo, k1, yo, k1) in the next stitch, turn, p5, turn, k5, then pass the 4th, 3rd, 2nd and 1st stitches over the 5th",
    },
    ws: {
      abbr: "MB",
      instruction:
        "make bobble: (p1, yo, p1, yo, p1) in the next stitch, turn, k5, turn, p5, then pass the 4th, 3rd, 2nd and 1st stitches over the 5th",
    },
    repeatStyle: "bracket-times",
    art: art([
      ".........",
      "...###...",
      "..#####..",
      ".#######.",
      ".#######.",
      ".#######.",
      "..#####..",
      "...###...",
      ".........",
    ]),
  },
];

/**
 * Cable crossings.
 *
 * Naming follows the modern a/b convention (Vogue / Norah Gaughan): "2/1 RPC"
 * means 2 stitches cross over 1, to the RIGHT, with the background purled.
 * The first number is the group that ends up in FRONT.
 *
 * The WS working is the RS working with the holding side reversed and the
 * stitches purled: when you are looking at the back of the fabric, holding the
 * cable needle at the FRONT is what puts those stitches BEHIND on the right
 * side. This flip is the single most-often-omitted piece of cable charting and
 * is why every symbol carries an explicit ws form.
 */
function makeCable(
  id: string,
  front: number,
  back: number,
  cross: "right" | "left",
  purledBackground: boolean,
): StitchSymbol {
  const width = front + back;
  const holdRs = cross === "right" ? "back" : "front";
  const holdWs = cross === "right" ? "front" : "back";
  // The cable needle always takes the group that ends up behind.
  const cnCount = cross === "right" ? back : front;
  const firstCount = cross === "right" ? front : back;
  const firstIsPurl = purledBackground && cross === "left";
  const cnIsPurl = purledBackground && cross === "right";

  const write = (hold: string, knitVerb: string, purlVerb: string) =>
    `slip ${cnCount} ${cnCount === 1 ? "stitch" : "stitches"} to a cable needle and hold at the ${hold}, ` +
    `${firstIsPurl ? purlVerb : knitVerb}${firstCount}, then ` +
    `${cnIsPurl ? purlVerb : knitVerb}${cnCount} from the cable needle`;

  return {
    id,
    craft: "knitting",
    name: `${front}/${back} ${cross === "right" ? "right" : "left"} cross${purledBackground ? " (purl background)" : ""}`,
    abbreviation: id,
    category: "cable",
    // consumed === produced === width is what makes a cable fit a grid at all.
    stitchesConsumed: width,
    stitchesProduced: width,
    width,
    instruction: write(holdRs, "k", "p"),
    rs: { abbr: id, instruction: write(holdRs, "k", "p") },
    ws: { abbr: id, instruction: write(holdWs, "p", "k") },
    repeatStyle: "bracket-times",
    cable: { front, back, cross, purledBackground },
    art: cableArt({ front, back, cross, purledBackground }, width),
  };
}

const CABLE_SYMBOLS: StitchSymbol[] = [
  makeCable("1/1 RC", 1, 1, "right", false),
  makeCable("1/1 LC", 1, 1, "left", false),
  // In every a/b name the FIRST number is the group that ends up in front, so a
  // left cross puts that group on the cable needle held at the front.
  makeCable("2/1 RC", 2, 1, "right", false),
  makeCable("2/1 LC", 2, 1, "left", false),
  makeCable("2/1 RPC", 2, 1, "right", true),
  makeCable("2/1 LPC", 2, 1, "left", true),
  makeCable("2/2 RC", 2, 2, "right", false),
  makeCable("2/2 LC", 2, 2, "left", false),
  makeCable("3/3 RC", 3, 3, "right", false),
  makeCable("3/3 LC", 3, 3, "left", false),
];

// ---------------------------------------------------------------------------
// Crochet symbols
// ---------------------------------------------------------------------------

const CROCHET_SYMBOLS: StitchSymbol[] = [
  {
    id: "ch",
    craft: "crocheting",
    name: "Chain",
    abbreviation: "ch",
    category: "crochet-basic",
    stitchesConsumed: 0,
    stitchesProduced: 1,
    width: 1,
    instruction: "chain",
    rs: { abbr: "ch", instruction: "chain" },
    ws: { abbr: "ch", instruction: "chain" },
    repeatStyle: "count-suffix",
    repeatSeparator: " ",
    chainHeight: 1,
    art: art([
      ".........",
      ".........",
      "...###...",
      "..#...#..",
      "..#...#..",
      "...###...",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "slst",
    craft: "crocheting",
    name: "Slip stitch",
    abbreviation: "sl st",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "slip stitch",
    rs: { abbr: "sl st", instruction: "slip stitch" },
    ws: { abbr: "sl st", instruction: "slip stitch" },
    repeatStyle: "count-prefix",
    chainHeight: 0.25,
    art: art([
      ".........",
      ".........",
      "...###...",
      "..#####..",
      "..#####..",
      "...###...",
      ".........",
      ".........",
      ".........",
    ]),
  },
  {
    id: "sc",
    craft: "crocheting",
    name: "Single crochet (UK: double crochet)",
    abbreviation: "sc",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "single crochet",
    rs: { abbr: "sc", instruction: "single crochet" },
    ws: { abbr: "sc", instruction: "single crochet" },
    repeatStyle: "count-prefix",
    chainHeight: 1,
    art: art([
      ".........",
      "....#....",
      "....#....",
      "....#....",
      ".#######.",
      "....#....",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "hdc",
    craft: "crocheting",
    name: "Half double crochet (UK: half treble)",
    abbreviation: "hdc",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "half double crochet",
    rs: { abbr: "hdc", instruction: "half double crochet" },
    ws: { abbr: "hdc", instruction: "half double crochet" },
    repeatStyle: "count-prefix",
    chainHeight: 1.5,
    art: art([
      ".........",
      ".#######.",
      "....#....",
      "....#....",
      "....#....",
      "....#....",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "dc",
    craft: "crocheting",
    name: "Double crochet (UK: treble)",
    abbreviation: "dc",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "double crochet",
    rs: { abbr: "dc", instruction: "double crochet" },
    ws: { abbr: "dc", instruction: "double crochet" },
    repeatStyle: "count-prefix",
    chainHeight: 2,
    art: art([
      ".........",
      ".#######.",
      "....#....",
      "....#....",
      "..#####..",
      "....#....",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "tr",
    craft: "crocheting",
    name: "Treble crochet (UK: double treble)",
    abbreviation: "tr",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "treble crochet",
    rs: { abbr: "tr", instruction: "treble crochet" },
    ws: { abbr: "tr", instruction: "treble crochet" },
    repeatStyle: "count-prefix",
    chainHeight: 3,
    art: art([
      ".........",
      ".#######.",
      "....#....",
      "..#####..",
      "....#....",
      "..#####..",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "dtr",
    craft: "crocheting",
    name: "Double treble crochet",
    abbreviation: "dtr",
    category: "crochet-basic",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "double treble crochet",
    rs: { abbr: "dtr", instruction: "double treble crochet" },
    ws: { abbr: "dtr", instruction: "double treble crochet" },
    repeatStyle: "count-prefix",
    chainHeight: 4,
    art: art([
      ".........",
      ".#######.",
      "..#####..",
      "....#....",
      "..#####..",
      "....#....",
      "..#####..",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "fpdc",
    craft: "crocheting",
    name: "Front post double crochet",
    abbreviation: "FPdc",
    category: "crochet-compound",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "double crochet around the post of the stitch below, from the front",
    // Post stitches are relative to the side you are working from. A chart is
    // drawn as it appears on the RS, so on a WS row you work the BACK post to
    // raise a front-post ridge on the right side.
    rs: {
      abbr: "FPdc",
      instruction: "double crochet around the post of the stitch below, inserting the hook from the front",
    },
    ws: {
      abbr: "BPdc",
      instruction: "double crochet around the post of the stitch below, inserting the hook from the back",
    },
    repeatStyle: "count-prefix",
    chainHeight: 2,
    art: art([
      ".........",
      ".#######.",
      "....#....",
      "....#....",
      "..#####..",
      "....#....",
      "....#....",
      "....##...",
      ".....##..",
    ]),
  },
  {
    id: "bpdc",
    craft: "crocheting",
    name: "Back post double crochet",
    abbreviation: "BPdc",
    category: "crochet-compound",
    stitchesConsumed: 1,
    stitchesProduced: 1,
    width: 1,
    instruction: "double crochet around the post of the stitch below, from the back",
    rs: {
      abbr: "BPdc",
      instruction: "double crochet around the post of the stitch below, inserting the hook from the back",
    },
    ws: {
      abbr: "FPdc",
      instruction: "double crochet around the post of the stitch below, inserting the hook from the front",
    },
    repeatStyle: "count-prefix",
    chainHeight: 2,
    art: art([
      ".........",
      ".#######.",
      "....#....",
      "....#....",
      "..#####..",
      "....#....",
      "....#....",
      "...##....",
      "..##.....",
    ]),
  },
  {
    id: "picot",
    craft: "crocheting",
    name: "Picot",
    abbreviation: "picot",
    category: "crochet-compound",
    // Decorative: it neither eats a stitch of the row below nor leaves one.
    stitchesConsumed: 0,
    stitchesProduced: 0,
    width: 1,
    instruction: "picot: ch 3, then slip stitch into the 3rd chain from the hook",
    rs: { abbr: "picot", instruction: "picot: ch 3, then slip stitch into the 3rd chain from the hook" },
    ws: { abbr: "picot", instruction: "picot: ch 3, then slip stitch into the 3rd chain from the hook" },
    repeatStyle: "bracket-times",
    chainHeight: 0,
    art: art([
      "...###...",
      "..#...#..",
      "..#...#..",
      "...###...",
      "....#....",
      "....#....",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "magicring",
    craft: "crocheting",
    name: "Magic ring",
    abbreviation: "MR",
    category: "special",
    stitchesConsumed: 0,
    stitchesProduced: 0,
    width: 1,
    instruction: "make a magic ring (adjustable loop) and work the round into it",
    rs: { abbr: "MR", instruction: "make a magic ring (adjustable loop) and work the round into it" },
    ws: { abbr: "MR", instruction: "make a magic ring (adjustable loop) and work the round into it" },
    repeatStyle: "bracket-times",
    chainHeight: 0,
    art: art([
      ".........",
      "..#####..",
      ".#.....#.",
      ".#.....#.",
      ".#.....#.",
      "..#####..",
      "....#....",
      "....#....",
      ".........",
    ]),
  },
  {
    id: "cl3",
    craft: "crocheting",
    name: "3-dc cluster",
    abbreviation: "cl",
    category: "crochet-compound",
    // Three legs eaten, one loop left: the crochet analogue of a k3tog, and the
    // reason crochet needs the same multi-cell machinery as a cable.
    stitchesConsumed: 3,
    stitchesProduced: 1,
    width: 3,
    instruction:
      "3-dc cluster: work 3 double crochets over the next 3 stitches, leaving the last loop of each on the hook, then yarn over and draw through all 4 loops",
    rs: {
      abbr: "cl",
      instruction:
        "3-dc cluster: work 3 double crochets over the next 3 stitches, leaving the last loop of each on the hook, then yarn over and draw through all 4 loops",
    },
    ws: {
      abbr: "cl",
      instruction:
        "3-dc cluster: work 3 double crochets over the next 3 stitches, leaving the last loop of each on the hook, then yarn over and draw through all 4 loops",
    },
    repeatStyle: "bracket-times",
    chainHeight: 2,
    art: clusterArt(3),
  },
  {
    id: "shell5",
    craft: "crocheting",
    name: "5-dc shell",
    abbreviation: "shell",
    category: "crochet-compound",
    // One stitch eaten, five made — the fan spans five stitch positions in the
    // row it creates, which is why its display width is 5 and not 1.
    stitchesConsumed: 1,
    stitchesProduced: 5,
    width: 5,
    instruction: "shell: work 5 double crochets into the same stitch",
    rs: { abbr: "shell", instruction: "shell: work 5 double crochets into the same stitch" },
    ws: { abbr: "shell", instruction: "shell: work 5 double crochets into the same stitch" },
    repeatStyle: "bracket-times",
    chainHeight: 2,
    art: shellArt(5),
  },
];

// ---------------------------------------------------------------------------
// Craft-neutral
// ---------------------------------------------------------------------------

/**
 * "No stitch". CYC calls this "stitches do not exist in these areas of the
 * chart". It exists only to keep the grid rectangular where a row is narrower
 * than the widest row; it is never worked and never counted.
 */
export const NO_STITCH_ID = "nostitch";

const NEUTRAL_SYMBOLS: StitchSymbol[] = [
  {
    id: NO_STITCH_ID,
    craft: "both",
    name: "No stitch",
    abbreviation: "—",
    category: "special",
    stitchesConsumed: 0,
    stitchesProduced: 0,
    width: 1,
    instruction: "no stitch — this cell is a placeholder and is not worked",
    rs: { abbr: "—", instruction: "no stitch — this cell is a placeholder and is not worked" },
    ws: { abbr: "—", instruction: "no stitch — this cell is a placeholder and is not worked" },
    repeatStyle: "bracket-times",
    notWorked: true,
    art: art([
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
      ":::::::::",
    ]),
  },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ALL_SYMBOLS: StitchSymbol[] = [
  ...KNIT_SYMBOLS,
  ...CABLE_SYMBOLS,
  ...CROCHET_SYMBOLS,
  ...NEUTRAL_SYMBOLS,
];

const REGISTRY: Map<string, StitchSymbol> = new Map(ALL_SYMBOLS.map((s) => [s.id, s]));

if (REGISTRY.size !== ALL_SYMBOLS.length) {
  throw new Error("duplicate stitch symbol id in the catalogue");
}

/** Every symbol in the catalogue, in catalogue order. */
export function allSymbols(): StitchSymbol[] {
  return ALL_SYMBOLS.slice();
}

export function getSymbol(id: string | undefined): StitchSymbol | undefined {
  return id === undefined ? undefined : REGISTRY.get(id);
}

/** Symbols a given craft may use, including the craft-neutral ones. */
export function symbolsForCraft(craft: ChartCraft): StitchSymbol[] {
  return ALL_SYMBOLS.filter((s) => s.craft === craft || s.craft === "both");
}

export function symbolAllowedInCraft(symbol: StitchSymbol, craft: ChartCraft): boolean {
  return symbol.craft === craft || symbol.craft === "both";
}

/**
 * The stitch an empty cell means. A blank knitting cell is a knit stitch (purl
 * on WS); a blank crochet cell is a single crochet. Cells therefore never need
 * to store the commonest symbol, which keeps serialised charts small.
 */
export function plainSymbolId(craft: ChartCraft): string {
  return craft === "knitting" ? "k" : "sc";
}

export function plainSymbol(craft: ChartCraft): StitchSymbol {
  const symbol = getSymbol(plainSymbolId(craft));
  if (!symbol) throw new Error(`no plain symbol registered for craft ${craft}`);
  return symbol;
}

/** The worked form of a symbol on a given side of the fabric. */
export function workedForm(symbol: StitchSymbol, side: "RS" | "WS"): WorkedForm {
  return side === "RS" ? symbol.rs : symbol.ws;
}

// ---------------------------------------------------------------------------
// Artwork -> geometry (data only; rendering lives elsewhere)
// ---------------------------------------------------------------------------

export interface ArtRect {
  x: number;
  y: number;
  w: number;
  h: number;
  ink: "ink" | "accent" | "shade";
}

const INK_NAMES: Record<string, ArtRect["ink"]> = {
  "#": "ink",
  "+": "accent",
  ":": "shade",
};

/**
 * Convert a symbol bitmap into horizontally run-length-merged rectangles in
 * pixel-art units (0,0 = top-left, one unit = one art pixel). A canvas renderer
 * scales by cellSize / ART_CELL and fills; an SVG renderer emits one <rect>
 * each. Merging cuts the rect count for a solid glyph by roughly 5x.
 */
export function symbolArtRects(artwork: SymbolArt): ArtRect[] {
  const rects: ArtRect[] = [];
  artwork.pixels.forEach((row, y) => {
    let runStart = -1;
    let runInk: ArtRect["ink"] | undefined;
    const flush = (endExclusive: number) => {
      if (runStart >= 0 && runInk) {
        rects.push({ x: runStart, y, w: endExclusive - runStart, h: 1, ink: runInk });
      }
      runStart = -1;
      runInk = undefined;
    };
    for (let x = 0; x < row.length; x += 1) {
      const ink = INK_NAMES[row[x]];
      if (!ink) {
        flush(x);
        continue;
      }
      if (ink !== runInk) {
        flush(x);
        runStart = x;
        runInk = ink;
      }
    }
    flush(row.length);
  });
  return rects;
}

/**
 * An SVG path `d` for one ink layer of a symbol, in pixel-art units. Callers
 * set fill and a viewBox of `0 0 artwork.cols artwork.rows`; nothing here
 * touches the DOM.
 */
export function symbolArtPath(artwork: SymbolArt, ink: ArtRect["ink"] = "ink"): string {
  return symbolArtRects(artwork)
    .filter((r) => r.ink === ink)
    .map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`)
    .join("");
}
