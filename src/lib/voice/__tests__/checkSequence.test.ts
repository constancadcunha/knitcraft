import { describe, expect, it } from "vitest";
import { checkSequence } from "../checkSequence";
import { parseStitchSequence } from "../stitchWords";
import { createChart, fillRow, placeSymbol, type SymbolChart } from "@/lib/chart";

/** Row 1 (RS) reads k2, p2, k2, p2 from the RIGHT. */
function ribChart(): SymbolChart {
  let chart = createChart({ id: "r", craft: "knitting", width: 8, height: 2 });
  for (let row = 0; row < 2; row += 1) {
    const filled = fillRow(chart, row, ["k", "k", "p", "p", "k", "k", "p", "p"]);
    if (!filled.ok) throw new Error(filled.error.message);
    chart = filled.value;
  }
  return chart;
}

function say(text: string) {
  return parseStitchSequence(text, "knitting") ?? [];
}

describe("checkSequence", () => {
  it("accepts stitches that match the chart", () => {
    const chart = ribChart();
    // Reading a RS row right-to-left: p, p, k, k, p, p, k, k
    const result = checkSequence(chart, 0, 0, say("purl purl knit knit"));
    expect(result.checked).toBe(true);
    expect(result.ok, JSON.stringify(result.comparisons)).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("reports the first stitch that diverges, with its position", () => {
    const chart = ribChart();
    // Third stitch should be a knit; say purl instead.
    const result = checkSequence(chart, 0, 0, say("purl purl purl"));
    expect(result.ok).toBe(false);
    expect(result.firstMismatch?.position).toBe(2);
    expect(result.message).toContain("Stitch 3");
    expect(result.message).toContain("should be k");
  });

  it("starts from where the knitter actually is", () => {
    const chart = ribChart();
    // Two stitches already worked, so this begins at position 2: k, k.
    const result = checkSequence(chart, 0, 2, say("knit knit"));
    expect(result.ok).toBe(true);
    expect(result.comparisons[0].position).toBe(2);
  });

  it("flips meaning on a wrong-side row", () => {
    const chart = ribChart();
    // Row 2 is a WS row. A cell charted as "k" is PURLED when worked from the
    // wrong side, so saying "knit" there is wrong.
    const asPurl = checkSequence(chart, 1, 0, say("purl purl"));
    const asKnit = checkSequence(chart, 1, 0, say("knit knit"));
    expect(asPurl.ok).not.toEqual(asKnit.ok);
  });

  it("lets a cable occupy all the stitches it consumes", () => {
    let chart = createChart({ id: "c", craft: "knitting", width: 8, height: 1 });
    const filled = fillRow(chart, 0, ["p", "p", "k", "k", "k", "k", "p", "p"]);
    if (!filled.ok) throw new Error(filled.error.message);
    chart = filled.value;
    const crossed = placeSymbol(chart, 0, 2, "2/2 RC");
    if (!crossed.ok) throw new Error(crossed.error.message);

    // Reading from the right: p, p, then the 4-stitch cable.
    const result = checkSequence(crossed.value, 0, 2, say("cable cable cable cable"));
    expect(result.comparisons).toHaveLength(4);
    expect(result.ok, JSON.stringify(result.comparisons)).toBe(true);
  });

  it("stops at the end of the row rather than inventing stitches", () => {
    const chart = ribChart();
    const result = checkSequence(chart, 0, 6, say("purl purl knit knit"));
    // Only two stitches remain in an 8-stitch row.
    expect(result.comparisons).toHaveLength(2);
  });

  it("says nothing when there is nothing to check", () => {
    const chart = ribChart();
    expect(checkSequence(chart, 0, 0, []).checked).toBe(false);
    expect(checkSequence(chart, 0, 99, say("knit")).checked).toBe(false);
  });

  it("never blocks: a mismatch is still reported as comparisons, not an error", () => {
    // The caller must be free to advance the count anyway — a knitter
    // deviating on purpose, or a recogniser mishearing, must not be stopped.
    const chart = ribChart();
    const result = checkSequence(chart, 0, 0, say("knit knit knit knit"));
    expect(result.comparisons).toHaveLength(4);
    expect(result.ok).toBe(false);
  });
});
