import { ART_CELL, symbolArtRects, type StitchSymbol } from "@/lib/chart";

const INK: Record<string, string> = {
  ink: "var(--color-ink)",
  accent: "var(--color-berry)",
  shade: "var(--color-ink-faint)",
};

/**
 * One stitch symbol drawn on its own — for palettes, legends and lesson cards.
 * Shares the exact artwork ChartView uses, so a symbol never looks like one
 * thing in the palette and another on the chart.
 */
export default function SymbolGlyph({
  symbol,
  size = 22,
  className,
}: {
  symbol: StitchSymbol;
  size?: number;
  className?: string;
}) {
  const cols = symbol.art.cols;
  const rows = symbol.art.rows;
  const rects = symbolArtRects(symbol.art);
  // A wide symbol (a cable) keeps its aspect ratio rather than being squashed.
  const width = (size * cols) / ART_CELL;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${cols} ${rows}`}
      width={width}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={symbol.name}
    >
      <title>{symbol.name}</title>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={INK[r.ink] ?? INK.ink}
        />
      ))}
    </svg>
  );
}
