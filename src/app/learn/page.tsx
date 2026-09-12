"use client";

import { useMemo, useState } from "react";
import {
  CRAFT_LABEL,
  DIFFICULTY_LABELS,
  LEARN_CRAFTS,
  countsByCraft,
  isWritten,
  lessonsForCraft,
  photoForLesson,
  searchLessons,
  type LearnCraft,
  type LearnEntry,
} from "@/lib/learn/content";
import { learnDiagram } from "@/lib/learn/diagrams";
import { creditLine, diagramFor } from "@/lib/diagrams";
import { Choice } from "@/components/ui/Field";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** A lesson's drawing. Diagrams come from two sets depending on its origin. */
function diagramSvg(lesson: LearnEntry): string | null {
  if (lesson.diagram.source === "learn") return learnDiagram(lesson.diagram.id) ?? null;
  return diagramFor(lesson.diagram.id).svg || null;
}

export default function LearnPage() {
  const [craft, setCraft] = useState<LearnCraft>("knitting");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => countsByCraft(), []);
  const lessons = useMemo(
    () => searchLessons(lessonsForCraft(craft), query),
    [craft, query]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="Stitch library"
        title="Learn the stitches"
        description="Photographs of the real fabric, drawings of the hand movement, and the mistakes a first attempt actually makes."
      />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Choice
          label="Craft"
          value={craft}
          options={LEARN_CRAFTS.map((c) => ({
            value: c,
            label: `${CRAFT_LABEL[c]} (${counts[c]})`,
          }))}
          onChange={(next) => {
            setCraft(next);
            setOpen(null);
          }}
        />
        <div className="sm:w-72">
          <label htmlFor="learn-search" className="label mb-1.5 block text-ink-soft">
            Search
          </label>
          <input
            id="learn-search"
            type="search"
            className="field"
            placeholder="ssk, cable, Aida…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing matches that"
            description={`No ${CRAFT_LABEL[craft].toLowerCase()} lesson mentions “${query}”.`}
            action={<Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
          />
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={`${lesson.craft}-${lesson.id}`}
              lesson={lesson}
              open={open === lesson.id}
              onToggle={() => setOpen((id) => (id === lesson.id ? null : lesson.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LessonCard({
  lesson,
  open,
  onToggle,
}: {
  lesson: LearnEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const photo = photoForLesson(lesson);
  const svg = diagramSvg(lesson);

  return (
    <li className={cn("panel flex flex-col", open && "sm:col-span-2 lg:col-span-3")}>
      {/*
        The whole card is the control — clicking anywhere opens it. It is a
        <button> so it is reachable by keyboard and announces its state, and
        the expanded body sits outside it because a button may not contain
        interactive children like the source links.
      */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex flex-1 flex-col text-left"
      >
        {photo ? (
          // A photograph of the real fabric. `.media` clips it, never the card.
          <span className="media block h-44 border-b-[3px] border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.depicts}
              loading="lazy"
              className="transition-transform duration-200 group-hover:scale-[1.04]"
            />
          </span>
        ) : svg ? (
          <span
            className="diagram-tile block h-44 border-b-[3px] border-ink bg-panel-sunk p-3 text-ink"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}

        <span className="flex flex-1 flex-col gap-2.5 p-4">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="label text-ink">{lesson.name}</span>
            <span className="flex shrink-0 gap-1.5">
              {lesson.abbreviation && <Tag tone="gold">{lesson.abbreviation}</Tag>}
              <Tag tone="neutral">{DIFFICULTY_LABELS[lesson.difficulty]}</Tag>
            </span>
          </span>

          <span className="block text-sm text-ink-soft">{lesson.summary}</span>

          <span className="label mt-auto pt-1 text-berry">
            {open ? "Close ▲" : "Read more ▼"}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t-[3px] border-ink p-4">
          {svg && photo && (
            <div className="diagram-tile h-44 border-[3px] border-ink bg-panel-sunk p-3 text-ink"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}

          {lesson.appearance && (
            <Section title="What it looks like">{lesson.appearance}</Section>
          )}
          {lesson.useFor && <Section title="Use it for">{lesson.useFor}</Section>}

          {lesson.steps.length > 0 && (
            <div>
              <h4 className="label mb-2 text-ink-faint">How to work it</h4>
              <ol className="space-y-2">
                {lesson.steps.map((step) => (
                  <li key={step.n} className="flex gap-3">
                    <span className="label grid h-6 w-6 shrink-0 place-items-center border-[3px] border-ink bg-gold text-ink">
                      {step.n}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm text-ink">{step.text}</span>
                      {step.note && (
                        <span className="mt-1 block text-tiny text-ink-faint">{step.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {lesson.pitfalls && lesson.pitfalls.length > 0 && (
            <div>
              <h4 className="label mb-2 text-berry">What goes wrong</h4>
              <ul className="space-y-1.5">
                {lesson.pitfalls.map((pitfall) => (
                  <li key={pitfall} className="border-l-[3px] border-berry pl-3 text-sm text-ink-soft">
                    {pitfall}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lesson.tags.map((tag) => (
                <Tag key={tag} tone="neutral">{tag}</Tag>
              ))}
            </div>
          )}

          {photo && (
            <p className="text-tiny text-ink-faint">
              Photo:{" "}
              <a
                href={photo.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-berry"
              >
                {creditLine(photo)}
              </a>
            </p>
          )}

          {lesson.sources.length > 0 && (
            <p className="text-tiny text-ink-faint">
              Checked against:{" "}
              {lesson.sources.map((source, i) => (
                <span key={source}>
                  {i > 0 && ", "}
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-berry"
                  >
                    {new URL(source).hostname.replace(/^www\./, "")}
                  </a>
                </span>
              ))}
            </p>
          )}

          {!isWritten(lesson) && (
            <p className="text-tiny text-ink-faint">
              This one is a reference card; the full written lesson is still to come.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="label mb-1 text-ink-faint">{title}</h4>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}
