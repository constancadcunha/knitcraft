"use client";

import type {
  CellCorner,
  CrossStitchChart,
  CrossStitchStitchKind,
} from "@/types";
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

/**
 * Part stitches occupy a triangle or a corner of the square, and WHICH corner
 * is part of the design — a three-quarter stitch pointing the wrong way makes
 * a curve read as a staircase.
 */
function partStitchPath(
  kind: CrossStitchStitchKind,
  corner: CellCorner | undefined,
  x: number,
  y: number,
  s: number
): string | null {
  const h = s / 2;
  const c: CellCorner = corner ?? "tl";

  if (kind === "half") {
    // A half stitch is one diagonal of the square, filled as a triangle. Which
    // way it leans follows the corner it is anchored to.
    return c === "tr" || c === "bl"
      ? `M${x} ${y}L${x + s} ${y + s}L${x} ${y + s}z`
      : `M${x} ${y + s}L${x + s} ${y}L${x + s} ${y + s}z`;
  }

  if (kind === "quarter") {
    const qx = c === "tr" || c === "br" ? x + h : x;
    const qy = c === "bl" || c === "br" ? y + h : y;
    return `M${qx} ${qy}h${h}v${h}h-${h}z`;
  }

  if (kind === "three-quarter") {
    // The full square minus the quarter opposite the anchored corner.
    const cut: Record<CellCorner, string> = {
      tl: `M${x} ${y}L${x + s} ${y}L${x + s} ${y + h}L${x + h} ${y + h}L${x + h} ${y + s}L${x} ${y + s}z`,
      tr: `M${x} ${y}L${x + s} ${y}L${x + s} ${y + s}L${x + h} ${y + s}L${x + h} ${y + h}L${x} ${y + h}z`,
      bl: `M${x} ${y}L${x + h} ${y}L${x + h} ${y + h}L${x + s} ${y + h}L${x + s} ${y + s}L${x} ${y + s}z`,
      br: `M${x + h} ${y}L${x + s} ${y}L${x + s} ${y + s}L${x} ${y + s}L${x} ${y + h}L${x + h} ${y + h}z`,
    };
    return cut[c];
  }

  return null;
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
          if (cell.colorIndex === undefined) return null;
          const floss = chart.palette[cell.colorIndex];
          if (!floss) return null;

          const px = x * cellSize;
          const py = y * cellSize;
          const kind = cell.stitch ?? "full";
          const part = partStitchPath(kind, cell.corner, px, py, cellSize);
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
        {chart.backstitch.map((line) => {
          const floss = chart.palette[line.colorIndex];
          if (!floss) return null;
          return (
            <line
              key={line.id}
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
        {chart.frenchKnots.map((knot) => {
          const floss = chart.palette[knot.colorIndex];
          if (!floss) return null;
          return (
            <circle
              key={knot.id}
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
