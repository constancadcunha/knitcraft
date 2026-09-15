/**
 * Craft-correct wording.
 *
 * The old engine "supported crochet" by swapping four strings inside one
 * knitting code path, so a crochet pattern told the maker to "bind off", to
 * "decrease 1 stitches at each end of every RS row", and to work ribbing that
 * does not exist in crochet. Crochet is not knitting with different words: it
 * has turning chains, it has no right-side/wrong-side shaping convention, its
 * stitches have declared heights, and US and UK terms name different stitches.
 *
 * Everything a construction says out loud goes through a `Voice`, so a
 * construction is written once and reads correctly in both crafts.
 *
 * US CROCHET TERMS THROUGHOUT (sc / hdc / dc / tr), stated explicitly in the
 * pattern notes — the same abbreviation means a different stitch in UK terms
 * and an unlabelled pattern is the single commonest source of crochet errata.
 */

import {
  CROCHET_TERMS,
  KNIT_TERMS,
  type Craft,
  type ShapingTerms,
  plural,
} from "../knit";
import type { WorkedAs } from "./types";

/** The crochet stitch a garment's fabric is built from. */
export type CrochetStitch = "sc" | "hdc" | "dc";

/**
 * Turning-chain height, in "chain units", and the number of chains that stands
 * in for the stitch at the start of a row. sl st 0.25, sc 1, hdc 2, dc 3, tr 4.
 * Row gauge is derivable from this, which is why it is data and not prose.
 */
export const CROCHET_STITCH_HEIGHT: Record<CrochetStitch, number> = {
  sc: 1,
  hdc: 2,
  dc: 3,
};

export const CROCHET_STITCH_NAME: Record<CrochetStitch, string> = {
  sc: "single crochet",
  hdc: "half double crochet",
  dc: "double crochet",
};

export interface Voice {
  readonly craft: Craft;
  readonly terms: ShapingTerms;
  /** The crochet stitch in use; undefined for knitting. */
  readonly stitch?: CrochetStitch;
  /** "st" / "sts". */
  readonly st: string;
  readonly sts: string;
  /** "row"/"rows" when flat, "round"/"rounds" when worked in the round. */
  row(worked: WorkedAs): string;
  rows(worked: WorkedAs): string;
  /** "Row 7 (RS)" / "Rnd 7" / "Row 7". */
  rowLabel(n: number, worked: WorkedAs, startSide?: "RS" | "WS"): string;
  /** "Cast on 88 sts." / "Ch 89 (88 sts + 1 turning ch)." */
  castOn(n: number, worked: WorkedAs): string;
  /** "Bind off" / "Fasten off". */
  bindOff: string;
  /** "Bind off 88 sts." / "Fasten off." */
  bindOffAll(n: number): string;
  /** Plain-fabric instruction: "knit" / "sc in each st". */
  plain: string;
  /** The abbreviation for one plain stitch: "k" / "sc". */
  plainAbbr: string;
  /** "Work N rows even in stockinette." / "Work N rows even in sc." */
  workEven(n: number, worked: WorkedAs): string;
  /** How the ribbed/edge fabric is described in this craft. */
  ribName: string;
  ribInstruction(sts: number, worked: WorkedAs): string;
  /** "Pick up and knit N sts along ..." / "Work N sc evenly along ...". */
  pickUp(n: number, edge: string): string;
  /** Decrease/increase abbreviations. */
  dec: string;
  inc: string;
  /** "(58 sts)" */
  count(n: number): string;
  /** Craft-appropriate note lines that belong in every pattern of this craft. */
  readonly notes: readonly string[];
}

function knittingVoice(): Voice {
  const terms = KNIT_TERMS;
  return {
    craft: "knitting",
    terms,
    st: "st",
    sts: "sts",
    row: (worked) => (worked === "round" ? "round" : "row"),
    rows: (worked) => (worked === "round" ? "rounds" : "rows"),
    rowLabel(n, worked, startSide = "RS") {
      if (worked === "round") return `Rnd ${n}`;
      // Flat knitting alternates sides from row 1; the side matters because a
      // chart symbol and a decrease are both worked differently on a WS row.
      const side = n % 2 === 1 ? startSide : startSide === "RS" ? "WS" : "RS";
      return `Row ${n} (${side})`;
    },
    castOn: (n) => `Cast on ${plural(n, "st", "sts")}.`,
    bindOff: "bind off",
    bindOffAll: (n) => `Bind off all ${plural(n, "st", "sts")}.`,
    plain: "knit",
    plainAbbr: "k",
    workEven: (n, worked) =>
      `Work ${plural(n, worked === "round" ? "round" : "row")} even in stockinette${worked === "round" ? "" : " (knit on RS, purl on WS)"}.`,
    ribName: "2x2 rib",
    ribInstruction: (sts, worked) =>
      worked === "round"
        ? `Work in 2x2 rib (*k2, p2; rep from * around) over ${plural(sts, "st", "sts")}.`
        : `Work in 2x2 rib (RS: k2, *p2, k2; rep from *. WS: p2, *k2, p2; rep from *) over ${plural(sts, "st", "sts")}.`,
    pickUp: (n, edge) => `Pick up and knit ${plural(n, "st", "sts")} along ${edge}.`,
    dec: "k2tog",
    inc: "M1",
    count: (n) => `(${plural(n, "st", "sts")})`,
    notes: [
      "Worked with the right side facing on odd-numbered rows unless a section says otherwise.",
      "Slip the first stitch of every row purlwise with the yarn at the wrong side to make a tidy chain selvedge for seaming and picking up.",
    ],
  };
}

function crochetVoice(stitch: CrochetStitch): Voice {
  const terms = CROCHET_TERMS;
  const abbr = stitch;
  const tch = CROCHET_STITCH_HEIGHT[stitch];
  return {
    craft: "crochet",
    terms: { ...terms, plainAbbr: abbr, decreaseAbbr: `${abbr}2tog`, increaseAbbr: `2 ${abbr} in next st` },
    stitch,
    st: "st",
    sts: "sts",
    row: (worked) => (worked === "round" ? "round" : "row"),
    rows: (worked) => (worked === "round" ? "rounds" : "rows"),
    // Crochet has no right-side/wrong-side shaping convention: a row is a row,
    // and every round of a spiral is worked with the same face towards you.
    rowLabel: (n, worked) => (worked === "round" ? `Rnd ${n}` : `Row ${n}`),
    castOn(n, worked) {
      if (worked === "round") {
        return `Ch ${n}, taking care not to twist, join with sl st to the first ch to form a ring. ${plural(n, "st", "sts")}.`;
      }
      // The turning chain does NOT count as a stitch anywhere in this pattern
      // (declared in `notes`), so the foundation chain is exactly N + 1: N for
      // the stitches and 1 to get the hook up to the height of the first row.
      const foundation = n + (stitch === "sc" ? 1 : tch);
      return `Ch ${foundation}. Work ${abbr} in the ${stitch === "sc" ? "2nd" : `${tch + 1}th`} ch from the hook and in each ch across. ${plural(n, "st", "sts")}.`;
    },
    bindOff: "fasten off",
    bindOffAll: () => "Fasten off, leaving a tail for seaming.",
    plain: `${abbr} in each st`,
    plainAbbr: abbr,
    workEven: (n, worked) =>
      worked === "round"
        ? `Work ${plural(n, "round")} even: ${abbr} in each st around.`
        : `Work ${plural(n, "row")} even: ch ${tch} (does not count as a st), turn, ${abbr} in each st across.`,
    // Crochet has no knitted rib. The standard equivalents are working into the
    // back loop only (a ridged, stretchy edge) and front/back post ribbing.
    ribName: stitch === "sc" ? "back-loop single crochet ribbing" : "front-post/back-post ribbing",
    ribInstruction: (sts, worked) =>
      stitch === "sc"
        ? `Work in back-loop sc ribbing (sc in the back loop only of each st) over ${plural(sts, "st", "sts")}${worked === "round" ? " around" : " across"}.`
        : `Work in post ribbing (*fpdc in next st, bpdc in next st; rep from *) over ${plural(sts, "st", "sts")}${worked === "round" ? " around" : " across"}.`,
    pickUp: (n, edge) => `Work ${plural(n, `${abbr} st`, `${abbr} sts`)} evenly along ${edge}.`,
    dec: `${abbr}2tog`,
    inc: `2 ${abbr} in next st`,
    count: (n) => `(${plural(n, "st", "sts")})`,
    notes: [
      "US crochet terms throughout (sc = single crochet, hdc = half double crochet, dc = double crochet).",
      "The turning chain does NOT count as a stitch: work the first stitch of every row into the first stitch of the row below, and do not work into the top of the turning chain at the end.",
      `Fabric stitch: ${CROCHET_STITCH_NAME[stitch]}.`,
    ],
  };
}

/**
 * The default crochet fabric stitch per garment family.
 *
 * sc makes a dense, hard-wearing fabric (socks, mittens, bags, dishcloths);
 * hdc is the usual compromise for garments — it drapes better than sc and is
 * quicker; dc is used where openness and speed matter (blankets, shawls).
 */
export function voiceFor(craft: Craft, stitch: CrochetStitch = "hdc"): Voice {
  return craft === "crochet" ? crochetVoice(stitch) : knittingVoice();
}

/**
 * Crochet row gauge follows from the stitch's height, so a pattern worked in dc
 * cannot use a gauge swatched in sc. Constructions call this to sanity-check the
 * gauge they were handed and to warn rather than silently draft the wrong depth.
 */
export function expectedRowsPer10cm(stitchesPer10cm: number, stitch: CrochetStitch): number {
  // A crochet stitch is roughly as wide as a chain, and `CROCHET_STITCH_HEIGHT`
  // chains tall, so rows per 10 cm ~= stitches per 10 cm / height, with sc
  // running slightly taller than square (1.1) in practice.
  const ratio = stitch === "sc" ? 1.1 : CROCHET_STITCH_HEIGHT[stitch] * 0.78;
  return stitchesPer10cm / ratio;
}
