"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { Panel } from "@/components/ui/Panel";
import { CRAFT_LABELS, type Project } from "@/types";

export default function PatternPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const store = useStore();
  const project = store.getProject(id);

  if (!store.loaded) {
    return <p className="label mx-auto max-w-6xl px-4 py-12 text-ink-faint">Loading…</p>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title="Project not found"
          description="It may have been deleted, or saved in a different browser."
          action={<ButtonLink href="/saved">Back to library</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow={`${CRAFT_LABELS[project.craftType]} pattern`}
        title={project.name}
        description={`${project.garmentType} · size ${project.size} · ${project.difficulty}`}
        action={
          project.charts[0] ? (
            <ButtonLink href={`/chart/${project.id}?chart=${project.charts[0].id}`}>
              Open tracker
            </ButtonLink>
          ) : undefined
        }
      />

      {project.pattern ? (
        <PatternBody project={project} />
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No written pattern yet"
            description="This project has charts but no written instructions. Charts always carry their own row-by-row instructions — open the tracker to read them."
            action={
              project.charts[0] ? (
                <ButtonLink
                  href={`/chart/${project.id}?chart=${project.charts[0].id}`}
                  variant="secondary"
                >
                  Read from the chart
                </ButtonLink>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

function PatternBody({ project }: { project: Project }) {
  const pattern = project.pattern;
  const measurements = useMemo(
    () => Object.entries(pattern?.measurements ?? {}),
    [pattern]
  );
  if (!pattern) return null;

  return (
    <div className="mt-8 space-y-6">
      <Panel title="Gauge" accent="cobalt">
        <p className="text-sm text-ink">
          <strong>{pattern.gauge.stitchesPer10cm} stitches</strong> and{" "}
          <strong>{pattern.gauge.rowsPer10cm} rows</strong> to 10&nbsp;cm
          {pattern.gauge.measuredOver ? ` over ${pattern.gauge.measuredOver}` : ""}.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Work a swatch and block it before you start. Gauge measured unblocked
          is a guess, and every number below is derived from this one.
        </p>
      </Panel>

      {measurements.length > 0 && (
        <Panel title="Finished measurements" accent="grape">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {measurements.map(([name, cm]) => (
              <div key={name} className="flex items-baseline justify-between gap-3 border-b-[3px] border-ink/10 pb-1.5">
                <dt className="text-sm capitalize text-ink-soft">{name}</dt>
                <dd className="label text-ink">
                  {cm} cm <span className="text-ink-faint">({(cm / 2.54).toFixed(1)} in)</span>
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {pattern.materials.yarns.length > 0 && (
        <Panel title="Yarn" accent="berry">
          <ul className="space-y-2.5">
            {pattern.materials.yarns.map((requirement, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Tag tone="gold">{requirement.role}</Tag>
                <span className="text-sm text-ink">
                  {requirement.yarn.name ?? "Any yarn"}
                  {requirement.yarn.brand ? ` (${requirement.yarn.brand})` : ""}
                </span>
                <span className="label ml-auto text-ink-soft">
                  {Math.round(requirement.metres)} m · {requirement.balls} ball
                  {requirement.balls === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {pattern.materials.needles.length > 0 && (
        <Panel title="Needles & hooks" accent="teal">
          <ul className="space-y-1.5">
            {pattern.materials.needles.map((needle, i) => (
              <li key={i} className="text-sm text-ink">
                <strong>{needle.mm} mm</strong> {needle.kind}
                {needle.use ? ` — ${needle.use}` : ""}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {pattern.abbreviations.length > 0 && (
        <Panel title="Abbreviations" accent="fern">
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {pattern.abbreviations.map((abbreviation) => (
              <div key={abbreviation.abbr} className="flex gap-2">
                <dt className="label shrink-0 text-ink">{abbreviation.abbr}</dt>
                <dd className="text-sm text-ink-soft">{abbreviation.meaning}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {pattern.sections.map((section) => (
        <Panel key={section.name} title={section.name} accent="gold">
          {section.description && (
            <p className="mb-3 text-sm text-ink-soft">{section.description}</p>
          )}
          <ol className="space-y-2">
            {section.instructions.map((instruction, i) => (
              <li key={i} className="border-[3px] border-ink bg-panel p-3 text-sm text-ink">
                {instruction.text}
              </li>
            ))}
          </ol>
        </Panel>
      ))}

      {pattern.notes && (
        <Panel title="Notes" accent="blush">
          <p className="text-sm text-ink">{pattern.notes}</p>
        </Panel>
      )}

      <p className="text-sm text-ink-faint">
        <Link href="/saved" className="underline underline-offset-4 hover:text-berry">
          ← Back to library
        </Link>
      </p>
    </div>
  );
}
