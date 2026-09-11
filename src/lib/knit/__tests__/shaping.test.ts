import { describe, expect, it } from "vitest";
import {
  CROCHET_TERMS,
  bindOffCurve,
  checkPartition,
  distributeButtonholes,
  distributeShaping,
  evenlyDistributeIncreases,
  pickUpStitches,
  runningStitchCounts,
  taperSchedule,
} from "../shaping";

describe("distributeShaping", () => {
  it("solves the classic two-interval schedule", () => {
    // 9 increase rows over 50 rows, on right-side rows only:
    // 50 / 2 = 25 slots, 25 = 2x9 + 7, so seven of the intervals are 6 rows
    // and two are 4 rows.
    const s = distributeShaping(9, 50, { everyOtherRow: true, label: "an increase row" });
    expect(s.fits).toBe(true);
    expect(s.scheduledCount).toBe(9);
    expect(s.groups).toEqual([
      { interval: 4, times: 2 },
      { interval: 6, times: 7 },
    ]);
    expect(s.rows).toEqual([4, 8, 14, 20, 26, 32, 38, 44, 50]);
    expect(s.rowsUsed).toBe(50);
    expect(s.plainRowsAfter).toBe(0);
    expect(s.instruction).toBe(
      "Work an increase row every 4th row twice, then every 6th row 7 times (9 shaping rows over 50 rows).",
    );
  });

  it("PROPERTY: the schedule always totals the requested count and fits the budget", () => {
    for (let count = 1; count <= 40; count += 1) {
      for (let rows = 1; rows <= 140; rows += 1) {
        for (const everyOtherRow of [false, true]) {
          const s = distributeShaping(count, rows, { everyOtherRow });
          const label = `count=${count} rows=${rows} alt=${everyOtherRow}`;

          // Never overrun the budget, feasible or not.
          expect(s.rowsUsed, label).toBeLessThanOrEqual(rows);
          expect(s.plainRowsAfter, label).toBeGreaterThanOrEqual(0);

          const scheduled = s.groups.reduce((sum, g) => sum + g.times, 0);
          expect(scheduled, label).toBe(s.scheduledCount);
          expect(s.rows.length, label).toBe(s.scheduledCount);

          if (s.fits) {
            expect(s.scheduledCount, label).toBe(count);
            expect(s.warnings, label).toHaveLength(0);
          } else {
            expect(s.scheduledCount, label).toBeLessThan(count);
            expect(s.warnings.length, label).toBeGreaterThan(0);
          }

          // Rows strictly increase, and every gap is one of the stated intervals.
          const intervals = new Set(s.groups.map((g) => g.interval));
          let previous = 0;
          for (const row of s.rows) {
            expect(row, label).toBeGreaterThan(previous);
            expect(intervals.has(row - previous), `${label} gap ${row - previous}`).toBe(true);
            previous = row;
          }

          // Alternate-row shaping must keep every interval even, or the shaping
          // lands on the wrong side of the fabric.
          if (everyOtherRow) {
            for (const g of s.groups) expect(g.interval % 2, label).toBe(0);
          }
          for (const g of s.groups) expect(g.interval, label).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("collapses to a single group when the division is exact", () => {
    const s = distributeShaping(10, 60);
    expect(s.groups).toEqual([{ interval: 6, times: 10 }]);
    expect(s.instruction).toContain("every 6th row 10 times");
  });

  it("words every-row and every-other-row shaping the way a pattern does", () => {
    expect(distributeShaping(20, 20).instruction).toContain("every row 20 times");
    expect(distributeShaping(10, 20, { everyOtherRow: true }).instruction).toContain("every other row 10 times");
    expect(distributeShaping(1, 8).instruction).toContain("once");
    expect(distributeShaping(2, 8).instruction).toContain("twice");
  });

  it("reports no shaping without pretending to schedule any", () => {
    const s = distributeShaping(0, 40);
    expect(s.fits).toBe(true);
    expect(s.rows).toEqual([]);
    expect(s.plainRowsAfter).toBe(40);
    expect(s.instruction).toBe("Work 40 rows even, with no shaping.");
  });

  it("REGRESSION: refuses to schedule shaping that does not fit the piece", () => {
    // The old engine asserted "increase every 6th row until you have 44 sts",
    // which needed more rows than the sleeve had. Nothing checked.
    const s = distributeShaping(30, 40, { everyOtherRow: true });
    expect(s.fits).toBe(false);
    expect(s.scheduledCount).toBe(20);
    expect(s.rowsUsed).toBeLessThanOrEqual(40);
    expect(s.warnings.join(" ")).toMatch(/do not fit/);
  });

  it("speaks crochet when given crochet terms", () => {
    const s = distributeShaping(4, 20, { terms: CROCHET_TERMS, label: "a decrease row" });
    expect(s.instruction).toContain("every 5th row 4 times");
    expect(s.instruction).not.toContain("RS");
  });
});

describe("taperSchedule", () => {
  it("REGRESSION: solves the sleeve taper instead of asserting every 6th row", () => {
    // Audit case, size M: cuff 26 sts, upper arm 44 sts, 51 rows available
    // between the cuff and the underarm. "Every 6th row" needed 54 rows and the
    // full schedule needed 92 rows inside a 79-row sleeve.
    const s = taperSchedule(26, 44, 51);
    expect(s.fits).toBe(true);
    expect(s.scheduledCount).toBe(9); // 18 stitches, 2 per shaping row
    expect(s.rowsUsed).toBeLessThanOrEqual(51);
    expect(s.groups.every((g) => g.interval % 2 === 0)).toBe(true);
    // The taper actually reaches the target stitch count.
    expect(s.fromStitches + s.scheduledCount * s.stitchesPerShapingRow).toBe(44);
  });

  it("flags a taper that is too steep for the sleeve length", () => {
    const s = taperSchedule(26, 70, 30);
    expect(s.fits).toBe(false);
    expect(s.warnings.join(" ")).toMatch(/do not fit/);
  });

  it("handles a decreasing taper", () => {
    const s = taperSchedule(60, 40, 60);
    expect(s.scheduledCount).toBe(10);
    expect(s.instruction).toContain("decrease");
  });
});

describe("bindOffCurve", () => {
  it("produces the standard stepped curve", () => {
    const curve = bindOffCurve(20);
    expect(curve.steps).toEqual([
      { stitches: 10, times: 1 },
      { stitches: 2, times: 3 },
      { stitches: 1, times: 4 },
    ]);
    expect(curve.instruction).toContain("Bind off 10 sts once, then 2 sts 3 times, then 1 st 4 times");
  });

  it("PROPERTY: the steps always sum to exactly the stitches requested", () => {
    for (let stitches = 0; stitches <= 300; stitches += 1) {
      for (const initialFraction of [0.3, 0.4, 0.5, 0.6]) {
        const curve = bindOffCurve(stitches, { initialFraction });
        const total = curve.steps.reduce((sum, s) => sum + s.stitches * s.times, 0);
        expect(total, `stitches=${stitches} frac=${initialFraction}`).toBe(stitches);
        expect(curve.total).toBe(stitches);
        // Steps get smaller as the curve flattens out.
        for (let i = 1; i < curve.steps.length; i += 1) {
          expect(curve.steps[i].stitches).toBeLessThan(curve.steps[i - 1].stitches);
        }
      }
    }
  });

  it("handles the small counts that a shallow armhole produces", () => {
    expect(bindOffCurve(1).steps).toEqual([{ stitches: 1, times: 1 }]);
    expect(bindOffCurve(2).steps).toEqual([{ stitches: 1, times: 2 }]);
    expect(bindOffCurve(3).steps).toEqual([
      { stitches: 2, times: 1 },
      { stitches: 1, times: 1 },
    ]);
    expect(bindOffCurve(0).steps).toEqual([]);
    expect(bindOffCurve(0).instruction).toContain("No shaping");
  });

  it("counts rows differently for one edge and for two", () => {
    const oneEdge = bindOffCurve(8, { edges: 1 });
    const twoEdges = bindOffCurve(8, { edges: 2 });
    expect(oneEdge.shapingRows).toBe(twoEdges.shapingRows);
    expect(oneEdge.rowsUsed).toBe(oneEdge.shapingRows * 2 - 1);
    expect(twoEdges.rowsUsed).toBe(twoEdges.shapingRows * 2);
  });

  it("warns when the curve needs more rows than the armhole has", () => {
    const curve = bindOffCurve(24, { edges: 2, availableRows: 10 });
    expect(curve.warnings.join(" ")).toMatch(/only 10 rows are available/);
  });
});

describe("evenlyDistributeIncreases", () => {
  it("writes the increase row and consumes exactly the stitches on the needle", () => {
    const d = evenlyDistributeIncreases(58, 76);
    expect(d.direction).toBe("increase");
    expect(d.delta).toBe(18);
    expect(d.stitchesConsumed).toBe(58);
    expect(d.groups).toEqual([
      { plainStitches: 3, times: 14 },
      { plainStitches: 4, times: 4 },
    ]);
    expect(d.instruction).toBe("*k3, M1; rep from * 14 times, *k4, M1; rep from * 4 times — 76 sts.");
  });

  it("PROPERTY: groups always consume the full starting stitch count", () => {
    for (let from = 4; from <= 200; from += 3) {
      for (let to = 4; to <= 260; to += 7) {
        const d = evenlyDistributeIncreases(from, to);
        if (!d.feasible) continue;
        expect(d.stitchesConsumed, `${from} -> ${to}`).toBe(from);
        const events = d.groups.reduce((sum, g) => sum + g.times, 0);
        expect(events, `${from} -> ${to}`).toBe(Math.abs(to - from));
      }
    }
  });

  it("accounts for the two stitches each decrease eats", () => {
    const d = evenlyDistributeIncreases(60, 40);
    expect(d.direction).toBe("decrease");
    expect(d.stitchesConsumed).toBe(60); // 20 k2togs eat 40 sts, 20 plain remain
    expect(d.instruction).toContain("k2tog");
    expect(d.instruction).toContain("— 40 sts.");
  });

  it("refuses to crowd more shaping into a row than the stitches allow", () => {
    const d = evenlyDistributeIncreases(10, 30);
    expect(d.feasible).toBe(false);
    expect(d.warnings.join(" ")).toMatch(/over two rows/);
  });

  it("balances the shaping away from the row edges when asked", () => {
    const plain = evenlyDistributeIncreases(40, 45);
    const balanced = evenlyDistributeIncreases(40, 45, { edgeBalanced: true });
    // Unbalanced, the final increase lands on the very last stitch of the row.
    expect(plain.instruction).toBe("*k8, M1; rep from * 5 times — 45 sts.");
    // Balanced, half of the first plain run moves to the end of the row.
    expect(balanced.instruction).toBe("k4, M1, *k8, M1; rep from * 4 times, k4 — 45 sts.");
  });

  it("does nothing when there is nothing to do", () => {
    const d = evenlyDistributeIncreases(50, 50);
    expect(d.direction).toBe("none");
    expect(d.groups).toEqual([]);
    expect(d.instruction).toContain("even");
  });

  it("speaks crochet", () => {
    const d = evenlyDistributeIncreases(40, 50, { terms: CROCHET_TERMS });
    expect(d.instruction).toContain("sc4");
    expect(d.instruction).toContain("2 sc in next st");
  });
});

describe("picking up stitches", () => {
  it("REGRESSION: uses the 3-for-4 ratio along a row edge", () => {
    // The old engine picked up `bandSts` = 8 along a 108-row (24.5 in) cardigan
    // front, an edge that needs about 80.
    const result = pickUpStitches(108, "vertical");
    expect(result.stitches).toBe(81);
    expect(result.instruction).toContain("3 sts for every 4 rows");
  });

  it("uses the right ratio for each edge kind", () => {
    expect(pickUpStitches(60, "horizontal").stitches).toBe(60);
    expect(pickUpStitches(30, "curve").stitches).toBe(20);
  });

  it("can snap the pick-up to a ribbing multiple", () => {
    const result = pickUpStitches(108, "vertical", { multiple: 4 });
    expect(result.stitches % 4).toBe(0);
    expect(result.stitches).toBe(80);
  });
});

describe("buttonholes", () => {
  it("REGRESSION: spaces buttonholes down the band's length, not across its width", () => {
    // The old engine derived the count from the ribbing's row count and then
    // consumed 16 stitches placing them across an 8-stitch-wide band.
    const plan = distributeButtonholes(108, 6);
    expect(plan.rows).toHaveLength(6);
    expect(plan.rows[0]).toBeGreaterThanOrEqual(1);
    expect(plan.rows[plan.rows.length - 1]).toBeLessThan(108);
    for (let i = 1; i < plan.rows.length; i += 1) {
      expect(plan.rows[i]).toBeGreaterThan(plan.rows[i - 1]);
    }
    expect(plan.instruction).toContain("6 buttonholes");
  });

  it("centres a single buttonhole and copes with a short band", () => {
    expect(distributeButtonholes(40, 1).rows).toHaveLength(1);
    const tiny = distributeButtonholes(6, 5);
    expect(tiny.warnings.length).toBeGreaterThan(0);
  });

  it("returns nothing when there are no buttons", () => {
    expect(distributeButtonholes(100, 0).rows).toEqual([]);
  });
});

describe("running stitch counts", () => {
  it("REGRESSION: catches the 21 + 34 + 21 = 76 against 58 live stitches bug", () => {
    // The old back panel had 58 sts live at the neck row but bound off 34 and
    // then demanded two 21-stitch shoulders — the cast-on count, not the live one.
    const bad = checkPartition(58, [
      { name: "shoulder", stitches: 21 },
      { name: "back neck", stitches: 34 },
      { name: "shoulder", stitches: 21 },
    ]);
    expect(bad.ok).toBe(false);
    expect(bad.total).toBe(76);
    expect(bad.message).toContain("out by 18");

    const good = checkPartition(58, [
      { name: "shoulder", stitches: 15 },
      { name: "back neck", stitches: 28 },
      { name: "shoulder", stitches: 15 },
    ]);
    expect(good.ok).toBe(true);
  });

  it("replays a piece's shaping and reports the live count at every row", () => {
    const result = runningStitchCounts(76, [
      { row: 60, delta: -8, note: "bind off for armholes" },
      { row: 62, delta: -2 },
      { row: 64, delta: -2 },
      { row: 66, delta: -2 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.finalStitches).toBe(62);
    expect(result.counts.map((c) => c.stitches)).toEqual([68, 66, 64, 62]);
    expect(result.counts[0].note).toBe("bind off for armholes");
  });

  it("catches shaping that removes more stitches than exist", () => {
    const result = runningStitchCounts(10, [{ row: 2, delta: -20 }]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/below zero/);
  });
});
