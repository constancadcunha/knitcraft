/**
 * stitchDiagrams.ts — one hand-authored diagram per stitch in STITCH_LIBRARY.
 *
 * WHY THIS EXISTS
 * ---------------
 * The library this replaces resolved 45 image slots to 28 photographs, with a
 * single picture of flat stockinette illustrating a decrease, an increase, short
 * rows, i-cord and a gauge swatch. The rule here is the opposite one:
 *
 *     A diagram must show what the stitch DOES, not what finished fabric
 *     looks like, and no two stitches may share a drawing.
 *
 * So k2tog shows two stitches gathered into one leaning right (and ssk beside it
 * leaning left); a yarn over shows the actual hole; a cable shows one strand
 * passing visibly in front of the other. Where a stitch is a multi-step hand
 * operation — most of crochet — the diagram is a small strip of stages with the
 * loop count on the hook called out, because the loop count is the thing that
 * distinguishes sc from hdc from dc from tr and nothing else does.
 *
 * Textures ("what does the fabric look like") live in fabricSwatch.ts. These are
 * the technique drawings.
 *
 * Every drawing is palette-free: colours are named roles resolved at emit time.
 */

import {
  DEFAULT_PALETTE,
  PixelCanvas,
  chainLink,
  crochetPost,
  crochetX,
  knitV,
  purlBump,
  slipStitchDot,
  type DiagramPalette,
  type PaletteKey,
} from "./primitives";

// ─── shared layout ──────────────────────────────────────────────────────────

/** Every stitch diagram is the same size, so a grid of them lines up. */
const W = 80;
const H = 62;
/** Column origin for stitch `c` at pitch 9 (7-wide stitch + 2 gutter). */
const COL = (c: number) => 5 + c * 9;
/** Row origin for row `i`, counting UP from the bottom the way knitting grows. */
const ROW = (i: number) => 44 - i * 10;
/** Caption baselines. */
const CAP1 = 55;
const CAP2 = 60;
/** Three-stage strip origins, for the crochet "loops on the hook" diagrams. */
const STAGE = [4, 30, 56] as const;

function tag(
  cv: PixelCanvas,
  x: number,
  y: number,
  value: string,
  anchor: "start" | "middle" | "end" = "middle",
): void {
  cv.text(x, y, value, "text", { size: 3, anchor });
}

/** A row of `n` knit stitches on chart row `i`, starting at column `from`. */
function vRow(cv: PixelCanvas, i: number, n: number, key: PaletteKey = "yarn", from = 0): void {
  for (let c = 0; c < n; c++) knitV(cv, COL(from + c), ROW(i), key);
}

/** A row of `n` purl bumps on chart row `i`. */
function bumpRow(cv: PixelCanvas, i: number, n: number, key: PaletteKey = "yarn", from = 0): void {
  for (let c = 0; c < n; c++) purlBump(cv, COL(from + c), ROW(i), key);
}

/**
 * A crochet hook standing vertically with `loops` working loops on its shaft.
 * The loop count IS the lesson in every basic crochet stitch, so it is drawn
 * literally and labelled rather than implied.
 */
function hookWithLoops(cv: PixelCanvas, x: number, top: number, loops: number): void {
  cv.hook(x, top + 30, x, top, "tool");
  for (let i = 0; i < loops; i++) cv.oval(x, top + 10 + i * 5, 5, 2, "yarn");
}

/** A short run of stitch tops to work into — the "fabric below" in crochet. */
function stitchTops(cv: PixelCanvas, x: number, y: number, n: number, key: PaletteKey = "yarnAlt"): void {
  for (let i = 0; i < n; i++) chainLink(cv, x + i * 9, y, key, 4, 2);
}

// ─── spec table ─────────────────────────────────────────────────────────────

interface StitchDiagramSpec {
  /** Accessible label — what a screen reader announces for the figure. */
  title: string;
  /** One or two short lines rendered under the drawing. Keep under ~42 chars. */
  caption: readonly string[];
  draw(cv: PixelCanvas): void;
}

const SPECS: Record<string, StitchDiagramSpec> = {
  // ─── KNITTING ─────────────────────────────────────────────────────────────

  knit: {
    title: "Knit stitch: the right needle enters the front of the loop and pulls a new loop through",
    caption: ["k — enter front to back, wrap, pull through", "the new loop leaves a smooth V"],
    draw(cv) {
      const ny = 34;
      cv.needle(4, ny, 60, ny, "tool");
      for (let i = 0; i < 4; i++) cv.oval(13 + i * 12, ny + 5, 5, 4, "yarn");
      // Right needle entering front-to-back: it comes from the lower right and
      // passes in FRONT of the left needle, which is what "knitwise" means.
      cv.needle(76, 50, 42, 22, "tool");
      // Working yarn held at the back, wrapped anticlockwise round the tip.
      cv.quad([70, 48], [58, 34], [46, 26], "yarn", 1);
      knitV(cv, 38, 10, "highlight", { w: 11, h: 8, t: 2 });
      cv.arrow(46, 24, 44, 16, "highlight", 1, 2);
      tag(cv, 20, 14, "yarn at back", "start");
    },
  },

  purl: {
    title: "Purl stitch: the right needle enters from the right with the yarn in front, forming a bump",
    caption: ["p — yarn in front, enter right to left", "the new loop sits forward as a bump"],
    draw(cv) {
      const ny = 32;
      cv.needle(4, ny, 60, ny, "tool");
      for (let i = 0; i < 4; i++) cv.oval(13 + i * 12, ny + 5, 5, 4, "yarn");
      // Purlwise entry mirrors knitwise: down from the upper right, behind.
      cv.needle(76, 16, 42, 34, "tool");
      purlBump(cv, 34, 42, "highlight", { w: 14, h: 8, t: 2 });
      // Yarn drawn LAST so it paints over the needle — it is held in front.
      cv.quad([6, 50], [32, 46], [58, 40], "yarn", 2);
      tag(cv, 30, 22, "yarn in front", "start");
    },
  },

  stockinette: {
    title: "Stockinette: smooth knit V columns on the right side, purl bumps on the wrong side",
    caption: ["St st — knit RS rows, purl WS rows", "smooth front, bumpy back; edges curl"],
    draw(cv) {
      for (let i = 0; i < 3; i++) vRow(cv, i, 5);
      // The right-hand strip is folded over to expose the wrong side.
      for (let x = 50; x < 52; x++) cv.vline(x, 8, 44, "grid");
      for (let i = 0; i < 3; i++) bumpRow(cv, i, 2, "yarnAlt", 5);
      tag(cv, 24, 12, "right side");
      tag(cv, 64, 12, "back");
      // The curl: stockinette rolls because knit and purl rows differ in height.
      cv.quad([6, 50], [14, 53], [24, 49], "highlight", 1);
    },
  },

  garter: {
    title: "Garter stitch: knitting every row makes a ridge of purl bumps every two rows",
    caption: ["garter — knit every row when flat", "1 visible ridge = 2 rows worked"],
    draw(cv) {
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) bumpRow(cv, i, 6);
        else vRow(cv, i, 6);
      }
      // Bracket spanning one ridge + one valley = the 2-row repeat.
      cv.vline(72, ROW(1), 16, "highlight");
      cv.hline(69, ROW(1), 4, "highlight");
      cv.hline(69, ROW(1) + 15, 4, "highlight");
      tag(cv, 60, 12, "2 rows = 1 ridge", "middle");
    },
  },

  ribbing: {
    title: "Ribbing: alternating columns of knit and purl that pull in and spring back",
    caption: ["k2, p2 — knit columns, purl columns", "pulls in sideways, springs back"],
    draw(cv) {
      for (let i = 0; i < 4; i++) {
        for (let c = 0; c < 6; c++) {
          if (c % 4 >= 2) purlBump(cv, COL(c), ROW(i), "yarnAlt");
          else knitV(cv, COL(c), ROW(i), "yarn");
        }
      }
      // The elasticity is the point: purl columns recede, knit columns come
      // forward, so the fabric concertinas rather than stretching the yarn.
      cv.arrow(30, 10, 6, 10, "highlight", 1, 3);
      cv.arrow(50, 10, 74, 10, "highlight", 1, 3);
      tag(cv, 40, 12, "stretch");
    },
  },

  seed: {
    title: "Seed stitch: knit and purl alternate every stitch and again every row",
    caption: ["seed — k1, p1; then purl the knits", "no two like stitches ever stack"],
    draw(cv) {
      for (let i = 0; i < 4; i++) {
        for (let c = 0; c < 6; c++) {
          if ((c + i) % 2 === 1) purlBump(cv, COL(c), ROW(i), "yarnAlt");
          else knitV(cv, COL(c), ROW(i), "yarn");
        }
      }
      cv.arrow(COL(0) + 3, ROW(0) - 1, COL(1) + 3, ROW(1) + 6, "highlight", 1, 2);
      tag(cv, 40, 12, "offset every row");
    },
  },

  moss: {
    title: "Moss stitch: the same knit and purl pairs are held for two rows before swapping",
    caption: ["moss — hold each k/p pair for 2 rows", "a 4-row repeat, not seed's 2"],
    draw(cv) {
      for (let i = 0; i < 4; i++) {
        for (let c = 0; c < 6; c++) {
          if ((c + Math.floor(i / 2)) % 2 === 1) purlBump(cv, COL(c), ROW(i), "yarnAlt");
          else knitV(cv, COL(c), ROW(i), "yarn");
        }
      }
      // Brackets on the two-row blocks that make moss differ from seed.
      cv.vline(72, ROW(1), 16, "highlight");
      cv.vline(72, ROW(3), 16, "highlight");
      tag(cv, 40, 12, "2 rows the same");
    },
  },

  cable: {
    title: "Cable: half the stitches are held on a cable needle so the two strands cross",
    caption: ["cable — hold sts aside, work the rest,", "then work the held sts: strands cross"],
    draw(cv) {
      // Purl ground either side, so the rope stands proud.
      for (let i = 0; i < 5; i++) {
        purlBump(cv, COL(0), ROW(0) - i * 9 + 8, "grid");
        purlBump(cv, COL(6), ROW(0) - i * 9 + 8, "grid");
      }
      const a1 = 22;
      const a2 = 30;
      const b1 = 42;
      const b2 = 50;
      // Below the crossing: four vertical wales in two ropes.
      for (const x of [a1, a2]) cv.vline(x, 34, 16, "yarn", 2);
      for (const x of [b1, b2]) cv.vline(x, 34, 16, "yarnAlt", 2);
      // The crossing itself. The BACK strand is drawn first and is then broken
      // by the front strand painted over it — that occlusion is the entire
      // information content of a cable and no k/p symbol grid can carry it.
      cv.quad([a1, 34], [26, 26], [b1, 18], "yarnAlt", 2);
      cv.quad([a2, 34], [34, 26], [b2, 18], "yarnAlt", 2);
      cv.quad([b1, 34], [46, 26], [a1, 18], "highlight", 3);
      cv.quad([b2, 34], [54, 26], [a2, 18], "highlight", 3);
      // Above the crossing the ropes have swapped sides.
      for (const x of [a1, a2]) cv.vline(x, 8, 11, "highlight", 2);
      for (const x of [b1, b2]) cv.vline(x, 8, 11, "yarnAlt", 2);
      tag(cv, 14, 24, "held in front", "start");
    },
  },

  "yarn-over": {
    title: "Yarn over: wrapping the yarn adds a stitch and leaves a deliberate hole",
    caption: ["yo — wrap the yarn round the needle", "+1 stitch, and an eyelet you can see"],
    draw(cv) {
      vRow(cv, 0, 5);
      tag(cv, 74, ROW(0) + 5, "5 sts", "end");
      cv.arrow(40, ROW(0) - 2, 40, ROW(1) + 8, "grid", 1, 2);
      // The row above has six stitches; the third is the yarn over, which is a
      // strand laid over the needle with nothing pulled through it — a hole.
      for (const c of [0, 1, 3, 4, 5]) knitV(cv, COL(c), ROW(2), "yarn");
      const hx = COL(2) + 3;
      const hy = ROW(2) + 3;
      cv.erase(hx - 5, hy - 5, 11, 11);
      cv.ring(hx, hy, 4, "highlight", 2);
      tag(cv, 74, ROW(2) + 5, "6 sts", "end");
      tag(cv, hx, ROW(2) - 2, "hole");
    },
  },

  k2tog: {
    title: "k2tog and ssk: two stitches worked as one, leaning right or leaning left",
    caption: ["k2tog leans right · ssk leans left", "both take 2 stitches down to 1"],
    draw(cv) {
      // Two panels side by side, because a decrease is only readable against
      // its mirror: the ONLY difference between k2tog and ssk is which way the
      // surviving stitch tips, and that is what shaping a garment relies on.
      const panel = (px: number, lean: number, label: string) => {
        knitV(cv, px, ROW(0), "yarn");
        knitV(cv, px + 9, ROW(0), "yarnAlt");
        knitV(cv, px + 18, ROW(0), "yarnAlt");
        knitV(cv, px, ROW(1), "yarn");
        knitV(cv, px + 9, ROW(1), "highlight", { w: 16, lean, t: 2 });
        cv.arrow(px + 13, ROW(1) - 4, px + 13 + lean * 3, ROW(1) - 4, "highlight", 1, 2);
        tag(cv, px + 13, 12, label);
        tag(cv, px + 13, ROW(0) + 12, "2 sts → 1");
      };
      panel(4, 4, "k2tog");
      panel(44, -4, "ssk");
      cv.vline(39, 8, 40, "grid");
    },
  },

  increase: {
    title: "Make one: the running bar between two stitches is lifted and knitted to add a stitch",
    caption: ["m1 — lift the bar between stitches", "knit it twisted so it leaves no hole"],
    draw(cv) {
      vRow(cv, 0, 3, "yarn", 1);
      tag(cv, 74, ROW(0) + 5, "3 sts", "end");
      // The running bar: the horizontal strand between two stitches. Knitting it
      // *twisted* is what stops m1 opening into an eyelet like a yarn over.
      cv.hline(COL(2) - 2, ROW(0) - 1, 6, "highlight", 2);
      cv.arrow(COL(2) + 1, ROW(0) - 3, COL(2) + 1, ROW(1) + 8, "highlight", 1, 2);
      for (let c = 0; c < 4; c++) {
        knitV(cv, COL(c) + 4, ROW(2), c === 2 ? "highlight" : "yarn", c === 2 ? { t: 2 } : {});
      }
      // The twist, drawn as the legs crossing at the base of the new stitch.
      cv.line(COL(2) + 5, ROW(2) + 6, COL(2) + 10, ROW(2) + 8, "highlight");
      cv.line(COL(2) + 10, ROW(2) + 6, COL(2) + 5, ROW(2) + 8, "highlight");
      tag(cv, 74, ROW(2) + 5, "4 sts", "end");
      tag(cv, 20, 12, "the bar", "start");
    },
  },

  "slipped-stitch": {
    title: "Slipped stitch: passed to the other needle unworked, so its loop stretches over two rows",
    caption: ["sl — move it across without working it", "its loop stretches up over 2 rows"],
    draw(cv) {
      for (const c of [0, 2]) {
        knitV(cv, COL(c) + 14, ROW(0), "yarn");
        knitV(cv, COL(c) + 14, ROW(1), "yarn");
        knitV(cv, COL(c) + 14, ROW(2), "yarn");
      }
      // One tall V spanning both rows: the slipped stitch was never worked, so
      // there is only one loop where its neighbours have two.
      knitV(cv, COL(1) + 14, ROW(0), "highlight", { h: 16, t: 2 });
      // The yarn simply passes it by.
      cv.dashedH(COL(1) + 12, ROW(1) + 2, 12, "yarnAlt", 2, 2);
      tag(cv, 40, 12, "slipped: 1 loop, 2 rows tall");
    },
  },

  brioche: {
    title: "Brioche: a slipped stitch with a yarn over hugging it, then both worked together",
    caption: ["sl1yo — slip, and let the yarn over it", "brk — knit the stitch and its yo as one"],
    draw(cv) {
      knitV(cv, 12, ROW(0), "yarn", { w: 11, t: 2 });
      cv.quad([10, ROW(0) - 1], [18, ROW(1) + 4], [26, ROW(0) - 1], "highlight", 2);
      tag(cv, 18, 12, "sl1yo");
      cv.arrow(32, 28, 44, 28, "grid", 1, 2);
      // Worked together the pair makes one fat, rounded column — brioche's whole
      // look comes from every stitch carrying a second strand.
      knitV(cv, 52, ROW(0), "yarn", { w: 15, t: 2 });
      knitV(cv, 55, ROW(0) + 1, "highlight", { w: 9, h: 5, t: 2 });
      tag(cv, 60, 12, "brk");
      tag(cv, 40, ROW(0) + 13, "doubled columns, twice as plush");
    },
  },

  "short-rows": {
    title: "Short rows: turning before the end of a row builds a wedge of extra fabric",
    caption: ["turn early, leaving stitches unworked", "a wedge of extra rows on one side"],
    draw(cv) {
      const counts = [7, 6, 5, 4];
      for (let i = 0; i < counts.length; i++) {
        vRow(cv, i, counts[i]);
        // Each turn leaves a gap that must be closed (wrap & turn, or German
        // short rows) or the fabric shows a visible hole at the turning point.
        const tx = COL(counts[i]) - 2;
        cv.arrow(tx + 6, ROW(i) + 3, tx - 2, ROW(i) + 3, "highlight", 1, 2);
        cv.disc(tx + 7, ROW(i) + 3, 1, "yarnAlt");
      }
      tag(cv, 66, 12, "turn here", "middle");
    },
  },

  "stranded-colourwork": {
    title: "Stranded colourwork: two colours in a row, with the unused colour floating behind",
    caption: ["2 colours per row, one in each hand", "the unused colour floats on the back"],
    draw(cv) {
      // Front: a small peerie motif.
      const motif = [
        [0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 1, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0],
      ];
      for (let i = 0; i < 3; i++) {
        for (let c = 0; c < 7; c++) {
          knitV(cv, COL(c), ROW(i + 1), motif[2 - i][c] ? "yarnAlt" : "yarn");
        }
      }
      tag(cv, 40, 12, "front");
      cv.dashedH(4, ROW(0) - 2, 72, "grid", 3, 2);
      // Back: the floats. Long floats snag, which is why patterns limit them.
      cv.hline(6, ROW(0) + 2, 30, "yarnAlt", 2);
      cv.hline(36, ROW(0) + 6, 34, "yarn", 2);
      tag(cv, 40, ROW(0) + 13, "back: floats");
    },
  },

  lace: {
    title: "Lace: every yarn over is paired with a decrease so the stitch count stays put",
    caption: ["each yo (+1) pairs with a k2tog (-1)", "holes stack into a pattern, count holds"],
    draw(cv) {
      for (let i = 0; i < 4; i++) {
        const eyelet = i % 2 === 0 ? 1 : 4;
        for (let c = 0; c < 7; c++) {
          if (c === eyelet) continue;
          // The stitch next to each hole is the k2tog that pays for it, so it
          // is drawn leaning — that lean is how lace patterns stay in count.
          const isDecrease = c === eyelet + 1;
          knitV(cv, COL(c), ROW(i), isDecrease ? "yarnAlt" : "yarn", {
            lean: isDecrease ? 2 : 0,
          });
        }
        const hx = COL(eyelet) + 3;
        const hy = ROW(i) + 3;
        cv.erase(hx - 4, hy - 4, 9, 9);
        cv.ring(hx, hy, 3, "highlight");
      }
      tag(cv, 40, 12, "yo + k2tog, every repeat");
    },
  },

  icord: {
    title: "I-cord: three stitches knitted, slid back, and knitted again to form a tube",
    caption: ["k3, slide the sts back, never turn", "the pulled float closes it into a tube"],
    draw(cv) {
      cv.needle(4, 26, 48, 26, "tool");
      for (let i = 0; i < 3; i++) cv.oval(14 + i * 11, 31, 5, 4, "yarn");
      // Sliding rather than turning is the entire trick: the working yarn ends
      // up back at the right, so the float pulls the fabric round on itself.
      cv.arrow(12, 42, 44, 42, "highlight", 1, 3);
      tag(cv, 28, 48, "slide, do not turn");
      cv.quad([44, 36], [28, 46], [12, 36], "yarnAlt", 1);
      // The resulting cord.
      cv.frame(60, 10, 14, 38, "ink");
      for (let i = 0; i < 4; i++) knitV(cv, 62, 12 + i * 9, "yarn", { w: 10, h: 7 });
      tag(cv, 67, 8, "tube");
    },
  },

  // ─── CROCHET ──────────────────────────────────────────────────────────────

  "magic-ring": {
    title: "Magic ring: the first round is worked into a loop of yarn that is then pulled closed",
    caption: ["work round 1 into a loop of yarn", "then pull the tail: no hole left"],
    draw(cv) {
      cv.ring(30, 28, 15, "yarn", 2);
      // The stitches of round one, worked over the loop rather than into a chain.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        crochetX(cv, 30 + Math.cos(a) * 21, 28 + Math.sin(a) * 21, "yarnAlt", 3);
      }
      // The tail is the drawstring — this is why a magic ring closes flat and a
      // chain-4 ring leaves a visible hole in the middle of a hat crown.
      cv.quad([30, 43], [16, 50], [6, 44], "highlight", 2);
      cv.arrow(12, 48, 4, 42, "highlight", 1, 2);
      tag(cv, 62, 22, "pull the");
      tag(cv, 62, 27, "tail shut");
      tag(cv, 30, 10, "6 sc into the loop");
    },
  },

  "single-crochet": {
    title: "Single crochet: insert, pull up a loop to make two on the hook, then yarn over through both",
    caption: ["insert, yo & pull up = 2 loops", "yo and pull through both = 1 loop"],
    draw(cv) {
      stitchTops(cv, 10, 42, 2);
      hookWithLoops(cv, 12, 10, 1);
      tag(cv, 12, 50, "insert");
      hookWithLoops(cv, 38, 10, 2);
      tag(cv, 38, 50, "2 loops");
      crochetX(cv, 66, 30, "highlight", 5);
      tag(cv, 66, 50, "done: 1 loop");
      cv.arrow(22, 26, 30, 26, "grid", 1, 2);
      cv.arrow(48, 26, 56, 26, "grid", 1, 2);
    },
  },

  "slip-stitch-crochet": {
    title: "Slip stitch: pulled straight through the stitch and the loop on the hook, adding no height",
    caption: ["insert, yo, pull straight through both", "adds no height: joins, edges, ridges"],
    draw(cv) {
      stitchTops(cv, 12, 44, 3);
      hookWithLoops(cv, 14, 12, 1);
      cv.arrow(22, 30, 30, 44, "highlight", 1, 2);
      tag(cv, 20, 54, "straight through");
      // Height comparison — the only way to make "no height" legible is to put
      // it next to something that has height.
      slipStitchDot(cv, 54, 42, "highlight");
      slipStitchDot(cv, 62, 42, "highlight");
      slipStitchDot(cv, 70, 42, "highlight");
      crochetPost(cv, 54, 20, 40, "grid", 1);
      cv.arrow(46, 40, 46, 20, "grid", 1, 2);
      tag(cv, 64, 16, "vs a dc");
      tag(cv, 62, 50, "sl st");
    },
  },

  "half-double-crochet": {
    title: "Half double crochet: yarn over first, pull up a loop for three on the hook, then through all three",
    caption: ["yo FIRST, insert, pull up = 3 loops", "yo through all 3 at once"],
    draw(cv) {
      hookWithLoops(cv, STAGE[0] + 10, 10, 1);
      cv.oval(STAGE[0] + 10, 18, 7, 3, "highlight");
      tag(cv, STAGE[0] + 10, 50, "yo first");
      hookWithLoops(cv, STAGE[1] + 10, 10, 3);
      tag(cv, STAGE[1] + 10, 50, "3 loops");
      crochetPost(cv, STAGE[2] + 10, 16, 42, "highlight", 1);
      tag(cv, STAGE[2] + 10, 50, "through all 3");
      cv.arrow(STAGE[0] + 20, 26, STAGE[1] + 2, 26, "grid", 1, 2);
      cv.arrow(STAGE[1] + 20, 26, STAGE[2] + 2, 26, "grid", 1, 2);
    },
  },

  "double-crochet": {
    title: "Double crochet: yarn over, pull up a loop, then clear the loops two at a time",
    caption: ["yo, insert, pull up = 3 loops", "yo through 2, yo through 2"],
    draw(cv) {
      hookWithLoops(cv, STAGE[0] + 10, 10, 3);
      tag(cv, STAGE[0] + 10, 50, "3 loops");
      hookWithLoops(cv, STAGE[1] + 10, 10, 2);
      tag(cv, STAGE[1] + 10, 50, "through 2");
      crochetPost(cv, STAGE[2] + 10, 12, 44, "highlight", 1);
      tag(cv, STAGE[2] + 10, 50, "through 2 again");
      cv.arrow(STAGE[0] + 20, 26, STAGE[1] + 2, 26, "grid", 1, 2);
      cv.arrow(STAGE[1] + 20, 26, STAGE[2] + 2, 26, "grid", 1, 2);
    },
  },

  "treble-crochet": {
    title: "Treble crochet: yarn over twice for four loops, then clear them two at a time, three times",
    caption: ["yo TWICE, insert, pull up = 4 loops", "then through 2, through 2, through 2"],
    draw(cv) {
      hookWithLoops(cv, STAGE[0] + 10, 8, 4);
      tag(cv, STAGE[0] + 10, 50, "4 loops");
      hookWithLoops(cv, STAGE[1] + 10, 8, 3);
      tag(cv, STAGE[1] + 10, 50, "3, then 2");
      crochetPost(cv, STAGE[2] + 10, 8, 46, "highlight", 2);
      tag(cv, STAGE[2] + 10, 50, "tallest post");
      cv.arrow(STAGE[0] + 20, 26, STAGE[1] + 2, 26, "grid", 1, 2);
      cv.arrow(STAGE[1] + 20, 26, STAGE[2] + 2, 26, "grid", 1, 2);
    },
  },

  "crochet-decrease": {
    title: "Crochet decrease: two stitches left unfinished, then joined through a single final loop",
    caption: ["work 2 sts, stopping before the last yo", "then yo through all loops: one top"],
    draw(cv) {
      stitchTops(cv, 16, 46, 2, "yarnAlt");
      // Two posts that both stop one step early...
      cv.line(16, 46, 26, 24, "yarn", 2);
      cv.line(34, 46, 28, 24, "yarn", 2);
      // ...and are then gathered under one loop.
      cv.oval(27, 20, 7, 3, "highlight");
      tag(cv, 26, 12, "one top");
      cv.arrow(42, 30, 52, 30, "grid", 1, 2);
      // The result: two stitches of the row below, one stitch of this row.
      stitchTops(cv, 58, 46, 2, "yarnAlt");
      cv.line(58, 46, 66, 30, "highlight", 2);
      cv.line(67, 46, 68, 30, "highlight", 2);
      cv.oval(67, 28, 6, 3, "highlight");
      tag(cv, 66, 54, "2 → 1");
    },
  },

  "bobble-stitch": {
    title: "Bobble: several unfinished double crochet worked into one stitch and gathered at the top",
    caption: ["5 unfinished dc, all in ONE stitch", "yo through all of them: it pops out"],
    draw(cv) {
      // All five posts share a base stitch — that shared base is what forces the
      // fabric to bulge forward.
      const baseX = 26;
      const baseY = 46;
      for (let i = -2; i <= 2; i++) {
        cv.line(baseX, baseY, baseX + i * 5, 20, "yarn", 2);
        cv.hline(baseX + i * 5 - 2, 20, 5, "yarn");
      }
      cv.oval(baseX, 16, 8, 3, "highlight");
      slipStitchDot(cv, baseX, baseY, "yarnAlt");
      tag(cv, baseX, 10, "gathered");
      cv.arrow(44, 30, 52, 30, "grid", 1, 2);
      // The finished bobble seen from the front.
      cv.disc(66, 30, 9, "highlight");
      cv.ring(66, 30, 9, "ink");
      tag(cv, 66, 50, "a raised bump");
    },
  },

  "puff-stitch": {
    title: "Puff stitch: several loops drawn up to the same height and pulled through together",
    caption: ["yo & pull up a tall loop, 3-5 times", "then pull through all of them at once"],
    draw(cv) {
      // Loops, not posts. That is the whole difference from a bobble: nothing is
      // ever half-worked, so a puff is softer and rounder than a bobble.
      for (let i = 0; i < 3; i++) {
        cv.quad([22, 46], [16 + i * 6, 16], [22 + i * 8, 46], "yarn", 2);
      }
      cv.oval(28, 14, 9, 3, "highlight");
      tag(cv, 26, 8, "3 loose loops");
      cv.arrow(46, 30, 54, 30, "grid", 1, 2);
      cv.oval(66, 30, 9, 7, "highlight", 2);
      cv.oval(66, 30, 4, 6, "yarn");
      tag(cv, 66, 50, "soft and round");
    },
  },

  "v-stitch": {
    title: "V-stitch: a double crochet, a chain, and another double crochet all in the same stitch",
    caption: ["(dc, ch1, dc) all in ONE stitch", "the pair splays into a V"],
    draw(cv) {
      const baseX = 40;
      const baseY = 46;
      slipStitchDot(cv, baseX, baseY, "yarnAlt");
      cv.line(baseX, baseY, baseX - 14, 18, "highlight", 2);
      cv.line(baseX, baseY, baseX + 14, 18, "highlight", 2);
      cv.hline(baseX - 17, 18, 7, "highlight");
      cv.hline(baseX + 11, 18, 7, "highlight");
      // The chain-1 between the two posts is what holds the V open.
      chainLink(cv, baseX, 16, "yarn", 5, 3);
      tag(cv, baseX, 10, "ch 1");
      tag(cv, baseX, 54, "both posts share one base");
      cv.arrow(baseX - 6, baseY - 6, baseX - 12, baseY - 14, "grid", 1, 2);
      cv.arrow(baseX + 6, baseY - 6, baseX + 12, baseY - 14, "grid", 1, 2);
    },
  },

  "crochet-moss": {
    title: "Moss (linen) stitch: single crochet and chain alternate, each worked into the chain space below",
    caption: ["sc, ch1, sc, ch1 across the row", "next row: sc into each ch-space"],
    draw(cv) {
      for (let i = 0; i < 3; i++) {
        const y = 42 - i * 13;
        for (let c = 0; c < 5; c++) {
          const x = 10 + c * 15 + (i % 2 ? 7 : 0);
          if (x > 74) continue;
          crochetX(cv, x, y, "yarn", 3);
          chainLink(cv, x + 7, y, "yarnAlt", 3, 2);
        }
      }
      // The offset is the point: each sc drops into the gap of the row below,
      // which is what makes the fabric dense but drapey rather than holey.
      cv.arrow(24, 30, 31, 22, "highlight", 1, 2);
      tag(cv, 44, 10, "sc into the space below");
    },
  },

  "crochet-ribbing": {
    title: "Back-loop-only crochet: working the back loop alone leaves the front loop as a raised ridge",
    caption: ["work into the BACK loop only", "the unused front loop becomes a ridge"],
    draw(cv) {
      // A stitch top seen from above is two strands: front loop and back loop.
      tag(cv, 40, 12, "top of a stitch, seen from above");
      cv.quad([12, 26], [40, 16], [68, 26], "yarnAlt", 2);
      cv.quad([12, 34], [40, 44], [68, 34], "yarn", 2);
      tag(cv, 40, 22, "front loop: left alone");
      tag(cv, 40, 41, "back loop: work here");
      cv.hook(14, 52, 34, 34, "tool");
      // The resulting fabric: raised horizontal ridges that behave like rib.
      for (let i = 0; i < 2; i++) cv.hline(48, 48 + i * 5, 26, "highlight", 2);
      tag(cv, 61, 60, "ridges");
    },
  },

  "granny-square": {
    title: "Granny square: clusters of three double crochet separated by chain spaces, with two chains at each corner",
    caption: ["3-dc clusters, ch-1 between them", "ch-2 at every corner turns the square"],
    draw(cv) {
      cv.ring(40, 28, 4, "yarn");
      const cluster = (x: number, y: number, vertical: boolean) => {
        for (let i = 0; i < 3; i++) {
          if (vertical) cv.hline(x, y + i * 3, 9, "yarn", 1);
          else cv.vline(x + i * 3, y, 9, "yarn", 1);
        }
      };
      // Round 1: four clusters round the ring.
      cluster(36, 14, false);
      cluster(36, 36, false);
      cluster(18, 24, true);
      cluster(53, 24, true);
      // Round 2: the square, with the corners called out.
      cv.frame(8, 8, 64, 40, "grid");
      for (const [x, y] of [
        [8, 8],
        [68, 8],
        [8, 44],
        [68, 44],
      ] as const) {
        cv.rect(x, y, 4, 4, "highlight");
      }
      tag(cv, 40, 54, "corners: ch 2");
    },
  },

  "shell-stitch": {
    title: "Shell stitch: five double crochet worked into one stitch, with stitches skipped either side",
    caption: ["5 dc into ONE stitch = a fan", "skip stitches either side to keep flat"],
    draw(cv) {
      const baseX = 30;
      const baseY = 46;
      for (let i = -2; i <= 2; i++) {
        cv.line(baseX, baseY, baseX + i * 8, 18, "yarn", 2);
        cv.hline(baseX + i * 8 - 3, 18, 7, "yarn");
        cv.line(baseX + i * 8 - 2, 26, baseX + i * 8 + 2, 22, "yarn");
      }
      slipStitchDot(cv, baseX, baseY, "highlight");
      // Skipped stitches: without them the fan has nowhere to go and the fabric
      // ruffles instead of lying flat.
      for (const x of [10, 18, 42, 50]) {
        cv.line(x - 2, baseY - 2, x + 2, baseY + 2, "grid");
        cv.line(x + 2, baseY - 2, x - 2, baseY + 2, "grid");
      }
      tag(cv, 14, 54, "skip", "middle");
      tag(cv, 46, 54, "skip", "middle");
      // The scallop edge the stitch is loved for.
      cv.quad([58, 40], [66, 24], [74, 40], "highlight", 2);
      cv.quad([58, 48], [66, 32], [74, 48], "highlight", 2);
      tag(cv, 66, 14, "scallops");
    },
  },
};

// ─── public surface ─────────────────────────────────────────────────────────

/** Every stitch id this module can draw. Matches STITCH_LIBRARY exactly. */
export const STITCH_DIAGRAM_IDS: readonly string[] = Object.keys(SPECS);

export function hasStitchDiagram(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SPECS, id);
}

/** The accessible label for a stitch diagram, if one exists. */
export function stitchDiagramTitle(id: string): string | undefined {
  return SPECS[id]?.title;
}

const canvasCache = new Map<string, PixelCanvas>();

/**
 * The palette-free canvas for a stitch. Cached, because the drawing carries no
 * colour: one build serves a light theme, a dark theme and a print stylesheet.
 */
export function stitchDiagramCanvas(id: string): PixelCanvas | undefined {
  const spec = SPECS[id];
  if (!spec) return undefined;
  const hit = canvasCache.get(id);
  if (hit) return hit;
  const cv = new PixelCanvas(W, H, { title: spec.title });
  spec.draw(cv);
  spec.caption.forEach((line, i) => {
    cv.text(W / 2, i === 0 ? CAP1 : CAP2, line, "text", { size: 3, anchor: "middle" });
  });
  canvasCache.set(id, cv);
  return cv;
}

/** Render a stitch diagram as an SVG string, or undefined if there is none. */
export function stitchDiagram(
  id: string,
  palette: DiagramPalette = DEFAULT_PALETTE,
): string | undefined {
  return stitchDiagramCanvas(id)?.toSVG(palette);
}
