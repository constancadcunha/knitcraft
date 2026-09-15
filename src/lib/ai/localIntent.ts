/**
 * A design intent derived from the words alone, with no model involved.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Studio's reported bug was "the AI is not producing anything at all,
 * whether from giving an image or describing, it's giving a blank canvas".
 * Half of that was the request never being sent; the other half is that when
 * the request DOES fail — no API key, every free model rate-limited, the 55s
 * budget spent — the wizard had nothing to fall back on and drew plain fabric.
 *
 * A blank chart is the worst possible answer, because it is indistinguishable
 * from the app not working. So every path now ends in a real motif: if the
 * model cannot be reached, these rules read the same words the model would
 * have read and pick a motif and a palette from them. It is cruder than the
 * model — it cannot invent a name or explain itself — but it is never blank,
 * it is instant, and it is deterministic, which makes it testable.
 *
 * It is NOT a silent substitute: the caller shows which one produced the
 * design, because telling someone the AI designed this when it did not is the
 * failure mode this codebase already paid for once.
 */

import type { DesignIntent, MotifKind, PaletteEntry } from "@/lib/ai/designIntent";
import { coerceGarmentType, coerceSize } from "@/lib/ai/designIntent";
import type { CraftType, GarmentSize, GarmentType } from "@/types";

/**
 * Colour words a knitter actually types, with a yarn-plausible shade for each.
 *
 * Deliberately muted rather than screen-bright: these become chart colours and
 * then, in someone's head, actual yarn. Ordered longest-first at match time so
 * "navy blue" wins over "blue".
 */
const COLOUR_WORDS: Array<[string, string, string]> = [
  ["cream", "#f2e8d5", "Cream"],
  ["ecru", "#ece0c8", "Ecru"],
  ["oatmeal", "#e3d5bd", "Oatmeal"],
  ["white", "#f7f4ee", "White"],
  ["charcoal", "#33333a", "Charcoal"],
  ["black", "#22222a", "Black"],
  ["grey", "#8d8d95", "Grey"],
  ["gray", "#8d8d95", "Grey"],
  ["silver", "#b9bcc2", "Silver"],
  ["navy", "#22335c", "Navy"],
  ["denim", "#41628f", "Denim"],
  ["sky", "#8fbde0", "Sky"],
  ["teal", "#1f7a78", "Teal"],
  ["turquoise", "#2fa3a0", "Turquoise"],
  ["blue", "#2f4d8c", "Blue"],
  ["forest", "#245239", "Forest"],
  ["sage", "#9aab8c", "Sage"],
  ["olive", "#6f7343", "Olive"],
  ["mint", "#a9d6c0", "Mint"],
  ["green", "#3c7a4b", "Green"],
  ["mustard", "#d8a531", "Mustard"],
  ["gold", "#e0b03c", "Gold"],
  ["yellow", "#edc75a", "Yellow"],
  ["ochre", "#c4813a", "Ochre"],
  ["orange", "#d1712f", "Orange"],
  ["rust", "#a8482a", "Rust"],
  ["terracotta", "#b2603f", "Terracotta"],
  ["burgundy", "#6d2338", "Burgundy"],
  ["wine", "#6d2338", "Wine"],
  ["berry", "#a5325a", "Berry"],
  ["red", "#b23a35", "Red"],
  ["pink", "#e2a0b4", "Pink"],
  ["blush", "#edc2c2", "Blush"],
  ["lilac", "#b6a3d6", "Lilac"],
  ["purple", "#6a4a92", "Purple"],
  ["plum", "#5b3550", "Plum"],
  ["brown", "#6b4b33", "Brown"],
  ["camel", "#c19a6b", "Camel"],
  ["chocolate", "#4a3226", "Chocolate"],
  ["natural", "#e8ddc6", "Natural"],
];

/** Motif words, in priority order — the first match wins. */
const MOTIF_WORDS: Array<[RegExp, MotifKind]> = [
  [/cable|aran|twist|plait|braid|fisherman/i, "cable"],
  [/lace|eyelet|openwork|mesh|shetland|feather and fan/i, "lace"],
  [/fair ?isle|colourwork|colorwork|stranded|intarsia|nordic|scandi|snowflake|stripe|motif|picture|letter|heart|star|checker|argyle|tartan/i, "colourwork"],
  [/seed|moss|basket|rib|texture|bobble|garter|waffle|honeycomb/i, "texture"],
  [/plain|stocking|stockinette|simple|smooth/i, "plain"],
];

/** Size words that are not size codes: "for a toddler", "for a newborn". */
const SIZE_WORDS: Array<[RegExp, GarmentSize]> = [
  [/newborn|new ?born/i, "0-3m"],
  [/\b(\d+)\s*(?:-|to)?\s*month/i, "3-6m"],
  [/baby|infant/i, "6-12m"],
  [/toddler/i, "1-2yr"],
  [/\b([1-6])\s*(?:-|to)?\s*(?:year|yr)/i, "2-4yr"],
  [/child|kid|little (?:boy|girl)/i, "4-6yr"],
  [/extra small/i, "XS"],
  [/extra large/i, "XL"],
];

/**
 * The motif the words ask for.
 *
 * Defaults to "texture" rather than "plain" when there is text but no keyword:
 * someone who bothered to describe their make wants to see something on the
 * fabric, and seed stitch is the safest thing to show them.
 */
export function motifKindFromText(text: string): MotifKind {
  if (!text.trim()) return "plain";
  for (const [re, kind] of MOTIF_WORDS) if (re.test(text)) return kind;
  return "texture";
}

/**
 * Colours named in the text, as a palette.
 *
 * Always at least two entries, because a colourwork chart with one colour is a
 * plain chart — the palette is padded with a neutral ground rather than left
 * short, and `coerceDesignIntent` rejects anything shorter for the same reason.
 */
export function paletteFromText(text: string): PaletteEntry[] {
  const lower = text.toLowerCase();
  const found: PaletteEntry[] = [];
  const seen = new Set<string>();

  for (const [word, hex, name] of COLOUR_WORDS) {
    if (!lower.includes(word) || seen.has(hex)) continue;
    seen.add(hex);
    found.push({ role: found.length === 0 ? "MC" : `CC${found.length}`, hex, name });
    if (found.length === 5) break;
  }

  // The undyed-wool default: a natural ground and a dark contrast read clearly
  // at stitch scale, which a pair of pastels does not.
  const defaults: PaletteEntry[] = [
    { role: "MC", hex: "#e8ddc6", name: "Natural" },
    { role: "CC1", hex: "#33333a", name: "Charcoal" },
  ];
  for (const fallback of defaults) {
    if (found.length >= 2) break;
    if (seen.has(fallback.hex)) continue;
    seen.add(fallback.hex);
    found.push({ ...fallback, role: found.length === 0 ? "MC" : `CC${found.length}` });
  }

  return found;
}

/** The garment the words name, validated against the catalogue for this craft. */
export function garmentFromText(text: string, craft: CraftType): GarmentType | undefined {
  return coerceGarmentType(text, craft);
}

/** The size the words imply, validated against the garment's legal sizes. */
export function sizeFromText(text: string, garment?: GarmentType): GarmentSize | undefined {
  for (const [re, size] of SIZE_WORDS) {
    if (re.test(text)) {
      const resolved = coerceSize(size, garment);
      if (resolved) return resolved;
    }
  }
  // A bare size code — "an XL cardigan", "size 2XL".
  const code = /\b(xs|s|m|l|xl|2xl|3xl)\b/i.exec(text)?.[1];
  return code ? coerceSize(code.toUpperCase(), garment) : undefined;
}

/** Title-case the first few meaningful words, for a name that echoes the ask. */
function nameFromText(text: string, fallback: string): string {
  const skip = new Set(["a", "an", "the", "with", "and", "for", "of", "in", "on", "my", "some", "very"]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !skip.has(w))
    .slice(0, 3);
  if (words.length === 0) return fallback;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const STITCH_PATTERN: Record<MotifKind, string> = {
  cable: "Cable panels on a reverse stocking ground",
  lace: "An eyelet repeat, each yarn-over paired with a decrease",
  colourwork: "Stranded bands, two colours to a row",
  texture: "Seed stitch",
  plain: "Stocking stitch",
};

export interface LocalIntentInput {
  description: string;
  craft: CraftType;
  /** The garment currently selected in the wizard, used only as a fallback. */
  garment: GarmentType;
  /** A stitch feel the user chose explicitly. Beats anything in the words. */
  stitchPreference?: string;
}

/**
 * Build a design intent from the description alone.
 *
 * Shaped exactly like the model's output so the rest of the wizard cannot tell
 * the difference — the only place the difference is visible is the label the
 * Design step shows, which says plainly where the design came from.
 */
export function localDesignIntent(input: LocalIntentInput): DesignIntent {
  const text = input.description.trim();
  const chosen = input.stitchPreference as MotifKind | undefined;
  const motifKind: MotifKind =
    chosen && chosen.length > 0 ? chosen : motifKindFromText(text);
  const garmentType = garmentFromText(text, input.craft);
  const size = sizeFromText(text, garmentType ?? input.garment);

  return {
    name: nameFromText(text, `${input.garment} design`),
    motifKind,
    motifDescription:
      motifKind === "plain"
        ? "Plain fabric throughout."
        : `${STITCH_PATTERN[motifKind]}, drawn from the words you used.`,
    palette: paletteFromText(text),
    stitchPattern: STITCH_PATTERN[motifKind],
    construction: "worked-flat",
    constructionNotes: "Worked in pieces and seamed",
    designerNotes:
      "Drafted here in the browser from your description — the design service could not be reached, so the colours and motif come from the words you typed rather than from the model.",
    ...(garmentType ? { garmentType } : {}),
    ...(size ? { size } : {}),
  };
}
