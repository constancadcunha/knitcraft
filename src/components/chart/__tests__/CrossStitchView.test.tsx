import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CrossStitchView from "../CrossStitchView";
import {
  addBackstitch,
  addFrenchKnot,
  createCrossStitchChart,
  setStitch,
  type FlossColour,
} from "@/lib/crossstitch";

const PALETTE: FlossColour[] = [
  { code: "310", name: "Black", hex: "#000000", symbol: "X" },
  { code: "BLANC", name: "White", hex: "#ffffff", symbol: "o" },
];

function sample() {
  let chart = createCrossStitchChart({
    id: "s",
    width: 12,
    height: 12,
    palette: PALETTE,
  });
  chart = setStitch(chart, 0, 0, 0);
  chart = setStitch(chart, 1, 0, 1);
  chart = setStitch(chart, 2, 0, 0, "half");
  chart = addBackstitch(chart, { from: { x: 0, y: 1 }, to: { x: 12, y: 1 }, colour: 0 });
  chart = addFrenchKnot(chart, { at: { x: 3, y: 3 }, colour: 1 });
  return chart;
}

describe("CrossStitchView", () => {
  it("renders to svg", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} />);
    expect(html).toContain("<svg");
  });

  it("reads top-down: row 0 is drawn at the top", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={16} />);
    // The first stitched cell is at row 0, so its rect must sit at y=0.
    expect(html).toContain('y="0"');
  });

  it("draws a part stitch as a path, not a full square", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} />);
    expect(html).toContain("<path");
  });

  it("puts a symbol in every stitched cell so the chart works in black and white", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={16} />);
    expect(html).toContain(">X</text>");
    expect(html).toContain(">o</text>");
  });

  it("picks a legible symbol colour against the floss", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={16} />);
    // White symbol on black floss, dark symbol on white floss.
    expect(html).toContain('fill="#ffffff"');
    expect(html).toContain('fill="#1f1b2e"');
  });

  it("drops symbols when the cells are too small to hold them", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={6} />);
    expect(html).not.toContain("</text>");
  });

  it("draws backstitch on the hole grid, reaching the far edge", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={16} />);
    // Hole x=12 on a 12-cell chart is the right-hand edge at 12 * 16 = 192.
    expect(html).toContain('x2="192"');
  });

  it("draws French knots on an intersection", () => {
    const html = renderToStaticMarkup(<CrossStitchView chart={sample()} cellSize={16} />);
    expect(html).toContain("<circle");
    expect(html).toContain('cx="48"'); // hole x=3 at 3 * 16
  });

  it("knocks back completed stitches", () => {
    const chart = sample();
    const plain = renderToStaticMarkup(<CrossStitchView chart={chart} />);
    const marked = renderToStaticMarkup(
      <CrossStitchView chart={chart} completed={{ "0,0": true }} />
    );
    expect(marked).not.toEqual(plain);
  });
});
