"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { useAccount, updateProfile } from "@/lib/account";
import { COURSES, LESSON_CHECKS } from "@/lib/learn/courses";
import { cardPhoto } from "@/lib/learn/media";
import { artworkFor } from "@/lib/learn/artworkFor";
import { Choice } from "@/components/ui/Field";
import { EmptyState, Heading, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import LessonDialog from "@/components/LessonDialog";


export default function LearnPage() { return <Suspense fallback={<p className="p-8">Loading lessons…</p>}><LearnContent /></Suspense>; }

function LearnContent() {
  const params = useSearchParams();
  const linkedId = params.get("lesson");
  const linkedCraft = LEARN_CRAFTS.find(c => lessonsForCraft(c).some(l => l.id === linkedId));
  const account = useAccount();
  const [category, setCategory] = useState("all");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [practice, setPractice] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [craft, setCraft] = useState<LearnCraft>(linkedCraft ?? "knitting");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(linkedId);

  const counts = useMemo(() => countsByCraft(), []);
  const lessons = useMemo(
    () => searchLessons(lessonsForCraft(craft), query).filter(l => (category === "all" || l.kind === category) && (!favouritesOnly || account.profile.favourites.includes(l.id))),
    [craft, query, category, favouritesOnly, account.profile.favourites]
  );

  const openLesson = useMemo(
    () => lessonsForCraft(craft).find((l) => l.id === open) ?? null,
    [craft, open]
  );

  const course = COURSES.find(c => c.craft === craft)!;
  const courseLessons = course.lessons.map(id => lessonsForCraft(craft).find(l => l.id === id)).filter(l => !!l);
  const check = openLesson ? LESSON_CHECKS[openLesson.id] : undefined;
  const toggleFavourite = (id: string) => updateProfile({ favourites: account.profile.favourites.includes(id) ? account.profile.favourites.filter(v => v !== id) : [...account.profile.favourites, id] });

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

      <section className="panel mt-7 p-5 space-y-4">
        <h2 className="font-ui text-lg">{course.name}</h2><p>Learn a skill, practise with your yarn, then check your understanding. Each completed lesson earns 10 practice XP.</p>
        <ol className="flex flex-wrap gap-3">{courseLessons.map((lesson, i) => {
          const complete = account.profile.completedLessons.includes(lesson.id);
          const locked = i > 0 && !account.profile.completedLessons.includes(courseLessons[i - 1].id);
          return <li key={lesson.id}><Button variant={complete ? "secondary" : "primary"} disabled={locked || !account.loaded} onClick={() => { setOpen(lesson.id); setPractice(true); setDialogOpen(true); setAnswer(null); }}>{complete ? "✓ " : `${i + 1}. `}{lesson.name}{locked ? " · locked" : ""}</Button></li>;
        })}</ol>
        {practice && openLesson && check && <div className="border-t-2 border-ink/20 pt-4 space-y-3"><p>After practising {openLesson.name.toLowerCase()}, check your understanding:</p><p className="font-medium">{check.practice}</p><p>{check.question}</p><div className="flex flex-wrap gap-2">{check.answers.map((a,i) => <Button key={a} variant="secondary" onClick={() => setAnswer(i)}>{a}</Button>)}</div>{answer !== null && answer !== check.correct && <p role="status">Try again — review the lesson and practise the movement.</p>}{answer === check.correct && <Button onClick={() => { updateProfile({ completedLessons: [...new Set([...account.profile.completedLessons, openLesson.id])] }); setPractice(false); setOpen(null); }}>I practised this lesson · complete</Button>}</div>}
      </section>
      <div className="mt-7 space-y-4"><Choice label="Browse lessons" value={category} onChange={setCategory} options={[{ value: "all", label: "Everything" }, { value: "technique", label: "How-tos" }, { value: "stitch", label: "Stitches" }, { value: "reference", label: "Tools & reference" }, { value: "concept", label: "Foundations" }]} /><label className="flex items-center gap-3"><input type="checkbox" className="check" checked={favouritesOnly} onChange={e => setFavouritesOnly(e.target.checked)} />Favourite lessons only</label></div>
      {account.error && <p role="alert">{account.error}</p>}
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
              favourite={account.profile.favourites.includes(lesson.id)}
              onFavourite={() => toggleFavourite(lesson.id)}
              ready={account.loaded}
              onOpen={() => { setOpen(lesson.id); setPractice(false); setDialogOpen(true); }}
            />
          ))}
        </ul>
      )}

      <LessonDialog
        lesson={dialogOpen ? openLesson : null}
        photo={openLesson ? photoForLesson(openLesson) : undefined}
        artwork={openLesson ? artworkFor(openLesson) : null}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

function LessonCard({
  lesson,
  onOpen,
  favourite, onFavourite, ready,
}: {
  lesson: LearnEntry;
  onOpen: () => void;
  favourite: boolean; onFavourite: () => void; ready: boolean;
}) {
  const { photo, contextual } = cardPhoto(lesson);

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
        ) : null}
        <span className="px-4 pt-2 text-xs text-ink-faint">{contextual ? "Craft example · " : ""}{photo.depicts}</span>

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
      <p className="px-4 pb-2 text-xs"><a className="underline" href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.author}</a> · <a className="underline" href={photo.licenceUrl}>{photo.licence}</a></p>
      <div className="px-4 pb-4"><Button disabled={!ready} variant="secondary" aria-pressed={favourite} onClick={onFavourite}>{favourite ? "★ Saved lesson" : "☆ Favourite lesson"}</Button></div>
    </li>
  );
}

