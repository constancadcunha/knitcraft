"use client";

import { useMemo } from "react";
import { chartToInstructions, type SymbolChart } from "@/lib/chart";
import { cn } from "@/lib/cn";

/**
 * Written row-by-row instructions derived from the chart, with the running
 * stitch count on every row.
 *
 * The running count is the point: it is how a knitter catches a mistake two
 * rows after making it rather than at the shoulder. The old app had none.
 */
export default function InstructionList({
  chart,
  completedRows,
  activeRow,
  onToggleRow,
  className,
}: {
  chart: SymbolChart;
  /** 1-based row numbers already worked. */
  completedRows?: Record<number, boolean>;
  activeRow?: number;
  onToggleRow?: (rowNumber: number) => void;
  className?: string;
}) {
  const instructions = useMemo(() => chartToInstructions(chart), [chart]);

  return (
    <div className={cn("space-y-3", className)}>
      <p className="border-[3px] border-ink bg-panel-sunk p-3 text-sm text-ink">
        {instructions.castOnText}
      </p>

      <ol className="space-y-1.5">
        {/* Written instructions read top-down from row 1, the reverse of how
            the chart is drawn. */}
        {[...instructions.rows].reverse().map((row) => {
          const done = completedRows?.[row.rowNumber];
          const active = activeRow === row.rowNumber;
          const interactive = Boolean(onToggleRow);

          return (
            <li key={row.rowNumber}>
              <div
                className={cn(
                  "flex items-start gap-3 border-[3px] p-3 transition-colors",
                  active
                    ? "border-ink bg-gold"
                    : done
                      ? "border-ink/30 bg-panel-sunk"
                      : "border-ink bg-panel"
                )}
              >
                {interactive && (
                  <input
                    type="checkbox"
                    className="check mt-0.5"
                    checked={Boolean(done)}
                    onChange={() => onToggleRow?.(row.rowNumber)}
                    aria-label={`Mark ${row.label} worked`}
                  />
                )}
                <span className={cn("min-w-0 flex-1", done && "text-ink-faint line-through")}>
                  <span className="label block text-ink-soft">{row.label}</span>
                  <span className="mt-1 block text-sm text-ink">{row.body}</span>
                </span>
                <span className="label shrink-0 pt-0.5 text-ink-faint">
                  {row.stitchesAfter} sts
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
