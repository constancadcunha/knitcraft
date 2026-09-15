import { describe, expect, it } from "vitest";
import { createChart, fillRow, type SymbolChart } from "@/lib/chart";
import type { Instruction } from "@/types";
import {
  groupRows,
  panelStitchesFromChart,
  rowsFromChart,
  rowsFromWrittenInstructions,
  sectionIndexForRow,
} from "../instructionSections";

/** A knitted panel: `edgeRows` of 2x2 rib, then stockinette. */
function ribbedPanel(height: number, edgeRows = 4, width = 8): SymbolChart {
  let chart = createChart({ id: "t", craft: "knitting", width, height });
  for (let row = 0; row < height; row += 1) {
    const cells = Array.from({ length: width }, (_, col) =>
      row < edgeRows ? (col % 4 < 2 ? "k" : "p") : "k"
    );
    const filled = fillRow(chart, row, cells);
    if (!filled.ok) throw new Error(filled.error.message);
    chart = filled.value;
  }
  return chart;
}

function written(lines: string[]): Instruction[] {
  return lines.map((text, i) => ({ rowNumber: i, text }));
}

describe("rowsFromWrittenInstructions", () => {
  it("reads the label, the body, the side and the running count back out", () => {
    const book = rowsFromWrittenInstructions(
      written(["Cast on 106 sts.", "Row 1 (RS): k2, p2, k2. (106 sts)", "Row 2 (WS): p2, k2, p2. (106 sts)"])
    );

    expect(book.castOnText).toBe("Cast on 106 sts.");
    expect(book.rows).toHaveLength(2);
    expect(book.rows[0]).toMatchObject({
      rowNumber: 1,
      label: "Row 1 (RS)",
      body: "k2, p2, k2",
      side: "RS",
      stitchesAfter: 106,
      shaped: false,
    });
    expect(book.rows[1].side).toBe("WS");
  });

  it("marks a row that changes the stitch count as shaping", () => {
    const book = rowsFromWrittenInstructions(
      written([
        "Cast on 60 sts.",
        "Row 1 (RS): k60. (60 sts)",
        "Row 2 (WS): p60. (60 sts)",
        "Row 3 (RS): k1, ssk, k54, k2tog, k1. (58 sts)",
      ])
    );
    expect(book.rows.map((r) => r.shaped)).toEqual([false, false, true]);
  });

  it("keeps rounds, which have no right or wrong side", () => {
    const book = rowsFromWrittenInstructions(written(["Cast on 96 sts.", "Rnd 1: k96. (96 sts)"]));
    expect(book.rows[0].side).toBeNull();
    expect(book.rows[0].label).toBe("Rnd 1");
  });
});

describe("rowsFromChart", () => {
  it("prints the piece's real width, not the width of the editing window", () => {
    const book = rowsFromChart(ribbedPanel(6), { totalStitches: 106 });
    expect(book.castOnText).toBe("Cast on 106 sts.");
    expect(book.rows[0].stitchesAfter).toBe(106);
  });

  it("gives a knit symbol the same signature on both sides of the fabric", () => {
    // Row 5 is a right-side row and row 6 a wrong-side one, written "k8" and
    // "p8" — the same stockinette, and grouping must not call them different.
    const book = rowsFromChart(ribbedPanel(8));
    expect(book.rows[4].body).not.toBe(book.rows[5].body);
    expect(book.rows[4].signature).toBe(book.rows[5].signature);
  });
});

describe("groupRows", () => {
  it("splits a ribbed hem off from the body", () => {
    const sections = groupRows(rowsFromChart(ribbedPanel(24, 4)).rows);
    expect(sections[0].title).toBe("Hem / ribbing");
    expect(sections[0].fromRow).toBe(1);
    expect(sections[0].toRow).toBe(4);
    expect(sections[1].title).toContain("Body");
    expect(sections[1].fromRow).toBe(5);
  });

  it("never hands the reader more rows than one block", () => {
    const sections = groupRows(rowsFromChart(ribbedPanel(183, 12)).rows, { blockSize: 20 });
    expect(sections.length).toBeGreaterThan(5);
    for (const section of sections) expect(section.rows.length).toBeLessThanOrEqual(20);
    // Every row is in exactly one section, in order, with nothing dropped.
    expect(sections.flatMap((s) => s.rows.map((r) => r.rowNumber))).toEqual(
      Array.from({ length: 183 }, (_, i) => i + 1)
    );
  });

  it("numbers the blocks of a long phase so they can be told apart", () => {
    const sections = groupRows(rowsFromChart(ribbedPanel(60, 4)).rows, { blockSize: 20 });
    const body = sections.filter((s) => s.kind === "body");
    expect(body.length).toBeGreaterThan(1);
    expect(body[0].title).toBe("Body 1/3");
    expect(body[0].rangeLabel).toMatch(/^Rows \d+–\d+$/);
  });

  it("pulls shaping rows out of the plain block around them", () => {
    const book = rowsFromWrittenInstructions(
      written([
        "Cast on 60 sts.",
        ...Array.from({ length: 6 }, (_, i) =>
          `Row ${i + 1} (${i % 2 === 0 ? "RS" : "WS"}): ${i % 2 === 0 ? "k60" : "p60"}. (60 sts)`
        ),
        "Row 7 (RS): k1, ssk, k54, k2tog, k1. (58 sts)",
        "Row 8 (WS): p58. (58 sts)",
      ])
    );
    const sections = groupRows(book.rows);
    const shaping = sections.find((s) => s.kind === "shaping");
    expect(shaping).toBeDefined();
    expect(shaping?.title).toBe("Shaping");
    expect(shaping?.rows.map((r) => r.rowNumber)).toEqual([7]);
  });

  it("says how the section ends, because that is the number a knitter checks", () => {
    const sections = groupRows(rowsFromChart(ribbedPanel(10, 4), { totalStitches: 106 }).rows);
    expect(sections[0].detail).toContain("ends 106 sts");
  });

  it("handles a piece with no rows at all", () => {
    expect(groupRows([])).toEqual([]);
  });
});

describe("sectionIndexForRow", () => {
  it("finds the section holding a row, and reports -1 for one that is nowhere", () => {
    const sections = groupRows(rowsFromChart(ribbedPanel(40, 4)).rows, { blockSize: 10 });
    const index = sectionIndexForRow(sections, 23);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(sections[index].fromRow).toBeLessThanOrEqual(23);
    expect(sections[index].toRow).toBeGreaterThanOrEqual(23);
    expect(sectionIndexForRow(sections, 999)).toBe(-1);
    expect(sectionIndexForRow(sections, null)).toBe(-1);
  });
});

describe("panelStitchesFromChart", () => {
  it("recovers the piece's true width from the engine's own repeat label", () => {
    const chart = ribbedPanel(4);
    const clipped: SymbolChart = {
      ...chart,
      repeats: [
        {
          id: "panel",
          startCol: 0,
          endCol: 7,
          startRow: 0,
          endRow: 3,
          label: "Repeat this panel across 106 sts and 180 rows",
        },
      ],
    };
    expect(panelStitchesFromChart(clipped)).toBe(106);
    expect(panelStitchesFromChart(chart)).toBeUndefined();
  });
});
