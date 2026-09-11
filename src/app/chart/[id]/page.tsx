"use client";

import { use, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { chartGeometry } from "@/lib/project/geometry";
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
import ChartView from "@/components/chart/ChartView";
import CrossStitchView from "@/components/chart/CrossStitchView";
import ChartLegend from "@/components/chart/ChartLegend";
import VoiceCounter from "@/components/VoiceCounter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { chartToInstructions } from "@/lib/chart";
import { isCrossStitchChart, type SavedChart } from "@/types";

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

  const apply = useCallback(
    (change: Parameters<typeof store.mutateChartProgress>[2]) => {
      if (!project || !saved) return;
      store.mutateChartProgress(project.id, saved.id, change);
    },
    [project, saved, store]
  );

  if (!store.loaded) {
    return <p className="label mx-auto max-w-6xl px-4 py-12 text-ink-faint">Loading…</p>;
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

  const instruction = yarnChart
    ? chartToInstructions(yarnChart).rows.find((r) => r.rowNumber === view.rowNumber)?.text
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow={project.name}
        title={saved.name}
        description={`${saved.piece} · row ${view.rowNumber} of ${view.totalRows}${
          view.side ? ` (${view.side})` : ""
        }`}
        action={<ButtonLink href="/saved" variant="secondary">Library</ButtonLink>}
      />

      {project.charts.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Pieces">
          {project.charts.map((chart) => (
            <ButtonLink
              key={chart.id}
              href={`/chart/${project.id}?chart=${chart.id}`}
              size="sm"
              variant={chart.id === saved.id ? "primary" : "secondary"}
            >
              {chart.piece}
            </ButtonLink>
          ))}
        </nav>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel
            title="Chart"
            accent="cobalt"
            action={
              <Tag tone={view.chartComplete ? "fern" : "neutral"}>
                {view.chartComplete ? "Finished" : `${Math.round(view.fraction * 100)}%`}
              </Tag>
            }
          >
            <div className="overflow-x-auto">
              {stitchChart ? (
                <CrossStitchView chart={stitchChart} cellSize={16} />
              ) : yarnChart ? (
                <ChartView
                  chart={yarnChart}
                  cellSize={20}
                  activeRow={view.rowNumber}
                  onCellClick={(row) =>
                    apply((p) => gotoRow(geometry, p, geometry.rows[row]?.rowNumber ?? 1))
                  }
                />
              ) : null}
            </div>
          </Panel>

          {instruction && (
            <Panel title="This row" accent="gold">
              <p className="text-base text-ink">{instruction}</p>
            </Panel>
          )}

          {yarnChart && (
            <Panel title="Stitch key" accent="grape">
              <ChartLegend chart={yarnChart} />
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <VoiceCounter
            rowNumber={view.rowNumber}
            totalRows={view.totalRows}
            stitchesDone={view.stitchesDone}
            stitchesInRow={view.stitchesInRow}
            instruction={instruction}
            onIncrement={(by) => apply((p) => increment(geometry, p, by))}
            onDecrement={(by) => apply((p) => decrement(geometry, p, by))}
            onNextRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber + 1))}
            onPrevRow={() => apply((p) => gotoRow(geometry, p, view.rowNumber - 1))}
            onGotoRow={(row) => apply((p) => gotoRow(geometry, p, row))}
            onSetCount={(count) => apply((p) => setCount(geometry, p, count))}
            onResetRow={() => apply((p) => setCount(geometry, p, 0))}
            onUndo={() => apply((p) => undo(p))}
          />

          <Panel title="Rows" accent="fern">
            <UndoLine progress={progress} onUndo={() => apply((p) => undo(p))} />
            <ol className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {[...geometry.rows].reverse().map((row) => {
                const done = stitchesDoneInRow(progress, row.rowIndex) >= row.count;
                return (
                  <li key={row.rowIndex}>
                    <button
                      type="button"
                      onClick={() => apply((p) => toggleRow(geometry, p, row.rowIndex))}
                      className={`flex w-full items-center justify-between gap-3 border-[3px] border-ink px-3 py-2 text-left ${
                        row.rowNumber === view.rowNumber
                          ? "bg-gold"
                          : done
                            ? "bg-panel-sunk text-ink-faint"
                            : "bg-panel"
                      }`}
                    >
                      <span className="label">
                        Row {row.rowNumber}
                        {row.side ? ` (${row.side})` : ""}
                      </span>
                      <span className="label text-ink-faint">{row.count} sts</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function UndoLine({
  progress,
  onUndo,
}: {
  progress: Parameters<typeof undoLabel>[0];
  onUndo: () => void;
}) {
  const label = undoLabel(progress);
  const [flash, setFlash] = useState(false);
  if (!label) return <p className="text-tiny text-ink-faint">Nothing to undo yet.</p>;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-tiny text-ink-soft">Last: {label}</p>
      <Button
        size="sm"
        variant={flash ? "gold" : "quiet"}
        onClick={() => {
          onUndo();
          setFlash(true);
        }}
        onBlur={() => setFlash(false)}
      >
        Undo
      </Button>
    </div>
  );
}
