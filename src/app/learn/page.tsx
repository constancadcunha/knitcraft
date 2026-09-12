"use client";

import { useMemo, useState } from "react";
import {
  CRAFT_LABEL,
  DIFFICULTY_LABELS,
  LEARN_CRAFTS,
  countsByCraft,
  lessonsForCraft,
  photoForLesson,
  searchLessons,
  type LearnCraft,
  type LearnEntry,
} from "@/lib/learn/content";
import { artworkFor, thumbnailFor } from "@/lib/learn/artworkFor";
import { Choice } from "@/components/ui/Field";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import LessonDialog from "@/components/LessonDialog";


export default function LearnPage() {
  const [craft, setCraft] = useState<LearnCraft>("knitting");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => countsByCraft(), []);
  const lessons = useMemo(
    () => searchLessons(lessonsForCraft(craft), query),
    [craft, query]
  );

  const openLesson = useMemo(
    () => lessons.find((l) => l.id === open) ?? null,
    [lessons, open]
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
              onOpen={() => setOpen(lesson.id)}
            />
          ))}
        </ul>
      )}

      <LessonDialog
        lesson={openLesson}
        photo={openLesson ? photoForLesson(openLesson) : undefined}
        artwork={openLesson ? artworkFor(openLesson) : null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function LessonCard({
  lesson,
  onOpen,
}: {
  lesson: LearnEntry;
  onOpen: () => void;
}) {
  const photo = photoForLesson(lesson);
  const svg = thumbnailFor(lesson);

  return (
    <li className="panel lift flex flex-col">
      {/* The whole tile is the control: a real button, so it is reachable by
          keyboard and announces that it opens a dialog. */}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="group flex flex-1 flex-col text-left"
      >
        {photo ? (
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
        ) : (
          <span className="dither block h-44 border-b-[3px] border-ink" aria-hidden />
        )}

        <span className="flex flex-1 flex-col gap-2.5 p-4">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <span className="label text-ink">{lesson.name}</span>
            <span className="flex shrink-0 gap-1.5">
              {lesson.abbreviation && <Tag tone="gold">{lesson.abbreviation}</Tag>}
              <Tag tone="neutral">{DIFFICULTY_LABELS[lesson.difficulty]}</Tag>
            </span>
          </span>

          <span className="block text-sm text-ink-soft">{lesson.summary}</span>

          <span className="label mt-auto pt-1 text-berry">Open lesson →</span>
        </span>
      </button>
    </li>
  );
}

