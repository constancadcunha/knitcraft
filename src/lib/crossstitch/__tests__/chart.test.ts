import { describe, expect, it } from "vitest";
import {
  addBackstitch,
  addFrenchKnot,
  colourUsage,
  createCrossStitchChart,
  holeInBounds,
  setStitch,
  totalStitches,
  type FlossColour,
} from "../chart";

const PALETTE: FlossColour[] = [
  { code: "310", name: "Black", hex: "#000000", symbol: "■" },
  { code: "666", name: "Bright Red", hex: "#e31d42", symbol: "▲" },
];

const blank = () =>
  createCrossStitchChart({ id: "t", width: 4, height: 3, palette: PALETTE });

describe("createCrossStitchChart", () => {
  it("starts as unstitched fabric, not colour zero", () => {
    const chart = blank();
    expect(chart.rows).toHaveLength(3);
    expect(chart.rows[0]).toHaveLength(4);
    expect(chart.rows[0][0].colour).toBeNull();
    expect(totalStitches(chart)).toBe(0);
  });

  it("rejects nonsense dimensions", () => {
    expect(() => createCrossStitchChart({ id: "t", width: 0, height: 3 })).toThrow();
  });
});

describe("setStitch", () => {
  it("places and clears a stitch without mutating the original", () => {
    const chart = blank();
    const placed = setStitch(chart, 1, 1, 0);
    expect(placed.rows[1][1].colour).toBe(0);
    expect(chart.rows[1][1].colour).toBeNull();

    const cleared = setStitch(placed, 1, 1, null);
    expect(cleared.rows[1][1].colour).toBeNull();
  });

  it("ignores out-of-bounds and unknown colours rather than corrupting the grid", () => {
    const chart = blank();
    expect(setStitch(chart, 9, 9, 0)).toBe(chart);
    expect(setStitch(chart, -1, 0, 0)).toBe(chart);
    expect(setStitch(chart, 0, 0, 7)).toBe(chart);
  });

  it("records part stitches", () => {
    const chart = setStitch(blank(), 0, 0, 1, "three-quarter");
    expect(chart.rows[0][0].kind).toBe("three-quarter");
  });
});

describe("holes are not cells", () => {
  it("allows a hole on the far edge, one beyond the last cell", () => {
    const chart = blank(); // 4 x 3 cells => 5 x 4 holes
    expect(holeInBounds(chart, { x: 4, y: 3 })).toBe(true);
    expect(holeInBounds(chart, { x: 5, y: 3 })).toBe(false);
  });

  it("puts backstitch on hole coordinates, including the outer edge", () => {
    const chart = addBackstitch(blank(), {
      from: { x: 0, y: 0 },
      to: { x: 4, y: 0 },
      colour: 0,
    });
    expect(chart.backstitch).toHaveLength(1);
  });

  it("refuses a zero-length backstitch, which is a stray click", () => {
    const chart = blank();
    expect(
      addBackstitch(chart, { from: { x: 1, y: 1 }, to: { x: 1, y: 1 }, colour: 0 }).backstitch
    ).toHaveLength(0);
  });
});

describe("colourUsage", () => {
  it("counts full and part stitches separately, since they cost different thread", () => {
    let chart = blank();
    chart = setStitch(chart, 0, 0, 0);
    chart = setStitch(chart, 1, 0, 0);
    chart = setStitch(chart, 2, 0, 0, "half");

    const black = colourUsage(chart)[0];
    expect(black.fullStitches).toBe(2);
    expect(black.partStitches).toBe(1);
    expect(black.stitchEquivalent).toBeCloseTo(2.5, 2);
  });

  it("measures diagonal backstitch by true length, not cell count", () => {
    // The chart is 4x3 cells, so holes run x 0..4 and y 0..3. A run from
    // (0,0) to (4,3) is the 3-4-5 triangle and must measure 5, not 4 cells.
    const chart = addBackstitch(blank(), {
      from: { x: 0, y: 0 },
      to: { x: 4, y: 3 },
      colour: 1,
    });
    expect(chart.backstitch).toHaveLength(1);
    expect(colourUsage(chart)[1].backstitchLength).toBeCloseTo(5, 2);
  });

  it("counts French knots", () => {
    const chart = addFrenchKnot(blank(), { at: { x: 2, y: 2 }, colour: 1 });
    expect(colourUsage(chart)[1].frenchKnots).toBe(1);
  });

  it("reports every palette colour, including unused ones", () => {
    expect(colourUsage(blank())).toHaveLength(2);
    expect(colourUsage(blank())[1].stitchEquivalent).toBe(0);
  });
});
