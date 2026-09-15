"use client";

import { useId, useMemo } from "react";
import {
  ART_CELL,
  NO_STITCH_ID,
  rowGroups,
  rowNumber,
  rowSide,
  symbolArtRects,
  type CellGroup,
  type SymbolChart,
} from "@/lib/chart";
import { cn } from "@/lib/cn";

/**
 * Renders a chart as one SVG.
 *
 * Why SVG rather than canvas: the symbol artwork is already pixel-grid data, it
 * stays crisp at any zoom, it prints, it can be exported, and individual cells
 * can carry accessibility information. `shape-rendering="crispEdges"` keeps the
 * pixel art from being antialiased into mush.
 *
 * Row 1 is at the BOTTOM, as on real chart paper, so rows[0] draws last.
 * Row numbers sit on the side the row is read FROM — right for RS rows, left
 * for WS rows — which is how a knitter knows which way to work.
 */

export interface ChartViewProps {
  chart: SymbolChart;
  /** Cell size in px. */
  cellSize?: number;
  /** "row,col" keys that are already worked; drawn knocked back. */
  completed?: Record<string, boolean>;
  /** 1-based row number to highlight as the row being worked. */
  activeRow?: number;
  showRowNumbers?: boolean;
  showGrid?: boolean;
  onCellClick?: (row: number, col: number) => void;
  className?: string;
  title?: string;
}

const GUTTER = 22;

export default function ChartView({
  chart,
  cellSize = 18,
  completed,
  activeRow,
  showRowNumbers = true,
  showGrid = true,
  onCellClick,
  className,
  title,
}: ChartViewProps) {
  // Resolving groups per row is the expensive part, and it only depends on the
  // chart itself — not on progress or the active row.
  const groupsByRow = useMemo(
    () => chart.rows.map((_, rowIndex) => rowGroups(chart, rowIndex)),
    [chart]
  );

  const shapeClip = useId();
  const gutter = showRowNumbers ? GUTTER : 0;
  const boardW = chart.width * cellSize;
  const boardH = chart.height * cellSize;
  const svgW = boardW + gutter * 2;
  const svgH = boardH;
  const scale = cellSize / ART_CELL;

  return (
    <svg
      className={cn("max-w-full", className)}
      viewBox={`0 0 ${svgW} ${svgH}`}
      width={svgW}
      height={svgH}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? `${chart.name}: ${chart.width} by ${chart.height} chart`}
    >
      {chart.rows.map((row, rowIndex) => {
        // rows[0] is row 1 and belongs at the BOTTOM of the drawing.
        const y = (chart.height - 1 - rowIndex) * cellSize;
        const side = rowSide(chart, rowIndex);
        const number = rowNumber(rowIndex);
        const isActive = activeRow === number;
        // A row is read from the right on RS, from the left on WS.
        const numberX = side === "RS" ? boardW + gutter + gutter / 2 : gutter / 2;

        return (
          <g key={rowIndex}>
            {isActive && (
              <rect
                x={gutter}
                y={y}
                width={boardW}
                height={cellSize}
                fill="var(--color-gold)"
                opacity="0.28"
              />
            )}

            {groupsByRow[rowIndex].map((group) => (
              <Group
                key={group.anchorCol}
                group={group}
                chart={chart}
                rowIndex={rowIndex}
                x={gutter + group.anchorCol * cellSize}
                y={y}
                cellSize={cellSize}
                scale={scale}
                completed={completed}
                onCellClick={onCellClick}
              />
            ))}

            {showRowNumbers && (
              <text
                x={numberX}
                y={y + cellSize / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(8, cellSize * 0.5)}
                fontFamily="var(--font-ui)"
                fill={isActive ? "var(--color-ink)" : "var(--color-ink-faint)"}
              >
                {number}
              </text>
            )}
          </g>
        );
      })}

      {showGrid && (
        <g pointerEvents="none" clipPath={`url(#${shapeClip})`}>
          {Array.from({ length: chart.width + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={gutter + i * cellSize}
              y1={0}
              x2={gutter + i * cellSize}
              y2={boardH}
              stroke="var(--color-ink)"
              strokeOpacity={i % 5 === 0 ? 0.42 : 0.16}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: chart.height + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={gutter}
              y1={i * cellSize}
              x2={gutter + boardW}
              y2={i * cellSize}
              stroke="var(--color-ink)"
              // Every 5th line darker, like the bold rules on chart paper.
              strokeOpacity={(chart.height - i) % 5 === 0 ? 0.42 : 0.16}
              strokeWidth={1}
            />
          ))}
          <rect
            x={gutter}
            y={0}
            width={boardW}
            height={boardH}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={3}
          />
        </g>
      )}

      {chart.repeats.map((box) => {
        const x = gutter + box.startCol * cellSize;
        const w = (box.endCol - box.startCol + 1) * cellSize;
        const yTop = (chart.height - 1 - box.endRow) * cellSize;
        const h = (box.endRow - box.startRow + 1) * cellSize;
        return (
          <rect
            key={box.id}
            x={x}
            y={yTop}
            width={w}
            height={h}
            fill="none"
            stroke="var(--color-berry)"
            strokeWidth={3}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        );
      })}
    </svg>
  );
}

/**
 * One symbol group: the colour block plus the symbol artwork drawn across all
 * the cells it covers. A 2/2 cable is drawn ONCE, four cells wide — never as
 * four separate half-cables.
 */
function Group({
  group,
  chart,
  rowIndex,
  x,
  y,
  cellSize,
  scale,
  completed,
  onCellClick,
}: {
  group: CellGroup;
  chart: SymbolChart;
  rowIndex: number;
  x: number;
  y: number;
  cellSize: number;
  scale: number;
  completed?: Record<string, boolean>;
  onCellClick?: (row: number, col: number) => void;
}) {
  const width = group.width * cellSize;
  const isNoStitch = group.symbolId === NO_STITCH_ID;
  const done = completed?.[`${rowIndex},${group.anchorCol}`];
  const colour = chart.colors[group.colorIndex] ?? chart.colors[0] ?? "transparent";

  const rects = group.symbol && !isNoStitch && cellSize >= 8 ? symbolArtRects(group.symbol.art) : [];
  const INK: Record<string, string> = {
    ink: "var(--color-ink)",
    accent: "var(--color-berry)",
    shade: "var(--color-ink-faint)",
  };

  return (
    <g
      opacity={done ? 0.55 : 1}
      onClick={onCellClick ? () => onCellClick(rowIndex, group.anchorCol) : undefined}
      style={onCellClick ? { cursor: "pointer" } : undefined}
    >
      <rect x={x} y={y} width={width} height={cellSize} fill={isNoStitch ? "transparent" : colour} />
      {done && !isNoStitch && <path d={`M${x + cellSize * .18} ${y + cellSize * .5} l${cellSize * .22} ${cellSize * .22} l${cellSize * .4} ${-cellSize * .45}`} fill="none" stroke="var(--color-ink)" strokeWidth={Math.max(1, cellSize / 9)} />}

      {rects.map((r, i) => (
        <rect
          key={i}
          x={x + r.x * scale}
          y={y + r.y * scale}
          width={r.w * scale}
          height={r.h * scale}
          fill={INK[r.ink] ?? INK.ink}
        />
      ))}
    </g>
  );
}
