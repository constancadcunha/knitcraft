import { describe, expect, it } from "vitest";
import { type SymbolChart, cloneChart, createChart, fillRow, placeSymbol } from "../model";
import { isChartValid, validateChart } from "../validate";

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function chartOf(width: number, height: number, specs: (string | undefined)[][]): SymbolChart {
  const base = createChart({ id: "v", craft: "knitting", width, height, colors: ["#fff"] });
  return specs.reduce((acc, spec, index) => unwrap(fillRow(acc, index, spec)), base);
}

const K = (n: number) => Array.from({ length: n }, () => "k");

describe("stitch-count reconciliation", () => {
  it("accepts a shaped chart whose decrease is padded with a no stitch cell", () => {
    // Row 2 eats 5 and leaves 4; the fifth column is a no-stitch placeholder so
    // the rectangle stays rectangular. Row 3 then correctly eats only 4.
    const chart = chartOf(5, 3, [
      K(5),
      ["k2tog", "k", "k", "k", "nostitch"],
      ["k", "k", "k", "k", "nostitch"],
    ]);
    expect(validateChart(chart).errors).toEqual([]);
    expect(isChartValid(chart)).toBe(true);
  });

  it("catches a deliberately broken chart where a row works stitches that do not exist", () => {
    // Identical to the chart above except the top row forgets the no-stitch
    // padding, so it tries to work 5 stitches out of the 4 that row 2 left.
    const chart = chartOf(5, 3, [K(5), ["k2tog", "k", "k", "k", "nostitch"], K(5)]);
    const report = validateChart(chart);
    expect(report.valid).toBe(false);
    expect(report.errors).toHaveLength(1);
    const [issue] = report.errors;
    expect(issue.code).toBe("count/mismatch");
    expect(issue.row).toBe(2);
    expect(issue.expected).toBe(4);
    expect(issue.actual).toBe(5);
    expect(issue.message).toBe("row 3 works 5 sts but row 2 left 4");
  });

  it("accepts balanced lace where every decrease has a matching yarn over", () => {
    const chart = chartOf(4, 2, [K(4), ["yo", "k2tog", "k", "k"]]);
    expect(validateChart(chart).errors).toEqual([]);
  });

  it("catches lace with a decrease and no compensating increase", () => {
    const chart = chartOf(4, 3, [K(4), ["k2tog", "k", "k", "k"], K(4)]);
    const codes = validateChart(chart).errors.map((i) => i.code);
    // Row 2 eats 5 of the 4 available, and then leaves 4 for a row that wants 4.
    expect(codes).toContain("count/mismatch");
  });

  it("exempts the bottom row, whose consumption IS the cast-on", () => {
    const chart = chartOf(4, 1, [["yo", "yo", "k", "k"]]);
    expect(validateChart(chart).errors).toEqual([]);
  });
});

describe("multi-cell integrity", () => {
  it("passes a well-formed cable", () => {
    const chart = unwrap(placeSymbol(chartOf(8, 1, [K(8)]), 0, 2, "2/2 RC"));
    expect(validateChart(chart).errors).toEqual([]);
  });

  it("catches a cable that runs off the right edge", () => {
    const chart = cloneChart(chartOf(8, 1, [K(8)]));
    // Hand-written damage: a stored chart could arrive like this.
    chart.rows[0][6] = { colorIndex: 0, symbolId: "2/2 RC" };
    const report = validateChart(chart);
    const overflow = report.errors.find((i) => i.code === "span/overflow");
    expect(overflow?.col).toBe(6);
    expect(overflow?.expected).toBe(4);
    expect(overflow?.actual).toBe(2);
  });

  it("catches an orphaned continuation cell", () => {
    const chart = cloneChart(chartOf(4, 1, [K(4)]));
    chart.rows[0][2] = { colorIndex: 0, continues: 0 };
    const orphan = validateChart(chart).errors.find((i) => i.code === "span/orphan-continuation");
    expect(orphan?.col).toBe(2);
  });

  it("catches a continuation cell that was overwritten with its own symbol", () => {
    const chart = cloneChart(unwrap(placeSymbol(chartOf(8, 1, [K(8)]), 0, 2, "2/2 RC")));
    chart.rows[0][4] = { colorIndex: 0, symbolId: "k" };
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("span/missing-continuation");
  });

  it("catches two crossings that overlap", () => {
    const chart = cloneChart(chartOf(6, 1, [K(6)]));
    chart.rows[0][0] = { colorIndex: 0, symbolId: "2/2 RC" };
    chart.rows[0][1] = { colorIndex: 0, symbolId: "1/1 RC" };
    chart.rows[0][2] = { colorIndex: 0, continues: 1 };
    chart.rows[0][3] = { colorIndex: 0, continues: 0 };
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("span/overlap");
  });
});

describe("structural checks", () => {
  it("catches an unknown symbol id", () => {
    const chart = cloneChart(chartOf(4, 1, [K(4)]));
    chart.rows[0][1] = { colorIndex: 0, symbolId: "k4tog-with-a-twist" };
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("symbol/unknown");
  });

  it("catches a crochet symbol smuggled into a knitting chart", () => {
    const chart = cloneChart(chartOf(4, 1, [K(4)]));
    chart.rows[0][1] = { colorIndex: 0, symbolId: "dc" };
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("symbol/wrong-craft");
  });

  it("catches a colour index outside the palette", () => {
    const chart = cloneChart(chartOf(4, 1, [K(4)]));
    chart.rows[0][2] = { colorIndex: 7 };
    const issue = validateChart(chart).errors.find((i) => i.code === "color/out-of-range");
    expect(issue?.col).toBe(2);
  });

  it("catches a ragged grid", () => {
    const chart = cloneChart(chartOf(4, 2, [K(4), K(4)]));
    chart.rows[1] = chart.rows[1].slice(0, 3);
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("geometry/row-width");
  });

  it("catches a repeat box outside the chart", () => {
    const chart = cloneChart(chartOf(4, 1, [K(4)]));
    chart.repeats = [{ id: "bad", startCol: 2, endCol: 9, startRow: 0, endRow: 0 }];
    const codes = validateChart(chart).errors.map((i) => i.code);
    expect(codes).toContain("repeat/out-of-bounds");
  });

  it("warns, but does not fail, on a row that works nothing", () => {
    const chart = chartOf(3, 1, [["nostitch", "nostitch", "nostitch"]]);
    const report = validateChart(chart);
    expect(report.valid).toBe(true);
    expect(report.warnings.map((i) => i.code)).toContain("count/empty-row");
  });
});

describe("cable crossings on wrong-side rows", () => {
  /** A 4x2 panel with a 2/2 cable anchored on the given row. */
  function withCableOnRow(rowIndex: number) {
    let chart = createChart({ id: "c", craft: "knitting", width: 4, height: 2 });
    for (let r = 0; r < 2; r += 1) {
      const filled = fillRow(chart, r, ["k", "k", "k", "k"]);
      if (!filled.ok) throw new Error(filled.error.message);
      chart = filled.value;
    }
    const placed = placeSymbol(chart, rowIndex, 0, "2/2 RC");
    if (!placed.ok) throw new Error(placed.error.message);
    return placed.value;
  }

  it("warns, but does not error, when a crossing lands on a wrong-side row", () => {
    // rows[1] is row 2, which is a WS row on a flat chart starting on RS.
    const report = validateChart(withCableOnRow(1));
    const warning = report.warnings.find((i) => i.code === "cable/wrong-side");
    expect(warning).toBeDefined();
    expect(warning?.row).toBe(1);
    // A knitter who means it may keep it, so the chart is still valid.
    expect(report.valid).toBe(true);
  });

  it("says nothing about a crossing on a right-side row", () => {
    const report = validateChart(withCableOnRow(0));
    expect(report.issues.filter((i) => i.code === "cable/wrong-side")).toHaveLength(0);
  });

  it("says nothing when worked in the round, where every round is a right side", () => {
    let chart = createChart({ id: "c", craft: "knitting", width: 4, height: 2, worked: "round" });
    for (let r = 0; r < 2; r += 1) {
      const filled = fillRow(chart, r, ["k", "k", "k", "k"]);
      if (filled.ok) chart = filled.value;
    }
    const placed = placeSymbol(chart, 1, 0, "2/2 RC");
    if (!placed.ok) throw new Error(placed.error.message);
    expect(
      validateChart(placed.value).issues.filter((i) => i.code === "cable/wrong-side")
    ).toHaveLength(0);
  });
});
