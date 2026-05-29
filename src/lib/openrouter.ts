import type { CraftType, Difficulty, Pattern, PatternSection } from "@/types";
import { generateId } from "@/lib/id";
import { getAssemblyInstructions } from "@/lib/projectGuides";
import { estimateSkeins, gaugeForCraft, type GarmentSize, GARMENT_SIZES, SIZE_PROFILES } from "@/lib/craftKnowledge";

const BASE_URL = "https://openrouter.ai/api/v1";

// Fallback chain: tried in order, first 200 response wins.
const TEXT_MODELS = [
  "openrouter/free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen3-235b-a22b:free",
  "qwen/qwq-32b:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];
const VISION_MODELS = [
  "openrouter/free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
];

interface GenerateParams {
  craftType: CraftType;
  garmentType: string;
  sizes: string[];
  difficulty: Difficulty;
  extraNotes: string;
  imageBase64?: string;
  textDescription?: string;
}

const PATTERN_SCHEMA = `
{
  "name": string,
  "craftType": "knitting" | "crocheting",
  "garmentType": string,
  "difficulty": "beginner" | "intermediate" | "advanced" | "expert",
  "estimatedTime": string (e.g. "20-30 hours"),
  "gauge": {
    "stitches": number,
    "rows": number,
  "swatchSize": string (e.g. "10cm x 10cm"),
    "needleSize": string (e.g. "4mm / US 6"),
    "yarnWeight": string (e.g. "DK / Light Worsted")
  },
  "sizes": string[],
  "measurements": {
    [sizeName]: {
      "bust"?: string,
      "length"?: string,
      "sleeve"?: string,
      "circumference"?: string,
      "height"?: string,
      "width"?: string
    }
  },
  "materials": {
    "yarn": [
      {
        "name": string,
        "color": string,
        "weight": string,
        "meterage": number,
        "skeins": { [sizeName]: number }
      }
    ],
    "needles": string[],
    "notions": string[]
  },
  "abbreviations": [
    { "abbr": string, "meaning": string, "videoKeywords": string }
  ],
  "sections": [
    {
      "name": string (e.g. "Back Panel", "Front Right", "Sleeve", "Finishing"),
      "description": string,
      "instructions": [
        { "rowNumber": number, "text": string }
      ]
    }
  ],
  "notes": string
}
`;

function buildPrompt(params: GenerateParams): string {
  const sizeList = params.sizes.join(", ");
  const craft = params.craftType === "knitting" ? "knitting" : "crocheting";
  const hasImage = !!params.imageBase64;

  return `You are an expert ${craft} pattern designer with 20 years of experience writing professional patterns published in magazines.

${hasImage ? "Analyze the uploaded image and create a pattern inspired by it." : `Create a complete ${craft} pattern for: "${params.textDescription || params.garmentType}"`}

**Requirements:**
- Craft: ${params.craftType}
- Garment: ${params.garmentType}
- Sizes to include: ${sizeList}
- Difficulty level: ${params.difficulty}
${params.extraNotes ? `- Special requests: ${params.extraNotes}` : ""}

**Output a COMPLETE professional-grade pattern as valid JSON** following this exact schema:
${PATTERN_SCHEMA}

Rules:
1. Every section must have clear, numbered row-by-row instructions. Each step must be a complete sentence a beginner can follow - include exact stitch counts, not vague phrases.
2. Stitch counts in parentheses list values for each selected size in order (e.g., "Cast on 62 (70, 76, 84, 92, 100) sts.").
3. Include ALL standard sections for the garment type, working from the cast-on edge upward.
4. Cardigans MUST include: Back, Left Front, Right Front, Sleeves (x2), Button Bands, Collar/Neckband, and Finishing. Sweaters MUST include: Back, Front, Sleeves, Collar, and Finishing.
5. Start every section at the cast-on / foundation row (bottom of garment). Collar and neckline shaping happen at the TOP of each section.
6. Knitting: begin with cast-on. Crochet: begin with foundation chain or foundation single crochet - never "cast on."
7. Chart reading note: for flat knitting, right-side rows are read right-to-left (blank square = knit stitch). Wrong-side rows are read left-to-right (blank square = purl stitch). State this clearly.
8. If the style option includes collar, ribbing, buttons, or pockets, reflect that directly in the chart sections - e.g. button placement in the band section, collar depth in the neckline section.
9. The named motif and colours are binding. If the request says flowers, draw flowers; if it says stars and stripes, use stars and stripes. Do not invent spiders, random stripes, unrelated animals, or unrelated motifs.
10. Abbreviations must cover every abbreviation used in the instructions. Include clear videoKeywords for each.
11. Be creative with the pattern name and keep it craft-specific.
12. Return ONLY valid JSON, no markdown fences, no explanation text.`;
}

type MessageContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

async function callModel(
  apiKey: string,
  model: string,
  messageContent: MessageContent,
  timeoutMs: number
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stitchcraft.studio",
        "X-Title": "StitchCraft Studio",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You write practical knitting and crochet patterns. Return only valid JSON and no markdown fences.",
          },
          { role: "user", content: messageContent },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return null;

  const data = await response.json();
  const responseContent = data.choices?.[0]?.message?.content;
  if (typeof responseContent === "string") return responseContent.trim() || null;
  if (Array.isArray(responseContent)) {
    const text = responseContent
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    return text || null;
  }
  return null;
}

export async function generatePattern(params: GenerateParams): Promise<Pattern> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return buildFallbackPattern(params);

  const prompt = buildPrompt(params);
  const userContent: MessageContent = params.imageBase64
    ? [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${params.imageBase64}` } },
        { type: "text", text: prompt },
      ]
    : prompt;

  const modelList = params.imageBase64 ? VISION_MODELS : TEXT_MODELS;
  let rawText: string | null = null;
  const deadline = Date.now() + 7000;

  for (const model of modelList) {
    const remaining = deadline - Date.now();
    if (remaining < 1500) break;
    try {
      rawText = await Promise.race([
        callModel(apiKey, model, userContent, Math.min(remaining, 2500)).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.min(remaining, 2500))),
      ]);
      if (rawText) break;
    } catch {
      // Try the next free model or fall back to the local gauge-first pattern.
    }
  }

  if (!rawText) {
    return buildFallbackPattern(params);
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return buildFallbackPattern(params);

  let parsed: Omit<Pattern, "id" | "currentSection" | "completedRows" | "createdAt" | "sourceType" | "currentSize">;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return buildFallbackPattern(params);
  }

  if (!isPatternUsable(parsed, params)) {
    return buildFallbackPattern(params);
  }

  const normalized = normalizePattern(parsed, params);

  return {
    ...normalized,
    id: generateId(),
    currentSection: 0,
    currentSize: params.sizes[0],
    completedRows: {},
    createdAt: new Date().toISOString(),
    sourceType: params.imageBase64 ? "image" : "text",
    sourceDescription: params.textDescription,
    previewImage: normalized.previewImage ?? buildPreviewImage(params, normalized.name),
  };
}

function isPatternUsable(
  pattern: Omit<Pattern, "id" | "currentSection" | "completedRows" | "createdAt" | "sourceType" | "currentSize">,
  params: GenerateParams
): boolean {
  if (!pattern.name || !Array.isArray(pattern.sections) || pattern.sections.length === 0) return false;
  if (!pattern.materials?.yarn?.length || !pattern.gauge || !pattern.abbreviations?.length) return false;
  const allText = JSON.stringify(pattern).toLowerCase();
  const garment = params.garmentType.toLowerCase();
  const sectionNames = pattern.sections.map((section) => section.name.toLowerCase());

  if (params.craftType === "crocheting" && allText.includes("cast on")) return false;
  if (params.craftType === "knitting" && /foundation chain|turning chain/.test(allText)) return false;

  if (garment.includes("cardigan")) {
    const hasBack = sectionNames.some((name) => name.includes("back"));
    const hasFront = sectionNames.some((name) => name.includes("front"));
    const hasSleeve = sectionNames.some((name) => name.includes("sleeve"));
    const hasBand = sectionNames.some((name) => name.includes("band") || name.includes("button"));
    const hasCollar = sectionNames.some((name) => name.includes("collar") || name.includes("neck"));
    const hasFinish = sectionNames.some((name) => name.includes("finish") || name.includes("assembly"));
    if (!hasBack || !hasFront || !hasSleeve || !hasBand || !hasCollar || !hasFinish) return false;
    if (/button[^.]{0,100}back panel|front and back panel/.test(allText)) return false;
  }

  if (garment.includes("sweater") || garment.includes("pullover")) {
    const hasBack = sectionNames.some((name) => name.includes("back"));
    const hasFront = sectionNames.some((name) => name.includes("front"));
    const hasSleeve = sectionNames.some((name) => name.includes("sleeve"));
    const hasCollar = sectionNames.some((name) => name.includes("collar") || name.includes("neck"));
    if (!hasBack || !hasFront || !hasSleeve || !hasCollar) return false;
  }

  const expectedSkeins = estimateSkeins(params.garmentType, params.sizes[0], params.craftType);
  const yarn = pattern.materials.yarn[0];
  const reported = Number(yarn.skeins?.[params.sizes[0]] ?? Math.min(...Object.values(yarn.skeins ?? {}).map(Number)));
  if (Number.isFinite(reported) && reported < Math.max(1, expectedSkeins - 2)) return false;

  return pattern.sections.every((section) =>
    section.instructions?.length > 0 && section.instructions.every((instruction) => instruction.text?.trim())
  );
}

function normalizePattern(
  pattern: Omit<Pattern, "id" | "currentSection" | "completedRows" | "createdAt" | "sourceType" | "currentSize">,
  params: GenerateParams
) {
  const sizes = params.sizes.length ? params.sizes : pattern.sizes;
  return {
    ...pattern,
    craftType: params.craftType,
    garmentType: params.garmentType,
    difficulty: params.difficulty,
    sizes,
    notes: pattern.notes
      ? `${pattern.notes} Swatch first and adjust counts if your gauge differs.`
      : "Swatch first and adjust counts if your gauge differs.",
    materials: {
      ...pattern.materials,
      yarn: pattern.materials.yarn.map((yarn) => ({
        ...yarn,
        skeins: {
          ...yarn.skeins,
          ...Object.fromEntries(
            sizes.map((size) => [
              size,
              Math.max(Number(yarn.skeins?.[size] ?? 0), estimateSkeins(params.garmentType, size, params.craftType)),
            ])
          ),
        },
      })),
    },
  };
}

function buildFallbackPattern(params: GenerateParams): Pattern {
  const garment = params.garmentType;
  const isCrochet = params.craftType === "crocheting";
  const gauge = gaugeForCraft(params.craftType);
  const primaryTool = isCrochet ? "5 mm crochet hook, or size needed for gauge" : "6 mm / US 10 needles, or size needed for gauge";
  const stitchWord = isCrochet ? "stitches" : "sts";
  const mainFabric = isCrochet ? "half double crochet fabric" : "stockinette fabric";
  const sizes = params.sizes.length ? params.sizes : ["M"];
  const skeins = Object.fromEntries(sizes.map((size) => [size, estimateSkeins(garment, size, params.craftType)]));
  const hasPockets = /pocket/i.test(params.extraNotes) || garment === "Cardigan";
  const counts = buildPatternCounts(params.craftType, garment, sizes);
  const draftName = fallbackPatternName(params);

  return {
    id: generateId(),
    name: draftName,
    craftType: params.craftType,
    garmentType: garment,
    difficulty: params.difficulty,
    estimatedTime: garment === "Cardigan" || garment === "Sweater" ? "24-36 hours" : "8-18 hours",
    gauge: {
      stitches: Math.round(gauge.stitchesPerInch * 4),
      rows: Math.round(gauge.rowsPerInch * 4),
      swatchSize: "4 in x 4 in",
      needleSize: primaryTool,
      yarnWeight: isCrochet ? "Worsted / medium" : "Chunky / bulky",
    },
    sizes,
    currentSize: sizes[0],
    measurements: Object.fromEntries(
      sizes.map((size) => [
        size,
        {
          bust: `${sizeProfileFor(size).bust} in`,
          length: `${sizeProfileFor(size).length} in`,
          sleeve: `${sizeProfileFor(size).sleeve} in`,
        },
      ])
    ),
    materials: {
      yarn: [
        {
          name: isCrochet ? "Soft worsted wool blend" : "Soft chunky wool blend",
          color: "Main colour plus contrast colours as charted",
          weight: isCrochet ? "Worsted / medium" : "Chunky / bulky",
          meterage: 220,
          skeins,
        },
      ],
      needles: [primaryTool, isCrochet ? "Tapestry needle" : "3.75 mm / US 5 needles for ribbing"],
      notions: ["Stitch markers", "Tapestry needle", garment === "Cardigan" ? "Buttons" : "Waste yarn"],
    },
    abbreviations: isCrochet
      ? [
          { abbr: "ch", meaning: "chain", videoKeywords: "how to crochet chain stitch" },
          { abbr: "sc", meaning: "single crochet", videoKeywords: "how to single crochet" },
          { abbr: "hdc", meaning: "half double crochet", videoKeywords: "how to half double crochet" },
          { abbr: "dec", meaning: "decrease", videoKeywords: "how to crochet decrease" },
        ]
      : [
          { abbr: "k", meaning: "knit", videoKeywords: "how to knit stitch" },
          { abbr: "p", meaning: "purl", videoKeywords: "how to purl stitch" },
          { abbr: "k2tog", meaning: "knit 2 together", videoKeywords: "how to knit k2tog decrease" },
          { abbr: "ssk", meaning: "slip slip knit", videoKeywords: "how to knit ssk decrease" },
          { abbr: "m1", meaning: "make 1 stitch", videoKeywords: "how to knit make one increase" },
        ],
    sections: fallbackSections(garment, isCrochet, stitchWord, mainFabric, hasPockets, counts),
    notes: "Gauge-first pattern draft. Check your swatch before starting; if your stitch or row count differs, adjust the counts before making the full garment.",
    currentSection: 0,
    completedRows: {},
    createdAt: new Date().toISOString(),
    sourceType: params.imageBase64 ? "image" : "text",
    sourceDescription: params.textDescription,
    previewImage: buildPreviewImage(params, draftName),
  };
}

function fallbackPatternName(params: GenerateParams): string {
  const text = `${params.textDescription ?? ""} ${params.extraNotes ?? ""}`.toLowerCase();
  if (/van gogh|starry night|night sky|swirl|swirly/.test(text)) {
    return `Starry Night ${params.garmentType} Draft`;
  }
  if (/star|moon|celestial|spark/.test(text) && /stripe|striped|stripes/.test(text)) {
    return `Stars and Stripes ${params.garmentType} Draft`;
  }
  const motifs = [
    [/flower|floral|daisy|rose|garden|bloom/, "Flower"],
    [/heart|love|valentine/, "Heart"],
    [/star|moon|celestial|spark/, "Celestial"],
    [/stripe|striped/, "Striped"],
    [/check|plaid|gingham/, "Checked"],
    [/wave|ocean|ripple/, "Wave"],
    [/diamond|argyle|fair isle|fairisle/, "Diamond"],
  ] as const;
  const motif = motifs.find(([regex]) => regex.test(text))?.[1];
  return `${motif ? `${motif} ` : ""}${params.garmentType} Draft`;
}

type PatternCounts = {
  sizeLabel: string;
  backSts: number;
  backRows: number;
  frontSts: number;
  sleeveCuffSts: number;
  sleeveUpperSts: number;
  sleeveRows: number;
  collarSts: number;
  bandSts: number;
  pocketSts: number;
  pocketRows: number;
  ribRows: number;
};

function sizeProfileFor(size: string) {
  const aliases: Record<string, GarmentSize> = { XXL: "2XL", "3XL": "2XL" };
  const key = (aliases[size] ?? size) as GarmentSize;
  if (GARMENT_SIZES.includes(key)) return SIZE_PROFILES[key];
  return SIZE_PROFILES.M;
}

function buildPatternCounts(craftType: CraftType, garment: string, sizes: string[]): PatternCounts {
  const sizeLabel = sizes[0] ?? "M";
  const profile = sizeProfileFor(sizeLabel);
  const gauge = gaugeForCraft(craftType);
  const sts = gauge.stitchesPerInch;
  const rows = gauge.rowsPerInch;
  const cardiganEase = garment === "Cardigan" ? 0 : 0;
  const backWidth = profile.bust / 2 + cardiganEase;
  const frontWidth = profile.bust / 4 + (garment === "Cardigan" ? 1.5 : 0);

  return {
    sizeLabel,
    backSts: even(Math.round(backWidth * sts)),
    backRows: Math.round(profile.length * rows),
    frontSts: even(Math.round(frontWidth * sts)),
    sleeveCuffSts: even(Math.round(profile.bust * 0.18 * sts)),
    sleeveUpperSts: even(Math.round(profile.bust * 0.32 * sts)),
    sleeveRows: Math.round(profile.sleeve * rows),
    collarSts: even(Math.round(profile.bust * 0.38 * sts)),
    bandSts: Math.max(8, even(Math.round(sts * 2))),
    pocketSts: even(Math.round(5 * sts)),
    pocketRows: Math.round(4 * rows),
    ribRows: Math.max(6, Math.round(2 * rows)),
  };
}

function even(value: number) {
  return value % 2 === 0 ? value : value + 1;
}

function fallbackSections(
  garment: string,
  isCrochet: boolean,
  stitchWord: string,
  mainFabric: string,
  hasPockets: boolean,
  counts: PatternCounts
): PatternSection[] {
  const castOn = isCrochet ? "Make a foundation chain of" : "Cast on";
  const bindOff = isCrochet ? "Fasten off" : "Bind off";
  const base: PatternSection[] = [];

  const armholeDecRows = Math.max(2, Math.round(counts.backRows * 0.04));
  const neckDecRows = Math.max(3, Math.round(counts.backRows * 0.06));
  const shoulderSts = Math.max(6, Math.round(counts.backSts * 0.28));
  const neckSts = Math.max(8, counts.backSts - shoulderSts * 2);
  const armholeSts = Math.max(2, Math.round(counts.backSts * 0.06));
  const armholeStartRow = Math.round(counts.backRows * 0.62);
  const neckStartRow = Math.round(counts.backRows * 0.86);
  const capRows = Math.round(counts.sleeveRows * 0.22);
  const ribNote = isCrochet ? "back-loop single crochet ribbing" : "k1, p1 ribbing";

  if (garment === "Cardigan") {
    base.push(
      panelSection("Back", "Cast on at the hem and work upward. Armhole shaping starts at the sides near the top; back neck is shaped last.", [
        `${castOn} ${counts.backSts} ${stitchWord}. This is Row 1 - the bottom hem edge.`,
        `Rows 2-${counts.ribRows + 1}: Work in ${ribNote} for the hem.`,
        `Rows ${counts.ribRows + 2}-${armholeStartRow}: Work even in ${mainFabric}. The piece should measure approximately ${Math.round(armholeStartRow / gaugeForCraft(isCrochet ? "crocheting" : "knitting").rowsPerInch * 10) / 10} inches from the cast-on.`,
        `Row ${armholeStartRow + 1}: ${bindOff} ${armholeSts} ${stitchWord} at the beginning and end of this row for the armhole cast-offs (${counts.backSts - armholeSts * 2} ${stitchWord} remain).`,
        `Rows ${armholeStartRow + 2}-${armholeStartRow + armholeDecRows * 2}: Decrease 1 ${stitchWord} at each end of every RS row ${armholeDecRows} times (${counts.backSts - armholeSts * 2 - armholeDecRows * 2} ${stitchWord} remain after all armhole shaping).`,
        `Rows ${armholeStartRow + armholeDecRows * 2 + 1}-${neckStartRow}: Work even in ${mainFabric} until the armhole measures approximately ${Math.round((neckStartRow - armholeStartRow) / gaugeForCraft(isCrochet ? "crocheting" : "knitting").rowsPerInch * 10) / 10} inches.`,
        `Row ${neckStartRow + 1}: Work across to centre, ${bindOff.toLowerCase()} the centre ${neckSts} back-neck ${stitchWord}, work to end. You now have two separate shoulders.`,
        `Rows ${neckStartRow + 2}-${counts.backRows}: Decrease 1 ${stitchWord} at each neck edge every RS row ${neckDecRows} times, then work even until the shoulder has ${shoulderSts} ${stitchWord}.`,
        `Final row: ${bindOff} ${shoulderSts} ${stitchWord} for each shoulder. Fasten off. The back is complete.`,
      ]),
      panelSection("Left Front", "Cast on at the hem and work upward. The center-front edge stays straight for the button band; neckline shaping begins near the top.", [
        `${castOn} ${counts.frontSts} ${stitchWord}. Row 1 is the bottom hem edge.`,
        `Rows 2-${counts.ribRows + 1}: Work in ${ribNote} for the hem, keeping the front edge (center-front) in a 2-4 ${stitchWord} garter or seed-stitch border if desired.`,
        `Rows ${counts.ribRows + 2}-${armholeStartRow}: Work even in ${mainFabric} keeping the center-front edge straight.`,
        `Row ${armholeStartRow + 1}: At the armhole edge (outer side), ${bindOff.toLowerCase()} ${armholeSts} ${stitchWord}.`,
        `Rows ${armholeStartRow + 2}-${armholeStartRow + armholeDecRows * 2}: Decrease 1 ${stitchWord} at the armhole edge every RS row ${armholeDecRows} times.`,
        `Rows ${armholeStartRow + armholeDecRows * 2 + 1}-${neckStartRow}: Work even until the armhole matches the back armhole depth.`,
        `Row ${neckStartRow + 1}: At the center-front (neckline) edge, ${bindOff.toLowerCase()} ${Math.round(neckSts * 0.4)} ${stitchWord} for the front neck.`,
        `Rows ${neckStartRow + 2}-${counts.backRows}: Decrease 1 ${stitchWord} at the neck edge every RS row until ${shoulderSts} ${stitchWord} remain.`,
        `Final row: ${bindOff} remaining ${shoulderSts} ${stitchWord}. Fasten off. The left front is complete.`,
      ]),
      panelSection("Right Front", "Mirror of the left front - armhole shaping is on the opposite (outer) edge, neckline on the center-front edge.", [
        `${castOn} ${counts.frontSts} ${stitchWord}. Row 1 is the bottom hem edge.`,
        `Rows 2-${counts.ribRows + 1}: Work in ${ribNote} for the hem.`,
        `Rows ${counts.ribRows + 2}-${armholeStartRow}: Work even in ${mainFabric} keeping the center-front edge straight.`,
        `Row ${armholeStartRow + 1}: At the armhole edge (outer side), ${bindOff.toLowerCase()} ${armholeSts} ${stitchWord}.`,
        `Rows ${armholeStartRow + 2}-${armholeStartRow + armholeDecRows * 2}: Decrease 1 ${stitchWord} at the armhole edge every RS row ${armholeDecRows} times, mirroring the left front.`,
        `Rows ${armholeStartRow + armholeDecRows * 2 + 1}-${neckStartRow}: Work even until the armhole matches the back.`,
        `Row ${neckStartRow + 1}: At the center-front (neckline) edge, ${bindOff.toLowerCase()} ${Math.round(neckSts * 0.4)} ${stitchWord} for the front neck.`,
        `Rows ${neckStartRow + 2}-${counts.backRows}: Decrease 1 ${stitchWord} at the neck edge every RS row until ${shoulderSts} ${stitchWord} remain.`,
        `Final row: ${bindOff} remaining ${shoulderSts} ${stitchWord}. Fasten off. Block and join shoulder seams before adding the bands.`,
      ]),
      panelSection("Sleeves (make two)", "Both sleeves are identical. Cast on at the cuff and increase toward the upper sleeve, then shape the sleeve cap.", [
        `${castOn} ${counts.sleeveCuffSts} ${stitchWord} for the cuff.`,
        `Rows 1-${counts.ribRows}: Work in ${ribNote} for the cuff.`,
        `Row ${counts.ribRows + 1}: Begin ${mainFabric}. Increase 1 ${stitchWord} at each end of this row.`,
        `Continue increasing 1 ${stitchWord} at each end every 6th row until you have ${counts.sleeveUpperSts} ${stitchWord}.`,
        `Work even in ${mainFabric} until the sleeve measures the required length (approximately ${counts.sleeveRows} rows total from the cuff).`,
        `Sleeve cap: ${bindOff.toLowerCase()} ${armholeSts} ${stitchWord} at the beginning of the next 2 rows.`,
        `Decrease 1 ${stitchWord} at each end of every RS row for ${capRows} rows.`,
        `${bindOff} remaining ${stitchWord}. Make the second sleeve to match.`,
      ]),
      panelSection("Button Bands and Collar", "Bands are worked along the front edges; the collar is picked up around the neckline after the shoulders are joined.", [
        `Button band (left front): Pick up approximately ${counts.bandSts} ${stitchWord} along the left front edge. Work in ${ribNote} for ${Math.max(4, counts.ribRows)} rows. ${bindOff} in rib.`,
        `Buttonhole band (right front): Pick up the same number along the right front edge. Work ${Math.floor(counts.ribRows / 2)} rows in rib.`,
        `Buttonhole row: Work ${Math.round(counts.bandSts * 0.12)} ${stitchWord}, *${isCrochet ? "ch 2, skip 2" : "bind off 2, cast on 2"}, work ${Math.round(counts.bandSts * 0.18)} ${stitchWord}* until ${Math.max(4, Math.round(counts.ribRows * 0.5))} buttonholes are placed. Finish the band in rib. ${bindOff} in rib.`,
        `Collar: With RS facing, beginning at the right front neck edge, pick up approximately ${counts.collarSts} ${stitchWord} around the full neckline.`,
        `Work in ${ribNote} for ${Math.max(6, Math.round(counts.ribRows * 0.8))} rows, or until the collar reaches the desired depth.`,
        `${bindOff} loosely in rib so the neck opening stays comfortable.`,
      ])
    );
    if (hasPockets) {
      base.push(panelSection("Pockets (make two)", "Work as separate patches, then sew them onto the fronts.", [
        `${castOn} ${counts.pocketSts} ${stitchWord}.`,
        `Rows 1-${counts.pocketRows}: Work in ${mainFabric}.`,
        `Pocket top: Work ${Math.max(3, counts.ribRows)} rows in ${ribNote} or garter stitch for a firm edge.`,
        `${bindOff} in pattern. Block both pockets to the same size.`,
        `Try the cardigan on and pin the pockets at your preferred position, then sew them in place with a tapestry needle.`,
      ]));
    }
  } else if (garment === "Sweater" || garment === "Pullover") {
    base.push(
      panelSection("Back", "Cast on at the hem and work upward. Armhole shaping starts at the sides; back neck is shaped near the top.", [
        `${castOn} ${counts.backSts} ${stitchWord}. Row 1 is the bottom hem.`,
        `Rows 2-${counts.ribRows + 1}: Work in ${ribNote} for the hem.`,
        `Rows ${counts.ribRows + 2}-${armholeStartRow}: Work even in ${mainFabric}.`,
        `Row ${armholeStartRow + 1}: ${bindOff} ${armholeSts} ${stitchWord} at each end for armhole cast-offs.`,
        `Rows ${armholeStartRow + 2}-${armholeStartRow + armholeDecRows * 2}: Decrease 1 ${stitchWord} at each end every RS row ${armholeDecRows} times.`,
        `Work even until total row count is approximately ${neckStartRow}.`,
        `Shape back neck: ${bindOff.toLowerCase()} centre ${neckSts} ${stitchWord}; work each shoulder separately, decreasing 1 ${stitchWord} at neck edge ${neckDecRows} times.`,
        `${bindOff} ${shoulderSts} ${stitchWord} on each shoulder.`,
      ]),
      panelSection("Front", "Matches the back to the underarm, then has a deeper neckline shaping at the top.", [
        `${castOn} ${counts.backSts} ${stitchWord}. Row 1 is the bottom hem.`,
        `Rows 2-${counts.ribRows + 1}: Work in ${ribNote}.`,
        `Rows ${counts.ribRows + 2}-${armholeStartRow}: Work even in ${mainFabric}.`,
        `Row ${armholeStartRow + 1}: ${bindOff} ${armholeSts} ${stitchWord} at each end.`,
        `Rows ${armholeStartRow + 2}-${armholeStartRow + armholeDecRows * 2}: Decrease 1 ${stitchWord} at each end every RS row ${armholeDecRows} times.`,
        `Work even until approximately ${Math.round(neckStartRow * 0.92)} rows total.`,
        `Front neck: ${bindOff.toLowerCase()} centre ${Math.round(neckSts * 1.2)} ${stitchWord}; work each side separately, decreasing 1 ${stitchWord} at neck edge every RS row until ${shoulderSts} ${stitchWord} remain.`,
        `${bindOff} shoulder ${stitchWord}. Join shoulder seams before adding collar.`,
      ]),
      panelSection("Sleeves (make two)", "Both sleeves are identical - cast on at the cuff and increase up to the sleeve cap.", [
        `${castOn} ${counts.sleeveCuffSts} ${stitchWord}.`,
        `Rows 1-${counts.ribRows}: Work in ${ribNote}.`,
        `Begin ${mainFabric} and increase 1 ${stitchWord} at each end every 6th row until you have ${counts.sleeveUpperSts} ${stitchWord}.`,
        `Work even until approximately ${counts.sleeveRows} rows total.`,
        `Sleeve cap: ${bindOff.toLowerCase()} ${armholeSts} ${stitchWord} at start of next 2 rows. Decrease at each end every RS row for ${capRows} rows. ${bindOff} remaining ${stitchWord}.`,
      ]),
      panelSection("Collar", "Worked in the round or flat around the neckline after both shoulder seams are joined.", [
        `Join both shoulder seams.`,
        `With RS facing, pick up approximately ${counts.collarSts} ${stitchWord} evenly around the full neckline opening.`,
        `Work in ${ribNote} for ${Math.max(4, counts.ribRows)} rows for a trim neckband, or longer for a turtleneck.`,
        `${bindOff} loosely in rib.`,
      ])
    );
  } else {
    base.push(panelSection(garment, `${garment} - cast on at the beginning edge and work to the finish.`, [
      `${castOn} the required number of ${stitchWord} for the chosen size.`,
      `Work the main body in ${mainFabric} following any colour or stitch chart row by row.`,
      `When shaping is needed (e.g., increases for a sleeve, decreases for a crown), work paired decreases or increases at the edges as described.`,
      `${bindOff} or fasten off when the piece reaches the finished length.`,
      `Block to measurements and seam if needed.`,
    ]));
  }

  base.push({
    name: "Finishing and Assembly",
    description: "Sew the project together in a clear order.",
    instructions: getAssemblyInstructions(garment).map((text, index) => ({ rowNumber: index + 1, text })),
  });

  return base;
}

function panelSection(name: string, description: string, rows: string[]): PatternSection {
  return {
    name,
    description,
    instructions: rows.map((text, index) => ({ rowNumber: index + 1, text })),
  };
}

function buildPreviewImage(params: GenerateParams, title: string): string {
  const label = escapeXml(title);
  const garment = escapeXml(params.garmentType);
  const craft = params.craftType === "crocheting" ? "Crochet" : "Knitting";
  const isCardigan = /cardigan/i.test(params.garmentType);
  const isShawl = /shawl/i.test(params.garmentType);
  const isHat = /hat|beanie/i.test(params.garmentType);
  const colors = ["#fff4d6", "#f26b5e", "#2c7be5", "#4fae68", "#ffd166", "#251a1c"];
  const garmentSketch = isShawl
    ? `<path d="M220 460 L450 200 L680 460 Z" fill="#f26b5e" stroke="${colors[5]}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M450 200 L450 460" stroke="#ffd166" stroke-width="10" stroke-linecap="round"/>
  <path d="M310 360 C390 395 510 395 590 360" fill="none" stroke="#2c7be5" stroke-width="8" stroke-linecap="round"/>`
    : isHat
    ? `<path d="M300 392 C312 236 588 236 600 392 Z" fill="#f26b5e" stroke="${colors[5]}" stroke-width="6" stroke-linejoin="round"/>
  <rect x="284" y="382" width="332" height="70" rx="8" fill="#ffd166" stroke="${colors[5]}" stroke-width="6"/>
  <path d="M356 392 L356 452 M412 392 L412 452 M468 392 L468 452 M524 392 L524 452" stroke="${colors[5]}" stroke-width="5"/>`
    : `<path d="M250 210 C250 170 310 150 370 176 L450 212 L530 176 C590 150 650 170 650 210 L620 492 L280 492 Z" fill="#f26b5e" stroke="${colors[5]}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M366 176 C382 222 418 246 450 246 C482 246 518 222 534 176" fill="#fffaf0" stroke="${colors[5]}" stroke-width="6" stroke-linecap="round"/>
  ${isCardigan ? `<path d="M450 246 L450 492" stroke="${colors[5]}" stroke-width="5"/>
  <path d="M336 214 L282 474" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>
  <path d="M564 214 L618 474" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>
  <circle cx="474" cy="306" r="9" fill="#fffaf0" stroke="${colors[5]}" stroke-width="4"/>
  <circle cx="474" cy="360" r="9" fill="#fffaf0" stroke="${colors[5]}" stroke-width="4"/>
  <circle cx="474" cy="414" r="9" fill="#fffaf0" stroke="${colors[5]}" stroke-width="4"/>
  <rect x="322" y="408" width="72" height="58" rx="6" fill="#2c7be5" stroke="${colors[5]}" stroke-width="5"/>
  <rect x="506" y="408" width="72" height="58" rx="6" fill="#2c7be5" stroke="${colors[5]}" stroke-width="5"/>` : `<path d="M314 474 L586 474" stroke="#ffd166" stroke-width="14" stroke-linecap="round"/>
  <path d="M304 224 L268 454" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>
  <path d="M596 224 L632 454" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>`}`;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
  <rect width="900" height="620" fill="${colors[0]}"/>
  <defs>
    <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="${colors[5]}" opacity=".25"/>
    </pattern>
  </defs>
  <rect width="900" height="620" fill="url(#dots)"/>
  <rect x="48" y="42" width="804" height="536" rx="10" fill="#fffaf0" stroke="${colors[5]}" stroke-width="6"/>
  <text x="80" y="96" font-family="Georgia, serif" font-size="42" font-weight="700" fill="${colors[5]}">${label}</text>
  <text x="82" y="130" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#8b6347">${craft} / ${garment} / size ${escapeXml(params.sizes[0] ?? "M")}</text>
  ${garmentSketch}
  <path d="M104 174 L170 146 L148 214 Z" fill="#ffd166" stroke="${colors[5]}" stroke-width="5"/>
  <text x="104" y="250" font-family="Arial Black, Arial, sans-serif" font-size="24" fill="${colors[5]}">PREVIEW</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
