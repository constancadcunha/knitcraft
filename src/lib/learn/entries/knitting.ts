/**
 * src/lib/learn/entries/knitting.ts — the knitting curriculum, 40 entries.
 *
 * Teaching text is written here rather than pulled from `craftKnowledge`,
 * because the old `StitchEntry` had exactly one prose field ("tutorial") and a
 * paragraph is not a how-to. The facts in it were sound and are carried over;
 * the structure — prerequisites, numbered steps, the mistakes a first attempt
 * actually makes — is new.
 *
 * ORDERING IS ENFORCED, NOT ASSUMED. `prerequisites` must form a DAG and every
 * id must resolve; the tests check both. So "learn ssk before k2tog" cannot be
 * written down by accident.
 */

import { steps, type LearnEntry } from "../types";

/* Sources used across several entries. Named so a fix lands in one place. */
const CYC_WEIGHTS = "https://www.craftyarncouncil.com/standards/yarn-weight-system";
const CYC_ABBREV = "https://www.craftyarncouncil.com/standards/knitting-abbreviations";
const CYC_KNIT = "https://www.craftyarncouncil.com/mar06_knit.html";
const CYC_PURL = "https://craftyarncouncil.com/mar06_purl.html";

export const KNITTING_ENTRIES: readonly LearnEntry[] = [
  /* ── stage 1: the first hour ─────────────────────────────────────────── */

  {
    id: "cast-on",
    craft: "knitting",
    kind: "technique",
    name: "Casting on",
    abbreviation: "CO",
    aka: ["long-tail cast on", "cast-on"],
    summary: "Putting the first row of stitches onto the needle — every project starts here.",
    appearance:
      "A row of loops sitting on the needle over a neat braided edge. The long-tail cast on shows a row of little purl-like bumps along the bottom.",
    useFor:
      "The start of anything worked flat or in the round. Long-tail is the default: it is stretchy enough for most hems and it is quick once the rhythm arrives.",
    difficulty: "first-hour",
    tags: ["edge", "foundation", "beginner-first"],
    prerequisites: [],
    related: ["knit", "bind-off", "k-provisional-cast-on", "k-buttonhole"],
    steps: steps([
      {
        text: "Pull off a tail about three times the width of the finished piece, then make a slip knot on the needle. That knot is stitch one.",
        note: "Running out of tail two stitches from the end is the single most common cast-on failure. A rough rule: an inch of tail per stitch at worsted weight, then add a hand-span.",
      },
      "Hold the tail over your thumb and the ball yarn over your index finger, both ends held in your palm — the strands make a V.",
      {
        text: "Take the needle up under the front of the thumb loop, over the top of the finger strand, and back down through the thumb loop.",
        note: "You are borrowing a stitch from the tail and locking it with the ball yarn. That is why the tail runs out if it is too short.",
      },
      {
        text: "Let the thumb loop drop, then draw the new stitch snug against the needle — snug, not tight.",
        note: "Cast on over one needle, not two. 'Two needles for a stretchy edge' makes loose, uneven loops; if you need stretch, use a larger needle or a stretchier cast on.",
      },
      "Repeat until you have the number of stitches the pattern asks for, then count them before you knit a single row.",
    ]),
    pitfalls: [
      "A cast on so tight the first row is a fight. It will also bite into the wearer's hips. Go up a needle size for the cast-on row only.",
      "Counting the slip knot twice, or not at all. Pick one habit and keep it — it is stitch number one.",
      "Cast-on edges do not block out much. If it is too tight now, rip it out now.",
    ],
    terminology: {
      us: "cast on (CO)",
      uk: "cast on (CO)",
      consequence:
        "The same in both, but UK patterns say 'tension' where US ones say 'gauge', and UK needle numbers run BACKWARDS — a UK 8 is a 4 mm needle while a US 8 is 5 mm. Work from the millimetre size.",
    },
    diagram: { source: "technique", id: "cast-on" },
    sources: [CYC_KNIT, "https://www.craftyarncouncil.com/standards/knit-needle-sizes"],
  },

  {
    id: "knit",
    craft: "knitting",
    kind: "stitch",
    name: "Knit stitch",
    abbreviation: "k",
    aka: ["plain stitch", "knit"],
    summary: "The stitch everything else is built from: a new loop pulled through an old one, front to back.",
    appearance: "Smooth V-shaped columns on the side facing you.",
    useFor:
      "Everything. Knit every row and you get garter; alternate with purl and you get stockinette, rib, seed and every texture there is.",
    difficulty: "first-hour",
    tags: ["foundation", "beginner-first"],
    prerequisites: ["cast-on"],
    related: ["purl", "garter", "bind-off", "stockinette"],
    chartSymbol: "k",
    steps: steps([
      "Hold the needle with the stitches in your left hand and the yarn behind the work.",
      {
        text: "Push the right needle into the front of the first stitch, front to back, so the two needles cross with the right one behind.",
        note: "Into the FRONT leg. Going into the back leg gives a twisted stitch — a real technique (ktbl), just not this one.",
      },
      "Wrap the yarn anticlockwise around the right needle, passing it between the two needle tips.",
      "Bring the right needle back through the old stitch, carrying the new loop with it.",
      {
        text: "Slide the old stitch off the left needle. One knit stitch made.",
        note: "The new stitch lives on the RIGHT needle. If your stitch count is falling, you are probably dropping the new loop instead of the old one.",
      },
    ]),
    pitfalls: [
      "Stitch count creeping up: the working yarn was in front when you started the stitch, which adds an accidental yarn over. Yarn behind for knit, in front for purl.",
      "A row that grows two stitches at each edge: you are knitting into the gap between the last stitch and the needle. Count at the end of every row until it stops happening.",
      "Painfully tight stitches — you are tightening against the needle tip, which is the narrowest part. Push the stitch up onto the shaft before pulling snug.",
    ],
    fabric: { reversible: false, curls: false, stretch: "medium" },
    diagram: { source: "stitch", id: "knit" },
    sources: [CYC_KNIT, "https://sarahmaker.com/knit-stitch/"],
  },

  {
    id: "purl",
    craft: "knitting",
    kind: "stitch",
    name: "Purl stitch",
    abbreviation: "p",
    aka: ["purl"],
    summary: "The knit stitch worked from the other side — a loop pulled through back to front, leaving a bump.",
    appearance: "Raised horizontal bumps on the side facing you. A purl is exactly a knit stitch seen from behind.",
    useFor:
      "Wrong-side rows of stockinette, and every knit-and-purl texture: rib, seed, moss, the background of cables.",
    difficulty: "first-hour",
    tags: ["foundation", "beginner-first"],
    prerequisites: ["knit"],
    related: ["knit", "stockinette", "ribbing", "seed"],
    chartSymbol: "p",
    steps: steps([
      "Bring the working yarn to the FRONT, between the two needles.",
      "Push the right needle into the front of the first stitch from right to left — the needle now sits in front of the left one.",
      "Wrap the yarn anticlockwise over the right needle, coming down the front.",
      "Push the right needle back and down through the stitch, taking the new loop with it.",
      {
        text: "Slide the old stitch off. One purl made.",
        note: "Purling usually feels slower and looser than knitting for the first few thousand stitches. That is normal, and it is why row gauge and stitch gauge are measured separately.",
      },
    ]),
    pitfalls: [
      "Yarn taken over the top of the needle instead of between the needles: that makes a yarn over and adds a stitch every time.",
      "Rows that look like rib when they should be smooth: the yarn was left at the back for a purl or at the front for a knit somewhere in the row.",
      "A purl row much looser than the knit rows — try purling on a needle a half size smaller, or move to combination purling, before blaming the yarn.",
    ],
    fabric: { reversible: false, curls: false, stretch: "medium" },
    diagram: { source: "stitch", id: "purl" },
    sources: [CYC_PURL, "https://sarahmaker.com/purl-stitch/"],
  },

  {
    id: "bind-off",
    craft: "knitting",
    kind: "technique",
    name: "Binding off",
    abbreviation: "BO",
    aka: ["casting off", "cast off"],
    summary: "Closing the live stitches so the fabric cannot unravel.",
    appearance: "A chain lying sideways along the top edge.",
    useFor: "The top of every piece; shoulder edges; the top of a neckband.",
    difficulty: "first-hour",
    tags: ["edge", "finishing", "beginner-first"],
    prerequisites: ["knit"],
    related: ["cast-on", "k-three-needle-bind-off", "k-kitchener", "k-buttonhole"],
    steps: steps([
      "Knit two stitches so both sit on the right needle.",
      {
        text: "Lift the first stitch over the second and off the needle. One stitch remains.",
        note: "Use the left needle tip to lift, not your fingers — you get a far more even edge.",
      },
      "Knit one more stitch, then lift the stitch behind it over again. Repeat to the end.",
      {
        text: "Cut the yarn leaving about 15 cm, thread it through the final loop and pull tight.",
        note: "Work each bind-off stitch in pattern — knit the knits, purl the purls — so a rib's bind off stays elastic.",
      },
    ]),
    pitfalls: [
      "A bind off tighter than the fabric. It is the single most common reason a hat will not go over a head. Bind off with a needle two sizes larger, or use a stretchy bind off on anything that has to stretch.",
      "Binding off with the yarn still attached to the ball and then cutting too short — leave enough to weave in.",
    ],
    terminology: {
      us: "bind off (BO)",
      uk: "cast off",
      consequence:
        "Same operation, different word. UK patterns say 'cast off' and it is easy to read past it as 'cast on' at the end of a long row.",
    },
    diagram: { source: "technique", id: "bind-off" },
    sources: ["https://www.craftyarncouncil.com/standards/knitting-abbreviations", "https://sarahmaker.com/bind-off-knitting/"],
  },

  {
    id: "garter",
    craft: "knitting",
    kind: "stitch",
    name: "Garter stitch",
    abbreviation: "g st",
    aka: ["garter"],
    summary: "Knit every row. Ridged, flat, identical on both sides, and the best first fabric there is.",
    appearance: "Horizontal ridges on both faces. One visible ridge is two rows.",
    useFor:
      "Scarves, blankets, baby knits, and any border that has to lie flat next to stockinette — hems, button bands, collar edges.",
    difficulty: "first-hour",
    tags: ["texture", "reversible", "flat-edge", "beginner-first"],
    prerequisites: ["knit"],
    related: ["knit", "stockinette", "seed", "blocking"],
    steps: steps([
      "Cast on any number of stitches — garter has no repeat, so any count works.",
      "Knit every stitch of every row. There is no wrong side to keep track of.",
      {
        text: "Count ridges rather than rows: each ridge is two rows worked.",
        note: "Garter's row gauge is roughly twice as dense as stockinette's, so the same row count makes a much shorter piece. Always swatch it separately.",
      },
      {
        text: "Worked in the round, alternate one knit round with one purl round.",
        note: "Knitting every round in the round gives stockinette, not garter — in the round you are always looking at the same face.",
      },
    ]),
    pitfalls: [
      "Losing count of ridges near an increase. Put a removable marker in the ridge you are counting from.",
      "Assuming garter and stockinette swap freely in a pattern. They do not: garter is shorter per row and wider per stitch.",
    ],
    fabric: { multiple: "any number", rowRepeat: 2, reversible: true, curls: false, stretch: "medium" },
    diagram: { source: "stitch", id: "garter" },
    sources: ["https://sarahmaker.com/garter-stitch/"],
  },

  {
    id: "yarn-weights",
    craft: "knitting",
    kind: "reference",
    name: "Yarn weights",
    aka: ["yarn weight", "CYC", "ball band", "lace fingering DK worsted aran chunky"],
    summary: "How thick a yarn is, what the number on the ball band means, and the needle it usually wants.",
    appearance: "A ladder of strands from cobweb-thin lace to arm-knitting jumbo.",
    useFor:
      "Substituting one yarn for another, reading a ball band, and knowing roughly where to start before you swatch. The same table serves crochet — the hook column is the one to read there.",
    difficulty: "first-hour",
    tags: ["reference", "yarn", "gauge", "shared-with-crochet"],
    prerequisites: [],
    related: ["gauge-swatch", "c-hook-sizes", "stockinette"],
    steps: steps([
      {
        text: "Find the number in the little skein symbol on the ball band — that is the Craft Yarn Council category, 0 to 7.",
        note: "'Weight' means thickness, not how heavy the ball is. A 100 g ball of lace and a 100 g ball of chunky weigh the same and behave nothing alike.",
      },
      "Look the category up in the table for a starting needle or hook and an expected gauge.",
      {
        text: "Then swatch anyway. Two yarns labelled worsted can knit to noticeably different fabrics.",
        note: "For substituting, compare metres per 100 g rather than the category name — that number is what tells you whether one ball will go as far as another.",
      },
    ]),
    pitfalls: [
      "Trusting the ball band's gauge as your gauge. It is the mill's swatch, on the mill's needles, blocked the mill's way.",
      "Matching a substitute by category alone. Fibre and construction change drape enormously — a chainette DK drapes nothing like a woollen-spun DK.",
    ],
    /* Rows are generated from YARN_WEIGHTS in the index module so the table and
       the pattern engine can never drift apart. See entries/index.ts. */
    table: {
      caption: "Craft Yarn Council Standard Yarn Weight System",
      columns: ["CYC", "Name", "Also called", "Knit sts / 10 cm", "Needle mm", "Hook mm"],
      rows: [],
      source: CYC_WEIGHTS,
    },
    diagram: { source: "learn", id: "yarn-weights" },
    sources: [CYC_WEIGHTS],
  },

  /* ── stage 2: real fabric ────────────────────────────────────────────── */

  {
    id: "stockinette",
    craft: "knitting",
    kind: "stitch",
    name: "Stockinette stitch",
    abbreviation: "St st",
    aka: ["stocking stitch", "jersey"],
    summary: "Knit on the right side, purl on the wrong side. The smooth fabric almost every sweater is made of.",
    appearance: "Smooth columns of V's on the right side, bumps on the wrong side. Curls at every edge if left bare.",
    useFor: "Sweater and cardigan bodies, sleeves, the ground for colourwork, anything that wants to hang smooth.",
    difficulty: "beginner",
    tags: ["texture", "curls", "garment"],
    prerequisites: ["knit", "purl"],
    related: ["garter", "ribbing", "blocking", "gauge-swatch", "reading-flat-charts"],
    steps: steps([
      "Right-side rows: knit every stitch.",
      "Wrong-side rows: purl every stitch.",
      {
        text: "Worked in the round, knit every round — you never turn, so you never see the purl face.",
        note: "This is why in-the-round and flat stockinette often measure differently for the same knitter: flat alternates knitting and purling, and most people purl at a different tension.",
      },
      {
        text: "Plan a non-curling border before you cast on: rib, garter or seed at hems, cuffs and front edges.",
        note: "The curl is structural, not a tension fault. A knit stitch is shorter at the front and a purl at the back, so the fabric rolls toward the knit face at top and bottom and toward the purl face at the sides.",
      },
    ]),
    pitfalls: [
      "Expecting blocking to flatten a bare stockinette edge. It will relax while wet and roll again as it dries.",
      "A visible ridge where the pattern says stockinette: a purl row worked on the right side. Read back — the ridge marks the row.",
      "Rowing out, where alternate rows look loose. Change needle size for the purl rows, not for both.",
    ],
    fabric: { multiple: "any number", rowRepeat: 2, reversible: false, curls: true, stretch: "medium" },
    diagram: { source: "stitch", id: "stockinette" },
    sources: ["https://sarahmaker.com/stockinette-stitch/"],
  },

  {
    id: "ribbing",
    craft: "knitting",
    kind: "stitch",
    name: "Ribbing",
    abbreviation: "k1p1",
    aka: ["rib", "1x1 rib", "2x2 rib"],
    summary: "Alternating columns of knit and purl that pull together sideways and spring back.",
    appearance: "Vertical ridges. Relaxed it looks narrow and dense; stretched it opens to nearly twice the width.",
    useFor: "Cuffs, hems, necklines, button bands — anywhere an edge has to hug and recover.",
    difficulty: "beginner",
    tags: ["texture", "reversible", "stretch", "edge"],
    prerequisites: ["knit", "purl"],
    related: ["stockinette", "seed", "brioche", "picking-up-stitches"],
    steps: steps([
      "1x1 rib: *k1, p1* to the end. Move the yarn between the needle tips at every change, never over the top.",
      {
        text: "On every following row, knit the stitches that face you as V's and purl the ones that face you as bumps.",
        note: "Reading the fabric rather than counting rows is what keeps rib straight. Once the columns are established the fabric tells you what to do.",
      },
      "2x2 rib: *k2, p2* across, over a multiple of 4 stitches (plus 2 for a flat piece that starts and ends with knits).",
      {
        text: "Rib is measured relaxed, never stretched.",
        note: "Cast on for rib at the stitch count you want the edge to MEASURE when relaxed. Ribbing is meant to pull in; casting on to the full body width gives a flared, floppy hem.",
      },
    ]),
    pitfalls: [
      "The yarn taken over the needle rather than between: extra stitches, and a hole at the changeover.",
      "1x1 rib worked over an odd number of stitches in the round — the columns will not meet at the join.",
      "Casting on too tightly for rib. The cast on decides how far the cuff can stretch, no matter how elastic the rib is.",
    ],
    fabric: { multiple: "multiple of 2 (1x1) or 4 (2x2)", rowRepeat: 1, reversible: true, curls: false, stretch: "high" },
    diagram: { source: "stitch", id: "ribbing" },
    sources: ["https://sarahmaker.com/knit-ribbing/"],
  },

  {
    id: "seed",
    craft: "knitting",
    kind: "stitch",
    name: "Seed stitch",
    abbreviation: "seed",
    aka: ["moss stitch (UK)", "rice stitch"],
    summary: "Knit and purl alternating every stitch AND every row — a scattered bumpy texture that never curls.",
    appearance: "Tiny raised dots in an even scatter, the same on both faces.",
    useFor: "Borders that must lie flat, button bands, scarves, and whole garment bodies when you want quiet texture.",
    difficulty: "beginner",
    tags: ["texture", "reversible", "flat-edge"],
    prerequisites: ["ribbing"],
    related: ["moss", "ribbing", "garter"],
    steps: steps([
      "Row 1: *k1, p1* to the end.",
      {
        text: "Row 2: purl the stitches that look like knits and knit the ones that look like purls — the opposite of rib.",
        note: "One sentence separates seed from rib: rib stacks the same stitch on top of itself, seed offsets it every row.",
      },
      "Repeat row 2 for every following row.",
      {
        text: "Over an odd number of stitches every row is simply *k1, p1* ending k1, which is easier to keep straight.",
        note: "That is why so many seed-stitch borders are written over an odd count.",
      },
    ]),
    pitfalls: [
      "Waking up to rib instead of seed: you stacked a knit over a knit. Read the stitch below before each one.",
      "Seed is a slow, dense fabric. It eats noticeably more yarn than stockinette over the same area — budget for it.",
    ],
    terminology: {
      us: "seed stitch",
      uk: "moss stitch",
      consequence:
        "UK 'moss stitch' is US 'seed stitch'. US 'moss stitch' is the four-row double version, which UK patterns call 'double moss'. Follow the row instructions, not the name.",
    },
    fabric: { multiple: "any number (odd is easiest)", rowRepeat: 2, reversible: true, curls: false, stretch: "low" },
    diagram: { source: "stitch", id: "seed" },
    sources: ["https://sarahmaker.com/knit-seed-stitch/"],
  },

  {
    id: "moss",
    craft: "knitting",
    kind: "stitch",
    name: "Moss stitch (double seed)",
    abbreviation: "moss",
    aka: ["double moss stitch (UK)", "double seed stitch"],
    summary: "Seed stitch held for two rows before it offsets, making a bolder brick-like texture.",
    appearance: "Chunkier bumps than seed, arranged in a staggered brick pattern. Reversible, lies flat.",
    useFor: "Jackets, cushions, scarves — anywhere you want more surface than seed but still no curl.",
    difficulty: "beginner",
    tags: ["texture", "reversible", "flat-edge"],
    prerequisites: ["seed"],
    related: ["seed", "ribbing"],
    steps: steps([
      "Rows 1 and 2: *k1, p1* across — exactly like 1x1 rib for two rows.",
      "Rows 3 and 4: *p1, k1* across — the offset.",
      {
        text: "Repeat those four rows.",
        note: "The two-row hold is the whole difference from seed. If you offset every row, you have made seed stitch.",
      },
    ]),
    pitfalls: [
      "Losing track of which of the four rows you are on. A row counter or a marker every four rows costs nothing.",
      "The UK/US name clash — see the terminology note. Count the rows in the written instruction to work out which fabric is meant.",
    ],
    terminology: {
      us: "moss stitch / double seed",
      uk: "double moss stitch",
      consequence:
        "A UK pattern saying 'moss stitch' means the one-row-offset fabric US knitters call seed. Getting it wrong changes the texture and the row gauge.",
    },
    fabric: { multiple: "multiple of 2", rowRepeat: 4, reversible: true, curls: false, stretch: "low" },
    diagram: { source: "stitch", id: "moss" },
    sources: ["https://sarahmaker.com/knit-moss-stitch/"],
  },

  {
    id: "gauge-swatch",
    craft: "knitting",
    kind: "concept",
    name: "Gauge and how to swatch",
    abbreviation: "gauge",
    aka: ["tension", "swatch", "sts per inch"],
    summary: "The number that decides whether a sweater fits. Everything else in a pattern is arithmetic on top of it.",
    appearance: "A square of fabric, blocked, with a ruler laid across the middle of it.",
    useFor:
      "Every garment. A 10% gauge error over a 100 cm bust is 10 cm — a whole size — and no amount of careful knitting afterwards recovers it.",
    difficulty: "beginner",
    tags: ["gauge", "reference", "garment", "measuring"],
    prerequisites: ["stockinette"],
    related: ["yarn-weights", "blocking", "stockinette", "crochet-gauge-swatch"],
    steps: steps([
      {
        text: "Cast on enough stitches for a swatch at least 15 cm wide, in the stitch pattern the gauge is quoted in.",
        note: "Bigger than the 10 cm you intend to measure, because edge stitches are always a different tension and must be kept out of the measurement.",
      },
      "Work in pattern until the piece is at least 15 cm tall, then bind off loosely.",
      {
        text: "Wash and block it exactly the way you will wash the finished garment, and let it dry flat and unstretched.",
        note: "This is the step everyone skips and it is the step that matters. Superwash wool can grow 15% when wet; linen relaxes; cotton drops. An unblocked swatch measures a fabric that will not exist by the time anyone wears it.",
      },
      {
        text: "Lay a ruler across the middle and count stitches over 10 cm — including part stitches. Count rows over 10 cm separately.",
        note: "Count over as wide a span as the swatch allows and divide; measuring 10 cm exactly magnifies a half-stitch error into a whole size.",
      },
      {
        text: "Too many stitches to 10 cm means your fabric is too tight: go up a needle size. Too few means go down.",
        note: "Change needle size, not tension. Deliberately knitting looser is not repeatable over 40,000 stitches.",
      },
    ]),
    pitfalls: [
      "Measuring the swatch on the needle, or while it is still damp.",
      "Swatching in stockinette for a cabled pattern. Cables pull in hard; the gauge must come from the actual pattern stitch.",
      "Matching stitch gauge and ignoring row gauge. Row gauge governs sleeve and armhole depth, and raglan shaping falls apart without it.",
    ],
    terminology: {
      us: "gauge",
      uk: "tension",
      consequence:
        "The same measurement. A UK pattern's 'tension square' is a gauge swatch, usually quoted over 10 cm; older US patterns quote over 4 in, which is 10.16 cm — close enough to ignore, unlike the needle numbering.",
    },
    diagram: { source: "technique", id: "gauge-swatch" },
    sources: [CYC_WEIGHTS, "https://www.craftyarncouncil.com/standards/knit-needle-sizes"],
  },

  {
    id: "reading-flat-charts",
    craft: "knitting",
    kind: "concept",
    name: "Reading a knitting chart",
    abbreviation: "chart",
    aka: ["charts", "chart reading", "RS WS rows"],
    summary: "A chart is a picture of the right side of the fabric. The rules follow from that one fact.",
    appearance: "A grid of symbols with row numbers down the sides, read bottom to top.",
    useFor: "Lace, cables, colourwork — anything where the shape of the motif matters more than the words.",
    difficulty: "beginner",
    tags: ["chart", "reference", "reading"],
    prerequisites: ["knit", "purl"],
    related: ["k-abbreviations", "lace", "cable", "stranded-colourwork", "reading-crochet-charts"],
    steps: steps([
      {
        text: "Start at the bottom right and read row 1 right to left. Rows are numbered bottom to top, the way the fabric grows.",
        note: "Right to left because that is the direction your needle travels across a right-side row.",
      },
      {
        text: "Worked flat, even-numbered rows are wrong-side rows and are read LEFT to right.",
        note: "Row numbers on the left edge mark wrong-side rows, on the right edge right-side rows. That placement is the chart telling you which way to read.",
      },
      {
        text: "On a wrong-side row, work each symbol in its wrong-side form: a blank square means knit on the right side, so you purl it.",
        note: "This is the rule the symbol legend means by 'k on RS, p on WS'. The chart always shows the public face.",
      },
      {
        text: "Worked in the round, every round is a right-side round and every round reads right to left.",
        note: "Which is why a chart converted from flat to in-the-round needs its wrong-side rows rewritten, not just re-read.",
      },
      {
        text: "A bold outline marks the repeat: work the stitches before it once, the boxed section as many times as it fits, then the stitches after it once.",
        note: "Greyed 'no stitch' squares are spacers that keep the grid rectangular where the stitch count changes. Skip them; they are not a stitch.",
      },
    ]),
    pitfalls: [
      "Reading a wrong-side row right to left. Symmetrical motifs hide it for several rows and then go visibly wrong.",
      "Working a 'no stitch' square as a real stitch, which throws the count for the rest of the row.",
      "Assuming every chart uses the same symbols. Check the key: there is no single universal standard, though the Craft Yarn Council set is common.",
    ],
    diagram: { source: "technique", id: "reading-flat-charts" },
    sources: ["https://www.craftyarncouncil.com/standards/knit-chart-symbols"],
  },

  {
    id: "k-abbreviations",
    craft: "knitting",
    kind: "reference",
    name: "Reading a written row",
    abbreviation: "abbr",
    aka: ["abbreviations", "asterisk repeat", "stitch count", "pattern shorthand"],
    summary: "Asterisks, brackets and the number in parentheses — the punctuation of a knitting pattern.",
    appearance: "One written row broken into its parts, with the repeat and the count marked.",
    useFor: "Every written pattern. Most 'this pattern is wrong' posts are a misread repeat.",
    difficulty: "beginner",
    tags: ["reference", "reading", "chart"],
    prerequisites: ["knit", "purl"],
    related: ["reading-flat-charts", "c-abbreviations"],
    steps: steps([
      {
        text: "*...* marks a repeat. 'Rep from * to end' means work what is between the asterisks over and over until the row runs out.",
        note: "If the repeat does not come out even at the end of the row, either the stitch count is wrong or you have misread the multiple — stop and count, do not improvise.",
      },
      "[...] x3 groups stitches so a repeat can sit inside another repeat. Work the bracketed group the stated number of times.",
      {
        text: "( ) at the END of a row is the stitch count you should now have. Count it.",
        note: "It is a checkpoint, not decoration. Catching a lost stitch at the end of the row costs one row; catching it twenty rows later costs twenty.",
      },
      {
        text: "Sizes are written smallest first, with the rest in brackets: 'CO 80 (88, 96, 104)'. Highlight your size all the way down the pattern before you start.",
        note: "One highlighter pass at the start prevents the classic failure of knitting a size M body onto a size L armhole.",
      },
    ]),
    pitfalls: [
      "Reading 'k2tog' as 'k2, tog'. Abbreviations are single words: k2tog is one decrease, k2 tog is not a thing.",
      "Ignoring 'at the same time'. It means two shapings run together, and it is always in the paragraph you skimmed.",
      "Assuming every pattern uses the Craft Yarn Council abbreviations. Most do; designers add their own, and those are defined in the pattern's own list.",
    ],
    table: {
      caption: "The abbreviations that appear in almost every knitting pattern",
      columns: ["Abbr", "Means"],
      rows: [
        ["k / p", "knit / purl"],
        ["k2tog", "knit 2 together — one decrease, leans right"],
        ["ssk", "slip, slip, knit — one decrease, leans left"],
        ["yo", "yarn over — one increase, leaves a hole"],
        ["m1l / m1r", "make one left / right — one increase, no hole"],
        ["sl", "slip a stitch without working it"],
        ["pm / sm", "place marker / slip marker"],
        ["RS / WS", "right side / wrong side"],
        ["rep", "repeat"],
        ["tbl", "through the back loop"],
      ],
      source: CYC_ABBREV,
    },
    diagram: { source: "learn", id: "k-abbreviations" },
    sources: [CYC_ABBREV],
  },

  {
    id: "k-weaving-in-ends",
    craft: "knitting",
    kind: "technique",
    name: "Weaving in ends",
    abbreviation: "ends",
    aka: ["darning in ends", "sewing in ends"],
    summary: "Burying the tails so they never work loose, on the wrong side, without a knot.",
    appearance: "A tail threaded along a row of purl bumps and then doubled back on itself.",
    useFor: "Every end on every project. It is the difference between a handmade thing and a home-made one.",
    difficulty: "beginner",
    tags: ["finishing", "seaming"],
    prerequisites: ["bind-off"],
    related: ["blocking", "mattress-seam", "x-ending-thread"],
    steps: steps([
      "Turn the work to the wrong side and thread the tail on a blunt tapestry needle.",
      {
        text: "Run the needle through the purl bumps along one row for about 5 cm, splitting the strands of the stitch as you go.",
        note: "Following the path of a row of knitting means the tail stretches the way the fabric stretches. A tail run diagonally, against the grain, works its way out.",
      },
      {
        text: "Reverse direction and go back about 2 cm along the neighbouring row.",
        note: "That doubling back is what holds it. It is friction, not the length of the tail, that keeps the end in.",
      },
      {
        text: "Stretch the fabric in both directions, THEN trim flush.",
        note: "Trimming while the fabric is bunched leaves a tail that pops out to the right side the first time the garment is worn.",
      },
    ]),
    pitfalls: [
      "Knotting the ends. Knots make a hard lump that shows through, and they eventually work through to the front.",
      "Weaving a colourwork tail through the other colour — it shows as a shadow on the right side. Weave each tail into its own colour.",
      "Weaving ends in before blocking. Block first; a wet-blocked fabric settles and the ends bed in with it.",
    ],
    diagram: { source: "learn", id: "k-weaving-in-ends" },
    sources: ["https://sarahmaker.com/weave-in-ends-knitting/"],
  },

  {
    id: "blocking",
    craft: "knitting",
    kind: "technique",
    name: "Blocking",
    abbreviation: "blocking",
    aka: ["wet blocking", "steam blocking", "dressing"],
    summary: "Wetting or steaming the finished fabric and drying it to shape. It is not optional for lace or cables.",
    appearance: "A damp piece pinned out flat to its measurements on a mat.",
    useFor:
      "Opening lace, evening out stitches, settling a seam, and making a piece measure what the schematic says it measures.",
    difficulty: "beginner",
    tags: ["finishing", "measuring"],
    prerequisites: ["bind-off"],
    related: ["gauge-swatch", "mattress-seam", "c-blocking", "lace"],
    steps: steps([
      {
        text: "Soak the piece in cool water with a little wool wash for 15-20 minutes, until it is wet all the way through.",
        note: "Not warm water and no agitation — that is felting. Cool water, and lift the piece out supporting its weight rather than letting it hang.",
      },
      "Press the water out against the side of the bowl, then roll the piece in a towel and press. Never wring.",
      {
        text: "Lay it out on a mat and pin to the measurements on the schematic, starting at the corners and then halving each edge.",
        note: "Pinning corners first and then working to the middle of each side is what keeps an edge straight instead of scalloped.",
      },
      {
        text: "Leave it to dry completely before unpinning.",
        note: "Unpinning while the centre is still damp lets it spring back — the shape is only set when it is dry.",
      },
      {
        text: "Acrylic will not hold a wet block. Hover a steam iron just above it instead, and never put the iron down on the fabric.",
        note: "Enough heat 'kills' acrylic permanently — it goes limp and drapey and will not come back. Steam gently, and test on the swatch.",
      },
    ]),
    pitfalls: [
      "Pinning lace out so hard the yarn is stressed. Firm is right; twanging is too far.",
      "Blocking ribbing flat and stretched — it kills the elastic pull. Steam rib gently and let it relax.",
      "Skipping the swatch block and then discovering the sweater grows 10% in the wash.",
    ],
    diagram: { source: "technique", id: "blocking" },
    sources: ["https://sarahmaker.com/blocking-knitting/"],
  },

  {
    id: "k-dropped-stitch",
    craft: "knitting",
    kind: "technique",
    name: "Rescuing a dropped stitch",
    abbreviation: "fix",
    aka: ["picking up a dropped stitch", "ladder", "runs"],
    summary: "Catching a loose loop and climbing the ladder back up with a crochet hook, one rung at a time.",
    appearance: "A loop on a hook with a ladder of loose strands above it.",
    useFor: "Every knitter, weekly. Knowing this turns a disaster into two minutes of work.",
    difficulty: "beginner",
    tags: ["fixing", "rescue"],
    prerequisites: ["knit"],
    related: ["k-lifeline", "knit", "purl"],
    steps: steps([
      {
        text: "Stop knitting and secure the loose loop on a crochet hook or a safety pin before it drops any further.",
        note: "A dropped stitch runs under tension. Securing it first is why this takes two minutes rather than an evening.",
      },
      "Find the lowest rung of the ladder — the horizontal strand directly above the live loop.",
      {
        text: "Push the hook through the loop from the front, catch that lowest rung, and pull it through the loop.",
        note: "Always work from the BOTTOM rung up. Starting at the top gives you the rungs in the wrong order and a twisted column.",
      },
      "Repeat up the ladder, one rung at a time, until the stitch is level with the others. Put it back on the left needle.",
      {
        text: "For a purl column, turn the work round and rebuild it as a knit column from the other side.",
        note: "A purl is a knit from behind. Trying to hook a purl from the front is fiddly and gives an uneven stitch.",
      },
    ]),
    pitfalls: [
      "Rebuilding the column twisted — the mounted loop's right leg should sit at the front. Check against its neighbours before moving on.",
      "A ladder through a pattern stitch: work out the sequence (knit, purl, knit) before you start climbing, or you rebuild it in stockinette.",
    ],
    diagram: { source: "learn", id: "k-dropped-stitch" },
    sources: ["https://sarahmaker.com/how-to-fix-a-dropped-stitch/"],
  },

  /* ── stage 3: shaping ────────────────────────────────────────────────── */

  {
    id: "k2tog",
    craft: "knitting",
    kind: "stitch",
    name: "Knit two together",
    abbreviation: "k2tog",
    aka: ["right-leaning decrease", "k2 tog"],
    summary: "Two stitches knitted as one. The plainest decrease there is, and it leans right.",
    appearance: "Two stitch columns merging into one, with the top stitch tilting toward the right.",
    useFor: "Armholes, sleeve caps, hat crowns, the right-hand edge of a shaped piece, and every lace pattern.",
    difficulty: "beginner",
    tags: ["decrease", "shaping", "lace"],
    prerequisites: ["knit"],
    related: ["k-ssk", "k-cdd", "increase", "lace", "yarn-over"],
    chartSymbol: "k2tog",
    steps: steps([
      "Put the right needle through the front of the next TWO stitches at once, as if to knit.",
      "Wrap the yarn and pull one new loop through both.",
      {
        text: "Slide both old stitches off together. Two stitches have become one.",
        note: "The second stitch ends up lying on top, which is why the pair leans to the right.",
      },
    ]),
    pitfalls: [
      "Using k2tog at both edges of a piece. It will look right on one side and wrong on the other — pair it with ssk so the two edges mirror.",
      "Working k2tog on a wrong-side row expecting the same lean. Seen from the right side a p2tog leans right too; ssp is its left-leaning partner.",
    ],
    diagram: { source: "stitch", id: "k2tog" },
    sources: ["https://sarahmaker.com/k2tog/", CYC_ABBREV],
  },

  {
    id: "k-ssk",
    craft: "knitting",
    kind: "stitch",
    name: "Slip, slip, knit",
    abbreviation: "ssk",
    aka: ["left-leaning decrease", "sl sl k"],
    summary: "The mirror image of k2tog: two stitches become one, leaning left.",
    appearance: "Two columns merging with the top stitch tilting toward the left.",
    useFor: "The left-hand edge of any shaped piece, so the decreases on both sides point inward and match.",
    difficulty: "beginner",
    tags: ["decrease", "shaping", "lace"],
    prerequisites: ["k2tog"],
    related: ["k2tog", "k-cdd", "lace", "increase"],
    chartSymbol: "ssk",
    steps: steps([
      {
        text: "Slip one stitch knitwise onto the right needle. Slip the next one knitwise too — one at a time, not both together.",
        note: "Slipping knitwise turns each stitch around on the needle. That re-mounting is the whole trick: without it the decrease is just a twisted k2tog.",
      },
      "Put the left needle through the fronts of both slipped stitches, from left to right.",
      {
        text: "Knit them together from this position — because they were re-seated, you are working through what is now the front.",
        note: "Written as 'knit them together through the back loops' in many patterns; with the stitches re-mounted, the two descriptions are the same physical move.",
      },
    ]),
    pitfalls: [
      "Slipping the two stitches purlwise. You get a decrease that leans right and looks lumpy — the classic 'my ssk looks messy' complaint.",
      "Slipping both at once. That is the start of a central double decrease, not an ssk.",
      "A loose ssk next to a tight k2tog: give the first slipped stitch a gentle tug after knitting the pair.",
    ],
    diagram: { source: "learn", id: "k-ssk" },
    sources: ["https://sarahmaker.com/ssk-knitting/", CYC_ABBREV],
  },

  {
    id: "k-cdd",
    craft: "knitting",
    kind: "stitch",
    name: "Central double decrease",
    abbreviation: "cdd",
    aka: ["sl2-k1-p2sso", "s2kp", "double decrease"],
    summary: "Three stitches become one, with the middle one sitting on top and standing straight up.",
    appearance: "A vertical column with two arms sweeping in from either side — a little arrowhead.",
    useFor:
      "The spine of a chevron, the point of a leaf motif, a mitred corner, the centre of a top-down shawl. Anywhere a decrease must not lean.",
    difficulty: "confident",
    tags: ["decrease", "shaping", "lace"],
    prerequisites: ["k-ssk"],
    related: ["k2tog", "k-ssk", "lace"],
    chartSymbol: "cdd",
    steps: steps([
      {
        text: "Slip the next TWO stitches together, as if to knit two together, onto the right needle.",
        note: "Together, in one motion. Slipping them one at a time swaps their order and the centre stitch ends up underneath.",
      },
      "Knit the next stitch.",
      "Pass both slipped stitches over the knitted one and off the needle. Three stitches have become one.",
    ]),
    pitfalls: [
      "Slipping the two stitches separately — the result is a decrease that leans, which defeats the point.",
      "Confusing cdd with sk2p (slip 1, k2tog, pass slipped stitch over). Sk2p leans left; cdd stands upright. They are not interchangeable in a symmetric motif.",
    ],
    diagram: { source: "learn", id: "k-cdd" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/k2tog/"],
  },

  {
    id: "increase",
    craft: "knitting",
    kind: "stitch",
    name: "Make one (M1L and M1R)",
    abbreviation: "m1",
    aka: ["make one left", "make one right", "invisible increase"],
    summary: "A new stitch lifted out of the bar between two stitches — almost invisible, and it comes in a left and a right.",
    appearance: "The fabric widens with no hole and no bar. Paired increases look like two lines running out from a centre.",
    useFor: "Sleeve increases, raglan lines, shawl shaping, mitten gussets — anywhere the widening should not be seen.",
    difficulty: "beginner",
    tags: ["increase", "shaping"],
    prerequisites: ["knit"],
    related: ["k-kfb", "k2tog", "k-ssk", "short-rows"],
    chartSymbol: "m1l",
    steps: steps([
      {
        text: "M1L: pick up the bar between the stitches from FRONT to back with the left needle, then knit it through the BACK loop.",
        note: "The through-the-back-loop knit is what closes the hole. Knitting the lifted bar through the front leaves an eyelet — which is a different technique with a different name.",
      },
      {
        text: "M1R: pick up the bar from BACK to front, then knit it through the FRONT loop.",
        note: "Mirror of the above in both halves. Getting one half right and the other wrong is why an increase line sometimes looks lopsided.",
      },
      {
        text: "Use M1R at the start of a right-side row and M1L at the end, so the new stitches lean away from the edges.",
        note: "That is the convention for sleeve seams. Reverse it for a shawl worked out from the centre, where you want them leaning outwards.",
      },
    ]),
    pitfalls: [
      "Both increases worked the same way — the two shaping lines will not match, and it shows badly on a set-in sleeve.",
      "A tight bar that is hard to knit: the increase is meant to steal yarn from the neighbouring stitches, so loosen the row below rather than forcing the needle.",
      "A visible hole means you knitted the lifted bar through the wrong leg.",
    ],
    diagram: { source: "stitch", id: "increase" },
    sources: ["https://sarahmaker.com/m1l-m1r/", CYC_ABBREV],
  },

  {
    id: "k-kfb",
    craft: "knitting",
    kind: "stitch",
    name: "Knit front and back",
    abbreviation: "kfb",
    aka: ["bar increase", "knit into front and back"],
    summary: "One stitch knitted twice — through the front, then through the back — making two.",
    appearance: "Two stitches where there was one, with a small purl-like bar at the base of the second.",
    useFor:
      "Fast increases where the bar does not matter or is wanted as a design line: garter-stitch shawls, toys, the edges of a triangle.",
    difficulty: "beginner",
    tags: ["increase", "shaping"],
    prerequisites: ["knit"],
    related: ["increase", "k2tog"],
    chartSymbol: "kfb",
    steps: steps([
      "Knit the stitch as usual, but do NOT slide it off the left needle.",
      {
        text: "Bring the right needle round and knit into the BACK leg of that same stitch.",
        note: "You are working the one stitch twice from two directions. That is where the second stitch comes from.",
      },
      "Now let the old stitch drop. One stitch has become two.",
    ]),
    pitfalls: [
      "Using kfb where the pattern shows a smooth shaping line — the bar is visible and lines up in a dotted row. Use M1 there instead.",
      "kfb consumes the stitch you work it into, so 'kfb in the last stitch' leaves nothing to knit after it. Patterns usually say 'kfb, k1' at an edge for that reason.",
    ],
    diagram: { source: "learn", id: "k-kfb" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/m1l-m1r/"],
  },

  {
    id: "slipped-stitch",
    craft: "knitting",
    kind: "technique",
    name: "Slipping a stitch",
    abbreviation: "sl",
    aka: ["slip stitch", "sl1", "wyif", "wyib"],
    summary: "Moving a stitch across without working it, so it stretches up over the row above.",
    appearance: "An elongated stitch spanning two rows, or a tidy chain running up a selvedge.",
    useFor: "Neat edges, reinforced sock heels, mosaic colourwork, and the mechanics of brioche and many decreases.",
    difficulty: "beginner",
    tags: ["texture", "edge", "colourwork"],
    prerequisites: ["knit"],
    related: ["k-mosaic", "brioche", "k-ssk", "k2tog"],
    chartSymbol: "sl1",
    steps: steps([
      {
        text: "Move the next stitch from the left needle to the right without knitting or purling it.",
        note: "Unless a pattern says otherwise, slip PURLWISE — needle in from the right, as if to purl. That keeps the stitch facing the way it was. Slipping knitwise turns it around, which is only wanted inside a decrease.",
      },
      {
        text: "Decide where the yarn goes: with yarn in back (wyib) the slipped stitch reads as a knit column; with yarn in front (wyif) the float shows on the public side.",
        note: "The yarn's position is not a detail — it is the whole difference between an invisible slip and a decorative float.",
      },
      {
        text: "For a chain-edge selvedge, slip the first stitch of every row purlwise with the yarn in front, then take the yarn back and work the row.",
        note: "That gives one edge chain for every two rows, which is the tidy edge used on scarves and for picking up stitches at a neat 2:1 ratio.",
      },
    ]),
    pitfalls: [
      "Slipping knitwise by default. It twists the stitch, and the twist shows up two rows later as a tight, leaning column.",
      "A slipped-stitch edge on a piece that will be seamed: the chain edge is lovely on show but harder to mattress-seam than a plain knit selvedge.",
      "Pulling the float too tight in mosaic work, which puckers the row below.",
    ],
    fabric: { reversible: false, curls: true, stretch: "low" },
    diagram: { source: "stitch", id: "slipped-stitch" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/slip-stitch-knitting/"],
  },

  {
    id: "k-ktbl",
    craft: "knitting",
    kind: "stitch",
    name: "Knit through the back loop",
    abbreviation: "ktbl",
    aka: ["twisted stitch", "k tbl", "k1b"],
    summary: "Entering the far leg of the stitch instead of the near one, which twists its base.",
    appearance: "A tight, crisply defined column that reads like a little rope.",
    useFor:
      "Twisted rib, which is firmer and more defined than plain rib; Bavarian travelling stitches; closing an accidental yarn over invisibly.",
    difficulty: "confident",
    tags: ["texture", "twisted", "edge"],
    prerequisites: ["knit"],
    related: ["ribbing", "knit", "increase"],
    chartSymbol: "ktbl",
    steps: steps([
      "Bring the right needle to the back of the work and into the stitch through its BACK leg, from right to left.",
      "Wrap and knit as usual.",
      {
        text: "The stitch's base crosses over itself — that is the twist, and it is intentional.",
        note: "The same move done by accident, because a stitch was mounted backwards on the needle, is the commonest cause of 'one column looks tighter than the rest'.",
      },
    ]),
    pitfalls: [
      "Twisted stitches use slightly less width and are less stretchy, so twisted rib pulls in harder than plain rib. Account for it at a cuff.",
      "A whole row of accidental twists usually means the stitches were mounted the wrong way round — most often after ripping back and re-needling. Check the leading leg sits at the front.",
    ],
    diagram: { source: "learn", id: "k-ktbl" },
    sources: [CYC_ABBREV, "https://www.craftyarncouncil.com/standards/knit-chart-symbols"],
  },

  /* ── stage 4: pattern fabrics ───────────────────────────────────────── */

  {
    id: "yarn-over",
    craft: "knitting",
    kind: "stitch",
    name: "Yarn over",
    abbreviation: "yo",
    aka: ["yarn forward", "yfwd", "yon", "eyelet"],
    summary: "A deliberate extra loop over the needle: it adds a stitch and leaves a hole.",
    appearance: "A small round eyelet. In lace they gather into leaves, diamonds and horseshoes.",
    useFor: "All lace, eyelet rows for drawstrings, simple buttonholes, and decorative increases.",
    difficulty: "confident",
    tags: ["increase", "lace", "eyelet"],
    prerequisites: ["knit"],
    related: ["lace", "k2tog", "k-ssk", "brioche"],
    chartSymbol: "yo",
    steps: steps([
      {
        text: "Between two knit stitches: bring the yarn forward between the needles, then over the top of the right needle to the back, and knit the next stitch.",
        note: "The loop must go OVER the needle. Wrapping under it gives a stitch mounted backwards, which closes up when you work it on the way back.",
      },
      "Between a knit and a purl, or a purl and a knit, the yarn takes a different route — but the rule is the same: one full wrap over the right needle.",
      {
        text: "Pair every yarn over with a decrease somewhere in the row unless the piece is meant to widen.",
        note: "This is what keeps lace stitch counts constant: one yo adds a stitch, one k2tog or ssk takes it away.",
      },
    ]),
    pitfalls: [
      "A yarn over that disappears on the next row: it was wrapped the wrong way and got worked closed. The hole should be there before you work the row back.",
      "A hole appearing where you wanted an invisible increase. Yarn overs are for holes; use M1 when you do not want one.",
    ],
    terminology: {
      us: "yarn over (yo)",
      uk: "yarn forward (yfwd), yarn round needle (yrn), yarn over needle (yon)",
      consequence:
        "UK patterns name the yarn's route rather than the result: yfwd between knits, yrn between purls, yon from purl to knit. They all make the same eyelet — a US pattern just writes 'yo' for every one of them.",
    },
    fabric: { reversible: false, stretch: "high" },
    diagram: { source: "stitch", id: "yarn-over" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/yarn-over/"],
  },

  {
    id: "k-lifeline",
    craft: "knitting",
    kind: "technique",
    name: "Lifelines",
    abbreviation: "lifeline",
    aka: ["safety line"],
    summary: "A thread run through a whole row of live stitches so you can rip back to a row you know was right.",
    appearance: "A contrast thread lying through one row of the fabric, well below the needles.",
    useFor: "Lace, cables, colourwork — anything where ripping back blind would lose an evening.",
    difficulty: "confident",
    tags: ["fixing", "rescue", "lace"],
    prerequisites: ["purl"],
    related: ["lace", "k-dropped-stitch", "cable"],
    steps: steps([
      {
        text: "Finish a row you have just counted and know is correct — ideally the last row of a pattern repeat.",
        note: "A lifeline is only worth what the row under it is worth. Putting one in on a row you have not checked just preserves the mistake.",
      },
      "Thread smooth, thin waste yarn (not fluffy, not the project yarn) on a tapestry needle.",
      {
        text: "Pass it through every live stitch on the needle, going the same way through each — and do NOT catch the stitch markers.",
        note: "An interchangeable circular with a threading hole in the cable can do this as you knit the row, which is faster and misses nothing.",
      },
      "Leave the thread in and keep knitting. Add a fresh one every 10 to 20 rows.",
      {
        text: "To rip back: pull the needles out, tear down to the lifeline, then put the needle back through the held stitches.",
        note: "Put the needle in from the same side each time so every stitch is mounted the same way, or the next row will be full of accidental twists.",
      },
    ]),
    pitfalls: [
      "Running the lifeline through a yarn over and missing it — check the stitch count on the thread matches the row.",
      "Using fuzzy waste yarn, which grips the project yarn and is worse to pull out than the mistake was.",
    ],
    diagram: { source: "learn", id: "k-lifeline" },
    sources: ["https://sarahmaker.com/knitting-lifeline/"],
  },

  {
    id: "lace",
    craft: "knitting",
    kind: "concept",
    name: "Lace knitting",
    abbreviation: "lace",
    aka: ["openwork", "shawl knitting"],
    summary: "Yarn overs paired with decreases, arranged into motifs. The holes are the point.",
    appearance: "Open fabric with deliberate eyelets in leaf, diamond, feather or horseshoe arrangements.",
    useFor: "Shawls, stoles, summer tops, yoke panels and hem borders.",
    difficulty: "adventurous",
    tags: ["lace", "chart", "eyelet", "openwork"],
    prerequisites: ["yarn-over", "k2tog", "k-ssk", "k-lifeline"],
    related: ["blocking", "reading-flat-charts", "k-cdd", "yarn-over"],
    steps: steps([
      {
        text: "Read the chart for the right-side row and work it: each yarn over is matched by a decrease so the count comes back to where it started.",
        note: "'Knitted lace' has patterning on every row; 'lace knitting' rests on the wrong side. The second is far easier to learn on, because half the rows are just purl.",
      },
      "Purl the wrong-side rows plain unless the chart says otherwise, working each yarn over as an ordinary stitch.",
      {
        text: "Count at the end of every right-side row against the number in parentheses.",
        note: "Lace drifts one stitch at a time. A count that is right at the end of every repeat means you never rip back more than one repeat.",
      },
      {
        text: "Put a lifeline in at the end of each full repeat.",
        note: "Lace is the one fabric where ripping back without a lifeline is genuinely hard: the yarn overs give you nothing to grab and the stitches escape.",
      },
      {
        text: "Block hard at the end. Unblocked lace looks like a crumpled dishcloth and that is normal.",
        note: "Lace is the fabric where blocking transforms rather than tidies — pin it out to the schematic and let it dry completely.",
      },
    ]),
    pitfalls: [
      "Trusting a stitch count taken mid-row. Count between repeats, using markers between them so a lost stitch is confined to one repeat.",
      "Lace weight is not the same as lace patterning. Any yarn can be knitted in lace, usually on needles two or three sizes bigger than usual.",
      "Ripping back through an unmarked lace row and losing the yarn overs. Lifeline first, always.",
    ],
    fabric: { multiple: "varies with the motif", reversible: false, curls: false, stretch: "high" },
    diagram: { source: "stitch", id: "lace" },
    sources: ["https://sarahmaker.com/k2tog/", "https://www.craftyarncouncil.com/standards/knit-chart-symbols"],
  },

  {
    id: "cable",
    craft: "knitting",
    kind: "stitch",
    name: "Cables",
    abbreviation: "C4F",
    aka: ["cable stitch", "C4B", "cable cross", "aran"],
    summary: "Stitches held aside on a spare needle and worked out of order, so one group crosses over another.",
    appearance: "Rope-like columns standing proud of a reverse-stockinette ground.",
    useFor: "Aran sweaters, cardigans, hats, cushions, scarves — anything that wants sculpture rather than colour.",
    difficulty: "confident",
    tags: ["texture", "cable", "chart"],
    prerequisites: ["stockinette", "purl"],
    related: ["reading-flat-charts", "gauge-swatch", "k-lifeline", "blocking"],
    steps: steps([
      {
        text: "Slip the first half of the cable stitches onto a cable needle.",
        note: "In C4F the 4 is the TOTAL number of stitches in the cross, so a C4F holds two and knits two.",
      },
      {
        text: "Hold the cable needle at the FRONT of the work for a left-leaning cross (C4F), or at the BACK for a right-leaning one (C4B).",
        note: "Front means the held stitches end up on top and travelling left. That is the whole rule, and it is worth saying out loud each time.",
      },
      "Knit the next stitches from the left needle.",
      "Knit the stitches off the cable needle. The cross is made.",
      {
        text: "Work the rows between crosses in plain knit over the cable and purl either side of it.",
        note: "Crossing every 4th to 8th row is typical; the more rows between crosses, the more relaxed the rope.",
      },
    ]),
    pitfalls: [
      "Cables pull in hard — a cabled panel can be 20% narrower than the same stitch count in stockinette. Swatch the cable, not plain fabric, or the sweater comes out small.",
      "Crossing in the wrong direction. It is invisible for two rows and obvious for the rest of the garment. Mark front/back crosses in different colours on the chart.",
      "A gap beside the cable: tighten the first stitch worked after the cross.",
    ],
    fabric: { multiple: "varies with the cable", rowRepeat: 6, reversible: false, curls: true, stretch: "low" },
    diagram: { source: "stitch", id: "cable" },
    sources: ["https://nimble-needles.com/stitches/how-to-knit-the-cable-stitch/"],
  },

  {
    id: "brioche",
    craft: "knitting",
    kind: "stitch",
    name: "Brioche",
    abbreviation: "brk",
    aka: ["brioche knit", "brp", "fisherman's rib", "syncopated brioche"],
    summary: "Every stitch is worked together with a yarn over draped over it, giving a double-thick squashy rib.",
    appearance: "Fat, lofty columns with deep valleys. Twice as thick as ordinary rib and enormously stretchy.",
    useFor: "Scarves, cowls, hats and whole sweaters where warmth and squish are the point. Two-colour brioche is reversible with the colours swapped.",
    difficulty: "adventurous",
    tags: ["texture", "rib", "stretch", "colourwork"],
    prerequisites: ["ribbing", "slipped-stitch", "yarn-over"],
    related: ["ribbing", "slipped-stitch", "k-lifeline"],
    steps: steps([
      {
        text: "Set-up row: *yarn over, slip 1 purlwise with the yarn in front, knit 1* — every other stitch ends the row wearing a yarn over.",
        note: "That yarn over is not an increase. It belongs to the stitch it sits on and will be worked together with it, so the count does not change.",
      },
      {
        text: "brk (brioche knit): knit the slipped stitch together with its yarn over, as one stitch.",
        note: "Sometimes written 'bark'. If the fabric is gaining stitches, you are knitting the yarn over separately.",
      },
      "brp (brioche purl): purl the slipped stitch together with its yarn over.",
      {
        text: "Each column is only worked every other row, which is where the loft comes from.",
        note: "It also means brioche uses noticeably more yarn and more rows per centimetre than the same rib. Swatch and weigh before committing a sweater's worth.",
      },
    ]),
    pitfalls: [
      "Ripping back brioche without a lifeline. The yarn-over pairs make it very hard to re-mount by eye — put lifelines in every few rows.",
      "Treating fisherman's rib as identical. It makes a similar fabric by knitting into the row below instead of using yarn overs; the two cannot be swapped mid-piece.",
      "Binding off brioche tightly. The fabric is very stretchy and a normal bind off will strangle the edge.",
    ],
    fabric: { multiple: "multiple of 2", rowRepeat: 2, reversible: true, curls: false, stretch: "high" },
    diagram: { source: "stitch", id: "brioche" },
    sources: ["https://nimble-needles.com/stitches/how-to-knit-the-brioche-stitch/"],
  },

  {
    id: "short-rows",
    craft: "knitting",
    kind: "technique",
    name: "Short rows",
    abbreviation: "w&t",
    aka: ["wrap and turn", "German short rows", "double stitch", "DS"],
    summary: "Turning back before the end of a row to build extra rows into one part of the fabric only.",
    appearance: "A wedge of extra fabric — a raised shoulder, a curved heel, a hem that dips at the back.",
    useFor: "Shoulder slopes, sock heels, bust darts, curved hems, and raising the back neck on a yoked sweater.",
    difficulty: "confident",
    tags: ["shaping", "garment", "sock"],
    prerequisites: ["stockinette"],
    related: ["increase", "k2tog", "gauge-swatch"],
    steps: steps([
      {
        text: "German method: work to the turning point, turn the work, and slip the first stitch purlwise with the yarn in front.",
        note: "German short rows are the easiest to learn and the tidiest to close, which is why they have largely displaced wrap and turn in new patterns.",
      },
      {
        text: "Pull the yarn firmly up and over the needle so the stitch below is dragged up and shows as two legs. That is the 'double stitch'.",
        note: "Firmly. A slack pull leaves a loose loop rather than a proper double stitch, and the gap will show.",
      },
      "Work back across the row as normal.",
      {
        text: "On the next full row, work each double stitch as a single stitch — both legs together.",
        note: "Working the two legs separately adds a stitch and leaves a hole. This is the step that goes wrong.",
      },
      {
        text: "Wrap and turn is the older method: slip the next stitch, move the yarn to the other side, return the stitch, turn. Later, pick the wrap up and work it together with its stitch.",
        note: "Both solve the same problem — the gap left where you turned — by borrowing a strand from the row below to cover it.",
      },
    ]),
    pitfalls: [
      "Forgetting to close the double stitches on the return, which leaves a line of holes across the shoulder.",
      "Short rows in garter stitch need the same closing but read differently; count ridges, not rows.",
      "Stacking short-row turns in the same place, which makes a visible ladder. Stagger them where the pattern allows.",
    ],
    diagram: { source: "stitch", id: "short-rows" },
    sources: ["https://sarahmaker.com/short-rows-knitting/"],
  },

  {
    id: "stranded-colourwork",
    craft: "knitting",
    kind: "technique",
    name: "Stranded colourwork",
    abbreviation: "MC/CC",
    aka: ["fair isle", "stranded knitting", "floats", "two-colour knitting"],
    summary: "Two colours in one round, with the unused colour carried loosely across the back as a float.",
    appearance: "Crisp geometric motifs on the front; a neat ladder of horizontal floats on the back.",
    useFor: "Yoke sweaters, hat bands, mittens, socks — anywhere a repeating two-colour pattern is wanted.",
    difficulty: "adventurous",
    tags: ["colourwork", "chart", "in-the-round"],
    prerequisites: ["stockinette"],
    related: ["k-intarsia", "reading-flat-charts", "gauge-swatch", "k-mosaic"],
    steps: steps([
      {
        text: "Work in the round wherever you can, so every round is a right-side round and you are always knitting.",
        note: "This is why traditional colourwork garments are knitted as tubes and cut open afterwards. Purling stranded colourwork is much harder to keep even.",
      },
      {
        text: "Hold one colour in each hand, or both in one — but always keep the same colour in the same position.",
        note: "Whichever colour runs UNDER the other shows slightly more prominently. Swapping halfway through makes the motif change weight, which is the 'my yoke looks patchy' problem.",
      },
      {
        text: "Before you pull each float across, spread the stitches out along the right needle so the float has to cover the stretched width.",
        note: "This single habit fixes almost all puckering. The float must be as long as the fabric is wide when stretched, not when bunched.",
      },
      {
        text: "Catch any float longer than about 5 stitches by trapping the carried yarn once in the middle.",
        note: "Uncaught long floats snag on fingers and rings. Catching also stops the motif sagging.",
      },
      "Steam or wet block at the end — colourwork evens out dramatically when blocked.",
    ]),
    pitfalls: [
      "Puckered fabric: floats too tight. It cannot be blocked out, so check after every few rounds by stretching the work on the needle.",
      "Stranded fabric is less elastic and slightly wider per stitch than plain stockinette. Swatch in the round, in pattern.",
      "Carrying three colours in one round. Two per round is the rule; a third colour means a different round or intarsia.",
    ],
    fabric: { reversible: false, curls: true, stretch: "low" },
    diagram: { source: "stitch", id: "stranded-colourwork" },
    sources: ["https://nimble-needles.com/tutorials/fair-isle-knitting-tutorial-for-beginners/"],
  },

  {
    id: "k-intarsia",
    craft: "knitting",
    kind: "technique",
    name: "Intarsia",
    abbreviation: "intarsia",
    aka: ["picture knitting", "colour blocks", "bobbins"],
    summary: "A separate small ball for each block of colour, twisted around its neighbour at every change.",
    appearance: "Blocks of solid colour with no floats behind — a single layer of fabric, like a picture.",
    useFor: "Argyle, motifs, large blocks, letters, anything where a colour appears once rather than repeating.",
    difficulty: "adventurous",
    tags: ["colourwork", "chart", "flat"],
    prerequisites: ["stockinette"],
    related: ["stranded-colourwork", "reading-flat-charts", "k-weaving-in-ends"],
    steps: steps([
      {
        text: "Wind a small bobbin for every block of colour in the row, including two bobbins if one colour appears twice.",
        note: "Nothing is carried across the back, so each block needs its own yarn waiting at its own position.",
      },
      "Work to the colour change and drop the old yarn.",
      {
        text: "Pick the new colour up from UNDERNEATH the old one, so the two twist around each other.",
        note: "That twist is the only thing joining the two blocks. Miss it and you have knitted two separate pieces of fabric with a slit between them.",
      },
      {
        text: "Work intarsia flat, not in the round.",
        note: "In the round the yarn ends up at the far side of the block when you come back to it. Flat knitting leaves it exactly where it was left.",
      },
      "Expect a lot of ends. Weave each one into its own colour so it does not shadow through.",
    ]),
    pitfalls: [
      "A hole at every colour change means the twist was missed. It is far easier to fix on the next row than after blocking.",
      "Twisting too tightly, which puckers the join line.",
      "Trying to combine intarsia with a stranded round. They solve different problems; pick one per round.",
    ],
    diagram: { source: "learn", id: "k-intarsia" },
    sources: ["https://nimble-needles.com/tutorials/fair-isle-knitting-tutorial-for-beginners/"],
  },

  {
    id: "k-mosaic",
    craft: "knitting",
    kind: "technique",
    name: "Mosaic knitting",
    abbreviation: "mosaic",
    aka: ["slip-stitch colourwork", "two-row colourwork"],
    summary: "Colourwork with only one yarn in use at a time: slipped stitches carry the other colour up.",
    appearance: "Crisp two-colour geometric motifs, slightly textured, with no floats to speak of.",
    useFor:
      "Blankets, hats and cushions when you want colourwork without juggling two strands — and the easiest way into colour for a new knitter.",
    difficulty: "confident",
    tags: ["colourwork", "texture", "chart"],
    prerequisites: ["slipped-stitch"],
    related: ["slipped-stitch", "stranded-colourwork", "reading-flat-charts"],
    steps: steps([
      "Join colour A and work two rows with it, slipping every stitch that belongs to colour B.",
      {
        text: "Then work two rows with colour B, slipping every stitch that belongs to colour A.",
        note: "Only one yarn is ever active. That is why mosaic is so much easier than stranded work and why the other colour never needs carrying.",
      },
      {
        text: "Always slip purlwise, with the yarn on the wrong side of the work.",
        note: "Yarn on the right side would show as a float across the front, which mosaic is designed to avoid.",
      },
      {
        text: "A slipped stitch stretches over two rows, so mosaic fabric is denser and shorter than plain stockinette.",
        note: "Two rows of a mosaic chart are one chart row. That is why mosaic charts are read one line per pair of rows.",
      },
    ]),
    pitfalls: [
      "Slipping a stitch that should have been worked, which shifts the whole motif one column across.",
      "Pulling the yarn tight across a run of slipped stitches — the row below puckers. Let the slipped stitches stay long.",
    ],
    fabric: { multiple: "varies with the motif", rowRepeat: 4, reversible: false, curls: true, stretch: "low" },
    diagram: { source: "learn", id: "k-mosaic" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/slip-stitch-knitting/"],
  },

  {
    id: "icord",
    craft: "knitting",
    kind: "technique",
    name: "I-cord",
    abbreviation: "i-cord",
    aka: ["idiot cord", "applied i-cord", "french knitting"],
    summary: "A tiny stockinette tube made by never turning the work and always pulling the yarn across the back.",
    appearance: "A smooth round cord, like a knitted shoelace.",
    useFor: "Drawstrings, bag handles, button loops, ties, and as an applied edging on a cardigan front.",
    difficulty: "confident",
    tags: ["edge", "finishing", "cord"],
    prerequisites: ["knit"],
    related: ["knit", "picking-up-stitches", "k-buttonhole"],
    steps: steps([
      "Cast 3 to 5 stitches onto a double-pointed needle.",
      "Knit across them.",
      {
        text: "WITHOUT turning, slide the stitches back to the other end of the same needle.",
        note: "Not turning is the whole technique. You are always knitting the right side, so the fabric has no wrong side to show.",
      },
      {
        text: "Pull the working yarn firmly across the back and knit across again.",
        note: "That pull is what closes the tube. The first two or three rows look like a ladder and then it suddenly becomes a cord — keep going.",
      },
      "Repeat to length, then cut the yarn, thread it through the stitches and pull tight.",
    ]),
    pitfalls: [
      "More than five stitches and the tube stops closing — it becomes a flat strip with a gap up the back.",
      "Pulling so tight the cord kinks. Firm, then let it relax.",
    ],
    diagram: { source: "stitch", id: "icord" },
    sources: ["https://sarahmaker.com/knit-stitch/"],
  },

  /* ── stage 5: finishing and joining ─────────────────────────────────── */

  {
    id: "mattress-seam",
    craft: "knitting",
    kind: "technique",
    name: "Mattress stitch seam",
    abbreviation: "seam",
    aka: ["mattress stitch", "invisible seam", "ladder stitch"],
    summary: "Sewing two pieces edge to edge from the right side, following the bars between stitches.",
    appearance: "An invisible vertical join — the two pieces read as one continuous fabric.",
    useFor: "Side seams, sleeve seams, joining a sleeve to a body on a set-in construction.",
    difficulty: "confident",
    tags: ["seaming", "finishing", "garment"],
    prerequisites: ["stockinette"],
    related: ["k-weaving-in-ends", "blocking", "k-three-needle-bind-off", "seaming-crochet"],
    steps: steps([
      {
        text: "Block both pieces and lay them side by side, right sides up, edges touching.",
        note: "Seaming from the right side is the point: you can see the join forming and correct it before it is a hundred stitches long.",
      },
      "Find the horizontal bar between the first and second stitch columns, one column in from the edge, on each piece.",
      {
        text: "Take the needle under one bar on the left piece, then under the matching bar on the right piece. Alternate.",
        note: "One bar at a time on each side keeps the two edges in register. Two bars at a time is faster and pulls the seam shorter than the fabric.",
      },
      {
        text: "Every few centimetres, pull the sewing yarn to close the seam, then check the pieces still line up.",
        note: "Pull until the seam closes and the stitches meet — no further. Over-tightened seams are stiff and puckered and show on the outside.",
      },
      {
        text: "Use the same yarn as the garment where you can, or a smooth plain yarn in the same colour.",
        note: "Seaming in a fluffy or novelty yarn makes it impossible to undo, and every seam has to be undone at least once.",
      },
    ]),
    pitfalls: [
      "Working one bar on one side and two on the other, which makes the seam spiral.",
      "Seaming before blocking, so the pieces are different lengths.",
      "Seaming garter to stockinette with the same rhythm — garter has a different row height and needs a different pick-up ratio.",
    ],
    diagram: { source: "technique", id: "mattress-seam" },
    sources: ["https://sarahmaker.com/mattress-stitch/"],
  },

  {
    id: "picking-up-stitches",
    craft: "knitting",
    kind: "technique",
    name: "Picking up stitches",
    abbreviation: "PU",
    aka: ["pick up and knit", "PUK", "neckband"],
    summary: "Making new live stitches along a finished edge so a band, collar or sleeve can grow out of it.",
    appearance: "A row of new stitches sitting on a needle along an existing edge, with a neat ridge below them.",
    useFor: "Neckbands, button bands, armhole edgings, picking a sleeve up from an armhole.",
    difficulty: "confident",
    tags: ["edge", "finishing", "garment"],
    prerequisites: ["knit"],
    related: ["ribbing", "patch-pockets", "icord", "k-buttonhole"],
    steps: steps([
      {
        text: "Work from the right side, pushing the needle through a whole stitch — not just one strand — one column in from the edge.",
        note: "One column in gives you a clean ridge on the wrong side and something solid to pull the new stitch through. Right at the edge it stretches and gapes.",
      },
      "Wrap the working yarn and pull a loop through. That is one picked-up stitch.",
      {
        text: "Along a vertical edge (rows), pick up about 3 stitches for every 4 rows in stockinette.",
        note: "The 3:4 ratio exists because a stockinette row is shorter than a stitch is wide. Picking up one per row makes a flared, frilly band.",
      },
      "Along a horizontal edge (bound-off or cast-on stitches), pick up one stitch for each stitch.",
      {
        text: "Divide the edge in halves and quarters with markers first, then pick up the right number in each section.",
        note: "This is how a neckband comes out even. Counting 96 stitches round a neckline in one go almost never works.",
      },
    ]),
    pitfalls: [
      "Picking up too many stitches: the band flares. Too few: it pulls the edge in and the neckline will not go over a head.",
      "Picking up through only half a stitch, which leaves a row of visible holes.",
      "Picking up down one front and up the other without matching the counts — the two bands end up different lengths.",
    ],
    diagram: { source: "technique", id: "picking-up-stitches" },
    sources: ["https://sarahmaker.com/pick-up-stitches-knitting/"],
  },

  {
    id: "patch-pockets",
    craft: "knitting",
    kind: "technique",
    name: "Patch pockets",
    abbreviation: "pocket",
    aka: ["pockets", "applied pocket"],
    summary: "A square of fabric sewn onto the outside of a finished piece — the simplest pocket there is.",
    appearance: "A neat rectangle stitched on three sides with a ribbed or garter top edge.",
    useFor: "Cardigans, jackets, children's clothes. Anywhere you want a pocket without planning one in advance.",
    difficulty: "confident",
    tags: ["garment", "finishing", "seaming"],
    prerequisites: ["picking-up-stitches"],
    related: ["mattress-seam", "ribbing", "picking-up-stitches"],
    steps: steps([
      "Knit a rectangle the pocket size, finishing with a few centimetres of rib or garter so the opening does not curl.",
      {
        text: "Block it flat and square before you pin it on.",
        note: "An unblocked stockinette pocket curls at every edge and cannot be pinned straight. Block it and the job becomes easy.",
      },
      {
        text: "Pin it to the garment following one column of stitches up each side and one row across the bottom.",
        note: "Following a stitch column rather than eyeballing it is the only way the pocket ends up genuinely straight.",
      },
      "Sew down the sides and along the bottom from the right side, one stitch into each edge stitch, leaving the top open.",
      {
        text: "Reinforce the two top corners with a few extra stitches.",
        note: "That is where every pocket eventually tears, because that is where the hand pulls.",
      },
    ]),
    pitfalls: [
      "Sewing the pocket on with the row lines out of true, which is visible from across a room.",
      "A pocket without a non-curling top edge — it rolls forward permanently.",
    ],
    diagram: { source: "technique", id: "patch-pockets" },
    sources: ["https://sarahmaker.com/knitting-pockets/"],
  },

  {
    id: "k-three-needle-bind-off",
    craft: "knitting",
    kind: "technique",
    name: "Three-needle bind off",
    abbreviation: "3NBO",
    aka: ["three needle cast off"],
    summary: "Joining two sets of live stitches and binding them off in one pass, with a third needle.",
    appearance: "A firm chain-like ridge — inside the garment if worked with right sides together, decorative if not.",
    useFor: "Shoulder seams, the top of a bag, the toe of a mitten. Anywhere a firm, non-stretchy join is wanted.",
    difficulty: "confident",
    tags: ["seaming", "finishing", "edge"],
    prerequisites: ["bind-off"],
    related: ["k-kitchener", "mattress-seam", "bind-off"],
    steps: steps([
      {
        text: "Hold the two needles parallel with the RIGHT sides of the fabric facing each other, so the seam ends up inside.",
        note: "Held wrong sides together instead, the ridge sits on the outside — a deliberate design choice on some yokes, so decide before you start.",
      },
      "Put a third needle through the first stitch on the front needle and the first on the back needle, and knit them together as one.",
      "Do the same with the next pair, so two stitches sit on the right needle.",
      "Pass the first over the second, exactly as in a normal bind off. Repeat to the end.",
      {
        text: "A shoulder seam wants this firmness — it is the seam that carries the weight of the garment.",
        note: "Which is also why you should NOT use it anywhere that has to stretch, like a sock toe you intend to walk on.",
      },
    ]),
    pitfalls: [
      "Both shoulders bound off from different ends, so the two seams slope differently. Work them the same direction.",
      "Pulling the join tight. It is already the least stretchy seam available.",
    ],
    diagram: { source: "learn", id: "k-three-needle-bind-off" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/bind-off-knitting/"],
  },

  {
    id: "k-kitchener",
    craft: "knitting",
    kind: "technique",
    name: "Kitchener stitch",
    abbreviation: "graft",
    aka: ["grafting", "weaving", "sock toe"],
    summary: "Sewing two sets of live stitches together so the join becomes one more row of knitting — genuinely invisible.",
    appearance: "No seam at all. The stitches run continuously from one piece into the other.",
    useFor: "Sock toes, the underarm of a seamless sweater, the top of a hood, any join that must not be felt.",
    difficulty: "advanced",
    tags: ["seaming", "finishing", "sock"],
    prerequisites: ["stockinette", "k-three-needle-bind-off"],
    related: ["k-three-needle-bind-off", "mattress-seam", "k-weaving-in-ends"],
    steps: steps([
      {
        text: "Hold the two needles parallel with wrong sides together, and thread a tapestry needle with a tail about four times the seam width.",
        note: "You are tracing the path a knitting needle would take. Everything below is that one idea written out.",
      },
      "Set-up: through the first front stitch PURLWISE, leave it on. Through the first back stitch KNITWISE, leave it on.",
      {
        text: "Then repeat four moves: front knitwise and OFF; front purlwise, leave on; back purlwise and OFF; back knitwise, leave on.",
        note: "Said aloud as 'knit off, purl on; purl off, knit on', it becomes a chant, and the chant is what stops you losing your place.",
      },
      {
        text: "Pull each stitch to match the tension of the knitting around it — not tighter.",
        note: "Adjust as you go, every few stitches. Trying to even out a whole graft at the end never works.",
      },
      {
        text: "If you lose your place, look at the last stitch you took OFF the needle: the next move is on the other needle.",
        note: "A lifeline through both sets of live stitches before you start means a lost graft costs nothing.",
      },
    ]),
    pitfalls: [
      "Forgetting the set-up row, which offsets the whole graft by half a stitch.",
      "Grafting rib or garter with the stockinette chant. Each fabric has its own sequence — this one is for stockinette only.",
      "An uneven graft that shows as a looser row. That is tension, not sequence; go back and work the slack along the row with the tapestry needle.",
    ],
    diagram: { source: "learn", id: "k-kitchener" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/kitchener-stitch/"],
  },

  {
    id: "k-provisional-cast-on",
    craft: "knitting",
    kind: "technique",
    name: "Provisional cast on",
    abbreviation: "prov CO",
    aka: ["crochet chain cast on", "invisible cast on"],
    summary: "Casting on over waste yarn so the first row can be unzipped later and knitted in the other direction.",
    appearance: "A row of stitches hanging from a crochet chain in a contrasting colour.",
    useFor: "Hems that are grafted, scarves knitted out from the middle, a cuff that must match at both ends, tubular edges.",
    difficulty: "adventurous",
    tags: ["edge", "foundation"],
    prerequisites: ["cast-on"],
    related: ["k-kitchener", "cast-on", "k-lifeline"],
    steps: steps([
      {
        text: "Crochet a chain in smooth waste yarn a few stitches longer than you need, in a colour you can see.",
        note: "Smooth and contrasting. A fluffy waste yarn will not unzip and a same-colour one is a nightmare to pick out.",
      },
      {
        text: "With the project yarn, knit up one stitch through the back bump of each chain.",
        note: "The BACK bump, not the front V. The bumps are what release cleanly when the chain is pulled out.",
      },
      "Work the piece as normal.",
      {
        text: "To reopen: undo the chain's last stitch and pull, catching each live loop on a needle as it appears.",
        note: "There will be one fewer live stitch than you cast on — that is normal, it is how the chain's geometry works. Pick up an extra from the gap if the count matters.",
      },
    ]),
    pitfalls: [
      "Knitting up through the front of the chain, which locks the chain into the fabric and will not unzip.",
      "Unzipping from the wrong end. Pull from the end where the chain was finished off, not where it started.",
    ],
    diagram: { source: "learn", id: "k-provisional-cast-on" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/provisional-cast-on/"],
  },

  {
    id: "k-buttonhole",
    craft: "knitting",
    kind: "technique",
    name: "One-row buttonhole",
    abbreviation: "buttonhole",
    aka: ["buttonholes", "horizontal buttonhole"],
    summary: "Binding off a few stitches and casting them straight back on in the same row, leaving a firm slot.",
    appearance: "A clean horizontal slot with no loose loops at either end.",
    useFor: "Cardigan button bands, cuffs, pockets with a flap.",
    difficulty: "confident",
    tags: ["edge", "finishing", "garment"],
    prerequisites: ["bind-off", "cast-on"],
    related: ["picking-up-stitches", "ribbing", "bind-off"],
    steps: steps([
      "Work to the buttonhole position and bind off the number of stitches the button needs — usually one less than the button's width in stitches.",
      {
        text: "Turn the work and cable-cast on that many stitches PLUS one, over the gap.",
        note: "The extra stitch is the trick. Without it the far corner of the buttonhole is loose and stretches into a gaping hole after a month of wear.",
      },
      "Turn back, and knit the extra cast-on stitch together with the next stitch on the left needle to close the corner.",
      {
        text: "Space buttonholes by dividing the band's length, and put one at the point of most strain — usually the bust.",
        note: "Place the buttonholes first and the buttons second: it is far easier to move a button than a buttonhole.",
      },
      {
        text: "A buttonhole relaxes after blocking, so make it slightly smaller than the button.",
        note: "Test on the swatch with the actual button before committing to eight of them.",
      },
    ]),
    pitfalls: [
      "Buttonholes on the wrong band. By convention women's garments button right over left, men's left over right — decide before you knit either band.",
      "A buttonhole worked at the very edge of the band, which tears out.",
      "Counting rows between buttonholes instead of measuring. Row gauge varies enough across a long band to make the spacing visibly uneven.",
    ],
    diagram: { source: "learn", id: "k-buttonhole" },
    sources: [CYC_ABBREV, "https://sarahmaker.com/knitting-buttonholes/"],
  },
];
