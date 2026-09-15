"use client";

import { use, useMemo, useState } from "react";
import MaterialsChecklist from "@/components/MaterialsChecklist";
import ProjectComments from "@/components/ProjectComments";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, Heading, Loading, SectionHeading, Tag } from "@/components/ui/Bits";
import { Panel } from "@/components/ui/Panel";
import InstructionBrowser from "@/components/tracker/InstructionBrowser";
import { rowsFromWrittenInstructions } from "@/components/tracker/instructionSections";
import { CRAFT_LABELS, type ChartProgress, type PatternSection, type Project } from "@/types";
import { cn } from "@/lib/cn";

export default function PatternPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const store = useStore();
  const project = store.getProject(id);

  if (!store.loaded) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Loading>Opening the pattern</Loading>
      </div>
    );
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
            <ButtonLink href={`/chart/${project.id}?chart=${project.charts[0].id}`} size="lg">
              Open tracker
            </ButtonLink>
          ) : undefined
        }
      />

      {project.pattern && <div className="panel mt-6 p-5"><h2 className="label mb-4">What you’ll need</h2><MaterialsChecklist scope={project.id} items={[
        ...project.pattern.materials.yarns.map((y, i) => ({ id: i === 0 ? "yarn" : `yarn-${i}`, label: y.yarn.name ?? "Yarn", detail: `${y.metres} m · ${y.balls} balls` })),
        { id: "tool", label: project.craftType === "cross-stitch" ? "Embroidery needle" : project.craftType === "knitting" ? "Knitting needles" : "Crochet hook" },
        { id: "notion-0", label: "Tapestry needle" }, { id: "notion-1", label: "Scissors" },
      ]} /></div>}
      <div className="mt-6"><ProjectComments projectId={project.id} /></div>
      {project.pattern ? (
        <PatternBody project={project} />
      ) : (
        <div className="mt-9">
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
    <div className="mt-9">
      <SectionHeading>Before you cast on</SectionHeading>
      <div className="space-y-5">
        <Panel title="Gauge" accent="cobalt" headingAs="h3">
          <p className="text-base text-ink">
            <strong>{pattern.gauge.stitchesPer10cm} stitches</strong> and{" "}
            <strong>{pattern.gauge.rowsPer10cm} rows</strong> to 10&nbsp;cm
            {pattern.gauge.measuredOver ? ` over ${pattern.gauge.measuredOver}` : ""}.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Work a swatch and block it before you start. Gauge measured unblocked
            is a guess, and every number below is derived from this one.
          </p>
        </Panel>

        {measurements.length > 0 && (
          <Panel title="Finished measurements" accent="grape" headingAs="h3">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              {measurements.map(([name, cm]) => (
                <div
                  key={name}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink/10 py-2.5"
                >
                  <dt className="text-sm capitalize text-ink-soft">{name}</dt>
                  <dd className="label text-ink">
                    {cm} cm{" "}
                    <span className="text-ink-faint">({(cm / 2.54).toFixed(1)} in)</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}

        {pattern.materials.yarns.length > 0 && (
          <Panel title="Yarn" accent="berry" headingAs="h3">
            <ul className="space-y-3">
              {pattern.materials.yarns.map((requirement, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-[3px] border-ink bg-panel p-3"
                >
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
          <Panel title="Needles & hooks" accent="teal" headingAs="h3">
            <ul className="space-y-2.5">
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
          <Panel title="Abbreviations" accent="fern" headingAs="h3">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {pattern.abbreviations.map((abbreviation) => (
                <div key={abbreviation.abbr} className="flex gap-3">
                  <dt className="label shrink-0 pt-0.5 text-ink">{abbreviation.abbr}</dt>
                  <dd className="text-sm text-ink-soft">{abbreviation.meaning}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
      </div>

      {pattern.sections.length > 0 && (
        <>
          <SectionHeading
            className="mt-12"
            count={`${pattern.sections.length} piece${pattern.sections.length === 1 ? "" : "s"}`}
          >
            Making it
          </SectionHeading>
          <PieceReader project={project} sections={pattern.sections} />
        </>
      )}

      {pattern.notes && (
        <>
          <SectionHeading className="mt-12">Notes</SectionHeading>
          <Panel title="From the designer" accent="blush" headingAs="h3">
            <p className="text-sm leading-relaxed text-ink">{pattern.notes}</p>
          </Panel>
        </>
      )}

      <p className="mt-10 text-sm text-ink-soft">
        <Link
          href="/saved"
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-berry"
        >
          ← Back to library
        </Link>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Making it — one piece at a time                                             */
/* -------------------------------------------------------------------------- */

/**
 * The instructions, navigable at two levels.
 *
 * A garment is pieces and a piece is phases, and a reader needs to move between
 * both. Printing every row of every piece in one column — which is what this
 * page used to do — is 700 lines of prose with no way back to your place. So:
 * pick the piece here, and the browser inside breaks that piece into hem, body,
 * shaping and edging with its own previous/next and jump-to-row.
 */
function PieceReader({
  project,
  sections,
}: {
  project: Project;
  sections: PatternSection[];
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const index = Math.min(openIndex, sections.length - 1);
  const section = sections[index];

  const book = useMemo(
    () => rowsFromWrittenInstructions(section.instructions),
    [section]
  );

  // Where the maker actually is in this piece, if they have started it. The
  // written pattern and the tracker are the same rows, so the page can say
  // "you are here" without the reader having to hold it in their head. Stored
  // row indices are 0-based; printed row numbers are not.
  const tracked = section.chartId ? project.progress.charts[section.chartId] : undefined;
  const activeRow = tracked && hasStarted(tracked) ? tracked.cursor.rowIndex + 1 : null;

  return (
    <div className="space-y-5">
      <nav aria-label="Pieces">
        <ul className="flex flex-wrap gap-2">
          {sections.map((piece, i) => {
            const current = i === index;
            const started = hasStarted(
              piece.chartId ? project.progress.charts[piece.chartId] : undefined
            );
            return (
              <li key={piece.name}>
                <Button
                  size="sm"
                  variant={current ? "primary" : "secondary"}
                  aria-current={current ? "true" : undefined}
                  onClick={() => setOpenIndex(i)}
                >
                  {started && (
                    <span
                      className={cn("h-2 w-2", current ? "bg-panel" : "bg-fern")}
                      aria-hidden
                    />
                  )}
                  {piece.name}
                  <span className="opacity-70">
                    {Math.max(0, piece.instructions.length - 1)} rows
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Panel
        title={section.name}
        accent="gold"
        headingAs="h3"
        bodyClassName="p-4 sm:p-5"
        action={
          section.chartId ? (
            <ButtonLink
              href={`/chart/${project.id}?chart=${section.chartId}`}
              size="sm"
              variant="secondary"
            >
              Track this piece
            </ButtonLink>
          ) : undefined
        }
      >
        {section.description && (
          <p className="mb-4 text-sm text-ink-soft">{section.description}</p>
        )}
        <InstructionBrowser book={book} activeRow={activeRow} />
      </Panel>
    </div>
  );
}

/** Has any work been done on this piece? A fresh tracker sits on row 1 untouched. */
function hasStarted(progress: ChartProgress | undefined): boolean {
  if (!progress) return false;
  return progress.cursor.rowIndex > 0 || Object.keys(progress.rowStitches).length > 0;
}
