import { describe, expect, it } from "vitest";
import { applyMotif, type MotifKind } from "../index";
import {
  createChart,
  isChartValid,
  rowGroups,
  usedSymbolIds,
  validateChart,
  type ChartCraft,
} from "@/lib/chart";

const PALETTE = ["#fffdf6", "#e2483d", "#2f6fd0"];

function blank(craft: ChartCraft = "knitting", width = 24, height = 24) {
  return createChart({ id: "m", name: "Test", craft, width, height, colors: PALETTE.slice() });
}

const KINDS: MotifKind[] = ["colourwork", "cable", "lace", "texture"];

describe("every motif produces a workable chart", () => {
  it.each(KINDS)("%s validates for knitting", (kind) => {
    const result = applyMotif(blank(), { kind, palette: PALETTE, seed: "seed" });
    expect(result.applied, result.reason).toBe(true);
    const report = validateChart(result.chart);
    expect(report.errors, JSON.stringify(report.errors)).toHaveLength(0);
  });

  it.each(KINDS)("%s validates for crochet", (kind) => {
    const result = applyMotif(blank("crocheting"), { kind, palette: PALETTE });
    expect(result.applied, result.reason).toBe(true);
    expect(isChartValid(result.chart)).toBe(true);
  });

  it("validates across a range of awkward chart sizes", () => {
    // Narrow charts must not produce a cable that runs off the edge.
    for (const width of [3, 5, 7, 8, 12, 31, 60]) {
      for (const height of [2, 5, 24, 41]) {
        for (const kind of KINDS) {
          const result = applyMotif(blank("knitting", width, height), { kind });
          expect(isChartValid(result.chart), `${kind} ${width}x${height}`).toBe(true);
        }
      }
    }
  });
});

describe("the motif actually reflects what was asked for", () => {
  it("cable puts real crossings on the chart", () => {
    const { chart, applied } = applyMotif(blank("knitting", 24, 24), { kind: "cable" });
    expect(applied).toBe(true);
    const ids = usedSymbolIds(chart);
    expect(ids.some((id) => id.includes("RC") || id.includes("LC"))).toBe(true);
  });

  it("cable crossings land on right-side rows, never wrong-side", () => {
    // Crossing on a WS row inverts the holding side and reads backwards.
    const { chart } = applyMotif(blank("knitting", 24, 24), { kind: "cable" });
    const warnings = validateChart(chart).warnings.filter((w) => w.code === "cable/wrong-side");
    expect(warnings).toHaveLength(0);
  });

  it("lace pairs every yarn-over with a decrease so the count holds", () => {
    const { chart } = applyMotif(blank("knitting", 24, 24), { kind: "lace" });
    const ids = usedSymbolIds(chart);
    expect(ids).toContain("yo");
    expect(ids).toContain("k2tog");
    for (let row = 0; row < chart.height; row += 1) {
      const groups = rowGroups(chart, row);
      const yo = groups.filter((g) => g.symbolId === "yo").length;
      const dec = groups.filter((g) => g.symbolId === "k2tog").length;
      expect(yo, `row ${row + 1}`).toBe(dec);
    }
  });

  it("texture mixes knit and purl rather than leaving flat fabric", () => {
    const { chart } = applyMotif(blank(), { kind: "texture" });
    const ids = usedSymbolIds(chart);
    expect(ids).toContain("k");
    expect(ids).toContain("p");
  });

  it("colourwork uses more than one colour but never changes the stitch count", () => {
    const { chart } = applyMotif(blank(), { kind: "colourwork", palette: PALETTE });
    const used = new Set<number>();
    for (const row of chart.rows) for (const cell of row) used.add(cell.colorIndex);
    expect(used.size).toBeGreaterThan(1);
    expect(isChartValid(chart)).toBe(true);
  });

  it("plain leaves the chart alone", () => {
    const input = blank();
    const result = applyMotif(input, { kind: "plain" });
    expect(result.applied).toBe(false);
    expect(result.chart).toBe(input);
  });
});

describe("determinism and safety", () => {
  it("redraws the same design identically", () => {
    const a = applyMotif(blank(), { kind: "colourwork", seed: "Emberwood Cable Beanie" });
    const b = applyMotif(blank(), { kind: "colourwork", seed: "Emberwood Cable Beanie" });
    expect(JSON.stringify(a.chart.rows)).toEqual(JSON.stringify(b.chart.rows));
  });

  it("different designs differ", () => {
    const a = applyMotif(blank(), { kind: "colourwork", seed: "one" });
    const b = applyMotif(blank(), { kind: "colourwork", seed: "four" });
    expect(JSON.stringify(a.chart.rows)).not.toEqual(JSON.stringify(b.chart.rows));
  });

  it("never mutates the chart it was given", () => {
    const input = blank();
    const before = JSON.stringify(input);
    applyMotif(input, { kind: "cable" });
    expect(JSON.stringify(input)).toBe(before);
  });

  it("takes the design's palette", () => {
    const { chart } = applyMotif(blank(), { kind: "colourwork", palette: ["#111111", "#222222"] });
    expect(chart.colors[0]).toBe("#111111");
  });
});
