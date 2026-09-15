"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  NO_STITCH_ID,
  rowGroupsInReadingOrder,
  rowSide,
  workedForm,
  type CellGroup,
  type SymbolChart,
} from "@/lib/chart";
import SymbolGlyph from "@/components/chart/SymbolGlyph";
import { cn } from "@/lib/cn";

/**
 * The row being worked, drawn stitch by stitch.
 *
 * This is the thing a knitter actually looks at, so it shows every fact about a
 * stitch at once and at a size that reads from arm's length: the yarn COLOUR it
 * is worked in, the SYMBOL for what it is, and the ABBREVIATION printed
 * underneath ("K", "P", "TR", "DC") — because a symbol alone is a puzzle and an
 * abbreviation alone is a colourless list.
 *
 * Two things it has to get right, both of which the plain row list got wrong:
 *
 *  1. DIRECTION. A right-side row is worked from the RIGHT, a wrong-side row
 *     from the LEFT. The strip is laid out in chart-column order so it matches
 *     the chart and the fabric above it, and the arrow, the "start" flag and the
 *     filling-in of worked stitches all run in the direction the row is worked.
 *
 *  2. RS/WS MEANING. A chart symbol describes the right-side appearance, so on a
 *     wrong-side row the knit symbol is worked "p". `workedForm` supplies the
 *     abbreviation for the side actually being worked, never the raw one.
 */

export interface RowCloseUpProps {
  chart: SymbolChart;
  /** 0-based row of the chart being worked. */
  rowIndex: number;
  /** Stitches of this row already worked, in reading order. */
  stitchesDone: number;
  /** Tap a stitch to say "I am here". Receives the count of stitches before it. */
  onSelectStitch?: (stitchesBefore: number) => void;
  className?: string;
}

interface Tile {
  group: CellGroup;
  /** Position in the order the row is worked, or null for a no-stitch. */
  order: number | null;
  abbr: string;
  instruction: string;
}

export default function RowCloseUp({
  chart,
  rowIndex,
  stitchesDone,
  onSelectStitch,
  className,
}: RowCloseUpProps) {
  const side = rowSide(chart, rowIndex);
  const inRound = chart.worked === "round";

  const { tiles, worked } = useMemo(() => {
    // Reading order first, because that is what the stitch count is measured
    // in — the tracker's stitch 7 is the 7th stitch WORKED, not the 7th column.
    const reading = rowGroupsInReadingOrder(chart, rowIndex);
    let counted = 0;
    const inOrder: Tile[] = reading.map((group) => {
      // A no-stitch is a hole in a shaped piece: never worked, never counted.
      const isStitch = group.symbolId !== NO_STITCH_ID;
      const form = group.symbol ? workedForm(group.symbol, side) : null;
      return {
        group,
        order: isStitch ? counted++ : null,
        abbr: form?.abbr ?? "?",
        instruction: form?.instruction ?? group.symbolId,
      };
    });
    // Laid out as the chart draws it: column order, left to right.
    return {
      tiles: side === "RS" ? [...inOrder].reverse() : inOrder,
      worked: counted,
    };
  }, [chart, rowIndex, side]);

  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the stitch being worked in view as the count advances. Scrolling the
  // strip is a DOM read/write, not state, so the compiler rules hold — and
  // scrollLeft is set directly rather than through scrollIntoView, which would
  // drag the whole page around under the knitter.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const current = strip.querySelector<HTMLElement>("[data-current='true']");
    if (!current) return;
    strip.scrollTo({
      left: Math.max(0, current.offsetLeft - strip.clientWidth / 2 + current.offsetWidth / 2),
      behavior: "smooth",
    });
  }, [stitchesDone, rowIndex]);

  const nextTile = tiles.find((tile) => tile.order === stitchesDone);
  const done = Math.min(stitchesDone, worked);

  if (worked === 0) {
    return (
      <p className={cn("text-sm text-ink-soft", className)}>
        This row has no worked stitches — it is all no-stitch, so move on to the
        next one.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="label text-ink-soft">
          {inRound ? "Worked in the round" : side === "RS" ? "Right side" : "Wrong side"}
          {" · "}
          {side === "RS" ? "read right to left" : "read left to right"}
        </p>
        <p className="label text-ink-faint">
          {done} of {worked} worked
        </p>
      </div>

      {/* The direction of travel, drawn the way the row runs. */}
      <div
        className={cn(
          "mt-2.5 flex items-center gap-2",
          side === "RS" ? "flex-row-reverse" : "flex-row"
        )}
      >
        <span className="tag bg-ink text-panel">Start</span>
        <span className="stripe h-[3px] flex-1" aria-hidden />
        <span className="label text-ink-faint">{side === "RS" ? "◀" : "▶"}</span>
      </div>

      <div
        ref={stripRef}
        className="mt-3 overflow-x-auto pb-2"
        role="group"
        aria-label={`Stitches of this row, ${side === "RS" ? "read right to left" : "read left to right"}`}
      >
        <ol className="flex w-max items-end gap-1.5 px-1 pt-7">
          {tiles.map((tile) => (
            <StitchTile
              key={tile.group.anchorCol}
              tile={tile}
              chart={chart}
              stitchesDone={stitchesDone}
              onSelectStitch={onSelectStitch}
            />
          ))}
        </ol>
      </div>

      <p className="mt-1 border-[3px] border-ink bg-panel-sunk p-3 text-sm text-ink">
        {nextTile ? (
          <>
            <span className="label text-ink-soft">Next stitch</span>{" "}
            <strong className="text-base">{nextTile.abbr.toUpperCase()}</strong> —{" "}
            {nextTile.instruction}
            {" · "}
            stitch {done + 1} of {worked}
          </>
        ) : (
          <>
            <span className="label text-ink-soft">Row complete</span> — all {worked}{" "}
            stitches worked. Turn the work and carry on.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * One stitch: colour block, symbol, abbreviation.
 *
 * A cable covers several columns and is ONE thing the knitter does, so it is
 * drawn one tile wide per column it covers and captioned once.
 */
function StitchTile({
  tile,
  chart,
  stitchesDone,
  onSelectStitch,
}: {
  tile: Tile;
  chart: SymbolChart;
  stitchesDone: number;
  onSelectStitch?: (stitchesBefore: number) => void;
}) {
  const { group, order, abbr } = tile;
  const noStitch = order === null;
  const isDone = order !== null && order < stitchesDone;
  const isCurrent = order === stitchesDone;
  // Palette colours are chart DATA, not theme: a chart drawn in three yarns has
  // to show those three yarns.
  const colour = chart.colors[group.colorIndex] ?? chart.colors[0] ?? "transparent";
  const width = 2.75 * group.width;

  const label = noStitch
    ? "No stitch — skip"
    : `Stitch ${order + 1}, ${abbr}${isDone ? ", worked" : isCurrent ? ", working now" : ""}`;

  const tile_ = (
    <>
      <span
        className={cn(
          "flex items-center justify-center border-[3px] border-ink",
          noStitch && "dither bg-panel-sunk",
          isCurrent && "shadow-pop-sm"
        )}
        style={{
          width: `${width}rem`,
          height: "2.75rem",
          background: noStitch ? undefined : colour,
        }}
      >
        {group.symbol && !noStitch && <SymbolGlyph symbol={group.symbol} size={26} />}
      </span>
      <span
        className={cn(
          "label mt-1.5 block text-center",
          isCurrent ? "text-ink" : isDone ? "text-ink-faint" : "text-ink-soft"
        )}
      >
        {noStitch ? "—" : abbr.toUpperCase()}
      </span>
      <span className="label mt-0.5 block text-center text-ink-faint">
        {order !== null && (isCurrent || (order + 1) % 5 === 0) ? order + 1 : " "}
      </span>
    </>
  );

  return (
    <li
      className={cn("relative shrink-0", isDone && "opacity-40")}
      data-current={isCurrent ? "true" : undefined}
      aria-current={isCurrent ? "step" : undefined}
    >
      {isCurrent && (
        <span className="tag pop-in absolute -top-7 left-1/2 -translate-x-1/2 bg-gold text-ink">
          Now
        </span>
      )}
      {onSelectStitch && !noStitch ? (
        <button
          type="button"
          onClick={() => onSelectStitch(order)}
          className={cn(
            "block cursor-pointer p-1",
            isCurrent && "bg-gold"
          )}
          aria-label={`${label}. Tap to count from here.`}
        >
          {tile_}
        </button>
      ) : (
        <span className={cn("block p-1", isCurrent && "bg-gold")}>
          {tile_}
          <span className="sr-only">{label}</span>
        </span>
      )}
    </li>
  );
}
