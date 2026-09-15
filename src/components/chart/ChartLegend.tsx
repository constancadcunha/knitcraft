import { buildLegend, type SymbolChart } from "@/lib/chart";
import SymbolGlyph from "@/components/chart/SymbolGlyph";
import { cn } from "@/lib/cn";

/**
 * The legend, derived from what the chart actually uses — never a fixed list.
 * A chart with no cables shows no cable symbols.
 */
export default function ChartLegend({
  chart,
  className,
}: {
  chart: SymbolChart;
  className?: string;
}) {
  const legend = buildLegend(chart);

  if (!legend.symbols.length && !legend.colors.length) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {legend.symbols.length > 0 && (
        <section>
          <h3 className="label mb-2.5 text-ink-faint">Stitch key</h3>
          <ul className="space-y-2">
            {legend.symbols.map((entry) => (
              <li key={entry.symbolId} className="flex items-start gap-3">
                <span className="flex h-7 w-9 shrink-0 items-center justify-center border-[3px] border-ink bg-panel">
                  {entry.symbol && <SymbolGlyph symbol={entry.symbol} size={16} />}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="label block text-ink">
                    {entry.abbreviation} — {entry.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {entry.description}
                  </span>
                </span>
                <span className="label shrink-0 pt-1 text-ink-faint">
                  ×{entry.usageCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {legend.colors.length > 1 && (
        <section>
          <h3 className="label mb-2.5 text-ink-faint">Yarn colours</h3>
          <ul className="flex flex-wrap gap-2">
            {legend.colors.map((entry) => (
              <li
                key={entry.colorIndex}
                className="flex items-center gap-2 border-[3px] border-ink bg-panel py-1.5 pl-1.5 pr-3"
              >
                <span
                  className="h-5 w-5 shrink-0 border-2 border-ink"
                  style={{ backgroundColor: entry.color ?? "transparent" }}
                  aria-hidden
                />
                <span className="label text-ink">{entry.label}</span>
                <span className="label text-ink-faint">×{entry.usageCount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
