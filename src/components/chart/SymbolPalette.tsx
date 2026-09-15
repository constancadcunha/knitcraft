"use client";

import { useMemo, useState } from "react";
import {
  symbolsForCraft,
  type ChartCraft,
  type StitchSymbol,
  type SymbolCategory,
} from "@/lib/chart";
import { cn } from "@/lib/cn";

/**
 * The stitch picker for the chart editor.
 *
 * Grouped by category rather than listed flat: a knitter looking for a cable
 * should not have to scan past twelve crochet stitches. This is the control
 * that makes cables, lace and texture reachable at all — the old editor could
 * only set a colour.
 */

const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  basic: "Basics",
  texture: "Texture",
  increase: "Increases",
  decrease: "Decreases",
  cable: "Cables",
  "crochet-basic": "Basics",
  "crochet-compound": "Clusters & shells",
  special: "Special",
};

export default function SymbolPalette({
  craft,
  value,
  onChange,
  className,
}: {
  craft: ChartCraft;
  value: string | undefined;
  onChange: (symbolId: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const all = symbolsForCraft(craft);
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? all.filter(
          (s) =>
            s.name.toLowerCase().includes(needle) ||
            s.abbreviation.toLowerCase().includes(needle) ||
            s.id.toLowerCase().includes(needle)
        )
      : all;

    const byCategory = new Map<SymbolCategory, StitchSymbol[]>();
    for (const symbol of matching) {
      const list = byCategory.get(symbol.category) ?? [];
      list.push(symbol);
      byCategory.set(symbol.category, list);
    }
    return [...byCategory.entries()];
  }, [craft, query]);

  return (
    <div className={cn("space-y-3", className)}>
      <input
        type="search"
        className="field"
        placeholder="Search stitches…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search stitches"
      />

      {groups.length === 0 && (
        <p className="px-1 py-3 text-sm text-ink-soft">
          No stitch matches “{query}”.
        </p>
      )}

      {groups.map(([category, symbols]) => (
        <section key={category}>
          <h3 className="label mb-1.5 text-ink-faint">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {symbols.map((symbol) => {
              const active = symbol.id === value;
              return (
                <button
                  key={symbol.id}
                  type="button"
                  onClick={() => onChange(symbol.id)}
                  aria-pressed={active}
                  title={`${symbol.abbreviation} — ${symbol.name}`}
                  className={cn(
                    "flex min-h-11 items-center justify-center border-[3px] border-ink px-2 py-1.5 transition-transform",
                    active
                      ? "bg-cobalt shadow-pop-sm"
                      : "bg-panel hover:-translate-y-0.5 hover:bg-gold hover:shadow-pop-sm"
                  )}
                >
                  <span className={active ? "text-panel" : "text-ink"}>
                    {symbol.abbreviation} {symbol.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
