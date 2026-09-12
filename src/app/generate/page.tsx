"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { draftGarment } from "@/lib/garments";
import { applyMotif, type MotifKind } from "@/lib/motif";
import { assemblePattern } from "@/lib/pattern";
import { createProject, createSavedChart } from "@/lib/project/factory";
import { createChartProgress } from "@/lib/project/progress";
import { GARMENT_OPTIONS } from "@/lib/craftKnowledge";
import ChartView from "@/components/chart/ChartView";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Button } from "@/components/ui/Button";
import { Choice, TextArea, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Bits";
import type { DesignIntent } from "@/lib/ai/designIntent";
import {
  DIFFICULTIES,
  GARMENT_TYPES,
  defaultSizeForGarment,
  sizesForGarment,
  toKnitCraft,
  type Difficulty,
  type GarmentSize,
  type GarmentType,
  type YarnCraft,
} from "@/types";
import { cn } from "@/lib/cn";

type StartingPoint = "describe" | "photo" | "blank";

/** Everything the wizard collects, in the order it is asked for. */
interface WizardConfig {
  startingPoint: StartingPoint | null;
  description: string;
  imagePreview: string | null;
  craft: YarnCraft;
  garment: GarmentType;
  style: string;
  size: GarmentSize;
  difficulty: Difficulty;
  stitchPreference: string;
  includeRibbing: boolean;
  stitchesPer10cm: number;
  rowsPer10cm: number;
  extraNotes: string;
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

/** Map the chosen feel, then the description, onto a motif the engine can draw. */
function motifFor(config: WizardConfig, intent: DesignIntent | null): MotifKind {
  if (config.stitchPreference && config.stitchPreference !== "plain") {
    return config.stitchPreference as MotifKind;
  }
  if (config.stitchPreference === "plain") return "plain";
  return intent?.motifKind ?? "plain";
}

export default function StudioPage() {
  const router = useRouter();
  const store = useStore();

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    startingPoint: null,
    description: "",
    imagePreview: null,
    craft: "knitting",
    garment: "Sweater",
    style: "",
    size: defaultSizeForGarment("Sweater"),
    difficulty: "intermediate",
    stitchPreference: "",
    includeRibbing: true,
    stitchesPer10cm: 22,
    rowsPer10cm: 30,
    extraNotes: "",
  });

  const [intent, setIntent] = useState<DesignIntent | null>(null);
  const [designState, setDesignState] = useState<{ loading: boolean; error?: string; model?: string }>({
    loading: false,
  });

  const set = <K extends keyof WizardConfig>(key: K, value: WizardConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const styles = GARMENT_OPTIONS[config.garment] ?? [];
  const sizes = useMemo(() => sizesForGarment(config.garment), [config.garment]);

  const draft = useMemo(
    () =>
      draftGarment({
        garment: config.garment,
        craft: toKnitCraft(config.craft),
        size: config.size,
        gauge: { stitchesPer10cm: config.stitchesPer10cm, rowsPer10cm: config.rowsPer10cm },
      }),
    [config.garment, config.craft, config.size, config.stitchesPer10cm, config.rowsPer10cm]
  );

  const pieces = useMemo(() => {
    const kind = motifFor(config, intent);
    const palette = intent?.palette.map((p) => p.hex);
    return draft.pieces.map((piece) => {
      const { chart } = applyMotif(piece.chart, {
        kind,
        palette,
        seed: `${intent?.name ?? config.garment}-${piece.panel.name}`,
      });
      return { ...piece, chart };
    });
  }, [draft.pieces, config, intent]);

  const canAdvance =
    step === 0
      ? config.startingPoint !== null &&
        (config.startingPoint !== "describe" || config.description.trim().length > 0)
      : true;

  function onGarment(next: GarmentType) {
    setConfig((c) => ({
      ...c,
      garment: next,
      style: "",
      size: sizesForGarment(next).includes(c.size) ? c.size : defaultSizeForGarment(next),
    }));
  }

  function readImage(file: File) {
    const reader = new FileReader();
    reader.onload = () =>
      set("imagePreview", typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function askForDesign() {
    setDesignState({ loading: true });
    try {
      const response = await fetch("/api/design-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craftType: config.craft,
          garmentType: config.garment,
          description: [config.description, config.style, config.extraNotes]
            .filter(Boolean)
            .join(". "),
          stitchPreference: config.stitchPreference,
          styleOption: config.style,
          imageBase64: config.imagePreview ?? undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setDesignState({ loading: false, error: body.error ?? "The design service did not answer." });
        return;
      }
      setIntent(body.intent);
      setDesignState({ loading: false, model: body.model });
    } catch (error) {
      setDesignState({
        loading: false,
        error: error instanceof Error ? error.message : "Network error.",
      });
    }
  }

  function save() {
    const project = createProject({
      name: intent?.name ?? `${config.garment} (${config.size})`,
      craftType: config.craft,
      garmentType: config.garment,
      size: config.size,
      difficulty: config.difficulty,
      source: {
        kind: config.startingPoint === "photo" ? "image" : config.description ? "text" : "wizard",
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
      garmentType: config.garment,
      size: config.size,
      gauge: { stitchesPer10cm: config.stitchesPer10cm, rowsPer10cm: config.rowsPer10cm },
      draft: { ...draft, pieces },
      difficulty: config.difficulty,
      notes: intent?.designerNotes,
      sourceDescription: config.description || undefined,
    });

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

    router.push(`/pattern/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2">
        <p className="label text-berry">Pattern studio</p>
        <h1 className="mt-2 font-ui text-2xl uppercase leading-tight sm:text-3xl">
          Answer a few questions
        </h1>
        <p className="mt-2.5 text-ink-soft">
          Every stitch count comes out of your own gauge. The AI only decides how it should look.
        </p>
      </div>

      <StepBar current={step} />

      <div className="panel mt-6 p-5 sm:p-6">
        {step === 0 && (
          <StepStart config={config} set={set} onImage={readImage} />
        )}
        {step === 1 && (
          <StepGarment config={config} set={set} styles={styles} onGarment={onGarment} />
        )}
        {step === 2 && <StepFit config={config} set={set} sizes={sizes} />}
        {step === 3 && (
          <StepDesign
            config={config}
            set={set}
            intent={intent}
            state={designState}
            onAsk={askForDesign}
          />
        )}
        {step === 4 && <StepReview config={config} intent={intent} pieces={pieces} draft={draft} />}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className={cn(step === 0 && "invisible")}
        >
          ← Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="lg" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
            Next →
          </Button>
        ) : (
          <Button size="lg" onClick={save}>
            Save to library
          </Button>
        )}
      </div>
    </div>
  );
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
  onImage,
}: {
  config: WizardConfig;
  set: Setter;
  onImage: (file: File) => void;
}) {
  const options: Array<{ value: StartingPoint; title: string; detail: string }> = [
    { value: "describe", title: "Describe it", detail: "Say what you want in your own words." },
    { value: "photo", title: "Start from a photo", detail: "Upload something you want to make." },
    { value: "blank", title: "Just the maths", detail: "Skip the design; size the pieces to fit." },
  ];

  return (
    <div>
      <Legend title="What's your starting point?" hint="You can change any of this later." />
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={config.startingPoint === option.value}
            onClick={() => set("startingPoint", option.value)}
            className={cn(
              "border-[3px] border-ink p-4 text-left transition-transform",
              config.startingPoint === option.value
                ? "bg-gold shadow-pop-sm"
                : "bg-panel hover:-translate-y-0.5 hover:shadow-pop-sm"
            )}
          >
            <span className="label block text-ink">{option.title}</span>
            <span className="mt-1.5 block text-sm text-ink-soft">{option.detail}</span>
          </button>
        ))}
      </div>

      {config.startingPoint === "describe" && (
        <div className="mt-5">
          <TextArea
            label="Describe what you want"
            rows={4}
            placeholder="A cosy aran jumper with big twisting cables down the front"
            value={config.description}
            onChange={(e) => set("description", e.target.value)}
            hint="Mention colours, motifs and shapes — they reach the chart."
          />
        </div>
      )}

      {config.startingPoint === "photo" && (
        <div className="mt-5">
          <label htmlFor="studio-photo" className="label mb-1.5 block text-ink-soft">
            Your inspiration photo
          </label>
          <input
            id="studio-photo"
            type="file"
            accept="image/*"
            className="field"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImage(file);
            }}
          />
          {config.imagePreview && (
            <div className="media mt-3 h-40 border-[3px] border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.imagePreview} alt="Your inspiration" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepGarment({
  config,
  set,
  styles,
  onGarment,
}: {
  config: WizardConfig;
  set: Setter;
  styles: string[];
  onGarment: (g: GarmentType) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Legend title="Choose the garment" hint="Pick the craft first — it changes what is offered." />
        <Choice
          label="Craft"
          value={config.craft}
          options={[
            { value: "knitting", label: "Knit" },
            { value: "crocheting", label: "Crochet" },
          ]}
          onChange={(next) => set("craft", next)}
        />
      </div>

      <div>
        <span className="label mb-2 block text-ink-soft">What are you making?</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GARMENT_TYPES.map((garment) => {
            const active = config.garment === garment;
            return (
              <button
                key={garment}
                type="button"
                aria-pressed={active}
                onClick={() => onGarment(garment)}
                className={cn(
                  "flex flex-col items-center gap-1.5 border-[3px] border-ink p-2.5 transition-transform",
                  active ? "bg-gold shadow-pop-sm" : "bg-panel hover:-translate-y-0.5"
                )}
              >
                <GarmentIcon type={garment} active={active} className="h-10 w-10" />
                <span className="label text-center text-ink">{garment}</span>
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
}: {
  config: WizardConfig;
  set: Setter;
  sizes: readonly GarmentSize[];
}) {
  return (
    <div className="space-y-6">
      <Legend
        title="Size and fit"
        hint="Gauge is the important one: every stitch count below is derived from it."
      />

      <div>
        <span className="label mb-2 block text-ink-soft">Size</span>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={config.size === size}
              onClick={() => set("size", size)}
              className={cn(
                "press px-3 py-2",
                config.size === size ? "bg-berry text-panel" : "bg-panel text-ink hover:bg-gold"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Stitches per 10 cm"
          type="number"
          min={4}
          max={60}
          value={config.stitchesPer10cm}
          onChange={(e) => set("stitchesPer10cm", Number(e.target.value) || 22)}
          hint="Count them on a blocked swatch."
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

      <Choice
        label="Skill level"
        value={config.difficulty}
        options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
        onChange={(next) => set("difficulty", next)}
      />

      <Choice
        label="Ribbing"
        value={config.includeRibbing ? "yes" : "no"}
        options={[
          { value: "yes", label: "Add where useful" },
          { value: "no", label: "Skip unless required" },
        ]}
        onChange={(next) => set("includeRibbing", next === "yes")}
      />
    </div>
  );
}

function StepDesign({
  config,
  set,
  intent,
  state,
  onAsk,
}: {
  config: WizardConfig;
  set: Setter;
  intent: DesignIntent | null;
  state: { loading: boolean; error?: string; model?: string };
  onAsk: () => void;
}) {
  return (
    <div className="space-y-6">
      <Legend
        title="Design details"
        hint="Tell the chart maker what should appear on the fabric."
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
        placeholder="e.g. a large red heart on the back, striped sleeves, patch pockets, no ribbing on the hem…"
        value={config.extraNotes}
        onChange={(e) => set("extraNotes", e.target.value)}
        hint="Colours and motifs mentioned here reach the generated chart."
      />

      <div className="border-t-[3px] border-ink pt-5">
        <Button onClick={onAsk} disabled={state.loading}>
          {state.loading ? "Designing…" : intent ? "Suggest another" : "Suggest a design"}
        </Button>

        {state.error && (
          <div className="panel mt-4 bg-gold p-4">
            <h3 className="label text-ink">Designing without the AI</h3>
            <p className="mt-1.5 text-sm text-ink">{state.error}</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Your pattern is still drafted — every measurement comes from the engine, not the model.
            </p>
          </div>
        )}

        {intent && (
          <div className="panel mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="label text-ink">{intent.name}</h3>
              <Tag tone="neutral">{state.model?.split("/").pop()}</Tag>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Tag tone="gold">{intent.motifKind}</Tag>
              <Tag tone="neutral">{intent.construction}</Tag>
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
          </div>
        )}
      </div>
    </div>
  );
}

function StepReview({
  config,
  intent,
  pieces,
  draft,
}: {
  config: WizardConfig;
  intent: DesignIntent | null;
  pieces: ReturnType<typeof draftGarment>["pieces"];
  draft: ReturnType<typeof draftGarment>;
}) {
  const rows: Array<[string, string]> = [
    ["Starting point", config.startingPoint === "photo" ? "A photo" : config.startingPoint === "describe" ? `“${config.description.slice(0, 60)}”` : "Just the maths"],
    ["Craft", config.craft === "knitting" ? "Knitting" : "Crochet"],
    ["Garment", config.style || config.garment],
    ["Size", String(config.size)],
    ["Gauge", `${config.stitchesPer10cm} sts × ${config.rowsPer10cm} rows / 10 cm`],
    ["Skill", config.difficulty],
    ["Ribbing", config.includeRibbing ? "Where useful" : "Skipped"],
    ["Design", intent ? `${intent.name} (${intent.motifKind})` : "Plain, drafted by the engine"],
  ];

  return (
    <div className="space-y-6">
      <Legend title="Check it over" hint="Save it and the tracker opens ready to work." />

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b-[3px] border-ink/10 pb-1.5">
            <dt className="label text-ink-faint">{label}</dt>
            <dd className="text-right text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {draft.warnings.length > 0 && (
        <ul className="space-y-1">
          {draft.warnings.map((w) => (
            <li key={w} className="text-sm text-rust">{w}</li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="label mb-2 text-ink-faint">
          {pieces.length} piece{pieces.length === 1 ? "" : "s"}
        </h3>
        <ul className="space-y-2">
          {pieces.map((piece) => (
            <li
              key={piece.chart.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-[3px] border-ink bg-panel p-3"
            >
              <span className="label text-ink">{piece.panel.name}</span>
              <span className="text-sm text-ink-soft">
                {piece.panel.stitches} sts × {piece.panel.rows} rows ·{" "}
                {piece.panel.widthCm.toFixed(1)} × {piece.panel.heightCm.toFixed(1)} cm
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pieces[0] && (
        <Panel title={`Preview — ${pieces[0].panel.name}`} accent="fern">
          <div className="overflow-x-auto">
            <ChartView chart={pieces[0].chart} cellSize={14} showRowNumbers={false} />
          </div>
        </Panel>
      )}
    </div>
  );
}
