import { describe, it, expect } from "vitest";
import { draftGarment } from "../index";
import { validateChart, rowCounts } from "@/lib/chart";

describe("full size garment charts", () => {
  for (const garment of ["Sweater", "Cardigan", "Hat", "Shawl", "Mittens", "Socks"]) {
    for (const craft of ["knitting", "crochet"] as const) {
      it(`${garment}/${craft} reconciles every shaped row`, () => {
        const draft = draftGarment({ garment, craft, size: "M" });
        for (const { chart, panel } of draft.pieces) {
          expect(chart.height).toBe(panel.rows);
          expect(chart.width).toBe(panel.stitches);
          expect(validateChart(chart).errors, panel.name).toEqual([]);
        }
      });
    }
  }
  it("sleeves widen from cuff and narrow through the raglan", () => {
    const { chart } = draftGarment({ garment: "Sweater", craft: "knitting", size: "M" }).pieces.find(p => p.panel.name === "Left sleeve")!;
    const counts = chart.rows.map((_, i) => rowCounts(chart, i).produced);
    expect(Math.max(...counts)).toBeGreaterThan(counts[0]);
    expect(counts.at(-1)).toBeLessThan(Math.max(...counts));
  });
  it("a plain ornament panel has no unsolicited ribbing", () => {
    const { chart } = draftGarment({ garment: "Ornament", craft: "knitting" }).pieces[0];
    expect(chart.rows.flat().some(c => c.symbolId === "p")).toBe(false);
  });
  it("ribbing can be omitted", () => {
    const d = draftGarment({ garment: "Sweater", craft: "knitting", options: { ribbing: false } });
    expect(d.pieces.some(p => p.chart.rows.flat().some(c => c.symbolId === "p"))).toBe(false);
  });
});
