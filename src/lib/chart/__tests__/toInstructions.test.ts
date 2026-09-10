import { describe, expect, it } from "vitest";
import { type SymbolChart, addRepeatBox, createChart, fillRow, setColor } from "../model";
import { chartToInstructions } from "../toInstructions";
import { validateChart } from "../validate";

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function rows(chart: SymbolChart, rowSpecs: (string | undefined)[][]): SymbolChart {
  return rowSpecs.reduce((acc, spec, index) => unwrap(fillRow(acc, index, spec)), chart);
}

/**
 * A real 4-row cable panel: a 4-stitch cable between purl columns, crossed on
 * row 3. This is the smallest chart that exercises every part of the generator
 * at once — reading direction, RS/WS flipping, a multi-cell crossing and
 * run-length compression.
 *
 *   row 4 (WS)  p p k k k k p p
 *   row 3 (RS)  p p [ 2/2 RC ] p p
 *   row 2 (WS)  p p k k k k p p
 *   row 1 (RS)  p p k k k k p p
 */
function cablePanel(): SymbolChart {
  const base = createChart({
    id: "cable-panel",
    name: "Cable panel",
    craft: "knitting",
    width: 8,
    height: 4,
    colors: ["#faf7f2"],
  });
  const P = ["p", "p"];
  const K = ["k", "k", "k", "k"];
  return rows(base, [
    [...P, ...K, ...P],
    [...P, ...K, ...P],
    [...P, "2/2 RC", ...P],
    [...P, ...K, ...P],
  ]);
}

describe("the worked cable panel example", () => {
  const chart = cablePanel();

  it("is a valid chart", () => {
    expect(validateChart(chart).errors).toEqual([]);
  });

  it("generates the exact written rows", () => {
    const instructions = chartToInstructions(chart);
    expect(instructions.rows.map((r) => r.text)).toEqual([
      "Row 1 (RS): p2, k4, p2. (8 sts)",
      "Row 2 (WS): k2, p4, k2. (8 sts)",
      "Row 3 (RS): p2, 2/2 RC, p2. (8 sts)",
      "Row 4 (WS): k2, p4, k2. (8 sts)",
    ]);
  });

  it("prints a cast-on line derived from the chart, not from prose", () => {
    const instructions = chartToInstructions(chart);
    expect(instructions.castOn).toBe(8);
    expect(instructions.text.split("\n")[0]).toBe("Cast on 8 sts.");
  });

  it("carries machine-readable counts on every row", () => {
    for (const row of chartToInstructions(chart).rows) {
      expect(row.stitchesBefore).toBe(8);
      expect(row.stitchesAfter).toBe(8);
    }
  });
});

describe("reading direction", () => {
  it("reads a RS row from the right, so an edge stitch on the left is written last", () => {
    // Chart reads (left to right): yo p p p. On the RS the yo is worked LAST.
    const chart = rows(
      createChart({ id: "d", craft: "knitting", width: 4, height: 1, colors: ["#fff"] }),
      [["yo", "p", "p", "p"]],
    );
    expect(chartToInstructions(chart).rows[0].body).toBe("p3, yo");
  });

  it("reads a WS row from the left, so the same chart row reverses", () => {
    const chart = rows(
      createChart({
        id: "d",
        craft: "knitting",
        width: 4,
        height: 1,
        colors: ["#fff"],
        startSide: "WS",
      }),
      [["yo", "p", "p", "p"]],
    );
    // Same cells, worked from the other end, and "p" on a WS row is knitted.
    expect(chartToInstructions(chart).rows[0].body).toBe("yo, k3");
  });

  it("numbers in-the-round charts as rounds and never labels one WS", () => {
    const chart = createChart({
      id: "r",
      craft: "knitting",
      width: 4,
      height: 2,
      colors: ["#fff"],
      worked: "round",
    });
    expect(chartToInstructions(chart).rows.map((r) => r.label)).toEqual(["Rnd 1", "Rnd 2"]);
  });
});

describe("RS/WS meaning", () => {
  it("writes the same lace row differently on each side", () => {
    const spec = ["ssk", "yo", "k", "k2tog", "yo", "k"];
    const rs = rows(
      createChart({ id: "l", craft: "knitting", width: 6, height: 1, colors: ["#fff"] }),
      [spec],
    );
    const ws = rows(
      createChart({
        id: "l",
        craft: "knitting",
        width: 6,
        height: 1,
        colors: ["#fff"],
        startSide: "WS",
      }),
      [spec],
    );
    expect(chartToInstructions(rs).rows[0].body).toBe("k1, yo, k2tog, k1, yo, ssk");
    expect(chartToInstructions(ws).rows[0].body).toBe("ssp, yo, p1, p2tog, yo, p1");
  });
});

describe("run-length compression", () => {
  it("writes k2, p2 rather than k, k, p, p", () => {
    const chart = rows(
      createChart({ id: "rib", craft: "knitting", width: 8, height: 1, colors: ["#fff"] }),
      [["k", "k", "p", "p", "k", "k", "p", "p"]],
    );
    expect(chartToInstructions(chart).rows[0].body).toBe("p2, k2, p2, k2");
  });

  it("brackets repeated compound stitches instead of counting them", () => {
    const chart = rows(
      createChart({ id: "dec", craft: "knitting", width: 6, height: 1, colors: ["#fff"] }),
      [["k", "k", "k2tog", "k2tog", "k2tog", "k"]],
    );
    expect(chartToInstructions(chart).rows[0].body).toBe("k1, [k2tog] 3 times, k2");
  });

  it("says twice rather than 2 times", () => {
    const chart = rows(
      createChart({ id: "dec", craft: "knitting", width: 4, height: 1, colors: ["#fff"] }),
      [["k", "yo", "yo", "k"]],
    );
    expect(chartToInstructions(chart).rows[0].body).toBe("k1, [yo] twice, k1");
  });

  it("breaks a run when the colour changes, and names the colours", () => {
    let chart = rows(
      createChart({ id: "fair", craft: "knitting", width: 4, height: 1, colors: ["#fff", "#111"] }),
      [["k", "k", "k", "k"]],
    );
    chart = unwrap(setColor(chart, 0, 0, 1));
    chart = unwrap(setColor(chart, 0, 1, 1));
    const body = chartToInstructions(chart, { colorNames: ["MC", "CC"] }).rows[0].body;
    // Read from the right: two stitches in MC, then two in CC.
    expect(body).toBe("k2 in MC, k2 in CC");
  });

  it("leaves colour out of the prose when no names are supplied", () => {
    let chart = rows(
      createChart({ id: "fair", craft: "knitting", width: 4, height: 1, colors: ["#fff", "#111"] }),
      [["k", "k", "k", "k"]],
    );
    chart = unwrap(setColor(chart, 0, 0, 1));
    expect(chartToInstructions(chart).rows[0].body).toBe("k3, k1");
  });
});

describe("no-stitch cells", () => {
  it("are skipped in the prose and excluded from the count", () => {
    const chart = rows(
      createChart({ id: "shape", craft: "knitting", width: 5, height: 1, colors: ["#fff"] }),
      [["nostitch", "k", "k", "k", "nostitch"]],
    );
    expect(chartToInstructions(chart).rows[0].text).toBe("Row 1 (RS): k3. (3 sts)");
  });
});

describe("repeat boxes", () => {
  it("collapses the repeat into star notation with the remaining stitch count", () => {
    let chart = rows(
      createChart({ id: "rep", craft: "knitting", width: 8, height: 1, colors: ["#fff"] }),
      [["k", "k", "p", "k", "p", "k", "k", "k"]],
    );
    chart = unwrap(
      addRepeatBox(chart, { id: "r1", startCol: 2, endCol: 5, startRow: 0, endRow: 0 }),
    );
    // RS reading order: k3 (cols 7..5 are outside on the right — col 5 is inside,
    // so the edge before the repeat is cols 7 and 6), then the box, then cols 1,0.
    expect(chartToInstructions(chart).rows[0].body).toBe(
      "k2, *k1, p1, k1, p1; rep from * to last 2 sts, k2",
    );
  });

  it("says rep from * to end when the box covers the whole row", () => {
    let chart = rows(
      createChart({ id: "rep", craft: "knitting", width: 4, height: 1, colors: ["#fff"] }),
      [["k", "p", "k", "p"]],
    );
    chart = unwrap(
      addRepeatBox(chart, { id: "r1", startCol: 0, endCol: 3, startRow: 0, endRow: 0 }),
    );
    expect(chartToInstructions(chart).rows[0].body).toBe("*p1, k1, p1, k1; rep from * to end");
  });
});

describe("crochet", () => {
  it("uses crochet counting conventions and a foundation chain", () => {
    const chart = rows(
      createChart({ id: "c", craft: "crocheting", width: 6, height: 1, colors: ["#fff"] }),
      [["ch", "dc", "dc", "dc", "sc", "sc"]],
    );
    const instructions = chartToInstructions(chart);
    expect(instructions.castOnText).toBe("Foundation: ch 5.");
    // Read from the right: 2 sc, 3 dc, then the turning chain.
    expect(instructions.rows[0].text).toBe("Row 1 (RS): 2 sc, 3 dc, ch 1. (6 sts)");
  });

  it("counts a cluster as three stitches in and one out", () => {
    const chart = rows(
      createChart({ id: "c", craft: "crocheting", width: 5, height: 1, colors: ["#fff"] }),
      [["cl3", "sc", "sc"]],
    );
    const row = chartToInstructions(chart).rows[0];
    expect(row.stitchesBefore).toBe(5);
    expect(row.stitchesAfter).toBe(3);
    expect(row.body).toBe("2 sc, cl");
  });
});
