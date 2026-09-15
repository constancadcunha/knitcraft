/**
 * techniqueDiagrams.ts — numbered step sequences for the Learn page techniques.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Learn page's fourteen "Essentials" cards each carry three written steps and
 * a photograph. Nine of those photographs did not depict the technique at all —
 * "Bind off", "Picking up stitches" and "Gauge swatch" were all illustrated by a
 * plain swatch of stockinette, and "Mattress stitch seam" by a photo of a CROCHET
 * slip stitch. A technique is a sequence of hand movements; the only honest
 * picture of one is a sequence.
 *
 * Each technique here is three numbered steps. The step number is drawn inside
 * the SVG (so a step can never be shown out of order or unlabelled) while the
 * caption is exposed as data, so the page can typeset it properly.
 */

import {
  DEFAULT_PALETTE,
  PixelCanvas,
  chainLink,
  crochetPost,
  crochetX,
  knitV,
  slipStitchDot,
  type DiagramPalette,
} from "./primitives";
import type { CraftType } from "@/types";

const W = 64;
const H = 48;

function tag(
  cv: PixelCanvas,
  x: number,
  y: number,
  value: string,
  anchor: "start" | "middle" | "end" = "middle",
): void {
  cv.text(x, y, value, "text", { size: 3, anchor });
}

/**
 * The step number, drawn in the highlight colour with a rule under it. Drawn as
 * coloured text rather than a numeral reversed out of a filled badge, because a
 * filled badge needs a guaranteed contrast pair and this library refuses to
 * assume anything about the surface it is rendered on.
 */
function stepBadge(cv: PixelCanvas, n: number): void {
  cv.text(3, 9, String(n), "highlight", { size: 8, anchor: "start", bold: true });
  cv.hline(3, 11, 6, "highlight", 2);
}

/** A knitting needle lying across the canvas with `n` live loops on it. */
function needleWithLoops(cv: PixelCanvas, y: number, n: number, x0 = 6, dx = 10): void {
  cv.needle(4, y, W - 6, y, "tool");
  for (let i = 0; i < n; i++) cv.oval(x0 + i * dx, y + 4, 4, 3, "yarn");
}

/** A small blocked-out piece of fabric. */
function swatch(cv: PixelCanvas, x: number, y: number, w: number, h: number): void {
  cv.frame(x, y, w, h, "ink");
  for (let r = 0; r * 7 + 6 < h; r++) {
    for (let c = 0; c * 8 + 7 < w; c++) knitV(cv, x + 2 + c * 8, y + 2 + r * 7, "yarn");
  }
}

interface StepSpec {
  caption: string;
  title: string;
  draw(cv: PixelCanvas): void;
}

export interface TechniqueSpec {
  id: string;
  craftType: CraftType;
  /** Matches the Learn page's ESSENTIALS titles so the page can look it up. */
  title: string;
  steps: readonly StepSpec[];
}

// ─── the techniques ─────────────────────────────────────────────────────────

const SPECS: readonly TechniqueSpec[] = [
  {
    id: "cast-on",
    craftType: "knitting",
    title: "Cast on",
    steps: [
      {
        caption: "Slip knot on the needle. That is stitch one.",
        title: "A slip knot on the needle",
        draw(cv) {
          cv.needle(6, 26, 58, 26, "tool");
          cv.oval(24, 30, 6, 5, "highlight", 2);
          cv.quad([24, 35], [18, 44], [8, 42], "yarn", 2);
          tag(cv, 34, 44, "pull to tighten", "start");
        },
      },
      {
        caption: "Long tail: hook the thumb loop, catch the finger strand, pull it through.",
        title: "The needle dips through the thumb loop and catches the far strand",
        draw(cv) {
          // The long-tail sling: tail over the thumb, ball yarn over the finger.
          cv.quad([8, 44], [16, 20], [30, 30], "yarn", 2);
          cv.quad([30, 30], [44, 20], [56, 44], "yarnAlt", 2);
          cv.needle(10, 40, 40, 22, "tool");
          cv.arrow(34, 26, 44, 30, "highlight", 1, 2);
          tag(cv, 12, 20, "tail", "start");
          tag(cv, 52, 20, "ball", "end");
        },
      },
      {
        caption: "Repeat for every stitch. This edge becomes the hem.",
        title: "A row of cast-on stitches on the needle",
        draw(cv) {
          needleWithLoops(cv, 22, 5, 10, 11);
          for (let i = 0; i < 5; i++) knitV(cv, 7 + i * 11, 30, "yarn", { w: 8, h: 6 });
          cv.hline(4, 40, 56, "highlight", 2);
          tag(cv, 32, 46, "cast-on edge = the hem");
        },
      },
    ],
  },
  {
    id: "bind-off",
    craftType: "knitting",
    title: "Bind off (cast off)",
    steps: [
      {
        caption: "Knit two stitches so both sit on the right needle.",
        title: "Two stitches on the right needle",
        draw(cv) {
          cv.needle(58, 34, 12, 20, "tool");
          cv.oval(24, 26, 5, 4, "yarn");
          cv.oval(36, 30, 5, 4, "yarn");
          tag(cv, 30, 44, "2 sts on the right needle");
        },
      },
      {
        caption: "Lift the first stitch over the second and off the needle.",
        title: "The first stitch is lifted over the second and dropped off",
        draw(cv) {
          cv.needle(58, 34, 12, 20, "tool");
          cv.oval(36, 30, 5, 4, "yarn");
          cv.oval(22, 20, 5, 4, "highlight");
          cv.arrow(24, 26, 14, 34, "highlight", 1, 3);
          tag(cv, 34, 46, "one stitch bound off");
        },
      },
      {
        caption: "Repeat to one stitch. Cut the yarn and pull the tail through.",
        title: "The last loop with the yarn tail pulled through it",
        draw(cv) {
          cv.hline(6, 24, 52, "yarn", 2);
          for (let i = 0; i < 5; i++) cv.oval(10 + i * 11, 24, 4, 3, "yarn");
          cv.oval(54, 24, 5, 4, "highlight", 2);
          cv.quad([56, 29], [50, 40], [38, 42], "highlight", 2);
          tag(cv, 30, 46, "chained edge, then fasten off");
        },
      },
    ],
  },
  {
    id: "reading-flat-charts",
    craftType: "knitting",
    title: "Reading flat charts",
    steps: [
      {
        caption: "Start bottom right. Row 1 is a right-side row: read it right to left.",
        title: "Row 1 read from the bottom right, leaning left",
        draw(cv) {
          chartGrid(cv);
          cv.arrow(54, 38, 10, 38, "highlight", 1, 3);
          tag(cv, 58, 39, "1", "start");
        },
      },
      {
        caption: "Row 2 is a wrong-side row: read it back the other way, left to right.",
        title: "Row 2 read from the left",
        draw(cv) {
          chartGrid(cv);
          cv.arrow(10, 30, 54, 30, "highlight", 1, 3);
          tag(cv, 6, 31, "2", "end");
        },
      },
      {
        caption: "A chart shows the front of the fabric: blank = knit on RS, purl on WS.",
        title: "Key: a blank square is knit on the right side, purl on the wrong side",
        draw(cv) {
          cv.frame(8, 16, 10, 10, "ink");
          tag(cv, 22, 24, "= k on RS, p on WS", "start");
          cv.frame(8, 30, 10, 10, "ink");
          cv.disc(13, 35, 2, "highlight");
          tag(cv, 22, 38, "= p on RS, k on WS", "start");
        },
      },
    ],
  },
  {
    id: "gauge-swatch",
    craftType: "knitting",
    title: "Gauge swatch",
    steps: [
      {
        caption: "Cast on wider than the gauge so the edges do not distort the centre.",
        title: "A swatch knitted wider than the measured area",
        draw(cv) {
          swatch(cv, 6, 16, 52, 26);
          cv.dashedH(18, 20, 28, "highlight", 3, 2);
          cv.dashedH(18, 38, 28, "highlight", 3, 2);
          tag(cv, 32, 46, "measure only the middle");
        },
      },
      {
        caption: "Block the swatch exactly the way you will block the garment.",
        title: "The swatch pinned out to dry",
        draw(cv) {
          swatch(cv, 10, 18, 44, 22);
          for (const [x, y] of [
            [10, 18],
            [53, 18],
            [10, 39],
            [53, 39],
          ] as const) {
            cv.disc(x, y, 2, "highlight");
          }
          tag(cv, 32, 46, "wash and pin, then dry flat");
        },
      },
      {
        caption: "Count stitches and rows over 4in. Too many: bigger needle. Too few: smaller.",
        title: "Counting stitches across four inches",
        draw(cv) {
          swatch(cv, 6, 14, 52, 22);
          cv.arrow(14, 42, 50, 42, "highlight", 1, 3);
          cv.arrow(50, 42, 14, 42, "highlight", 1, 3);
          cv.vline(14, 38, 8, "highlight");
          cv.vline(50, 38, 8, "highlight");
          tag(cv, 32, 40, "4 in");
        },
      },
    ],
  },
  {
    id: "blocking",
    craftType: "knitting",
    title: "Blocking",
    steps: [
      {
        caption: "Soak the piece in cool water for 15-20 minutes until it is fully wet.",
        title: "The finished piece soaking in a basin",
        draw(cv) {
          cv.polyline(
            [
              [8, 20],
              [12, 42],
              [52, 42],
              [56, 20],
            ],
            "ink",
            2,
          );
          for (let i = 0; i < 3; i++) {
            cv.quad([14, 28 + i * 5], [32, 24 + i * 5], [50, 28 + i * 5], "yarn", 1);
          }
          tag(cv, 32, 16, "cool water, 15-20 min");
        },
      },
      {
        caption: "Squeeze, never wring. Roll in a towel to take out the water.",
        title: "The piece rolled inside a towel",
        draw(cv) {
          for (let i = 0; i < 4; i++) cv.oval(32, 30, 6 + i * 5, 4 + i * 3, "yarn");
          cv.arrow(52, 30, 44, 30, "highlight", 1, 2);
          tag(cv, 32, 46, "roll, press, do not wring");
        },
      },
      {
        caption: "Pin to the pattern's measurements and leave until bone dry.",
        title: "The piece pinned out to its finished measurements",
        draw(cv) {
          cv.frame(10, 16, 44, 22, "ink");
          for (let i = 0; i < 5; i++) {
            cv.disc(10 + i * 11, 16, 2, "highlight");
            cv.disc(10 + i * 11, 38, 2, "highlight");
          }
          cv.arrow(10, 44, 54, 44, "grid", 1, 2);
          tag(cv, 32, 48, "to the pattern's measurements");
        },
      },
    ],
  },
  {
    id: "mattress-seam",
    craftType: "knitting",
    title: "Mattress stitch seam",
    steps: [
      {
        caption: "Lay both pieces right side up with the edges touching.",
        title: "Two edges laid side by side, right sides up",
        draw(cv) {
          swatch(cv, 4, 16, 26, 26);
          swatch(cv, 34, 16, 26, 26);
          cv.vline(32, 14, 30, "grid");
          tag(cv, 32, 48, "right sides facing you");
        },
      },
      {
        caption: "Pick up the bar between the first and second stitch, then the matching bar opposite.",
        title: "A tapestry needle picking up the running bars either side of the seam",
        draw(cv) {
          swatch(cv, 4, 16, 26, 26);
          swatch(cv, 34, 16, 26, 26);
          for (let i = 0; i < 3; i++) {
            const y = 20 + i * 8;
            cv.hline(24, y, 6, "highlight", 2);
            cv.hline(34, y + 4, 6, "highlight", 2);
          }
          cv.needle(58, 44, 26, 18, "tool");
          tag(cv, 32, 48, "one bar each side, alternating");
        },
      },
      {
        caption: "Every few bars, pull gently. The seam closes and disappears.",
        title: "The seam pulled closed and invisible",
        draw(cv) {
          swatch(cv, 8, 16, 22, 26);
          swatch(cv, 32, 16, 22, 26);
          cv.vline(30, 16, 26, "highlight", 2);
          cv.arrow(20, 46, 28, 46, "grid", 1, 2);
          cv.arrow(44, 46, 34, 46, "grid", 1, 2);
          tag(cv, 32, 12, "invisible from the front");
        },
      },
    ],
  },
  {
    id: "picking-up-stitches",
    craftType: "knitting",
    title: "Picking up stitches",
    steps: [
      {
        caption: "Right side facing you, push the needle through the edge front to back.",
        title: "The needle entering the finished edge from the front",
        draw(cv) {
          swatch(cv, 4, 24, 56, 18);
          cv.hline(4, 22, 56, "highlight", 2);
          cv.needle(46, 40, 24, 18, "tool");
          tag(cv, 32, 14, "right side facing");
        },
      },
      {
        caption: "Wrap the yarn and pull a loop through: that is one new live stitch.",
        title: "A new loop pulled through the edge onto the needle",
        draw(cv) {
          swatch(cv, 4, 26, 56, 16);
          cv.needle(4, 20, 58, 20, "tool");
          cv.oval(30, 24, 5, 4, "highlight", 2);
          cv.arrow(30, 30, 30, 24, "highlight", 1, 2);
          tag(cv, 32, 46, "one new live stitch");
        },
      },
      {
        caption: "Space them evenly. Along a row edge, 3 stitches for every 4 rows.",
        title: "Stitches spaced three for every four rows",
        draw(cv) {
          cv.needle(4, 18, 58, 18, "tool");
          for (let i = 0; i < 6; i++) cv.oval(10 + i * 9, 22, 4, 3, "yarn");
          for (let i = 0; i < 8; i++) cv.hline(8, 28 + i * 2, 48, "grid");
          // 3 picked up for every 4 rows is the standard ratio because a knit
          // row is shorter than a stitch is wide; pick up 1:1 and the band flares.
          tag(cv, 32, 46, "3 sts for every 4 rows");
        },
      },
    ],
  },
  {
    id: "patch-pockets",
    craftType: "knitting",
    title: "Patch pockets",
    steps: [
      {
        caption: "Knit a rectangle to size with 4-6 rows of rib at the top edge.",
        title: "A knitted rectangle with a ribbed top",
        draw(cv) {
          swatch(cv, 14, 20, 36, 22);
          for (let i = 0; i < 4; i++) cv.vline(18 + i * 8, 14, 6, "highlight", 2);
          cv.hline(14, 20, 36, "ink", 2);
          tag(cv, 32, 48, "ribbed top stops it sagging");
        },
      },
        {
        caption: "Block the pocket flat so it matches the fabric it will sit on.",
        title: "The pocket blocked flat",
        draw(cv) {
          cv.frame(16, 18, 32, 22, "ink");
          for (const [x, y] of [
            [16, 18],
            [47, 18],
            [16, 39],
            [47, 39],
          ] as const) {
            cv.disc(x, y, 2, "highlight");
          }
          tag(cv, 32, 48, "flat, square, dry");
        },
      },
      {
        caption: "Pin it in place, try the garment on, then sew three sides with mattress stitch.",
        title: "The pocket pinned to the garment and sewn on three sides",
        draw(cv) {
          swatch(cv, 4, 12, 56, 34);
          cv.frame(18, 20, 28, 20, "highlight", 2);
          for (let i = 0; i < 5; i++) {
            cv.disc(18, 22 + i * 4, 1, "yarnAlt");
            cv.disc(45, 22 + i * 4, 1, "yarnAlt");
            cv.disc(20 + i * 6, 39, 1, "yarnAlt");
          }
          tag(cv, 32, 16, "sew 3 sides, leave the top");
        },
      },
    ],
  },

  // ─── crochet ──────────────────────────────────────────────────────────────
  {
    id: "foundation-chain",
    craftType: "crocheting",
    title: "Foundation chain",
    steps: [
      {
        caption: "Slip knot on the hook. Hold the yarn behind and wrap it over the tip.",
        title: "A slip knot on the hook with the yarn wrapped over",
        draw(cv) {
          cv.hook(14, 44, 32, 18, "tool");
          cv.oval(30, 24, 5, 4, "yarn", 2);
          cv.quad([35, 24], [46, 26], [56, 40], "highlight", 2);
          tag(cv, 32, 48, "yarn over the hook");
        },
      },
      {
        caption: "Pull the wrap through the loop. That is one chain.",
        title: "The wrap pulled through to make one chain",
        draw(cv) {
          cv.hook(14, 44, 32, 16, "tool");
          chainLink(cv, 30, 26, "highlight", 6, 4);
          cv.arrow(44, 26, 36, 26, "highlight", 1, 2);
          tag(cv, 32, 46, "= 1 chain");
        },
      },
        {
        caption: "Count the chains, not the slip knot and not the loop on the hook.",
        title: "A row of chains with the hook loop excluded from the count",
        draw(cv) {
          for (let i = 0; i < 5; i++) chainLink(cv, 10 + i * 10, 26, "yarn", 4, 3);
          chainLink(cv, 56, 26, "grid", 4, 3);
          cv.line(52, 20, 60, 32, "grid");
          for (let i = 0; i < 5; i++) tag(cv, 10 + i * 10, 40, String(i + 1));
          tag(cv, 56, 40, "x");
          tag(cv, 32, 48, "chain loosely, or go up a hook size");
        },
      },
    ],
  },
  {
    id: "turning-chain",
    craftType: "crocheting",
    title: "Turning chain",
    steps: [
      {
        caption: "At the end of the row, turn the work so the other face is toward you.",
        title: "The work turned at the end of a row",
        draw(cv) {
          for (let i = 0; i < 5; i++) crochetX(cv, 10 + i * 11, 32, "yarn", 3);
          cv.quad([54, 22], [32, 12], [10, 22], "highlight", 2);
          cv.arrow(14, 20, 8, 26, "highlight", 1, 2);
          tag(cv, 32, 46, "turn the work");
        },
      },
      {
        caption: "Chain to the height of the stitch: 1 for sc, 2 for hdc, 3 for dc.",
        title: "Turning chain heights for single, half double and double crochet",
        draw(cv) {
          const heights: Array<[number, number, string]> = [
            [12, 1, "sc"],
            [32, 2, "hdc"],
            [52, 3, "dc"],
          ];
          for (const [x, n, label] of heights) {
            for (let i = 0; i < n; i++) chainLink(cv, x, 38 - i * 7, "highlight", 4, 3);
            tag(cv, x, 46, label);
            crochetPost(cv, x + 9, 38 - n * 7 + 2, 40, "yarn", n - 1);
          }
        },
      },
      {
        caption: "Check the pattern: sometimes the turning chain counts as the first stitch.",
        title: "A turning chain that may or may not count as a stitch",
        draw(cv) {
          for (let i = 0; i < 4; i++) crochetPost(cv, 20 + i * 11, 20, 38, "yarn", 1);
          for (let i = 0; i < 3; i++) chainLink(cv, 10, 38 - i * 7, "highlight", 4, 3);
          cv.frame(4, 16, 13, 26, "highlight");
          tag(cv, 32, 48, "counts as a stitch? check first");
        },
      },
    ],
  },
  {
    id: "fasten-off",
    craftType: "crocheting",
    title: "Fasten off",
    steps: [
      {
        caption: "Finish the last stitch, then cut the yarn leaving a 6 inch tail.",
        title: "The yarn cut with a long tail",
        draw(cv) {
          cv.hook(12, 42, 30, 18, "tool");
          cv.oval(28, 24, 5, 4, "yarn");
          cv.quad([33, 24], [46, 28], [58, 22], "yarn", 2);
          cv.line(48, 18, 54, 30, "highlight", 2);
          cv.line(54, 18, 48, 30, "highlight", 2);
          tag(cv, 32, 46, "leave 6 in of tail");
        },
      },
      {
        caption: "Pull the tail all the way through the last loop and snug it down.",
        title: "The tail pulled through the final loop",
        draw(cv) {
          cv.oval(26, 26, 7, 5, "yarn", 2);
          cv.quad([26, 31], [40, 40], [56, 34], "highlight", 2);
          cv.arrow(40, 38, 52, 35, "highlight", 1, 2);
          tag(cv, 32, 48, "the loop is locked");
        },
      },
      {
        caption: "Thread the tail on a tapestry needle and weave it 2-3in through nearby stitches.",
        title: "The tail woven back through the fabric with a tapestry needle",
        draw(cv) {
          for (let r = 0; r < 3; r++) {
            for (let i = 0; i < 5; i++) crochetX(cv, 10 + i * 11, 20 + r * 9, "yarn", 3);
          }
          cv.polyline(
            [
              [8, 24],
              [20, 30],
              [32, 24],
              [44, 30],
              [56, 24],
            ],
            "highlight",
            2,
          );
          tag(cv, 32, 46, "change direction once to lock it");
        },
      },
    ],
  },
  {
    id: "magic-ring",
    craftType: "crocheting",
    title: "Magic ring",
    steps: [
      {
        caption: "Loop the yarn round twice and hold the crossing between your fingers.",
        title: "A double loop of yarn held at the crossing",
        draw(cv) {
          cv.ring(30, 28, 12, "yarn", 2);
          cv.ring(30, 28, 9, "yarn");
          cv.quad([30, 40], [44, 46], [58, 40], "yarn", 2);
          cv.rect(26, 38, 8, 4, "highlight");
          tag(cv, 32, 12, "hold the cross");
        },
      },
      {
        caption: "Work the whole first round into the ring, over both strands.",
        title: "Stitches worked around the yarn loop",
        draw(cv) {
          cv.ring(30, 28, 12, "yarn", 2);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            crochetX(cv, 30 + Math.cos(a) * 17, 28 + Math.sin(a) * 17, "highlight", 3);
          }
          tag(cv, 32, 48, "e.g. 6 sc into the ring");
        },
      },
      {
        caption: "Pull the tail. The centre closes completely, with no hole.",
        title: "The tail pulled to close the centre of the ring",
        draw(cv) {
          cv.ring(30, 28, 5, "yarn", 2);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            crochetX(cv, 30 + Math.cos(a) * 13, 28 + Math.sin(a) * 13, "yarn", 3);
          }
          cv.arrow(52, 40, 36, 32, "highlight", 1, 3);
          tag(cv, 32, 48, "no hole in the middle");
        },
      },
    ],
  },
  {
    id: "working-in-the-round",
    craftType: "crocheting",
    title: "Working in the round",
    steps: [
      {
        caption: "Start from a magic ring, or chain 4 and join it with a slip stitch.",
        title: "A ring to work the first round into",
        draw(cv) {
          cv.ring(32, 28, 11, "yarn", 2);
          slipStitchDot(cv, 43, 28, "highlight");
          tag(cv, 32, 48, "magic ring, or ch 4 and join");
        },
      },
      {
        caption: "Do not turn at the end of a round. The right side stays facing you.",
        title: "The round continuing in the same direction",
        draw(cv) {
          cv.ring(32, 28, 8, "yarn");
          cv.ring(32, 28, 15, "yarn");
          cv.arrow(32, 11, 46, 18, "highlight", 1, 3);
          tag(cv, 32, 46, "keep going the same way");
        },
      },
      {
        caption: "Mark the first stitch of each round and move the marker up as you go.",
        title: "A stitch marker in the first stitch of the round",
        draw(cv) {
          cv.ring(32, 28, 9, "yarn");
          cv.ring(32, 28, 16, "yarn");
          cv.disc(32, 12, 3, "highlight");
          cv.disc(32, 19, 3, "highlight");
          cv.arrow(42, 12, 36, 12, "grid", 1, 2);
          tag(cv, 32, 46, "without it you will lose count");
        },
      },
    ],
  },
  {
    id: "reading-crochet-charts",
    craftType: "crocheting",
    title: "Reading crochet charts",
    steps: [
      {
        caption: "Find the foundation chain along the bottom and start there.",
        title: "The foundation chain along the base of the chart",
        draw(cv) {
          for (let i = 0; i < 6; i++) chainLink(cv, 8 + i * 10, 38, "yarn", 4, 3);
          for (let i = 0; i < 5; i++) crochetPost(cv, 13 + i * 10, 20, 34, "grid", 1);
          cv.arrow(58, 44, 6, 44, "highlight", 1, 3);
          tag(cv, 32, 14, "start at the bottom");
        },
      },
      {
        caption: "Each symbol is one whole stitch: oval = chain, X = single, T = double.",
        title: "Chart key: chain, single crochet, double crochet",
        draw(cv) {
          chainLink(cv, 12, 22, "yarn", 5, 3);
          tag(cv, 12, 32, "ch");
          crochetX(cv, 32, 22, "yarn", 4);
          tag(cv, 32, 32, "sc");
          crochetPost(cv, 52, 15, 29, "yarn", 1);
          tag(cv, 52, 32, "dc");
          tag(cv, 32, 44, "every chart carries its own key");
        },
      },
      {
        caption: "Follow the arrows: right to left on right-side rows, back again on the next.",
        title: "Row direction arrows alternating each row",
        draw(cv) {
          cv.arrow(56, 34, 8, 34, "highlight", 1, 3);
          cv.arrow(8, 22, 56, 22, "highlight", 1, 3);
          for (let i = 0; i < 5; i++) {
            crochetPost(cv, 12 + i * 10, 26, 32, "yarn", 1);
            crochetPost(cv, 12 + i * 10, 14, 20, "yarn", 1);
          }
          tag(cv, 32, 46, "rounds read anticlockwise instead");
        },
      },
    ],
  },
  {
    id: "crochet-gauge-swatch",
    craftType: "crocheting",
    title: "Gauge swatch",
    steps: [
      {
        caption: "Chain wider than the gauge, then work the main stitch for at least 4in.",
        title: "A crocheted swatch worked wider than the measured area",
        draw(cv) {
          for (let r = 0; r < 3; r++) {
            for (let i = 0; i < 6; i++) crochetPost(cv, 8 + i * 10, 18 + r * 9, 24 + r * 9, "yarn", 1);
          }
          cv.dashedH(16, 16, 32, "highlight", 3, 2);
          cv.dashedH(16, 44, 32, "highlight", 3, 2);
          tag(cv, 32, 48, "wider than you need to measure");
        },
      },
      {
        caption: "Treat the swatch exactly as you will treat the finished piece.",
        title: "The swatch blocked or rested before measuring",
        draw(cv) {
          cv.frame(10, 18, 44, 22, "ink");
          for (let i = 0; i < 4; i++) crochetX(cv, 18 + i * 10, 29, "yarn", 3);
          for (const [x, y] of [
            [10, 18],
            [53, 18],
            [10, 39],
            [53, 39],
          ] as const) {
            cv.disc(x, y, 2, "highlight");
          }
          tag(cv, 32, 48, "block it if you will block it");
        },
      },
      {
        caption: "Measure across the centre. Wrong count: change hook size, not tension.",
        title: "Measuring stitches across four inches of the swatch",
        draw(cv) {
          cv.frame(6, 14, 52, 24, "ink");
          for (let i = 0; i < 5; i++) crochetX(cv, 14 + i * 9, 26, "yarn", 3);
          cv.arrow(14, 42, 50, 42, "highlight", 1, 3);
          cv.arrow(50, 42, 14, 42, "highlight", 1, 3);
          tag(cv, 32, 48, "4 in across the middle");
        },
      },
    ],
  },
  {
    id: "seaming-crochet",
    craftType: "crocheting",
    title: "Seaming crochet pieces",
    steps: [
      {
        caption: "Hold the two pieces with right sides together and the edges lined up.",
        title: "Two crocheted pieces held right sides together",
        draw(cv) {
          for (let r = 0; r < 3; r++) {
            for (let i = 0; i < 5; i++) {
              crochetX(cv, 10 + i * 10, 18 + r * 8, "yarn", 3);
              crochetX(cv, 10 + i * 10, 20 + r * 8, "yarnAlt", 3);
            }
          }
          cv.hline(4, 44, 56, "highlight", 2);
          tag(cv, 32, 14, "right sides facing each other");
        },
      },
      {
        caption: "Push the hook through both pieces at once, yarn over, pull a loop through.",
        title: "The hook passing through matching stitches on both pieces",
        draw(cv) {
          cv.hline(6, 24, 52, "yarn", 2);
          cv.hline(6, 32, 52, "yarnAlt", 2);
          cv.hook(20, 44, 40, 20, "tool");
          cv.arrow(44, 28, 52, 28, "highlight", 1, 2);
          tag(cv, 32, 48, "through both layers at once");
        },
      },
      {
        caption: "Slip stitch the whole seam at an even tension, then fasten off.",
        title: "A slip-stitch seam running the length of the join",
        draw(cv) {
          cv.hline(6, 22, 52, "yarn", 2);
          cv.hline(6, 34, 52, "yarnAlt", 2);
          for (let i = 0; i < 6; i++) slipStitchDot(cv, 10 + i * 9, 28, "highlight");
          tag(cv, 32, 46, "even tension or the seam puckers");
        },
      },
    ],
  },
];

/** The 5x4 grid used by both chart-reading steps. */
function chartGrid(cv: PixelCanvas): void {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) cv.frame(10 + c * 9, 18 + r * 8, 10, 9, "grid");
  }
}

// ─── public surface ─────────────────────────────────────────────────────────

export interface RenderedStep {
  /** 1-based step number, also drawn inside the SVG. */
  n: number;
  /** The instruction. Rendered by the page, not baked into the drawing. */
  caption: string;
  svg: string;
}

export interface RenderedTechnique {
  id: string;
  title: string;
  craftType: CraftType;
  steps: RenderedStep[];
}

export const TECHNIQUE_IDS: readonly string[] = SPECS.map((s) => s.id);

const byId = new Map(SPECS.map((s) => [s.id, s]));
const canvasCache = new Map<string, PixelCanvas>();

function stepCanvas(spec: TechniqueSpec, index: number): PixelCanvas {
  const key = `${spec.id}#${index}`;
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const step = spec.steps[index];
  const cv = new PixelCanvas(W, H, { title: `Step ${index + 1}: ${step.title}` });
  stepBadge(cv, index + 1);
  step.draw(cv);
  canvasCache.set(key, cv);
  return cv;
}

/** Render a technique's whole step sequence. */
export function techniqueDiagram(
  id: string,
  palette: DiagramPalette = DEFAULT_PALETTE,
): RenderedTechnique | undefined {
  const spec = byId.get(id);
  if (!spec) return undefined;
  return {
    id: spec.id,
    title: spec.title,
    craftType: spec.craftType,
    steps: spec.steps.map((step, i) => ({
      n: i + 1,
      caption: step.caption,
      svg: stepCanvas(spec, i).toSVG(palette),
    })),
  };
}

/**
 * Look a technique up by the Learn page's card title. Two techniques share the
 * title "Gauge swatch" — one knitting, one crochet — so craft type is required
 * to disambiguate rather than silently returning the knitting one.
 */
export function techniqueDiagramForTitle(
  title: string,
  craftType: CraftType,
  palette: DiagramPalette = DEFAULT_PALETTE,
): RenderedTechnique | undefined {
  const spec = SPECS.find((s) => s.title === title && s.craftType === craftType);
  return spec ? techniqueDiagram(spec.id, palette) : undefined;
}

/** Every technique, with craft type and title — for building a nav or an index. */
export function listTechniques(): Array<Pick<TechniqueSpec, "id" | "title" | "craftType">> {
  return SPECS.map(({ id, title, craftType }) => ({ id, title, craftType }));
}
