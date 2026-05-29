import type { CraftType, GarmentTemplate, QuickReferenceGroup } from "@/types";

export type GarmentSize = "XS" | "S" | "M" | "L" | "XL" | "2XL";

export const GARMENT_SIZES: GarmentSize[] = ["XS", "S", "M", "L", "XL", "2XL"];
export const SIZE_W_SCALE: Record<GarmentSize, number> = { XS: 0.71, S: 0.81, M: 0.91, L: 1, XL: 1.1, "2XL": 1.19 };
export const SIZE_H_SCALE: Record<GarmentSize, number> = { XS: 0.82, S: 0.86, M: 0.94, L: 1, XL: 1.06, "2XL": 1.1 };

// Finished garment bust measurements (with positive ease already included).
// L = 42" bust so 76 stitches at chunky gauge = Large back panel.
export const SIZE_PROFILES: Record<GarmentSize, { bust: number; length: number; sleeve: number }> = {
  XS:  { bust: 30, length: 20,   sleeve: 15.5 },
  S:   { bust: 34, length: 21,   sleeve: 16.5 },
  M:   { bust: 38, length: 23,   sleeve: 17.5 },
  L:   { bust: 42, length: 24.5, sleeve: 18   },
  XL:  { bust: 46, length: 26,   sleeve: 18.5 },
  "2XL": { bust: 50, length: 27, sleeve: 19   },
};

// Chunky / bulky knitting: about 3.6 sts and 4.4 rows per inch.
// At this gauge a Large back (21") = 76 sts and 24.5" body = about 108 rows.
export const KNIT_CHUNKY_GAUGE = {
  stitchesPerInch: 76 / 21,
  rowsPerInch: 4.4,
  label: "14.5 sts and 17.5 rows over 4 in",
};

// Worsted-weight crochet: about 3 sts and 3.6 rows per inch.
export const CROCHET_WORSTED_GAUGE = {
  stitchesPerInch: 3,
  rowsPerInch: 3.6,
  label: "12 sts and 14.5 rows over 4 in",
};

export const GARMENT_OPTIONS: Record<string, string[]> = {
  Cardigan: [
    "V-neck button cardigan",
    "crew-neck cardigan",
    "shawl-collar cardigan",
    "oversized drop-shoulder cardigan",
    "fitted set-in-sleeve cardigan",
    "raglan cardigan",
    "cropped cardigan",
    "longline cardigan",
    "open-front duster cardigan",
    "patch-pocket cardigan",
    "hood cardigan",
    "short-row colourwork cardigan",
    "textured-stitch (moss/seed) cardigan",
  ],
  Sweater: [
    "crew-neck pullover",
    "V-neck pullover",
    "raglan sweater",
    "drop-shoulder sweater",
    "turtleneck / roll-neck sweater",
    "cropped sweater",
    "oversized sweater",
    "colourwork yoke sweater",
    "fair isle sweater",
    "cable sweater",
    "striped sweater",
    "square-yoke sweater",
  ],
  Pullover: [
    "crew-neck pullover",
    "V-neck pullover",
    "raglan pullover",
    "drop-shoulder pullover",
    "turtleneck pullover",
    "cropped pullover",
    "boxy pullover",
  ],
  Vest: ["V-neck vest", "crew-neck vest", "button vest", "slipover", "side-slit vest"],
  Shawl: [
    "top-down triangle shawl",
    "crescent shawl",
    "rectangle wrap / shawlette",
    "asymmetric shawl",
    "wingspan shawl",
    "brioche shawl",
  ],
  Hat: ["beanie", "watch cap", "slouch hat", "ribbed-brim hat", "fisherman's rib hat"],
  "Hat / Beanie": ["beanie", "watch cap", "slouch hat", "ribbed-brim hat", "fisherman's rib hat"],
  Scarf: [
    "straight scarf",
    "ribbed scarf",
    "lace scarf",
    "colourwork scarf",
    "infinity scarf",
    "brioche scarf",
  ],
  Cowl: ["short cowl", "long loop cowl", "button cowl", "double-knit cowl"],
  Socks: [
    "cuff-down socks",
    "toe-up socks",
    "shortie ankle socks",
    "knee-high socks",
    "ribbed socks",
    "colourwork socks",
  ],
  Mittens: [
    "classic mittens",
    "flip-top convertible mittens",
    "colourwork mittens",
    "double-knit mittens",
  ],
  Gloves: ["fingerless gloves", "full gloves", "ribbed wrist warmers", "texting gloves"],
  "Baby Blanket": [
    "simple garter blanket",
    "striped blanket",
    "granny-square blanket",
    "textured stitch blanket",
  ],
  "Throw Blanket": [
    "simple throw",
    "striped throw",
    "motif throw",
    "textured throw",
    "planned pooling throw",
  ],
};

export type StitchEntry = {
  id: string;
  craftType: CraftType;
  name: string;
  abbreviation: string;
  appearance: string;
  useFor: string;
  tutorial: string;
  videoQuery: string;
  imageUrl: string;
  tutorialImages?: string[];
  sourceUrl: string;
};

const CYC = {
  knit1: "https://www.craftyarncouncil.com/images/learn/mar06_knit1.jpg",
  knit2: "https://www.craftyarncouncil.com/images/learn/mar06_knit2.jpg",
  knit3: "https://www.craftyarncouncil.com/images/learn/mar06_knit3.jpg",
  knit4: "https://www.craftyarncouncil.com/images/learn/mar06_knit4.jpg",
  purl1: "https://craftyarncouncil.com/images/learn/purl_diag30.jpg",
  purl2: "https://craftyarncouncil.com/images/learn/purl_diag31.jpg",
  purl3: "https://craftyarncouncil.com/images/learn/purl_diag32.jpg",
  purl4: "https://craftyarncouncil.com/images/learn/purl_diag33.jpg",
  chain1: "https://media.craftyarncouncil.com/images/learn/chain_crochet_1.jpg",
  chain2: "https://media.craftyarncouncil.com/images/learn/chain_crochet_2.jpg",
  single1: "https://media.craftyarncouncil.com/images/learn/single_crochet_5.jpg",
  double1: "https://www.craftyarncouncil.com/images/learn/dbl_croc_diag26.jpg",
  double4: "https://www.craftyarncouncil.com/images/learn/dbl_croc_diag29.jpg",
  knitSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/knit-symbols/knit-symbol-K-on-RS.png",
  purlSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/knit-symbols/knit-symbol-P-on-RS.png",
  yarnOverSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/knit-symbols/knit-symbol-Yarn-over.png",
  slippedSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/knit-symbols/knit-symbol-Sl-1-purlwise-wyb.png",
  cableSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/knit-symbols/knit-symbol-cable-v1-11RC.png",
  chainSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-ch.png",
  slipSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-sl-st.png",
  scSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-sc.png",
  hdcSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-hdc.png",
  dcSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-dc.png",
  trSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-tr.png",
  shellSymbol: "https://media.craftyarncouncil.com/sites/default/files/images/standards/crochet-symbols/crochet-symbol-5-dc-shell.png",
};

export const STITCH_LIBRARY: StitchEntry[] = [
  {
    id: "knit",
    craftType: "knitting",
    name: "Knit stitch",
    abbreviation: "k",
    appearance: "Smooth V-shaped columns on the right side.",
    useFor: "Stockinette, ribbing, colourwork, most garment bodies. Right-to-left on RS rows reads as knit when working flat charts.",
    tutorial: "Insert right needle front-to-back through next stitch, wrap yarn counter-clockwise, pull loop through, slide old stitch off. Reading a flat chart right-to-left, an empty square = knit on the right side.",
    videoQuery: "how to knit stitch beginner",
    imageUrl: CYC.knit1,
    tutorialImages: [CYC.knit1, CYC.knit2, CYC.knit3, CYC.knit4],
    sourceUrl: "https://www.craftyarncouncil.com/mar06_knit.html",
  },
  {
    id: "purl",
    craftType: "knitting",
    name: "Purl stitch",
    abbreviation: "p",
    appearance: "Raised horizontal bumps on the right side; the reverse of knit.",
    useFor: "Wrong-side stockinette rows, reverse stockinette, ribbing, seed stitch. Left-to-right on WS rows reads as purl.",
    tutorial: "Hold yarn in front, insert right needle right-to-left through stitch, wrap yarn, pull loop through, slide off. On WS rows (read left to right on a flat chart) a blank square = purl.",
    videoQuery: "how to purl stitch beginner",
    imageUrl: CYC.purl1,
    tutorialImages: [CYC.purl1, CYC.purl2, CYC.purl3, CYC.purl4],
    sourceUrl: "https://craftyarncouncil.com/mar06_purl.html",
  },
  {
    id: "ribbing",
    craftType: "knitting",
    name: "Ribbing (1x1 or 2x2)",
    abbreviation: "k1p1",
    appearance: "Stretchy vertical ridges that pull in, lie flatter than stockinette, and spring back when stretched.",
    useFor: "Hems, cuffs, collars, button bands, pocket tops. Add to any garment edge for elastic recovery.",
    tutorial: "1x1 rib: *k1, p1* across; on next row work stitches as they appear (knit the knits, purl the purls). 2x2 rib: *k2, p2* across, keeping columns aligned above.",
    videoQuery: "how to knit 1x1 and 2x2 ribbing",
    imageUrl: CYC.knitSymbol,
    tutorialImages: [CYC.knit1, CYC.purl1],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knitting-abbreviations",
  },
  {
    id: "garter",
    craftType: "knitting",
    name: "Garter stitch",
    abbreviation: "g st",
    appearance: "Horizontal ridges on both sides; lays flat, does not curl, looks the same from both faces.",
    useFor: "Borders, baby items, scarves, blankets, button bands, anywhere curl-free flat fabric is needed.",
    tutorial: "Knit every row - no purling at all. Each ridge = 2 rows. Great for first projects because there's no 'right side'.",
    videoQuery: "how to knit garter stitch beginner",
    imageUrl: CYC.knit2,
    tutorialImages: [CYC.knit1, CYC.knit2],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knitting-abbreviations",
  },
  {
    id: "seed",
    craftType: "knitting",
    name: "Seed stitch",
    abbreviation: "seed",
    appearance: "Tiny alternating raised bumps on both sides; textured, reversible, does not curl.",
    useFor: "Borders, button bands, collar edges, scarves, pocket tops, and garment bodies for texture variety.",
    tutorial: "*k1, p1* across row 1. On subsequent rows work purl over knit stitches and knit over purl stitches - opposite of ribbing.",
    videoQuery: "how to knit seed stitch",
    imageUrl: CYC.purlSymbol,
    tutorialImages: [CYC.knit1, CYC.purl1],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knitting-abbreviations",
  },
  {
    id: "cable",
    craftType: "knitting",
    name: "Cable stitch",
    abbreviation: "C4F/C4B",
    appearance: "Twisted rope-like columns standing out from a reverse-stockinette background.",
    useFor: "Sweater panels, cardigans, scarves, hats - wherever bold sculptural texture is wanted.",
    tutorial: "Slip stitches to a cable needle, hold front (C4F) or back (C4B), knit the next stitches from the left needle, then knit from the cable needle. Repeat every 4th-8th row.",
    videoQuery: "how to knit cable stitch C4F beginner",
    imageUrl: CYC.cableSymbol,
    tutorialImages: [CYC.cableSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knit-chart-symbols",
  },
  {
    id: "stockinette",
    craftType: "knitting",
    name: "Stockinette stitch",
    abbreviation: "St st",
    appearance: "Smooth knit V columns on the right side and purl bumps on the wrong side; it curls without an edge treatment.",
    useFor: "Sweater and cardigan bodies, sleeves, colourwork, and most classic garment fabric. Add ribbing, garter, or seed stitch at edges to reduce curl.",
    tutorial: "Flat stockinette: knit the RS rows and purl the WS rows. In the round, knit every round. For charted flat knitting, RS blank squares are usually knit; WS blank squares are usually purl.",
    videoQuery: "how to knit stockinette stitch flat and in the round",
    imageUrl: CYC.knit1,
    tutorialImages: [CYC.knit1, CYC.purl1],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knitting-abbreviations",
  },
  {
    id: "yarn-over",
    craftType: "knitting",
    name: "Yarn over lace",
    abbreviation: "yo",
    appearance: "A deliberate open hole paired with decreases; creates lace, eyelets, and airy fabric.",
    useFor: "Shawls, decorative yokes, buttonholes, lace panels, and breathable summer knits.",
    tutorial: "Bring yarn to the front or over the needle to create an extra loop, then work the next stitch. Pair yo with k2tog or ssk when you want lace without changing the total stitch count.",
    videoQuery: "how to knit yarn over eyelet lace",
    imageUrl: CYC.yarnOverSymbol,
    tutorialImages: [CYC.yarnOverSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knit-chart-symbols",
  },
  {
    id: "slipped-stitch",
    craftType: "knitting",
    name: "Slipped stitch edge",
    abbreviation: "sl",
    appearance: "A tidy chain-like edge or elongated stitch column depending on where the yarn is held.",
    useFor: "Clean scarf edges, button bands, reinforced heels, mosaic knitting, and easy colour texture.",
    tutorial: "Move the next stitch from left needle to right needle without knitting it. Slip purlwise to preserve the stitch direction. Hold yarn in front for a purl bump or in back for a cleaner knit-facing column.",
    videoQuery: "how to slip stitch knitting purlwise edge",
    imageUrl: CYC.slippedSymbol,
    tutorialImages: [CYC.slippedSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/knitting-abbreviations",
  },
  {
    id: "single-crochet",
    craftType: "crocheting",
    name: "Single crochet",
    abbreviation: "sc",
    appearance: "Dense, firm fabric with short compact stitches.",
    useFor: "Bands, edges, bags, amigurumi, structured garment details, ribbing when worked through back loop.",
    tutorial: "Insert hook, yarn over and pull up a loop (2 loops on hook), yarn over and pull through both loops. 1 chain to turn.",
    videoQuery: "how to single crochet beginner",
    imageUrl: CYC.single1,
    tutorialImages: [CYC.chain1, CYC.single1],
    sourceUrl: "https://media.craftyarncouncil.com/mar06_crochet.html",
  },
  {
    id: "slip-stitch-crochet",
    craftType: "crocheting",
    name: "Slip stitch",
    abbreviation: "sl st",
    appearance: "Very short, flat stitch with almost no height.",
    useFor: "Joining rounds, seams, decorative surface lines, edging, and moving across stitches without adding height.",
    tutorial: "Insert hook into the stitch, yarn over, pull through the stitch and the loop on the hook in one motion. Keep the loop relaxed so the edge does not tighten.",
    videoQuery: "how to crochet slip stitch beginner",
    imageUrl: CYC.slipSymbol,
    tutorialImages: [CYC.slipSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-abbreviations",
  },
  {
    id: "half-double-crochet",
    craftType: "crocheting",
    name: "Half double crochet",
    abbreviation: "hdc",
    appearance: "Medium-height fabric with a soft horizontal bar; slightly looser than sc.",
    useFor: "Sweaters, cardigans, hats, quick textured panels, anywhere you want a balance of speed and density.",
    tutorial: "Yarn over, insert hook, pull up a loop (3 loops on hook), yarn over and pull through all three loops. 2 chains to turn.",
    videoQuery: "how to half double crochet beginner",
    imageUrl: CYC.hdcSymbol,
    tutorialImages: [CYC.hdcSymbol, CYC.chain1],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-abbreviations",
  },
  {
    id: "double-crochet",
    craftType: "crocheting",
    name: "Double crochet",
    abbreviation: "dc",
    appearance: "Taller, more open stitches with faster row growth and gentle drape.",
    useFor: "Drapey garments, shawls, blankets, lace-like texture, granny squares, fast bodies.",
    tutorial: "Yarn over, insert hook, pull up a loop, yarn over through first 2 loops, yarn over through last 2 loops. 3 chains to turn.",
    videoQuery: "how to double crochet beginner",
    imageUrl: CYC.double1,
    tutorialImages: [CYC.double1, CYC.double4],
    sourceUrl: "https://www.craftyarncouncil.com/mar06_dc.html",
  },
  {
    id: "treble-crochet",
    craftType: "crocheting",
    name: "Treble crochet",
    abbreviation: "tr",
    appearance: "Very tall, open stitch with strong drape and visible vertical posts.",
    useFor: "Lace shawls, open cardigans, airy scarves, mesh panels, and quick height.",
    tutorial: "Yarn over twice, insert hook, pull up a loop. Yarn over and pull through two loops three times. Use a 4-chain turning chain unless the pattern says otherwise.",
    videoQuery: "how to treble crochet stitch beginner",
    imageUrl: CYC.trSymbol,
    tutorialImages: [CYC.trSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-abbreviations",
  },
  {
    id: "crochet-moss",
    craftType: "crocheting",
    name: "Crochet moss stitch",
    abbreviation: "sc ch-1",
    appearance: "Small woven-looking texture with gentle drape and tiny offset spaces.",
    useFor: "Blankets, scarves, easy garments, dishcloths, and colour stripes that look polished.",
    tutorial: "Work *sc, ch 1, skip 1* across. On the next row, work each sc into the chain space from the row below. Keep chains loose for even fabric.",
    videoQuery: "how to crochet moss stitch linen stitch",
    imageUrl: CYC.scSymbol,
    tutorialImages: [CYC.scSymbol, CYC.chainSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-abbreviations",
  },
  {
    id: "crochet-ribbing",
    craftType: "crocheting",
    name: "Back-loop crochet ribbing",
    abbreviation: "BLO sc",
    appearance: "Stretchy vertical ridges similar to knitted ribbing; worked sideways.",
    useFor: "Cuffs, hems, collars, button bands, pocket tops - any edge that needs elastic recovery.",
    tutorial: "Chain the rib height (e.g. 8 ch for a 2\" band). Row 1: sc in 2nd chain from hook and each chain across. Row 2 onward: ch 1, sc through the back loop only of each stitch. Work to the needed length, then attach with a slip-stitch seam.",
    videoQuery: "how to crochet ribbing back loop single crochet",
    imageUrl: CYC.scSymbol,
    tutorialImages: [CYC.scSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-abbreviations",
  },
  {
    id: "granny-square",
    craftType: "crocheting",
    name: "Granny square",
    abbreviation: "-",
    appearance: "Classic open-weave square motif with clusters of double crochets and corner chain spaces.",
    useFor: "Blankets, bags, garment panels, patchwork cardigans, joining-as-you-go projects.",
    tutorial: "Magic ring, ch 3 (= 1 dc), 2 dc in ring, ch 2, *3 dc in ring, ch 2* 3 times, slip-stitch to top of ch-3. Each round: join at corner ch-sp, ch 3, work 3 dc clusters in each side, ch 2 at each corner.",
    videoQuery: "how to crochet granny square beginner",
    imageUrl: CYC.dcSymbol,
    tutorialImages: [CYC.chainSymbol, CYC.dcSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-chart-symbols",
  },
  {
    id: "shell-stitch",
    craftType: "crocheting",
    name: "Shell stitch",
    abbreviation: "shell",
    appearance: "Fan-shaped clusters that make scalloped texture and decorative edges.",
    useFor: "Blanket borders, shawls, cardigans with decorative edges, scarves, and feminine texture panels.",
    tutorial: "A common shell is 5 dc worked into the same stitch or chain space. Skip stitches between shells so the fabric spreads without buckling.",
    videoQuery: "how to crochet shell stitch beginner",
    imageUrl: CYC.shellSymbol,
    tutorialImages: [CYC.shellSymbol],
    sourceUrl: "https://www.craftyarncouncil.com/standards/crochet-chart-symbols",
  },
];

export function gaugeForCraft(craftType: CraftType) {
  return craftType === "crocheting" ? CROCHET_WORSTED_GAUGE : KNIT_CHUNKY_GAUGE;
}

// Conservative skein estimates at about 220 m/skein. Garments intentionally round up.
// Crochet uses more yarn than knitting for the same finished surface.
export function estimateSkeins(garmentType: string | undefined, size: string | undefined, craftType: CraftType): number {
  const normalizedSize: GarmentSize =
    size === "XXL" || size === "3XL"
      ? "2XL"
      : GARMENT_SIZES.includes(size as GarmentSize)
        ? (size as GarmentSize)
        : "M";
  const sizeIndex = GARMENT_SIZES.indexOf(normalizedSize);
  const adultGarmentMeters = [2200, 2600, 3000, 3600, 4200, 5000];
  const cardiganBoost = garmentType === "Cardigan" ? 1.12 : 1;
  const vestMeters = [1100, 1300, 1500, 1750, 2050, 2400];
  const meterage =
    garmentType === "Cardigan" || garmentType === "Sweater" || garmentType === "Pullover" ? adultGarmentMeters[sizeIndex] * cardiganBoost :
    garmentType === "Vest" ? vestMeters[sizeIndex] :
    garmentType === "Shawl" ? 750 :
    garmentType === "Throw Blanket" ? 1400 :
    garmentType === "Baby Blanket" ? 800 :
    garmentType === "Scarf" ? 450 :
    garmentType === "Hat" || garmentType === "Hat / Beanie" ? 180 :
    garmentType === "Socks" ? 350 :
    650;
  const craftFactor = craftType === "crocheting" ? 1.35 : 1;
  return Math.max(1, Math.ceil((meterage * craftFactor) / 220));
}

export function buildGaugeTemplate(craftType: CraftType): Record<string, GarmentTemplate> {
  const gauge = gaugeForCraft(craftType);
  const sts = gauge.stitchesPerInch;
  const rows = gauge.rowsPerInch;
  // Use Large (42") as the template size - 76 sts back for knitting
  const bySize = SIZE_PROFILES.L;
  const backW = Math.round((bySize.bust / 2) * sts);
  const bodyH = Math.round(bySize.length * rows);
  const frontW = Math.round((bySize.bust / 4 + 1.5) * sts);
  const sleeveW = Math.round((bySize.bust * 0.32) * sts);
  const sleeveH = Math.round(bySize.sleeve * rows);

  return {
    Sweater: { sections: [{ name: "Back", w: backW, h: bodyH }, { name: "Front", w: backW, h: bodyH }, { name: "Collar", w: Math.round(backW * 0.72), h: Math.round(rows * 2.5) }, { name: "Left Sleeve", w: sleeveW, h: sleeveH }, { name: "Right Sleeve", w: sleeveW, h: sleeveH }] },
    Cardigan: { sections: [{ name: "Back", w: backW, h: bodyH }, { name: "Front Right", w: frontW, h: bodyH }, { name: "Front Left", w: frontW, h: bodyH }, { name: "Button Band", w: Math.max(8, Math.round(sts * 2)), h: bodyH }, { name: "Collar", w: Math.round(backW * 0.76), h: Math.round(rows * 2.5) }, { name: "Left Sleeve", w: sleeveW, h: sleeveH }, { name: "Right Sleeve", w: sleeveW, h: sleeveH }, { name: "Pocket", w: Math.round(sts * 5), h: Math.round(rows * 4) }] },
    Hat: { sections: [{ name: "Hat Body", w: Math.round(20 * sts), h: Math.round(8 * rows) }, { name: "Brim", w: Math.round(20 * sts), h: Math.round(2.5 * rows) }] },
    Scarf: { sections: [{ name: "Scarf", w: Math.round(8 * sts), h: Math.round(55 * rows) }] },
    Socks: { sections: [{ name: "Leg", w: Math.round(8 * sts), h: Math.round(7 * rows) }, { name: "Heel Flap", w: Math.round(4 * sts), h: Math.round(3 * rows) }, { name: "Foot", w: Math.round(8 * sts), h: Math.round(8 * rows) }, { name: "Toe", w: Math.round(8 * sts), h: Math.round(2.5 * rows) }] },
    Mittens: { sections: [{ name: "Hand", w: Math.round(7 * sts), h: Math.round(8 * rows) }, { name: "Thumb", w: Math.round(3 * sts), h: Math.round(3.5 * rows) }, { name: "Cuff", w: Math.round(7 * sts), h: Math.round(2.5 * rows) }] },
    Shawl: { sections: [{ name: "Shawl Body", w: Math.round(32 * sts), h: Math.round(16 * rows) }] },
    "Baby Blanket": { sections: [{ name: "Blanket", w: Math.round(30 * sts), h: Math.round(34 * rows) }] },
  };
}

export function getStitchGraph(craftType: CraftType) {
  return STITCH_LIBRARY.filter((entry) => entry.craftType === craftType);
}

export function getRibbingReference(craftType: CraftType): QuickReferenceGroup {
  return craftType === "crocheting"
    ? {
        title: "Crochet ribbing",
        items: [
          { title: "Back-loop sc rib (most common)", detail: "Work single crochet through the back loop only, turning each row. Work sideways to the needed length, then join the short edges to cuffs, hems, collars, or bands with a slip-stitch seam." },
          { title: "Front/back-post rib", detail: "Alternate FPdc and BPdc for a raised, stretchy post-stitch rib. Great for cuffs and collars - the posts grip the fabric and prevent flaring." },
          { title: "How ribbing fits in", detail: "For a cardigan: work the rib band separately and join it to the hem and cuffs. The rib height is typically 2-3 inches (5-7.5 cm)." },
        ],
      }
    : {
        title: "Knitted ribbing",
        items: [
          { title: "1x1 rib - *k1, p1*", detail: "Alternate one knit and one purl stitch across. On subsequent rows, knit the knits and purl the purls as they face you. Elastic and tidy - perfect for all edges." },
          { title: "2x2 rib - *k2, p2*", detail: "Bolder, stretchier columns. Keep the knit columns directly above the knit columns from the previous row. Most common for cuffs and hems on chunky garments." },
          { title: "How ribbing fits in", detail: "For a cardigan: cast on the hem, work 1-2 inches of ribbing, then switch to stockinette. For cuffs: cast on fewer stitches in rib, then increase when you switch to the sleeve body." },
        ],
      };
}
