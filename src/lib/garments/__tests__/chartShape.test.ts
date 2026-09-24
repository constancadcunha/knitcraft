import { describe, it, expect } from "vitest";
import { draftGarment } from "../index";
import { NO_STITCH_ID, validateChart, rowCounts } from "@/lib/chart";

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

  it("cuts a visible neckline between the two sweater shoulders", () => {
    const { chart } = draftGarment({ garment: "Sweater", craft: "knitting", size: "M" }).pieces.find(p => p.panel.name === "Front")!;
    const top = chart.rows.at(-1)!;
    const worked = top.map(cell => cell.symbolId !== NO_STITCH_ID);
    const first = worked.indexOf(true);
    const last = worked.lastIndexOf(true);
    expect(worked.slice(first, last + 1)).toContain(false);
    expect(validateChart(chart).errors).toEqual([]);
  });

  it("mirrors cardigan fronts towards the centre opening", () => {
    const pieces = draftGarment({ garment: "Cardigan", craft: "knitting", size: "M" }).pieces;
    const left = pieces.find(p => p.panel.name === "Left front")!.chart.rows.at(-1)!;
    const right = pieces.find(p => p.panel.name === "Right front")!.chart.rows.at(-1)!;
    expect(left[0].symbolId).not.toBe(NO_STITCH_ID);
    expect(left.at(-1)!.symbolId).toBe(NO_STITCH_ID);
    expect(right[0].symbolId).toBe(NO_STITCH_ID);
    expect(right.at(-1)!.symbolId).not.toBe(NO_STITCH_ID);
  });
});
