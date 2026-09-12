/**
 * A rough gauge from the needle or hook you are holding.
 *
 * WHY, in the user's words: "don't have stitches per 10cm, just calculate
 * roughly (like have it as an optional given the size of the hook either knit
 * or crochet)".
 *
 * Asking a beginner for "stitches per 10 cm" asks them to have already knitted
 * and measured a blocked swatch — before they have a pattern to swatch for.
 * Almost everyone guesses, and a guessed gauge produces a garment that is
 * confidently the wrong size. A needle size, on the other hand, is written on
 * the needle.
 *
 * The conversion is CYC's own table (`src/lib/knit/gauge.ts`): every yarn
 * weight publishes a needle range and the stockinette gauge range that goes
 * with it. Inside a category, a bigger needle gives looser fabric and fewer
 * stitches to 10 cm, so we interpolate linearly from one end of the range to
 * the other rather than always returning the midpoint — otherwise 3.75 mm and
 * 4.5 mm, which are a whole size apart in practice, would draft identically.
 *
 * THIS IS AN ESTIMATE AND THE UI MUST SAY SO. Two knitters with the same
 * needle and the same yarn routinely differ by two stitches to 10 cm, which is
 * ~8 cm across an adult chest. A measured swatch always wins, which is why the
 * wizard keeps the exact inputs behind an "I measured a swatch" disclosure.
 */

import {
  HOOK_SIZES,
  NEEDLE_SIZES,
  YARN_WEIGHTS,
  describeNeedle,
  nearestHook,
  type CycWeight,
  type YarnWeightSpec,
} from "@/lib/knit";
import { toKnitCraft, type YarnCraft } from "@/types";

export interface ToolOption {
  mm: number;
  /** What the picker shows: "4 mm / US 6" or "5 mm / H-8". */
  label: string;
}

/**
 * Sizes worth offering. Steel thread hooks and 25 mm arm-knitting needles are
 * real but they are not what anyone drafts a first garment on, and a picker
 * with forty entries is a worse control than two number boxes.
 */
const MIN_MM = 2;
const MAX_MM = 12;

export function toolOptions(craft: YarnCraft): ToolOption[] {
  if (craft === "crocheting") {
    return HOOK_SIZES.filter((h) => h.mm >= MIN_MM && h.mm <= MAX_MM).map((h) => ({
      mm: h.mm,
      label: `${h.mm} mm · ${h.us}`,
    }));
  }
  return NEEDLE_SIZES.filter((n) => n.mm >= MIN_MM && n.mm <= MAX_MM).map((n) => ({
    mm: n.mm,
    label: n.us ? `${n.mm} mm · US ${n.us}` : `${n.mm} mm`,
  }));
}

/** The mm value to open the picker on: mid-range worsted / aran, the common case. */
export function defaultToolMm(craft: YarnCraft): number {
  return craft === "crocheting" ? 5.5 : 5;
}

/** The nearest offered size, for when the craft changes under a chosen size. */
export function nearestToolMm(mm: number, craft: YarnCraft): number {
  const options = toolOptions(craft);
  return options.reduce((best, o) => (Math.abs(o.mm - mm) < Math.abs(best.mm - mm) ? o : best)).mm;
}

function rangeFor(spec: YarnWeightSpec, craft: YarnCraft): readonly [number, number] {
  return craft === "crocheting" ? spec.crochetHookMm : spec.knitNeedleMm;
}

function gaugeRangeFor(spec: YarnWeightSpec, craft: YarnCraft): readonly [number, number] {
  return craft === "crocheting" ? spec.crochetGaugePer10cm : spec.knitGaugePer10cm;
}

/**
 * The CYC weight a needle size belongs to.
 *
 * Ranges overlap (4.5 mm is the top of Light and the bottom of Medium), so the
 * tie is broken by which range the size sits most centrally in — the same
 * judgement a yarn shop makes.
 */
export function weightForTool(mm: number, craft: YarnCraft): YarnWeightSpec {
  const covering = YARN_WEIGHTS.filter((spec) => {
    const [lo, hi] = rangeFor(spec, craft);
    return mm >= lo && mm <= hi;
  });

  const pool = covering.length > 0 ? covering : [...YARN_WEIGHTS];
  return pool.reduce((best, spec) => {
    const [lo, hi] = rangeFor(spec, craft);
    const [bLo, bHi] = rangeFor(best, craft);
    const distance = Math.abs(mm - (lo + hi) / 2);
    const bestDistance = Math.abs(mm - (bLo + bHi) / 2);
    return distance < bestDistance ? spec : best;
  });
}

export interface EstimatedGauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
  cyc: CycWeight;
  /** "Medium (worsted, aran)" — what to buy, which is the real question. */
  yarnName: string;
  /** True when the size sits inside a published range rather than beyond it. */
  withinPublishedRange: boolean;
}

/**
 * Estimate a gauge from a needle or hook size.
 *
 * Row gauge is not published by CYC at all. The ratios here are the ones
 * `typicalGaugeFor` documents: stockinette runs about 1.33 rows per stitch,
 * single crochet about 1.1 because an sc is nearly as tall as it is wide.
 */
export function gaugeFromTool(mm: number, craft: YarnCraft): EstimatedGauge {
  const spec = weightForTool(mm, craft);
  const [lo, hi] = rangeFor(spec, craft);
  const [gaugeLo, gaugeHi] = gaugeRangeFor(spec, craft);

  // t = 0 at the fine end of the needle range, 1 at the coarse end. Bigger
  // needle, looser fabric, FEWER stitches — hence gaugeHi down to gaugeLo.
  const span = hi - lo;
  const t = span <= 0 ? 0.5 : Math.min(1, Math.max(0, (mm - lo) / span));
  const stitches = gaugeHi - t * (gaugeHi - gaugeLo);
  const rows = stitches * (craft === "crocheting" ? 1.1 : 1.33);

  return {
    stitchesPer10cm: Math.round(stitches * 2) / 2,
    rowsPer10cm: Math.round(rows * 2) / 2,
    cyc: spec.cyc,
    yarnName: `${spec.name} (${spec.alsoKnownAs.slice(0, 2).join(", ")})`,
    withinPublishedRange: mm >= lo && mm <= hi,
  };
}

/** How the materials list names the tool. */
export function describeTool(mm: number, craft: YarnCraft): string {
  if (craft === "crocheting") {
    const hook = nearestHook(mm);
    return `${hook.mm} mm / US ${hook.us} hook`;
  }
  return `${describeNeedle(mm)} needles`;
}

/** The craft name the knitting engine uses. Re-exported so callers need one import. */
export function knitCraftOf(craft: YarnCraft) {
  return toKnitCraft(craft);
}
