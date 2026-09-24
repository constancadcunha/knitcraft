import { NO_STITCH_ID, type ChartCell, type SymbolChart } from "@/lib/chart";
import { torsoFit } from "./fit";
import type { Panel } from "./panels";
import type { GarmentContext } from "./context";
import type { GarmentKind } from "./types";

/** Row widths are stitch counts, never a scaled thumbnail silhouette. */
export function shapeChart(chart: SymbolChart, panel: Panel, kind: GarmentKind, ctx: GarmentContext): SymbolChart {
  const w = chart.width, h = chart.height;
  const name = panel.name.toLowerCase();
  let widthAt: ((r: number) => number) | undefined;
  const taper = (from: number, to: number, r: number, start: number, end: number) => Math.round(from + (to - from) * Math.max(0, Math.min(1, (r - start) / Math.max(1, end - start))));
  const torso = ["sweater", "cardigan", "vest", "tankTop"].includes(kind);
  const fit = torso ? torsoFit(ctx, kind, "raglan") : null;
  if (torso && (name.includes("front") || name === "back")) {
    const neck = ctx.sts(fit!.neckWidthCm / (kind === "cardigan" && name.includes("front") ? 2 : 1));
    const start = h - ctx.rowCount(fit!.armholeDepthCm);
    widthAt = r => taper(w, Math.max(4, neck), r, start, h - 1);
  } else if (torso && name.includes("sleeve")) {
    const cuff = Math.min(w, ctx.sts(fit!.cuffCm));
    const cap = ctx.rowCount(fit!.armholeDepthCm);
    const underarm = h - cap;
    widthAt = r => r < underarm ? taper(cuff, w, r, panel.edgeRows ?? 0, underarm - 1) : taper(w, Math.max(4, ctx.sts(5)), r, underarm, h - 1);
  } else if ((kind === "hat" && name === "body") || (kind === "socks" && name === "toe") || (kind === "mittens" && name === "hand")) {
    widthAt = r => taper(w, Math.min(8, w), r, kind === "hat" ? Math.floor(h * .6) : Math.floor(h * .5), h - 1);
  } else if (kind === "shawl") {
    widthAt = r => taper(3, w, r, 0, h - 1);
  }
  if (!widthAt) return chart;
  let previous = Math.max(3, Math.min(w, widthAt(0)));
  let rows = chart.rows.map((row, r) => {
    // Each decrease consumes two stitches; each increase creates one.
    const desired = Math.max(3, Math.min(w, widthAt!(r)));
    const count = r === 0 ? desired : Math.max(Math.ceil(previous / 2), Math.min(previous * 2, desired));
    const delta = r === 0 ? 0 : count - previous;
    const start = Math.floor((w - count) / 2);
    const cells: ChartCell[] = row.map(() => ({ symbolId: NO_STITCH_ID, colorIndex: 0 }));
    for (let i = 0; i < count; i++) cells[start + i] = { ...row[start + i] };
    const n = Math.abs(delta);
    for (let i = 0; i < n; i++) {
      // Garment tapers belong at the edges. Crown decreases are distributed.
      const crown = kind === "hat" || kind === "mittens" || kind === "socks";
      const offset = crown ? Math.floor((i + .5) * count / n) : i % 2 === 0 ? 1 + Math.floor(i / 2) : count - 2 - Math.floor(i / 2);
      const col = start + Math.max(0, Math.min(count - 1, offset));
      cells[col] = { symbolId: chart.craft === "knitting" ? (delta > 0 ? (i % 2 ? "m1r" : "m1l") : (i % 2 ? "ssk" : "k2tog")) : (delta > 0 ? `${ctx.crochetStitch}-inc` : `${ctx.crochetStitch}-dec`), colorIndex: 0 };
    }
    previous = count;
    return cells;
  });

  if (torso && kind === "cardigan" && name.includes("front")) {
    // A cardigan front narrows towards its centre opening, not towards the
    // middle of the piece. Mirror the two fronts so they assemble visually.
    rows = rows.map((row) => {
      const worked = row.filter((cell) => cell.symbolId !== NO_STITCH_ID);
      const start = name.startsWith("left") ? 0 : w - worked.length;
      return placeWorkedCells(row, worked, Array.from({ length: worked.length }, (_, i) => start + i));
    });
  } else if (torso && (name === "front" || name === "back")) {
    // The last rows are two shoulders separated by a real neck opening. Keep
    // exactly the same stitch symbols/counts and only move their chart cells,
    // so the arithmetic remains valid while the piece finally reads as a
    // sweater or vest rather than a centred trapezium.
    const neckDepth = name === "front" ? fit!.frontNeckDepthCm : fit!.backNeckDepthCm;
    const neckStart = Math.max(0, h - ctx.rowCount(neckDepth));
    const upperWidth = Math.min(w, Math.max(4, ctx.sts(fit!.upperBackCm)));
    rows = rows.map((row, r) => {
      if (r < neckStart) return row;
      const worked = row.filter((cell) => cell.symbolId !== NO_STITCH_ID);
      const availableGap = Math.max(0, upperWidth - worked.length);
      const neckGap = Math.min(availableGap, Math.max(2, ctx.sts(fit!.neckWidthCm)));
      if (neckGap < 2) return row;
      const left = Math.ceil(worked.length / 2);
      const right = worked.length - left;
      const boundStart = Math.floor((w - upperWidth) / 2);
      const positions = [
        ...Array.from({ length: left }, (_, i) => boundStart + i),
        ...Array.from({ length: right }, (_, i) => boundStart + upperWidth - right + i),
      ];
      return placeWorkedCells(row, worked, positions);
    });
  }
  return { ...chart, rows };
}

function placeWorkedCells(row: readonly ChartCell[], worked: readonly ChartCell[], positions: readonly number[]): ChartCell[] {
  const next: ChartCell[] = row.map(() => ({ symbolId: NO_STITCH_ID, colorIndex: 0 }));
  positions.forEach((position, index) => {
    const cell = worked[index];
    if (position >= 0 && position < next.length && cell) next[position] = { ...cell };
  });
  return next;
}
