import { requestJson, type ChatMessage, type CallOutcome } from "@/lib/ai/client";
import {
  GARMENT_CATALOG,
  GARMENT_TYPES,
  garmentSupportsSize,
  isGarmentType,
  toGarmentSize,
  type CraftType,
  type GarmentSize,
  type GarmentType,
} from "@/types";

/**
 * The AI's entire job.
 *
 * Per the project's architecture decision, the TypeScript engine owns every
 * number: measurements, ease, gauge, stitch counts, shaping rates, yardage.
 * The model is asked only for things it is genuinely good at — naming, colour,
 * motif and voice — in a small payload that free models can return reliably.
 *
 * This is why it works at all. The previous design asked a free model for a
 * complete multi-size pattern with arithmetic in 8192 non-streamed tokens,
 * which no free model returned in time even once.
 */

export type MotifKind = "colourwork" | "cable" | "lace" | "texture" | "plain";

/**
 * Construction must be a choice from a fixed set, not free text.
 *
 * Left open, models produce self-contradictory answers — an observed real
 * response was "top-down raglan with set-in sleeves", which names two mutually
 * exclusive constructions. The engine has to build an actual garment from this,
 * so it has to be one of the shapes the engine knows how to build.
 */
export type Construction =
  | "set-in-sleeve"
  | "raglan"
  | "drop-shoulder"
  | "circular-yoke"
  | "worked-flat"
  | "in-the-round"
  | "motifs-joined";

const CONSTRUCTIONS: Construction[] = [
  "set-in-sleeve", "raglan", "drop-shoulder", "circular-yoke",
  "worked-flat", "in-the-round", "motifs-joined",
];

/** Map the phrases models actually emit onto the fixed set. */
const CONSTRUCTION_ALIASES: Array<[RegExp, Construction]> = [
  [/circular yoke|yoked|round yoke/i, "circular-yoke"],
  [/raglan/i, "raglan"],
  [/drop shoulder|dropped shoulder/i, "drop-shoulder"],
  [/set[- ]in/i, "set-in-sleeve"],
  [/granny|motif|square|hexagon|join[- ]as[- ]you[- ]go/i, "motifs-joined"],
  [/in the round|worked in the round|seamless|circular/i, "in-the-round"],
  [/flat|seamed|in pieces|panels/i, "worked-flat"],
];

export interface PaletteEntry {
  role: string;
  hex: string;
  name: string;
}

export interface DesignIntent {
  name: string;
  motifKind: MotifKind;
  motifDescription: string;
  palette: PaletteEntry[];
  stitchPattern: string;
  construction: Construction;
  /** The model's own wording, kept for display; never parsed. */
  constructionNotes: string;
  designerNotes: string;
  /**
   * What the model thinks is being described — "a jumper for a three year old"
   * is a Sweater in 2-4yr. Absent when the model named something the catalogue
   * does not make, or something this craft cannot make.
   *
   * NEVER trusted: an unknown value becomes `undefined` so the wizard keeps the
   * user's own choice. The engine must not be handed a garment it cannot draft.
   */
  garmentType?: GarmentType;
  /** Size suggestion, validated against the garment's own legal size list. */
  size?: GarmentSize;
}

const MOTIF_KINDS: MotifKind[] = ["colourwork", "cable", "lace", "texture", "plain"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}


/**
 * Words that mean a garment in the catalogue but are not its name.
 *
 * Models answer in the user's own vocabulary — "jumper", "beanie", "snood" —
 * and the catalogue names are American. Matching only exact names would throw
 * away a correct answer, and throwing it away is indistinguishable from the
 * model getting it wrong.
 */
const GARMENT_ALIASES: Array<[RegExp, GarmentType]> = [
  [/baby blanket|pram blanket|cot blanket/i, "Baby Blanket"],
  [/blanket|afghan|throw/i, "Throw Blanket"],
  [/jumper|pullover|sweater|jersey/i, "Sweater"],
  [/cardigan|cardi/i, "Cardigan"],
  [/waistcoat|vest|slipover/i, "Vest"],
  [/tank|camisole/i, "Tank Top"],
  [/beanie|hat|bobble hat|toque/i, "Hat"],
  [/snood|cowl/i, "Cowl"],
  [/scarf|muffler/i, "Scarf"],
  [/mitten|mitt/i, "Mittens"],
  [/glove/i, "Gloves"],
  [/sock/i, "Socks"],
  [/shawl|wrap|stole/i, "Shawl"],
  [/tote|bag/i, "Tote Bag"],
  [/dishcloth|washcloth|face cloth/i, "Dishcloth"],
  [/headband|ear ?warmer/i, "Headband"],
  [/leg ?warmer/i, "Leg Warmers"],
  [/cushion|pillow/i, "Cushion"],
];

/**
 * Resolve a model's garment word to something the engine can actually draft.
 *
 * Three gates, all of which must pass: the name is in the catalogue, the craft
 * makes it (a knitted Hoop Art is not a thing), and — later — the size fits it.
 * Anything else returns undefined and the wizard keeps what the user chose.
 */
export function coerceGarmentType(value: unknown, craft?: CraftType): GarmentType | undefined {
  const text = asString(value);
  if (!text) return undefined;

  const exact = GARMENT_TYPES.find((g) => g.toLowerCase() === text.toLowerCase());
  const matched = exact ?? GARMENT_ALIASES.find(([re]) => re.test(text))?.[1];
  if (!matched || !isGarmentType(matched)) return undefined;
  if (craft && !GARMENT_CATALOG[matched].crafts.includes(craft)) return undefined;
  return matched;
}

/**
 * Resolve a model's size word against the garment it belongs to.
 *
 * `toGarmentSize` already refuses to guess (it returns null rather than the old
 * "everything unknown is a Large"), and `garmentSupportsSize` then rejects the
 * combinations that would make `createProject` throw — a cowl in "M", a sweater
 * in "One Size".
 */
export function coerceSize(value: unknown, garment?: GarmentType): GarmentSize | undefined {
  const size = toGarmentSize(asString(value) || null);
  if (!size) return undefined;
  if (garment && !garmentSupportsSize(garment, size)) return undefined;
  return size;
}

/**
 * Accepts loosely-shaped model output and coerces it, or rejects it.
 *
 * Deliberately lenient about extra keys and missing prose, strict about the
 * things the renderer would break on — a palette entry without a valid hex is
 * worse than no palette at all.
 */
export function coerceDesignIntent(
  value: unknown,
  context: { craft?: CraftType } = {},
): DesignIntent | null {
  if (!isRecord(value)) return null;

  const rawPalette = Array.isArray(value.palette) ? value.palette : [];
  const palette: PaletteEntry[] = [];
  for (const entry of rawPalette) {
    if (!isRecord(entry)) continue;
    const hex = asString(entry.hex).toLowerCase();
    if (!HEX.test(hex)) continue;
    palette.push({
      hex,
      role: asString(entry.role, "colour"),
      name: asString(entry.name, hex),
    });
  }
  // A colourwork design with fewer than two usable colours is not a design.
  if (palette.length < 2) return null;

  const kindRaw = asString(value.motifKind ?? value.motif_kind ?? value.motif).toLowerCase();
  const motifKind = (MOTIF_KINDS as string[]).includes(kindRaw)
    ? (kindRaw as MotifKind)
    : "colourwork";

  const name = asString(value.name);
  if (!name) return null;

  // Take the FIRST alias that matches, in priority order: "top-down raglan
  // with set-in sleeves" resolves to raglan rather than silently keeping both.
  const constructionText = asString(value.construction, "");
  const construction =
    (CONSTRUCTIONS as string[]).includes(constructionText)
      ? (constructionText as Construction)
      : (CONSTRUCTION_ALIASES.find(([re]) => re.test(constructionText))?.[1] ?? "worked-flat");

  // The garment is resolved first because the size is only meaningful relative
  // to it: "One Size" is right for a cowl and undraftable for a sweater.
  const garmentType = coerceGarmentType(value.garmentType ?? value.garment_type ?? value.garment, context.craft);
  const size = coerceSize(value.size ?? value.suggestedSize ?? value.suggested_size, garmentType);

  return {
    name,
    motifKind,
    motifDescription: asString(
      value.motifDescription ?? value.motif_description ?? value.motifDetail,
      "An allover repeat."
    ),
    palette: palette.slice(0, 6),
    stitchPattern: asString(value.stitchPattern ?? value.stitch_pattern, "Stocking stitch"),
    construction,
    constructionNotes: constructionText || "Worked in pieces and seamed",
    designerNotes: asString(value.designerNotes ?? value.designer_notes ?? value.notes, ""),
    ...(garmentType ? { garmentType } : {}),
    ...(size ? { size } : {}),
  };
}

const SYSTEM = `You are a knitwear and crochet designer.
You choose colours, motifs and stitch patterns. You NEVER calculate stitch counts,
measurements, gauge or yardage — a separate engine does all arithmetic.
Reply with ONE JSON object and nothing else. No markdown, no commentary.`;

/** The craft the model is designing for, as a `CraftType` the catalogue knows. */
function craftTypeOf(craftType: string): CraftType {
  return craftType === "crocheting" || craftType === "cross-stitch" ? craftType : "knitting";
}

/** Garment names this craft actually makes, for the prompt's allowed list. */
function garmentMenu(craft: CraftType): string {
  return GARMENT_TYPES.filter((g) => GARMENT_CATALOG[g].crafts.includes(craft))
    .map((g) => `"${g}"`)
    .join(" | ");
}

function userPrompt(input: {
  craftType: string;
  garmentType: string;
  description?: string;
  stitchPreference?: string;
  styleOption?: string;
  colourHints?: string[];
}): string {
  const craft = craftTypeOf(input.craftType);
  const wants: string[] = [];
  if (input.description) wants.push(`Description: ${input.description}`);
  if (input.stitchPreference) wants.push(`Preferred stitch or texture: ${input.stitchPreference}`);
  if (input.styleOption) wants.push(`Style: ${input.styleOption}`);
  if (input.colourHints?.length) wants.push(`Colours mentioned: ${input.colourHints.join(", ")}`);

  return `Design something to ${craft === "crocheting" ? "crochet" : "knit"}.
The person is currently looking at "${input.garmentType}", but that is only a default —
if their words or their photo describe a different garment, say so in "garmentType".
${wants.join("\n")}

Return exactly this JSON shape:
{
  "name": string,                 // an evocative pattern name, 2-4 words
  "motifKind": "colourwork" | "cable" | "lace" | "texture" | "plain",
  "motifDescription": string,     // what the motif looks like, one sentence
  "palette": [                    // 2-5 entries, ordered main colour first
    { "role": string, "hex": "#rrggbb", "name": string }
  ],
  "stitchPattern": string,        // e.g. "2x2 rib with a horseshoe cable panel"
  "construction": "set-in-sleeve" | "raglan" | "drop-shoulder" | "circular-yoke"
                  | "worked-flat" | "in-the-round" | "motifs-joined",
  "garmentType": string,          // what this actually is, from the list below
  "size": string,                 // who it is for, from the size list below
  "designerNotes": string         // one or two sentences of design advice
}

garmentType must be one of: ${garmentMenu(craft)}
size must be one of: "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL"
  | "0-3m" | "3-6m" | "6-12m" | "1-2yr" | "2-4yr" | "4-6yr" | "One Size"
Use a child size when the request mentions a child or a baby, and "One Size"
for anything not fitted to a body (a cowl, a scarf, a blanket, a bag).

Rules:
- hex must be exactly 6 hex digits with a leading #.
- Choose motifKind honestly: if the request mentions cables, use "cable"; lace, use "lace".
- construction must be EXACTLY one of the listed values. Pick one; they are mutually
  exclusive. A garment cannot be both raglan and set-in-sleeve.
- garmentType and size must be EXACTLY one of the listed values, or the whole
  answer is discarded and the person's own choice is kept.
- Do not include any stitch counts, measurements or yarn quantities.`;
}

export async function generateDesignIntent(input: {
  apiKey: string;
  craftType: string;
  garmentType: string;
  description?: string;
  stitchPreference?: string;
  styleOption?: string;
  colourHints?: string[];
  imageBase64?: string;
}): Promise<CallOutcome<DesignIntent>> {
  const text = userPrompt(input);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: input.imageBase64
        ? [
            { type: "text", text: `${text}\n\nBase the design on the garment in this image.` },
            { type: "image_url", image_url: { url: input.imageBase64 } },
          ]
        : text,
    },
  ];

  const outcome = await requestJson<unknown>({
    apiKey: input.apiKey,
    messages,
    hasImage: Boolean(input.imageBase64),
    maxTokens: 900,
  });

  if (!outcome.ok || outcome.value === undefined) {
    return { ok: false, attempts: outcome.attempts, error: outcome.error };
  }

  const intent = coerceDesignIntent(outcome.value, { craft: craftTypeOf(input.craftType) });
  if (!intent) {
    return {
      ok: false,
      attempts: [
        ...outcome.attempts,
        { model: outcome.model ?? "?", ms: 0, problem: "valid JSON but not a usable design" },
      ],
      error: "the model's design was unusable",
    };
  }

  return { ok: true, value: intent, model: outcome.model, attempts: outcome.attempts };
}
