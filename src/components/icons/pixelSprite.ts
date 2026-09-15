/**
 * pixelSprite.ts — ASCII art → PixelCanvas.
 *
 * WHY ASCII AND NOT DRAWING CODE
 * ------------------------------
 * The stitch diagrams next door are authored procedurally, because a stitch is a
 * described operation: "two legs gathered into one, leaning right". A garment
 * icon is the opposite — it is a SILHOUETTE, and the only thing that matters is
 * whether a human recognises it at 40px. Silhouettes are impossible to review as
 * code (`quad([9,6],[16,2],[23,6])` tells nobody whether the sweater reads as a
 * sweater) and trivial to review as a picture. So every garment sprite below is
 * literally a picture in the source file: one character per cell, editable by
 * anyone who can count columns.
 *
 * Colour still never appears. A character names a PALETTE ROLE, exactly like the
 * rest of the diagram library, and the role is resolved to a token at emit time
 * by `PixelCanvas.toSVG(palette)`. It is structurally impossible to bake a hex
 * value into a sprite.
 */

import { PixelCanvas, type CanvasOptions, type PaletteKey } from "@/lib/diagrams/primitives";

/**
 * The seven characters a sprite may use. Kept deliberately short and visually
 * distinct so a 32-row block of art stays readable as a picture in a diff:
 * `#` is the heavy outline, lowercase letters are fabric, `.` is nothing.
 */
export const SPRITE_INK: Record<string, PaletteKey> = {
  "#": "ink", //  chunky outline — every shape is outlined, comic-book style
  y: "yarn", //   the main fabric colour
  a: "yarnAlt", // contrast fabric: ribbing, heels, bands, stripes
  h: "highlight", // small accents: buttons, pompoms, a motif
  t: "tool", //   hardware that is not fabric: hoop, needle, bag handle
  g: "grid", //   faint fill: cloth ground, shadow, a fold
};

/** `.` is transparent — the host surface shows through, so icons sit on any panel. */
export const SPRITE_EMPTY = ".";

/**
 * Paint order. Cells never overlap (one character = one cell), so this exists
 * purely to coalesce the canvas into one `<path>` per role: PixelCanvas merges
 * *consecutive* ops that share a key, so painting role-by-role turns a 32x32
 * sprite into six paths instead of a thousand.
 *
 * Ink goes last so that, if a future sprite ever does overlap, the outline wins.
 */
const PAINT_ORDER: readonly PaletteKey[] = ["grid", "yarn", "yarnAlt", "highlight", "tool", "ink"];

/** A sprite is a rectangular block of rows, all the same length. */
export type SpriteArt = readonly string[];

export interface SpriteProblem {
  row: number;
  message: string;
}

/**
 * Validate a block of art. Returns every problem rather than throwing on the
 * first, because a mis-typed sprite is usually mis-typed in several rows and
 * fixing them one round-trip at a time is miserable.
 */
export function spriteProblems(art: SpriteArt): SpriteProblem[] {
  const problems: SpriteProblem[] = [];
  if (art.length === 0) return [{ row: 0, message: "sprite has no rows" }];
  const width = art[0].length;
  art.forEach((row, index) => {
    if (row.length !== width) {
      problems.push({ row: index, message: `width ${row.length}, expected ${width}` });
    }
    for (const ch of row) {
      if (ch !== SPRITE_EMPTY && !SPRITE_INK[ch]) {
        problems.push({ row: index, message: `unknown character ${JSON.stringify(ch)}` });
      }
    }
  });
  return problems;
}

/**
 * Rasterise art onto a canvas sized to it. Throws on malformed art: a sprite
 * with a short row silently shifts every cell after it, which is the kind of bug
 * that ships a sweater with one sleeve.
 */
export function spriteCanvas(art: SpriteArt, options: CanvasOptions = {}): PixelCanvas {
  const problems = spriteProblems(art);
  if (problems.length) {
    const detail = problems.map((p) => `row ${p.row}: ${p.message}`).join("; ");
    throw new Error(`malformed sprite — ${detail}`);
  }

  const canvas = new PixelCanvas(art[0].length, art.length, options);
  for (const key of PAINT_ORDER) {
    art.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (SPRITE_INK[row[x]] === key) canvas.px(x, y, key);
      }
    });
  }
  return canvas;
}
