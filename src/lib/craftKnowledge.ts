import type { CraftType, GarmentTemplate, QuickReferenceGroup } from "@/types";
import { stitchDisplayImage } from "@/lib/stitchImages";

export type GarmentSize = "XS" | "S" | "M" | "L" | "XL" | "2XL";

export const GARMENT_SIZES: GarmentSize[] = ["XS", "S", "M", "L", "XL", "2XL"];
export const SIZE_W_SCALE: Record<GarmentSize, number> = { XS: 0.71, S: 0.81, M: 0.91, L: 1, XL: 1.1, "2XL": 1.19 };
export const SIZE_H_SCALE: Record<GarmentSize, number> = { XS: 0.82, S: 0.86, M: 0.94, L: 1, XL: 1.06, "2XL": 1.1 };

// Finished garment bust measurements follow the Craft Yarn Council women's
// chest ranges, using the upper value of each range as the finished baseline.
// L = 42" bust, so 76 stitches at chunky gauge = Large back panel.
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
  photoUrl?: string;
  tutorialImages?: string[];
  sourceUrl: string;
};

// SVG stitch chart diagrams — generated inline, no external dependencies.
// Each diagram shows the stitch repeat in standard chart notation:
//   □ (empty/V) = knit on RS  |  ─ = purl on RS  |  ○ = yarn over
//   ╱ = k2tog (right dec)     |  ╲ = ssk (left dec) | + = increase (m1)
//   ⌇ = slipped stitch        |  ※ = cable cross    | × = single crochet
//   T = double crochet        |  ⊙ = slip st (crochet)

function mkDiag(pattern: string[][], label: string, accent = "#8b6347"): string {
  const cs = 29;
  const nR = pattern.length;
  const nC = Math.max(...pattern.map(r => r.length));
  const pl = 16, pt = 22, pb = 16;
  const w = pl + nC * cs + 1;
  const h = pt + nR * cs + 1 + pb;
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const cells: string[] = [];
  pattern.forEach((row, r) => {
    cells.push(`<text x="${pl - 3}" y="${pt + r * cs + cs / 2 + 4}" text-anchor="end" font-family="Arial,sans-serif" font-size="8" fill="#c4a07e">${nR - r}</text>`);
    row.forEach((sym, c) => {
      const x = pl + c * cs, y = pt + r * cs;
      const mx = x + cs / 2, my = y + cs / 2;
      let bg = "#fffaf0", inner = "";
      if (sym === "p")    { bg = "#ece5de"; inner = `<line x1="${mx-7}" y1="${my}" x2="${mx+7}" y2="${my}" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>`; }
      else if (sym === "k") { inner = `<polyline points="${mx-7},${my+6} ${mx},${my-5} ${mx+7},${my+6}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`; }
      else if (sym === "yo") { bg = "#fff8dc"; inner = `<circle cx="${mx}" cy="${my}" r="6.5" fill="none" stroke="${accent}" stroke-width="1.8"/>`; }
      else if (sym === "k2t") { inner = `<line x1="${mx-6}" y1="${my-7}" x2="${mx+4}" y2="${my+7}" stroke="${accent}" stroke-width="2.2"/><line x1="${mx}" y1="${my-7}" x2="${mx+4}" y2="${my+7}" stroke="${accent}" stroke-width="2.2"/>`; }
      else if (sym === "ssk") { inner = `<line x1="${mx+6}" y1="${my-7}" x2="${mx-4}" y2="${my+7}" stroke="${accent}" stroke-width="2.2"/><line x1="${mx}" y1="${my-7}" x2="${mx-4}" y2="${my+7}" stroke="${accent}" stroke-width="2.2"/>`; }
      else if (sym === "m1") { bg = "#fff8dc"; inner = `<line x1="${mx}" y1="${my-7}" x2="${mx}" y2="${my+7}" stroke="${accent}" stroke-width="1.8"/><line x1="${mx-7}" y1="${my}" x2="${mx+7}" y2="${my}" stroke="${accent}" stroke-width="1.8"/>`; }
      else if (sym === "sl") { inner = `<line x1="${mx-7}" y1="${my}" x2="${mx+7}" y2="${my}" stroke="${accent}" stroke-width="1.5" stroke-dasharray="3 2" stroke-linecap="round"/>`; }
      else if (sym === "cab") { bg = "#fce8d0"; inner = `<path d="M${mx-6},${my+6} Q${mx-2},${my-6} ${mx+6},${my}" fill="none" stroke="${accent}" stroke-width="2"/><path d="M${mx-6},${my} Q${mx+2},${my+6} ${mx+6},${my-6}" fill="none" stroke="${accent}" stroke-width="2"/>`; }
      else if (sym === "sc") { inner = `<line x1="${mx-6}" y1="${my-6}" x2="${mx+6}" y2="${my+6}" stroke="${accent}" stroke-width="2"/><line x1="${mx+6}" y1="${my-6}" x2="${mx-6}" y2="${my+6}" stroke="${accent}" stroke-width="2"/>`; }
      else if (sym === "hdc") { inner = `<line x1="${mx}" y1="${my-7}" x2="${mx}" y2="${my+7}" stroke="${accent}" stroke-width="2"/><line x1="${mx-5}" y1="${my-7}" x2="${mx+5}" y2="${my-7}" stroke="${accent}" stroke-width="2"/><line x1="${mx-3}" y1="${my-1}" x2="${mx+3}" y2="${my-1}" stroke="${accent}" stroke-width="1.5"/>`; }
      else if (sym === "dc") { inner = `<line x1="${mx}" y1="${my-8}" x2="${mx}" y2="${my+7}" stroke="${accent}" stroke-width="2"/><line x1="${mx-5}" y1="${my-8}" x2="${mx+5}" y2="${my-8}" stroke="${accent}" stroke-width="2"/><line x1="${mx-3}" y1="${my-3}" x2="${mx+3}" y2="${my-3}" stroke="${accent}" stroke-width="1.5"/><line x1="${mx-3}" y1="${my+2}" x2="${mx+3}" y2="${my+2}" stroke="${accent}" stroke-width="1.5"/>`; }
      else if (sym === "tr") { inner = `<line x1="${mx}" y1="${my-9}" x2="${mx}" y2="${my+7}" stroke="${accent}" stroke-width="2"/><line x1="${mx-5}" y1="${my-9}" x2="${mx+5}" y2="${my-9}" stroke="${accent}" stroke-width="2"/><line x1="${mx-3}" y1="${my-5}" x2="${mx+3}" y2="${my-5}" stroke="${accent}" stroke-width="1.5"/><line x1="${mx-3}" y1="${my}" x2="${mx+3}" y2="${my}" stroke="${accent}" stroke-width="1.5"/><line x1="${mx-3}" y1="${my+5}" x2="${mx+3}" y2="${my+5}" stroke="${accent}" stroke-width="1.5"/>`; }
      else if (sym === "ch") { bg = "#fff8dc"; inner = `<ellipse cx="${mx}" cy="${my}" rx="7" ry="5" fill="none" stroke="${accent}" stroke-width="1.8"/>`; }
      else if (sym === "slcr") { inner = `<circle cx="${mx}" cy="${my}" r="6" fill="none" stroke="${accent}" stroke-width="1.8"/><line x1="${mx-4}" y1="${my}" x2="${mx+4}" y2="${my}" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`; }
      else if (sym === "blo") { bg = "#ece5de"; inner = `<line x1="${mx-6}" y1="${my+3}" x2="${mx+6}" y2="${my+3}" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>`; }
      else if (sym === "bob") { bg = "#fce8d0"; inner = `<circle cx="${mx}" cy="${my}" r="7" fill="${accent}" opacity=".22"/><circle cx="${mx}" cy="${my}" r="4.5" fill="${accent}" opacity=".55"/>`; }
      else if (sym === "puf") { bg = "#fff8dc"; inner = `<circle cx="${mx}" cy="${my}" r="7.5" fill="none" stroke="${accent}" stroke-width="1.5"/><circle cx="${mx}" cy="${my}" r="4" fill="${accent}" opacity=".3"/>`; }
      cells.push(`<rect x="${x+.5}" y="${y+.5}" width="${cs-1}" height="${cs-1}" rx="2" fill="${bg}" stroke="#c4a07e" stroke-width=".6"/>${inner}`);
    });
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#faf7f2" rx="4"/><text x="${w/2}" y="15" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="${accent}">${safe(label)}</text>${cells.join("")}<text x="${pl}" y="${h - 3}" font-family="Arial,sans-serif" font-size="8" fill="#c4a07e">chart · RS rows read right to left · row 1 at bottom</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const k="k", p="p", yo="yo", k2t="k2t", ssk="ssk", m1="m1", sl="sl", cab="cab";
const sc_="sc", hdc_="hdc", dc_="dc", tr_="tr", ch="ch", slcr="slcr", blo="blo", bob="bob", puf="puf";
const R = (sym: string, n=5) => Array(n).fill(sym);

const DIAGS = {
  knit:       mkDiag([R(k),R(k),R(k),R(k)], "k — knit"),
  purl:       mkDiag([R(p),R(p),R(p),R(p)], "p — purl", "#6e88a8"),
  stockinette:mkDiag([R(k),R(p),R(k),R(p)], "St st — k RS, p WS"),
  garter:     mkDiag([R(k),R(k),R(k),R(k)], "Garter — knit every row", "#c9785c"),
  rib1x1:     mkDiag([[k,p,k,p,k],[k,p,k,p,k],[k,p,k,p,k],[k,p,k,p,k]], "1×1 Rib — k1 p1", "#6a9470"),
  rib2x2:     mkDiag([[k,k,p,p,k,k],[k,k,p,p,k,k],[k,k,p,p,k,k],[k,k,p,p,k,k]], "2×2 Rib — k2 p2", "#6a9470"),
  seed:       mkDiag([[k,p,k,p,k],[p,k,p,k,p],[k,p,k,p,k],[p,k,p,k,p]], "Seed — alt k/p each row", "#9e7a8a"),
  moss:       mkDiag([[k,p,k,p,k],[k,p,k,p,k],[p,k,p,k,p],[p,k,p,k,p]], "Moss — (k1 p1) × 2 rows", "#9e7a8a"),
  cable:      mkDiag([[cab,k,k,cab,k],[k,k,k,k,k],[k,cab,k,k,cab],[k,k,k,k,k]], "Cable — C4F / C4B", "#2e1f14"),
  cableWide:  mkDiag([[cab,cab,k,cab,cab],[k,k,k,k,k],[cab,cab,k,cab,cab],[k,k,k,k,k]], "Cable — C6F wide twist", "#2e1f14"),
  yoLace:     mkDiag([[k,yo,k2t,k,yo,k2t],[R(k).slice(0,6),[k,k,k,k,k,k]][0],[k,yo,k2t,k,yo,k2t],R(k)], "Lace — yo, k2tog", "#2c7be5"),
  k2togDec:   mkDiag([[k,k2t,k,k,k2t],[R(k)],[k,k2t,k,k,k2t],R(k)], "k2tog — right-leaning dec", "#c9785c"),
  sskDec:     mkDiag([[k,ssk,k,k,ssk],[R(k)],[k,ssk,k,k,ssk],R(k)], "ssk — left-leaning dec", "#c9785c"),
  m1Inc:      mkDiag([[k,m1,k,k,m1],[R(k)],[k,m1,k,k,m1],R(k)], "m1 — make 1 increase", "#4fae68"),
  slSt:       mkDiag([[sl,k,sl,k,sl],[R(k)],[sl,k,sl,k,sl],R(k)], "sl — slip stitch (knitting)"),
  brioche:    mkDiag([[k,p,k,p,k],[sl,yo,sl,yo,sl],[k,p,k,p,k],[sl,yo,sl,yo,sl]], "Brioche — brk / brp", "#9e7a8a"),
  shortRow:   mkDiag([[k,k,k,k,k],[k,k,k,sl],[k,k,k],[k,k,k,k]], "Short rows — W&T / DS"),
  fairIsle:   mkDiag([[k,p,k,p,k],[p,k,p,k,p],[k,p,k,p,k],[p,k,p,k,p]], "Fair Isle — MC / CC stranding", "#c9785c"),
  lacePanel:  mkDiag([[yo,k2t,k,yo,k2t],[R(k)],[k,yo,k2t,yo,k2t],R(k)], "Lace — yarn over pattern", "#2c7be5"),
  icord:      mkDiag([[k,k,k],[k,k,k],[k,k,k],[k,k,k]], "I-cord — 3-stitch tube"),
  sc:         mkDiag([R(sc_),R(sc_),R(sc_),R(sc_)], "sc — single crochet", "#6a9470"),
  slcrAll:    mkDiag([R(slcr),R(slcr),R(slcr),R(slcr)], "sl st — slip stitch (crochet)", "#8b6347"),
  hdcAll:     mkDiag([R(hdc_),R(hdc_),R(hdc_),R(hdc_)], "hdc — half double crochet", "#c9785c"),
  dcAll:      mkDiag([R(dc_),R(dc_),R(dc_),R(dc_)], "dc — double crochet", "#2c7be5"),
  trAll:      mkDiag([R(tr_),R(tr_),R(tr_),R(tr_)], "tr — treble crochet", "#a45ee5"),
  chainRow:   mkDiag([R(ch),R(ch)], "ch — foundation chain", "#8b6347"),
  magicRing:  mkDiag([[ch,ch,ch,ch,ch],[sc_,sc_,sc_,sc_,sc_],[sc_,sc_,sc_,sc_,sc_]], "Magic ring — adjustable loop start", "#6a9470"),
  dec2tog:    mkDiag([[sc_,sc_,k2t,sc_,sc_],[R(sc_)],[sc_,sc_,k2t,sc_,sc_],R(sc_)], "sc2tog / dc2tog decrease", "#c9785c"),
  bobbleD:    mkDiag([[sc_,bob,sc_,bob,sc_],[R(sc_)],[sc_,bob,sc_,bob,sc_],R(sc_)], "Bobble — 5 incomplete dc", "#c9785c"),
  puffD:      mkDiag([[sc_,puf,sc_,puf,sc_],[R(sc_)],[sc_,puf,sc_,puf,sc_],R(sc_)], "Puff — loopy cluster", "#e8c46a"),
  vStitch:    mkDiag([[ch,dc_,ch,dc_,ch],[sc_,sc_,sc_,sc_,sc_],[ch,dc_,ch,dc_,ch],R(sc_)], "V-stitch — dc ch-sp pairs", "#6a9470"),
  mossLinen:  mkDiag([[sc_,ch,sc_,ch,sc_],[ch,sc_,ch,sc_,ch],[sc_,ch,sc_,ch,sc_],[ch,sc_,ch,sc_,ch]], "Moss / linen — sc ch-1 grid", "#4fae68"),
  blobRib:    mkDiag([[blo,blo,blo,blo,blo],[blo,blo,blo,blo,blo],[blo,blo,blo,blo,blo],[blo,blo,blo,blo,blo]], "BLO ribbing — back-loop only", "#6a9470"),
  grannyD:    mkDiag([[ch,dc_,dc_,ch,ch],[dc_,dc_,dc_,dc_,dc_],[ch,dc_,dc_,ch,ch],[dc_,dc_,dc_,dc_,dc_]], "Granny square — dc clusters", "#4fae68"),
  shellD:     mkDiag([[sc_,dc_,dc_,dc_,sc_],[ch,ch,ch,ch,ch],[sc_,dc_,dc_,dc_,sc_],[ch,ch,ch,ch,ch]], "Shell — 5 dc fan", "#f26b5e"),
};

// Step-by-step instruction card SVG (distinct from chart notation diagrams above)
function mkStep(stepNum: number, instruction: string, accent = "#8b6347"): string {
  const W = 240;
  const CHAR_PER_LINE = 30;
  const words = instruction.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > CHAR_PER_LINE) { lines.push(cur); cur = w; }
    else { cur = cur ? cur + " " + w : w; }
  }
  if (cur) lines.push(cur);
  const H = Math.max(80, 48 + lines.length * 16);
  const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const linesSvg = lines.map((l, i) =>
    `<text x="48" y="${36 + i * 16}" font-family="Arial,sans-serif" font-size="11" fill="#3d2b1f">${esc(l)}</text>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#fffaf0" rx="8" stroke="${accent}" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="15" fill="${accent}"/>
    <text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white">${stepNum}</text>
    ${linesSvg}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const S = mkStep; // shorthand

export const STITCH_LIBRARY: StitchEntry[] = [
  // ─── KNITTING ────────────────────────────────────────────────────────────────
  {
    id: "knit",
    craftType: "knitting",
    name: "Knit stitch",
    abbreviation: "k",
    appearance: "Smooth V-shaped columns on the right side. The foundation of all knitted fabric.",
    useFor: "Stockinette, ribbing, colourwork, most garment bodies. Right-to-left on RS rows reads as knit when working flat charts.",
    tutorial: "Insert right needle front-to-back through the next stitch on the left needle. Wrap yarn counter-clockwise around the right needle, pull the new loop through, and slide the old stitch off. On a flat chart read right to left, an empty square = knit on the right side.",
    videoQuery: "how to knit stitch beginner continental english",
    imageUrl: DIAGS.knit,
    photoUrl: "https://www.craftyarncouncil.com/images/learn/mar06_knit1.jpg",
    tutorialImages: [
      "https://www.craftyarncouncil.com/images/learn/mar06_knit1.jpg",
      "https://www.craftyarncouncil.com/images/learn/mar06_knit2.jpg",
      "https://www.craftyarncouncil.com/images/learn/mar06_knit4.jpg",
    ],
    sourceUrl: "https://www.craftyarncouncil.com/mar06_knit.html",
  },
  {
    id: "purl",
    craftType: "knitting",
    name: "Purl stitch",
    abbreviation: "p",
    appearance: "Raised horizontal bumps on the right side — the reverse of knit. Together knit and purl make every texture possible.",
    useFor: "Wrong-side stockinette rows, reverse stockinette, ribbing, seed stitch. Left-to-right on WS rows, a blank square = purl.",
    tutorial: "Hold yarn in front. Insert right needle right-to-left through the stitch. Wrap yarn counter-clockwise, pull the loop back through, and slide the old stitch off. On WS rows (read left to right on a flat chart) a blank square = purl.",
    videoQuery: "how to purl stitch beginner",
    imageUrl: DIAGS.purl,
    photoUrl: "https://craftyarncouncil.com/images/learn/purl_diag30.jpg",
    tutorialImages: [
      "https://craftyarncouncil.com/images/learn/purl_diag30.jpg",
      "https://craftyarncouncil.com/images/learn/purl_diag31.jpg",
      "https://craftyarncouncil.com/images/learn/purl_diag33.jpg",
    ],
    sourceUrl: "https://craftyarncouncil.com/mar06_purl.html",
  },
  {
    id: "stockinette",
    craftType: "knitting",
    name: "Stockinette stitch",
    abbreviation: "St st",
    appearance: "Smooth knit V columns on the right side, purl bumps on the wrong side. The most common garment fabric. Curls at edges without a border.",
    useFor: "Sweater and cardigan bodies, sleeves, colourwork, and most classic garment fabric. Always add a non-curling edge: ribbing, garter, or seed stitch at hems and cuffs.",
    tutorial: "Flat: knit all RS rows, purl all WS rows. In the round: knit every round. On a flat chart, RS blank squares = knit; WS blank squares = purl (so the public side stays smooth).",
    videoQuery: "how to knit stockinette stitch flat and in the round",
    imageUrl: DIAGS.stockinette,
    tutorialImages: [
      S(1, "RS row: knit every stitch across the row."),
      S(2, "WS row: purl every stitch across the row."),
      S(3, "Repeat — RS knit, WS purl — for smooth V-column fabric."),
    ],
    sourceUrl: "https://sarahmaker.com/stockinette-stitch/",
  },
  {
    id: "garter",
    craftType: "knitting",
    name: "Garter stitch",
    abbreviation: "g st",
    appearance: "Horizontal ridges on both sides. Lays flat, does not curl, looks identical from front and back. Shorter row-height than stockinette.",
    useFor: "Borders, baby items, scarves, blankets, button bands, anywhere curl-free flat fabric is needed. Great first project stitch.",
    tutorial: "Knit every single row — no purling at all when worked flat. In the round, alternate one knit round and one purl round. Each visible ridge = 2 rows. No right side to worry about.",
    videoQuery: "how to knit garter stitch beginner",
    imageUrl: DIAGS.garter,
    tutorialImages: [
      S(1, "Knit every stitch on every row — no purling at all when worked flat."),
      S(2, "Each visible horizontal ridge equals 2 rows worked."),
      S(3, "In the round: alternate one knit round with one purl round."),
    ],
    sourceUrl: "https://sarahmaker.com/garter-stitch/",
  },
  {
    id: "ribbing",
    craftType: "knitting",
    name: "Ribbing (1×1 or 2×2)",
    abbreviation: "k1p1",
    appearance: "Stretchy vertical ridges that pull in, lie flatter than stockinette, and spring back when stretched. Elastic but neat.",
    useFor: "Hems, cuffs, collars, button bands, pocket tops. Add to any garment edge for elastic recovery and a professional finish.",
    tutorial: "1×1 rib: *k1, p1* across every row, always knitting the knits and purling the purls as they face you. 2×2 rib: *k2, p2* across, keeping the columns of knits directly above each other.",
    videoQuery: "how to knit 1x1 and 2x2 ribbing",
    imageUrl: DIAGS.rib1x1,
    tutorialImages: [
      S(1, "1x1: *knit 1, purl 1* across, moving yarn between needles each time."),
      S(2, "Every row: knit the knit columns and purl the purl bumps as they face you."),
      S(3, "2x2 rib: work *knit 2, purl 2* across, keeping columns aligned above each other."),
    ],
    sourceUrl: "https://sarahmaker.com/knit-ribbing/",
  },
  {
    id: "seed",
    craftType: "knitting",
    name: "Seed stitch",
    abbreviation: "seed",
    appearance: "Tiny alternating raised bumps on both sides — textured, reversible, does not curl. Looks like scattered seeds.",
    useFor: "Borders, button bands, collar edges, scarves, pocket tops, and garment bodies for subtle all-over texture.",
    tutorial: "*k1, p1* across row 1. Row 2 and all subsequent rows: purl the knits and knit the purls — the opposite of ribbing. If the stitch faces you as a knit column, purl it; if it's a purl bump, knit it.",
    videoQuery: "how to knit seed stitch moss stitch",
    imageUrl: DIAGS.seed,
    tutorialImages: [
      S(1, "Row 1: *knit 1, purl 1* across, moving yarn between needles."),
      S(2, "Row 2+: knit the PURLS and purl the KNITS — opposite of ribbing."),
      S(3, "Keep reversing every row — bumps alternate to create the seeded texture."),
    ],
    sourceUrl: "https://sarahmaker.com/knit-seed-stitch/",
  },
  {
    id: "moss",
    craftType: "knitting",
    name: "Moss stitch (double seed)",
    abbreviation: "moss",
    appearance: "Bolder textured bumps than seed stitch; worked over 4 rows so the offset creates a brick-like pattern.",
    useFor: "Cosy fabric for jackets, cardigans, scarves, and pillows. Thicker and more substantial than seed stitch.",
    tutorial: "Row 1 & 2: *k1, p1* across (same as ribbing). Row 3 & 4: *p1, k1* across (reversed). Repeat these 4 rows. The key difference from seed stitch: you knit two rows before switching.",
    videoQuery: "how to knit moss stitch double seed stitch",
    imageUrl: DIAGS.moss,
    tutorialImages: [
      S(1, "Rows 1 and 2: *knit 1, purl 1* across (same as 1x1 ribbing)."),
      S(2, "Rows 3 and 4: *purl 1, knit 1* across (the reversed offset)."),
      S(3, "Repeat these 4 rows — the offset shift creates bold brick-like bumps."),
    ],
    sourceUrl: "https://sarahmaker.com/knit-moss-stitch/",
  },
  {
    id: "cable",
    craftType: "knitting",
    name: "Cable stitch",
    abbreviation: "C4F/C4B",
    appearance: "Twisted rope-like columns standing out from a reverse-stockinette background. Can be wide or narrow ropes.",
    useFor: "Sweater panels, cardigans, scarves, hats, cushions — wherever bold sculptural texture is wanted.",
    tutorial: "Slip the first half of the cable stitches onto a cable needle. Hold cable needle in front (C4F, left-leaning twist) or behind (C4B, right-leaning twist). Knit the next stitches from the left needle, then knit the stitches from the cable needle. Repeat the cable row every 4th–8th row.",
    videoQuery: "how to knit cable stitch C4F C4B beginner",
    imageUrl: DIAGS.cable,
    tutorialImages: [
      S(1, "Slip half the cable stitches onto a cable needle and hold it aside."),
      S(2, "Hold in front (C4F, left-lean) or behind (C4B, right-lean), then knit from left needle."),
      S(3, "Knit the stitches from the cable needle to complete the twist."),
    ],
    sourceUrl: "https://nimble-needles.com/stitches/how-to-knit-the-cable-stitch/",
  },
  {
    id: "yarn-over",
    craftType: "knitting",
    name: "Yarn over (eyelet / lace)",
    abbreviation: "yo",
    appearance: "A deliberate open hole paired with a decrease. Creates lace patterns, eyelets for ties, and airy open fabric.",
    useFor: "Shawls, decorative yokes, buttonholes, lace panels, breathable summer knits, and any pattern needing an open eyelet.",
    tutorial: "Bring the yarn to the front (or wrap over the needle) to create an extra loop, then work the next stitch normally. The extra loop becomes a new stitch and leaves a hole. Pair yo with k2tog or ssk to keep the stitch count the same.",
    videoQuery: "how to knit yarn over eyelet lace decrease",
    imageUrl: DIAGS.yoLace,
    tutorialImages: [
      S(1, "Bring yarn to front between needles (or wrap over needle tip) to create an extra loop."),
      S(2, "Work the next stitch as written — the wrap counts as a new stitch with a hole."),
      S(3, "Pair each yo with a k2tog or ssk on the same row to keep stitch count the same."),
    ],
    sourceUrl: "https://sarahmaker.com/k2tog/",
  },
  {
    id: "k2tog",
    craftType: "knitting",
    name: "Decrease: k2tog & ssk",
    abbreviation: "k2tog / ssk",
    appearance: "Two stitches become one. k2tog leans right; ssk leans left. Paired on opposite sides for symmetrical shaping.",
    useFor: "Armhole, neckline, and raglan shaping; hat crown; sleeve cap; lace (paired with yarn-overs); toe of sock.",
    tutorial: "k2tog: insert right needle through the next 2 stitches together as if to knit, yarn over, pull through both — right-leaning. SSK: slip 2 stitches knitwise one at a time, insert left needle through their fronts and knit together through the back loop — left-leaning. Use both on the same row for a balanced mirror pair.",
    videoQuery: "how to knit k2tog ssk decrease shaping",
    imageUrl: DIAGS.k2togDec,
    tutorialImages: [
      S(1, "k2tog: insert needle through next 2 stitches together, knit — right-leaning decrease."),
      S(2, "ssk: slip 2 knitwise, insert left needle through fronts, knit together — left-leaning."),
      S(3, "Use k2tog on right edge and ssk on left edge for a symmetrical mirror pair."),
    ],
    sourceUrl: "https://sarahmaker.com/k2tog/",
  },
  {
    id: "increase",
    craftType: "knitting",
    name: "Increase: M1L, M1R & kfb",
    abbreviation: "m1 / kfb",
    appearance: "An extra stitch added to widen the fabric. M1 increases are nearly invisible; kfb leaves a small bar at the base.",
    useFor: "Sleeves (working from cuff up), raglans, shawl increases, mitten thumb gusset, top-down yokes, any place shaping widens.",
    tutorial: "M1L: pick up the bar between stitches from front to back, knit through the back loop (left-leaning, almost invisible). M1R: pick up the bar back to front, knit through the front (right-leaning). kfb: knit into the front AND back of one stitch, creating 2 — easy but leaves a tiny purl nub.",
    videoQuery: "how to increase knitting M1L M1R kfb make one",
    imageUrl: DIAGS.m1Inc,
    tutorialImages: [
      S(1, "M1L: pick up bar between stitches front-to-back, knit through back loop — left-leaning."),
      S(2, "M1R: pick up bar back-to-front, knit through front loop — right-leaning."),
      S(3, "kfb: knit into front AND back of one stitch — easy but leaves a small nub."),
    ],
    sourceUrl: "https://sarahmaker.com/ssk-knitting/",
  },
  {
    id: "slipped-stitch",
    craftType: "knitting",
    name: "Slipped stitch",
    abbreviation: "sl",
    appearance: "Elongated stitch or tidy chain-like edge depending on where the yarn is held when slipping.",
    useFor: "Clean scarf/button-band edges (sl 1 purlwise wyif), reinforced sock heels, mosaic colour patterns, and decorative elongated columns.",
    tutorial: "Move the next stitch from left needle to right needle WITHOUT working it. Always slip purlwise (needle tip right-to-left) unless instructed otherwise, to preserve the stitch orientation. Yarn in back (wyib) = knit-facing column; yarn in front (wyif) = a purl bump on the edge.",
    videoQuery: "how to slip stitch knitting purlwise edge wyif wyib",
    imageUrl: DIAGS.slSt,
    tutorialImages: [
      S(1, "Move next stitch from left needle to right WITHOUT working it."),
      S(2, "Always slip purlwise (right-to-left) unless pattern says otherwise."),
      S(3, "Yarn in back = knit-style column; yarn in front = purl bump on edge."),
    ],
    sourceUrl: "https://sarahmaker.com/ssk-knitting/",
  },
  {
    id: "brioche",
    craftType: "knitting",
    name: "Brioche stitch",
    abbreviation: "brk / brp",
    appearance: "Lofty, squishy, deeply textured ribs with a stretchy, pillow-like feel. Much thicker than standard ribbing.",
    useFor: "Scarves, cowls, sweater yokes and bodies, hats — anywhere you want extraordinary warmth, stretch, and texture.",
    tutorial: "Set-up: yo, sl1p (slip 1 purlwise with yarn in front, forming a loop over the slipped stitch). Brk (brioche knit): knit the slipped stitch together with its yarn-over. Brp (brioche purl): purl the slipped stitch together with its yo. Each stitch is only worked every other row, giving the squishy depth.",
    videoQuery: "how to knit brioche stitch beginner two-color",
    imageUrl: DIAGS.brioche,
    tutorialImages: [
      S(1, "Set-up: yarn over, slip 1 purlwise — each slipped stitch gets a yo draped over it."),
      S(2, "Brk (RS): knit the slipped stitch together with its yarn-over as one stitch."),
      S(3, "Brp (WS): purl the slipped stitch together with its yo — gives the lofty squishy depth."),
    ],
    sourceUrl: "https://nimble-needles.com/stitches/how-to-knit-the-brioche-stitch/",
  },
  {
    id: "short-rows",
    craftType: "knitting",
    name: "Short rows (W&T / German)",
    abbreviation: "w&t / DS",
    appearance: "A wedge of extra rows built into one section of the fabric — no visible holes when done correctly.",
    useFor: "Shoulder shaping, sock heels, bust darts, turning-the-heel of socks, curved hems, and 3D shaping in any garment.",
    tutorial: "Wrap & turn (W&T): knit/purl to the turning point, slip next stitch, bring yarn to opposite side, return stitch, turn work — the wrap hides the gap. German short row: turn work, slip first stitch, pull yarn firmly over needle creating a 'double stitch' (DS). On the return row, knit or purl the DS as one stitch.",
    videoQuery: "how to knit short rows wrap and turn German short row",
    imageUrl: DIAGS.shortRow,
    tutorialImages: [
      S(1, "W&T: knit to turn point, slip next stitch, move yarn opposite side, return stitch, turn."),
      S(2, "German: turn, slip first stitch, pull yarn firmly over needle to make a double stitch (DS)."),
      S(3, "Return row: work each wrap or double stitch as a single unit to close the gap."),
    ],
    sourceUrl: "https://sarahmaker.com/stockinette-stitch/",
  },
  {
    id: "stranded-colourwork",
    craftType: "knitting",
    name: "Stranded colourwork (Fair Isle)",
    abbreviation: "MC / CC",
    appearance: "Coloured patterns formed by carrying unused yarn loosely across the wrong side, creating floats. Right side shows crisp colour motifs.",
    useFor: "Yoke sweaters, fair isle bands, hat crowns, mittens, socks — any project with repeating two-colour geometric patterns.",
    tutorial: "Knit (usually in the round) using two yarn colours per round. Carry the unused colour loosely across the back — these are 'floats'. Spread your stitches on the right needle before catching long floats (over 5 stitches) to prevent puckering. Maintain even tension; loose floats = flat fabric.",
    videoQuery: "how to knit fair isle stranded colorwork floats beginner",
    imageUrl: DIAGS.fairIsle,
    tutorialImages: [
      S(1, "Hold MC and CC separately; knit each colour as the chart dictates each stitch."),
      S(2, "Carry the unused colour loosely across the wrong side — these are floats."),
      S(3, "Catch floats longer than 5 stitches by trapping unused yarn on the back mid-row."),
    ],
    sourceUrl: "https://nimble-needles.com/tutorials/fair-isle-knitting-tutorial-for-beginners/",
  },
  {
    id: "lace",
    craftType: "knitting",
    name: "Lace knitting",
    abbreviation: "yo k2tog ssk",
    appearance: "Open, delicate fabric with deliberate holes arranged in decorative patterns — leaf, diamond, horseshoe shapes.",
    useFor: "Shawls, stoles, wraps, yoke panels, borders, summer tops, and decorative hem edges.",
    tutorial: "Lace is made by pairing yarn-overs (which add a stitch and make a hole) with decreases (k2tog or ssk, which remove a stitch). The stitch count stays the same each row. RS rows work the patterned row; WS rows are often purled plain. Use a lifeline (thread a smooth yarn through all live stitches) every 10–20 rows so you can rip back safely.",
    videoQuery: "how to knit lace stitch beginner yarn over decrease",
    imageUrl: DIAGS.lacePanel,
    tutorialImages: [
      S(1, "RS rows: work the pattern — knit, yo, k2tog, ssk as charted."),
      S(2, "WS rows: purl all stitches plain (unless chart specifies otherwise)."),
      S(3, "Thread a lifeline through all live stitches every 10-20 rows as a safety net."),
    ],
    sourceUrl: "https://sarahmaker.com/k2tog/",
  },
  {
    id: "icord",
    craftType: "knitting",
    name: "I-cord",
    abbreviation: "i-cord",
    appearance: "A small knitted tube — like a very thin rope or cord. Smooth stockinette on the outside.",
    useFor: "Bag handles, button loops, ties on cardigans and hats, drawstrings, edging, attached i-cord borders.",
    tutorial: "Cast on 3–5 stitches on a double-pointed needle (or one tip of circulars). Knit across. WITHOUT TURNING, slide stitches to the other end of the needle and knit again, pulling yarn firmly from the right-hand side. The fabric rolls into a tube. Repeat until the cord is the desired length.",
    videoQuery: "how to knit I-cord double pointed needles",
    imageUrl: DIAGS.icord,
    tutorialImages: [
      S(1, "Cast on 3-5 stitches on a DPN or one tip of circulars."),
      S(2, "Knit all stitches. WITHOUT turning, slide stitches to the other needle end."),
      S(3, "Pull yarn firmly from right side and knit again — fabric rolls into a tube."),
    ],
    sourceUrl: "https://sarahmaker.com/knit-stitch/",
  },
  // ─── CROCHET ─────────────────────────────────────────────────────────────────
  {
    id: "magic-ring",
    craftType: "crocheting",
    name: "Magic ring (adjustable loop)",
    abbreviation: "MR",
    appearance: "An adjustable starting circle with no visible hole in the centre — cleaner than a starting chain.",
    useFor: "Starting granny squares, amigurumi, hats worked in the round from the crown down, any circular motif.",
    tutorial: "Loop yarn around two fingers, right side up, leaving a 6-inch tail. Insert hook through the loop, pull up a loop of working yarn, chain 1 to anchor. Work your first-round stitches into the ring. After the round, pull the yarn tail to close the centre hole tightly.",
    videoQuery: "how to crochet magic ring adjustable loop beginner",
    imageUrl: DIAGS.magicRing,
    tutorialImages: [
      S(1, "Loop yarn around two fingers right side up, leaving a 6-inch tail."),
      S(2, "Insert hook through loop, pull up working yarn, chain 1 to anchor the ring."),
      S(3, "Work first-round stitches into the ring, then pull tail to close the centre hole."),
    ],
    sourceUrl: "https://sarahmaker.com/crochet-magic-ring/",
  },
  {
    id: "single-crochet",
    craftType: "crocheting",
    name: "Single crochet",
    abbreviation: "sc",
    appearance: "Dense, firm fabric with short compact stitches and a tight, even texture.",
    useFor: "Bags, amigurumi, dense garment panels, edging, and through back loop only for stretchy ribbing effect.",
    tutorial: "Insert hook into stitch, yarn over and pull up a loop (2 loops on hook), yarn over and pull through both loops to complete. Chain 1 to turn (the turning chain does NOT count as a stitch in sc unless the pattern says so).",
    videoQuery: "how to single crochet beginner turning chain",
    imageUrl: DIAGS.sc,
    photoUrl: "https://media.craftyarncouncil.com/images/learn/single_crochet_5.jpg",
    tutorialImages: [
      "https://media.craftyarncouncil.com/images/learn/single_crochet_5.jpg",
      "https://media.craftyarncouncil.com/images/learn/single_crochet_9.jpg",
      "https://media.craftyarncouncil.com/images/learn/single_crochet_12.jpg",
    ],
    sourceUrl: "https://media.craftyarncouncil.com/mar06_crochet.html",
  },
  {
    id: "slip-stitch-crochet",
    craftType: "crocheting",
    name: "Slip stitch",
    abbreviation: "sl st",
    appearance: "Very short, flat stitch with almost no height. Almost invisible.",
    useFor: "Joining rounds, seams, moving across stitches without height, decorative surface lines, and working a seamless join.",
    tutorial: "Insert hook into the stitch, yarn over, pull through the stitch AND the loop on the hook in one motion. Keep the loop relaxed — tight slip stitches will pucker the work. Use a larger hook for slip-stitch seams.",
    videoQuery: "how to crochet slip stitch join round seam",
    imageUrl: DIAGS.slcrAll,
    tutorialImages: [
      S(1, "Insert hook into the stitch, yarn over."),
      S(2, "Pull through the stitch AND the loop on hook in one single motion."),
      S(3, "Keep the loop relaxed — tight slip stitches cause visible puckering."),
    ],
    sourceUrl: "https://sarahmaker.com/slip-stitch/",
  },
  {
    id: "half-double-crochet",
    craftType: "crocheting",
    name: "Half double crochet",
    abbreviation: "hdc",
    appearance: "Medium-height stitches with a characteristic third loop on the back; slightly softer than sc.",
    useFor: "Sweaters, hats, quick textured panels — a good balance of speed and density. The back loop creates a natural ribbing effect.",
    tutorial: "Yarn over, insert hook into stitch, yarn over again and pull up a loop (3 loops on hook), yarn over once more and pull through ALL three loops in one move. Chain 2 to turn (usually counts as first hdc).",
    videoQuery: "how to half double crochet beginner hdc third loop",
    imageUrl: DIAGS.hdcAll,
    tutorialImages: [
      S(1, "Yarn over, insert hook into stitch, yarn over and pull up a loop (3 loops on hook)."),
      S(2, "Yarn over once more and pull through ALL three loops in one motion."),
      S(3, "Chain 2 to turn at row end — usually counts as the first hdc."),
    ],
    sourceUrl: "https://sarahmaker.com/half-double-crochet/",
  },
  {
    id: "double-crochet",
    craftType: "crocheting",
    name: "Double crochet",
    abbreviation: "dc",
    appearance: "Tall stitches with faster row growth, visible post, and gentle drape.",
    useFor: "Drapey garments, shawls, blankets, granny squares, lace-like textures, and fast-growing fabric.",
    tutorial: "Yarn over, insert hook into stitch, pull up a loop (3 loops on hook). Yarn over and pull through first 2 loops (2 loops remain). Yarn over again and pull through the final 2 loops. Chain 3 to turn — usually counts as first dc.",
    videoQuery: "how to double crochet beginner dc step by step",
    imageUrl: DIAGS.dcAll,
    photoUrl: "https://media.craftyarncouncil.com/images/learn/dbl_croc_diag31_18.jpg",
    tutorialImages: [
      "https://media.craftyarncouncil.com/images/learn/dbl_croc_diag28_18.jpg",
      "https://media.craftyarncouncil.com/images/learn/dbl_croc_diag31_18.jpg",
      "https://media.craftyarncouncil.com/images/learn/dbl_croc_diag32_18.jpg",
    ],
    sourceUrl: "https://media.craftyarncouncil.com/mar06_dc.html",
  },
  {
    id: "treble-crochet",
    craftType: "crocheting",
    name: "Treble crochet",
    abbreviation: "tr",
    appearance: "Very tall stitches with strong drape and clear vertical posts. The tallest basic stitch.",
    useFor: "Lace shawls, open cardigans, airy scarves, mesh panels, V-stitches, and any pattern needing open height.",
    tutorial: "Yarn over TWICE, insert hook, pull up a loop (4 loops on hook). *Yarn over, pull through 2 loops* — repeat 3 times total until 1 loop remains. Chain 4 to turn.",
    videoQuery: "how to treble crochet stitch beginner tr",
    imageUrl: DIAGS.trAll,
    tutorialImages: [
      S(1, "Yarn over TWICE, insert hook, pull up a loop (4 loops on hook)."),
      S(2, "*Yarn over, pull through 2 loops* — repeat until 2 loops remain."),
      S(3, "Yarn over and pull through final 2 loops. Chain 4 to turn."),
    ],
    sourceUrl: "https://sarahmaker.com/treble-crochet/",
  },
  {
    id: "crochet-decrease",
    craftType: "crocheting",
    name: "Decrease: sc2tog & dc2tog",
    abbreviation: "sc2tog / dc2tog",
    appearance: "Two stitches joined into one, narrowing the fabric smoothly.",
    useFor: "Armhole shaping, necklines, hat crown decreases, sleeve caps, amigurumi, toe shaping in socks.",
    tutorial: "sc2tog: *insert hook, pull up loop* in next stitch, repeat in following stitch (3 loops on hook), yarn over and pull through all 3 loops. dc2tog: work a dc in each of the next 2 stitches but stop before the final pull-through of each, then yarn over and pull through all 3 remaining loops to join them.",
    videoQuery: "how to decrease crochet sc2tog dc2tog shaping",
    imageUrl: DIAGS.dec2tog,
    tutorialImages: [
      S(1, "sc2tog: *insert hook, pull up loop* in next stitch, repeat in following stitch."),
      S(2, "Yarn over and pull through all 3 loops on hook to join into one stitch."),
      S(3, "dc2tog: work incomplete dc in each of 2 stitches, join with final pull-through."),
    ],
    sourceUrl: "https://sarahmaker.com/single-crochet/",
  },
  {
    id: "bobble-stitch",
    craftType: "crocheting",
    name: "Bobble stitch",
    abbreviation: "bob",
    appearance: "A rounded 3D bump popping out of the fabric surface, worked from the right side but appearing on the wrong side.",
    useFor: "Texture on baby blankets, bags, cushions, cardigan fronts, and anywhere eye-catching tactile detail is wanted.",
    tutorial: "Work 5 incomplete dc all into the SAME stitch: *yarn over, insert, pull up loop, yarn over, pull through 2 loops* — repeat 5 times (6 loops on hook). Yarn over and pull through all 6 loops at once to close the bobble. The bump appears on the opposite side to where you're working.",
    videoQuery: "how to crochet bobble stitch texture beginner",
    imageUrl: DIAGS.bobbleD,
    tutorialImages: [
      S(1, "*Yarn over, insert, pull up loop, yarn over, pull through 2* into same stitch — repeat 5 times."),
      S(2, "Yarn over and pull through all 6 loops at once to close the bobble."),
      S(3, "Push the bump through — it appears on the side opposite to where you are working."),
    ],
    sourceUrl: "https://sarahmaker.com/crochet-bobble-stitch/",
  },
  {
    id: "puff-stitch",
    craftType: "crocheting",
    name: "Puff stitch",
    abbreviation: "puff",
    appearance: "A soft rounded puff — fuller and rounder than a bobble, with a more pillowy texture.",
    useFor: "Decorative motifs, pillow covers, baby items, hat crowns, and textured garment panels.",
    tutorial: "*Yarn over, insert hook in stitch, pull up a long loop* — repeat 4–5 times in the same stitch (9–11 loops on hook). Yarn over and pull through ALL loops, then chain 1 to close and secure the puff. Work loosely or go up a hook size so the puff isn't too tight.",
    videoQuery: "how to crochet puff stitch soft texture beginner",
    imageUrl: DIAGS.puffD,
    tutorialImages: [
      S(1, "*Yarn over, insert hook, pull up a long loop* in same stitch — repeat 4-5 times."),
      S(2, "Yarn over and pull through ALL loops on hook in one motion."),
      S(3, "Chain 1 to close and secure the puff. Work loosely or go up a hook size."),
    ],
    sourceUrl: "https://sarahmaker.com/crochet-puff-stitch/",
  },
  {
    id: "v-stitch",
    craftType: "crocheting",
    name: "V-stitch (fan & lace)",
    abbreviation: "V-st",
    appearance: "Open, lacy fabric with V-shaped pairs of stitches separated by chain spaces — airy and decorative.",
    useFor: "Shawls, scarves, cardigans, market bags, summer tops, and any project needing a lightweight open fabric.",
    tutorial: "Work 2 dc and ch 1 (or 2) into the same stitch or chain space — this unit is the V-stitch. On the next row, work each V-stitch into the chain space of the V below. The chain between the two dc is the defining gap of the stitch.",
    videoQuery: "how to crochet V-stitch lace fan stitch beginner",
    imageUrl: DIAGS.vStitch,
    tutorialImages: [
      S(1, "Work 2 dc and ch 1 all into the same stitch or chain space — this is one V-stitch."),
      S(2, "Skip 2 stitches on either side before working the next V-stitch."),
      S(3, "Following rows: work each new V-stitch into the ch-1 space of the V below."),
    ],
    sourceUrl: "https://sarahmaker.com/treble-crochet/",
  },
  {
    id: "crochet-moss",
    craftType: "crocheting",
    name: "Crochet moss / linen stitch",
    abbreviation: "sc ch-1",
    appearance: "Small woven-looking texture with gentle drape and a neat grid-like pattern. Resembles woven fabric.",
    useFor: "Blankets, scarves, easy garments, dishcloths, and colour stripes that look polished and deliberate.",
    tutorial: "Row 1: *sc in next stitch, ch 1, skip 1 stitch* across. Row 2 onwards: sc into each chain space, ch 1, skip the sc below — always working sc into the space, never into the sc. Keep chains loose for even fabric.",
    videoQuery: "how to crochet moss stitch linen stitch beginner",
    imageUrl: DIAGS.mossLinen,
    tutorialImages: [
      S(1, "Row 1: *sc in stitch, ch 1, skip 1 stitch* across the row."),
      S(2, "Row 2+: sc into each ch-1 space, ch 1, skip the sc below — always into the space."),
      S(3, "Keep chains loose for an even woven-looking grid fabric."),
    ],
    sourceUrl: "https://sarahmaker.com/single-crochet/",
  },
  {
    id: "crochet-ribbing",
    craftType: "crocheting",
    name: "Back-loop ribbing (BLO)",
    abbreviation: "BLO sc",
    appearance: "Stretchy vertical ridges very similar to knitted ribbing — worked sideways so the ridge runs vertically.",
    useFor: "Cuffs, hems, collars, button bands, pocket tops — any edge needing elastic recovery and a neat finish.",
    tutorial: "Chain the rib height (e.g. 8 ch for a 2-inch band). Row 1: sc in 2nd chain from hook and each chain. Row 2+: chain 1, sc through the BACK LOOP ONLY of every stitch. Work to the needed circumference length, then seam the short ends and attach to the garment edge.",
    videoQuery: "how to crochet ribbing back loop only BLO single crochet",
    imageUrl: DIAGS.blobRib,
    tutorialImages: [
      S(1, "Chain the rib height (e.g. 8 ch for a 2-inch cuff band)."),
      S(2, "Row 1: sc in 2nd chain from hook and each chain across."),
      S(3, "Row 2+: chain 1, sc through BACK LOOP ONLY of every stitch for stretchy ridges."),
    ],
    sourceUrl: "https://sarahmaker.com/half-double-crochet/",
  },
  {
    id: "granny-square",
    craftType: "crocheting",
    name: "Granny square",
    abbreviation: "granny",
    appearance: "Classic open-weave square motif with clusters of double crochets and corner chain spaces. Infinitely combinable.",
    useFor: "Blankets, bags, garment panels, patchwork cardigans, join-as-you-go projects, colourful scrappy works.",
    tutorial: "Start with a magic ring or ch 4, join. Round 1: ch 3 (= 1 dc), 2 dc in ring, ch 2, *3 dc in ring, ch 2* 3 times, join. Each subsequent round: join at any corner ch-sp, ch 3, work 3 dc into the same corner sp, ch 1; work *3 dc, ch 1* into each side sp; work *3 dc, ch 2, 3 dc* at each corner; join. Fasten off and weave ends before joining squares.",
    videoQuery: "how to crochet granny square beginner join as you go",
    imageUrl: DIAGS.grannyD,
    tutorialImages: [
      S(1, "Start: magic ring or ch 4, join. Rnd 1: work groups of 3 dc with ch-2 at each corner."),
      S(2, "Each round: work 3 dc into corner ch-spaces and 3 dc into each side chain space."),
      S(3, "Work *3 dc, ch 2, 3 dc* at every corner to grow and keep corners flat."),
    ],
    sourceUrl: "https://sarahmaker.com/crochet-a-granny-square/",
  },
  {
    id: "shell-stitch",
    craftType: "crocheting",
    name: "Shell stitch",
    abbreviation: "shell",
    appearance: "Fan-shaped clusters of double crochets that create scalloped, flowing texture along rows.",
    useFor: "Blanket borders, shawls, cardigans with decorative edges, baby items, scarves, and feminine textured panels.",
    tutorial: "Work 5 dc all into the same stitch or chain space — this fan is the shell. Skip 2 stitches on either side of each shell so the fabric spreads naturally without buckling. On the next row, work the next shell's centre stitch into the middle (3rd) dc of the shell below.",
    videoQuery: "how to crochet shell stitch beginner fan stitch",
    imageUrl: DIAGS.shellD,
    tutorialImages: [
      S(1, "Work 5 dc all into the same stitch or chain space — this fan is one shell."),
      S(2, "Skip 2 stitches on either side of each shell so fabric spreads without buckling."),
      S(3, "Next row: work the next shell centred on the 3rd (middle) dc of the shell below."),
    ],
    sourceUrl: "https://sarahmaker.com/crochet-shell-stitch/",
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
    garmentType === "Throw Blanket" ? 2200 :
    garmentType === "Baby Blanket" ? 800 :
    garmentType === "Scarf" ? 450 :
    garmentType === "Cowl" ? 320 :
    garmentType === "Gloves" || garmentType === "Mittens" ? 260 :
    garmentType === "Tote Bag" ? 650 :
    garmentType === "Dishcloth" ? 120 :
    garmentType === "Headband" ? 120 :
    garmentType === "Leg Warmers" ? 520 :
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
  const vestH = Math.round((bySize.length - 1.5) * rows);
  const gloveW = Math.round(7 * sts);
  const gloveH = Math.round(7.5 * rows);

  return {
    Sweater: { sections: [{ name: "Back", w: backW, h: bodyH }, { name: "Front", w: backW, h: bodyH }, { name: "Neckband", w: Math.round(backW * 0.72), h: Math.round(rows * 2.5) }, { name: "Left Sleeve", w: sleeveW, h: sleeveH }, { name: "Right Sleeve", w: sleeveW, h: sleeveH }] },
    Cardigan: { sections: [{ name: "Back", w: backW, h: bodyH }, { name: "Front Right", w: frontW, h: bodyH }, { name: "Front Left", w: frontW, h: bodyH }, { name: "Button Band", w: Math.max(8, Math.round(sts * 2)), h: bodyH }, { name: "Neckband", w: Math.round(backW * 0.76), h: Math.round(rows * 2.5) }, { name: "Left Sleeve", w: sleeveW, h: sleeveH }, { name: "Right Sleeve", w: sleeveW, h: sleeveH }, { name: "Pocket", w: Math.round(sts * 5), h: Math.round(rows * 4) }] },
    Vest: { sections: [{ name: "Back", w: backW, h: vestH }, { name: "Front", w: backW, h: vestH }, { name: "Neckband", w: Math.round(backW * 0.72), h: Math.round(rows * 2) }, { name: "Armhole Bands", w: Math.round(backW * 0.44), h: Math.round(rows * 2) }] },
    "Tank Top": { sections: [{ name: "Back", w: backW, h: vestH }, { name: "Front", w: backW, h: vestH }, { name: "Neckband", w: Math.round(backW * 0.62), h: Math.round(rows * 1.8) }, { name: "Armhole Bands", w: Math.round(backW * 0.38), h: Math.round(rows * 1.8) }] },
    Hat: { sections: [{ name: "Hat Body", w: Math.round(20 * sts), h: Math.round(8 * rows) }, { name: "Brim", w: Math.round(20 * sts), h: Math.round(2.5 * rows) }] },
    Scarf: { sections: [{ name: "Scarf", w: Math.round(8 * sts), h: Math.round(55 * rows) }] },
    Cowl: { sections: [{ name: "Cowl Body", w: Math.round(24 * sts), h: Math.round(12 * rows) }] },
    Socks: { sections: [{ name: "Leg", w: Math.round(8 * sts), h: Math.round(7 * rows) }, { name: "Heel Flap", w: Math.round(4 * sts), h: Math.round(3 * rows) }, { name: "Foot", w: Math.round(8 * sts), h: Math.round(8 * rows) }, { name: "Toe", w: Math.round(8 * sts), h: Math.round(2.5 * rows) }] },
    Mittens: { sections: [{ name: "Hand", w: Math.round(7 * sts), h: Math.round(8 * rows) }, { name: "Thumb", w: Math.round(3 * sts), h: Math.round(3.5 * rows) }, { name: "Cuff", w: Math.round(7 * sts), h: Math.round(2.5 * rows) }] },
    Gloves: { sections: [{ name: "Hand", w: gloveW, h: gloveH }, { name: "Fingers", w: gloveW, h: Math.round(2.7 * rows) }, { name: "Thumb", w: Math.round(3 * sts), h: Math.round(3.5 * rows) }, { name: "Cuff", w: gloveW, h: Math.round(2.5 * rows) }] },
    Shawl: { sections: [{ name: "Shawl Body", w: Math.round(32 * sts), h: Math.round(16 * rows) }] },
    "Baby Blanket": { sections: [{ name: "Blanket", w: Math.round(30 * sts), h: Math.round(34 * rows) }] },
    "Throw Blanket": { sections: [{ name: "Blanket", w: Math.round(42 * sts), h: Math.round(54 * rows) }] },
    "Tote Bag": { sections: [{ name: "Front", w: Math.round(13 * sts), h: Math.round(15 * rows) }, { name: "Back", w: Math.round(13 * sts), h: Math.round(15 * rows) }, { name: "Base", w: Math.round(13 * sts), h: Math.round(4 * rows) }, { name: "Straps", w: Math.round(2 * sts), h: Math.round(18 * rows) }] },
    Dishcloth: { sections: [{ name: "Cloth", w: Math.round(9 * sts), h: Math.round(9 * rows) }] },
    Headband: { sections: [{ name: "Headband", w: Math.round(20 * sts), h: Math.round(3.5 * rows) }] },
    "Leg Warmers": { sections: [{ name: "Left Leg Warmer", w: Math.round(12 * sts), h: Math.round(16 * rows) }, { name: "Right Leg Warmer", w: Math.round(12 * sts), h: Math.round(16 * rows) }, { name: "Cuffs", w: Math.round(12 * sts), h: Math.round(2.5 * rows) }] },
  };
}

export function getStitchGraph(craftType: CraftType) {
  return STITCH_LIBRARY.filter((entry) => entry.craftType === craftType);
}

function lessonImage(craftType: CraftType, id: string): string | undefined {
  const entry = getStitchGraph(craftType).find((item) => item.id === id);
  return entry ? stitchDisplayImage(entry) : undefined;
}

export function getRibbingReference(craftType: CraftType): QuickReferenceGroup {
  return craftType === "crocheting"
    ? {
        title: "Crochet ribbing",
        items: [
          { title: "Back-loop sc rib (most common)", detail: "Work single crochet through the back loop only, turning each row. Work sideways to the needed length, then join the short edges to cuffs, hems, collars, or bands with a slip-stitch seam.", imageUrl: lessonImage("crocheting", "crochet-ribbing"), sourceUrl: "/learn#learn-crochet-ribbing" },
          { title: "Front/back-post rib", detail: "Alternate FPdc and BPdc for a raised, stretchy post-stitch rib. Great for cuffs and collars - the posts grip the fabric and prevent flaring.", imageUrl: lessonImage("crocheting", "double-crochet"), sourceUrl: "/learn#learn-crochet-ribbing" },
          { title: "How ribbing fits in", detail: "For a cardigan: work the rib band separately and join it to the hem and cuffs. The rib height is typically 2-3 inches (5-7.5 cm).", sourceUrl: "/learn#learn-crochet-ribbing" },
        ],
      }
    : {
        title: "Knitted ribbing",
        items: [
          { title: "1x1 rib - *k1, p1*", detail: "Alternate one knit and one purl stitch across. On subsequent rows, knit the knits and purl the purls as they face you. Elastic and tidy - perfect for all edges.", imageUrl: lessonImage("knitting", "ribbing"), sourceUrl: "/learn#learn-ribbing" },
          { title: "2x2 rib - *k2, p2*", detail: "Bolder, stretchier columns. Keep the knit columns directly above the knit columns from the previous row. Most common for cuffs and hems on chunky garments.", imageUrl: lessonImage("knitting", "ribbing"), sourceUrl: "/learn#learn-ribbing" },
          { title: "How ribbing fits in", detail: "For a cardigan: cast on the hem, work 1-2 inches of ribbing, then switch to stockinette. For cuffs: cast on fewer stitches in rib, then increase when you switch to the sleeve body.", sourceUrl: "/learn#learn-ribbing" },
        ],
      };
}
