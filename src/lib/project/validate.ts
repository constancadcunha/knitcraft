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
  CRAFT_TYPES,
  PROJECT_SCHEMA_VERSION,
  UNDO_LIMIT,
  garmentSupportsSize,
  isGarmentSize,
  isGarmentType,
  isYarnCraft,
  toGarmentSize,
  type ChartProgress,
  type CraftType,
  type CrossStitchChart,
  type CrossStitchProject,
  type CrossStitchSavedChart,
  type Difficulty,
  type GarmentType,
  type Gauge,
  type Instruction,
  type NotionKind,
  type NotionMarker,
  type Pattern,
  type Abbreviation,
  type FabricRequirement,
  type FlossColor,
  type FlossRequirement,
  type NeedleSpec,
  type YarnRequirement,
  type YarnSpec,
  type FinishedMeasurements,
  type Materials,
  type PatternSection,
  type PatternSource,
  type Project,
  type ProjectChart,
  type ProjectProgress,
  type ProjectSource,
  type RibbingPattern,
  type RibbingPlacement,
  type RibbingSpec,
  type SavedChart,
  type SectionProgress,
  type YarnProject,
  type YarnSavedChart,
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
    ribbing: parseRibbing(value.ribbing),
    notions: parseNotions(value.notions),
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

/* -------------------------------------------------------------------------- */
/* Field validators                                                            */
/*                                                                            */
/* These parse values that came out of localStorage, so they are untrusted:    */
/* a user can edit them, and an older build may have written a different       */
/* shape. Casting straight to the target type would push a malformed object    */
/* into the app and crash a page later, far from the cause. Each validator     */
/* below returns the fallback instead.                                         */
/* -------------------------------------------------------------------------- */

const RIBBING_PATTERNS: readonly RibbingPattern[] = ["1x1", "2x2", "2x1", "garter", "seed", "moss"];
const RIBBING_PLACEMENTS: readonly RibbingPlacement[] = ["hem", "cuff", "neck", "band", "brim"];
const NOTION_KINDS: readonly NotionKind[] = [
  "button", "buttonhole", "zipper", "stitch-marker", "seam", "pocket", "eyelet",
];
const PATTERN_SOURCES: readonly PatternSource[] = ["wizard", "text", "image", "import"];

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function parseRibbing(value: unknown): RibbingSpec | null {
  if (!isRecord(value)) return null;
  const pattern = oneOf(value.pattern, RIBBING_PATTERNS);
  const placement = oneOf(value.placement, RIBBING_PLACEMENTS);
  if (!pattern || !placement) return null;
  const rows = int(value.rows, 0);
  if (rows < 0) return null;
  return { pattern, placement, rows, needleStepDown: bool(value.needleStepDown) };
}

function parseNotions(value: unknown): NotionMarker[] {
  if (!Array.isArray(value)) return [];
  const out: NotionMarker[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const kind = oneOf(entry.kind, NOTION_KINDS);
    if (!kind) continue;
    const rowIndex = int(entry.rowIndex, -1);
    const colIndex = int(entry.colIndex, -1);
    // A marker with no position cannot be drawn, so it is dropped rather than
    // silently pinned to (0,0) where it would look deliberate.
    if (rowIndex < 0 || colIndex < 0) continue;
    const id = str(entry.id);
    out.push({
      id: id || `notion-${kind}-${rowIndex}-${colIndex}`,
      kind,
      rowIndex,
      colIndex,
      ...(typeof entry.label === "string" ? { label: entry.label } : {}),
    });
  }
  return out;
}

function parseSource(value: unknown): ProjectSource {
  const fallback: ProjectSource = { kind: "wizard" };
  if (!isRecord(value)) return fallback;
  const kind = oneOf(value.kind, PATTERN_SOURCES) ?? "wizard";
  const source: ProjectSource = { kind };
  if (typeof value.description === "string") source.description = value.description;
  // Only keep an image that still looks like a data URL; a half-written one
  // would render as a broken image on every card in the library.
  if (typeof value.imagePreview === "string" && value.imagePreview.startsWith("data:")) {
    source.imagePreview = value.imagePreview;
  }
  return source;
}


/**
 * A stored pattern is optional on a project, so a malformed one is DROPPED
 * rather than repaired: a project that loads without its written pattern is
 * recoverable, while a half-parsed pattern renders as a page of blanks and
 * looks like data loss.
 *
 * Nested prose is accepted permissively — the worst a stray string can do is
 * read oddly — but anything the UI iterates or does arithmetic on is checked.
 */
/** Finite number or the fallback. Guards every value the UI formats or sums. */
function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseEach<T>(value: unknown, parse: (raw: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const parsed = parse(raw);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Quantities are what the shopping list adds up, so they are coerced to numbers. */
function parseYarnRequirement(raw: Record<string, unknown>): YarnRequirement | null {
  const yarn = parseYarnSpec(raw.yarn);
  if (!yarn) return null;
  return {
    yarn,
    role: str(raw.role, "MC"),
    ...(typeof raw.hex === "string" ? { hex: raw.hex } : {}),
    metres: num(raw.metres, 0),
    balls: num(raw.balls, 0),
  };
}

function parseNeedleSpec(raw: Record<string, unknown>): NeedleSpec | null {
  const mm = num(raw.mm, 0);
  // A needle with no size tells the knitter nothing.
  if (mm <= 0) return null;
  const kind = oneOf(raw.kind, ["straight", "circular", "dpn", "hook"] as const);
  return {
    kind: kind ?? "straight",
    mm,
    ...(typeof raw.lengthCm === "number" ? { lengthCm: raw.lengthCm } : {}),
    use: str(raw.use),
  };
}

function parseFlossRequirement(raw: Record<string, unknown>): FlossRequirement | null {
  const floss = parseFlossColor(raw.floss);
  if (!floss) return null;
  return {
    floss,
    stitches: num(raw.stitches, 0),
    skeins: num(raw.skeins, 0),
  };
}

/**
 * A yarn with no ball size cannot be turned into a number of balls, which is
 * the only thing the shopping list needs it for.
 */
function parseYarnSpec(value: unknown): YarnSpec | null {
  if (!isRecord(value)) return null;
  const metresPerBall = num(value.metresPerBall, 0);
  const gramsPerBall = num(value.gramsPerBall, 0);
  if (metresPerBall <= 0 || gramsPerBall <= 0) return null;
  const cyc = num(value.cyc, 4);
  return {
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.brand === "string" ? { brand: value.brand } : {}),
    cyc: (cyc >= 0 && cyc <= 7 ? cyc : 4) as YarnSpec["cyc"],
    metresPerBall,
    gramsPerBall,
    ...(Array.isArray(value.fibre)
      ? { fibre: value.fibre.filter((f): f is string => typeof f === "string") }
      : {}),
    ...(typeof value.wpi === "number" ? { wpi: value.wpi } : {}),
  };
}

/** A floss shade is identified by its code; without one it cannot be bought. */
function parseFlossColor(value: unknown): FlossColor | null {
  if (!isRecord(value)) return null;
  const code = str(value.code);
  if (!code) return null;
  return {
    code,
    brand: oneOf(value.brand, ["DMC", "Anchor", "Madeira", "Other"] as const) ?? "Other",
    name: str(value.name, code),
    hex: /^#[0-9a-fA-F]{6}$/.test(str(value.hex)) ? str(value.hex) : "#cccccc",
    symbol: str(value.symbol, "?"),
  };
}

/** Finished measurements are a flat name -> centimetres map; drop anything else. */
function parseMeasurements(value: unknown): FinishedMeasurements {
  if (!isRecord(value)) return {};
  const out: FinishedMeasurements = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

/**
 * Materials drive the shopping list, so the arrays must exist even when the
 * stored value is nonsense — a missing needle list should render as "none
 * recorded", never crash a `.map`.
 */
function parseMaterials(value: unknown): Materials {
  const record = isRecord(value) ? value : {};
  const materials: Materials = {
    yarns: parseEach(record.yarns, parseYarnRequirement),
    needles: parseEach(record.needles, parseNeedleSpec),
    notions: Array.isArray(record.notions)
      ? record.notions.filter((n): n is string => typeof n === "string")
      : [],
  };
  if (Array.isArray(record.floss)) {
    materials.floss = parseEach(record.floss, parseFlossRequirement);
  }
  if (isRecord(record.fabric)) {
    const fabric = record.fabric;
    // Cut sizes are printed and rounded, so they must be real numbers.
    materials.fabric = {
      fabric: fabric.fabric as FabricRequirement["fabric"],
      cutWidthCm: num(fabric.cutWidthCm, 0),
      cutHeightCm: num(fabric.cutHeightCm, 0),
    };
  }
  return materials;
}

/** An abbreviation with no abbr or no meaning teaches nothing, so it is dropped. */
function parseAbbreviations(value: unknown): Abbreviation[] {
  if (!Array.isArray(value)) return [];
  const out: Abbreviation[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const abbr = str(raw.abbr);
    const meaning = str(raw.meaning);
    if (!abbr || !meaning) continue;
    out.push({ abbr, meaning, videoKeywords: str(raw.videoKeywords) });
  }
  return out;
}

function parsePattern(value: unknown, fallbackCraft: CraftType): Pattern | null {
  if (!isRecord(value)) return null;

  const name = str(value.name);
  if (!name) return null;

  const garmentType = isGarmentType(str(value.garmentType)) ? (value.garmentType as GarmentType) : null;
  const size = toGarmentSize(str(value.size));
  if (!garmentType || !size) return null;

  const gauge = isRecord(value.gauge) ? value.gauge : null;
  const stitchesPer10cm = gauge ? int(gauge.stitchesPer10cm, 0) : 0;
  const rowsPer10cm = gauge ? int(gauge.rowsPer10cm, 0) : 0;
  // A zero gauge divides by zero everywhere downstream.
  if (stitchesPer10cm <= 0 || rowsPer10cm <= 0) return null;

  const sections: PatternSection[] = [];
  if (Array.isArray(value.sections)) {
    for (const raw of value.sections) {
      if (!isRecord(raw)) continue;
      const sectionName = str(raw.name);
      if (!sectionName) continue;
      const instructions: Instruction[] = [];
      if (Array.isArray(raw.instructions)) {
        for (const inst of raw.instructions) {
          if (!isRecord(inst)) continue;
          const text = str(inst.text);
          if (!text) continue;
          instructions.push({
            ...(inst as Record<string, unknown>),
            text,
          } as Instruction);
        }
      }
      sections.push({
        name: sectionName,
        description: str(raw.description),
        instructions,
        ...(typeof raw.chartId === "string" ? { chartId: raw.chartId } : {}),
      });
    }
  }

  return {
    id: str(value.id) || `pattern-${name}`,
    name,
    craftType: isCraftType(value.craftType) ? value.craftType : fallbackCraft,
    garmentType,
    size,
    difficulty: parseDifficulty(value.difficulty),
    gauge: { ...(gauge as object), stitchesPer10cm, rowsPer10cm } as Gauge,
    measurements: parseMeasurements(value.measurements),
    materials: parseMaterials(value.materials),
    abbreviations: parseAbbreviations(value.abbreviations),
    sections,
    notes: str(value.notes),
    estimatedTime: str(value.estimatedTime),
    source: oneOf(value.source, PATTERN_SOURCES) ?? "wizard",
    ...(typeof value.sourceDescription === "string"
      ? { sourceDescription: value.sourceDescription }
      : {}),
    createdAt: str(value.createdAt, new Date(0).toISOString()),
    updatedAt: str(value.updatedAt, new Date(0).toISOString()),
  };
}

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
    source: parseSource(value.source),
    notes: str(value.notes),
    archived: bool(value.archived),
    createdAt: str(value.createdAt, now),
    updatedAt: str(value.updatedAt, now),
  };

  const pattern = parsePattern(value.pattern, craftType);
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
