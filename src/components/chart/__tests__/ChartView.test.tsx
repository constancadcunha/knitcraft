import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ChartView from "../ChartView";
import { createChart, fillRow, placeSymbol, rowGroups } from "@/lib/chart";

function cableChart() {
  // A 4-row panel: purl background with a 2/2 right cross in the middle.
  let chart = createChart({ id: "t", craft: "knitting", width: 8, height: 4 });
  for (let row = 0; row < 4; row += 1) {
    const filled = fillRow(chart, row, ["p", "p", "k", "k", "k", "k", "p", "p"]);
    if (!filled.ok) throw new Error(filled.error.message);
    chart = filled.value;
  }
  const crossed = placeSymbol(chart, 2, 2, "2/2 RC");
  if (!crossed.ok) throw new Error(crossed.error.message);
  return crossed.value;
}

describe("ChartView", () => {
  it("renders a chart to svg", () => {
    const html = renderToStaticMarkup(<ChartView chart={cableChart()} />);
    expect(html).toContain("<svg");
    expect(html).toContain('shape-rendering="crispEdges"');
  });

  it("draws a 2/2 cable as ONE glyph four cells wide, not four half-cables", () => {
    const chart = cableChart();
    const groups = rowGroups(chart, 2);
    const cable = groups.find((g) => g.symbolId === "2/2 RC");

    expect(cable, "the cable must survive placement").toBeDefined();
    expect(cable?.width).toBe(4);
    // Row 2 covers 8 columns as FIVE groups: p, p, [cable spanning 4], p, p.
    // The cable being one group rather than four is the whole point.
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => g.width)).toEqual([1, 1, 4, 1, 1]);
  });

  it("puts row 1 at the bottom, as on real chart paper", () => {
    const chart = cableChart();
    const html = renderToStaticMarkup(<ChartView chart={chart} cellSize={20} />);
    // Row 1 (rows[0]) must be drawn at the largest y.
    // Pull the y of each row-number label straight out of its <text> element.
    const yOfLabel = (label: string) => {
      const re = new RegExp(`<text[^>]*\\by="([0-9.]+)"[^>]*>${label}</text>`);
      const m = html.match(re);
      if (!m) throw new Error(`no row label ${label} in output`);
      return Number.parseFloat(m[1]);
    };
    // Larger y is further down the page, and row 1 belongs at the bottom.
    expect(yOfLabel("1")).toBeGreaterThan(yOfLabel("4"));
  });

  it("bakes no hex colours of its own — chart colours come from the chart", () => {
    const html = renderToStaticMarkup(<ChartView chart={cableChart()} />);
    const hexes = html.match(/#[0-9a-fA-F]{6}/g) ?? [];
    // Any hex present must be one the chart itself declares as a yarn colour.
    const chartColours = cableChart().colors.map((c) => c.toLowerCase());
    for (const hex of hexes) expect(chartColours).toContain(hex.toLowerCase());
  });

  it("knocks back cells that are already worked", () => {
    const chart = cableChart();
    const plain = renderToStaticMarkup(<ChartView chart={chart} />);
    const marked = renderToStaticMarkup(
      <ChartView chart={chart} completed={{ "0,0": true }} />
    );
    expect(marked).not.toEqual(plain);
    expect(marked).toContain("0.3");
  });
});
