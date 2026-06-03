import type { CraftType, QuickReferenceGroup } from "@/types";
import { estimateSkeins, getRibbingReference, getStitchGraph } from "@/lib/craftKnowledge";

const KNIT_REFERENCE: QuickReferenceGroup[] = [
  {
    title: "Starting your project",
    items: [
      { title: "Cast on", detail: "Long-tail cast-on gives a firm, elastic edge and is the most commonly used. Slip knot -> hold working yarn over thumb and tail over index finger -> scoop and pull through for each stitch. For adds mid-project, use a backward-loop or cable cast-on." },
      { title: "First row direction", detail: "Once cast on, Row 1 (RS) is read RIGHT TO LEFT on a flat chart. A blank square = knit stitch. After turning, Row 2 (WS) reads LEFT TO RIGHT; the same blank square = purl on the wrong side." },
      { title: "Join new yarn", detail: "Join at a side edge when possible, leaving 6-inch tails to weave in later. Russian join, spit splice, or simple overlap all work well." },
    ],
  },
  {
    title: "Core stitches",
    items: [
      { title: "Knit (k)", detail: "Insert needle front-to-back, wrap yarn, pull loop through, slide off. Produces smooth V columns on the right side - the foundation of stockinette." },
      { title: "Purl (p)", detail: "Yarn in front, insert right-to-left, wrap, pull loop through, slide off. Creates bumps on the right side - the WS of stockinette looks like all purls." },
      { title: "Increase (m1, kfb)", detail: "M1L/M1R: pick up bar between stitches and knit through the back (invisible). Kfb: knit into front and back of same stitch (leaves a small bar). Use for sleeves, shawls, and raglans." },
      { title: "Decrease (k2tog, ssk)", detail: "K2tog leans right; insert through 2 stitches together. SSK leans left; slip 2, return, knit through back loops. Pair them at armhole edges for balanced shaping." },
    ],
  },
  {
    title: "Chart reading (flat / back-and-forth)",
    items: [
      { title: "Right-side rows -> right to left", detail: "The chart shows the RIGHT SIDE of the fabric. RS rows are worked RIGHT TO LEFT. A blank square = KNIT. This is standard for flat garment charts." },
      { title: "Wrong-side rows -> left to right", detail: "WS rows are worked LEFT TO RIGHT. A blank square that means knit on RS = PURL on WS, so the public face looks correct." },
      { title: "Colourwork floats", detail: "When using two colours, carry the unused yarn loosely across the back. Catch floats every 4-6 stitches to keep the inside neat without puckering." },
    ],
  },
];

const CROCHET_REFERENCE: QuickReferenceGroup[] = [
  {
    title: "Starting your project",
    items: [
      { title: "Foundation chain", detail: "Crochet DOES NOT use a cast-on - it starts with chain stitches. Chain loosely (or go up a hook size) so the first row doesn't pull in. Count the chains carefully before beginning Row 1." },
      { title: "Foundation single crochet (FSC)", detail: "An alternative to a foundation chain that creates the chain AND the first row of sc simultaneously. Produces a very elastic, neat edge - ideal for garment hems." },
      { title: "Turning chain", detail: "Work the turning chain at the start of each row to match stitch height: 1 ch for sc, 2 ch for hdc, 3 ch for dc. Count as a stitch only when the pattern says to." },
    ],
  },
  {
    title: "Core stitches",
    items: [
      { title: "Single crochet (sc)", detail: "Dense, firm fabric - insert hook, pull up loop, yarn over and through both loops. 1 ch to turn. Great for structured edges, bands, and amigurumi." },
      { title: "Half double crochet (hdc)", detail: "Balanced height - yarn over, insert hook, pull up loop, yarn over through all 3 loops. 2 ch to turn. Fast, soft fabric for garment bodies." },
      { title: "Double crochet (dc)", detail: "Tall open stitch - yarn over, insert hook, pull up loop, yarn over through 2 loops, yarn over through last 2 loops. 3 ch to turn. Good for shawls and drapey garments." },
    ],
  },
  {
    title: "Shaping",
    items: [
      { title: "Increase", detail: "Work 2 or more stitches into the same stitch or chain space. Used for shaping sleeves, shawl edges, circle motifs, and adding width." },
      { title: "Decrease (sc2tog, dc2tog)", detail: "Insert hook in first stitch, pull up loop, insert in second stitch, pull up loop, yarn over through all 3 loops. Removes one stitch. Used for armholes and necklines." },
      { title: "Seaming", detail: "Slip-stitch seam: hold RS together and slip stitch through both edges. Mattress stitch gives a flat invisible seam. Whip stitch works quickly for non-visible seams." },
    ],
  },
];

const GARMENT_REFERENCE: Record<string, QuickReferenceGroup[]> = {
  Cardigan: [
    {
      title: "Cardigan construction",
      items: [
        { title: "Button band", detail: "Pick up stitches evenly along each front edge after blocking. Work the band firmly (ribbing or seed stitch) so it does not flare or stretch." },
        { title: "Neckband or requested collar", detail: "The neckline opening sits at the TOP of the garment. After joining shoulders, pick up around the neck opening and work a neckband unless the style specifically asks for a shawl collar, hood, turtleneck, or other collar." },
        { title: "Buttons and buttonholes", detail: "Space buttonholes evenly from lower chest to collar. Mark button positions with pins before sewing, sew through both layers with a button loop at the back." },
        { title: "Pockets", detail: "Work as separate rectangles with firm ribbed tops. Block them, try the cardigan on, pin in position, then sew with mattress stitch from the inside." },
      ],
    },
  ],
  Sweater: [
    {
      title: "Sweater construction",
      items: [
        { title: "Neckband at top", detail: "The neckline belongs at the TOP. For crew necks and V-necks, pick up around the neck opening after joining shoulder seams and work a neckband. Use a collar only when the style asks for one." },
        { title: "Sleeves and set-in armholes", detail: "Shape sleeve caps to fit the armhole curves. Pin the sleeve cap into the armhole and ease evenly before sewing." },
        { title: "Blocking before seaming", detail: "Block each piece to the listed measurements BEFORE seaming. Wet-block, pin to measurements, and let dry completely." },
      ],
    },
  ],
  Shawl: [
    {
      title: "Shawl tips",
      items: [
        { title: "Centre spine increases", detail: "Place markers around the centre spine stitch(es). Increase each side of the spine every RS row for a symmetrical triangle." },
        { title: "Loose edge", detail: "Keep edge stitches relaxed - a slipped edge stitch creates a neat chain that blocks open cleanly without pulling." },
      ],
    },
  ],
};

export function getQuickReference(craftType: CraftType, garmentType?: string): QuickReferenceGroup[] {
  const base = craftType === "crocheting" ? CROCHET_REFERENCE : KNIT_REFERENCE;
  return [...base, getRibbingReference(craftType), ...(garmentType ? GARMENT_REFERENCE[garmentType] ?? [] : [])];
}

export function getPreparationGuide(craftType: CraftType, garmentType?: string, size?: string): QuickReferenceGroup[] {
  const skeins = estimateSkeins(garmentType, size, craftType);
  const isKnit = craftType === "knitting";

  return [
    {
      title: "Materials you'll need",
      items: [
        {
          title: `Yarn - about ${skeins} skeins`,
          detail: `Estimate: ${skeins} skeins (about 220 m / 240 yd each) for ${size ?? "M"} ${garmentType ?? "garment"}. Buy one extra skein - dye lots vary and it's hard to match later.`,
        },
        {
          title: isKnit ? "Needles" : "Hook",
          detail: isKnit
            ? "Straight or circular needles in the size given on the ball band (usually US 10-11 / 6-7 mm for chunky). Have smaller needles ready for ribbing (2 sizes down)."
            : "A hook 1-2 sizes larger than the ball band recommendation works well for garments - crochet naturally tightens. Have a smaller hook ready for edges.",
        },
        {
          title: "Notions",
          detail: "Stitch markers, tapestry needle, measuring tape, scissors, locking markers or scrap yarn for lifelines. Buttons if making a cardigan.",
        },
      ],
    },
    {
      title: isKnit ? "How to start (knitting)" : "How to start (crochet)",
      items: isKnit
        ? [
            {
              title: "Make a gauge swatch first",
              detail: "Cast on 30 stitches. Work 30 rows in your chosen stitch. Block the swatch, then measure 10 cm x 10 cm in the centre (not at the edges). Count stitches and rows. If your count is higher than the pattern gauge, go up a needle size; if lower, go down.",
            },
            {
              title: "Cast on - what it means",
              detail: "Casting on places the first row of live loops on the needle. Use long-tail cast-on for most garments: make a slip knot, hold tail over thumb, working yarn over index finger, scoop the yarn from both sides to form each stitch.",
            },
            {
              title: "Ribbing at the hem",
              detail: "Many garments begin with k1 p1 or k2 p2 ribbing to create a neat, elastic edge that hugs the body. After the ribbing rows, switch to your main stitch pattern and begin increasing if needed.",
            },
          ]
        : [
            {
              title: "Make a gauge swatch first",
              detail: "Chain 20 + turning chain. Work 20 rows in your chosen stitch. Block the swatch. Measure 10 cm x 10 cm in the centre. If your count is higher than the pattern gauge, go up a hook size; if lower, go down.",
            },
            {
              title: "Foundation chain - what it means",
              detail: "Crochet begins with a chain, NOT a cast-on. Make a slip knot, insert hook, yarn over and pull through for each chain stitch. Chain loosely - tight foundations cause pulling. Foundation single crochet (FSC) is an excellent elastic alternative.",
            },
            {
              title: "Ribbing at the hem (crochet)",
              detail: "Work back-loop single crochet ribbing sideways: chain the rib height (e.g. 8 ch for about a 2 inch band), then sc-BLO across each row until the strip is the needed width. Join with a slip-stitch seam to the garment edge.",
            },
          ],
    },
    {
      title: "Stitch outcomes - what to expect",
      items: getStitchGraph(craftType).map((stitch) => ({
        title: stitch.name,
        detail: `${stitch.appearance} ${stitch.useFor ? `Best for: ${stitch.useFor}` : ""}`,
      })),
    },
  ];
}

export function getAssemblyInstructions(garmentType?: string): string[] {
  switch (garmentType) {
    case "Cardigan":
      return [
        "Block every piece (back, left front, right front, sleeves, bands, neckband or requested collar, pockets) to the listed measurements. Pin to shape and let dry completely.",
        "Join both shoulder seams using mattress stitch or three-needle bind-off, leaving the neckline opening clear.",
        "Set the sleeve caps into the armholes: pin the centre of the cap to the shoulder seam, pin the underarms, then ease the cap evenly around the armhole curve and sew.",
        "Sew sleeve seams from cuff to underarm. Sew side seams from hem to underarm.",
        "Attach button bands to the front edges. Pick up stitches evenly - use stitch markers to divide the band into equal sections before picking up.",
        "Sew on buttons directly opposite the buttonholes, reinforcing from behind with a small backing button if needed.",
        "Attach the neckband or requested collar around the neckline with the shaped edge at the top.",
        "Sew pockets in place after trying the cardigan on to confirm their position. Weave in all ends and steam lightly.",
      ];
    case "Sweater":
    case "Pullover":
      return [
        "Block the back, front, sleeves, and neckband pieces to the listed measurements.",
        "Join one shoulder seam. Pick up and work the neckband around the neckline, then join the second shoulder seam.",
        "Set sleeves into armholes, pinning and easing the cap evenly.",
        "Sew sleeve seams, then sew side seams from hem to underarm.",
        "Weave in all ends and block the finished garment again if needed.",
      ];
    case "Hat":
    case "Hat / Beanie":
      return [
        "If the brim was worked separately, join it to the body with mattress stitch or whip stitch.",
        "Close the crown by threading the tail through the remaining live stitches and pulling tight, or by grafting if worked flat.",
        "Weave in ends inside the hat. Block over a form matching the finished circumference.",
      ];
    case "Socks":
      return [
        "Graft or seam the toe using Kitchener stitch (grafting) for a seamless, comfortable finish.",
        "Weave ends away from the heel and toe pressure points.",
        "Block both socks to the same length on sock blockers or stuffed plastic bags.",
      ];
    default:
      return [
        "Block each finished piece to the intended measurements, pinning or using a blocking mat.",
        "Join matching edges using mattress stitch (knit) or a slip-stitch / whip-stitch seam (crochet).",
        "Weave in all ends, check that stretch openings (cuffs, neck) move freely, and steam lightly if the yarn allows.",
      ];
  }
}
