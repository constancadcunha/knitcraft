/**
 * Structural validation for data coming back out of localStorage.
 *
 * Stored data is UNTRUSTED. It may have been written by an older build, edited
 * by hand in devtools, or half-written when the tab was killed mid-save. The
 * rule here is: never throw, never repair silently where repair would be a
 * guess, and return `null` for anything that cannot be trusted so the caller
 * discards it. A returning user with unreadable data must get a working empty
 * app, not a white screen.
 *
 * What IS repaired: progress clamped to the chart it belongs to (a chart can be
 * edited shorter after it has been worked), and missing optional collections
 * filled in with empties. What is NOT repaired: a wrong schema version, an
 * unknown craft, a size the engine cannot draft, or a chart whose grid does not
 * match its declared width and height.
 */

import {
  type ChartProgress,
  type CraftType,
  type CrossStitchChart,
  type Project,
  type ProjectChart,
  type ProjectProgress,
  type SavedChart,
  type SectionProgress,
  type CrossStitchProject,
  type CrossStitchSavedChart,
  type Difficulty,
  type YarnProject,
  type YarnSavedChart,
  CRAFT_TYPES,
  PROJECT_SCHEMA_VERSION,
  UNDO_LIMIT,
  garmentSupportsSize,
  isGarmentSize,
  isGarmentType,
  isYarnCraft,
} from "@/types";
import type { SymbolChart } from "@/lib/chart";
import { chartGeometry } from "./geometry";
import { normalizeChartProgress } from "./progress";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function int(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
}

function isCraftType(value: unknown): value is CraftType {
  return typeof value === "string" && (CRAFT_TYPES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Charts                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A chart's grid must match its declared size. A row array shorter than
 * `width` would index `undefined` in every renderer and tracker, so a chart
 * that disagrees with itself is discarded rather than padded — padding would
 * invent stitches the maker never charted.
 */
function parseChart(value: unknown, craft: CraftType): ProjectChart | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== 2) return null;
  if (value.craft !== craft) return null;

  const width = int(value.width, -1);
  const height = int(value.height, -1);
  if (width < 1 || height < 1) return null;
  if (!Array.isArray(value.rows) || value.rows.length !== height) return null;
  for (const row of value.rows) {
    if (!Array.isArray(row) || row.length !== width) return null;
  }
  if (typeof value.id !== "string" || !value.id) return null;

  if (craft === "cross-stitch") {
    if (!Array.isArray(value.palette)) return null;
    if (!isRecord(value.settings)) return null;
    const chart = value as unknown as CrossStitchChart;
    return {
      ...chart,
      name: str(chart.name, "Untitled chart"),
      backstitch: Array.isArray(chart.backstitch) ? chart.backstitch : [],
      frenchKnots: Array.isArray(chart.frenchKnots) ? chart.frenchKnots : [],
    };
  }

  if (!Array.isArray(value.colors)) return null;
  const chart = value as unknown as SymbolChart;
  return {
    ...chart,
    name: str(chart.name, "Untitled chart"),
    repeats: Array.isArray(chart.repeats) ? chart.repeats : [],
    worked: chart.worked === "round" ? "round" : "flat",
    startSide: chart.startSide === "WS" ? "WS" : "RS",
  };
}

function parseSavedChart(value: unknown, craft: CraftType): SavedChart | null {
  if (!isRecord(value)) return null;
  const chart = parseChart(value.chart, craft);
  if (!chart) return null;
  const now = new Date(0).toISOString();
  return {
    id: str(value.id, chart.id),
    name: str(value.name, chart.name),
    chart,
    role: value.role === "swatch" || value.role === "reference" ? value.role : "chart",
    piece: str(value.piece, chart.name),
    order: int(value.order, 0),
    ribbing: isRecord(value.ribbing) ? (value.ribbing as SavedChart["ribbing"]) : null,
    notions: Array.isArray(value.notions) ? (value.notions as SavedChart["notions"]) : [],
    notes: str(value.notes),
    createdAt: str(value.createdAt, now),
    updatedAt: str(value.updatedAt, now),
    thumbnail: typeof value.thumbnail === "string" ? value.thumbnail : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

function parseChartProgress(value: unknown, chartId: string): ChartProgress {
  const source = isRecord(value) ? value : {};
  const rowStitches: Record<number, number> = {};
  if (isRecord(source.rowStitches)) {
    for (const [key, raw] of Object.entries(source.rowStitches)) {
      const rowIndex = Number(key);
      const count = int(raw, 0);
      if (Number.isInteger(rowIndex) && rowIndex >= 0 && count > 0) rowStitches[rowIndex] = count;
    }
  }
  const cursor = isRecord(source.cursor) ? source.cursor : {};
  return {
    chartId,
    rowStitches,
    cursor: {
      rowIndex: Math.max(0, int(cursor.rowIndex, 0)),
      stitchIndex: Math.max(0, int(cursor.stitchIndex, 0)),
    },
    undo: Array.isArray(source.undo)
      ? (source.undo as ChartProgress["undo"]).filter(isRecord).slice(-UNDO_LIMIT)
      : [],
    updatedAt: str(source.updatedAt, new Date(0).toISOString()),
  };
}

function parseProgress(value: unknown, charts: SavedChart[]): ProjectProgress {
  const source = isRecord(value) ? value : {};
  const charted: Record<string, ChartProgress> = {};
  const storedCharts = isRecord(source.charts) ? source.charts : {};

  // Progress is keyed by chart, and a chart may have been deleted since. Drop
  // progress for charts that no longer exist rather than carrying orphans.
  for (const saved of charts) {
    const progress = parseChartProgress(storedCharts[saved.id], saved.id);
    charted[saved.id] = normalizeChartProgress(chartGeometry(saved.chart), progress);
  }

  const sections: Record<string, SectionProgress> = {};
  if (isRecord(source.sections)) {
    for (const [name, entry] of Object.entries(source.sections)) {
      if (!isRecord(entry)) continue;
      const rows = Array.isArray(entry.completedRows) ? entry.completedRows : [];
      sections[name] = {
        sectionName: name,
        completedRows: [...new Set(rows.filter((row) => typeof row === "number" && row > 0))].sort(
          (a, b) => a - b,
        ) as number[],
      };
    }
  }

  const activeChartId = typeof source.activeChartId === "string" ? source.activeChartId : null;
  return {
    activeChartId: charts.some((chart) => chart.id === activeChartId) ? activeChartId : null,
    currentSectionIndex: Math.max(0, int(source.currentSectionIndex, 0)),
    charts: charted,
    sections,
    startedAt: typeof source.startedAt === "string" ? source.startedAt : null,
    lastWorkedAt: typeof source.lastWorkedAt === "string" ? source.lastWorkedAt : null,
    completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Projects                                                                    */
/* -------------------------------------------------------------------------- */

/** Parse one stored project, or `null` if it cannot be trusted. */
export function parseProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (!isCraftType(value.craftType)) return null;

  const garmentType = str(value.garmentType);
  if (!isGarmentType(garmentType)) return null;

  const size = str(value.size);
  if (!isGarmentSize(size)) return null;
  // The engine must be able to draft this pairing. A stored "Cowl / 2-4yr" is
  // not recoverable by guessing, so the project goes rather than the size.
  if (!garmentSupportsSize(garmentType, size)) return null;

  if (!isRecord(value.settings)) return null;

  const craftType = value.craftType;
  const charts = Array.isArray(value.charts)
    ? value.charts
        .map((chart) => parseSavedChart(chart, craftType))
        .filter((chart): chart is SavedChart => chart !== null)
    : [];

  const now = new Date(0).toISOString();
  const base = {
    schemaVersion: PROJECT_SCHEMA_VERSION as typeof PROJECT_SCHEMA_VERSION,
    id: value.id,
    name: str(value.name, "Untitled project"),
    garmentType,
    size,
    difficulty: parseDifficulty(value.difficulty),
    source: isRecord(value.source) ? (value.source as Project["source"]) : { kind: "wizard" as const },
    notes: str(value.notes),
    archived: bool(value.archived),
    createdAt: str(value.createdAt, now),
    updatedAt: str(value.updatedAt, now),
  };

  const pattern = isRecord(value.pattern) ? (value.pattern as Project["pattern"]) : null;
  const progress = parseProgress(value.progress, charts);
  const settings = value.settings as Record<string, unknown>;

  if (isYarnCraft(craftType)) {
    // Gauge is the one setting a yarn project cannot be drafted without.
    if (!isRecord(settings.gauge)) return null;
    const project: YarnProject = {
      ...base,
      craftType,
      settings: settings as unknown as YarnProject["settings"],
      charts: charts as unknown as YarnSavedChart[],
      pattern,
      progress,
    };
    return project;
  }

  // Fabric is the cross-stitch equivalent: without it there is no finished size.
  if (!isRecord(settings.fabric)) return null;
  const project: CrossStitchProject = {
    ...base,
    craftType: "cross-stitch",
    settings: settings as unknown as CrossStitchProject["settings"],
    charts: charts as unknown as CrossStitchSavedChart[],
    pattern,
    progress,
  };
  return project;
}

const DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "advanced", "expert"];

function parseDifficulty(value: unknown): Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value)
    ? (value as Difficulty)
    : "beginner";
}

/** Parse a stored list, dropping the entries that cannot be trusted. */
export function parseProjects(value: unknown): { projects: Project[]; dropped: number } {
  if (!Array.isArray(value)) return { projects: [], dropped: 0 };
  const projects: Project[] = [];
  let dropped = 0;
  for (const entry of value) {
    const project = parseProject(entry);
    if (project) projects.push(project);
    else dropped += 1;
  }
  return { projects, dropped };
}
