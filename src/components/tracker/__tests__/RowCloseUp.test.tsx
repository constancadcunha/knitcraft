import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createChart, fillRow, type SymbolChart } from "@/lib/chart";
import RowCloseUp from "../RowCloseUp";

/** One row: a purl at the far LEFT column, knits everywhere else. */
function panel(startSide: "RS" | "WS"): SymbolChart {
  let chart = createChart({ id: "t", craft: "knitting", width: 8, height: 2 });
  chart = { ...chart, startSide };
  for (let row = 0; row < 2; row += 1) {
    const filled = fillRow(chart, row, ["p", "k", "k", "k", "k", "k", "k", "k"]);
    if (!filled.ok) throw new Error(filled.error.message);
    chart = filled.value;
  }
  return chart;
}

/** How many stitch tiles precede the one being worked, in drawn order. */
function tilesBeforeCurrent(html: string): number {
  const cut = html.indexOf('data-current="true"');
  // The current tile's own <li> opens before the attribute, so it is not one
  // of the tiles BEFORE it.
  return html.slice(0, cut).split("<li").length - 2;
}

describe("RowCloseUp", () => {
  it("prints the abbreviation for the side actually being worked", () => {
    const rs = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={0} stitchesDone={0} />
    );
    // A knit symbol on a wrong-side row is WORKED as a purl, and saying "K"
    // there is how a knitter ends up with a ridge across their stockinette.
    const ws = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={1} stitchesDone={0} />
    );
    expect(rs).toContain(">K<");
    expect(rs).toContain("Right side");
    expect(ws).toContain(">P<");
    expect(ws).toContain("Wrong side");
  });

  it("starts a right-side row at the right-hand end and a wrong-side row at the left", () => {
    const rs = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={0} stitchesDone={0} />
    );
    const ws = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={1} stitchesDone={0} />
    );
    // Both are drawn in chart-column order; only the first stitch WORKED moves.
    expect(rs).toContain("read right to left");
    expect(tilesBeforeCurrent(rs)).toBe(7);
    expect(ws).toContain("read left to right");
    expect(tilesBeforeCurrent(ws)).toBe(0);
  });

  it("marks the stitch being worked and counts the ones behind it", () => {
    const html = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={0} stitchesDone={3} />
    );
    expect(html).toContain("Now");
    expect(html).toContain("3 of 8 worked");
    expect(html).toContain("stitch 4 of 8");
    expect(tilesBeforeCurrent(html)).toBe(4);
  });

  it("says the row is finished rather than pointing at a stitch that is not there", () => {
    const html = renderToStaticMarkup(
      <RowCloseUp chart={panel("RS")} rowIndex={0} stitchesDone={8} />
    );
    expect(html).toContain("Row complete");
    expect(html).not.toContain("Next stitch");
  });

  it("draws each stitch in its own yarn colour", () => {
    let chart = panel("RS");
    chart = { ...chart, colors: ["#111111", "#eeeeee"] };
    chart.rows[0][3] = { ...chart.rows[0][3], colorIndex: 1 };
    const html = renderToStaticMarkup(
      <RowCloseUp chart={chart} rowIndex={0} stitchesDone={0} />
    );
    expect(html).toContain("#111111");
    expect(html).toContain("#eeeeee");
  });
});
