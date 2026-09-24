"use client";

import { sourcedDiagram } from "@/lib/learn/media";
import { useEffect, useRef } from "react";
import { creditLine, type PhotoCredit } from "@/lib/diagrams";
import { DIFFICULTY_LABELS, type LearnEntry } from "@/lib/learn/types";
import type { LessonArtwork } from "@/lib/learn/artworkFor";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Bits";
import { lessonById } from "@/lib/learn/content";

/**
 * A lesson opened as a dialog rather than expanded in place.
 *
 * Uses the native <dialog> element: it gives a focus trap, Escape to close and
 * inert background for free, which a hand-rolled overlay has to reimplement
 * and usually gets wrong.
 */
export default function LessonDialog({
  lesson,
  photo,
  artwork,
  onClose,
  onSelectLesson,
}: {
  lesson: LearnEntry | null;
  photo?: PhotoCredit;
  artwork: LessonArtwork | null;
  onClose: () => void;
  onSelectLesson?: (lesson: LearnEntry) => void;
}) {
  const external = lesson ? sourcedDiagram(lesson) : null;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (lesson && !node.open) node.showModal();
    if (!lesson && node.open) node.close();
  }, [lesson]);

  const videoQuery = lesson
    ? `how to ${lesson.name} ${lesson.craft === "crocheting" ? "crochet" : lesson.craft === "cross-stitch" ? "cross stitch" : "knitting"}`
    : "";
  const prerequisites = lesson?.prerequisites.map(lessonById).filter((item): item is LearnEntry => !!item) ?? [];
  const related = lesson?.related.map(lessonById).filter((item): item is LearnEntry => !!item) ?? [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop closes it. The dialog's own box stops the event,
      // so only a click outside the content reaches here.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(46rem,92vw)] border-[3px] border-ink bg-panel p-0 text-ink shadow-pop-lg backdrop:bg-ink/60"
    >
      {lesson && (
        <div className="max-h-[85vh] overflow-y-auto">
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-[3px] border-ink bg-gold px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-ui text-lg uppercase leading-tight text-ink">
                {lesson.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {lesson.abbreviation && <Tag tone="neutral">{lesson.abbreviation}</Tag>}
                <Tag tone="neutral">{DIFFICULTY_LABELS[lesson.difficulty]}</Tag>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={onClose} autoFocus>
              Close
            </Button>
          </header>

          <div className="space-y-5 p-5">
            <p className="text-base text-ink">{lesson.summary}</p>

            {prerequisites.length > 0 && (
              <div className="border-[3px] border-ink bg-panel-sunk p-3">
                <h3 className="label text-ink-faint">Helpful first</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {prerequisites.map((item) => (
                    <button key={item.id} type="button" className="press bg-panel px-3 py-2 text-sm text-ink hover:bg-gold" onClick={() => onSelectLesson?.(item)}>
                      {item.name} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lesson.terminology && (
              <div className="border-[3px] border-rust bg-panel p-4">
                <h3 className="label text-rust">US / UK terminology</h3>
                <p className="mt-2 text-sm text-ink"><strong>US:</strong> {lesson.terminology.us} · <strong>UK:</strong> {lesson.terminology.uk}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{lesson.terminology.consequence}</p>
              </div>
            )}

            {photo && (
              <figure>
                <div className="media h-56 border-[3px] border-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.depicts} />
                </div>
                <figcaption className="mt-1.5 text-tiny text-ink-faint">
                  <a
                    href={photo.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-berry"
                  >
                    {creditLine(photo)}
                  </a>
                </figcaption>
              </figure>
            )}

            {external && <figure><h3 className="label mb-2">Reference diagram</h3>{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={external.url} alt={`${lesson.name} diagram`} className="w-full max-h-80 object-contain bg-white" /><figcaption className="text-xs mt-2"><a className="underline" href={external.source} target="_blank" rel="noreferrer">{external.credit}</a> · <a className="underline" href={external.licence}>Licence</a></figcaption></figure>}
            {!external && artwork?.svg && (
              <figure>
                <h3 className="label mb-2 text-ink-faint">How the stitch is formed</h3>
                <div
                  className="diagram-tile h-56 border-[3px] border-ink bg-panel-sunk p-3"
                  dangerouslySetInnerHTML={{ __html: artwork.svg }}
                />
              </figure>
            )}

            {!external && artwork?.steps && artwork.steps.length > 0 && (
              <div>
                <h3 className="label mb-2 text-ink-faint">Step by step</h3>
                <ol className="grid gap-3 sm:grid-cols-2">
                  {artwork.steps.map((step) => (
                    <li key={step.n} className="border-[3px] border-ink bg-panel-sunk">
                      <div
                        className="diagram-tile h-40 p-3"
                        dangerouslySetInnerHTML={{ __html: step.svg }}
                      />
                      <p className="border-t-[3px] border-ink bg-panel p-3 text-sm text-ink">
                        <span className="label mr-1.5 text-ink-faint">{step.n}</span>
                        {step.caption}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {lesson.appearance && (
              <div>
                <h3 className="label mb-1 text-ink-faint">What it looks like</h3>
                <p className="text-sm text-ink">{lesson.appearance}</p>
              </div>
            )}

            {lesson.useFor && (
              <div>
                <h3 className="label mb-1 text-ink-faint">Use it for</h3>
                <p className="text-sm text-ink">{lesson.useFor}</p>
              </div>
            )}

            {lesson.fabric && (
              <div>
                <h3 className="label mb-2 text-ink-faint">Fabric behaviour</h3>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {lesson.fabric.multiple && <Fact label="Multiple" value={lesson.fabric.multiple} />}
                  {lesson.fabric.rowRepeat && <Fact label="Row repeat" value={String(lesson.fabric.rowRepeat)} />}
                  {lesson.fabric.stretch && <Fact label="Stretch" value={lesson.fabric.stretch} />}
                  {lesson.fabric.reversible !== undefined && <Fact label="Reversible" value={lesson.fabric.reversible ? "Yes" : "No"} />}
                  {lesson.fabric.curls !== undefined && <Fact label="Curls" value={lesson.fabric.curls ? "Yes — add a border" : "No"} />}
                </dl>
              </div>
            )}

            {lesson.table && (
              <div>
                <h3 className="label mb-2 text-ink-faint">{lesson.table.caption}</h3>
                <div className="overflow-x-auto border-[3px] border-ink">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-gold"><tr>{lesson.table.columns.map((column) => <th key={column} className="border-b-[3px] border-ink px-3 py-2 label">{column}</th>)}</tr></thead>
                    <tbody>{lesson.table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-ink/20 last:border-0">{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-tiny text-ink-faint">Source: {lesson.table.source}</p>
              </div>
            )}

            {lesson.steps.length > 0 && (
              <div>
                <h3 className="label mb-2 text-ink-faint">How to work it</h3>
                <ol className="space-y-2.5">
                  {lesson.steps.map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="label grid h-7 w-7 shrink-0 place-items-center border-[3px] border-ink bg-gold text-ink">
                        {step.n}
                      </span>
                      <span className="min-w-0 pt-1">
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
                <h3 className="label mb-2 text-berry">What goes wrong</h3>
                <ul className="space-y-1.5">
                  {lesson.pitfalls.map((pitfall) => (
                    <li
                      key={pitfall}
                      className="border-l-[3px] border-berry pl-3 text-sm text-ink-soft"
                    >
                      {pitfall}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t-[3px] border-ink pt-4">
              <a
                className="press bg-berry px-4 py-2.5 text-panel"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch a tutorial →
              </a>
              {lesson.sources.length > 0 && (
                <a
                  className="press bg-panel px-4 py-2.5 text-ink"
                  href={lesson.sources[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the source →
                </a>
              )}
            </div>

            {lesson.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lesson.tags.map((tag) => (
                  <Tag key={tag} tone="neutral">{tag}</Tag>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <div className="border-t-[3px] border-ink pt-4">
                <h3 className="label mb-2 text-ink-faint">Learn next</h3>
                <div className="flex flex-wrap gap-2">
                  {related.map((item) => (
                    <button key={item.id} type="button" className="press bg-panel px-3 py-2 text-sm text-ink hover:bg-gold" onClick={() => onSelectLesson?.(item)}>
                      {item.name} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[3px] border-ink bg-panel-sunk p-3">
      <dt className="label text-ink-faint">{label}</dt>
      <dd className="mt-1 capitalize text-sm text-ink">{value}</dd>
    </div>
  );
}
