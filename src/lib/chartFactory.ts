import type { Pattern, QuickReferenceGroup, SavedChart } from "@/types";
import type { ImportedChart } from "@/lib/imageChart";
import { GARMENT_TEMPLATES } from "@/types";
import { generateId } from "@/lib/id";
import { getShapeKey, isActiveChartCell } from "@/lib/shapes";
import { getAssemblyInstructions, getQuickReference } from "@/lib/projectGuides";
import { detectIconMotif, extractNamedColours, hasMonet, hasMotif, hasStarryNight, type IconMotif } from "@/lib/designIntent";
import { stitchDisplayImage } from "@/lib/stitchImages";
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

function normalizeChartColors(colors: string[]): string[] {
  const next = [...colors];
  for (let i = next.length; i < DEFAULT_CHART_COLORS.length; i++) {
    next[i] = DEFAULT_CHART_COLORS[i];
  }
  return next.slice(0, DEFAULT_CHART_COLORS.length);
}

export function makeGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function isRibbingEligible(sectionName: string): boolean {
  return /back|front|sleeve|brim|cuff|band|collar|neck|pocket/i.test(sectionName);
}

function projectStyleText(pattern: Pattern): string {
  return `${pattern.sourceDescription ?? ""} ${pattern.name} ${pattern.notes ?? ""}`.toLowerCase();
}

function patternChartText(pattern: Pattern): string {
  const sectionText = pattern.sections.flatMap((section) => [
    section.name,
    section.description,
    ...section.instructions.slice(0, 4).map((instruction) => instruction.text),
  ]);
  return [pattern.sourceDescription, pattern.name, pattern.notes, ...sectionText].filter(Boolean).join(" ");
}

function wantsHighNeck(pattern: Pattern): boolean {
  return /turtleneck|roll-neck|roll neck|mock neck|high neck/.test(projectStyleText(pattern));
}

function shapeKeyForPatternSection(pattern: Pattern, garmentKey: string, sectionName: string): string {
  if (wantsHighNeck(pattern) && /^(Sweater|Pullover)$/i.test(garmentKey)) {
    if (/^front$/i.test(sectionName)) return "sweaterFrontHighNeck";
    if (/^back$/i.test(sectionName)) return "sweaterBackHighNeck";
  }
  return getShapeKey(garmentKey, sectionName);
}

function customizeSectionsForStyle(
  baseSections: { name: string; w: number; h: number; role?: "materials" | "prep" | "chart" | "finish" }[],
  garmentKey: string,
  pattern: Pattern
) {
  const text = projectStyleText(pattern);
  const hasPocket = /\bpockets?|patch-pocket|patch pocket\b/.test(text);
  const isOpenFront = /open-front|open front|duster|no buttons|without buttons|skip buttons/.test(text);
  const wantsShawlCollar = /shawl-collar|shawl collar/.test(text);
  const wantsHood = /\bhood(?:ed)?\b/.test(text);
  const wantsTurtleneck = /turtleneck|roll-neck|roll neck|mock neck|high neck/.test(text);

  return baseSections
    .map((section) => {
      if (garmentKey === "Sweater" && /^(collar|neckband)$/i.test(section.name)) {
        return {
          ...section,
          name: wantsTurtleneck ? "Turtleneck Collar" : "Neckband",
          h: wantsTurtleneck ? Math.max(section.h * 3, section.h + 16) : section.h,
        };
      }

      if (garmentKey === "Cardigan") {
        if (/^button band$/i.test(section.name) && isOpenFront) {
          return { ...section, name: "Front Bands" };
        }
        if (/^(collar|neckband)$/i.test(section.name)) {
          if (wantsHood) return { ...section, name: "Hood", w: Math.max(section.w, 44), h: Math.max(section.h * 4, section.h + 24) };
          if (wantsShawlCollar) return { ...section, name: "Shawl Collar", h: Math.max(section.h * 2, section.h + 10) };
          if (wantsTurtleneck) return { ...section, name: "Turtleneck Collar", h: Math.max(section.h * 3, section.h + 16) };
          return { ...section, name: "Neckband" };
        }
      }

      return section;
    })
    .filter((section) => {
      if (garmentKey === "Cardigan" && /^pocket$/i.test(section.name) && !hasPocket) return false;
      return true;
    });
}

function isRibbingMarker(colorIndex: number): boolean {
  return colorIndex === 6;
}

function isLegacyRibbingMarker(chart: SavedChart, colorIndex: number): boolean {
  return isRibbingMarker(colorIndex) && !!chart.includeRibbing;
}

function isNotionMarker(colorIndex: number): boolean {
  return colorIndex === 9;
}

function isLegacyNotionMarker(chart: SavedChart, colorIndex: number): boolean {
  return isNotionMarker(colorIndex) && /button band|button/i.test(chart.sectionName ?? "");
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
      for (let col = 0; col < w; col++) grid[row][col] = 0;
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
      for (let col = 0; col < w; col++) grid[row][col] = col % 2 === 0 ? 6 : 0;
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
  importedChart?: ImportedChart,
  inspirationChart?: ImportedChart
): number[][] {
  const grid = buildStarterGrid(sectionName, w, h, includeRibbing);
  const shapeKey = shapeKeyForPatternSection(pattern, garmentKey, sectionName);
  const text = patternChartText(pattern).toLowerCase();
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
  const iconMotif = detectIconMotif(text);
  const hasNamedDesignIntent =
    hasMonet(text) ||
    hasStarryNight(text) ||
    !!iconMotif ||
    hasLettering(text) ||
    hasMotif(text, "flower") ||
    hasMotif(text, "heart") ||
    hasMotif(text, "star") ||
    hasMotif(text, "stripe") ||
    hasMotif(text, "checker") ||
    hasMotif(text, "wave") ||
    hasMotif(text, "diamond") ||
    hasMotif(text, "speckle");

  if (importedChart?.grid.length && isMainDesignSection(garmentKey, sectionName)) {
    applyImportedChart(grid, shapeKey, w, h, importedChart, minRow, maxRow);
    return grid;
  }

  if (importedChart?.grid.length) {
    if (isBand) addButtonMarkers(grid, w, h);
    return grid;
  }

  if (inspirationChart?.grid.length && isMainDesignSection(garmentKey, sectionName) && !hasNamedDesignIntent) {
    applyImportedChart(grid, shapeKey, w, h, inspirationChart, minRow, maxRow);
    if (isBand) addButtonMarkers(grid, w, h);
    return grid;
  }

  if (inspirationChart?.grid.length && !isMainDesignSection(garmentKey, sectionName)) {
    if (isBand) addButtonMarkers(grid, w, h);
    return grid;
  }

  if (hasMonet(text)) {
    drawMonetWaterGarden(grid, shapeKey, w, h, chartColors, minRow, maxRow, seed);
  } else if (hasStarryNight(text)) {
    drawStarryNight(grid, shapeKey, w, h, chartColors, minRow, maxRow);
  } else if (iconMotif) {
    drawIconMotif(grid, shapeKey, w, h, iconMotif, colours, text);
  } else if (hasMotif(text, "star") && hasMotif(text, "stripe")) {
    drawStarsAndStripes(grid, shapeKey, w, h, chartColors, colours, minRow, maxRow);
  } else if (hasLettering(text) && isMainDesignSection(garmentKey, sectionName)) {
    drawLetteringMotif(grid, shapeKey, w, h, colours, text, minRow, maxRow);
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
  if (shouldDrawPromptFallback(text, garmentKey, sectionName, grid)) {
    drawPromptFallbackMotif(grid, shapeKey, w, h, colours, minRow, maxRow, text, seed);
  }

  if (isBand) addButtonMarkers(grid, w, h);
  return grid;
}

function shouldDrawPromptFallback(text: string, garmentKey: string, sectionName: string, grid: number[][]): boolean {
  if (!isMainDesignSection(garmentKey, sectionName)) return false;
  if (!/\b(pattern|motif|graphic|design|inspired|inspo|reference|colourwork|colorwork|picture|image|illustration|scene|floral|celestial|landscape|tv|movie|film|show|series|character|costume|outfit|aesthetic|vibe)\b/.test(text)) return false;
  const distinct = new Set(grid.flat());
  return distinct.size <= 2;
}

function drawPromptFallbackMotif(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  colours: number[],
  minRow: number,
  maxRow: number,
  text: string,
  seed: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const primary = colours[0] ?? 1;
  const secondary = colours[1] ?? primary;
  const accent = colours[2] ?? secondary;
  const bandHeight = Math.max(3, Math.round((maxRow - minRow) / 10));
  const hasReference = /\b(tv|movie|film|show|series|character|costume|outfit|reference|inspo|inspired|vibe|aesthetic)\b/.test(text);
  const wantsPanel = /\b(panel|band|stripe|block|colourblock|colorblock|yoke|chest|slogan|letter|text|word|logo)\b/.test(text) || hasReference;
  const yokeEnd = Math.round(minRow + (maxRow - minRow) * 0.24);
  const hemStart = Math.round(minRow + (maxRow - minRow) * 0.78);

  if (wantsPanel) {
    for (let row = yokeEnd; row < Math.min(maxRow, yokeEnd + bandHeight * 2); row++) {
      for (let col = Math.round(w * 0.08); col < Math.round(w * 0.92); col++) {
        if (isActiveChartCell(activeShape, undefined, row, col, w, h)) grid[row][col] = secondary;
      }
    }
    for (let row = Math.max(minRow, hemStart - bandHeight); row < hemStart; row++) {
      for (let col = Math.round(w * 0.1); col < Math.round(w * 0.9); col++) {
        if (isActiveChartCell(activeShape, undefined, row, col, w, h)) grid[row][col] = accent;
      }
    }
  }

  const lanes = 3 + (seed % 3);
  for (let i = 0; i < lanes; i++) {
    const rowBase = Math.round(minRow + (maxRow - minRow) * (0.28 + i * 0.13));
    for (let col = Math.round(w * 0.14); col < Math.round(w * 0.86); col++) {
      const wave = rowBase + Math.round(Math.sin((col + seed + i * 11) / 7) * Math.max(1, bandHeight * 0.35));
      for (let thickness = -1; thickness <= 1; thickness++) {
        const row = wave + thickness;
        if (inGrid(grid, row, col) && isActiveChartCell(activeShape, undefined, row, col, w, h)) {
          grid[row][col] = i % 2 === 0 ? primary : secondary;
        }
      }
    }
  }

  const motifCount = hasReference ? 5 : 3;
  for (let i = 0; i < motifCount; i++) {
    const cx = Math.round(w * (0.2 + (i % 3) * 0.3));
    const cy = Math.round(minRow + (maxRow - minRow) * (0.38 + Math.floor(i / 3) * 0.24));
    const r = Math.max(2, Math.round(Math.min(w, maxRow - minRow) / 26));
    if ((seed + i) % 2 === 0) drawStar(grid, shapeKey, w, h, cx, cy, r, accent);
    else drawSmallDiamond(grid, shapeKey, w, h, cx, cy, r + 1, primary);
  }

  if (hasLettering(text)) {
    drawLetteringMotif(grid, shapeKey, w, h, [primary, secondary], text, minRow, maxRow);
  }
}

function drawSmallDiamond(
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
    for (let col = 0; col < w; col++) {
      if (!inGrid(grid, row, col) || !isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      if (Math.abs(col - cx) + Math.abs(row - cy) <= radius) grid[row][col] = colorIndex;
    }
  }
}

function chooseMotif(text: string): "stripes" | "checker" | "waves" | "diamonds" | "speckles" | null {
  if (hasMotif(text, "stripe")) return "stripes";
  if (hasMotif(text, "checker")) return "checker";
  if (hasMotif(text, "wave")) return "waves";
  if (hasMotif(text, "diamond")) return "diamonds";
  if (hasMotif(text, "speckle")) return "speckles";
  return null;
}

function hasLettering(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(lettering|letters|text|words?|name|typography|quote|book title)\b/.test(lower)
    || /jane\s+eyre/i.test(text)
    || /["'“”‘’][^"'“”‘’]{2,32}["'“”‘’]/.test(text);
}

function extractLetteringText(text: string): string {
  const quoted = text.match(/["'“”‘’]([^"'“”‘’]{2,32})["'“”‘’]/);
  if (quoted?.[1]) return quoted[1].trim().toUpperCase();
  if (/jane\s+eyre/i.test(text)) return "JANE EYRE";
  const afterWords = text.match(/\b(?:text|wording|lettering|letters?|name)\s+(?:that\s+says\s+|says\s+|of\s+|as\s+)?([a-z0-9 ]{2,24})/i);
  if (afterWords?.[1]) return afterWords[1].replace(/\b(on|for|with|in|across|front|back)\b.*$/i, "").trim().toUpperCase();
  return "TEXT";
}

const BLOCK_LETTERS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["10010", "10010", "10010", "11111", "00010", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01111", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "11110"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

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

function isMainDesignSection(garmentKey: string, sectionName: string): boolean {
  const lower = sectionName.toLowerCase();
  if (/band|collar|neck|cuff|brim|strap|base|heel|toe|thumb|finger/.test(lower)) return false;
  if (/front|back|body|hand|scarf|blanket|shawl|cloth|headband|leg warmer|cowl/.test(lower)) return true;
  return !/cardigan|sweater|pullover|vest|tank top/i.test(garmentKey) && /back/.test(lower);
}

function drawLetteringMotif(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  colours: number[],
  text: string,
  minRow: number,
  maxRow: number
) {
  const label = extractLetteringText(text).replace(/[^A-Z0-9 ]/g, "").slice(0, 18) || "TEXT";
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const ink = colours[0] ?? 1;
  const accent = colours[1] ?? ink;
  const rows = label.split(/\s+/).length > 2 ? [label] : splitLabel(label);
  const scale = Math.max(1, Math.min(3, Math.floor(w / Math.max(18, label.length * 4))));
  const letterGap = Math.max(1, scale);
  const lineGap = Math.max(2, scale * 2);
  const lineHeight = 7 * scale;
  const totalHeight = rows.length * lineHeight + (rows.length - 1) * lineGap;
  let rowStart = Math.round(minRow + (maxRow - minRow - totalHeight) * 0.5);

  rows.forEach((line, lineIndex) => {
    const width = lineWidth(line, scale, letterGap);
    let colStart = Math.round((w - width) / 2);
    const color = lineIndex === 0 ? ink : accent;
    for (const char of line) {
      const pattern = BLOCK_LETTERS[char] ?? BLOCK_LETTERS[" "];
      pattern.forEach((bits, pr) => {
        [...bits].forEach((bit, pc) => {
          if (bit !== "1") return;
          for (let rr = 0; rr < scale; rr++) {
            for (let cc = 0; cc < scale; cc++) {
              const row = rowStart + pr * scale + rr;
              const col = colStart + pc * scale + cc;
              if (inGrid(grid, row, col) && isActiveChartCell(activeShape, undefined, row, col, w, h)) {
                grid[row][col] = color;
              }
            }
          }
        });
      });
      colStart += ((pattern[0]?.length ?? 3) * scale) + letterGap;
    }
    rowStart += lineHeight + lineGap;
  });
}

function splitLabel(label: string): string[] {
  if (label.length <= 10 || !label.includes(" ")) return [label];
  const words = label.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")].filter(Boolean);
}

function lineWidth(line: string, scale: number, gap: number): number {
  return [...line].reduce((sum, char, index) => {
    const pattern = BLOCK_LETTERS[char] ?? BLOCK_LETTERS[" "];
    return sum + (pattern[0]?.length ?? 3) * scale + (index === line.length - 1 ? 0 : gap);
  }, 0);
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

const ICON_PATTERNS: Record<IconMotif, string[]> = {
  penguin: [
    "000111000",
    "001111100",
    "011101110",
    "011111110",
    "011000110",
    "011000110",
    "001111100",
    "000101000",
  ],
  cat: [
    "010000010",
    "111000111",
    "111111111",
    "110101011",
    "111111111",
    "011111110",
    "001111100",
  ],
  dog: [
    "110000011",
    "111000111",
    "111111111",
    "110101011",
    "111111111",
    "011101110",
    "001111100",
  ],
  moon: [
    "0011110",
    "0111000",
    "1110000",
    "1110000",
    "1110000",
    "0111000",
    "0011110",
  ],
  sun: [
    "100101001",
    "001111100",
    "011111110",
    "111111111",
    "011111110",
    "001111100",
    "100101001",
  ],
  cloud: [
    "0001110000",
    "0011111100",
    "0111111110",
    "1111111111",
    "0111111110",
  ],
  mountain: [
    "000010000",
    "000111000",
    "001111100",
    "011101110",
    "111000111",
    "111111111",
  ],
  mushroom: [
    "001111100",
    "011111110",
    "111111111",
    "001111100",
    "000111000",
    "000111000",
  ],
  bow: [
    "110000011",
    "111000111",
    "011101110",
    "001111100",
    "011101110",
    "111000111",
    "110000011",
  ],
  book: [
    "111101111",
    "100101001",
    "100101001",
    "100101001",
    "111101111",
  ],
  butterfly: [
    "110000011",
    "111010111",
    "011111110",
    "001111100",
    "011111110",
    "111010111",
    "110000011",
  ],
};

function drawIconMotif(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  motif: IconMotif,
  colours: number[],
  text: string
) {
  const large = /large|big|single|center|centre|middle/.test(text);
  const pattern = ICON_PATTERNS[motif];
  const primary = colours[0] ?? 1;
  const secondary = colours[1] ?? primary;
  const motifs = large
    ? [{ cx: Math.round(w * 0.5), cy: Math.round(h * 0.42), cell: Math.max(2, Math.round(Math.min(w, h) / 32)) }]
    : [{ cx: Math.round(w * 0.5), cy: Math.round(h * 0.36), cell: Math.max(1, Math.round(Math.min(w, h) / 40)) }];

  motifs.forEach((item) => {
    drawPixelPattern(grid, shapeKey, w, h, pattern, item.cx, item.cy, item.cell, primary, secondary);
  });
}

function drawPixelPattern(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  pattern: string[],
  cx: number,
  cy: number,
  cell: number,
  primary: number,
  secondary: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const startRow = cy - Math.round((pattern.length * cell) / 2);
  const startCol = cx - Math.round(((pattern[0]?.length ?? 0) * cell) / 2);
  pattern.forEach((line, pr) => {
    [...line].forEach((char, pc) => {
      if (char === "0") return;
      const fill = char === "2" ? secondary : primary;
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

function drawMonetWaterGarden(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  chartColors: string[],
  minRow: number,
  maxRow: number,
  seed: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  const water = colorIndexForHex(chartColors, "#dbe9df", 0);
  const leaf = colorIndexForHex(chartColors, "#6a9470", 1);
  const blue = colorIndexForHex(chartColors, "#6e88a8", 2);
  const pink = colorIndexForHex(chartColors, "#f08aa0", 3);
  const yellow = colorIndexForHex(chartColors, "#ffd166", 4);
  const white = colorIndexForHex(chartColors, "#ffffff", 5);
  const deepGreen = colorIndexForHex(chartColors, "#2e5d50", leaf);

  for (let row = minRow; row < maxRow; row++) {
    for (let col = 0; col < w; col++) {
      if (!isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      grid[row][col] = water;
      const rippleA = Math.round(minRow + (maxRow - minRow) * 0.26 + Math.sin((col + seed) / 9) * 3);
      const rippleB = Math.round(minRow + (maxRow - minRow) * 0.48 + Math.sin((col + seed) / 7) * 3);
      const rippleC = Math.round(minRow + (maxRow - minRow) * 0.68 + Math.sin((col + seed) / 11) * 2);
      if ((Math.abs(row - rippleA) <= 1 || Math.abs(row - rippleB) <= 1 || Math.abs(row - rippleC) <= 1) && col % 3 !== 0) {
        grid[row][col] = blue;
      }
      if (hashText(`${seed}:brush:${row}:${col}`) % 53 === 0) grid[row][col] = white;
    }
  }

  const padCount = Math.max(7, Math.min(13, Math.round((w * (maxRow - minRow)) / 520)));
  for (let i = 0; i < padCount; i++) {
    const cx = Math.round(w * (0.14 + ((i * 37 + seed) % 73) / 100));
    const cy = Math.round(minRow + (maxRow - minRow) * (0.18 + ((i * 19 + seed) % 64) / 100));
    const rx = Math.max(3, Math.round(w * (0.035 + (i % 3) * 0.01)));
    const ry = Math.max(2, Math.round((maxRow - minRow) * 0.025));
    drawOval(grid, shapeKey, w, h, cx, cy, rx, ry, i % 3 === 0 ? deepGreen : leaf);
    if (i % 2 === 0) {
      drawFlower(grid, shapeKey, w, h, cx + Math.round(rx * 0.3), cy - Math.round(ry * 0.4), Math.max(2, Math.round(Math.min(rx, ry) * 0.8)), pink, yellow, leaf);
    }
  }

  const bridgeRow = Math.round(minRow + (maxRow - minRow) * 0.37);
  for (let col = Math.round(w * 0.12); col < Math.round(w * 0.88); col++) {
    const row = bridgeRow - Math.round(Math.sin((col / w) * Math.PI) * Math.max(4, (maxRow - minRow) * 0.08));
    for (let thickness = 0; thickness < 2; thickness++) {
      if (inGrid(grid, row + thickness, col) && isActiveChartCell(activeShape, undefined, row + thickness, col, w, h)) {
        grid[row + thickness][col] = white;
      }
    }
  }
}

function drawOval(
  grid: number[][],
  shapeKey: string,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colorIndex: number
) {
  const activeShape = shapeKey === "rect" ? undefined : shapeKey;
  for (let row = cy - ry; row <= cy + ry; row++) {
    for (let col = cx - rx; col <= cx + rx; col++) {
      if (!inGrid(grid, row, col) || !isActiveChartCell(activeShape, undefined, row, col, w, h)) continue;
      const dx = (col - cx) / Math.max(1, rx);
      const dy = (row - cy) / Math.max(1, ry);
      if (dx * dx + dy * dy <= 1) grid[row][col] = colorIndex;
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
  options: { includeRibbing: boolean; colors?: string[]; importedChart?: ImportedChart; inspirationChart?: ImportedChart }
): SavedChart[] {
  const projectId = generateId();
  const size = normalizeSize(pattern.currentSize || pattern.sizes[0]);
  const garmentKey = normalizeGarmentKey(pattern.garmentType);
  const template = buildGaugeTemplate(pattern.craftType)[garmentKey] ?? GARMENT_TEMPLATES[garmentKey];
  const baseSections = customizeSectionsForStyle(
    template?.sections?.length ? template.sections : [{ name: pattern.garmentType, w: 40, h: 60 }],
    garmentKey,
    pattern
  );
  const sections = options.importedChart || options.inspirationChart
    ? [...baseSections].sort((a, b) =>
        Number(!isMainDesignSection(garmentKey, a.name)) - Number(!isMainDesignSection(garmentKey, b.name))
      )
    : baseSections;
  const createdAt = new Date().toISOString();
  const projectName = pattern.name;
  const sectionCount = sections.length + 3;
  const assemblyInstructions = getAssemblyInstructions(garmentKey);
  const quickReference = getQuickReference(pattern.craftType, garmentKey);
  const chartColors = normalizeChartColors(options.colors?.length
    ? options.colors
    : options.importedChart?.colors?.length
      ? options.importedChart.colors
      : options.inspirationChart?.colors?.length
        ? options.inspirationChart.colors
      : DEFAULT_CHART_COLORS);

  const chartSections = sections.map((section, index): SavedChart => {
    const w = Math.max(1, Math.round(section.w * SIZE_W_SCALE[size]));
    const h = Math.max(1, Math.round(section.h * SIZE_H_SCALE[size]));
    const grid = buildDesignedGrid(pattern, garmentKey, section.name, w, h, options.includeRibbing, chartColors, options.importedChart, options.inspirationChart);
    const shapeKey = shapeKeyForPatternSection(pattern, garmentKey, section.name);
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
  const entry = getStitchGraph(craftType).find((item) => item.id === id);
  return entry ? stitchDisplayImage(entry) : undefined;
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
        const colorIndex = isLegacyRibbingMarker(chart, raw) || isLegacyNotionMarker(chart, raw) ? 0 : raw;
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
      chartSections.find((chart) => chart.colors[entry.colorIndex])
        ?.colors[entry.colorIndex] ?? DEFAULT_CHART_COLORS[entry.colorIndex],
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
