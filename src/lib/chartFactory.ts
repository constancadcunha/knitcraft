import type { Pattern, QuickReferenceGroup, SavedChart } from "@/types";
import type { ImportedChart } from "@/lib/imageChart";
import { GARMENT_TEMPLATES } from "@/types";
import { generateId } from "@/lib/id";
import { getShapeKey, isActiveChartCell } from "@/lib/shapes";
import { getAssemblyInstructions, getQuickReference } from "@/lib/projectGuides";
import { extractNamedColours, hasMotif, hasStarryNight } from "@/lib/designIntent";
import {
  buildGaugeTemplate,
  estimateSkeins,
  GARMENT_SIZES,
  getStitchGraph,
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

function isRibbingEligible(sectionName: string): boolean {
  return /back|front|sleeve|brim|cuff|band|collar|neck|pocket/i.test(sectionName);
}

function isRibbingMarker(colorIndex: number): boolean {
  return colorIndex === 6;
}

function isNotionMarker(colorIndex: number): boolean {
  return colorIndex === 9;
}

export function buildStarterGrid(sectionName: string, w: number, h: number, includeRibbing: boolean): number[][] {
  const grid = makeGrid(w, h);
  const lower = sectionName.toLowerCase();
  const ribRows = Math.min(h, Math.max(4, Math.round(h * 0.08)));
  const isBody = /back|front|sleeve|brim|cuff/i.test(sectionName);
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
  includeRibbing: boolean,
  chartColors: string[],
  importedChart?: ImportedChart
): number[][] {
  const grid = buildStarterGrid(sectionName, w, h, includeRibbing);
  const shapeKey = getShapeKey(garmentKey, sectionName);
  const text = `${pattern.sourceDescription ?? ""} ${pattern.name}`.toLowerCase();
  const seed = hashText(`${text} ${pattern.sourceImagePreview?.slice(0, 800) ?? ""} ${sectionName}`);
  const lower = sectionName.toLowerCase();
  const isBand = lower.includes("button band");
  const isCollar = lower.includes("collar") || lower.includes("neck");
  const decorative = !isBand;
  if (!decorative && !isCollar && !isBand) return grid;

  const ribStart = includeRibbing && isRibbingEligible(sectionName)
    ? h - Math.min(h, Math.max(4, Math.round(h * 0.08)))
    : h;
  const minRow = isCollar ? 0 : Math.max(2, Math.round(h * 0.08));
  const maxRow = Math.max(minRow, ribStart - 2);
  const colours = pickDesignColours(text, seed, chartColors);
  const motif = chooseMotif(text);

  if (importedChart?.grid.length) {
    applyImportedChart(grid, shapeKey, w, h, importedChart, minRow, maxRow);
    if (isBand) addButtonMarkers(grid, w, h);
    return grid;
  }

  const imageReference = !!pattern.sourceImagePreview && !importedChart;
  if (imageReference) {
    drawImageReferenceLayout(grid, shapeKey, sectionName, w, h, chartColors, minRow, maxRow);
  }

  if (hasStarryNight(text)) {
    drawStarryNight(grid, shapeKey, w, h, chartColors, minRow, maxRow);
  } else if (hasMotif(text, "star") && hasMotif(text, "stripe")) {
    drawStarsAndStripes(grid, shapeKey, w, h, chartColors, colours, minRow, maxRow);
  } else if (motif !== null && !hasMotif(text, "flower") && !hasMotif(text, "heart") && !hasMotif(text, "star")) {
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
  }

  if (hasMotif(text, "flower")) drawFlowerRepeats(grid, shapeKey, w, h, colours, text);
  if (hasMotif(text, "heart")) drawHeart(grid, shapeKey, w, h, colours[0]);
  if (hasMotif(text, "star") && !hasMotif(text, "stripe") && !hasStarryNight(text)) drawStarRepeats(grid, shapeKey, w, h, colours[0], text);

  if (isBand) addButtonMarkers(grid, w, h);
  return grid;
}

function chooseMotif(text: string): "stripes" | "checker" | "waves" | "diamonds" | "speckles" | null {
  if (hasMotif(text, "stripe")) return "stripes";
  if (hasMotif(text, "checker")) return "checker";
  if (hasMotif(text, "wave")) return "waves";
  if (hasMotif(text, "diamond")) return "diamonds";
  if (hasMotif(text, "speckle")) return "speckles";
  return null;
}

function pickDesignColours(text: string, seed: number, chartColors: string[]): number[] {
  const paletteSize = chartColors.length;
  const maxIndex = Math.max(0, paletteSize - 1);
  if (maxIndex === 0) return [0];

  const named = extractNamedColours(text);
  const picked = named
    .map((colour) => chartColors.findIndex((hex) => hexEquals(hex, colour.hex)))
    .filter((index) => index > 0);
  const fallback = Array.from({ length: maxIndex }, (_, index) => index + 1);
  for (let i = 0; picked.length < Math.min(4, maxIndex); i++) {
    picked.push(fallback[(seed + i) % fallback.length]);
  }
  return Array.from(new Set(picked)).slice(0, Math.min(4, paletteSize));
}

function hexEquals(a: string | undefined, b: string): boolean {
  return (a ?? "").toLowerCase() === b.toLowerCase();
}

function drawImageReferenceLayout(
  grid: number[][],
  shapeKey: string,
  sectionName: string,
  w: number,
  h: number,
  chartColors: string[],
  minRow: number,
  maxRow: number
) {
  const lower = sectionName.toLowerCase();
  const isFrontLike = /front|body|sweater|pullover|hand|scarf|blanket|shawl|cloth|headband|leg warmer|cowl/.test(lower);
  if (!isFrontLike || lower.includes("band") || lower.includes("collar") || lower.includes("cuff")) return;

  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const light = findLightColorIndex(chartColors, 1);
  const dark = findDarkColorIndex(chartColors, 2);
  const accent = chartColors[3] ? 3 : dark;
  const top = Math.max(minRow + 2, Math.round(h * 0.18));
  const bandTop = Math.max(minRow + 4, Math.round(h * 0.48));
  const bandBottom = Math.min(maxRow - 2, Math.round(h * 0.68));

  for (let row = bandTop; row <= bandBottom; row++) {
    for (let col = 0; col < w; col++) {
      if (isActiveChartCell(activeShape, undefined, row, col, w, h)) grid[row][col] = light;
    }
  }

  drawPixelMotif(grid, shapeKey, w, h, Math.round(w * 0.5), top, Math.max(3, Math.round(Math.min(w, h) / 18)), dark, light);
  drawTextBars(grid, shapeKey, w, h, Math.round((bandTop + bandBottom) / 2), dark, accent);
}

function drawPixelMotif(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  size: number,
  dark: number,
  light: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const pattern = [
    "0011100",
    "0111110",
    "1101011",
    "1111111",
    "1011101",
    "0010100",
  ];
  const cell = Math.max(1, Math.round(size / 3));
  const startRow = cy - Math.round((pattern.length * cell) / 2);
  const startCol = cx - Math.round((pattern[0].length * cell) / 2);

  pattern.forEach((line, pr) => {
    [...line].forEach((char, pc) => {
      if (char !== "1") return;
      const fill = pr >= 2 && pr <= 4 && pc >= 2 && pc <= 4 ? light : dark;
      for (let rr = 0; rr < cell; rr++) {
        for (let cc = 0; cc < cell; cc++) {
          const row = startRow + pr * cell + rr;
          const col = startCol + pc * cell + cc;
          if (inGrid(grid, row, col) && isActiveChartCell(activeShape, undefined, row, col, w, h)) grid[row][col] = fill;
        }
      }
    });
  });
}

function drawTextBars(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  centerRow: number,
  dark: number,
  accent: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const widths = [5, 3, 4, 5, 2, 4, 3, 5, 4, 2];
  const total = widths.reduce((sum, value) => sum + value, 0) + (widths.length - 1) * 2;
  let col = Math.max(2, Math.round((w - total) / 2));

  widths.forEach((width, index) => {
    const color = index === 5 ? accent : dark;
    for (let row = centerRow - 1; row <= centerRow + 1; row++) {
      for (let c = col; c < col + width; c++) {
        if (inGrid(grid, row, c) && isActiveChartCell(activeShape, undefined, row, c, w, h)) grid[row][c] = color;
      }
    }
    col += width + 2;
  });
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

function drawStarRepeats(grid: number[][], shapeKey: string, w: number, h: number, colorIndex: number, text: string) {
  const large = /large|big|single|center|centre|middle/.test(text);
  const stars = large
    ? [{ cx: Math.round(w * 0.5), cy: Math.round(h * 0.4), radius: Math.max(6, Math.floor(Math.min(w, h) / 7)) }]
    : Array.from({ length: 6 }, (_, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        return {
          cx: Math.round(w * (0.24 + col * 0.26)),
          cy: Math.round(h * (0.25 + row * 0.26)),
          radius: Math.max(4, Math.floor(Math.min(w, h) / 12)),
        };
      });

  for (const star of stars) {
    drawStar(grid, shapeKey, w, h, star.cx, star.cy, star.radius, colorIndex);
  }
}

function drawStarsAndStripes(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  chartColors: string[],
  motifColours: number[],
  minRow: number,
  maxRow: number
) {
  const red = colorIndexForHex(chartColors, "#d94b42", motifColours[0] ?? 1);
  const blue = colorIndexForHex(chartColors, "#2c7be5", motifColours[1] ?? motifColours[0] ?? 1);
  const white = colorIndexForHex(chartColors, "#ffffff", 0);
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const stripeHeight = Math.max(3, Math.round((maxRow - minRow) / 12));
  const fieldW = Math.max(8, Math.round(w * 0.42));
  const fieldH = Math.max(8, Math.round((maxRow - minRow) * 0.42));

  for (let row = minRow; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      const inStripe = Math.floor((row - minRow) / stripeHeight) % 2 === 0;
      grid[row][col] = inStripe ? red : white;
      if (row < minRow + fieldH && col < fieldW) grid[row][col] = blue;
    }
  }

  const starRows = 4;
  const starCols = 4;
  for (let r = 0; r < starRows; r++) {
    for (let c = 0; c < starCols; c++) {
      drawStar(
        grid,
        shapeKey,
        w,
        h,
        Math.round(fieldW * (0.18 + c * 0.2)),
        minRow + Math.round(fieldH * (0.18 + r * 0.2)),
        Math.max(2, Math.round(Math.min(fieldW, fieldH) / 16)),
        white
      );
    }
  }
}

function drawStarryNight(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  chartColors: string[],
  minRow: number,
  maxRow: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const deepBlue = colorIndexForHex(chartColors, "#1d2f6f", 0);
  const yellow = colorIndexForHex(chartColors, "#ffd166", 1);
  const skyBlue = colorIndexForHex(chartColors, "#6aa6ff", 2);
  const white = colorIndexForHex(chartColors, "#ffffff", 3);
  const dark = colorIndexForHex(chartColors, "#251a1c", deepBlue);

  for (let row = minRow; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      grid[row][col] = deepBlue;
      const waveA = Math.round(h * 0.22 + Math.sin(col / 7) * 4 + Math.sin(col / 17) * 5);
      const waveB = Math.round(h * 0.42 + Math.sin(col / 6 + 1.4) * 4);
      if (Math.abs(row - waveA) <= 1 || Math.abs(row - waveB) <= 1) grid[row][col] = skyBlue;
      if (Math.abs(row - (waveA + 4)) <= 1 && col % 3 !== 0) grid[row][col] = white;
    }
  }

  const stars = [
    { cx: 0.18, cy: 0.22, r: 0.055 },
    { cx: 0.38, cy: 0.31, r: 0.04 },
    { cx: 0.62, cy: 0.2, r: 0.052 },
    { cx: 0.78, cy: 0.38, r: 0.035 },
  ];
  stars.forEach((star) => drawStar(grid, shapeKey, w, h, Math.round(w * star.cx), Math.round(h * star.cy), Math.max(3, Math.round(Math.min(w, h) * star.r)), yellow));

  drawSwirl(grid, shapeKey, w, h, Math.round(w * 0.48), Math.round(h * 0.43), Math.max(8, Math.round(Math.min(w, h) / 7)), yellow, skyBlue);

  const hillTop = Math.round(h * 0.74);
  for (let row = hillTop; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      if (row > hillTop + Math.sin(col / 8) * 4) grid[row][col] = dark;
    }
  }
}

function drawSwirl(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
  yellow: number,
  blue: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  for (let row = cy - radius; row <= cy + radius; row++) {
    for (let col = cx - radius; col <= cx + radius; col++) {
      if (!inGrid(grid, row, col) || !isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      const dx = col - cx;
      const dy = row - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 2 || r > radius) continue;
      const theta = Math.atan2(dy, dx);
      const spiral = ((theta + r / 3) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (spiral < 0.45 || spiral > Math.PI * 2 - 0.45) grid[row][col] = r < radius * 0.58 ? yellow : blue;
    }
  }
}

function drawStar(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
  colorIndex: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  for (let row = cy - radius; row <= cy + radius; row++) {
    for (let col = cx - radius; col <= cx + radius; col++) {
      const dx = Math.abs(col - cx);
      const dy = Math.abs(row - cy);
      const centerDiamond = dx + dy <= radius * 0.55;
      const topPoint = dy > radius * 0.25 && row < cy && dx <= Math.max(1, radius * 0.18);
      const bottomPoint = dy > radius * 0.25 && row > cy && dx <= Math.max(1, radius * 0.18);
      const sidePoint = dx > radius * 0.25 && dy <= Math.max(1, radius * 0.18);
      const inside = centerDiamond || topPoint || bottomPoint || sidePoint;
      if (inside && inGrid(grid, row, col) && isActiveChartCell(activeShape, undefined, row, col, w, h)) {
        grid[row][col] = colorIndex;
      }
    }
  }
}

function colorIndexForHex(chartColors: string[], hex: string, fallback: number): number {
  const index = chartColors.findIndex((color) => hexEquals(color, hex));
  return index >= 0 ? index : fallback;
}

function findLightColorIndex(chartColors: string[], fallback: number): number {
  let best = fallback;
  let bestScore = -1;
  chartColors.forEach((hex, index) => {
    if (index === 0) return;
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const score = rgb[0] + rgb[1] + rgb[2];
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function findDarkColorIndex(chartColors: string[], fallback: number): number {
  let best = fallback;
  let bestScore = Number.POSITIVE_INFINITY;
  chartColors.forEach((hex, index) => {
    if (index === 0) return;
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const score = rgb[0] + rgb[1] + rgb[2];
    if (score < bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function drawFlowerRepeats(grid: number[][], shapeKey: string, w: number, h: number, colours: number[], text: string) {
  const large = /large|big|single|center|centre|middle/.test(text);
  const petal = colours[0] ?? 1;
  const centre = colours[1] ?? petal;
  const leaf = colours[2] ?? colours[1] ?? petal;
  const flowers = large
    ? [{ cx: Math.round(w * 0.5), cy: Math.round(h * 0.42), size: Math.max(5, Math.round(Math.min(w, h) / 9)) }]
    : Array.from({ length: 9 }, (_, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        return {
          cx: Math.round(w * (0.22 + col * 0.28)),
          cy: Math.round(h * (0.2 + row * 0.23)),
          size: Math.max(3, Math.round(Math.min(w, h) / 18)),
        };
      });

  for (const flower of flowers) {
    drawFlower(grid, shapeKey, w, h, flower.cx, flower.cy, flower.size, petal, centre, leaf);
  }
}

function drawFlower(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  size: number,
  petal: number,
  centre: number,
  leaf: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  for (let row = cy - size * 3; row <= cy + size * 4; row++) {
    for (let col = cx - size * 3; col <= cx + size * 3; col++) {
      if (!inGrid(grid, row, col) || !isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      const dx = col - cx;
      const dy = row - cy;
      const petalShape =
        dist(dx, dy + size) <= size * 1.15 ||
        dist(dx, dy - size) <= size * 1.15 ||
        dist(dx + size, dy) <= size * 1.15 ||
        dist(dx - size, dy) <= size * 1.15;
      const centreShape = dist(dx, dy) <= Math.max(1.6, size * 0.55);
      const stemShape = Math.abs(dx) <= Math.max(1, Math.round(size * 0.18)) && dy > size * 1.1 && dy < size * 4;
      const leafShape =
        (dy > size * 2 && Math.abs(dx - size * 0.8) + Math.abs(dy - size * 2.7) < size * 1.2) ||
        (dy > size * 2.4 && Math.abs(dx + size * 0.8) + Math.abs(dy - size * 3.1) < size * 1.2);
      if (stemShape || leafShape) grid[row][col] = leaf;
      if (petalShape) grid[row][col] = petal;
      if (centreShape) grid[row][col] = centre;
    }
  }
}

function dist(dx: number, dy: number) {
  return Math.sqrt(dx * dx + dy * dy);
}

function applyImportedChart(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  importedChart: ImportedChart,
  minRow: number,
  maxRow: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const sourceH = importedChart.grid.length;
  const sourceW = importedChart.grid[0]?.length ?? 0;
  if (!sourceW || !sourceH) return;

  let top = h;
  let bottom = -1;
  let left = w;
  let right = -1;

  for (let row = minRow; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      top = Math.min(top, row);
      bottom = Math.max(bottom, row);
      left = Math.min(left, col);
      right = Math.max(right, col);
    }
  }

  if (bottom < top || right < left) return;

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      const sourceRow = Math.min(
        sourceH - 1,
        Math.max(0, Math.floor(((row - top) / Math.max(1, bottom - top + 1)) * sourceH))
      );
      const sourceCol = Math.min(
        sourceW - 1,
        Math.max(0, Math.floor(((col - left) / Math.max(1, right - left + 1)) * sourceW))
      );
      grid[row][col] = importedChart.grid[sourceRow]?.[sourceCol] ?? 0;
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
  options: { includeRibbing: boolean; colors?: string[]; importedChart?: ImportedChart }
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
  const chartColors = options.colors?.length
    ? options.colors
    : options.importedChart?.colors?.length
      ? options.importedChart.colors
      : DEFAULT_CHART_COLORS;

  const chartSections = sections.map((section, index): SavedChart => {
    const w = Math.max(1, Math.round(section.w * SIZE_W_SCALE[size]));
    const h = Math.max(1, Math.round(section.h * SIZE_H_SCALE[size]));
    const grid = buildDesignedGrid(pattern, garmentKey, section.name, w, h, options.includeRibbing, chartColors, options.importedChart);
    const shapeKey = getShapeKey(garmentKey, section.name);
    return {
      id: generateId(),
      name: `${pattern.name} - ${section.name}`,
      width: w,
      height: h,
      cells: grid.map((row) => row.map((colorIndex) => ({ colorIndex }))),
      colors: chartColors,
      createdAt,
      thumbnail: chartGridPreview(grid, chartColors),
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
    sourcePatternId: input.pattern.id !== input.projectId ? input.pattern.id : undefined,
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
  const startSlug = pattern.craftType === "crocheting" ? "foundation-chain" : "cast-on";
  const startImage = graphImage(pattern.craftType, pattern.craftType === "crocheting" ? "single-crochet" : "knit");
  const chartImage = graphImage(pattern.craftType, pattern.craftType === "crocheting" ? "single-crochet" : "stockinette");
  const startDetail = pattern.craftType === "crocheting"
    ? "Crochet starts with a foundation chain or foundation stitches. Chain loosely, then work Row 1 into the chain; do not use knitting cast-on language."
    : "Knitting starts by placing live stitches on the needle. Use the cast-on count listed for the section you are making; Row 1 is worked after those stitches are on the needle.";

  return [
    {
      title: "Start method",
      items: [
        { title: startTitle, detail: startDetail, imageUrl: startImage, sourceUrl: `/learn#learn-${startSlug}` },
        { title: "Gauge swatch", detail: `Make a 4 in swatch in the main stitch before committing. The tracker uses ${size} as the chart size; change counts if your swatch differs.`, sourceUrl: "/learn#learn-gauge-swatch" },
        { title: "Chart direction", detail: pattern.craftType === "knitting" ? "Flat knitting charts are worked bottom up. Right-side rows are usually read right to left as knit-facing stitches; wrong-side rows are usually left to right as purl-facing equivalents unless the pattern says otherwise." : "Crochet charts are worked bottom up unless marked as rounds. Read row direction from the chart arrows and turning notes.", imageUrl: chartImage, sourceUrl: `/learn#learn-${pattern.craftType === "knitting" ? "reading-flat-charts" : "reading-crochet-charts"}` },
      ],
    },
    ...(includeRibbing ? [getRibbingReference(pattern.craftType)] : []),
  ];
}

function graphImage(craftType: Pattern["craftType"], id: string): string | undefined {
  return getStitchGraph(craftType).find((entry) => entry.id === id)?.imageUrl;
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
        const raw = chart.cells[row]?.[col]?.colorIndex ?? 0;
        const colorIndex = isRibbingMarker(raw) || isNotionMarker(raw) ? 0 : raw;
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
    detail: `Chart colour ${entry.colorIndex + 1}. This colour covers about ${Math.max(1, Math.round((entry.count / Math.max(1, totalCells)) * 100))}% of charted stitches. Buy the same dye lot when possible.`,
    colorHex:
      chartSections.find((chart) => chart.colors[entryColorIndex(entry.colorIndex)])
        ?.colors[entryColorIndex(entry.colorIndex)] ?? DEFAULT_CHART_COLORS[entry.colorIndex],
  }));
}

function entryColorIndex(colorIndex: number): number {
  return isRibbingMarker(colorIndex) || isNotionMarker(colorIndex) ? 0 : colorIndex;
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
