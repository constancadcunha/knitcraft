import { describe, expect, it } from "vitest";
import {
  type SymbolChart,
  anchorColumnOf,
  castOnCount,
  clearAt,
  createChart,
  fillRow,
  groupAt,
  placeSymbol,
  rowCounts,
  rowGroups,
  rowGroupsInReadingOrder,
  rowSide,
  setColor,
  setNoStitch,
  symbolAt,
} from "../model";

function knitChart(width: number, height: number): SymbolChart {
  return createChart({
    id: "t",
    craft: "knitting",
    width,
    height,
    colors: ["#faf7f2", "#2e1f14"],
  });
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("multi-cell symbols", () => {
  it("stores a 2/2 RC as one anchor plus three continuations", () => {
    const chart = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    const row = chart.rows[0];
    expect(row[2]).toEqual({ colorIndex: 0, symbolId: "2/2 RC" });
    expect(row[3]).toEqual({ colorIndex: 0, continues: 2 });
    expect(row[4]).toEqual({ colorIndex: 0, continues: 2 });
    expect(row[5]).toEqual({ colorIndex: 0, continues: 2 });
    // Cells outside the crossing are untouched.
    expect(row[1].symbolId).toBeUndefined();
    expect(row[6].continues).toBeUndefined();
  });

  it("renders as ONE group, not four", () => {
    const chart = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    const groups = rowGroups(chart, 0);
    expect(groups.map((g) => `${g.symbolId}@${g.anchorCol}x${g.width}`)).toEqual([
      "k@0x1",
      "k@1x1",
      "2/2 RC@2x4",
      "k@6x1",
      "k@7x1",
    ]);
  });

  it("counts the crossing once, never four times", () => {
    const chart = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    // 4 plain knits + one 4-stitch crossing = 8 in, 8 out.
    expect(rowCounts(chart, 0)).toEqual({ consumed: 8, produced: 8 });
  });

  it("resolves every covered cell back to the same symbol", () => {
    const chart = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    for (const col of [2, 3, 4, 5]) {
      expect(anchorColumnOf(chart, 0, col)).toBe(2);
      expect(symbolAt(chart, 0, col)?.id).toBe("2/2 RC");
      expect(groupAt(chart, 0, col)?.width).toBe(4);
    }
    expect(symbolAt(chart, 0, 6)?.id).toBe("k");
  });

  it("removes the whole crossing when ANY covered cell is erased", () => {
    const placed = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    for (const eraseAt of [2, 3, 4, 5]) {
      const cleared = unwrap(clearAt(placed, 0, eraseAt));
      expect(cleared.rows[0].every((cell) => cell.symbolId === undefined)).toBe(true);
      expect(cleared.rows[0].every((cell) => cell.continues === undefined)).toBe(true);
      expect(rowCounts(cleared, 0)).toEqual({ consumed: 8, produced: 8 });
    }
  });

  it("refuses a crossing that would run off the right edge", () => {
    const result = placeSymbol(knitChart(8, 1), 0, 6, "2/2 RC");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("does-not-fit");
      expect(result.error.message).toContain("4 cells wide");
    }
  });

  it("clears a crossing it would partially overwrite instead of half-breaking it", () => {
    const first = unwrap(placeSymbol(knitChart(8, 1), 0, 0, "2/2 RC"));
    // The new crossing at column 2 overlaps columns 2 and 3 of the old one.
    const second = unwrap(placeSymbol(first, 0, 2, "1/1 RC"));
    const row = second.rows[0];
    expect(row[0].symbolId).toBeUndefined();
    expect(row[1].symbolId).toBeUndefined();
    expect(row[0].continues).toBeUndefined();
    expect(row[1].continues).toBeUndefined();
    expect(row[2]).toEqual({ colorIndex: 0, symbolId: "1/1 RC" });
    expect(row[3]).toEqual({ colorIndex: 0, continues: 2 });
    expect(rowCounts(second, 0)).toEqual({ consumed: 8, produced: 8 });
  });

  it("refuses a crochet symbol in a knitting chart", () => {
    const result = placeSymbol(knitChart(4, 1), 0, 0, "dc");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("wrong-craft");
  });

  it("keeps colour orthogonal to the symbol layer", () => {
    const withCable = unwrap(placeSymbol(knitChart(8, 1), 0, 2, "2/2 RC"));
    // A two-colour cable colours a continuation cell without breaking the group.
    const recoloured = unwrap(setColor(withCable, 0, 4, 1));
    expect(recoloured.rows[0][4]).toEqual({ colorIndex: 1, continues: 2 });
    expect(groupAt(recoloured, 0, 4)?.width).toBe(4);
  });
});

describe("no stitch", () => {
  it("is never counted", () => {
    const chart = unwrap(setNoStitch(knitChart(4, 1), 0, 3));
    expect(rowCounts(chart, 0)).toEqual({ consumed: 3, produced: 3 });
  });
});

describe("row side and reading direction", () => {
  it("alternates RS/WS on a flat chart, starting at row 1", () => {
    const flat = knitChart(2, 4);
    expect([0, 1, 2, 3].map((i) => rowSide(flat, i))).toEqual(["RS", "WS", "RS", "WS"]);
  });

  it("starts on the wrong side when the chart says so", () => {
    const flat = createChart({ id: "t", craft: "knitting", width: 2, height: 2, startSide: "WS" });
    expect([0, 1].map((i) => rowSide(flat, i))).toEqual(["WS", "RS"]);
  });

  it("makes every round a right-side round", () => {
    const round = createChart({ id: "t", craft: "knitting", width: 2, height: 4, worked: "round" });
    expect([0, 1, 2, 3].map((i) => rowSide(round, i))).toEqual(["RS", "RS", "RS", "RS"]);
  });

  it("reads RS rows right to left and WS rows left to right", () => {
    const base = knitChart(4, 2);
    const chart = unwrap(fillRow(unwrap(fillRow(base, 0, ["p", "k", "k", "yo"])), 1, ["p", "k", "k", "yo"]));
    // Row 1 is a RS row: the first stitch worked is the RIGHTMOST cell.
    expect(rowGroupsInReadingOrder(chart, 0).map((g) => g.anchorCol)).toEqual([3, 2, 1, 0]);
    // Row 2 is a WS row: worked from the left of the chart.
    expect(rowGroupsInReadingOrder(chart, 1).map((g) => g.anchorCol)).toEqual([0, 1, 2, 3]);
  });

  it("reads every round of an in-the-round chart right to left", () => {
    const round = createChart({ id: "t", craft: "knitting", width: 3, height: 2, worked: "round" });
    expect(rowGroupsInReadingOrder(round, 1).map((g) => g.anchorCol)).toEqual([2, 1, 0]);
  });
});

describe("cast on", () => {
  it("is what the bottom row eats", () => {
    const chart = unwrap(fillRow(knitChart(5, 1), 0, ["yo", "k2tog", "k", "k", "k"]));
    // yo eats nothing, k2tog eats two, three knits eat three.
    expect(castOnCount(chart)).toBe(5);
    expect(rowCounts(chart, 0)).toEqual({ consumed: 5, produced: 5 });
  });
});
