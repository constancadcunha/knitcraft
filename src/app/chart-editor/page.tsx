"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { draftGarment } from "@/lib/garments";
import { createProject, createSavedChart } from "@/lib/project/factory";
import { createChartProgress } from "@/lib/project/progress";
import { clearAt, placeSymbol, setColor, type SymbolChart } from "@/lib/chart";
import ChartView from "@/components/chart/ChartView";
import ChartLegend from "@/components/chart/ChartLegend";
import SymbolPalette from "@/components/chart/SymbolPalette";
import { Button } from "@/components/ui/Button";
import { Choice, SelectField, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Heading, Tag } from "@/components/ui/Bits";
import {
  GARMENT_TYPES,
  defaultSizeForGarment,
  sizesForGarment,
  toKnitCraft,
  type GarmentType,
  type GarmentSize,
  type YarnCraft,
} from "@/types";

type Tool = "symbol" | "colour" | "erase";

const PALETTE = ["#f5ede0", "#2b2b2b", "#e2483d", "#2f6fd0", "#3f9e56", "#f2b53c"];

export default function ChartEditorPage() {
  const router = useRouter();
  const store = useStore();

  const [craft, setCraft] = useState<YarnCraft>("knitting");
  const [garment, setGarment] = useState<GarmentType>("Sweater");
  const [size, setSize] = useState<GarmentSize>(() => defaultSizeForGarment("Sweater"));
  const [stitchesPer10cm, setStitches] = useState(22);
  const [rowsPer10cm, setRows] = useState(30);

  // Drafting is cheap (sub-millisecond), so it runs on every change rather
  // than behind a button — pick a garment and the baseline is already there.
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

  const [pieceIndex, setPieceIndex] = useState(0);
  const [edits, setEdits] = useState<Record<string, SymbolChart>>({});
  const [tool, setTool] = useState<Tool>("symbol");
  const [symbolId, setSymbolId] = useState<string>("k");
  const [colorIndex, setColorIndex] = useState(1);
  const [name, setName] = useState("");

  const piece = draft.pieces[Math.min(pieceIndex, draft.pieces.length - 1)];
  const chart = piece ? (edits[piece.chart.id] ?? piece.chart) : null;

  const sizes = useMemo(() => sizesForGarment(garment), [garment]);

  function onGarment(next: GarmentType) {
    setGarment(next);
    setPieceIndex(0);
    setEdits({});
    // A cowl has no "2-4yr" and a sweater has no "One Size": move to a size
    // this garment actually supports rather than failing later.
    if (!sizesForGarment(next).includes(size)) setSize(defaultSizeForGarment(next));
  }

  function edit(row: number, col: number) {
    if (!chart) return;
    const result =
      tool === "erase"
        ? clearAt(chart, row, col)
        : tool === "colour"
          ? setColor(chart, row, col, colorIndex)
          : placeSymbol(chart, row, col, symbolId);
    if (result.ok) setEdits((e) => ({ ...e, [chart.id]: result.value }));
  }

  function save() {
    const project = createProject({
      name: name.trim() || `${garment} (${size})`,
      craftType: craft,
      garmentType: garment,
      size,
      source: { kind: "wizard" },
    });

    const charts = draft.pieces.map((p, i) =>
      createSavedChart({
        chart: edits[p.chart.id] ?? p.chart,
        name: p.panel.name,
        piece: p.panel.name,
        order: i,
      })
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
        eyebrow="Chart editor"
        title="Draw the fabric"
        description="Pick what you're making and the grid is already sized to your gauge. Then draw colourwork, cables, lace or texture on it."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="What are you making?" accent="berry">
            <div className="space-y-4">
              <Choice
                label="Craft"
                value={craft}
                options={[
                  { value: "knitting", label: "Knit" },
                  { value: "crocheting", label: "Crochet" },
                ]}
                onChange={(next) => {
                  setCraft(next);
                  setEdits({});
                  setSymbolId(next === "knitting" ? "k" : "sc");
                }}
              />
              <SelectField
                label="Garment"
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
                  min={4}
                  max={60}
                  value={stitchesPer10cm}
                  onChange={(e) => setStitches(Number(e.target.value) || 22)}
                />
                <TextField
                  label="Rows / 10cm"
                  type="number"
                  min={4}
                  max={80}
                  value={rowsPer10cm}
                  onChange={(e) => setRows(Number(e.target.value) || 30)}
                />
              </div>
            </div>
          </Panel>

          {draft.warnings.length > 0 && (
            <div className="panel bg-gold p-4">
              <h3 className="label text-ink">Assumptions</h3>
              <ul className="mt-2 space-y-1">
                {draft.warnings.map((w) => (
                  <li key={w} className="text-sm text-ink">{w}</li>
                ))}
              </ul>
            </div>
          )}

          <Panel title="Tool" accent="cobalt">
            <div className="space-y-4">
              <Choice
                value={tool}
                options={[
                  { value: "symbol", label: "Stitch" },
                  { value: "colour", label: "Colour" },
                  { value: "erase", label: "Erase" },
                ]}
                onChange={setTool}
              />

              {tool === "colour" && (
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((hex, i) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Colour ${i + 1}`}
                      aria-pressed={colorIndex === i}
                      onClick={() => setColorIndex(i)}
                      className={`h-9 w-9 border-[3px] border-ink ${
                        colorIndex === i ? "shadow-pop-sm" : ""
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}

              {tool === "symbol" && (
                <SymbolPalette craft={craft} value={symbolId} onChange={setSymbolId} />
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Pieces"
            accent="grape"
            action={<Tag tone="neutral">{draft.pieces.length}</Tag>}
          >
            <div className="flex flex-wrap gap-2">
              {draft.pieces.map((p, i) => (
                <Button
                  key={p.chart.id}
                  size="sm"
                  variant={i === pieceIndex ? "primary" : "secondary"}
                  onClick={() => setPieceIndex(i)}
                >
                  {p.panel.name}
                </Button>
              ))}
            </div>
            {piece && (
              <p className="mt-3 text-sm text-ink-soft">
                {piece.panel.stitches} sts × {piece.panel.rows} rows ·{" "}
                {piece.panel.widthCm.toFixed(1)} × {piece.panel.heightCm.toFixed(1)} cm
                {piece.panel.note ? ` · ${piece.panel.note}` : ""}
              </p>
            )}
          </Panel>

          {chart && (
            <>
              <Panel title={piece?.panel.name ?? "Chart"} accent="cobalt">
                <div className="overflow-x-auto">
                  <ChartView chart={chart} cellSize={18} onCellClick={edit} />
                </div>
              </Panel>

              <Panel title="Stitch key" accent="fern">
                <ChartLegend chart={chart} />
              </Panel>
            </>
          )}

          <Panel title="Save it" accent="gold">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <TextField
                  label="Project name"
                  placeholder={`${garment} (${size})`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button size="lg" onClick={save}>Save to library</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
