"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  groupRows,
  sectionIndexForRow,
  type InstructionSection,
  type RowBook,
} from "./instructionSections";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Bits";
import { cn } from "@/lib/cn";

/**
 * Written instructions with actual navigation.
 *
 * The rule this exists to enforce: a reader should never be handed more rows at
 * once than they can hold their place in. The rows arrive already broken into
 * phases (see `instructionSections.ts`); this shows ONE of them at a time and
 * gives four ways to move — the section list, previous/next, a jump-to-row box,
 * and a one-tap return to the row being worked.
 *
 * "You are here" is shown three times over, deliberately: on the section chip,
 * on the row itself, and in the footer count. Losing your place in a pattern is
 * the most expensive thing that can happen at the needles.
 */

export interface InstructionBrowserProps {
  book: RowBook;
  /** The row being worked, 1-based. Drives every "you are here" marker. */
  activeRow?: number | null;
  /** Has this row been worked? Renders the tick beside it. */
  isRowWorked?: (rowNumber: number) => boolean;
  /** Tick a row off. Omit and no checkboxes are drawn. */
  onToggleRow?: (rowNumber: number) => void;
  /** Move the tracker to a row. Omit and rows are read-only. */
  onGotoRow?: (rowNumber: number) => void;
  /** Longest block of rows under one heading. */
  blockSize?: number;
  /** Tailwind max-height for the row list, when it must sit in a column. */
  listHeightClass?: string;
  className?: string;
}

export default function InstructionBrowser({
  book,
  activeRow = null,
  isRowWorked,
  onToggleRow,
  onGotoRow,
  blockSize,
  listHeightClass,
  className,
}: InstructionBrowserProps) {
  const domId = useId();
  const sections = useMemo(
    () => groupRows(book.rows, blockSize ? { blockSize } : {}),
    [book.rows, blockSize]
  );

  // Which section the reader has pinned. Null means "follow the row I am
  // working" — derived rather than synced in an effect, which the React
  // Compiler rules forbid and which would fight the reader for control.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const [jump, setJump] = useState("");

  const activeIndex = sectionIndexForRow(sections, activeRow);
  const pinnedIndex = pinnedId ? sections.findIndex((s) => s.id === pinnedId) : -1;
  const selectedIndex =
    pinnedIndex >= 0 ? pinnedIndex : activeIndex >= 0 ? activeIndex : 0;
  const selected: InstructionSection | undefined = sections[selectedIndex];

  const listRef = useRef<HTMLOListElement>(null);

  // Bring the row you are on (or jumped to) into view inside the list.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target = list.querySelector<HTMLElement>("[data-focus='true']");
    if (!target) return;
    const top = target.offsetTop - list.clientHeight / 2 + target.offsetHeight / 2;
    if (list.scrollHeight > list.clientHeight) list.scrollTo({ top: Math.max(0, top) });
  }, [selectedIndex, activeRow, focusRow]);

  if (!selected) {
    return (
      <p className={cn("text-sm text-ink-soft", className)}>
        There are no written rows for this piece yet.
      </p>
    );
  }

  const select = (index: number) => {
    const section = sections[index];
    if (!section) return;
    setPinnedId(section.id);
    setFocusRow(null);
  };

  const submitJump = () => {
    const wanted = Number(jump);
    if (!Number.isFinite(wanted)) return;
    const index = sectionIndexForRow(sections, wanted);
    if (index < 0) return;
    setPinnedId(sections[index].id);
    setFocusRow(wanted);
    setJump("");
  };

  const firstRow = sections[0].fromRow;
  const lastRow = sections[sections.length - 1].toRow;
  const followingActive = pinnedIndex < 0 && activeIndex >= 0;

  return (
    <div className={cn("space-y-4", className)}>
      {book.castOnText && (
        <p className="border-[3px] border-ink bg-panel-sunk p-3 text-sm text-ink">
          <span className="label block text-ink-soft">Before row 1</span>
          {book.castOnText}
        </p>
      )}

      {/* 1. The section list. */}
      <nav aria-label="Sections of this piece">
        <ul className="flex gap-2 overflow-x-auto p-1">
          {sections.map((section, index) => {
            const isSelected = index === selectedIndex;
            const holdsActive = index === activeIndex;
            return (
              <li key={section.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "press flex min-h-11 flex-col items-start gap-0.5 px-3 py-2 text-left",
                    isSelected ? "bg-ink text-panel" : "bg-panel text-ink hover:bg-gold"
                  )}
                >
                  <span className="label flex items-center gap-1.5">
                    {holdsActive && (
                      <span
                        className={cn(
                          "inline-block h-2 w-2",
                          isSelected ? "bg-gold" : "bg-berry"
                        )}
                        aria-hidden
                      />
                    )}
                    {section.title}
                  </span>
                  <span
                    className={cn(
                      "label",
                      isSelected ? "text-panel opacity-80" : "text-ink-faint"
                    )}
                  >
                    {section.rangeLabel}
                  </span>
                  {holdsActive && <span className="sr-only">contains the row you are on</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 2. Previous / next, 3. jump to a row, 4. back to where you are. */}
      <div className="flex flex-wrap items-center gap-2 border-y-[3px] border-ink/15 py-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => select(selectedIndex - 1)}
          disabled={selectedIndex === 0}
        >
          ◀ Prev
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => select(selectedIndex + 1)}
          disabled={selectedIndex >= sections.length - 1}
        >
          Next ▶
        </Button>

        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitJump();
          }}
        >
          <label className="label text-ink-soft" htmlFor={`${domId}-jump`}>
            Go to row
          </label>
          <input
            id={`${domId}-jump`}
            className="field h-11 w-20 px-2 py-1 text-center tabular-nums"
            inputMode="numeric"
            type="number"
            min={firstRow}
            max={lastRow}
            placeholder={`${firstRow}–${lastRow}`}
            value={jump}
            onChange={(event) => setJump(event.target.value)}
          />
          <Button size="sm" variant="gold" type="submit" disabled={jump.trim() === ""}>
            Go
          </Button>
        </form>
      </div>

      {activeRow !== null && !followingActive && activeIndex >= 0 && (
        <Button size="sm" variant="primary" onClick={() => { setPinnedId(null); setFocusRow(null); }}>
          Back to row {activeRow}
        </Button>
      )}

      {/* The section itself. */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-ui text-lg uppercase leading-tight">{selected.title}</h3>
          <p className="label text-ink-soft">
            {selected.rangeLabel} · {selected.detail}
          </p>
        </div>

        <ol
          ref={listRef}
          className={cn("mt-3 space-y-2 p-1", listHeightClass && `overflow-y-auto ${listHeightClass}`)}
        >
          {selected.rows.map((row) => {
            const isActive = row.rowNumber === activeRow;
            const isFocus = row.rowNumber === focusRow;
            const worked = isRowWorked?.(row.rowNumber) ?? false;
            return (
              <li key={row.rowNumber}>
                <div
                  data-focus={isActive || isFocus ? "true" : undefined}
                  className={cn(
                    "flex items-start gap-3 border-[3px] p-3",
                    isActive
                      ? "border-ink bg-gold shadow-pop-sm"
                      : isFocus
                        ? "border-cobalt bg-panel"
                        : worked
                          ? "stripe border-ink/30 bg-panel-sunk"
                          : "border-ink bg-panel"
                  )}
                >
                  {onToggleRow && (
                    <input
                      type="checkbox"
                      className="check mt-1"
                      checked={worked}
                      onChange={() => onToggleRow(row.rowNumber)}
                      aria-label={`Mark ${row.label} worked`}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="label flex flex-wrap items-center gap-2 text-ink-soft">
                      {row.label}
                      {isActive && <Tag tone="berry">You are here</Tag>}
                    </p>
                    {onGotoRow ? (
                      <button
                        type="button"
                        onClick={() => onGotoRow(row.rowNumber)}
                        className="mt-1 block w-full text-left text-sm leading-relaxed text-ink hover:underline"
                        aria-label={`Work from ${row.label}`}
                      >
                        {row.body}
                      </button>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-ink">{row.body}</p>
                    )}
                  </div>

                  {row.stitchesAfter !== null && (
                    <span className="label shrink-0 pt-0.5 text-ink-faint tabular-nums">
                      {row.stitchesAfter} sts
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-3 text-tiny text-ink-faint">
          Section {selectedIndex + 1} of {sections.length} · rows {selected.fromRow}–
          {selected.toRow} of {lastRow}
          {onGotoRow ? " · tap an instruction to work from that row" : ""}
        </p>
      </div>
    </div>
  );
}
