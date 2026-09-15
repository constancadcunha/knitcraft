import { describe, expect, it } from "vitest";
import { type SymbolChart, createChart, fillRow, setColor } from "../model";
import { buildAbbreviationList, buildLegend, buildSymbolLegend } from "../legend";

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function chartOf(
  width: number,
  height: number,
  specs: (string | undefined)[][],
  overrides: Partial<Parameters<typeof createChart>[0]> = {},
): SymbolChart {
  const base = createChart({
    id: "l",
    craft: "knitting",
    width,
    height,
    colors: ["#faf7f2", "#2e1f14"],
    ...overrides,
  });
  return specs.reduce((acc, spec, index) => unwrap(fillRow(acc, index, spec)), base);
}

describe("legend derivation", () => {
  it("lists exactly the symbols the chart uses, and nothing else", () => {
    const chart = chartOf(8, 2, [
      ["p", "p", "k", "k", "k", "k", "p", "p"],
      ["p", "p", "2/2 RC", "p", "p"],
    ]);
    const legend = buildSymbolLegend(chart);
    expect(legend.map((e) => e.symbolId)).toEqual(["p", "k", "2/2 RC"]);
    expect(legend.find((e) => e.symbolId === "yo")).toBeUndefined();
  });

  it("counts a 4-cell crossing once per crossing, not once per cell", () => {
    const chart = chartOf(8, 1, [["p", "p", "2/2 RC", "p", "p"]]);
    const cable = buildSymbolLegend(chart).find((e) => e.symbolId === "2/2 RC");
    expect(cable?.usageCount).toBe(1);
    expect(cable?.width).toBe(4);
    expect(buildSymbolLegend(chart).find((e) => e.symbolId === "p")?.usageCount).toBe(4);
  });

  it("orders basics before cables", () => {
    const chart = chartOf(8, 1, [["2/2 RC", "yo", "k", "k", "k"]]);
    expect(buildSymbolLegend(chart).map((e) => e.category)).toEqual([
      "basic",
      "increase",
      "cable",
    ]);
  });

  it("states both workings when a flat chart uses a symbol on both sides", () => {
    const chart = chartOf(2, 2, [["k", "k"], ["k", "k"]]);
    const knit = buildSymbolLegend(chart)[0];
    expect(knit.description).toBe("RS: k — knit. WS: p — purl.");
  });

  it("states only the right-side working when the symbol is only used there", () => {
    const chart = chartOf(2, 2, [["yo", "k"], ["k", "k"]]);
    const yo = buildSymbolLegend(chart).find((e) => e.symbolId === "yo");
    // yo reads the same on both sides, so no side qualifier is needed at all.
    expect(yo?.description).toBe("yarn over");
    const knit = buildSymbolLegend(chart).find((e) => e.symbolId === "k");
    expect(knit?.description).toContain("WS: p");
  });

  it("drops the wrong-side working entirely for a chart worked in the round", () => {
    const chart = chartOf(2, 2, [["k", "k"], ["k", "k"]], { worked: "round" });
    expect(buildSymbolLegend(chart)[0].description).toBe("knit");
  });

  it("honours a per-chart label override", () => {
    const base = chartOf(6, 1, [["2/2 RC", "k", "k"]]);
    const chart: SymbolChart = { ...base, legendOverrides: { "2/2 RC": "Rope cable" } };
    expect(buildSymbolLegend(chart)[1].label).toBe("Rope cable");
  });

  it("derives colour entries from the cells actually painted", () => {
    let chart = chartOf(4, 1, [["k", "k", "k", "k"]]);
    chart = unwrap(setColor(chart, 0, 0, 1));
    const legend = buildLegend(chart);
    expect(legend.colors).toEqual([
      { colorIndex: 0, color: "#faf7f2", label: "Colour 1", usageCount: 3 },
      { colorIndex: 1, color: "#2e1f14", label: "Colour 2", usageCount: 1 },
    ]);
  });
});

describe("abbreviation list", () => {
  it("contains every abbreviation the instructions will use, per side", () => {
    const chart = chartOf(4, 2, [
      ["k", "k", "k", "k"],
      ["yo", "k2tog", "k", "k"],
    ]);
    // Row 1 is RS (k), row 2 is WS (so its k2tog is written p2tog and its k is p).
    expect(buildAbbreviationList(chart).map((a) => a.abbr)).toEqual(["k", "p", "p2tog", "yo"]);
  });

  it("never lists the no-stitch placeholder, which is not an instruction", () => {
    const chart = chartOf(3, 1, [["nostitch", "k", "k"]]);
    expect(buildAbbreviationList(chart).map((a) => a.abbr)).toEqual(["k"]);
  });
});
