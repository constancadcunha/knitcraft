"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { draftGarment } from "@/lib/garments";
import { createProject, createSavedChart } from "@/lib/project/factory";
import { createChartProgress } from "@/lib/project/progress";
import ChartView from "@/components/chart/ChartView";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Button } from "@/components/ui/Button";
import { Choice, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Heading, Tag } from "@/components/ui/Bits";
import type { DesignIntent } from "@/lib/ai/designIntent";
import {
  GARMENT_TYPES,
  defaultSizeForGarment,
  sizesForGarment,
  toKnitCraft,
  type GarmentSize,
  type GarmentType,
  type YarnCraft,
} from "@/types";

interface DesignState {
  intent: DesignIntent | null;
  model?: string;
  /** Set when the AI could not be reached — the draft still works without it. */
  degradedReason?: string;
  loading: boolean;
}

export default function StudioPage() {
  const router = useRouter();
  const store = useStore();

  const [craft, setCraft] = useState<YarnCraft>("knitting");
  const [garment, setGarment] = useState<GarmentType>("Sweater");
  const [size, setSize] = useState<GarmentSize>(() => defaultSizeForGarment("Sweater"));
  const [description, setDescription] = useState("");
  const [stitchPreference, setStitchPreference] = useState("");
  const [stitchesPer10cm, setStitches] = useState(22);
  const [rowsPer10cm, setRows] = useState(30);
  const [imageBase64, setImage] = useState<string | null>(null);
  const [design, setDesign] = useState<DesignState>({ intent: null, loading: false });

  const sizes = useMemo(() => sizesForGarment(garment), [garment]);

  // The draft is deterministic and instant. It exists whether or not the AI
  // ever answers, which is the whole point of the split: the engine owns the
  // numbers, the model only suggests how it should look.
  const draft = useMemo(
    () =>
      draftGarment({
        garment,
        craft: toKnitCraft(craft),
        size,
        gauge: { stitchesPer10cm, rowsPer10cm },
      }),
    [garment, craft, size, stitchesPer10cm, rowsPer10cm]
  );

  function onGarment(next: GarmentType) {
    setGarment(next);
    if (!sizesForGarment(next).includes(size)) setSize(defaultSizeForGarment(next));
  }

  async function readImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function askForDesign() {
    setDesign({ intent: null, loading: true });
    try {
      const response = await fetch("/api/design-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craftType: craft,
          garmentType: garment,
          description,
          stitchPreference,
          imageBase64: imageBase64 ?? undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setDesign({
          intent: null,
          loading: false,
          degradedReason: body.error ?? "The design service did not answer.",
        });
        return;
      }
      setDesign({ intent: body.intent, model: body.model, loading: false });
    } catch (error) {
      setDesign({
        intent: null,
        loading: false,
        degradedReason: error instanceof Error ? error.message : "Network error.",
      });
    }
  }

  /** Paint the design's palette onto the baseline charts. */
  const colouredPieces = useMemo(() => {
    const palette = design.intent?.palette.map((p) => p.hex);
    if (!palette || palette.length < 2) return draft.pieces;
    return draft.pieces.map((piece) => ({
      ...piece,
      chart: { ...piece.chart, colors: palette },
    }));
  }, [draft.pieces, design.intent]);

  function save() {
    const project = createProject({
      name: design.intent?.name ?? `${garment} (${size})`,
      craftType: craft,
      garmentType: garment,
      size,
      source: {
        kind: imageBase64 ? "image" : description ? "text" : "wizard",
        description: description || undefined,
        imagePreview: imageBase64 ?? undefined,
      },
      notes: design.intent?.designerNotes ?? "",
    });

    const charts = colouredPieces.map((p, i) =>
      createSavedChart({ chart: p.chart, name: p.panel.name, piece: p.panel.name, order: i })
    );

    const saved = {
      ...project,
      charts,
      progress: {
        ...project.progress,
        activeChartId: charts[0]?.id ?? null,
        charts: Object.fromEntries(charts.map((c) => [c.id, createChartProgress(c.id)])),
      },
    } as typeof project;

    store.putProject(saved);
    router.push(`/chart/${saved.id}?chart=${charts[0]?.id ?? ""}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="Pattern studio"
        title="Describe it, and it gets drafted"
        description="The measurements, stitch counts and yardage are worked out from your gauge. The AI only suggests how it should look."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="The garment" accent="berry">
            <div className="space-y-4">
              <Choice
                label="Craft"
                value={craft}
                options={[
                  { value: "knitting", label: "Knit" },
                  { value: "crocheting", label: "Crochet" },
                ]}
                onChange={setCraft}
              />
              <SelectField
                label="What are you making?"
                value={garment}
                onChange={(e) => onGarment(e.target.value as GarmentType)}
              >
                {GARMENT_TYPES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </SelectField>
              <SelectField
                label="Size"
                value={size}
                onChange={(e) => setSize(e.target.value as GarmentSize)}
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </SelectField>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Sts / 10cm"
                  type="number"
                  value={stitchesPer10cm}
                  onChange={(e) => setStitches(Number(e.target.value) || 22)}
                  hint="From your swatch"
                />
                <TextField
                  label="Rows / 10cm"
                  type="number"
                  value={rowsPer10cm}
                  onChange={(e) => setRows(Number(e.target.value) || 30)}
                />
              </div>
            </div>
          </Panel>

          <Panel title="The look" accent="grape">
            <div className="space-y-4">
              <TextArea
                label="Describe it"
                rows={4}
                placeholder="A cosy aran jumper with big twisting cables down the front"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                label="Preferred stitch"
                placeholder="cable, lace, fair isle…"
                value={stitchPreference}
                onChange={(e) => setStitchPreference(e.target.value)}
              />
              <div>
                <label htmlFor="studio-photo" className="label mb-1.5 block text-ink-soft">
                  Or start from a photo
                </label>
                <input
                  id="studio-photo"
                  type="file"
                  accept="image/*"
                  className="field"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readImage(file);
                  }}
                />
                {imageBase64 && (
                  <div className="media mt-3 h-32 border-[3px] border-ink">
                    {/* A local data URL the user just picked. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageBase64} alt="Your inspiration photo" />
                  </div>
                )}
              </div>
              <Button
                full
                onClick={askForDesign}
                disabled={design.loading || (!description && !imageBase64)}
              >
                {design.loading ? "Designing…" : "Suggest a design"}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          {design.degradedReason && (
            <div className="panel bg-gold p-4">
              <h3 className="label text-ink">Designing without the AI</h3>
              <p className="mt-1.5 text-sm text-ink">{design.degradedReason}</p>
              <p className="mt-1.5 text-sm text-ink-soft">
                Your pattern is still drafted below — every measurement and stitch
                count comes from the engine, not the model.
              </p>
            </div>
          )}

          {design.intent && (
            <Panel
              title={design.intent.name}
              accent="blush"
              action={<Tag tone="neutral">{design.model?.split("/").pop()}</Tag>}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Tag tone="gold">{design.intent.motifKind}</Tag>
                  <Tag tone="neutral">{design.intent.construction}</Tag>
                </div>
                <p className="text-sm text-ink">{design.intent.motifDescription}</p>
                <p className="text-sm text-ink-soft">{design.intent.stitchPattern}</p>
                <ul className="flex flex-wrap gap-2">
                  {design.intent.palette.map((colour) => (
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
                {design.intent.designerNotes && (
                  <p className="border-t-[3px] border-ink pt-3 text-sm text-ink-soft">
                    {design.intent.designerNotes}
                  </p>
                )}
              </div>
            </Panel>
          )}

          <Panel
            title="Your pattern"
            accent="cobalt"
            action={
              <span className="label text-panel">
                {colouredPieces.length} piece{colouredPieces.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className="flex items-start gap-4">
              <GarmentIcon type={garment} active className="h-16 w-16 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  {garment} in size {size}, drafted at {stitchesPer10cm} sts and{" "}
                  {rowsPer10cm} rows to 10 cm.
                </p>
                {draft.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {draft.warnings.map((w) => (
                      <li key={w} className="text-tiny text-rust">{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {colouredPieces.map((piece) => (
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
          </Panel>

          {colouredPieces[0] && (
            <Panel title={`Preview — ${colouredPieces[0].panel.name}`} accent="fern">
              <div className="overflow-x-auto">
                <ChartView chart={colouredPieces[0].chart} cellSize={14} showRowNumbers={false} />
              </div>
            </Panel>
          )}

          <Button size="lg" full onClick={save}>
            Save to library
          </Button>
        </div>
      </div>
    </div>
  );
}
