"use client";

import { useMemo, useState } from "react";
import {
  CRAFT_LABEL,
  LEARN_CRAFTS,
  countsByCraft,
  lessonsForCraft,
  searchLessons,
  type Lesson,
  type LearnCraft,
} from "@/lib/learn/content";
import { learnDiagram } from "@/lib/learn/diagrams";
import { diagramFor } from "@/lib/diagrams";
import { Choice } from "@/components/ui/Field";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Resolve a lesson's artwork. Stitches and topics come from different sets. */
function diagramSvg(lesson: Lesson): string | null {
  if (lesson.kind === "topic") return learnDiagram(lesson.id) ?? null;
  const resolved = diagramFor(lesson.id);
  return resolved.svg || null;
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

  const stitches = lessons.filter((l) => l.kind === "stitch");
  const topics = lessons.filter((l) => l.kind === "topic");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Heading
        eyebrow="Stitch library"
        title="Learn the stitches"
        description="Every stitch and technique drawn by hand, so the picture always matches the words."
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
        <EmptyState
          title="Nothing matches that"
          description={`No ${CRAFT_LABEL[craft].toLowerCase()} lesson mentions “${query}”.`}
          action={<Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <>
          {stitches.length > 0 && (
            <Section title="Stitches" count={stitches.length}>
              {stitches.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  open={open === lesson.id}
                  onToggle={() => setOpen((id) => (id === lesson.id ? null : lesson.id))}
                />
              ))}
            </Section>
          )}

          {topics.length > 0 && (
            <Section title="Techniques & reference" count={topics.length}>
              {topics.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  open={open === lesson.id}
                  onToggle={() => setOpen((id) => (id === lesson.id ? null : lesson.id))}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="label mb-4 text-ink-faint">
        {title} · {count}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>
    </section>
  );
}

function LessonCard({
  lesson,
  open,
  onToggle,
}: {
  lesson: Lesson;
  open: boolean;
  onToggle: () => void;
}) {
  const svg = diagramSvg(lesson);

  return (
    <li className={cn("panel flex flex-col", open && "sm:col-span-2 lg:col-span-3")}>
      {/* The artwork is clipped by .media, never by the card itself — clipping
          the card cuts its shadow and crops the drawing on hover. */}
      {svg && (
        <div
          className="diagram-tile h-44 border-b-[3px] border-ink bg-panel-sunk p-3 text-ink"
          // Diagrams are our own generated SVG strings, not user input.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="label text-ink">{lesson.name}</h3>
          {lesson.kind === "stitch" && <Tag tone="gold">{lesson.abbreviation}</Tag>}
        </div>

        {lesson.kind === "stitch" ? (
          <>
            <p className="text-sm text-ink-soft">{lesson.appearance}</p>
            {open && (
              <div className="mt-1 space-y-3 border-t-[3px] border-ink pt-3">
                <div>
                  <h4 className="label text-ink-faint">Use it for</h4>
                  <p className="mt-1 text-sm text-ink-soft">{lesson.useFor}</p>
                </div>
                <div>
                  <h4 className="label text-ink-faint">How to work it</h4>
                  <p className="mt-1 text-sm text-ink">{lesson.tutorial}</p>
                </div>
                <a
                  className="label inline-block text-cobalt underline underline-offset-4"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.videoQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find a video →
                </a>
              </div>
            )}
          </>
        ) : (
          <ul className={cn("space-y-1.5", !open && "line-clamp-3")}>
            {(open ? lesson.points : lesson.points.slice(0, 2)).map((point, i) => (
              <li key={i} className="text-sm text-ink-soft">
                {point}
              </li>
            ))}
          </ul>
        )}

        <Button
          size="sm"
          variant={open ? "secondary" : "quiet"}
          className="mt-auto self-start"
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? "Close" : "Read more"}
        </Button>
      </div>
    </li>
  );
}
