export type CraftType = "knitting" | "crocheting";
export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export interface Abbreviation {
  abbr: string;
  meaning: string;
  videoKeywords: string;
}

export interface Yarn {
  name: string;
  color: string;
  weight: string;
  meterage: number;
  skeins: Record<string, number>;
}

export interface Materials {
  yarn: Yarn[];
  needles: string[];
  notions: string[];
}

export interface Gauge {
  stitches: number;
  rows: number;
  swatchSize: string;
  needleSize: string;
  yarnWeight: string;
}

export interface Instruction {
  rowNumber: number;
  text: string;
}

export interface PatternSection {
  name: string;
  description: string;
  instructions: Instruction[];
}

export interface SizeMeasurements {
  bust?: string;
  length?: string;
  sleeve?: string;
  circumference?: string;
  height?: string;
  width?: string;
  [key: string]: string | undefined;
}

export interface Pattern {
  id: string;
  name: string;
  craftType: CraftType;
  garmentType: string;
  difficulty: Difficulty;
  estimatedTime: string;
  gauge: Gauge;
  sizes: string[];
  currentSize: string;
  measurements: Record<string, SizeMeasurements>;
  materials: Materials;
  abbreviations: Abbreviation[];
  sections: PatternSection[];
  notes: string;
  currentSection: number;
  completedRows: Record<string, Record<number, boolean>>;
  createdAt: string;
  sourceType: "image" | "text";
  sourceDescription?: string;
  sourceImagePreview?: string;
  previewImage?: string;
  projectId?: string;
  firstChartId?: string;
}

export interface ChartCell {
  colorIndex: number;
}

export interface QuickReferenceItem {
  title: string;
  detail: string;
  imageUrl?: string;
  sourceUrl?: string;
  colorHex?: string;
}

export interface QuickReferenceGroup {
  title: string;
  items: QuickReferenceItem[];
}

export interface SavedChart {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: ChartCell[][];
  colors: string[];
  createdAt: string;
  thumbnail?: string;
  /** "row,col" -> true means that cell has been worked/greyed out */
  completedCells: Record<string, boolean>;
  shapeKey?: string;
  rowShaping?: Record<string, { start: number; width: number }>;
  projectId?: string;
  projectName?: string;
  craftType?: CraftType;
  garmentType?: string;
  garmentSize?: string;
  sectionName?: string;
  sectionIndex?: number;
  sectionCount?: number;
  sectionRole?: "materials" | "prep" | "chart" | "finish";
  guideGroups?: QuickReferenceGroup[];
  includeRibbing?: boolean;
  sourcePatternId?: string;
  assemblyInstructions?: string[];
  quickReference?: QuickReferenceGroup[];
}

export interface GarmentTemplateSection {
  name: string;
  w: number;
  h: number;
  role?: "materials" | "prep" | "chart" | "finish";
}

export interface GarmentTemplate {
  sections: GarmentTemplateSection[];
}

export const GARMENT_TEMPLATES: Record<string, GarmentTemplate> = {
  Sweater: { sections: [{ name: "Back", w: 76, h: 106 }, { name: "Front", w: 76, h: 106 }, { name: "Collar", w: 55, h: 11 }, { name: "Left Sleeve", w: 49, h: 79 }, { name: "Right Sleeve", w: 49, h: 79 }] },
  Cardigan: { sections: [{ name: "Back", w: 76, h: 106 }, { name: "Front Right", w: 43, h: 106 }, { name: "Front Left", w: 43, h: 106 }, { name: "Button Band", w: 8, h: 106 }, { name: "Collar", w: 58, h: 11 }, { name: "Left Sleeve", w: 49, h: 79 }, { name: "Right Sleeve", w: 49, h: 79 }, { name: "Pocket", w: 18, h: 18 }] },
  Hat: { sections: [{ name: "Hat Body", w: 60, h: 25 }, { name: "Brim", w: 60, h: 8 }] },
  Scarf: { sections: [{ name: "Scarf", w: 20, h: 80 }] },
  Socks: { sections: [{ name: "Leg", w: 36, h: 28 }, { name: "Heel Flap", w: 18, h: 14 }, { name: "Foot", w: 36, h: 22 }, { name: "Toe", w: 18, h: 12 }] },
  Mittens: { sections: [{ name: "Hand", w: 26, h: 32 }, { name: "Thumb", w: 12, h: 14 }, { name: "Cuff", w: 26, h: 10 }] },
  Shawl: { sections: [{ name: "Shawl Body", w: 70, h: 35 }] },
  "Baby Blanket": { sections: [{ name: "Blanket", w: 50, h: 60 }] },
};

export interface WizardConfig {
  startingPoint: "image" | "text" | "chart" | null;
  imageFile: File | null;
  imagePreview: string | null;
  textDescription: string;
  craftType: CraftType;
  garmentType: string;
  sizes: string[];
  difficulty: Difficulty;
  extraNotes: string;
  includeRibbing: boolean;
  styleOption: string;
  stitchPreference: string;
  selectedColors: string[];
}

export const GARMENT_TYPES = [
  "Sweater",
  "Cardigan",
  "Pullover",
  "Hat / Beanie",
  "Scarf",
  "Cowl",
  "Mittens",
  "Gloves",
  "Socks",
  "Shawl",
  "Vest",
  "Tank Top",
  "Tote Bag",
  "Dishcloth",
  "Baby Blanket",
  "Throw Blanket",
  "Headband",
  "Leg Warmers",
  "Other",
] as const;

export const AVAILABLE_SIZES = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL",
  "0-3m", "3-6m", "6-12m", "1-2yr", "2-4yr", "4-6yr",
  "One Size",
] as const;
