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
  const rows = chart.rows.map((row, r) => {
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
  return { ...chart, rows };
}
