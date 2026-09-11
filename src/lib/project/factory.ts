/**
 * Constructors for the stored model.
 *
 * Nothing else in the app may build a `Project` literal: these functions are
 * the one place that knows what a well-formed project looks like, so a field
 * added to the model cannot be forgotten at half its call sites.
 *
 * Defaults come from the engine (`typicalGaugeFor`, `suggestedNeedleMm`,
 * `DEFAULT_FIT`), never from numbers typed in here.
 */

import { createChart, type SymbolChart } from "@/lib/chart";
import {
  DEFAULT_FIT,
  type CycWeight,
  suggestedNeedleMm,
  typicalGaugeFor,
} from "@/lib/knit";
import {
  type CraftType,
  type CrossStitchChart,
  type CrossStitchProject,
  type CrossStitchSavedChart,
  type CrossStitchSettings,
  type Difficulty,
  type FlossColor,
  type GarmentSize,
  type GarmentType,
  type Project,
  type ProjectChart,
  type ProjectProgress,
  type ProjectSource,
  type RibbingSpec,
  type SavedChart,
  type YarnCraft,
  type YarnProject,
  type YarnSavedChart,
  type YarnSettings,
  GARMENT_CATALOG,
  PROJECT_SCHEMA_VERSION,
  garmentSupportsSize,
  isYarnCraft,
  toKnitCraft,
} from "@/types";
import { generateId } from "@/lib/id";
import { DEFAULT_MARGIN_CM } from "./crossStitch";

/** Worsted. The weight most patterns and most stash are written for. */
const DEFAULT_CYC: CycWeight = 4;

/** Makes normally worked as a tube. A flat default here would be wrong for all of them. */
const ROUND_GARMENTS: readonly GarmentType[] = [
  "Hat",
  "Cowl",
  "Socks",
  "Mittens",
  "Gloves",
  "Leg Warmers",
];

export function defaultYarnSettings(
  craft: YarnCraft,
  garment: GarmentType,
  cyc: CycWeight = DEFAULT_CYC,
): YarnSettings {
  const knitCraft = toKnitCraft(craft);
  const category = GARMENT_CATALOG[garment].category;
  return {
    craft,
    gauge: typicalGaugeFor(cyc, knitCraft),
    fit: category ? DEFAULT_FIT[category] : "classic",
    cyc,
    toolMm: suggestedNeedleMm(cyc, knitCraft),
    worked: ROUND_GARMENTS.includes(garment) ? "round" : "flat",
  };
}

/**
 * 14 count Aida with two strands is where nearly every stitcher starts and what
 * nearly every published chart assumes.
 */
export function defaultCrossStitchSettings(): CrossStitchSettings {
  return {
    fabric: { kind: "aida", count: 14 },
    strands: 2,
    backstitchStrands: 1,
    marginCm: DEFAULT_MARGIN_CM,
  };
}

export function emptyProgress(): ProjectProgress {
  return {
    activeChartId: null,
    currentSectionIndex: 0,
    charts: {},
    sections: {},
    startedAt: null,
    lastWorkedAt: null,
    completedAt: null,
  };
}

export interface CreateProjectInput {
  id?: string;
  name: string;
  craftType: CraftType;
  garmentType: GarmentType;
  size: GarmentSize;
  difficulty?: Difficulty;
  source?: ProjectSource;
  notes?: string;
  cyc?: CycWeight;
  crossStitch?: Partial<CrossStitchSettings>;
  now?: string;
}

/**
 * Build an empty project.
 *
 * Throws when the size and the garment disagree — a sweater has no "One Size"
 * and a cowl has no "2-4yr". This is a loud failure on purpose: the bug this
 * model exists to kill was a silent fallback that drafted every child's
 * cardigan as an adult Large.
 */
export function createProject(input: CreateProjectInput): Project {
  const { craftType, garmentType, size } = input;

  if (!garmentSupportsSize(garmentType, size)) {
    throw new RangeError(
      `${garmentType} cannot be made in size "${size}". Offer only sizesForGarment("${garmentType}").`,
    );
  }
  if (!GARMENT_CATALOG[garmentType].crafts.includes(craftType)) {
    throw new RangeError(`${garmentType} is not made in ${craftType}.`);
  }

  const now = input.now ?? new Date().toISOString();
  const base = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: input.id ?? generateId(),
    name: input.name,
    garmentType,
    size,
    difficulty: input.difficulty ?? "beginner",
    progress: emptyProgress(),
    source: input.source ?? { kind: "wizard" as const },
    notes: input.notes ?? "",
    archived: false,
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<YarnProject, "craftType" | "settings" | "charts" | "pattern">;

  if (isYarnCraft(craftType)) {
    const project: YarnProject = {
      ...base,
      craftType,
      settings: defaultYarnSettings(craftType, garmentType, input.cyc),
      charts: [],
      pattern: null,
    };
    return project;
  }

  const project: CrossStitchProject = {
    ...base,
    craftType: "cross-stitch",
    settings: { ...defaultCrossStitchSettings(), ...input.crossStitch },
    charts: [],
    pattern: null,
  };
  return project;
}

/* -------------------------------------------------------------------------- */
/* Charts                                                                      */
/* -------------------------------------------------------------------------- */

export interface CreateChartInput<C extends ProjectChart> {
  chart: C;
  name?: string;
  piece?: string;
  order?: number;
  ribbing?: RibbingSpec | null;
  now?: string;
}

/** Wrap a chart as a piece of a project. */
export function createSavedChart<C extends ProjectChart>(
  input: CreateChartInput<C>,
): SavedChart<C> {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.chart.id,
    name: input.name ?? input.chart.name,
    chart: input.chart,
    role: "chart",
    piece: input.piece ?? input.name ?? input.chart.name,
    order: input.order ?? 0,
    ribbing: input.ribbing ?? null,
    notions: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateSymbolChartInput {
  id?: string;
  name: string;
  craft: YarnCraft;
  width: number;
  height: number;
  colors?: string[];
  worked?: "flat" | "round";
}

export function createSymbolChart(input: CreateSymbolChartInput): SymbolChart {
  return createChart({
    id: input.id ?? generateId(),
    name: input.name,
    craft: input.craft,
    width: input.width,
    height: input.height,
    colors: input.colors,
    worked: input.worked ?? "flat",
  });
}

export interface CreateCrossStitchChartInput {
  id?: string;
  name: string;
  width: number;
  height: number;
  palette?: FlossColor[];
  settings?: CrossStitchSettings;
}

/**
 * An empty cross-stitch chart: bare fabric everywhere. Cells start with no
 * `colorIndex` at all rather than pointing at palette entry 0, so "unstitched"
 * is a real state and not a colour that happens to mean nothing.
 */
export function createCrossStitchChart(input: CreateCrossStitchChartInput): CrossStitchChart {
  if (input.width < 1 || input.height < 1) {
    throw new RangeError(`chart must be at least 1x1, got ${input.width}x${input.height}`);
  }
  return {
    schemaVersion: 2,
    craft: "cross-stitch",
    id: input.id ?? generateId(),
    name: input.name,
    width: input.width,
    height: input.height,
    rows: Array.from({ length: input.height }, () =>
      Array.from({ length: input.width }, () => ({})),
    ),
    palette: input.palette ? input.palette.slice() : [],
    backstitch: [],
    frenchKnots: [],
    settings: input.settings ?? defaultCrossStitchSettings(),
  };
}

export type { YarnSavedChart, CrossStitchSavedChart };
