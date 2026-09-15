"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { GarmentIcon } from "@/components/GarmentIcon";
import { Choice, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { Heading, Notice, Tag } from "@/components/ui/Bits";
import { cn } from "@/lib/cn";
import {
  garmentsForCraft,
  defaultSizeForGarment,
  sizesForGarment,
  toKnitCraft,
  type GarmentType,
  type GarmentSize,
  type YarnCraft,
} from "@/types";

type Tool = "symbol" | "colour" | "erase";

const PALETTE = ["#f5ede0", "#2b2b2b", "#e2483d", "#2f6fd0", "#3f9e56", "#f2b53c"];

/** Human names for the palette, so the swatches are not colour-only controls. */
const PALETTE_NAMES = ["Cream", "Charcoal", "Berry", "Cobalt", "Fern", "Gold"];

/** Cell sizes the zoom control steps through, in px. 0 means "fit the column". */
const ZOOMS = [
  { value: 0, label: "Fit" },
  { value: 18, label: "S" },
  { value: 26, label: "M" },
  { value: 38, label: "L" },
] as const;

export default function ChartEditorPage() {
  const router = useRouter();
  const store = useStore();

  const [palette, setPalette] = useState(PALETTE);
  const [newColour, setNewColour] = useState("#c65d9b");
  const [ribbing, setRibbing] = useState(true);
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
        options: { ribbing },
      }),
    [garment, craft, size, stitchesPer10cm, rowsPer10cm, ribbing]
  );

  // The editor opens on a short setup rather than the full control panel:
  // being asked what you are making is what made this usable, and the grid is
  // meaningless until it knows.
  const [setupDone, setSetupDone] = useState(false);
  const [pieceIndex, setPieceIndex] = useState(0);
  const [edits, setEdits] = useState<Record<string, SymbolChart>>({});
  const [tool, setTool] = useState<Tool>("symbol");
  const [symbolId, setSymbolId] = useState<string>("k");
  const [colorIndex, setColorIndex] = useState(1);
  const [name, setName] = useState("");
  const [zoom, setZoom] = useState(0);

  const piece = draft.pieces[Math.min(pieceIndex, draft.pieces.length - 1)];
  const chart = useMemo(() => piece ? { ...(edits[piece.chart.id] ?? piece.chart), colors: palette } : null, [piece, edits, palette]);

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
    if (!store.loaded) return;
    const project = createProject({
      name: name.trim() || `${garment} (${size})`,
      craftType: craft,
      garmentType: garment,
      size,
      source: { kind: "wizard" },
    });

    const charts = draft.pieces.map((p, i) =>
      createSavedChart({
        chart: { ...(edits[p.chart.id] ?? p.chart), colors: palette },
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

  if (!setupDone) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Heading
          eyebrow="Chart editor"
          title="What are you charting?"
          description="Answer these and the grid arrives already sized to your gauge, with a baseline drawn on it."
        />

        <div className="panel mt-8 space-y-6 p-5 sm:p-6">
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

          <label className="flex items-center gap-4 p-4 border-2 border-ink/20"><input type="checkbox" className="check" checked={ribbing} onChange={e => { setRibbing(e.target.checked); setEdits({}); }} />Include ribbing on garment hems and cuffs</label>
          <div>
            <span className="label mb-2 block text-ink-soft">What are you making?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {garmentsForCraft(craft).map(({ id: g }) => {
                const active = garment === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onGarment(g)}
                    className={`flex flex-col items-center gap-1.5 border-[3px] border-ink p-2.5 transition-transform ${
                      active ? "bg-gold shadow-pop-sm" : "bg-panel hover:-translate-y-0.5"
                    }`}
                  >
                    <GarmentIcon type={g} active={active} className="h-10 w-10" />
                    <span className="label text-center text-ink">{g}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label mb-2 block text-ink-soft">Size</span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                  className={`press px-3 py-2 ${
                    size === s ? "bg-berry text-panel" : "bg-panel text-ink hover:bg-gold"
                  }`}
                >
                  {s}
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
              value={stitchesPer10cm}
              onChange={(e) => setStitches(Number(e.target.value) || 22)}
              hint="From a blocked swatch."
            />
            <TextField
              label="Rows per 10 cm"
              type="number"
              min={4}
              max={80}
              value={rowsPer10cm}
              onChange={(e) => setRows(Number(e.target.value) || 30)}
            />
          </div>

          <div className="border-t-[3px] border-ink pt-5">
            <p className="mb-3 text-sm text-ink-soft">
              This will draft{" "}
              <strong className="text-ink">
                {draft.pieces.length} piece{draft.pieces.length === 1 ? "" : "s"}
              </strong>
              {piece ? `, starting with ${piece.panel.name} at ${piece.panel.stitches} × ${piece.panel.rows}` : ""}.
            </p>
            <Button size="lg" onClick={() => setSetupDone(true)}>
              Open the grid →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="Chart editor"
        title={`${garment} · ${size}`}
        description="Draw colourwork, cables, lace or texture. The grid is already sized to your gauge."
        action={
          <Button variant="secondary" onClick={() => setSetupDone(false)}>
            Change what you&rsquo;re making
          </Button>
        }
      />

      <div className="mt-9 grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          {draft.warnings.length > 0 && (
            <Notice title="Assumptions made" role="status">
              <ul className="space-y-1.5">
                {draft.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Notice>
          )}

          <Panel title="Tool" accent="cobalt">
            <div className="space-y-4">
              <Choice
                label="What to draw"
                value={tool}
                options={[
                  { value: "symbol", label: "Stitch" },
                  { value: "colour", label: "Colour" },
                  { value: "erase", label: "Erase" },
                ]}
                onChange={setTool}
              />

              {tool === "colour" && (
                <div>
                  <p className="label mb-2 text-ink-soft">Yarn colour</p>
                  <div className="flex flex-wrap gap-2.5" role="group" aria-label="Yarn colour">
                    {palette.map((hex, i) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={PALETTE_NAMES[i] ?? `Colour ${i + 1}`}
                        aria-pressed={colorIndex === i}
                        onClick={() => setColorIndex(i)}
                        /* The selected swatch is marked by a ring of ink and a
                           raised shadow, never by its own colour — you cannot
                           tell "selected" from a colour you also just painted. */
                        className={cn(
                          "hit flex w-11 items-center justify-center border-[3px] border-ink",
                          colorIndex === i && "shadow-pop"
                        )}
                        style={{ backgroundColor: hex }}
                      >
                        {colorIndex === i && (
                          <span className="h-2.5 w-2.5 border-2 border-ink bg-panel" aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3"><input type="color" aria-label="New yarn colour" value={newColour} onChange={e => setNewColour(e.target.value)} /><Button size="sm" onClick={() => { const index = palette.indexOf(newColour); if (index < 0) setPalette([...palette, newColour]); setColorIndex(index < 0 ? palette.length : index); }}>Add colour</Button></div>
                  <p className="mt-2.5 text-tiny text-ink-faint">
                    Painting with {PALETTE_NAMES[colorIndex] ?? `colour ${colorIndex + 1}`}.
                  </p>
                </div>
              )}

              {tool === "symbol" && (
                <SymbolPalette craft={craft} value={symbolId} onChange={setSymbolId} />
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Pieces"
            accent="grape"
            action={
              <Tag tone="neutral">
                {draft.pieces.length} piece{draft.pieces.length === 1 ? "" : "s"}
              </Tag>
            }
          >
            <ul className="flex flex-wrap gap-2">
              {draft.pieces.map((p, i) => (
                <li key={p.chart.id}>
                  <Button
                    size="sm"
                    variant={i === pieceIndex ? "primary" : "secondary"}
                    aria-pressed={i === pieceIndex}
                    onClick={() => setPieceIndex(i)}
                  >
                    {i === pieceIndex && (
                      <span className="h-2 w-2 bg-panel" aria-hidden />
                    )}
                    {p.panel.name}
                  </Button>
                </li>
              ))}
            </ul>
            {piece && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t-[3px] border-ink/10 pt-4 sm:grid-cols-4">
                <Fact label="Stitches" value={piece.panel.stitches} />
                <Fact label="Rows" value={piece.panel.rows} />
                <Fact label="Width" value={`${piece.panel.widthCm.toFixed(1)} cm`} />
                <Fact label="Height" value={`${piece.panel.heightCm.toFixed(1)} cm`} />
              </dl>
            )}
            {piece?.panel.note && (
              <p className="mt-3 text-sm text-ink-soft">{piece.panel.note}</p>
            )}
          </Panel>

          {chart && (
            <>
              <Panel
                title={piece?.panel.name ?? "Chart"}
                accent="cobalt"
                bodyClassName="p-3 sm:p-4"
                action={
                  <div className="flex items-center gap-2">
                    <span className="label text-panel">Zoom</span>
                    <div className="flex" role="group" aria-label="Chart zoom">
                      {ZOOMS.map((z) => (
                        <button
                          key={z.value}
                          type="button"
                          aria-pressed={zoom === z.value}
                          onClick={() => setZoom(z.value)}
                          className={cn(
                            "label h-9 w-11 border-[3px] border-ink",
                            zoom === z.value
                              ? "bg-ink text-panel"
                              : "bg-panel text-ink hover:bg-gold"
                          )}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              >
                <div
                  className={zoom === 0 ? "chart-fit" : "chart-board max-h-[70vh]"}
                  tabIndex={zoom === 0 ? undefined : 0}
                  role={zoom === 0 ? undefined : "region"}
                  aria-label={zoom === 0 ? undefined : "Chart, scrollable"}
                >
                  <ChartView chart={chart} cellSize={zoom || 18} onCellClick={edit} />
                </div>
                <p className="mt-3 text-tiny text-ink-faint" aria-live="polite">
                  {tool === "erase"
                    ? "Tap a square to clear it."
                    : tool === "colour"
                      ? `Tap a square to paint it ${(PALETTE_NAMES[colorIndex] ?? "").toLowerCase()}.`
                      : "Tap a square to place the selected stitch."}{" "}
                  Row 1 is at the bottom.
                </p>
              </Panel>

              <Panel title="What the symbols mean" accent="fern">
                <ChartLegend chart={chart} />
              </Panel>
            </>
          )}

          <Panel title="Save it" accent="gold">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <TextField
                  label="Project name"
                  placeholder={`${garment} (${size})`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  hint="Leave it blank and the garment and size are used."
                />
              </div>
              <Button size="lg" disabled={!store.loaded} onClick={save} className="shrink-0">
                Save to library
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** One labelled number in the piece summary. */
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="label text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
