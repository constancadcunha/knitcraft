"use client";

import { useMemo, useState } from "react";
import ChartView from "@/components/chart/ChartView";
import CrossStitchView from "@/components/chart/CrossStitchView";
import { isCrossStitchChart } from "@/types";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { chartGeometry } from "@/lib/project/geometry";
import { progressFraction } from "@/lib/project/progress";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Choice } from "@/components/ui/Field";
import {
  EmptyState,
  Heading,
  Loading,
  Meter,
  Notice,
  SectionHeading,
  Tag,
} from "@/components/ui/Bits";
import { CRAFT_LABELS, type CraftType, type Project } from "@/types";

type Filter = "all" | CraftType;

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "knitting", label: "Knitting" },
  { value: "crocheting", label: "Crochet" },
  { value: "cross-stitch", label: "Cross stitch" },
];

const CRAFT_TONE: Record<CraftType, "teal" | "blush" | "grape"> = {
  knitting: "teal",
  crocheting: "blush",
  "cross-stitch": "grape",
};

/** Overall completion across every chart in a project. */
function projectProgress(project: Project): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const saved of project.charts) {
    const geometry = chartGeometry(saved.chart);
    const progress = project.progress.charts[saved.id];
    total += geometry.totalStitches;
    if (progress) done += Math.round(progressFraction(geometry, progress) * geometry.totalStitches);
  }
  return { done, total };
}

/** "3 days ago" is more use than a timestamp when you are picking up a project. */
function lastTouched(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "A month ago" : `${months} months ago`;
}

export default function LibraryPage() {
  const store = useStore();
  const [status, setStatus] = useState("all");
  const [showPreviews, setShowPreviews] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirming, setConfirming] = useState<string | null>(null);

  const projects = useMemo(() => {
    const list = store.projects.filter((p) => !p.archived);
    const phase = (p: Project) => { const { done, total } = projectProgress(p); return done === 0 ? "started" : done >= total ? "finished" : "progress"; };
    return list.filter(p => (filter === "all" || p.craftType === filter) && (status === "all" || phase(p) === status)).sort((a,b) => {
      const priority = { progress: 0, started: 1, finished: 2 };
      return priority[phase(a)] - priority[phase(b)] || b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [store.projects, filter, status]);

  const total = store.projects.filter((p) => !p.archived).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="My library"
        title="Everything you're making"
        description="Jump back into work in progress, or browse your new and finished projects. Saved to your database."
        action={
          <ButtonLink href="/generate" size="lg">
            New project
          </ButtonLink>
        }
      />

      {store.storageError && (
        <Notice title="Storage problem" tone="berry" role="alert" className="mt-7">
          {store.storageError.message}
        </Notice>
      )}

      {store.discardedNotice && (
        <Notice
          title="Some saved data was discarded"
          role="status"
          className="mt-7"
          action={
            <Button size="sm" variant="secondary" onClick={store.dismissDiscardedNotice}>
              Dismiss
            </Button>
          }
        >
          {store.discardedNotice}
        </Notice>
      )}

      <div className="mt-8">
        <div className="mb-4"><Choice label="Project status" value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, { value: "progress", label: "In progress" }, { value: "started", label: "Not started" }, { value: "finished", label: "Finished" }]} /></div>
        <label className="flex items-center gap-3 mb-4"><input className="check" type="checkbox" checked={showPreviews} onChange={e => setShowPreviews(e.target.checked)} />Show project previews</label>
        <Choice label="Show" value={filter} options={FILTERS} onChange={setFilter} />
      </div>

      <div className="mt-9">
        <SectionHeading
          count={
            store.loaded
              ? `${projects.length} of ${total} project${total === 1 ? "" : "s"}`
              : undefined
          }
        >
          Jump back in
        </SectionHeading>

        {!store.loaded ? (
          <Loading>Reading your library</Loading>
        ) : projects.length === 0 ? (
          <EmptyState
            as="h3"
            title={filter === "all" ? "Nothing here yet" : "Nothing in this craft yet"}
            description={
              filter === "all"
                ? "Start in the Pattern Studio to have a pattern drafted from your measurements, or open the Chart Editor to draw one by hand."
                : "You have projects, just none in this craft. Switch the filter back to All to see them."
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/generate">Pattern Studio</ButtonLink>
                <ButtonLink href="/chart-editor" variant="secondary">
                  Chart Editor
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const { done, total: stitches } = projectProgress(project);
              const firstChart = project.charts[0];
              const percent = stitches ? Math.round((done / stitches) * 100) : 0;
              const touched = lastTouched(
                project.progress.lastWorkedAt ?? project.updatedAt
              );
              const isConfirming = confirming === project.id;

              return (
                <li key={project.id} className="panel flex flex-col">
                  {showPreviews && firstChart && <Link href={`/chart/${project.id}?chart=${firstChart.id}`} aria-label={`Open ${project.name}`} className="chart-fit h-44 overflow-hidden border-b-2 border-ink bg-paper p-3">{isCrossStitchChart(firstChart.chart) ? <CrossStitchView chart={firstChart.chart} cellSize={4} /> : <ChartView chart={firstChart.chart} cellSize={4} showRowNumbers={false} />}</Link>}
                  <div className="flex items-start gap-3 border-b-[3px] border-ink p-4">
                    <GarmentIcon
                      type={project.garmentType}
                      active
                      className="h-12 w-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-ui text-base uppercase leading-tight text-ink">
                        {project.name}
                      </h3>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {project.garmentType} · size {project.size}
                      </p>
                    </div>
                    <Tag tone={CRAFT_TONE[project.craftType]}>
                      {CRAFT_LABELS[project.craftType]}
                    </Tag>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <Meter
                      value={done}
                      max={Math.max(1, stitches)}
                      // Colour alone never carries the state: the label spells
                      // out where the project is in words.
                      tone={percent >= 100 ? "fern" : "gold"}
                      label={
                        percent >= 100
                          ? "Finished"
                          : percent === 0
                            ? "Not started"
                            : `${percent}% worked`
                      }
                      valueText={`${done} of ${stitches} stitches worked`}
                    />

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t-[3px] border-ink/10 pt-3">
                      <div>
                        <dt className="label text-ink-faint">Pieces</dt>
                        <dd className="mt-1 text-sm text-ink">
                          {project.charts.length}
                        </dd>
                      </div>
                      <div>
                        <dt className="label text-ink-faint">Last worked</dt>
                        <dd className="mt-1 text-sm text-ink">{touched ?? "Never"}</dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      {firstChart && (
                        <ButtonLink href={`/chart/${project.id}?chart=${firstChart.id}`}>
                          {percent > 0 ? "Keep going" : "Open tracker"}
                        </ButtonLink>
                      )}
                      <ButtonLink href={`/pattern/${project.id}`} variant="secondary">
                        Pattern
                      </ButtonLink>
                      <Button
                        variant={isConfirming ? "danger" : "quiet"}
                        aria-label={
                          isConfirming
                            ? `Confirm deleting ${project.name}`
                            : `Delete ${project.name}`
                        }
                        onClick={() => {
                          if (isConfirming) {
                            store.removeProject(project.id);
                            setConfirming(null);
                          } else {
                            setConfirming(project.id);
                          }
                        }}
                        onBlur={() =>
                          setConfirming((id) => (id === project.id ? null : id))
                        }
                      >
                        {isConfirming ? "Tap again" : "Delete"}
                      </Button>
                    </div>
                    {isConfirming && (
                      <p className="text-tiny text-berry" role="alert">
                        This deletes the project from your library and database.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-12 text-sm text-ink-soft">
        <Link
          href="/learn"
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-berry"
        >
          Stuck on a stitch? The library explains every one.
        </Link>
      </p>
    </div>
  );
}
