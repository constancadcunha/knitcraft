"use client";

import type { CrossStitchChart, StitchKind } from "@/lib/crossstitch";
import { cn } from "@/lib/cn";

/**
 * Renders a cross-stitch chart.
 *
 * Conventions that matter to a stitcher and that the drawing has to honour:
 *  - read top-down, left to right, always: rows[0] is the TOP row
 *  - bold rule every TEN squares (knitting charts use five; cross stitch uses
 *    ten, and stitchers count by those blocks)
 *  - a symbol in every stitched cell, so the chart survives being printed in
 *    black and white and is usable by colour-blind stitchers
 *  - backstitch and knots sit on the HOLE grid — the lines between cells — so
 *    they are drawn in a separate layer on top, not inside cells
 */

export interface CrossStitchViewProps {
  chart: CrossStitchChart;
  cellSize?: number;
  showSymbols?: boolean;
  showGrid?: boolean;
  completed?: Record<string, boolean>;
  onCellClick?: (x: number, y: number) => void;
  className?: string;
}

/** Part stitches occupy a triangle or corner of the square. */
function partStitchPath(kind: StitchKind, x: number, y: number, s: number): string | null {
  switch (kind) {
    case "half":
      return `M${x} ${y + s}L${x + s} ${y}L${x + s} ${y + s}z`;
    case "quarter":
      return `M${x} ${y}L${x + s / 2} ${y}L${x + s / 2} ${y + s / 2}L${x} ${y + s / 2}z`;
    case "three-quarter":
      return `M${x} ${y}L${x + s} ${y}L${x + s} ${y + s}L${x + s / 2} ${y + s}L${x} ${y + s / 2}z`;
    default:
      return null;
  }
}

export default function CrossStitchView({
  chart,
  cellSize = 16,
  showSymbols = true,
  showGrid = true,
  completed,
  onCellClick,
  className,
}: CrossStitchViewProps) {
  const w = chart.width * cellSize;
  const h = chart.height * cellSize;

  return (
    <svg
      className={cn("max-w-full", className)}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${chart.name}: ${chart.width} by ${chart.height} cross stitch chart`}
    >
      {chart.rows.map((row, y) =>
        row.map((cell, x) => {
          if (cell.colour === null) return null;
          const floss = chart.palette[cell.colour];
          if (!floss) return null;

          const px = x * cellSize;
          const py = y * cellSize;
          const kind = cell.kind ?? "full";
          const part = partStitchPath(kind, px, py, cellSize);
          const done = completed?.[`${y},${x}`];

          return (
            <g
              key={`${y}-${x}`}
              opacity={done ? 0.35 : 1}
              onClick={onCellClick ? () => onCellClick(x, y) : undefined}
              style={onCellClick ? { cursor: "pointer" } : undefined}
            >
              {part ? (
                <path d={part} fill={floss.hex} />
              ) : (
                <rect x={px} y={py} width={cellSize} height={cellSize} fill={floss.hex} />
              )}
              {showSymbols && cellSize >= 12 && (
                <text
                  x={px + cellSize / 2}
                  y={py + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellSize * 0.62}
                  fontFamily="var(--font-ui)"
                  // Dark floss needs a light symbol and vice versa.
                  fill={isDark(floss.hex) ? "#ffffff" : "#1f1b2e"}
                  pointerEvents="none"
                >
                  {floss.symbol}
                </text>
              )}
            </g>
          );
        })
      )}

      {showGrid && (
        <g pointerEvents="none">
          {Array.from({ length: chart.width + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * cellSize}
              y1={0}
              x2={i * cellSize}
              y2={h}
              stroke="var(--color-ink)"
              // Bold every ten — the blocks stitchers count by.
              strokeOpacity={i % 10 === 0 ? 0.55 : 0.18}
              strokeWidth={i % 10 === 0 ? 1.5 : 1}
            />
          ))}
          {Array.from({ length: chart.height + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * cellSize}
              x2={w}
              y2={i * cellSize}
              stroke="var(--color-ink)"
              strokeOpacity={i % 10 === 0 ? 0.55 : 0.18}
              strokeWidth={i % 10 === 0 ? 1.5 : 1}
            />
          ))}
        </g>
      )}

      {/* Backstitch and knots ride on the hole grid, above every cell. */}
      <g shapeRendering="geometricPrecision" pointerEvents="none">
        {chart.backstitch.map((line, i) => {
          const floss = chart.palette[line.colour];
          if (!floss) return null;
          return (
            <line
              key={`bs${i}`}
              x1={line.from.x * cellSize}
              y1={line.from.y * cellSize}
              x2={line.to.x * cellSize}
              y2={line.to.y * cellSize}
              stroke={floss.hex}
              strokeWidth={Math.max(2, cellSize * 0.14)}
              strokeLinecap="round"
            />
          );
        })}
        {chart.frenchKnots.map((knot, i) => {
          const floss = chart.palette[knot.colour];
          if (!floss) return null;
          return (
            <circle
              key={`fk${i}`}
              cx={knot.at.x * cellSize}
              cy={knot.at.y * cellSize}
              r={Math.max(2.5, cellSize * 0.2)}
              fill={floss.hex}
              stroke="var(--color-ink)"
              strokeWidth={1}
            />
          );
        })}
      </g>

      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={3}
        pointerEvents="none"
      />
    </svg>
  );
}

/** Relative luminance, to decide whether a symbol should be light or dark. */
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = Number.parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.45;
}
