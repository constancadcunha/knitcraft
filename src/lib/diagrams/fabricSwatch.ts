/**
 * fabricSwatch.ts — procedural "what the fabric looks like" tiles.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every stitch in the dictionary wants a picture of the finished fabric next to
 * it. Previously that picture was a photograph, and one photograph of flat
 * stockinette was doing duty for six different stitches. Generating the fabric
 * instead means every stitch gets a tile that is (a) licence-free, (b) actually
 * the fabric that stitch produces, and (c) drawn in the app's own pixel idiom.
 *
 * These are TILES, not diagrams: they show texture, not technique. Use them
 * beside a stitch card, and as the deliberate fallback when no hand-authored
 * diagram exists — a generic knitted texture is honest, whereas a photo of the
 * wrong stitch is a lie a learner will act on.
 */

import {
  DEFAULT_PALETTE,
  PixelCanvas,
  chainLink,
  crochetPost,
  crochetX,
  knitV,
  purlBump,
  type DiagramPalette,
  type PaletteKey,
} from "./primitives";

/** One knitted stitch occupies 7x6 cells with a 1-cell gutter: pitch 8 x 7. */
const PITCH_X = 8;
const PITCH_Y = 7;

export type FabricKind =
  | "stockinette"
  | "reverse-stockinette"
  | "garter"
  | "rib1x1"
  | "rib2x2"
  | "seed"
  | "moss"
  | "cable"
  | "eyelet-lace"
  | "colourwork"
  | "slip-stitch-texture"
  | "brioche"
  | "single-crochet"
  | "half-double-crochet"
  | "double-crochet"
  | "treble-crochet"
  | "granny"
  | "shell"
  | "chain-mesh"
  | "puff"
  | "bobble"
  | "crochet-rib"
  | "generic-knit"
  | "generic-crochet";

export const FABRIC_KINDS: readonly FabricKind[] = [
  "stockinette",
  "reverse-stockinette",
  "garter",
  "rib1x1",
  "rib2x2",
  "seed",
  "moss",
  "cable",
  "eyelet-lace",
  "colourwork",
  "slip-stitch-texture",
  "brioche",
  "single-crochet",
  "half-double-crochet",
  "double-crochet",
  "treble-crochet",
  "granny",
  "shell",
  "chain-mesh",
  "puff",
  "bobble",
  "crochet-rib",
  "generic-knit",
  "generic-crochet",
];

/** Human-readable name for each texture — also the tile's accessible label. */
export const FABRIC_LABELS: Record<FabricKind, string> = {
  stockinette: "Stockinette fabric: columns of smooth knit V's",
  "reverse-stockinette": "Reverse stockinette fabric: all purl bumps",
  garter: "Garter fabric: horizontal ridges, one every two rows",
  rib1x1: "1x1 rib: alternating knit and purl columns",
  rib2x2: "2x2 rib: pairs of knit and purl columns",
  seed: "Seed stitch: knit and purl alternating every stitch and every row",
  moss: "Moss stitch: knit/purl pairs held for two rows before swapping",
  cable: "Cable fabric: a rope crossing over a purl ground",
  "eyelet-lace": "Eyelet lace: staggered holes made by yarn overs",
  colourwork: "Stranded colourwork: a two-colour motif",
  "slip-stitch-texture": "Slip-stitch texture: elongated stitches spanning two rows",
  brioche: "Brioche: fat columns of doubled stitches",
  "single-crochet": "Single crochet fabric: dense offset rows",
  "half-double-crochet": "Half double crochet fabric: short barred posts",
  "double-crochet": "Double crochet fabric: tall posts with open bases",
  "treble-crochet": "Treble crochet fabric: very tall, open posts",
  granny: "Granny fabric: clusters of three double crochet with chain spaces",
  shell: "Shell fabric: fans of five double crochet",
  "chain-mesh": "Chain mesh: an open net of chain loops",
  puff: "Puff fabric: rounded clusters in offset rows",
  bobble: "Bobble fabric: raised bobbles on a flat ground",
  "crochet-rib": "Back-loop-only crochet rib: ridged columns",
  "generic-knit": "Knitted fabric",
  "generic-crochet": "Crocheted fabric",
};

export interface FabricSwatchOptions {
  /** Canvas width in cells. Default 56 (seven knitted stitches). */
  cols?: number;
  /** Canvas height in cells. Default 42 (six knitted rows). */
  rows?: number;
  /** Pixels per cell. Default 4. */
  scale?: number;
}

const cache = new Map<string, PixelCanvas>();

/** Build (and memoise) the palette-free canvas for a texture. */
export function fabricSwatchCanvas(
  kind: FabricKind,
  options: FabricSwatchOptions = {},
): PixelCanvas {
  const cols = options.cols ?? 56;
  const rows = options.rows ?? 42;
  const scale = options.scale ?? 4;
  const cacheKey = `${kind}|${cols}|${rows}|${scale}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const cv = new PixelCanvas(cols, rows, { scale, title: FABRIC_LABELS[kind] });
  draw(cv, kind);
  cache.set(cacheKey, cv);
  return cv;
}

/** Render a texture tile as an SVG string. */
export function fabricSwatch(
  kind: FabricKind,
  palette: DiagramPalette = DEFAULT_PALETTE,
  options: FabricSwatchOptions = {},
): string {
  return fabricSwatchCanvas(kind, options).toSVG(palette);
}

// ─── the textures ───────────────────────────────────────────────────────────

function gridSize(cv: PixelCanvas): { nc: number; nr: number } {
  return { nc: Math.floor(cv.cols / PITCH_X), nr: Math.floor(cv.rows / PITCH_Y) };
}

const cx = (c: number) => c * PITCH_X;
const cy = (r: number) => r * PITCH_Y;

/** Knit or purl every cell of the grid according to a predicate. */
function knitPurlField(
  cv: PixelCanvas,
  isPurl: (col: number, row: number) => boolean,
  key: PaletteKey = "yarn",
): void {
  const { nc, nr } = gridSize(cv);
  for (let r = 0; r < nr; r++) {
    for (let c = 0; c < nc; c++) {
      if (isPurl(c, r)) purlBump(cv, cx(c), cy(r), key);
      else knitV(cv, cx(c), cy(r), key);
    }
  }
}

function draw(cv: PixelCanvas, kind: FabricKind): void {
  const { nc, nr } = gridSize(cv);
  switch (kind) {
    case "stockinette":
    case "generic-knit":
      knitPurlField(cv, () => false);
      return;

    case "reverse-stockinette":
      knitPurlField(cv, () => true);
      return;

    case "garter":
      // Garter seen from the front alternates a ridge of purl bumps with a row
      // of knit V's — which is why two worked rows make one visible ridge.
      knitPurlField(cv, (_c, r) => r % 2 === 0);
      return;

    case "rib1x1":
      knitPurlField(cv, (c) => c % 2 === 1);
      return;

    case "rib2x2":
      knitPurlField(cv, (c) => c % 4 >= 2);
      return;

    case "seed":
      // Offset by one every row, so no purl ever sits above a purl.
      knitPurlField(cv, (c, r) => (c + r) % 2 === 1);
      return;

    case "moss":
      // Double (American) moss: the same k/p arrangement is held for two rows,
      // then swapped — a four-row repeat, unlike seed's two.
      knitPurlField(cv, (c, r) => (c + Math.floor(r / 2)) % 2 === 1);
      return;

    case "cable": {
      // A 2-over-2 rope on a purl ground. The crossing row is drawn as one
      // strand passing visibly OVER the other; that occlusion is the whole
      // point of a cable and no k/p symbol grid can express it.
      knitPurlField(cv, (c) => c < 1 || c > 4);
      const left = cx(1);
      const right = cx(4) + 6;
      for (let r = 0; r < nr; r++) {
        const y = cy(r);
        if (r === Math.floor(nr / 2)) {
          // back strand first, then the front strand painted over it
          cv.quad([left, y], [(left + right) / 2, y + 3], [right, y + 6], "yarnAlt", 2);
          cv.quad([right, y], [(left + right) / 2, y + 3], [left, y + 6], "highlight", 2);
        } else {
          cv.vline(left + 1, y, PITCH_Y, "yarn", 2);
          cv.vline(right - 2, y, PITCH_Y, "yarn", 2);
          cv.vline(Math.round((left + right) / 2) - 4, y, PITCH_Y, "yarn", 2);
          cv.vline(Math.round((left + right) / 2) + 2, y, PITCH_Y, "yarn", 2);
        }
      }
      return;
    }

    case "eyelet-lace": {
      knitPurlField(cv, () => false);
      // Holes on a staggered half-drop, the commonest eyelet layout.
      for (let r = 0; r < nr; r++) {
        for (let c = r % 2; c < nc; c += 2) {
          const hx = cx(c) + 3;
          const hy = cy(r) + 3;
          cv.erase(hx - 3, hy - 3, 7, 7);
          cv.ring(hx, hy, 3, "highlight");
        }
      }
      return;
    }

    case "colourwork": {
      // A peerie diamond: contrast colour where the motif is, main elsewhere.
      const mid = (nc - 1) / 2;
      for (let r = 0; r < nr; r++) {
        for (let c = 0; c < nc; c++) {
          const inMotif = Math.abs(c - mid) + Math.abs(r - (nr - 1) / 2) <= 1.5;
          knitV(cv, cx(c), cy(r), inMotif ? "yarnAlt" : "yarn");
        }
      }
      return;
    }

    case "slip-stitch-texture": {
      knitPurlField(cv, () => false);
      // Every other stitch on every other row is slipped: it never gets worked,
      // so its single loop stretches up across two rows.
      for (let r = 0; r < nr - 1; r += 2) {
        for (let c = 1; c < nc; c += 2) {
          const x = cx(c);
          const y = cy(r);
          cv.erase(x, y, PITCH_X, PITCH_Y * 2);
          knitV(cv, x, y, "highlight", { h: PITCH_Y * 2 - 1 });
        }
      }
      return;
    }

    case "brioche": {
      // Brioche columns are doubled: a stitch and the yarn-over that hugs it,
      // worked together, so each knit column reads twice as wide and rounded.
      for (let r = 0; r < nr; r++) {
        for (let c = 0; c < nc; c++) {
          if (c % 2 === 0) {
            knitV(cv, cx(c), cy(r), "yarn", { w: PITCH_X - 1 });
            knitV(cv, cx(c) + 1, cy(r) + 1, "yarn", { w: PITCH_X - 3, h: 4 });
          } else {
            purlBump(cv, cx(c), cy(r), "yarnAlt");
          }
        }
      }
      return;
    }

    case "single-crochet":
    case "generic-crochet": {
      // sc is short and dense: rows sit close and offset by half a stitch.
      for (let r = 0; cy(r) + 6 < cv.rows; r++) {
        for (let c = 0; cx(c) + 7 <= cv.cols + 2; c++) {
          crochetX(cv, cx(c) + 3 + (r % 2 ? 4 : 0), cy(r) + 3, "yarn", 3);
        }
      }
      return;
    }

    case "half-double-crochet": {
      for (let r = 0; r < Math.floor(cv.rows / 10); r++) {
        for (let c = 0; c < Math.floor(cv.cols / 8); c++) {
          crochetPost(cv, cx(c) + 3, r * 10 + 1, r * 10 + 8, "yarn", 1);
        }
      }
      return;
    }

    case "double-crochet": {
      for (let r = 0; r < Math.floor(cv.rows / 13); r++) {
        for (let c = 0; c < Math.floor(cv.cols / 8); c++) {
          crochetPost(cv, cx(c) + 3, r * 13 + 1, r * 13 + 11, "yarn", 1);
        }
      }
      return;
    }

    case "treble-crochet": {
      for (let r = 0; r < Math.floor(cv.rows / 17); r++) {
        for (let c = 0; c < Math.floor(cv.cols / 8); c++) {
          crochetPost(cv, cx(c) + 3, r * 17 + 1, r * 17 + 15, "yarn", 2);
        }
      }
      return;
    }

    case "granny": {
      // Three dc, chain space, three dc — the cluster-and-gap rhythm that makes
      // granny fabric read as lacy blocks rather than solid rows.
      for (let r = 0; r < Math.floor(cv.rows / 13); r++) {
        const top = r * 13 + 1;
        for (let cluster = 0; cluster * 20 + 16 <= cv.cols + 4; cluster++) {
          const base = cluster * 20 + 2;
          for (let i = 0; i < 3; i++) {
            crochetPost(cv, base + i * 4, top, top + 10, "yarn", 1, 3);
          }
          chainLink(cv, base + 14, top + 5, "yarnAlt", 3, 2);
        }
      }
      return;
    }

    case "shell": {
      // Five dc worked into one stitch: the posts fan from a shared base.
      for (let r = 0; r < Math.floor(cv.rows / 14); r++) {
        const base = r * 14 + 12;
        for (let s = 0; s * 22 + 20 <= cv.cols + 4; s++) {
          const anchor = s * 22 + 11;
          for (let i = -2; i <= 2; i++) {
            cv.line(anchor, base, anchor + i * 4, base - 10, "yarn", 1);
            cv.hline(anchor + i * 4 - 1, base - 10, 3, "yarn");
          }
          cv.disc(anchor, base, 1, "yarnAlt");
        }
      }
      return;
    }

    case "chain-mesh": {
      // Chain loops swagged between anchor stitches: open filet-style netting.
      for (let r = 0; r * 12 + 10 < cv.rows; r++) {
        const y = r * 12 + 5;
        const offset = r % 2 ? 7 : 0;
        for (let c = 0; c * 14 + offset + 12 <= cv.cols; c++) {
          const x = c * 14 + offset;
          cv.quad([x, y], [x + 7, y + 8], [x + 14, y], "yarn", 1);
          cv.disc(x, y, 1, "yarnAlt");
        }
      }
      return;
    }

    case "puff": {
      for (let r = 0; r * 12 + 11 < cv.rows; r++) {
        for (let c = 0; c * 12 + 11 < cv.cols + 2; c++) {
          const px = c * 12 + 6 + (r % 2 ? 6 : 0);
          const py = r * 12 + 6;
          cv.oval(px, py, 5, 4, "yarn");
          cv.oval(px, py, 2, 3, "yarnAlt");
        }
      }
      return;
    }

    case "bobble": {
      knitPurlField(cv, () => false);
      for (let r = 1; r < nr; r += 2) {
        for (let c = r % 4 === 1 ? 1 : 3; c < nc; c += 3) {
          cv.disc(cx(c) + 3, cy(r) + 3, 4, "highlight");
          cv.ring(cx(c) + 3, cy(r) + 3, 4, "ink");
        }
      }
      return;
    }

    case "crochet-rib": {
      // Working into the back loop only leaves the unused front loop as a raised
      // horizontal ridge, so the fabric reads as vertical columns of bars.
      for (let c = 0; c * 10 + 8 <= cv.cols; c++) {
        const x = c * 10 + 1;
        for (let y = 2; y + 6 < cv.rows; y += 8) {
          cv.hline(x, y, 8, "yarn", 2);
          cv.hline(x, y + 4, 8, "yarnAlt");
        }
      }
      return;
    }
  }
}

/**
 * Which texture a stitch id produces. Every id in STITCH_LIBRARY is covered;
 * anything unknown falls back by craft type in `index.ts` rather than guessing.
 */
export const FABRIC_FOR_STITCH: Record<string, FabricKind> = {
  // knitting
  knit: "stockinette",
  purl: "reverse-stockinette",
  stockinette: "stockinette",
  garter: "garter",
  ribbing: "rib2x2",
  seed: "seed",
  moss: "moss",
  cable: "cable",
  "yarn-over": "eyelet-lace",
  k2tog: "stockinette",
  increase: "stockinette",
  "slipped-stitch": "slip-stitch-texture",
  brioche: "brioche",
  "short-rows": "stockinette",
  "stranded-colourwork": "colourwork",
  lace: "eyelet-lace",
  icord: "stockinette",
  // crochet
  "magic-ring": "single-crochet",
  "single-crochet": "single-crochet",
  "slip-stitch-crochet": "crochet-rib",
  "half-double-crochet": "half-double-crochet",
  "double-crochet": "double-crochet",
  "treble-crochet": "treble-crochet",
  "crochet-decrease": "single-crochet",
  "bobble-stitch": "bobble",
  "puff-stitch": "puff",
  "v-stitch": "chain-mesh",
  "crochet-moss": "chain-mesh",
  "crochet-ribbing": "crochet-rib",
  "granny-square": "granny",
  "shell-stitch": "shell",
};
