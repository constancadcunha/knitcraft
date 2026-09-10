import { requestJson, type ChatMessage, type CallOutcome } from "@/lib/ai/client";

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
  construction: string;
  designerNotes: string;
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
 * Accepts loosely-shaped model output and coerces it, or rejects it.
 *
 * Deliberately lenient about extra keys and missing prose, strict about the
 * things the renderer would break on — a palette entry without a valid hex is
 * worse than no palette at all.
 */
export function coerceDesignIntent(value: unknown): DesignIntent | null {
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

  return {
    name,
    motifKind,
    motifDescription: asString(
      value.motifDescription ?? value.motif_description ?? value.motifDetail,
      "An allover repeat."
    ),
    palette: palette.slice(0, 6),
    stitchPattern: asString(value.stitchPattern ?? value.stitch_pattern, "Stocking stitch"),
    construction: asString(value.construction, "Worked in pieces and seamed"),
    designerNotes: asString(value.designerNotes ?? value.designer_notes ?? value.notes, ""),
  };
}

const SYSTEM = `You are a knitwear and crochet designer.
You choose colours, motifs and stitch patterns. You NEVER calculate stitch counts,
measurements, gauge or yardage — a separate engine does all arithmetic.
Reply with ONE JSON object and nothing else. No markdown, no commentary.`;

function userPrompt(input: {
  craftType: string;
  garmentType: string;
  description?: string;
  stitchPreference?: string;
  styleOption?: string;
  colourHints?: string[];
}): string {
  const wants: string[] = [];
  if (input.description) wants.push(`Description: ${input.description}`);
  if (input.stitchPreference) wants.push(`Preferred stitch or texture: ${input.stitchPreference}`);
  if (input.styleOption) wants.push(`Style: ${input.styleOption}`);
  if (input.colourHints?.length) wants.push(`Colours mentioned: ${input.colourHints.join(", ")}`);

  return `Design a ${input.craftType === "crocheting" ? "crochet" : "knitted"} ${input.garmentType}.
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
  "construction": string,         // e.g. "top-down raglan, worked in the round"
  "designerNotes": string         // one or two sentences of design advice
}

Rules:
- hex must be exactly 6 hex digits with a leading #.
- Choose motifKind honestly: if the request mentions cables, use "cable"; lace, use "lace".
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

  const intent = coerceDesignIntent(outcome.value);
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
