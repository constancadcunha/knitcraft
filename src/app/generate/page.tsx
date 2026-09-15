"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { draftGarment, type ConstructionMethod } from "@/lib/garments";
import { applyMotif, type MotifKind } from "@/lib/motif";
import { assemblePattern } from "@/lib/pattern";
import { createProject, createSavedChart } from "@/lib/project/factory";
import { createChartProgress } from "@/lib/project/progress";
import { imagePreviewToChart, type ImportedChart } from "@/lib/imageChart";
import { GARMENT_OPTIONS } from "@/lib/craftKnowledge";
import { FIT_PREFERENCES, type FitPreference } from "@/lib/knit";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Button } from "@/components/ui/Button";
import { Choice, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Tag } from "@/components/ui/Bits";
import { localDesignIntent } from "@/lib/ai/localIntent";
import type { DesignIntent } from "@/lib/ai/designIntent";
import {
  GARMENT_CATALOG,
  GARMENT_TYPES,
  defaultSizeForGarment,
  garmentSupportsSize,
  sizesForGarment,
  toKnitCraft,
  type Difficulty,
  type GarmentSize,
  type GarmentType,
  type YarnCraft,
} from "@/types";
import { cn } from "@/lib/cn";
import {
  defaultToolMm,
  gaugeFromTool,
  nearestToolMm,
  toolOptions,
} from "./needleGauge";
import { accountRecords, saveRecord } from "@/lib/account";
import ImageMotifCrop from "@/components/ImageMotifCrop";
import { coloursPerRowFor, exactChartForPiece } from "./imageDesign";
import ReviewStep, { type ReviewData } from "./ReviewStep";

/**
 * HOW A DESIGN REACHES THE CHART
 * ------------------------------
 * The bug the user reported — "the AI is not producing anything at all, whether
 * from giving an image or describing, it's giving a blank canvas" — was not the
 * model failing. It was that the request only ever went out if you happened to
 * press "Suggest a design" on step 4. Describe a jumper, press Next four times,
 * and `intent` was still null, `motifFor` returned "plain", and you were handed
 * an empty grid with no indication that anything had been skipped.
 *
 * So the design request now fires as soon as there is something to design from,
 * it is visible while it runs, and it ALWAYS ends in a motif:
 *
 *   description or image ──► /api/design-intent ──► motif + palette
 *                                   │
 *                                   └─ fails ──► localDesignIntent(), which
 *                                      reads the same words and picks a motif
 *                                      deterministically. Never blank, and the
 *                                      UI says which of the two you are looking
 *                                      at rather than implying the model ran.
 */

type StartMode = "describe" | "image-exact" | "image-inspired" | "maths";

/** The colour counts worth offering when charting a picture exactly. */
const COLOUR_COUNTS = [2, 3, 4, 5, 6, 8, 10, 12];

interface WizardConfig {
  mode: StartMode | null;
  description: string;
  imagePreview: string | null;
  motifPreview: string | null;
  craft: YarnCraft;
  /**
   * null means "nobody has chosen yet", which is what lets the AI's suggestion
   * fill the slot without ever overwriting a choice the user made. The derived
   * value below is what the rest of the wizard uses.
   */
  garment: GarmentType | null;
  style: string;
  size: GarmentSize | null;
  fit: FitPreference;
  stitchPreference: string;
  /** Needle or hook diameter in mm — the input that replaced "stitches per 10 cm". */
  toolMm: number;
  /** True once the knitter says they measured a swatch; exact numbers then win. */
  measuredSwatch: boolean;
  stitchesPer10cm: number;
  rowsPer10cm: number;
  extraNotes: string;
  /** Exact-image charting only. */
  colourCount: number;
  technique: "stranded" | "intarsia";
}

const STEPS = ["Start", "Garment", "Fit", "Design", "Review"] as const;

const STITCH_FEELS = [
  { value: "", label: "Let the design decide" },
  { value: "plain", label: "Plain / stocking" },
  { value: "texture", label: "Texture" },
  { value: "cable", label: "Cables" },
  { value: "lace", label: "Lace" },
  { value: "colourwork", label: "Colourwork" },
] as const;

const FIT_LABELS: Record<FitPreference, string> = {
  negative: "Close-fitting",
  zero: "Exact",
  classic: "Classic",
  relaxed: "Relaxed",
  oversized: "Oversized",
};

const MODE_LABELS: Record<StartMode, string> = {
  describe: "Described in words",
  "image-exact": "Charted from a photo",
  "image-inspired": "Inspired by a photo",
  maths: "Just the maths",
};

/**
 * Map the chosen feel, then the design, onto a motif the engine can draw.
 *
 * The last line is the fix: when there is something to design from, the fabric
 * is never plain. An empty chart is indistinguishable from a broken app.
 */
function motifFor(stitchPreference: string, intent: DesignIntent | null, hasSource: boolean): MotifKind {
  if (stitchPreference) return stitchPreference as MotifKind;
  if (intent) return intent.motifKind;
  return hasSource ? "texture" : "plain";
}

/** The AI's construction, where the engine has a matching sleeve system. */
function constructionFor(intent: DesignIntent | null): ConstructionMethod | undefined {
  switch (intent?.construction) {
    case "raglan":
      return "raglan";
    case "drop-shoulder":
      return "dropShoulder";
    case "set-in-sleeve":
      return "setInSleeve";
    default:
      return undefined;
  }
}

type DesignStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "ai"; model?: string }
  | { state: "local"; error: string };

export default function StudioPage() {
  const router = useRouter();
  const store = useStore();

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    mode: null,
    description: "",
    imagePreview: null,
    motifPreview: null,
    craft: "knitting",
    garment: null,
    style: "",
    size: null,
    fit: "classic",
    stitchPreference: "",
    toolMm: defaultToolMm("knitting"),
    measuredSwatch: false,
    stitchesPer10cm: 22,
    rowsPer10cm: 30,
    extraNotes: "",
    colourCount: 4,
    technique: "intarsia",
  });

  const [intent, setIntent] = useState<DesignIntent | null>(null);
  const [design, setDesign] = useState<DesignStatus>({ state: "idle" });
  const [imported, setImported] = useState<ImportedChart | null>(null);
  const [importing, setImporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Guards against a slow image import landing after a newer one. */
  const importToken = useRef(0);
  /** The inputs the last design request was made from, so we do not repeat it. */
  const lastRequest = useRef("");

  const set = <K extends keyof WizardConfig>(key: K, value: WizardConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  /* ---------------------------------------------------------------------- */
  /* Derived values. The AI fills any slot the user has not chosen.          */
  /* ---------------------------------------------------------------------- */

  const suggestedGarment =
    intent?.garmentType && GARMENT_CATALOG[intent.garmentType].crafts.includes(config.craft)
      ? intent.garmentType
      : null;
  const garment: GarmentType = config.garment ?? suggestedGarment ?? "Sweater";
  const aiChoseGarment = config.garment === null && suggestedGarment !== null;

  const sizes = useMemo(() => sizesForGarment(garment), [garment]);
  const suggestedSize =
    intent?.size && garmentSupportsSize(garment, intent.size) ? intent.size : null;
  const chosenSize = config.size && garmentSupportsSize(garment, config.size) ? config.size : null;
  const size: GarmentSize = chosenSize ?? suggestedSize ?? defaultSizeForGarment(garment);
  const aiChoseSize = chosenSize === null && suggestedSize !== null;

  const estimate = useMemo(
    () => gaugeFromTool(config.toolMm, config.craft),
    [config.toolMm, config.craft]
  );
  const gauge = config.measuredSwatch
    ? { stitchesPer10cm: config.stitchesPer10cm, rowsPer10cm: config.rowsPer10cm }
    : { stitchesPer10cm: estimate.stitchesPer10cm, rowsPer10cm: estimate.rowsPer10cm };

  const styles = GARMENT_OPTIONS[garment] ?? [];
  const hasSource = config.description.trim().length > 0 || config.imagePreview !== null;

  const draft = useMemo(
    () =>
      draftGarment({
        garment,
        craft: toKnitCraft(config.craft),
        size,
        gauge,
        fit: config.fit,
        yarnWeight: estimate.cyc,
        construction: constructionFor(intent),
        options: intent?.name ? { designName: intent.name } : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gauge is rebuilt each render from these two numbers
    [garment, config.craft, size, config.fit, gauge.stitchesPer10cm, gauge.rowsPer10cm, estimate.cyc, intent]
  );

  /**
   * The charted pieces.
   *
   * Two routes in, chosen explicitly on step 1: the picture IS the chart, or the
   * design draws a motif onto the piece. Either way every piece comes back with
   * something on it.
   */
  const difficulty: Difficulty = intent?.skillLevel ?? (config.stitchPreference === "lace" || config.stitchPreference === "cable" ? "advanced" : ["Scarf", "Dishcloth", "Baby Blanket", "Throw Blanket"].includes(garment) && !hasSource ? "beginner" : "intermediate");
  const charted = useMemo(() => {
    const notes: string[] = [];

    if ((config.mode === "image-exact" || config.mode === "image-inspired") && imported) {
      const limit = coloursPerRowFor(config.technique);
      let reduced = 0;
      const front = draft.pieces.find(p => p.panel.name === "Front") ?? draft.pieces[0];
      const pieces = draft.pieces.map((piece) => {
        if (piece !== front) return { ...piece, chart: { ...piece.chart, colors: imported.colors.slice() } };
        const result = exactChartForPiece(imported, piece.chart, { maxColoursPerRow: limit });
        reduced = Math.max(reduced, result.rowsReduced);
        return { ...piece, chart: result.chart };
      });
      if (reduced > 0) {
        notes.push(
          `Colours were merged on up to ${reduced} rows per piece so no row carries more than two yarns. Switch to intarsia if you want more.`
        );
      }
      return { pieces, notes, motif: "image" as const };
    }

    if (intent?.motifGrid) {
      const motif = { grid: intent.motifGrid.map(row => [...row].map(Number)), colors: intent.palette.map(p => p.hex) };
      const front = draft.pieces.find(p => p.panel.name === "Front") ?? draft.pieces[0];
      const pieces = draft.pieces.map(piece => piece === front ? { ...piece, chart: exactChartForPiece(motif, piece.chart, { maxColoursPerRow: coloursPerRowFor(config.technique) }).chart } : { ...piece, chart: { ...piece.chart, colors: motif.colors } });
      return { pieces, notes: ["Review the AI-drawn motif before making it. Its drawing is fitted to the front piece."], motif: "image" as const };
    }

    const kind = motifFor(config.stitchPreference, intent, hasSource);
    const palette = intent?.palette.map((p) => p.hex);
    const pieces = draft.pieces.map((piece) => {
      const { chart, applied, reason } = applyMotif(piece.chart, {
        kind,
        palette,
        seed: `${intent?.name ?? garment}-${piece.panel.name}`,
      });
      if (!applied && kind !== "plain" && reason) {
        notes.push(`${piece.panel.name}: ${reason}`);
      }
      return { ...piece, chart };
    });
    return { pieces, notes: [...new Set(notes)], motif: kind };
  }, [
    config.mode,
    config.technique,
    config.stitchPreference,
    imported,
    draft,
    intent,
    hasSource,
    garment,
  ]);

  const pieces = charted.pieces;

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  function onCraft(next: YarnCraft) {
    setConfig((c) => ({
      ...c,
      craft: next,
      // A 4.5 mm needle and a 4.5 mm hook are different tools; keep the size
      // the user picked but snap it to one this craft actually offers.
      toolMm: nearestToolMm(c.toolMm, next),
      garment:
        c.garment && GARMENT_CATALOG[c.garment].crafts.includes(next) ? c.garment : null,
      style: "",
    }));
  }

  function onGarment(next: GarmentType) {
    setConfig((c) => ({
      ...c,
      garment: next,
      style: "",
      size: c.size && garmentSupportsSize(next, c.size) ? c.size : null,
    }));
  }

  /** Read the file, then chart it if this is the exact-image route. */
  function readImage(file: File, mode: StartMode | null) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      setConfig((c) => ({ ...c, imagePreview: url, motifPreview: null }));
      if (url && (mode === "image-exact" || mode === "image-inspired")) void importImage(url, config.colourCount);
    };
    reader.readAsDataURL(file);
  }

  async function importImage(src: string, colours: number) {
    const token = importToken.current + 1;
    importToken.current = token;
    setImporting(true);
    try {
      const grid = await imagePreviewToChart(src, {
        maxColors: colours,
        maxWidth: 72,
        maxHeight: 96,
      });
      if (importToken.current === token) setImported(grid);
    } catch {
      if (importToken.current === token) setImported(null);
    } finally {
      if (importToken.current === token) setImporting(false);
    }
  }

  function onColourCount(count: number) {
    setConfig((c) => ({ ...c, colourCount: count }));
    if (config.imagePreview) void importImage(config.motifPreview ?? config.imagePreview, count);
  }

  /**
   * Everything the design depends on. The garment is deliberately NOT in here:
   * the model may suggest one, and refetching because it did would loop.
   */
  function signatureOf(c: WizardConfig): string {
    return [
      c.mode,
      c.craft,
      c.description.trim(),
      c.style,
      c.extraNotes.trim(),
      c.stitchPreference,
      c.imagePreview ? c.imagePreview.slice(0, 64) : "",
    ].join("|");
  }

  /**
   * Ask for a design. Called automatically whenever the wizard moves on from a
   * step that could have changed what is being designed — never only from a
   * button, which is what made the AI look dead.
   */
  async function requestDesign(c: WizardConfig, options: { force?: boolean } = {}) {
    const wantsDesign = c.mode !== null && c.mode !== "maths";
    const hasInput = c.description.trim().length > 0 || c.imagePreview !== null;
    if (!wantsDesign || !hasInput) return;

    const signature = signatureOf(c);
    if (!options.force && signature === lastRequest.current) return;
    lastRequest.current = signature;

    const describedTo = [c.description, c.style, c.extraNotes].filter(Boolean).join(". ");
    setDesign({ state: "pending" });

    try {
      // The photo is sent shrunk: a 4 MB phone snap is the same design brief as
      // a 512 px one, and the larger body times out more often than it helps.
      const imageBase64 = c.imagePreview ? await shrinkImage(c.imagePreview) : undefined;
      const response = await fetch("/api/design-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craftType: c.craft,
          garmentType: config.garment ?? garment,
          description: describedTo,
          stitchPreference: c.stitchPreference,
          styleOption: c.style,
          imageBase64,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body?.intent) {
        fallBackLocally(c, body?.error ?? `The design service answered ${response.status}.`);
        return;
      }
      setIntent(body.intent as DesignIntent);
      setDesign({ state: "ai", model: body.model });
    } catch (error) {
      fallBackLocally(c, error instanceof Error ? error.message : "Network error.");
    }
  }

  /** Never leave the chart blank: design it here instead, and say so. */
  function fallBackLocally(c: WizardConfig, error: string) {
    setIntent(
      localDesignIntent({
        description: [c.description, c.style, c.extraNotes].filter(Boolean).join(". "),
        craft: c.craft,
        garment: config.garment ?? garment,
        stitchPreference: c.stitchPreference,
      })
    );
    setDesign({ state: "local", error });
  }

  const canAdvance =
    step === 0
      ? config.mode !== null &&
        (config.mode !== "describe" || config.description.trim().length > 0) &&
        (config.mode === "describe" || config.mode === "maths" || config.imagePreview !== null)
      : true;

  function next() {
    // Steps 0 and 3 are the two that change what is being designed.
    if (step === 0 || step === 3) void requestDesign(config);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function save(andThen: "library" | "work") {
    if (!store.loaded) return;
    setSaveError(null);
    try {
      const project = createProject({
        name: intent?.name ?? `${garment} (${size})`,
        craftType: config.craft,
        garmentType: garment,
        size,
        difficulty: difficulty,
        cyc: estimate.cyc,
        source: {
          kind:
            config.mode === "image-exact" || config.mode === "image-inspired"
              ? "image"
              : config.description
                ? "text"
                : "wizard",
          description: config.description || undefined,
          imagePreview: config.imagePreview ?? undefined,
        },
        notes: intent?.designerNotes ?? "",
      });

      const charts = pieces.map((p, i) =>
        createSavedChart({ chart: p.chart, name: p.panel.name, piece: p.panel.name, order: i })
      );

      const pattern = assemblePattern({
        id: `${project.id}-pattern`,
        name: project.name,
        craftType: config.craft,
        garmentType: garment,
        size,
        gauge,
        cyc: estimate.cyc,
        draft: { ...draft, pieces },
        difficulty: difficulty,
        notes: intent?.designerNotes,
        sourceDescription: config.description || undefined,
      });

      void saveRecord(`checklist.${project.id}`, accountRecords()["checklist.studio"] ?? []).catch(() => {});
      store.putProject({
        ...project,
        charts,
        pattern,
        progress: {
          ...project.progress,
          activeChartId: charts[0]?.id ?? null,
          charts: Object.fromEntries(charts.map((c) => [c.id, createChartProgress(c.id)])),
        },
      } as typeof project);

      router.push(
        andThen === "work"
          ? `/chart/${project.id}${charts[0] ? `?chart=${encodeURIComponent(charts[0].id)}` : ""}`
          : `/pattern/${project.id}`
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "That combination could not be saved.");
    }
  }

  const reviewPattern = useMemo(
    () =>
      assemblePattern({
        id: "studio-preview",
        name: intent?.name ?? `${garment} (${size})`,
        craftType: config.craft,
        garmentType: garment,
        size,
        gauge,
        cyc: estimate.cyc,
        draft: { ...draft, pieces },
        difficulty: difficulty,
        notes: intent?.designerNotes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gauge is rebuilt each render from these two numbers
    [intent, garment, size, config.craft, difficulty, gauge.stitchesPer10cm, gauge.rowsPer10cm, estimate.cyc, draft, pieces]
  );

  const reviewData: ReviewData = {
    craft: config.craft,
    garmentLabel: config.style || GARMENT_CATALOG[garment].label,
    sizeLabel: `${size}${aiChoseSize ? " (chosen by the AI)" : ""}`,
    difficulty: difficulty,
    fitLabel: FIT_LABELS[config.fit],
    startingPoint: config.mode ? MODE_LABELS[config.mode] : "—",
    designLine: designLine(design, intent, charted.motif),
    gauge,
    gaugeFromSwatch: config.measuredSwatch,
    toolMm: config.toolMm,
    estimate,
    pieces,
    draft,
    pattern: reviewPattern,
    notes: charted.notes,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2">
        <p className="label text-berry">Pattern studio</p>
        <h1 className="mt-2 font-ui text-2xl uppercase leading-tight sm:text-3xl">
          Answer a few questions
        </h1>
        <p className="mt-2.5 text-ink-soft">
          Every stitch count comes out of your gauge. The AI decides how it should look, and what
          it thinks you are making.
        </p>
      </div>

      <StepBar current={step} />

      {design.state === "pending" && (
        <div className="mt-4 border-[3px] border-ink bg-gold p-3.5">
          <p className="label text-ink">The AI is designing your {garment.toLowerCase()}…</p>
          <p className="mt-1.5 text-sm text-ink">
            Carry on answering — it can take up to a minute, and the design lands here when it
            arrives.
          </p>
        </div>
      )}

      <div className="panel mt-6 p-5 sm:p-6">
        {step === 0 && (
          <StepStart
            config={config}
            set={set}
            importing={importing}
            imported={imported}
            onImage={readImage}
            onColourCount={onColourCount}
            onCrop={(url) => { set("motifPreview", url); void importImage(url, config.colourCount); }}
          />
        )}
        {step === 1 && (
          <StepGarment
            config={config}
            garment={garment}
            aiChose={aiChoseGarment}
            styles={styles}
            set={set}
            onCraft={onCraft}
            onGarment={onGarment}
          />
        )}
        {step === 2 && (
          <StepFit
            config={config}
            set={set}
            sizes={sizes}
            size={size}
            aiChoseSize={aiChoseSize}
            estimate={estimate}
          />
        )}
        {step === 3 && (
          <StepDesign
            config={config}
            set={set}
            intent={intent}
            design={design}
            motif={charted.motif}
            onAsk={() => void requestDesign(config, { force: true })}
          />
        )}
        {step === 4 && <ReviewStep data={reviewData} />}
      </div>

      {saveError && (
        <p className="mt-4 border-[3px] border-berry bg-panel p-3.5 text-sm text-berry" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={cn(step === 0 && "invisible")}
        >
          ← Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="lg" disabled={!canAdvance} onClick={next}>
            Next →
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" disabled={!store.loaded} onClick={() => save("library")}>
              Save to library
            </Button>
            <Button size="lg" disabled={!store.loaded} onClick={() => save("work")}>
              Save &amp; start working →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One line describing where this design came from. Never overstates the AI. */
function designLine(design: DesignStatus, intent: DesignIntent | null, motif: string): string {
  if (!intent) return motif === "image" ? "Charted from your photo" : "Plain, drafted by the engine";
  if (design.state === "ai") return `${intent.name} — ${motif}, designed by the AI`;
  if (design.state === "local") return `${intent.name} — ${motif}, drafted here from your words`;
  return `${intent.name} — ${motif}`;
}

/**
 * Shrink a data URL for the design request.
 *
 * Returns the original if anything goes wrong: a slightly-too-large image is a
 * better outcome than no image at all.
 */
async function shrinkImage(dataUrl: string, maxSide = 512): Promise<string> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("unreadable"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    if (scale >= 1) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

/* -------------------------------------------------------------------------- */

function StepBar({ current }: { current: number }) {
  return (
    <ol className="mt-6 flex flex-wrap gap-2" aria-label="Progress">
      {STEPS.map((name, i) => (
        <li key={name} className="flex-1">
          <div
            className={cn(
              "label border-[3px] border-ink px-2.5 py-2 text-center",
              i < current
                ? "bg-fern text-panel"
                : i === current
                  ? "bg-berry text-panel shadow-pop-sm"
                  : "bg-panel text-ink-faint"
            )}
            aria-current={i === current ? "step" : undefined}
          >
            {i + 1}. {name}
          </div>
        </li>
      ))}
    </ol>
  );
}

type Setter = <K extends keyof WizardConfig>(key: K, value: WizardConfig[K]) => void;

function Legend({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-ui text-lg uppercase text-ink">{title}</h2>
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

function StepStart({
  config,
  set,
  importing,
  imported,
  onImage,
  onColourCount,
  onCrop,
}: {
  config: WizardConfig;
  set: Setter;
  importing: boolean;
  imported: ImportedChart | null;
  onImage: (file: File, mode: StartMode | null) => void;
  onColourCount: (count: number) => void;
  onCrop: (src: string) => void;
}) {
  const options: Array<{ value: StartMode; title: string; detail: string }> = [
    {
      value: "describe",
      title: "Describe it",
      detail: "Say what you want in your own words and the AI designs it.",
    },
    {
      value: "image-exact",
      title: "Chart a photo",
      detail: "Your picture becomes the grid, square for square, in as many colours as you choose.",
    },
    {
      value: "image-inspired",
      title: "Inspired by a photo",
      detail: "The AI identifies the garment; the picture supplies the motif instead of a generic repeat.",
    },
    {
      value: "maths",
      title: "Just the maths",
      detail: "Skip the design; size the pieces to fit and leave the fabric plain.",
    },
  ];

  const isImage = config.mode === "image-exact" || config.mode === "image-inspired";

  return (
    <div>
      <Legend title="What's your starting point?" hint="You can change any of this later." />
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={config.mode === option.value}
            onClick={() => set("mode", option.value)}
            className={cn(
              "border-[3px] border-ink p-4 text-left transition-transform",
              config.mode === option.value
                ? "bg-gold shadow-pop-sm"
                : "bg-panel hover:-translate-y-0.5 hover:shadow-pop-sm"
            )}
          >
            <span className="label block text-ink">{option.title}</span>
            <span className="mt-1.5 block text-sm text-ink-soft">{option.detail}</span>
          </button>
        ))}
      </div>

      {config.mode === "describe" && (
        <div className="mt-5">
          <TextArea
            label="Describe what you want"
            rows={4}
            placeholder="A cosy aran jumper with big twisting cables down the front, in oatmeal, for a 4 year old"
            value={config.description}
            onChange={(e) => set("description", e.target.value)}
            hint="Mention colours, motifs, shapes and who it is for — all of it reaches the chart."
          />
        </div>
      )}

      {isImage && (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="studio-photo" className="label mb-1.5 block text-ink-soft">
              Your photo
            </label>
            <input
              id="studio-photo"
              type="file"
              accept="image/*"
              className="field"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImage(file, config.mode);
              }}
            />
            {config.imagePreview && (
              <div className="media mt-3 h-40 border-[3px] border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.imagePreview} alt="Your photo" />
              </div>
            )}
          </div>

          {config.imagePreview && <ImageMotifCrop key={config.imagePreview.slice(-100)} src={config.imagePreview} onApply={onCrop} />}
          {isImage && (
            <div className="space-y-4 border-t-[3px] border-ink pt-5">
              <SelectField
                label="How many colours?"
                value={String(config.colourCount)}
                onChange={(e) => onColourCount(Number(e.target.value))}
                hint="Every extra colour is another ball of yarn and another end to weave in."
              >
                {COLOUR_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count} colours
                  </option>
                ))}
              </SelectField>

              <Choice
                label="How will you work the colours?"
                value={config.technique}
                options={[
                  { value: "stranded", label: "Stranded (2 per row)" },
                  { value: "intarsia", label: "Intarsia (no limit)" },
                ]}
                onChange={(next) => set("technique", next)}
              />
              <p className="text-sm text-ink-soft">
                Stranded colourwork carries every colour of a row along the back of that row, so
                two is the practical limit — rows with more are merged down to their two main
                colours. Intarsia uses a separate small ball per block and carries nothing, so any
                number of colours is workable.
              </p>

              {importing && <p className="text-sm text-ink-soft">Reading your picture…</p>}
              {!importing && imported && (
                <p className="text-sm text-ink">
                  Charted: {imported.grid[0]?.length ?? 0} × {imported.grid.length} cells in{" "}
                  {imported.colors.length} colours. It is resized to each piece&apos;s own stitch
                  count on the next steps. Use the selection above to frame the motif; it is placed on the front piece.
                </p>
              )}
            </div>
          )}

          {config.mode === "image-inspired" && (
            <TextArea
              label="Anything to add? (optional)"
              rows={3}
              placeholder="Like this one, but in navy and cream, and cropped"
              value={config.description}
              onChange={(e) => set("description", e.target.value)}
              hint="The AI sees the photo and reads this together."
            />
          )}
        </div>
      )}
    </div>
  );
}

function StepGarment({
  config,
  garment,
  aiChose,
  styles,
  set,
  onCraft,
  onGarment,
}: {
  config: WizardConfig;
  garment: GarmentType;
  aiChose: boolean;
  styles: string[];
  set: Setter;
  onCraft: (craft: YarnCraft) => void;
  onGarment: (garment: GarmentType) => void;
}) {
  // Only the makes this craft can actually produce: a knitted Hoop Art would be
  // refused by `createProject` at the very last step, which is far too late.
  const offered = GARMENT_TYPES.filter((g) => GARMENT_CATALOG[g].crafts.includes(config.craft));

  return (
    <div className="space-y-6">
      <div>
        <Legend
          title="Choose the garment"
          hint="Pick the craft first — it changes what is offered."
        />
        <Choice
          label="Craft"
          value={config.craft}
          options={[
            { value: "knitting", label: "Knit" },
            { value: "crocheting", label: "Crochet" },
          ]}
          onChange={onCraft}
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="label text-ink-soft">What are you making?</span>
          {aiChose && <Tag tone="cobalt">The AI chose {garment} — tap any other to change it</Tag>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {offered.map((option) => {
            const active = garment === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onGarment(option)}
                className={cn(
                  "flex flex-col items-center gap-1.5 border-[3px] border-ink p-2.5 transition-transform",
                  active ? "bg-gold shadow-pop-sm" : "bg-panel hover:-translate-y-0.5"
                )}
              >
                <GarmentIcon type={option} active={active} className="h-10 w-10" />
                <span className="label text-center text-ink">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {styles.length > 0 && (
        <div>
          <span className="label mb-2 block text-ink-soft">Style (optional)</span>
          <div className="flex flex-wrap gap-2">
            {styles.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={config.style === style}
                onClick={() => set("style", config.style === style ? "" : style)}
                className={cn(
                  "border-[3px] border-ink px-3 py-2 text-sm transition-transform",
                  config.style === style
                    ? "bg-cobalt text-panel shadow-pop-sm"
                    : "bg-panel text-ink hover:-translate-y-0.5"
                )}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepFit({
  config,
  set,
  sizes,
  size,
  aiChoseSize,
  estimate,
}: {
  config: WizardConfig;
  set: Setter;
  sizes: readonly GarmentSize[];
  size: GarmentSize;
  aiChoseSize: boolean;
  estimate: ReturnType<typeof gaugeFromTool>;
}) {
  const tools = toolOptions(config.craft);
  const toolWord = config.craft === "knitting" ? "needles" : "hook";

  return (
    <div className="space-y-6">
      <Legend
        title="Size and fit"
        hint="Tell us the needle or hook you'll use and we'll work the rest out roughly."
      />

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="label text-ink-soft">Size</span>
          {aiChoseSize && <Tag tone="cobalt">The AI chose {size}</Tag>}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={size === option}
              onClick={() => set("size", option)}
              className={cn(
                "press px-3 py-2",
                size === option ? "bg-berry text-panel" : "bg-panel text-ink hover:bg-gold"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Choice
        label="How should it fit?"
        value={config.fit}
        options={FIT_PREFERENCES.map((f) => ({ value: f, label: FIT_LABELS[f] }))}
        onChange={(next) => set("fit", next)}
      />

      <div className="space-y-3 border-t-[3px] border-ink pt-5">
        <SelectField
          label={`Which ${toolWord}?`}
          value={String(config.toolMm)}
          onChange={(e) => set("toolMm", Number(e.target.value))}
          hint="The size is printed on the needle or stamped on the hook."
        >
          {tools.map((tool) => (
            <option key={tool.mm} value={tool.mm}>
              {tool.label}
            </option>
          ))}
        </SelectField>

        <div className="border-[3px] border-ink bg-panel-sunk p-3.5">
          <p className="text-sm text-ink">
            That suggests <strong>{estimate.yarnName}</strong> yarn at roughly{" "}
            <strong>
              {estimate.stitchesPer10cm} sts and {estimate.rowsPer10cm} rows to 10 cm
            </strong>
            .
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            This is an estimate from the standard yarn-weight table. A swatch you knit and measure
            yourself is more accurate — two people with the same needle and yarn can differ by two
            stitches to 10 cm, which is about 8 cm across an adult chest.
          </p>
        </div>

        <label className="flex items-center gap-4 rounded border-2 border-ink/20 p-4">
          <input
            type="checkbox"
            className="check"
            checked={config.measuredSwatch}
            onChange={(e) => set("measuredSwatch", e.target.checked)}
          />
          <span className="text-sm text-ink">I measured a swatch — use my numbers instead</span>
        </label>

        {config.measuredSwatch && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Stitches per 10 cm"
              type="number"
              min={4}
              max={60}
              value={config.stitchesPer10cm}
              onChange={(e) => set("stitchesPer10cm", Number(e.target.value) || 22)}
              hint="Count them across a blocked swatch."
            />
            <TextField
              label="Rows per 10 cm"
              type="number"
              min={4}
              max={80}
              value={config.rowsPer10cm}
              onChange={(e) => set("rowsPer10cm", Number(e.target.value) || 30)}
            />
          </div>
        )}
      </div>


    </div>
  );
}

function StepDesign({
  config,
  set,
  intent,
  design,
  motif,
  onAsk,
}: {
  config: WizardConfig;
  set: Setter;
  intent: DesignIntent | null;
  design: DesignStatus;
  motif: string;
  onAsk: () => void;
}) {
  return (
    <div className="space-y-6">
      <Legend
        title="Design details"
        hint="Tell the chart maker what should appear on the fabric. Leave it alone and the AI decides."
      />

      <Choice
        label="Stitch feel"
        value={config.stitchPreference}
        options={STITCH_FEELS.map((s) => ({ value: s.value, label: s.label }))}
        onChange={(next) => set("stitchPreference", next)}
      />

      <TextArea
        label="Extra notes (optional)"
        rows={4}
        placeholder="e.g. a large red heart on the back, striped sleeves, patch pockets…"
        value={config.extraNotes}
        onChange={(e) => set("extraNotes", e.target.value)}
        hint="Colours and motifs mentioned here reach the generated chart."
      />

      <div className="space-y-4 border-t-[3px] border-ink pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onAsk} disabled={design.state === "pending"}>
            {design.state === "pending" ? "Designing…" : intent ? "Ask for another" : "Ask the AI"}
          </Button>
          <span className="text-sm text-ink-soft">
            {design.state === "pending"
              ? "Working on it — this can take up to a minute."
              : "The design is asked for automatically; this asks again."}
          </span>
        </div>

        {design.state === "local" && (
          <div className="border-[3px] border-ink bg-gold p-4">
            <h3 className="label text-ink">Designed here, not by the model</h3>
            <p className="mt-1.5 text-sm text-ink">{design.error}</p>
            <p className="mt-1.5 text-sm text-ink">
              Your motif and palette were worked out in the browser from the words you used, so the
              chart below is real. Every measurement comes from the engine either way.
            </p>
          </div>
        )}

        {intent && (
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="label text-ink">{intent.name}</h3>
              {design.state === "ai" && design.model && (
                <Tag tone="neutral">{design.model.split("/").pop()}</Tag>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Tag tone="gold">{motif}</Tag>
              <Tag tone="neutral">{intent.construction}</Tag>
              {intent.garmentType && <Tag tone="cobalt">{intent.garmentType}</Tag>}
              {intent.size && <Tag tone="cobalt">size {intent.size}</Tag>}
            </div>
            <p className="mt-2.5 text-sm text-ink">{intent.motifDescription}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {intent.palette.map((colour) => (
                <li
                  key={colour.hex}
                  className="flex items-center gap-2 border-[3px] border-ink bg-panel py-1.5 pl-1.5 pr-3"
                >
                  <span
                    className="h-5 w-5 border-2 border-ink"
                    style={{ backgroundColor: colour.hex }}
                    aria-hidden
                  />
                  <span className="label text-ink">{colour.name}</span>
                </li>
              ))}
            </ul>
            {intent.designerNotes && (
              <p className="mt-3 text-sm text-ink-soft">{intent.designerNotes}</p>
            )}
          </div>
        )}

        {!intent && design.state !== "pending" && config.mode === "maths" && (
          <p className="text-sm text-ink-soft">
            You chose to skip the design, so the fabric stays plain. Pick a stitch feel above if
            you want something on it.
          </p>
        )}
      </div>
    </div>
  );
}
