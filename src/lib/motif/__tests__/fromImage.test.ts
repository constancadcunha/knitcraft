import { describe, expect, it } from "vitest";
import { chartFromImage, reduceRow } from "../fromImage";
import { isChartValid, rowGroups } from "@/lib/chart";

const PALETTE = ["#000000", "#ffffff", "#ff0000", "#fe0000", "#0000ff"];

describe("reduceRow", () => {
  it("leaves a row alone when it already fits", () => {
    expect(reduceRow([0, 1, 0, 1], PALETTE, 2)).toEqual([0, 1, 0, 1]);
  });

  it("keeps the colours covering the most stitches", () => {
    // 0 appears 4x, 1 appears 3x, 4 appears once — 4 must go.
    const out = reduceRow([0, 0, 0, 0, 1, 1, 1, 4], PALETTE, 2);
    expect(new Set(out).size).toBe(2);
    expect(out.slice(0, 7)).toEqual([0, 0, 0, 0, 1, 1, 1]);
  });

  it("remaps a dropped colour to its nearest survivor, not to index 0", () => {
    // #fe0000 (3) is visually #ff0000 (2), so it must fold into 2, not black.
    const out = reduceRow([2, 2, 2, 2, 0, 0, 0, 3], PALETTE, 2);
    expect(out[7]).toBe(2);
  });

  it("does nothing when the limit is not finite (intarsia)", () => {
    const row = [0, 1, 2, 3, 4];
    expect(reduceRow(row, PALETTE, Number.POSITIVE_INFINITY)).toEqual(row);
  });
});

describe("chartFromImage", () => {
  const grid = [
    [0, 1, 2, 3],
    [4, 0, 1, 2],
    [1, 1, 0, 0],
  ];

  it("produces a valid chart of the right shape", () => {
    const { chart } = chartFromImage({ grid, colors: PALETTE }, {
      id: "img", name: "Photo", craft: "knitting",
    });
    expect(chart.width).toBe(4);
    expect(chart.height).toBe(3);
    expect(isChartValid(chart)).toBe(true);
  });

  it("flips the picture so it is not upside down on the needles", () => {
    // rows[0] is the BOTTOM of a knitting chart, so the image's LAST row
    // must land there.
    const { chart } = chartFromImage({ grid, colors: PALETTE }, {
      id: "img", name: "Photo", craft: "knitting", maxColoursPerRow: Infinity,
    });
    expect(chart.rows[0].map((c) => c.colorIndex)).toEqual([1, 1, 0, 0]);
    expect(chart.rows[2].map((c) => c.colorIndex)).toEqual([0, 1, 2, 3]);
  });

  it("enforces two colours per row, because that is what can be carried", () => {
    const { chart, rowsReduced, note } = chartFromImage({ grid, colors: PALETTE }, {
      id: "img", name: "Photo", craft: "knitting",
    });
    for (const row of chart.rows) {
      expect(new Set(row.map((c) => c.colorIndex)).size).toBeLessThanOrEqual(2);
    }
    expect(rowsReduced).toBeGreaterThan(0);
    expect(note).toContain("two yarns per row");
  });

  it("leaves every row alone for intarsia", () => {
    const { chart, rowsReduced } = chartFromImage({ grid, colors: PALETTE }, {
      id: "img", name: "Photo", craft: "knitting", maxColoursPerRow: Infinity,
    });
    expect(rowsReduced).toBe(0);
    expect(new Set(chart.rows[2].map((c) => c.colorIndex)).size).toBe(4);
  });

  it("uses plain fabric so the stitch count is never disturbed", () => {
    const { chart } = chartFromImage({ grid, colors: PALETTE }, {
      id: "img", name: "Photo", craft: "crocheting",
    });
    for (let row = 0; row < chart.height; row += 1) {
      for (const group of rowGroups(chart, row)) {
        expect(group.symbolId).toBe("sc");
        expect(group.width).toBe(1);
      }
    }
  });

  it("refuses an empty grid rather than making a zero-size chart", () => {
    expect(() => chartFromImage({ grid: [], colors: PALETTE }, {
      id: "x", name: "x", craft: "knitting",
    })).toThrow();
  });
});
