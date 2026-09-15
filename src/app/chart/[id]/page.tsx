"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { chartGeometry, rowIndexForNumber } from "@/lib/project/geometry";
import {
  decrement,
  gotoRow,
  increment,
  setCount,
  stitchesDoneInRow,
  toggleRow,
  trackerView,
  undo,
  undoLabel,
} from "@/lib/project/progress";
import ProjectComments from "@/components/ProjectComments";
import { getSymbol, workedForm } from "@/lib/chart";
import ChartView from "@/components/chart/ChartView";
import RowCloseUp from "@/components/tracker/RowCloseUp";
import InstructionBrowser from "@/components/tracker/InstructionBrowser";
import {
  panelStitchesFromChart,
  rowsFromChart,
  rowsFromWrittenInstructions,
} from "@/components/tracker/instructionSections";
import CrossStitchView from "@/components/chart/CrossStitchView";
import ChartLegend from "@/components/chart/ChartLegend";
import VoiceCounter from "@/components/VoiceCounter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { EmptyState, Heading, Loading, Meter, Stat, Tag } from "@/components/ui/Bits";
import { isCrossStitchChart, type SavedChart } from "@/types";
import { cn } from "@/lib/cn";

/** Cell sizes the zoom control steps through, in px. */
const ZOOMS = [
  { value: 0, label: "Fit" },
  { value: 16, label: "S" },
  { value: 24, label: "M" },
  { value: 36, label: "L" },
] as const;

export default function TrackerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const search = useSearchParams();
  const store = useStore();
  const project = store.getProject(id);

  const requestedChartId = search.get("chart");
  const saved: SavedChart | undefined = useMemo(() => {
    if (!project) return undefined;
    return (
      project.charts.find((c) => c.id === requestedChartId) ??
      project.charts.find((c) => c.id === project.progress.activeChartId) ??
      project.charts[0]
    );
  }, [project, requestedChartId]);

  const geometry = useMemo(() => (saved ? chartGeometry(saved.chart) : null), [saved]);
  const progress = saved && project ? project.progress.charts[saved.id] : undefined;

  // Zoom lives with the reader, not with the project: how close you hold the
  // phone is not a property of the pattern.
  const [zoom, setZoom] = useState<number>(0);

  /**
   * The written rows for this piece.
   *
   * Preferred source is the project's own stored pattern: it was assembled from
   * this very chart by `assemblePattern`, which knew the piece's REAL stitch
   * count (a chart is clipped to a 60-stitch editing window, so regenerating
   * from the grid alone would say "cast on 60" for a 106-stitch back). A
   * project made in the chart editor has no written pattern, so there we
   * regenerate and recover the true width from the panel repeat box the engine
   * labelled.
   */
  const book = useMemo(() => {
    const chart = saved?.chart;
    if (!chart || isCrossStitchChart(chart)) return null;
    const section = project?.pattern?.sections.find((s) => s.chartId === chart.id);
    if (section && section.instructions.length > 1) {
      return rowsFromWrittenInstructions(section.instructions);
    }
    const totalStitches = panelStitchesFromChart(chart);
    return rowsFromChart(chart, totalStitches ? { totalStitches } : {});
  }, [saved, project]);

  const apply = useCallback(
    (change: Parameters<typeof store.mutateChartProgress>[2]) => {
      if (!project || !saved) return;
      store.mutateChartProgress(project.id, saved.id, change);
    },
    [project, saved, store]
  );

  if (!store.loaded) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Loading>Opening your project</Loading>
      </div>
    );
  }

  if (!project || !saved || !geometry || !progress) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title="Nothing to track"
          description="This project has no chart, or the link points at one that no longer exists."
          action={<ButtonLink href="/saved">Back to library</ButtonLink>}
        />
      </div>
    );
  }

  const view = trackerView(geometry, progress);
  // Narrow the chart union once. `saved.chart` is a ProjectChart, and the two
  // kinds render through different components.
  const chart = saved.chart;
  const stitchChart = isCrossStitchChart(chart) ? chart : null;
  const yarnChart = isCrossStitchChart(chart) ? null : chart;

  // The row being worked, in words. Taken from the same book the reader below
  // is browsing, so the panel, the voice counter and the section list can never
  // quote three different versions of one row.
  const currentRow = book?.rows.find((r) => r.rowNumber === view.rowNumber);
  const instruction = currentRow
    ? `${currentRow.label}: ${currentRow.body}.${
        currentRow.stitchesAfter !== null ? ` (${currentRow.stitchesAfter} sts)` : ""
      }`
    : undefined;

  const percent = Math.round(view.fraction * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Heading
        eyebrow={project.name}
        title={saved.name}
        description={`${saved.piece} · ${view.totalRows} rows · ${percent}% worked`}
        action={
          <ButtonLink href="/saved" variant="secondary">
            Library
          </ButtonLink>
        }
      />

      {project.charts.length > 1 && (
        <nav className="mt-7" aria-label="Pieces">
          <p className="label mb-2.5 text-ink-faint">Pieces in this project</p>
          <ul className="flex flex-wrap gap-2">
            {project.charts.map((piece) => {
              const active = piece.id === saved.id;
              return (
                <li key={piece.id}>
                  <ButtonLink
                    href={`/chart/${project.id}?chart=${piece.id}`}
                    size="sm"
                    variant={active ? "primary" : "secondary"}
                    aria-current={active ? "true" : undefined}
                  >
                    {active && <span className="h-2 w-2 bg-panel" aria-hidden />}
                    {piece.piece}
                  </ButtonLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-5">
          {yarnChart && <Panel title="Read this row — every step" accent="berry"><ol className="max-h-64 overflow-auto space-y-2">{geometry.rows[progress.cursor.rowIndex]?.stitches.map((st, i) => <li key={i} className={i < view.stitchesDone ? "line-through text-ink-faint" : "text-ink"}>{i + 1}. {(getSymbol(st.symbolId) ? workedForm(getSymbol(st.symbolId)!, view.side ?? "RS").instruction : undefined) ?? "Work stitch"} · colour {(st.colorIndex ?? 0) + 1}</li>)}</ol></Panel>}
          <NowPanel
            rowNumber={view.rowNumber}
            totalRows={view.totalRows}
            side={view.side}
            stitchesDone={view.stitchesDone}
            stitchesInRow={view.stitchesInRow}
            remaining={view.remaining}
            rowComplete={view.rowComplete}
            chartComplete={view.chartComplete}
            instruction={instruction}
            undoText={undoLabel(progress)}
            onIncrement={(by) => apply((p) => increment(geometry, p, by))}
            onDecrement={(by) => apply((p) => decrement(geometry, p, by))}
            onNextRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber + 1))}
            onPrevRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber - 1))}
            onResetRow={() => apply((p) => setCount(geometry, p, 0))}
            onUndo={() => apply((p) => undo(p))}
          />

          {yarnChart && (
            <Panel
              title="This row, stitch by stitch"
              accent="berry"
              bodyClassName="p-3 sm:p-4"
              action={
                <Tag tone="neutral">
                  Row {view.rowNumber} of {view.totalRows}
                </Tag>
              }
            >
              <RowCloseUp
                chart={yarnChart}
                rowIndex={view.rowIndex}
                stitchesDone={view.stitchesDone}
                onSelectStitch={(before) => apply((p) => setCount(geometry, p, before))}
              />
            </Panel>
          )}

          <Panel
            title="Chart"
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
            <ChartBoard
              zoom={zoom}
              activeRow={view.rowNumber}
              totalRows={view.totalRows}
            >
              {stitchChart ? (
                <CrossStitchView chart={stitchChart} cellSize={zoom || 16} completed={Object.fromEntries(geometry.rows.flatMap(r => r.stitches.slice(0, progress.rowStitches[r.rowIndex] ?? 0).map(st => [`${r.rowIndex},${st.anchorCol}`, true])))} />
              ) : yarnChart ? (
                <ChartView
                  chart={yarnChart}
                  completed={Object.fromEntries(geometry.rows.flatMap(r => r.stitches.slice(0, progress.rowStitches[r.rowIndex] ?? 0).map(st => [`${r.rowIndex},${st.anchorCol}`, true])))}
                  cellSize={zoom || 20}
                  activeRow={view.rowNumber}
                  onCellClick={(row) =>
                    apply((p) => gotoRow(geometry, p, geometry.rows[row]?.rowNumber ?? 1))
                  }
                />
              ) : null}
            </ChartBoard>
            <p className="mt-3 text-tiny text-ink-faint">
              Row 1 is at the bottom, as on chart paper. Tap any row to jump to
              it.
            </p>
          </Panel>

          {yarnChart && (
            <Panel title="What the symbols mean" accent="grape">
              <ChartLegend chart={yarnChart} />
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <VoiceCounter
            rowNumber={view.rowNumber}
            totalRows={view.totalRows}
            stitchesDone={view.stitchesDone}
            stitchesInRow={view.stitchesInRow}
            instruction={instruction}
            chart={yarnChart ?? undefined}
            rowIndex={view.rowIndex}
            onIncrement={(by) => apply((p) => increment(geometry, p, by))}
            onDecrement={(by) => apply((p) => decrement(geometry, p, by))}
            onNextRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber + 1))}
            onPrevRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber - 1))}
            onGotoRow={(row) => apply((p) => gotoRow(geometry, p, row))}
            onSetCount={(count) => apply((p) => setCount(geometry, p, count))}
            onResetRow={() => apply((p) => setCount(geometry, p, 0))}
            onUndo={() => apply((p) => undo(p))}
          />

          <ProjectComments projectId={project.id} />
          <Panel
            title={book ? "The instructions" : "Rows"}
            accent="fern"
            bodyClassName="p-3 sm:p-4"
            action={
              <Tag tone={view.chartComplete ? "gold" : "neutral"}>
                {view.chartComplete ? "All worked" : `${percent}% worked`}
              </Tag>
            }
          >
            {book ? (
              /* Written rows, broken into phases with their own navigation —
                 183 rows in one list is a wall nobody can hold their place in. */
              <InstructionBrowser
                book={book}
                activeRow={view.rowNumber}
                listHeightClass="max-h-[24rem]"
                isRowWorked={(rowNumber) => {
                  const rowIndex = rowIndexForNumber(geometry, rowNumber);
                  if (rowIndex === null) return false;
                  const row = geometry.rows[rowIndex];
                  return (
                    !!row && row.count > 0 && stitchesDoneInRow(progress, rowIndex) >= row.count
                  );
                }}
                onToggleRow={(rowNumber) => {
                  const rowIndex = rowIndexForNumber(geometry, rowNumber);
                  if (rowIndex !== null) apply((p) => toggleRow(geometry, p, rowIndex));
                }}
                onGotoRow={(rowNumber) => apply((p) => gotoRow(geometry, p, rowNumber))}
              />
            ) : (
              /* A cross-stitch design has no written rows to break up: the
                 picture IS the instruction, so the plain row ledger stands. */
              <RowList
                rows={geometry.rows}
                progress={progress}
                currentRow={view.rowNumber}
                onToggle={(rowIndex) => apply((p) => toggleRow(geometry, p, rowIndex))}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The row being worked — the one thing on this page that must be readable    */
/* from where the knitting is.                                                 */
/* -------------------------------------------------------------------------- */

function NowPanel({
  rowNumber,
  totalRows,
  side,
  stitchesDone,
  stitchesInRow,
  remaining,
  rowComplete,
  chartComplete,
  instruction,
  undoText,
  onIncrement,
  onDecrement,
  onNextRow,
  onPrevRow,
  onResetRow,
  onUndo,
}: {
  rowNumber: number;
  totalRows: number;
  side: "RS" | "WS" | null;
  stitchesDone: number;
  stitchesInRow: number;
  remaining: number;
  rowComplete: boolean;
  chartComplete: boolean;
  instruction?: string;
  undoText: string | null;
  onIncrement: (by: number) => void;
  onDecrement: (by: number) => void;
  onNextRow: () => void;
  onPrevRow: () => void;
  onResetRow: () => void;
  onUndo: () => void;
}) {
  return (
    <Panel
      title={chartComplete ? "Finished" : rowComplete ? "Row complete" : "Working now"}
      accent={chartComplete ? "fern" : rowComplete ? "fern" : "gold"}
      action={
        side && (
          <Tag tone="neutral">
            {side === "RS" ? "Right side facing" : "Wrong side facing"}
          </Tag>
        )
      }
    >
      {/* One spoken summary for screen readers, updated as the count changes.
          The visible numbers below are the same fact; announcing each button
          separately would be unbearable mid-row. */}
      <p aria-live="polite" className="sr-only">
        Row {rowNumber} of {totalRows}. {stitchesDone} of {stitchesInRow}{" "}
        stitches worked, {remaining} to go.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Row"
          value={rowNumber}
          sub={`of ${totalRows}`}
          tone={rowComplete ? "fern" : "gold"}
        />
        <Stat
          label="Stitches this row"
          value={stitchesDone}
          sub={remaining > 0 ? `${remaining} still to work` : "Row finished"}
        />
      </div>

      <Meter
        className="mt-4"
        value={stitchesDone}
        max={stitchesInRow}
        tone={rowComplete ? "fern" : "gold"}
        label="This row"
        valueText={`${stitchesDone} of ${stitchesInRow} stitches`}
      />

      {instruction && (
        <div className="panel-sunk mt-4 p-4">
          <p className="label mb-2 text-ink-soft">Read this row</p>
          <p className="text-base leading-relaxed text-ink sm:text-lg">
            {instruction}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Button
          size="lg"
          variant="gold"
          onClick={() => onIncrement(1)}
          disabled={rowComplete}
          className="sm:col-span-2"
        >
          {rowComplete ? "Row complete" : "Count one stitch"}
        </Button>
        <Button size="md" variant="primary" onClick={onNextRow}>
          Next row
        </Button>
        <Button size="md" variant="secondary" onClick={onPrevRow}>
          Previous row
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Button size="md" variant="quiet" onClick={() => onDecrement(1)}>
          Back one
        </Button>
        <Button size="md" variant="quiet" onClick={onResetRow}>
          Reset row
        </Button>
        <Button size="md" variant="quiet" onClick={onUndo} disabled={!undoText}>
          Undo
        </Button>
      </div>

      <p className="mt-3 text-tiny text-ink-faint">
        {undoText ? `Undo will reverse: ${undoText}.` : "Nothing to undo yet."}
      </p>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* The chart board                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Wraps the chart SVG.
 *
 * `Fit` shows the whole piece scaled to the column; any zoom level renders at
 * true cell size inside a scroll box and keeps the row being worked in view.
 * Scrolling is done in an effect rather than during render, and it only moves
 * the scroll position — no state is set, so the React Compiler rules hold.
 */
function ChartBoard({
  zoom,
  activeRow,
  totalRows,
  children,
}: {
  zoom: number;
  activeRow: number;
  totalRows: number;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || zoom === 0) return;
    // Row 1 sits at the BOTTOM of the drawing, so the row being worked is
    // (totalRows - activeRow) rows down from the top.
    const fromTop = (totalRows - activeRow) * zoom;
    box.scrollTo({
      top: Math.max(0, fromTop - box.clientHeight / 2 + zoom / 2),
      behavior: "smooth",
    });
  }, [zoom, activeRow, totalRows]);

  if (zoom === 0) return <div className="chart-fit">{children}</div>;

  return (
    <div
      ref={boxRef}
      className="chart-board max-h-[65vh]"
      tabIndex={0}
      role="region"
      aria-label="Chart, scrollable"
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The row list                                                                */
/* -------------------------------------------------------------------------- */

function RowList({
  rows,
  progress,
  currentRow,
  onToggle,
}: {
  rows: ReturnType<typeof chartGeometry>["rows"];
  progress: Parameters<typeof stitchesDoneInRow>[0];
  currentRow: number;
  onToggle: (rowIndex: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>("[data-current='true']");
    current?.scrollIntoView({ block: "center" });
  }, [currentRow]);

  return (
    <ol
      ref={listRef}
      className="max-h-[26rem] space-y-2 overflow-y-auto p-1"
      aria-label="Every row in this chart"
    >
      {/* Top of the list is the top of the chart: the last row worked. */}
      {[...rows].reverse().map((row) => {
        const done = stitchesDoneInRow(progress, row.rowIndex) >= row.count;
        const current = row.rowNumber === currentRow;
        return (
          <li key={row.rowIndex}>
            <button
              type="button"
              data-current={current ? "true" : undefined}
              aria-current={current ? "true" : undefined}
              onClick={() => onToggle(row.rowIndex)}
              className={cn(
                "hit flex w-full items-center gap-3 border-[3px] border-ink px-3 py-2 text-left",
                current
                  ? "bg-gold shadow-pop-sm"
                  : done
                    ? "stripe bg-panel-sunk text-ink-soft"
                    : "bg-panel hover:bg-panel-sunk"
              )}
            >
              {/* Worked / not worked is a shape as well as a shade. */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center border-[3px] border-ink",
                  done ? "bg-fern" : "bg-panel"
                )}
                aria-hidden
              >
                {done && <span className="h-1.5 w-1.5 bg-panel" />}
              </span>
              <span className="label min-w-0 flex-1">
                Row {row.rowNumber}
                {row.side ? ` · ${row.side}` : ""}
              </span>
              <span className="label shrink-0 text-ink-faint">{row.count} sts</span>
              <span className="sr-only">
                {done ? "worked" : "not worked yet"}
                {current ? ", current row" : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
