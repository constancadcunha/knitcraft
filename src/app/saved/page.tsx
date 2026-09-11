"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { chartGeometry } from "@/lib/project/geometry";
import { progressFraction } from "@/lib/project/progress";
import { GarmentIcon } from "@/components/GarmentIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Choice } from "@/components/ui/Field";
import { EmptyState, Heading, Meter, Tag } from "@/components/ui/Bits";
import { CRAFT_LABELS, type CraftType, type Project } from "@/types";
import { cn } from "@/lib/cn";

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

export default function LibraryPage() {
  const store = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirming, setConfirming] = useState<string | null>(null);

  const projects = useMemo(() => {
    const list = store.projects.filter((p) => !p.archived);
    return filter === "all" ? list : list.filter((p) => p.craftType === filter);
  }, [store.projects, filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="My library"
        title="Everything you're making"
        description="Projects live in this browser only. Nothing is uploaded anywhere."
        action={<ButtonLink href="/generate" size="lg">New project</ButtonLink>}
      />

      {store.storageError && (
        <p className="panel mt-6 border-berry bg-panel p-4 text-sm text-ink" role="alert">
          <strong className="label block text-berry">Storage problem</strong>
          <span className="mt-1 block">{store.storageError.message}</span>
        </p>
      )}

      {store.discardedNotice && (
        <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 bg-gold p-4">
          <p className="text-sm text-ink">{store.discardedNotice}</p>
          <Button size="sm" variant="secondary" onClick={store.dismissDiscardedNotice}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="mt-8">
        <Choice
          label="Craft"
          value={filter}
          options={FILTERS}
          onChange={setFilter}
        />
      </div>

      <div className="mt-6">
        {!store.loaded ? (
          <p className="label text-ink-faint">Loading…</p>
        ) : projects.length === 0 ? (
          <EmptyState
            title={filter === "all" ? "Nothing here yet" : "Nothing in this craft yet"}
            description="Start in the Pattern Studio to have a pattern drafted from your measurements, or open the Chart Editor to draw one by hand."
            action={
              <div className="mt-1 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/generate">Pattern Studio</ButtonLink>
                <ButtonLink href="/chart-editor" variant="secondary">Chart Editor</ButtonLink>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const { done, total } = projectProgress(project);
              const firstChart = project.charts[0];
              return (
                <li key={project.id} className="panel flex flex-col">
                  <div className="flex items-start gap-3 border-b-[3px] border-ink p-4">
                    <GarmentIcon
                      type={project.garmentType}
                      active
                      className="h-12 w-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="label text-ink">{project.name}</h2>
                      <p className="mt-1 text-sm text-ink-soft">
                        {project.garmentType} · {project.size}
                      </p>
                    </div>
                    <Tag tone={CRAFT_TONE[project.craftType]}>
                      {CRAFT_LABELS[project.craftType]}
                    </Tag>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <Meter
                      value={done}
                      max={Math.max(1, total)}
                      label={`${project.charts.length} chart${project.charts.length === 1 ? "" : "s"}`}
                    />

                    <div className="mt-auto flex flex-wrap gap-2">
                      {firstChart && (
                        <ButtonLink
                          href={`/chart/${project.id}?chart=${firstChart.id}`}
                          size="sm"
                        >
                          Open tracker
                        </ButtonLink>
                      )}
                      <ButtonLink
                        href={`/pattern/${project.id}`}
                        size="sm"
                        variant="secondary"
                      >
                        Pattern
                      </ButtonLink>
                      <Button
                        size="sm"
                        variant={confirming === project.id ? "danger" : "quiet"}
                        onClick={() => {
                          if (confirming === project.id) {
                            store.removeProject(project.id);
                            setConfirming(null);
                          } else {
                            setConfirming(project.id);
                          }
                        }}
                        onBlur={() => setConfirming((id) => (id === project.id ? null : id))}
                      >
                        {confirming === project.id ? "Really delete?" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className={cn("mt-10 text-sm text-ink-faint")}>
        <Link href="/learn" className="underline underline-offset-4 hover:text-berry">
          Stuck on a stitch? The library explains every one.
        </Link>
      </p>
    </div>
  );
}
