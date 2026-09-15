/**
 * A hand-authored Fair Isle sampler used as the home-page chart preview.
 *
 * Written as character art so the motif is legible and editable in source —
 * this is a real, symmetrical Nordic star band, not procedural noise. Each
 * character maps to a palette index:
 *   "." background   "#" main   "o" ink   "+" highlight
 */

const KEY: Record<string, number> = { ".": 0, "#": 1, o: 2, "+": 3 };

/** 13x13 eight-point Nordic star (selburose-style), the band's centrepiece. */
const STAR = [
  "......#......",
  ".#....#....#.",
  "..#...#...#..",
  "...#..#..#...",
  "....#.#.#....",
  ".....###.....",
  "#####.#.#####",
  ".....###.....",
  "....#.#.#....",
  "...#..#..#...",
  "..#...#...#..",
  ".#....#....#.",
  "......#......",
];

/** 7x7 diamond "peerie" motif that fills the narrower bands. */
const DIAMOND = [
  "...o...",
  "..o.o..",
  ".o...o.",
  "o.....o",
  ".o...o.",
  "..o.o..",
  "...o...",
];

const WIDTH = 40;

function blankRow(): string[] {
  return Array.from({ length: WIDTH }, () => ".");
}

/** Stamp a motif repeatedly across a row band, centred with even spacing. */
function stampBand(
  rows: string[][],
  motif: string[],
  topRow: number,
  repeats: number
): void {
  const motifWidth = motif[0].length;
  const gap = (WIDTH - repeats * motifWidth) / (repeats + 1);

  for (let r = 0; r < repeats; r += 1) {
    const left = Math.round(gap * (r + 1) + motifWidth * r);
    for (let y = 0; y < motif.length; y += 1) {
      const target = rows[topRow + y];
      if (!target) continue;
      for (let x = 0; x < motifWidth; x += 1) {
        const ch = motif[y][x];
        if (ch === ".") continue;
        if (left + x < WIDTH) target[left + x] = ch;
      }
    }
  }
}

function solid(rows: string[][], row: number, ch: string): void {
  if (rows[row]) rows[row] = Array.from({ length: WIDTH }, () => ch);
}

function alternating(rows: string[][], row: number, a: string, b: string): void {
  if (rows[row]) rows[row] = Array.from({ length: WIDTH }, (_, i) => (i % 2 ? a : b));
}

/** Build the sampler as a grid of palette indices, row 0 at the top. */
export function buildSamplerGrid(): number[][] {
  const rows: string[][] = Array.from({ length: 30 }, blankRow);

  solid(rows, 0, "#");
  solid(rows, 1, "#");
  alternating(rows, 2, "#", ".");
  solid(rows, 3, "o");

  stampBand(rows, STAR, 5, 2);

  solid(rows, 19, "o");
  alternating(rows, 20, "+", ".");
  solid(rows, 21, "o");

  stampBand(rows, DIAMOND, 23, 4);

  return rows.map((row) => row.map((ch) => KEY[ch] ?? 0));
}

/** Palette indices align with buildSamplerGrid's KEY. */
export const SAMPLER_PALETTE = ["#fffdf6", "#e2483d", "#1f1b2e", "#f2b53c"];
export const SAMPLER_WIDTH = WIDTH;
