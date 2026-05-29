import type { Pattern, QuickReferenceGroup, SavedChart } from "@/types";
import { GARMENT_TEMPLATES } from "@/types";
import { generateId } from "@/lib/id";
import { getShapeKey, isActiveChartCell } from "@/lib/shapes";
import { getAssemblyInstructions, getQuickReference } from "@/lib/projectGuides";
import {
  buildGaugeTemplate,
  estimateSkeins,
  GARMENT_SIZES,
  getRibbingReference,
  type GarmentSize,
  SIZE_H_SCALE,
  SIZE_W_SCALE,
} from "@/lib/craftKnowledge";

export const DEFAULT_CHART_COLORS = [
  "#f5ede0", "#8b6347", "#c9785c", "#6a9470",
  "#9e7a8a", "#2e1f14", "#c4a07e", "#6e88a8",
  "#e8c46a", "#ffffff",
];

export function makeGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

export function buildStarterGrid(sectionName: string, w: number, h: number, includeRibbing: boolean): number[][] {
  const grid = makeGrid(w, h);
  const lower = sectionName.toLowerCase();
  const ribRows = Math.min(h, Math.max(4, Math.round(h * 0.08)));
  const isBody = /back|front|sleeve|brim|cuff|scarf|blanket|shawl/i.test(sectionName);
  const isPocket = lower.includes("pocket");
  const isBand = lower.includes("button band");
  const isCollar = lower.includes("collar") || lower.includes("neck");

  if (includeRibbing && isBody) {
    for (let row = h - ribRows; row < h; row++) {
      for (let col = 0; col < w; col++) grid[row][col] = col % 2 === 0 ? 6 : 0;
    }
  }

  if (includeRibbing && isPocket) {
    for (let row = 0; row < Math.min(4, h); row++) {
      for (let col = 0; col < w; col++) grid[row][col] = col % 2 === 0 ? 6 : 0;
    }
  }

  if (isBand) {
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) grid[row][col] = includeRibbing && col % 2 === 0 ? 6 : 0;
    }
    const buttonCount = Math.max(4, Math.min(7, Math.round(h / 18)));
    const center = Math.floor(w / 2);
    for (let i = 0; i < buttonCount; i++) {
      const row = Math.round(h * 0.18 + (i * h * 0.62) / Math.max(1, buttonCount - 1));
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = row + dr;
          const cc = center + dc;
          if (rr >= 0 && rr < h && cc >= 0 && cc < w) grid[rr][cc] = 9;
        }
      }
    }
  }

  if (includeRibbing && isCollar) {
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) grid[row][col] = row % 2 === 0 ? 6 : 0;
    }
  }

  return grid;
}

function buildDesignedGrid(
  pattern: Pattern,
  garmentKey: string,
  sectionName: string,
  w: number,
  h: number,
  includeRibbing: boolean
): number[][] {
  const grid = buildStarterGrid(sectionName, w, h, includeRibbing);
  const shapeKey = getShapeKey(garmentKey, sectionName);
  const text = `${pattern.name} ${pattern.garmentType} ${pattern.sourceDescription ?? ""} ${pattern.notes ?? ""}`.toLowerCase();
  const seed = hashText(`${text} ${pattern.sourceImagePreview?.slice(0, 800) ?? ""} ${sectionName}`);
  const lower = sectionName.toLowerCase();
  const decorative = /back|front|sleeve|body|scarf|shawl|blanket|pocket/i.test(sectionName);
  const isBand = lower.includes("button band");
  const isCollar = lower.includes("collar") || lower.includes("neck");
  if (!decorative && !isCollar && !isBand) return grid;

  const ribStart = includeRibbing && decorative ? h - Math.min(h, Math.max(4, Math.round(h * 0.08))) : h;
  const minRow = isCollar ? 0 : Math.max(2, Math.round(h * 0.08));
  const maxRow = Math.max(minRow, ribStart - 2);
  const colours = pickDesignColours(text, seed);
  const motif = chooseMotif(text, seed);

  for (let row = minRow; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(shapeKey === "rect" ? undefined : shapeKey, undefined, row, col, w, h)) continue;
      const normalizedRow = row - minRow;
      const band = Math.floor((normalizedRow + seed) / Math.max(4, Math.round(h / 14)));
      if (motif === "stripes" && (normalizedRow + seed) % 12 < 4) grid[row][col] = colours[band % colours.length];
      if (motif === "checker" && (Math.floor(col / 5) + Math.floor(normalizedRow / 5) + seed) % 2 === 0) grid[row][col] = colours[(band + col) % colours.length];
      if (motif === "waves" && Math.abs((col + Math.round(Math.sin(normalizedRow / 4) * 8)) % 18 - 9) < 2) grid[row][col] = colours[(band + 1) % colours.length];
      if (motif === "diamonds") {
        const period = Math.max(10, Math.round(w / 4));
        const dist = Math.abs(((col + seed) % period) - period / 2) + Math.abs((normalizedRow % period) - period / 2);
        if (dist < period * 0.18) grid[row][col] = colours[(band + 2) % colours.length];
      }
      if (motif === "speckles" && hashText(`${seed}:${row}:${col}`) % 31 < 3) grid[row][col] = colours[hashText(`${row}:${col}`) % colours.length];
    }
  }

  if (/heart|love|sweet|valentine/i.test(text)) drawHeart(grid, shapeKey, w, h, colours[0]);
  else if (/star|celestial|night|moon|spark/i.test(text)) drawStar(grid, shapeKey, w, h, colours[0]);
  else if (/flower|floral|daisy|rose|garden|bloom/i.test(text)) drawFlowerRepeats(grid, shapeKey, w, h, colours);
  else if (!/stripe|check|plaid|argyle|wave|diamond/i.test(text)) drawCenterBadge(grid, shapeKey, w, h, colours[0], seed);

  if (isBand) addButtonMarkers(grid, w, h);
  return grid;
}

function chooseMotif(text: string, seed: number): "stripes" | "checker" | "waves" | "diamonds" | "speckles" {
  if (/stripe|ribbed|line/.test(text)) return "stripes";
  if (/check|plaid|gingham/.test(text)) return "checker";
  if (/wave|wavy|ocean/.test(text)) return "waves";
  if (/argyle|diamond|fair isle|fairisle/.test(text)) return "diamonds";
  return (["diamonds", "waves", "checker", "speckles"] as const)[seed % 4];
}

function pickDesignColours(text: string, seed: number): number[] {
  const picked: number[] = [];
  const matches: Array<[RegExp, number]> = [
    [/red|rose|pink|coral|warm/, 2],
    [/green|sage|forest|olive/, 3],
    [/purple|mauve|lavender/, 4],
    [/black|charcoal|espresso|brown/, 5],
    [/blue|navy|sky|denim/, 7],
    [/yellow|gold|mustard|sun/, 8],
    [/white|cream|ivory/, 9],
  ];
  for (const [regex, index] of matches) if (regex.test(text)) picked.push(index);
  const fallback = [2, 3, 7, 8, 4, 5];
  for (let i = 0; picked.length < 3; i++) picked.push(fallback[(seed + i) % fallback.length]);
  return Array.from(new Set(picked)).slice(0, 4);
}

function drawHeart(grid: number[][], shapeKey: string, w: number, h: number, colorIndex: number) {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h * 0.42);
  const scale = Math.max(3, Math.floor(Math.min(w, h) / 9));
  for (let row = cy - scale * 2; row <= cy + scale * 2; row++) {
    for (let col = cx - scale * 3; col <= cx + scale * 3; col++) {
      const x = (col - cx) / scale;
      const y = (row - cy) / scale;
      const inside = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0;
      if (inside && inGrid(grid, row, col) && isActiveChartCell(shapeKey === "rect" ? undefined : shapeKey, undefined, row, col, w, h)) {
        grid[row][col] = colorIndex;
      }
    }
  }
}

function drawStar(grid: number[][], shapeKey: string, w: number, h: number, colorIndex: number) {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h * 0.38);
  const radius = Math.max(6, Math.floor(Math.min(w, h) / 7));
  for (let row = cy - radius; row <= cy + radius; row++) {
    for (let col = cx - radius; col <= cx + radius; col++) {
      const dx = Math.abs(col - cx);
      const dy = Math.abs(row - cy);
      const inside = dx + dy < radius * 0.7 || dx < 2 || dy < 2 || Math.abs(dx - dy) < 2;
      if (inside && inGrid(grid, row, col) && isActiveChartCell(shapeKey === "rect" ? undefined : shapeKey, undefined, row, col, w, h)) {
        grid[row][col] = colorIndex;
      }
    }
  }
}

function drawFlowerRepeats(grid: number[][], shapeKey: string, w: number, h: number, colours: number[]) {
  const stepX = Math.max(12, Math.round(w / 4));
  const stepY = Math.max(12, Math.round(h / 7));
  for (let cy = Math.round(h * 0.18); cy < h * 0.82; cy += stepY) {
    for (let cx = Math.round(w * 0.18); cx < w * 0.86; cx += stepX) {
      const colorIndex = colours[(cx + cy) % colours.length];
      for (const [dr, dc] of [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]]) {
        const row = cy + dr;
        const col = cx + dc;
        if (inGrid(grid, row, col) && isActiveChartCell(shapeKey === "rect" ? undefined : shapeKey, undefined, row, col, w, h)) {
          grid[row][col] = colorIndex;
        }
      }
    }
  }
}

function drawCenterBadge(grid: number[][], shapeKey: string, w: number, h: number, colorIndex: number, seed: number) {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h * 0.42);
  const radius = Math.max(5, Math.floor(Math.min(w, h) / 9));
  for (let row = cy - radius; row <= cy + radius; row++) {
    for (let col = cx - radius; col <= cx + radius; col++) {
      const dist = Math.abs(col - cx) + Math.abs(row - cy);
      if ((dist < radius && (row + col + seed) % 3 !== 0) && inGrid(grid, row, col) && isActiveChartCell(shapeKey === "rect" ? undefined : shapeKey, undefined, row, col, w, h)) {
        grid[row][col] = colorIndex;
      }
    }
  }
}

function addButtonMarkers(grid: number[][], w: number, h: number) {
  const buttonCount = Math.max(4, Math.min(8, Math.round(h / 16)));
  const col = Math.floor(w / 2);
  for (let i = 0; i < buttonCount; i++) {
    const row = Math.round(h * 0.16 + (i * h * 0.68) / Math.max(1, buttonCount - 1));
    if (inGrid(grid, row, col)) grid[row][col] = 9;
  }
}

function inGrid(grid: number[][], row: number, col: number) {
  return row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0);
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function createProjectChartsFromPattern(
  pattern: Pattern,
  options: { includeRibbing: boolean }
): SavedChart[] {
  const projectId = generateId();
  const size = normalizeSize(pattern.currentSize || pattern.sizes[0]);
  const garmentKey = normalizeGarmentKey(pattern.garmentType);
  const template = buildGaugeTemplate(pattern.craftType)[garmentKey] ?? GARMENT_TEMPLATES[garmentKey];
  const sections = template?.sections?.length ? template.sections : [{ name: pattern.garmentType, w: 40, h: 60 }];
  const createdAt = new Date().toISOString();
  const projectName = pattern.name;
  const sectionCount = sections.length + 3;
  const assemblyInstructions = getAssemblyInstructions(garmentKey);
  const quickReference = getQuickReference(pattern.craftType, garmentKey);

  const chartSections = sections.map((section, index): SavedChart => {
    const w = Math.max(1, Math.round(section.w * SIZE_W_SCALE[size]));
    const h = Math.max(1, Math.round(section.h * SIZE_H_SCALE[size]));
    const grid = buildDesignedGrid(pattern, garmentKey, section.name, w, h, options.includeRibbing);
    const shapeKey = getShapeKey(garmentKey, section.name);
    return {
      id: generateId(),
      name: `${pattern.name} - ${section.name}`,
      width: w,
      height: h,
      cells: grid.map((row) => row.map((colorIndex) => ({ colorIndex }))),
      colors: DEFAULT_CHART_COLORS,
      createdAt,
      thumbnail: chartGridPreview(grid, DEFAULT_CHART_COLORS),
      completedCells: {},
      shapeKey: shapeKey && shapeKey !== "rect" ? shapeKey : undefined,
      projectId,
      projectName,
      craftType: pattern.craftType,
      garmentType: garmentKey,
      garmentSize: size,
      sectionName: section.name,
      sectionIndex: index + 2,
      sectionCount,
      sectionRole: "chart",
      includeRibbing: options.includeRibbing,
      sourcePatternId: pattern.id,
      assemblyInstructions,
      quickReference,
    };
  });

  const materialsChart = makeGuideChart({
    id: generateId(),
    projectId,
    projectName,
    pattern,
    sectionName: "Shopping list",
    sectionIndex: 0,
    sectionCount,
    role: "materials",
    guideGroups: buildShoppingGroups(pattern, garmentKey, size, chartSections),
    createdAt,
  });

  const prepChart = makeGuideChart({
    id: generateId(),
    projectId,
    projectName,
    pattern,
    sectionName: "Start here",
    sectionIndex: 1,
    sectionCount,
    role: "prep",
    guideGroups: buildStartGroups(pattern, size, options.includeRibbing),
    createdAt,
  });

  const finishChart = makeGuideChart({
    id: generateId(),
    projectId,
    projectName,
    pattern,
    sectionName: "Finish off",
    sectionIndex: sectionCount - 1,
    sectionCount,
    role: "finish",
    guideGroups: buildFinishingGroups(garmentKey, pattern.craftType),
    createdAt,
  });

  return [materialsChart, prepChart, ...chartSections, finishChart];
}

export function createProjectGuideCharts(input: {
  projectId: string;
  projectName: string;
  craftType: Pattern["craftType"];
  garmentType: string;
  garmentSize?: string;
  includeRibbing: boolean;
  chartSectionCount: number;
  chartSections?: SavedChart[];
  createdAt?: string;
  sourcePatternId?: string;
  existingMaterials?: SavedChart;
  existingPrep?: SavedChart;
  existingFinish?: SavedChart;
}): [SavedChart, SavedChart, SavedChart] {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const pattern = makePatternShell(input, createdAt);
  const garmentKey = normalizeGarmentKey(input.garmentType);
  const size = normalizeSize(input.garmentSize);
  const sectionCount = input.chartSectionCount + 3;

  const materialsChart = makeGuideChart({
    id: input.existingMaterials?.id ?? generateId(),
    projectId: input.projectId,
    projectName: input.projectName,
    pattern,
    sectionName: "Shopping list",
    sectionIndex: 0,
    sectionCount,
    role: "materials",
    guideGroups: buildShoppingGroups(pattern, garmentKey, size, input.chartSections ?? []),
    createdAt: input.existingMaterials?.createdAt ?? createdAt,
  });
  materialsChart.completedCells = input.existingMaterials?.completedCells ?? {};

  const prepChart = makeGuideChart({
    id: input.existingPrep?.id ?? generateId(),
    projectId: input.projectId,
    projectName: input.projectName,
    pattern,
    sectionName: "Start here",
    sectionIndex: 1,
    sectionCount,
    role: "prep",
    guideGroups: buildStartGroups(pattern, size, input.includeRibbing),
    createdAt: input.existingPrep?.createdAt ?? createdAt,
  });
  prepChart.completedCells = input.existingPrep?.completedCells ?? {};

  const finishChart = makeGuideChart({
    id: input.existingFinish?.id ?? generateId(),
    projectId: input.projectId,
    projectName: input.projectName,
    pattern,
    sectionName: "Finish off",
    sectionIndex: sectionCount - 1,
    sectionCount,
    role: "finish",
    guideGroups: buildFinishingGroups(garmentKey, input.craftType),
    createdAt: input.existingFinish?.createdAt ?? createdAt,
  });
  finishChart.completedCells = input.existingFinish?.completedCells ?? {};

  return [materialsChart, prepChart, finishChart];
}

export function chartGridPreview(grid: number[][], colors: string[]): string {
  const height = grid.length || 1;
  const width = grid[0]?.length || 1;
  const maxDim = Math.max(width, height);
  const cell = Math.max(2, Math.floor(180 / maxDim));
  const svgW = width * cell;
  const svgH = height * cell;
  const rects = grid
    .map((row, r) =>
      row
        .map((colorIndex, c) => {
          const fill = colors[colorIndex] ?? colors[0] ?? "#fffaf0";
          return `<rect x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${fill}" stroke="rgba(37,26,28,.16)" stroke-width=".5"/>`;
        })
        .join("")
    )
    .join("");
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"><rect width="${svgW}" height="${svgH}" fill="#fffaf0"/>${rects}</svg>`)}`;
}

function makeGuideChart(input: {
  id: string;
  projectId: string;
  projectName: string;
  pattern: Pattern;
  sectionName: string;
  sectionIndex: number;
  sectionCount: number;
  role: "materials" | "prep" | "finish";
  guideGroups: QuickReferenceGroup[];
  createdAt: string;
}): SavedChart {
  const stepCount = Math.max(1, input.guideGroups.reduce((sum, group) => sum + group.items.length, 0));
  return {
    id: input.id,
    name: `${input.projectName} - ${input.sectionName}`,
    width: 1,
    height: stepCount,
    cells: makeGrid(1, stepCount).map((row) => row.map((colorIndex) => ({ colorIndex }))),
    colors: DEFAULT_CHART_COLORS,
    createdAt: input.createdAt,
    completedCells: {},
    projectId: input.projectId,
    projectName: input.projectName,
    craftType: input.pattern.craftType,
    garmentType: normalizeGarmentKey(input.pattern.garmentType),
    garmentSize: normalizeSize(input.pattern.currentSize || input.pattern.sizes[0]),
    sectionName: input.sectionName,
    sectionIndex: input.sectionIndex,
    sectionCount: input.sectionCount,
    sectionRole: input.role,
    guideGroups: input.guideGroups,
    sourcePatternId: input.pattern.id,
    assemblyInstructions: getAssemblyInstructions(input.pattern.garmentType),
    quickReference: getQuickReference(input.pattern.craftType, input.pattern.garmentType),
  };
}

function makePatternShell(
  input: {
    projectId: string;
    projectName: string;
    craftType: Pattern["craftType"];
    garmentType: string;
    garmentSize?: string;
    sourcePatternId?: string;
  },
  createdAt: string
): Pattern {
  const size = normalizeSize(input.garmentSize);
  const garmentKey = normalizeGarmentKey(input.garmentType);
  const skeins = estimateSkeins(garmentKey, size, input.craftType);

  return {
    id: input.sourcePatternId ?? input.projectId,
    name: input.projectName,
    craftType: input.craftType,
    garmentType: garmentKey,
    difficulty: "intermediate",
    estimatedTime: "Project pace",
    gauge: {
      stitches: 0,
      rows: 0,
      swatchSize: "4 in x 4 in",
      needleSize: input.craftType === "crocheting" ? "Hook size needed for gauge" : "Needle size needed for gauge",
      yarnWeight: "Chosen yarn",
    },
    sizes: [size],
    currentSize: size,
    measurements: {},
    materials: {
      yarn: [
        {
          name: "Project yarn",
          color: "As charted",
          weight: "Chosen yarn",
          meterage: 220,
          skeins: { [size]: skeins },
        },
      ],
      needles: [],
      notions: ["Stitch markers", "Tapestry needle", "Measuring tape", "Scissors"],
    },
    abbreviations: [],
    sections: [],
    notes: "",
    currentSection: 0,
    completedRows: {},
    createdAt,
    sourceType: "text",
  };
}

function buildShoppingGroups(
  pattern: Pattern,
  garmentType: string,
  size: GarmentSize,
  chartSections: SavedChart[]
): QuickReferenceGroup[] {
  const tools = pattern.materials.needles.join(", ");
  const notions = pattern.materials.notions.join(", ");
  const yarnPlan = buildYarnShoppingList(pattern, garmentType, size, chartSections);

  return [
    {
      title: "Yarn by colour",
      items: yarnPlan,
    },
    {
      title: "Tools",
      items: [
        {
          title: pattern.craftType === "crocheting" ? "Hook" : "Needles",
          detail: tools || (pattern.craftType === "crocheting" ? "Hook size needed to match gauge." : "Needle size needed to match gauge, plus smaller needles if adding ribbing."),
        },
        {
          title: "Gauge tools",
          detail: "Measuring tape or ruler, stitch markers, and scrap yarn for marking rows or lifelines.",
        },
      ],
    },
    {
      title: "Notions",
      items: [
        {
          title: "Finishing kit",
          detail: notions || "Tapestry needle, scissors, locking markers, waste yarn, and blocking pins or mats.",
        },
        {
          title: "Garment extras",
          detail: garmentType === "Cardigan" ? "Buttons, backing buttons if needed, and pocket placement pins." : "Any closures, labels, or trims your design uses.",
        },
      ],
    },
  ];
}

function buildStartGroups(pattern: Pattern, size: GarmentSize, includeRibbing: boolean): QuickReferenceGroup[] {
  const startTitle = pattern.craftType === "crocheting" ? "Foundation row" : "Cast on";
  const startDetail = pattern.craftType === "crocheting"
    ? "Crochet starts with a foundation chain or foundation stitches. Chain loosely, then work Row 1 into the chain; do not use knitting cast-on language."
    : "Knitting starts by placing live stitches on the needle. Use the cast-on count listed for the section you are making; Row 1 is worked after those stitches are on the needle.";

  return [
    {
      title: "Start method",
      items: [
        { title: startTitle, detail: startDetail },
        { title: "Gauge swatch", detail: `Make a 4 in swatch in the main stitch before committing. The tracker uses ${size} as the chart size; change counts if your swatch differs.` },
        { title: "Chart direction", detail: pattern.craftType === "knitting" ? "Flat knitting charts are worked bottom up. Right-side rows are usually read right to left as knit-facing stitches; wrong-side rows are usually left to right as purl-facing equivalents unless the pattern says otherwise." : "Crochet charts are worked bottom up unless marked as rounds. Read row direction from the chart arrows and turning notes." },
      ],
    },
    ...(includeRibbing ? [getRibbingReference(pattern.craftType)] : []),
  ];
}

function buildYarnShoppingList(
  pattern: Pattern,
  garmentType: string,
  size: GarmentSize,
  chartSections: SavedChart[]
): QuickReferenceGroup["items"] {
  const totalSkeins = Math.max(
    estimateSkeins(garmentType, size, pattern.craftType),
    Number(pattern.materials.yarn[0]?.skeins?.[size] ?? 0)
  );
  const colorCounts = new Map<number, number>();
  let totalCells = 0;

  for (const chart of chartSections) {
    for (let row = 0; row < chart.height; row++) {
      for (let col = 0; col < chart.width; col++) {
        if (!isActiveChartCell(chart.shapeKey, chart.rowShaping, row, col, chart.width, chart.height)) continue;
        const colorIndex = chart.cells[row]?.[col]?.colorIndex ?? 0;
        colorCounts.set(colorIndex, (colorCounts.get(colorIndex) ?? 0) + 1);
        totalCells++;
      }
    }
  }

  if (!totalCells) colorCounts.set(0, 1);
  const entries = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
  const allocated = entries.map(([colorIndex, count]) => ({
    colorIndex,
    count,
    skeins: Math.max(1, Math.round((count / Math.max(1, totalCells)) * totalSkeins)),
  }));
  let sum = allocated.reduce((acc, entry) => acc + entry.skeins, 0);
  while (sum < totalSkeins) {
    allocated[0].skeins++;
    sum++;
  }
  for (let i = 0; sum > totalSkeins && i < allocated.length * 3; i++) {
    const target = allocated[i % allocated.length];
    if (target.skeins > 1) {
      target.skeins--;
      sum--;
    }
  }

  return allocated.map((entry, index) => ({
    title: `${index === 0 ? "Main colour" : `Contrast colour ${index}`} - ${entry.skeins} skein${entry.skeins === 1 ? "" : "s"}`,
    detail: `Chart colour ${entry.colorIndex + 1} (${DEFAULT_CHART_COLORS[entry.colorIndex] ?? "custom"}). This colour covers about ${Math.max(1, Math.round((entry.count / Math.max(1, totalCells)) * 100))}% of charted stitches. Buy the same dye lot when possible.`,
  }));
}

function buildFinishingGroups(garmentType: string, craftType: Pattern["craftType"]): QuickReferenceGroup[] {
  return [
    {
      title: "Assembly order",
      items: getAssemblyInstructions(garmentType).map((detail, index) => ({
        title: `Step ${index + 1}`,
        detail,
      })),
    },
    {
      title: "Final checks",
      items: [
        { title: "Ends", detail: "Weave ends into the wrong side, changing direction at least once so the tail does not slip out." },
        { title: "Blocking", detail: "Block to measurements, then let the project dry fully before wearing or sewing on buttons." },
        { title: "Learn more", detail: craftType === "crocheting" ? "Open Quick Learn for crochet seaming, ribbing, fasten-off, and chart symbols." : "Open Quick Learn for cast-on, bind-off, mattress stitch, picking up stitches, and chart symbols." },
      ],
    },
  ];
}

function normalizeSize(size: string | undefined): GarmentSize {
  if (size === "XXL" || size === "3XL") return "2XL";
  if (GARMENT_SIZES.includes(size as GarmentSize)) return size as GarmentSize;
  return "L";
}

function normalizeGarmentKey(garmentType: string | undefined): string {
  if (!garmentType) return "Sweater";
  if (garmentType === "Hat / Beanie") return "Hat";
  if (garmentType === "Pullover") return "Sweater";
  return garmentType;
}
