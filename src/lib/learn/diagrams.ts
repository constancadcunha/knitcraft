/**
 * src/lib/learn/diagrams.ts — the drawings the shared diagram library does not
 * have yet.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `src/lib/diagrams` covers the 31 stitches and 16 techniques that the old
 * STITCH_LIBRARY listed. The Learn rebuild teaches roughly twice that, because
 * the audit found no coverage at all for finishing, fixing mistakes, yarn
 * weights, abbreviations, US/UK terminology — and because cross stitch is a new
 * craft with no drawings anywhere in the tree.
 *
 * Rather than reach for a photograph (the failure this whole rebuild exists to
 * undo), every one of those gaps gets a drawing here, authored with the same
 * `PixelCanvas` toolkit and the same eight-role palette, so the Learn section
 * reads as one system whichever library a given image came from.
 *
 * THE RULE
 * --------
 * One drawing per entry, and it must depict THAT entry. Two entries may not
 * share a drawing — `src/lib/learn/__tests__/entries.test.ts` renders every
 * entry's diagram and asserts the SVG strings are all distinct. That test is the
 * mechanical version of "half the images on /learn are wrong".
 *
 * CROSS-STITCH CONVENTIONS USED THROUGHOUT
 * ----------------------------------------
 * Cross stitch is worked on a counted grid, so its drawings are grids. The
 * convention here matches how the fabric actually behaves:
 *   - the squares are Aida blocks; the dots at their corners are the HOLES the
 *     needle passes through, which is where a beginner's mental model breaks;
 *   - the bottom leg of every full cross runs "/" (bottom-left to top-right) and
 *     the top leg runs "\", drawn in the highlight colour when it is the leg
 *     being taught. Consistent leg direction is not decoration: it is the single
 *     thing that makes a finished piece look even, so the drawings never show it
 *     both ways.
 */

import {
  DEFAULT_PALETTE,
  PixelCanvas,
  chainLink,
  crochetPost,
  knitV,
  purlBump,
  slipStitchDot,
  type DiagramPalette,
  type PaletteKey,
} from "@/lib/diagrams";

const W = 72;
const H = 54;

interface LearnDiagramSpec {
  /** Accessible name. Must describe what is actually drawn, never the topic. */
  title: string;
  /** Short notes the page may print under the drawing. */
  caption?: readonly string[];
  draw(cv: PixelCanvas): void;
}

// ─── shared drawing helpers ─────────────────────────────────────────────────

function tag(
  cv: PixelCanvas,
  x: number,
  y: number,
  value: string,
  anchor: "start" | "middle" | "end" = "start",
  key: PaletteKey = "text",
): void {
  cv.text(x, y, value, key, { size: 4, anchor });
}

/** A knitting needle lying across the canvas carrying `n` live loops. */
function needleWithLoops(cv: PixelCanvas, y: number, n: number, x0 = 10, dx = 11): void {
  cv.needle(4, y, W - 8, y, "tool");
  for (let i = 0; i < n; i++) cv.oval(x0 + i * dx, y + 4, 4, 3, "yarn");
}

/** A block of worked knitted fabric, for "the piece below the needle". */
function knitFabric(cv: PixelCanvas, x: number, y: number, cols: number, rows: number): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) knitV(cv, x + c * 8, y + r * 7, "yarn");
  }
}

const CELL = 9;

/**
 * An Aida grid: `cols` x `rows` blocks with the needle holes marked at every
 * corner. Cross stitch is counted from the holes, not from the squares, and
 * drawing the holes is what makes a quarter stitch legible later.
 */
function aida(cv: PixelCanvas, x0: number, y0: number, cols: number, rows: number): void {
  for (let c = 0; c <= cols; c++) cv.vline(x0 + c * CELL, y0, rows * CELL + 1, "grid");
  for (let r = 0; r <= rows; r++) cv.hline(x0, y0 + r * CELL, cols * CELL + 1, "grid");
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) cv.rect(x0 + c * CELL - 1, y0 + r * CELL - 1, 2, 2, "ink");
  }
}

type CrossLeg = "bottom" | "top" | "both";

/** One cross (or one of its legs) inside Aida block (c, r). */
function cross(
  cv: PixelCanvas,
  x0: number,
  y0: number,
  c: number,
  r: number,
  key: PaletteKey,
  legs: CrossLeg = "both",
): void {
  const x = x0 + c * CELL;
  const y = y0 + r * CELL;
  // Bottom leg "/" — always worked first, always the same direction.
  if (legs !== "top") cv.line(x + 1, y + CELL - 1, x + CELL - 1, y + 1, key, 2);
  // Top leg "\".
  if (legs !== "bottom") cv.line(x + 1, y + 1, x + CELL - 1, y + CELL - 1, key, 2);
}

/** A quarter stitch: corner of the block to the exact centre of the block. */
function quarter(
  cv: PixelCanvas,
  x0: number,
  y0: number,
  c: number,
  r: number,
  key: PaletteKey,
  corner: "bl" | "br" | "tl" | "tr" = "bl",
): void {
  const x = x0 + c * CELL;
  const y = y0 + r * CELL;
  const mx = x + CELL / 2;
  const my = y + CELL / 2;
  const cx = corner === "bl" || corner === "tl" ? x + 1 : x + CELL - 1;
  const cy = corner === "bl" || corner === "br" ? y + CELL - 1 : y + 1;
  cv.line(cx, cy, mx, my, key, 2);
}

/** A tapestry needle: blunt, long-eyed, drawn so it cannot read as a pin. */
function tapestryNeedle(cv: PixelCanvas, x0: number, y0: number, x1: number, y1: number): void {
  cv.line(x0, y0, x1, y1, "tool", 2);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // The long eye sits at the blunt end; a sharp point would be the wrong needle.
  cv.oval(x0 + (dx / len) * 3, y0 + (dy / len) * 3, 2, 3, "tool");
}

// ─── the drawings ───────────────────────────────────────────────────────────

const SPECS: Record<string, LearnDiagramSpec> = {
  // ═══ KNITTING ════════════════════════════════════════════════════════════

  "k-ssk": {
    title:
      "ssk: two stitches slipped knitwise one at a time, then knitted together through the back loops, leaving a decrease that leans left",
    caption: [
      "slip 1 knitwise, slip 1 knitwise — the two loops turn round",
      "knit the pair together through the FRONT of the reseated stitches",
      "the result leans left; k2tog leans right",
    ],
    draw(cv) {
      const ny = 30;
      needleWithLoops(cv, ny, 4);
      // The two slipped stitches, re-mounted the other way round.
      cv.oval(10, ny + 4, 4, 3, "highlight");
      cv.oval(21, ny + 4, 4, 3, "highlight");
      cv.arrow(10, ny + 12, 16, ny + 12, "highlight", 1, 2);
      cv.arrow(21, ny + 12, 27, ny + 12, "highlight", 1, 2);
      // The finished decrease, leaning left.
      cv.line(52, 12, 44, 24, "highlight", 2);
      cv.line(58, 12, 50, 24, "yarn", 2);
      tag(cv, 40, 10, "leans left");
      tag(cv, 4, ny + 20, "slip knitwise x2, then k them together");
    },
  },

  "k-cdd": {
    title:
      "Central double decrease: two stitches slipped together knitwise, one knitted, then the pair passed over, so three stitches become one with the centre stitch on top",
    caption: [
      "sl2 together knitwise, k1, pass the 2 slipped stitches over",
      "three stitches become one, and the middle one sits on top",
      "chart symbol: a vertical stitch with two arms — cdd",
    ],
    draw(cv) {
      const ny = 30;
      needleWithLoops(cv, ny, 3, 16, 12);
      cv.oval(16, ny + 4, 4, 3, "yarn");
      cv.oval(28, ny + 4, 4, 3, "highlight");
      cv.oval(40, ny + 4, 4, 3, "yarn");
      tag(cv, 24, ny + 14, "1   2   3");
      // The finished stack: the centre stitch standing upright over two arms.
      cv.vline(36, 8, 12, "highlight", 2);
      cv.line(30, 20, 36, 12, "yarn", 2);
      cv.line(42, 20, 36, 12, "yarn", 2);
      tag(cv, 46, 14, "centre on top");
    },
  },

  "k-kfb": {
    title:
      "Knit front and back: one stitch is knitted through the front loop, kept on the needle, then knitted again through the back loop, making two stitches from one",
    caption: [
      "knit the stitch but do NOT drop it",
      "knit the same stitch again through its back loop, then drop",
      "one stitch becomes two; a small purl bar marks the increase",
    ],
    draw(cv) {
      const ny = 28;
      needleWithLoops(cv, ny, 4);
      cv.oval(21, ny + 4, 4, 3, "highlight");
      // Two entries into the SAME loop: front first, then back.
      cv.arrow(18, ny + 14, 20, ny + 8, "highlight", 1, 2);
      cv.arrow(26, ny + 14, 24, ny + 8, "yarnAlt", 1, 2);
      tag(cv, 4, ny + 20, "1 front    2 back — same stitch");
      knitV(cv, 46, 10, "yarn", { w: 9, h: 8, t: 2 });
      purlBump(cv, 56, 12, "highlight", { w: 9, h: 5, t: 2 });
      tag(cv, 44, 24, "the tell-tale bar");
    },
  },

  "k-ktbl": {
    title:
      "Knit through the back loop: the right needle enters the far leg of the stitch, twisting its base so the column reads as a tight rope",
    caption: [
      "enter the BACK leg instead of the front",
      "the stitch's base crosses — it is deliberately twisted",
      "used for firm edges and for closing an accidental yarn over",
    ],
    draw(cv) {
      const ny = 30;
      needleWithLoops(cv, ny, 4);
      cv.oval(32, ny + 4, 4, 3, "highlight");
      // Entry from behind, drawn arriving on the far side of the needle.
      cv.needle(66, 48, 34, 22, "tool");
      cv.arrow(40, 24, 34, 20, "highlight", 1, 2);
      tag(cv, 4, ny + 20, "enter the far leg, behind the needle");
      // Untwisted vs twisted column, side by side.
      knitV(cv, 8, 6, "yarn", { w: 9, h: 8, t: 2 });
      cv.line(48, 6, 56, 14, "highlight", 2);
      cv.line(56, 6, 48, 14, "highlight", 2);
      tag(cv, 8, 20, "plain");
      tag(cv, 46, 20, "twisted");
    },
  },

  "k-mosaic": {
    title:
      "Mosaic knitting: two rows are worked in one colour while stitches of the other colour are slipped, so only one yarn is ever carried at a time",
    caption: [
      "work two rows with colour A, slipping every colour-B stitch",
      "then two rows with colour B, slipping every colour-A stitch",
      "no floats and no yarn juggling — the slipped stitches make the motif",
    ],
    draw(cv) {
      // Four rows, alternating which colour is "active".
      for (let r = 0; r < 4; r++) {
        const y = 6 + r * 10;
        const active: PaletteKey = r < 2 ? "yarn" : "yarnAlt";
        for (let c = 0; c < 6; c++) {
          const x = 6 + c * 10;
          const slipped = (c + (r < 2 ? 0 : 1)) % 2 === 1;
          if (slipped) {
            // A slipped stitch is elongated: it spans the two rows it sat out.
            cv.vline(x + 3, y, 9, "highlight", 2);
          } else {
            knitV(cv, x, y, active, { w: 8, h: 7, t: 2 });
          }
        }
      }
      tag(cv, 4, 51, "slipped stitches stretch up from the row below");
    },
  },

  "k-intarsia": {
    title:
      "Intarsia: separate balls of yarn for each block of colour, with the two yarns twisted around each other at every colour change to close the gap",
    caption: [
      "one bobbin per colour block — nothing is carried across the back",
      "at each change, drop the old yarn and pick the new one up from UNDER it",
      "worked flat only: the yarn has to be waiting where you left it",
    ],
    draw(cv) {
      cv.rect(6, 8, 28, 26, "yarn");
      cv.rect(34, 8, 30, 26, "yarnAlt");
      // The twist at the boundary — the whole technique in one detail.
      cv.quad([30, 40], [34, 30], [38, 40], "yarn", 2);
      cv.quad([38, 40], [34, 34], [30, 44], "yarnAlt", 2);
      cv.ring(34, 38, 6, "highlight", 1);
      tag(cv, 4, 51, "twist at every change or you get a slit");
      tag(cv, 8, 6, "A");
      tag(cv, 60, 6, "B");
    },
  },

  "k-provisional-cast-on": {
    title:
      "Provisional cast on: stitches picked up along the bumps of a crochet chain worked in waste yarn, so the chain can be unzipped later to free live stitches",
    caption: [
      "crochet a chain in smooth waste yarn, a few stitches longer than needed",
      "knit up one stitch into the back bump of each chain",
      "to reopen: undo the chain's last stitch and unzip, catching live loops",
    ],
    draw(cv) {
      for (let i = 0; i < 6; i++) chainLink(cv, 8 + i * 10, 34, "yarnAlt");
      needleWithLoops(cv, 20, 5, 10, 11);
      cv.arrow(14, 32, 14, 26, "highlight", 1, 2);
      tag(cv, 4, 46, "waste chain below, live stitches above");
      tag(cv, 4, 52, "unzip the chain to get the stitches back");
    },
  },

  "k-three-needle-bind-off": {
    title:
      "Three-needle bind off: two sets of live stitches held with right sides together are knitted together one pair at a time and bound off with a third needle",
    caption: [
      "hold the two needles parallel, right sides of the fabric facing each other",
      "knit the first stitch of the front needle together with the first of the back",
      "work a second pair, then pass the first stitch over — a seam and a bind off at once",
    ],
    draw(cv) {
      needleWithLoops(cv, 16, 4, 12, 12);
      needleWithLoops(cv, 30, 4, 12, 12);
      // The third needle, coming in to take both stitches at once.
      cv.needle(68, 44, 16, 20, "tool");
      cv.arrow(20, 24, 16, 20, "highlight", 1, 2);
      tag(cv, 4, 44, "third needle takes one stitch from each");
      tag(cv, 4, 51, "right sides together hides the ridge inside");
    },
  },

  "k-kitchener": {
    title:
      "Kitchener stitch: a tapestry needle traces the path of a knitted row through two sets of live stitches, grafting them into an invisible join",
    caption: [
      "setup: front purlwise, back knitwise, leave both on",
      "front knitwise OFF, front purlwise on; back purlwise OFF, back knitwise on",
      "repeat those four moves; the graft becomes one more row of knitting",
    ],
    draw(cv) {
      needleWithLoops(cv, 14, 4, 12, 13);
      needleWithLoops(cv, 34, 4, 12, 13);
      // The grafting yarn weaving between the two sets of loops.
      cv.quad([10, 26], [18, 18], [25, 26], "highlight", 2);
      cv.quad([25, 26], [32, 34], [38, 26], "highlight", 2);
      cv.quad([38, 26], [45, 18], [51, 26], "highlight", 2);
      tapestryNeedle(cv, 62, 30, 50, 26);
      tag(cv, 4, 48, "the yarn draws the row that is missing");
    },
  },

  "k-weaving-in-ends": {
    title:
      "Weaving in ends: the tail is threaded on a tapestry needle and run through the purl bumps on the wrong side, then doubled back on itself before being trimmed",
    caption: [
      "work on the WRONG side, following the path of a row of purl bumps",
      "go about 5 cm one way, then reverse for 2 cm — the doubling back is what holds",
      "stretch the fabric, then trim; cutting flush while it is bunched leaves a poke-out",
    ],
    draw(cv) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) purlBump(cv, 6 + c * 9, 12 + r * 9, "yarn");
      }
      // The tail's path: along, then reversed.
      cv.polyline(
        [
          [8, 20],
          [20, 16],
          [32, 20],
          [44, 16],
          [56, 20],
        ],
        "highlight",
        2,
      );
      cv.polyline(
        [
          [56, 20],
          [46, 26],
          [34, 24],
        ],
        "yarnAlt",
        2,
      );
      tapestryNeedle(cv, 30, 24, 22, 26);
      tag(cv, 4, 46, "along, then back on itself");
      tag(cv, 4, 52, "wrong side only");
    },
  },

  "k-buttonhole": {
    title:
      "One-row buttonhole: stitches are bound off across the band and cast back on over the gap on the same row, leaving a firm slot",
    caption: [
      "bind off the buttonhole stitches, then turn and cable-cast them back on",
      "cast on one extra and knit it together with the next stitch to tighten the corner",
      "space buttonholes evenly and put one at the point of most strain",
    ],
    draw(cv) {
      knitFabric(cv, 6, 8, 8, 2);
      // The slot.
      cv.erase(26, 22, 20, 8);
      cv.frame(26, 22, 20, 8, "highlight", 1);
      knitFabric(cv, 6, 32, 8, 2);
      cv.arrow(26, 36, 26, 30, "highlight", 1, 2);
      cv.arrow(46, 36, 46, 30, "highlight", 1, 2);
      tag(cv, 4, 50, "bind off, then cast back on over the gap");
    },
  },

  "k-dropped-stitch": {
    title:
      "Rescuing a dropped stitch: the loose loop is caught on a crochet hook and the ladder rungs above it are pulled through one at a time to rebuild the column",
    caption: [
      "secure the loose loop on a hook before it runs any further",
      "starting at the bottom, pull the lowest ladder rung through the loop",
      "keep going up rung by rung; on a purl column, work from the other side",
    ],
    draw(cv) {
      // The two intact columns either side of the ladder.
      for (let r = 0; r < 4; r++) {
        knitV(cv, 14, 8 + r * 9, "yarn", { w: 9, h: 8, t: 2 });
        knitV(cv, 44, 8 + r * 9, "yarn", { w: 9, h: 8, t: 2 });
      }
      // The ladder: horizontal rungs with nothing holding them.
      for (let r = 0; r < 4; r++) cv.hline(26, 12 + r * 9, 18, "yarnAlt", 2);
      cv.oval(34, 46, 4, 3, "highlight");
      cv.hook(68, 50, 40, 44, "tool");
      tag(cv, 4, 52, "hook the loop, then climb the ladder");
    },
  },

  "k-lifeline": {
    title:
      "A lifeline: a length of smooth contrast thread run through every live stitch of a completed row, so the work can be ripped back to that row safely",
    caption: [
      "thread smooth waste yarn through all live stitches of a known-good row",
      "leave it in and keep knitting; add a new one every 10-20 rows",
      "to rip back, pull the needles out and tear down to the line, then re-needle",
    ],
    draw(cv) {
      needleWithLoops(cv, 16, 5, 10, 12);
      knitFabric(cv, 8, 24, 7, 3);
      // The lifeline threaded through a lower row.
      cv.hline(6, 33, W - 12, "highlight", 2);
      tapestryNeedle(cv, 66, 33, 58, 33);
      tag(cv, 4, 48, "rip to here and every stitch is held");
    },
  },

  "yarn-weights": {
    title:
      "Yarn weight ladder: strands drawn at increasing thickness from lace through jumbo, each with the needle size normally used with it",
    caption: [
      "weight is thickness, not how heavy the ball is",
      "the number on the ball band is the Craft Yarn Council standard weight",
      "gauge still rules: two 'worsted' yarns can knit to different fabrics",
    ],
    draw(cv) {
      const labels = ["0", "1", "2", "3", "4", "5", "6", "7"];
      for (let i = 0; i < 8; i++) {
        const y = 6 + i * 6;
        cv.hline(16, y, 44, "yarn", Math.max(1, Math.round(1 + i * 0.6)));
        tag(cv, 12, y + 2, labels[i], "end");
      }
      tag(cv, 62, 8, "lace", "start");
      tag(cv, 62, 50, "jumbo", "start");
    },
  },

  "k-abbreviations": {
    title:
      "A written knitting instruction broken into its parts: an asterisk repeat, a bracketed group with a multiplier, and the stitch count in parentheses at the end",
    caption: [
      "*...* marks a repeat — work what is between the asterisks again",
      "[...] x3 groups stitches so a repeat can sit inside another repeat",
      "(48 sts) at the end of a row is a checkpoint, not decoration — count",
    ],
    draw(cv) {
      cv.frame(4, 8, W - 8, 18, "grid", 1);
      cv.text(8, 20, "*k2, p2* to last 4 sts", "text", { size: 6 });
      cv.hline(8, 24, 4, "highlight", 2);
      cv.hline(50, 24, 4, "highlight", 2);
      cv.frame(4, 30, W - 8, 16, "grid", 1);
      cv.text(8, 41, "k to end  (48 sts)", "text", { size: 6 });
      cv.hline(44, 44, 26, "highlight", 2);
      tag(cv, 4, 52, "repeat marks, then the count to check against");
    },
  },

  // ═══ CROCHET ═════════════════════════════════════════════════════════════

  "c-increase": {
    title:
      "Crochet increase: two stitches worked into the same stitch of the row below, so the fabric widens by one",
    caption: [
      "work one stitch as normal, then a second into the SAME stitch",
      "written 2 sc in next st, or just 'inc' in amigurumi patterns",
      "in the round, spacing the increases differently each round keeps it flat",
    ],
    draw(cv) {
      cv.hline(6, 34, 60, "grid", 1);
      for (let i = 0; i < 5; i++) crochetPost(cv, 10 + i * 12, 20, 32, "yarn", 1);
      // Two posts sharing one base.
      crochetPost(cv, 34, 20, 32, "highlight", 1);
      crochetPost(cv, 40, 20, 32, "highlight", 1);
      cv.arrow(37, 42, 37, 36, "highlight", 1, 2);
      tag(cv, 4, 50, "two posts, one hole");
    },
  },

  "c-spiral-vs-joined": {
    title:
      "Spiral rounds versus joined rounds: a continuous spiral with a marker in the first stitch, beside a round closed with a slip stitch and a turning chain that leaves a visible seam",
    caption: [
      "spiral: never join, move a marker up in the first stitch of each round",
      "joined: slip stitch to the first stitch, chain to start the next round",
      "spirals have no seam but no clean end; joined rounds have both",
    ],
    draw(cv) {
      // Spiral on the left.
      cv.quad([20, 40], [4, 26], [20, 12], "yarn", 2);
      cv.quad([20, 12], [34, 24], [22, 36], "yarn", 2);
      cv.quad([22, 36], [30, 26], [22, 20], "yarn", 2);
      cv.disc(20, 40, 2, "highlight");
      tag(cv, 6, 50, "spiral");
      // Joined rounds on the right, with the seam stacked up one side.
      cv.ring(52, 22, 14, "yarn", 1);
      cv.ring(52, 22, 8, "yarn", 1);
      for (let i = 0; i < 3; i++) slipStitchDot(cv, 52, 8 + i * 6, "highlight");
      tag(cv, 42, 50, "joined + seam");
    },
  },

  "c-post-stitches": {
    title:
      "Front post and back post double crochet: the hook goes around the post of the stitch below from the front or from the back, instead of into its top",
    caption: [
      "FPdc: hook from front, around the post, back out to the front",
      "BPdc: hook from the back, around the post, back out to the back",
      "alternating them makes a deep, springy crochet rib",
    ],
    draw(cv) {
      cv.hline(6, 40, 60, "grid", 1);
      for (let i = 0; i < 4; i++) crochetPost(cv, 12 + i * 14, 22, 38, "yarn", 1);
      // The hook wrapping the post from the front.
      cv.quad([18, 30], [26, 26], [18, 22], "highlight", 2);
      cv.hook(4, 46, 16, 32, "tool");
      // Raised vs recessed result.
      cv.rect(46, 12, 6, 18, "highlight");
      cv.frame(58, 12, 6, 18, "highlight", 1);
      tag(cv, 42, 50, "FP raised / BP sunk");
    },
  },

  "c-join-as-you-go": {
    title:
      "Join as you go: the last round of a new motif is attached to a finished neighbour by slip stitching into its corresponding chain space instead of chaining freely",
    caption: [
      "work the final round until you reach the shared edge",
      "instead of the chain, slip stitch into the matching space of the finished motif",
      "no seaming afterwards, and the join lies as flat as the motif does",
    ],
    draw(cv) {
      cv.frame(6, 10, 28, 28, "yarn", 1);
      cv.frame(38, 10, 28, 28, "yarnAlt", 1);
      for (let i = 0; i < 3; i++) slipStitchDot(cv, 36, 16 + i * 9, "highlight");
      cv.arrow(30, 44, 36, 38, "highlight", 1, 2);
      tag(cv, 4, 50, "joined on the last round, not sewn after");
    },
  },

  "c-foundation-single": {
    title:
      "Foundation single crochet: each stitch makes its own chain at the base, so the starting chain and the first row are built together",
    caption: [
      "ch 2, insert in the first chain, pull up a loop, yo through 1 — that makes the chain",
      "yo through both loops — that makes the single crochet",
      "work into the chain you just made for every following stitch",
    ],
    draw(cv) {
      for (let i = 0; i < 5; i++) {
        chainLink(cv, 10 + i * 12, 36, "highlight");
        crochetPost(cv, 10 + i * 12, 22, 34, "yarn", 0);
      }
      cv.hook(68, 46, 54, 32, "tool");
      tag(cv, 4, 14, "one stitch = one chain + one sc");
      tag(cv, 4, 50, "no tight starting chain to fight");
    },
  },

  "c-invisible-decrease": {
    title:
      "Invisible decrease: the hook picks up only the front loops of the next two stitches before completing one single crochet, so the decrease disappears into the fabric",
    caption: [
      "insert the hook into the FRONT loop only of the next two stitches",
      "yarn over and pull through both of those loops at once",
      "yarn over, pull through the two loops on the hook — one stitch from two",
    ],
    draw(cv) {
      cv.hline(6, 34, 60, "grid", 1);
      // Two stitches, front loops highlighted.
      cv.oval(22, 32, 5, 3, "highlight");
      cv.oval(38, 32, 5, 3, "highlight");
      cv.oval(22, 36, 5, 3, "grid");
      cv.oval(38, 36, 5, 3, "grid");
      crochetPost(cv, 27, 16, 30, "yarn", 0);
      cv.arrow(30, 30, 30, 24, "highlight", 1, 2);
      cv.hook(4, 46, 18, 34, "tool");
      tag(cv, 4, 50, "front loops only — the back loops stay put");
    },
  },

  "c-colour-change": {
    title:
      "Changing colour in crochet: the final yarn-over of the last stitch in the old colour is made with the new colour, so the new stitch's top is already the right shade",
    caption: [
      "work the last stitch of the old colour until two loops remain on the hook",
      "drop the old yarn, yarn over with the NEW colour and pull through",
      "the stitch you just finished still looks old; its top belongs to the next one",
    ],
    draw(cv) {
      cv.hline(6, 38, 60, "grid", 1);
      for (let i = 0; i < 3; i++) crochetPost(cv, 10 + i * 12, 22, 38, "yarn", 1);
      for (let i = 3; i < 5; i++) crochetPost(cv, 10 + i * 12, 22, 38, "yarnAlt", 1);
      // The changeover stitch: body in the old colour, top in the new.
      cv.hline(44, 22, 8, "yarnAlt", 2);
      cv.ring(48, 24, 5, "highlight", 1);
      cv.hook(68, 44, 56, 30, "tool");
      tag(cv, 4, 50, "change on the last pull-through, not after it");
    },
  },

  "c-us-uk-terms": {
    title:
      "US and UK crochet names on the same ladder of stitch heights, showing that every UK name sits one rung below the US name for the same stitch",
    caption: [
      "US single crochet = UK double crochet",
      "US double crochet = UK treble; US treble = UK double treble",
      "UK 'slip stitch' can also be called single crochet — check which the pattern means",
    ],
    draw(cv) {
      const rows: Array<[number, string, string]> = [
        [8, "sc", "dc"],
        [19, "hdc", "htr"],
        [30, "dc", "tr"],
        [41, "tr", "dtr"],
      ];
      for (const [y, us, uk] of rows) {
        cv.hline(4, y + 8, 64, "grid", 1);
        crochetPost(cv, 22, y, y + 8, "yarn", 0);
        tag(cv, 18, y + 6, us, "end");
        tag(cv, 30, y + 6, uk, "start", "highlight");
      }
      tag(cv, 4, 6, "US");
      tag(cv, 30, 6, "UK", "start", "highlight");
    },
  },

  "c-blocking": {
    title:
      "Blocking a crochet motif: the damp piece pinned out square on a foam mat, with pins at every corner and along each side",
    caption: [
      "wet or steam the piece, then pin it to the finished measurement",
      "pin the corners first, then halve each side until the edges are straight",
      "acrylic will not hold a wet block — steam it, and never press the iron down",
    ],
    draw(cv) {
      cv.frame(4, 6, 64, 38, "grid", 1);
      cv.frame(14, 12, 44, 26, "yarn", 1);
      const pins: Array<[number, number]> = [
        [14, 12],
        [36, 12],
        [58, 12],
        [14, 25],
        [58, 25],
        [14, 38],
        [36, 38],
        [58, 38],
      ];
      for (const [x, y] of pins) cv.disc(x, y, 2, "highlight");
      tag(cv, 4, 51, "pin to the measurement, not to the fabric's whim");
    },
  },

  "c-hook-sizes": {
    title:
      "Crochet hook sizes: hooks drawn at increasing shaft diameter with their metric millimetre size, the only size number that means the same thing everywhere",
    caption: [
      "metric mm is the reliable size; US letters and UK numbers disagree",
      "UK numbering runs BACKWARDS — a bigger UK number is a smaller hook",
      "the ball band's suggested hook is a starting point; your gauge decides",
    ],
    draw(cv) {
      const sizes = ["2.5", "3.5", "4.5", "5.5", "6.5"];
      for (let i = 0; i < 5; i++) {
        const x = 10 + i * 13;
        cv.hook(x, 44, x, 14, "tool");
        cv.vline(x, 20, 24, "yarn", Math.max(1, i + 1));
        cv.text(x, 52, sizes[i], "text", { size: 4, anchor: "middle" });
      }
      tag(cv, 4, 10, "mm");
    },
  },

  "c-abbreviations": {
    title:
      "A crochet row written out, with the turning chain, the asterisk repeat and the closing stitch count each marked",
    caption: [
      "ch 2 or ch 3 at the start of a row is a turning chain, not always a stitch",
      "*...* repeats; 'rep from * across' means to the end of the row",
      "the count in parentheses tells you whether the row went right",
    ],
    draw(cv) {
      cv.frame(4, 8, W - 8, 18, "grid", 1);
      cv.text(8, 20, "ch3, *dc in next* rep", "text", { size: 5 });
      cv.hline(8, 24, 8, "highlight", 2);
      cv.frame(4, 30, W - 8, 16, "grid", 1);
      cv.text(8, 41, "across  (24 dc)", "text", { size: 6 });
      cv.hline(40, 44, 30, "highlight", 2);
      tag(cv, 4, 52, "turning chain, repeat, count");
    },
  },

  "c-loops": {
    title:
      "The two loops on the top of a crochet stitch: the front loop nearest you and the back loop behind it, with a stitch worked into each in turn",
    caption: [
      "working both loops is the default and makes the densest fabric",
      "back loop only (BLO) leaves a ridge at the front and a stretchier fabric",
      "front loop only (FLO) leaves the ridge at the back — the two are mirror images",
    ],
    draw(cv) {
      // The V of the stitch top, seen from above.
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * 20;
        cv.line(x, 22, x + 8, 14, "yarn", 2);
        cv.line(x + 8, 14, x + 16, 22, "yarn", 2);
        cv.line(x + 2, 28, x + 8, 22, "grid", 2);
        cv.line(x + 8, 22, x + 14, 28, "grid", 2);
      }
      cv.arrow(20, 40, 20, 20, "highlight", 1, 2);
      tag(cv, 6, 46, "front loop");
      cv.arrow(52, 40, 52, 28, "yarnAlt", 1, 2);
      tag(cv, 40, 52, "back loop behind it");
    },
  },

  "c-fixing-mistakes": {
    title:
      "The two most common crochet errors side by side: a row that has gained a stitch from working into the turning chain, and a row that has lost one by missing the last stitch",
    caption: [
      "count every row — crochet drift is almost always one stitch per row",
      "gaining: you worked into the turning chain when it does not count as a stitch",
      "losing: you missed the last stitch, which hides at the base of the turning chain",
    ],
    draw(cv) {
      cv.hline(4, 26, 30, "grid", 1);
      cv.hline(38, 26, 30, "grid", 1);
      for (let i = 0; i < 4; i++) crochetPost(cv, 8 + i * 7, 14, 26, "yarn", 1);
      crochetPost(cv, 36, 14, 26, "highlight", 1);
      tag(cv, 4, 38, "+1 gained");
      for (let i = 0; i < 3; i++) crochetPost(cv, 42 + i * 7, 14, 26, "yarn", 1);
      cv.frame(63, 14, 5, 12, "highlight", 1);
      tag(cv, 38, 38, "-1 missed");
      tag(cv, 4, 50, "check the count at the end of every row");
    },
  },

  // ═══ CROSS STITCH ════════════════════════════════════════════════════════

  "x-full-cross": {
    title:
      "A full cross stitch worked on Aida: the bottom leg runs bottom-left to top-right, the top leg crosses it the other way, and all four ends go through the corner holes",
    caption: [
      "up at the bottom-left hole, down at the top-right — that is the bottom leg",
      "up at the bottom-right, down at the top-left — that is the top leg",
      "every top leg in the whole piece must slant the same way",
    ],
    draw(cv) {
      aida(cv, 8, 6, 5, 4);
      cross(cv, 8, 6, 1, 1, "yarn", "bottom");
      cross(cv, 8, 6, 1, 1, "highlight", "top");
      cross(cv, 8, 6, 3, 2, "yarn");
      tag(cv, 8, 50, "bottom leg / then top leg \\");
    },
  },

  "x-half-cross": {
    title:
      "Half cross stitch: only the bottom leg of the cross is worked, giving a single diagonal that covers the block more lightly than a full cross",
    caption: [
      "one diagonal per square, all leaning the same way",
      "used for backgrounds and soft shading, and marked as a half in the key",
      "half stitches use less thread and sit flatter than full crosses",
    ],
    draw(cv) {
      aida(cv, 8, 6, 5, 4);
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 2; r++) cross(cv, 8, 6, c, r, "yarn", "bottom");
      }
      for (let c = 0; c < 5; c++) cross(cv, 8, 6, c, 2, "highlight", "bottom");
      tag(cv, 8, 50, "bottom legs only, never mixed directions");
    },
  },

  "x-quarter": {
    title:
      "Quarter stitch: a short diagonal from one corner hole of the Aida block to a hole pierced through the centre of the block itself",
    caption: [
      "it runs corner to CENTRE, which is half the length of a full leg",
      "on Aida you must pierce the woven block itself — use a sharper needle",
      "on evenweave worked over two, the centre is already a real hole",
    ],
    draw(cv) {
      aida(cv, 8, 6, 4, 3);
      quarter(cv, 8, 6, 1, 1, "highlight", "bl");
      // Mark the pierced centre so the "where does it go" question is answered.
      cv.ring(8 + 1 * CELL + 4, 6 + 1 * CELL + 4, 3, "yarnAlt", 1);
      quarter(cv, 8, 6, 3, 0, "yarn", "tr");
      tag(cv, 8, 44, "corner to the centre of the block");
      tag(cv, 8, 51, "pierce the Aida — there is no hole there yet");
    },
  },

  "x-three-quarter": {
    title:
      "Three-quarter stitch: a full diagonal leg plus a quarter stitch from the opposite corner into the centre, filling most of the block and leaving one corner clear",
    caption: [
      "work the quarter first, then lay the full leg across it",
      "the empty corner is where a second colour's quarter often goes",
      "this is what makes curves and points instead of stair-stepped edges",
    ],
    draw(cv) {
      aida(cv, 8, 6, 4, 3);
      quarter(cv, 8, 6, 1, 1, "highlight", "br");
      cross(cv, 8, 6, 1, 1, "yarn", "bottom");
      // Two three-quarters of different colours sharing one square.
      quarter(cv, 8, 6, 3, 1, "yarnAlt", "tl");
      cross(cv, 8, 6, 3, 1, "yarn", "top");
      tag(cv, 8, 44, "quarter first, then the full leg over it");
      tag(cv, 8, 51, "two colours can share one square");
    },
  },

  "x-backstitch": {
    title:
      "Backstitch outlining: a continuous line of stitches worked hole to hole around completed cross stitches, each one starting where the previous ended",
    caption: [
      "come up one hole ahead, then go back down into the end of the last stitch",
      "one strand is usually enough — two makes a heavy, blurry outline",
      "backstitch last, on top of the crosses, or it gets buried",
    ],
    draw(cv) {
      aida(cv, 8, 6, 5, 3);
      for (let c = 0; c < 5; c++) cross(cv, 8, 6, c, 1, "yarn");
      // The outline: along the top edge, down a side, no gaps.
      cv.hline(8, 6 + CELL, 5 * CELL, "highlight", 2);
      cv.vline(8 + 5 * CELL, 6 + CELL, CELL, "highlight", 2);
      cv.hline(8, 6 + 2 * CELL, 5 * CELL, "highlight", 2);
      tapestryNeedle(cv, 62, 40, 54, 34);
      tag(cv, 8, 50, "hole to hole, no diagonal shortcuts");
    },
  },

  "x-french-knot": {
    title:
      "French knot: the thread is wrapped around the needle twice and the needle is returned through the fabric beside the hole it came out of, leaving a small raised bead",
    caption: [
      "come up, hold the thread taut, wrap around the needle twice",
      "go back down BESIDE the hole you came up through, never into it",
      "keep the thread tight while the needle passes through or the knot unravels",
    ],
    draw(cv) {
      aida(cv, 8, 6, 4, 3);
      tapestryNeedle(cv, 40, 44, 32, 16);
      // Two wraps spiralling up the needle.
      cv.quad([32, 28], [40, 25], [34, 22], "highlight", 2);
      cv.quad([34, 22], [42, 19], [36, 16], "highlight", 2);
      cv.disc(56, 20, 3, "highlight");
      tag(cv, 48, 30, "the bead");
      tag(cv, 8, 50, "down beside the hole, not back into it");
    },
  },

  "x-lazy-daisy": {
    title:
      "Lazy daisy: a loop of thread held down by a small straight stitch at its tip, with five loops arranged around one centre hole to make a flower",
    caption: [
      "come up at the centre, go back down in the same hole, leaving a loop",
      "come up at the loop's far end, inside the loop, and pin it with a tiny stitch",
      "also called a detached chain stitch — one link of a chain, on its own",
    ],
    draw(cv) {
      const cx = 30;
      const cy = 28;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const tx = cx + Math.cos(a) * 16;
        const ty = cy + Math.sin(a) * 16;
        cv.quad([cx, cy], [cx + Math.cos(a + 0.6) * 16, cy + Math.sin(a + 0.6) * 16], [tx, ty], "yarn", 1);
        cv.quad([cx, cy], [cx + Math.cos(a - 0.6) * 16, cy + Math.sin(a - 0.6) * 16], [tx, ty], "yarn", 1);
        cv.line(tx, ty, tx + Math.cos(a) * 3, ty + Math.sin(a) * 3, "highlight", 2);
      }
      cv.disc(cx, cy, 2, "highlight");
      tag(cv, 52, 20, "the tack");
      tag(cv, 4, 50, "one loop, pinned at its tip");
    },
  },

  "x-aida": {
    title:
      "Aida cloth: groups of threads woven into stiff blocks with an obvious hole at each corner, so one cross stitch fills exactly one block",
    caption: [
      "the blocks are why Aida is the easiest fabric to start on",
      "count = blocks per inch, so 14-count Aida gives 14 stitches to the inch",
      "one stitch per block — you never count fabric threads",
    ],
    draw(cv) {
      // Woven blocks: bundles of threads, not a plain grid.
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 4; r++) {
          const x = 8 + c * CELL;
          const y = 6 + r * CELL;
          cv.rect(x + 1, y + 1, CELL - 2, CELL - 2, "grid");
          cv.hline(x + 1, y + 3, CELL - 2, "yarnAlt", 1);
          cv.vline(x + 3, y + 1, CELL - 2, "yarnAlt", 1);
        }
      }
      for (let c = 0; c <= 5; c++) {
        for (let r = 0; r <= 4; r++) cv.disc(8 + c * CELL, 6 + r * CELL, 1, "ink");
      }
      cross(cv, 8, 6, 2, 1, "highlight");
      tag(cv, 8, 50, "one block = one stitch");
    },
  },

  "x-evenweave-linen": {
    title:
      "Evenweave and linen: single threads with no blocks, stitched over two threads so one cross spans a two-by-two square, with linen's thicker slubs drawn irregularly",
    caption: [
      "evenweave has uniform threads; linen has slubs and is deliberately uneven",
      "stitching over two threads halves the count: 28-count over two = 14 stitches per inch",
      "so a 28-count evenweave and a 14-count Aida finish the same size",
    ],
    draw(cv) {
      // Single-thread weave, half the pitch of the Aida drawing.
      const P = 5;
      for (let c = 0; c <= 12; c++) cv.vline(8 + c * P, 6, 8 * P + 1, "grid");
      for (let r = 0; r <= 8; r++) cv.hline(8, 6 + r * P, 12 * P + 1, "grid");
      // Slubs: a couple of threads drawn fatter, which is what linen looks like.
      cv.vline(8 + 4 * P, 6, 8 * P, "yarnAlt", 2);
      cv.hline(8, 6 + 5 * P, 12 * P, "yarnAlt", 2);
      // One cross spanning two threads each way.
      cv.line(8 + 6 * P + 1, 6 + 4 * P - 1, 8 + 8 * P - 1, 6 + 2 * P + 1, "highlight", 2);
      cv.line(8 + 6 * P + 1, 6 + 2 * P + 1, 8 + 8 * P - 1, 6 + 4 * P - 1, "highlight", 2);
      tag(cv, 8, 52, "one stitch over two threads");
    },
  },

  "x-fabric-count": {
    title:
      "Finished size from fabric count: a chart's stitch count divided by the stitches per inch, with a margin added all round for framing",
    caption: [
      "width in inches = stitches across / count (halve the count if working over two)",
      "100 stitches on 14-count = 100 / 14 = 7.1 inches",
      "add 3 inches to each dimension — 1.5 inches of spare fabric on every side",
    ],
    draw(cv) {
      cv.frame(4, 6, 64, 42, "grid", 1);
      cv.frame(14, 14, 44, 26, "yarn", 1);
      cv.arrow(14, 10, 58, 10, "highlight", 1, 2);
      cv.text(36, 8, "100 sts", "text", { size: 4, anchor: "middle" });
      cv.arrow(10, 14, 10, 40, "highlight", 1, 2);
      cv.hline(4, 12, 10, "yarnAlt", 1);
      cv.hline(58, 12, 10, "yarnAlt", 1);
      tag(cv, 4, 53, "design + 1.5 in spare on every side");
    },
  },

  "x-floss-strands": {
    title:
      "Stranded cotton: a six-strand skein with two strands separated out one at a time and laid back together before threading",
    caption: [
      "a skein is six strands loosely twisted — you almost never stitch with all six",
      "pull strands out ONE at a time, then put them back together",
      "2 strands for 14- and 16-count, 1 for 18-count and for backstitch",
    ],
    draw(cv) {
      // The skein.
      for (let i = 0; i < 6; i++) cv.hline(6, 12 + i * 3, 26, "yarn", 2);
      cv.rect(14, 8, 8, 20, "grid");
      tag(cv, 6, 34, "6 strands");
      // Two drawn off, separated, then laid parallel.
      cv.quad([34, 18], [44, 10], [62, 14], "highlight", 2);
      cv.quad([34, 22], [44, 26], [62, 18], "highlight", 2);
      cv.hline(48, 40, 18, "highlight", 2);
      cv.hline(48, 44, 18, "highlight", 2);
      tag(cv, 36, 50, "2 strands, separated then re-laid");
    },
  },

  "x-hoops-frames": {
    title:
      "A round hoop with the fabric clamped between its two rings, beside a scroll frame with the fabric rolled onto two bars",
    caption: [
      "a hoop is quick and portable but leaves a ring mark if left in",
      "a scroll frame or Q-snap holds a big piece without crushing stitched areas",
      "drum-tight is wrong: aim for taut, so the fabric still gives a little",
    ],
    draw(cv) {
      cv.ring(20, 24, 15, "tool", 2);
      cv.ring(20, 24, 12, "grid", 1);
      cv.rect(18, 8, 4, 4, "tool");
      tag(cv, 8, 48, "hoop");
      cv.rect(46, 10, 22, 3, "tool");
      cv.rect(46, 36, 22, 3, "tool");
      cv.rect(48, 13, 18, 23, "grid");
      cv.vline(46, 10, 29, "tool", 2);
      cv.vline(68, 10, 29, "tool", 2);
      tag(cv, 44, 48, "scroll frame");
    },
  },

  "x-needles": {
    title:
      "A tapestry needle with its blunt tip and long eye beside a sharp embroidery needle, showing why the blunt one slides between fabric threads instead of splitting them",
    caption: [
      "cross stitch uses a blunt tapestry needle — size 24 for 14-count, 26 for 18",
      "the blunt tip finds the hole instead of piercing a thread",
      "keep one sharp needle for quarter stitches, which must pierce the block",
    ],
    draw(cv) {
      cv.line(14, 8, 14, 40, "tool", 2);
      cv.oval(14, 12, 2, 4, "tool");
      cv.disc(14, 41, 2, "tool");
      tag(cv, 4, 50, "blunt");
      cv.line(50, 8, 50, 40, "tool", 2);
      cv.oval(50, 12, 1, 3, "tool");
      cv.line(50, 40, 50, 45, "highlight", 1);
      tag(cv, 42, 50, "sharp");
      cv.hline(28, 24, 10, "grid", 1);
    },
  },

  "x-loop-start": {
    title:
      "Loop start: one strand folded in half with both cut ends threaded through the needle, and the first stitch's needle passed through the loop at the back to lock it",
    caption: [
      "take ONE strand of the length you need doubled; fold it in half",
      "thread the two cut ends through the eye — the fold makes a loop",
      "work the first half-stitch, then pass the needle through the loop on the back",
    ],
    draw(cv) {
      tapestryNeedle(cv, 44, 10, 34, 16);
      cv.quad([36, 16], [20, 20], [16, 34], "yarn", 2);
      cv.quad([40, 18], [24, 24], [18, 36], "yarn", 2);
      cv.ring(16, 38, 5, "highlight", 2);
      cv.arrow(30, 44, 20, 40, "highlight", 1, 2);
      tag(cv, 4, 50, "pass the needle through the loop to lock it");
      tag(cv, 46, 22, "both ends in the eye");
    },
  },

  "x-away-waste-knot": {
    title:
      "Away waste knot: a knot on the surface about one inch from the first stitch, with the thread running under the back of the work and the knot cut off once stitching has passed over the tail",
    caption: [
      "knot the end and take the needle down from the FRONT, about 1 in away",
      "come up at your first stitch and work normally",
      "when the tail is covered, snip the knot off and weave the tail in",
    ],
    draw(cv) {
      aida(cv, 8, 6, 5, 4);
      cv.disc(8 + 1, 6 + 1, 3, "highlight");
      tag(cv, 14, 6, "knot on top");
      // The tail running under the stitched area.
      cv.line(9, 7, 8 + 3 * CELL, 6 + 2 * CELL, "yarnAlt", 1);
      for (let c = 2; c < 5; c++) cross(cv, 8, 6, c, 1, "yarn");
      cv.arrow(20, 50, 14, 44, "highlight", 1, 2);
      tag(cv, 24, 52, "cut the knot once the tail is trapped");
    },
  },

  "x-ending-thread": {
    title:
      "Ending a thread: the tail run under four or five stitch backs on the wrong side, then reversed through one of them, with no knot anywhere",
    caption: [
      "turn to the back and slide the needle under 4-5 stitch backs",
      "reverse and go back under one or two of them to lock it",
      "never knot: a knot shows as a lump through the front when the piece is framed",
    ],
    draw(cv) {
      // The wrong side: stitch backs run as short bars, not crosses.
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) cv.hline(10 + c * 11, 12 + r * 10, 8, "yarn", 2);
      }
      cv.polyline(
        [
          [10, 22],
          [21, 22],
          [32, 22],
          [43, 22],
          [54, 22],
        ],
        "highlight",
        2,
      );
      cv.polyline(
        [
          [54, 22],
          [45, 26],
          [36, 26],
        ],
        "yarnAlt",
        2,
      );
      tapestryNeedle(cv, 32, 28, 24, 30);
      tag(cv, 4, 46, "under the backs, then reverse");
      tag(cv, 4, 52, "wrong side — no knots");
    },
  },

  "x-reading-chart": {
    title:
      "A cross-stitch chart: a grid of symbols with heavy rules every ten squares and arrows marking the centre row and centre column",
    caption: [
      "one grid square = one stitch; the symbol says which colour",
      "the bold lines every ten squares are for counting, not for stitching",
      "the arrows mark the centre — start there and work outwards",
    ],
    draw(cv) {
      const P = 6;
      for (let c = 0; c <= 10; c++) cv.vline(8 + c * P, 4, 7 * P + 1, "grid", c % 5 === 0 ? 2 : 1);
      for (let r = 0; r <= 7; r++) cv.hline(8, 4 + r * P, 10 * P + 1, "grid", r % 5 === 0 ? 2 : 1);
      const marks: Array<[number, number, PaletteKey]> = [
        [2, 1, "yarn"],
        [3, 1, "yarn"],
        [4, 2, "yarnAlt"],
        [5, 2, "yarnAlt"],
        [5, 3, "yarn"],
        [6, 4, "yarnAlt"],
        [3, 4, "yarn"],
      ];
      for (const [c, r, key] of marks) cv.rect(9 + c * P, 5 + r * P, P - 2, P - 2, key);
      cv.arrow(4, 4 + 5 * P - 3, 8, 4 + 5 * P - 3, "highlight", 1, 2);
      cv.arrow(8 + 5 * P, 52, 8 + 5 * P, 47, "highlight", 1, 2);
      tag(cv, 4, 52, "centre arrows");
    },
  },

  "x-symbol-key": {
    title:
      "A chart key: each symbol lined up with its floss number, colour name and the stitch type it is worked in",
    caption: [
      "the key maps symbol to floss number — the number is the real identity",
      "'DMC 310' means the same black to every stitcher; 'black' does not",
      "the key also says which symbols are backstitch or French knots, not crosses",
    ],
    draw(cv) {
      const rows: Array<[PaletteKey, string]> = [
        ["yarn", "310"],
        ["yarnAlt", "666"],
        ["highlight", "725"],
        ["tool", "B5200"],
      ];
      cv.frame(4, 6, 64, 40, "grid", 1);
      rows.forEach(([key, num], i) => {
        const y = 11 + i * 9;
        cv.rect(8, y, 7, 7, key);
        cv.text(20, y + 6, num, "text", { size: 5 });
        cv.hline(8, y + 8, 58, "grid", 1);
      });
      tag(cv, 44, 51, "symbol - number");
    },
  },

  "x-gridding": {
    title:
      "Gridding: the blank fabric marked into ten-by-ten squares with removable thread or a washable pen, matching the heavy rules on the chart",
    caption: [
      "grid the fabric in 10x10 blocks so it matches the chart's bold lines",
      "use washable pen or a contrasting thread you can pull out afterwards",
      "a miscount now costs one square instead of half an evening",
    ],
    draw(cv) {
      const P = 5;
      for (let c = 0; c <= 12; c++) cv.vline(6 + c * P, 6, 8 * P + 1, "grid");
      for (let r = 0; r <= 8; r++) cv.hline(6, 6 + r * P, 12 * P + 1, "grid");
      // The gridding lines themselves, every ten fabric squares.
      for (let c = 0; c <= 12; c += 5) cv.vline(6 + c * P, 6, 8 * P + 1, "highlight", 1);
      for (let r = 0; r <= 8; r += 5) cv.hline(6, 6 + r * P, 12 * P + 1, "highlight", 1);
      tag(cv, 6, 52, "10 x 10 blocks, pulled out at the end");
    },
  },

  "x-railroading": {
    title:
      "Railroading: the needle slipped between the two strands of a leg before the stitch is pulled tight, so the strands lie flat and parallel instead of twisting",
    caption: [
      "just before tightening, slide the needle between the two strands",
      "the strands then lie side by side like rails, and cover the fabric better",
      "it slows you down and it is worth it on the top legs, which are what you see",
    ],
    draw(cv) {
      // Twisted (left) versus railroaded (right), same stitch.
      cv.quad([10, 38], [18, 30], [12, 22], "yarn", 1);
      cv.quad([14, 38], [8, 30], [16, 22], "yarn", 1);
      tag(cv, 6, 48, "twisted");
      cv.line(46, 38, 52, 22, "yarn", 1);
      cv.line(50, 38, 56, 22, "yarn", 1);
      tapestryNeedle(cv, 66, 32, 44, 30);
      tag(cv, 42, 48, "railroaded");
    },
  },

  "x-danish-english": {
    title:
      "Danish and English methods compared: a row of bottom legs worked across and then crossed on the return, beside single crosses each completed before moving on",
    caption: [
      "Danish: all the / legs across the row, then all the \\ legs coming back",
      "English: finish each X before moving to the next square",
      "Danish is faster and more even in blocks; English suits scattered confetti",
    ],
    draw(cv) {
      aida(cv, 6, 8, 3, 2);
      for (let c = 0; c < 3; c++) cross(cv, 6, 8, c, 0, "yarn", "bottom");
      for (let c = 0; c < 3; c++) cross(cv, 6, 8, c, 1, "yarn", "bottom");
      cross(cv, 6, 8, 2, 1, "highlight", "top");
      cv.arrow(8, 32, 32, 32, "highlight", 1, 2);
      tag(cv, 6, 40, "Danish");
      aida(cv, 42, 8, 2, 2);
      cross(cv, 42, 8, 0, 0, "yarn");
      cross(cv, 42, 8, 1, 0, "yarn");
      cross(cv, 42, 8, 0, 1, "highlight");
      tag(cv, 42, 40, "English");
    },
  },

  "x-parking": {
    title:
      "Parking: several threads left hanging with their needles pushed through the fabric at the square where each colour will next be used, so a confetti-heavy block can be worked colour by colour",
    caption: [
      "work one colour through a block, then push its needle up at its next square",
      "the parked needle IS the bookmark — no counting back when you return",
      "combined with gridding this is how big confetti-heavy pieces stay accurate",
    ],
    draw(cv) {
      aida(cv, 8, 6, 5, 4);
      cross(cv, 8, 6, 0, 0, "yarn");
      cross(cv, 8, 6, 2, 1, "yarnAlt");
      cross(cv, 8, 6, 4, 2, "highlight");
      tapestryNeedle(cv, 8 + 1 * CELL + 4, 6 + 1 * CELL + 10, 8 + 1 * CELL + 4, 6 + 1 * CELL);
      tapestryNeedle(cv, 8 + 3 * CELL + 4, 6 + 2 * CELL + 10, 8 + 3 * CELL + 4, 6 + 2 * CELL);
      tag(cv, 8, 50, "needles parked where each colour resumes");
    },
  },

  "x-washing-pressing": {
    title:
      "Finishing: the piece soaked in cool water with mild soap, rinsed, rolled in a towel, then pressed face down on a folded towel so the stitches are not crushed",
    caption: [
      "soak in cool water with a mild soap; test dark floss for bleeding first",
      "rinse until the water runs clear, roll in a towel, never wring",
      "press FACE DOWN on a towel with a warm iron while still slightly damp",
    ],
    draw(cv) {
      cv.frame(4, 6, 30, 20, "grid", 1);
      for (let i = 0; i < 4; i++) cv.quad([6, 22 - i * 2], [18, 26 - i * 2], [32, 22 - i * 2], "yarn", 1);
      tag(cv, 4, 32, "soak, do not wring");
      // Iron on the face-down piece, with the towel under it.
      cv.rect(40, 34, 28, 4, "grid");
      cv.rect(42, 30, 24, 4, "yarn");
      cv.polyline(
        [
          [46, 30],
          [46, 20],
          [62, 20],
          [62, 30],
        ],
        "tool",
        2,
      );
      tag(cv, 38, 48, "face down on a towel");
    },
  },

  "x-preparing-fabric": {
    title:
      "Preparing fabric: the cut edges bound against fraying, the fabric folded in half twice to find the centre, and the centre marked before the first stitch",
    caption: [
      "bind the edges — overcast, zigzag or masking tape — before anything else",
      "fold in half, then in half again; the corner of the folds is the centre",
      "mark the centre with a tacking stitch and start the chart's centre there",
    ],
    draw(cv) {
      cv.frame(8, 6, 54, 36, "grid", 1);
      // Bound edges.
      for (let i = 0; i < 14; i++) cv.line(8 + i * 4, 6, 10 + i * 4, 3, "yarnAlt", 1);
      // The two folds.
      cv.dashedH(8, 24, 54, "highlight");
      cv.vline(35, 6, 36, "highlight", 1);
      cross(cv, 31, 20, 0, 0, "highlight");
      tag(cv, 8, 50, "fold twice — the centre is where the folds meet");
    },
  },

  "x-terms": {
    title:
      "Cross-stitch shorthand laid out as a chart line: stitch count, fabric count and the over-two note that together fix the finished size",
    caption: [
      "a design's size is given in stitches, never in inches — inches depend on the fabric",
      "'28ct over 2' means 14 stitches per inch, the same as 14-count Aida",
      "'2 over 1' means two strands worked over one fabric thread",
    ],
    draw(cv) {
      cv.frame(4, 8, W - 8, 16, "grid", 1);
      cv.text(8, 19, "120w x 90h sts", "text", { size: 6 });
      cv.frame(4, 28, W - 8, 16, "grid", 1);
      cv.text(8, 39, "28ct over 2 = 14/in", "text", { size: 5 });
      cv.hline(8, 42, 56, "highlight", 2);
      tag(cv, 4, 51, "stitches + count = inches");
    },
  },
};

// ─── public surface ─────────────────────────────────────────────────────────

export const LEARN_DIAGRAM_IDS: readonly string[] = Object.keys(SPECS);

export function hasLearnDiagram(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SPECS, id);
}

export function learnDiagramTitle(id: string): string | undefined {
  return SPECS[id]?.title;
}

export function learnDiagramCaption(id: string): readonly string[] | undefined {
  return SPECS[id]?.caption;
}

/**
 * Canvases are built once and cached. Drawing is deterministic and the canvas is
 * immutable after construction, so the same canvas can be emitted against a
 * light palette, a dark palette and a print palette without redrawing.
 */
const canvasCache = new Map<string, PixelCanvas>();

export function learnDiagramCanvas(id: string): PixelCanvas | undefined {
  const spec = SPECS[id];
  if (!spec) return undefined;
  const hit = canvasCache.get(id);
  if (hit) return hit;
  const cv = new PixelCanvas(W, H, { title: spec.title });
  spec.draw(cv);
  canvasCache.set(id, cv);
  return cv;
}

/** Inline-ready SVG for a learn-local diagram, or undefined if the id is unknown. */
export function learnDiagram(id: string, palette: DiagramPalette = DEFAULT_PALETTE): string | undefined {
  return learnDiagramCanvas(id)?.toSVG(palette);
}
