import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  PixelCanvas,
  knitV,
  purlBump,
  type DiagramPalette,
} from "../primitives";
import { hexLiterals, xmlProblems } from "./xml";

const HEX_PALETTE: DiagramPalette = {
  ink: "#111111",
  paper: "#ffffff",
  grid: "#cccccc",
  yarn: "#2f6fd0",
  yarnAlt: "#e2483d",
  highlight: "#f2b53c",
  tool: "#8e87a3",
  text: "#1f1b2e",
};

describe("PixelCanvas", () => {
  it("rejects nonsense dimensions rather than emitting a broken viewBox", () => {
    expect(() => new PixelCanvas(0, 10)).toThrow();
    expect(() => new PixelCanvas(10, 2.5)).toThrow();
  });

  it("emits a crisp-edged svg with an integer viewBox", () => {
    const cv = new PixelCanvas(20, 10, { title: "a test" });
    cv.px(1, 1, "ink");
    const svg = cv.toSVG();
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('viewBox="0 0 20 10"');
    expect(svg).toContain("<title>a test</title>");
    expect(xmlProblems(svg)).toEqual([]);
  });

  it("merges a run of cells into one subpath instead of one per cell", () => {
    const cv = new PixelCanvas(20, 4);
    cv.hline(2, 1, 6, "ink");
    const svg = cv.toSVG(HEX_PALETTE);
    expect(svg).toContain('d="M2 1h6v1z"');
    // One path element, not six rects.
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it("drops out-of-bounds writes so an overshooting rasteriser cannot corrupt a drawing", () => {
    const cv = new PixelCanvas(8, 8);
    cv.px(-4, 2, "ink");
    cv.px(2, 99, "ink");
    cv.line(-20, 4, 40, 4, "ink");
    const svg = cv.toSVG(HEX_PALETTE);
    expect(svg).toContain('d="M0 4h8v1z"');
    expect(svg).not.toContain("-4");
  });

  it("erase cuts a real hole through everything already drawn", () => {
    const cv = new PixelCanvas(10, 10);
    cv.rect(0, 0, 10, 10, "yarn");
    cv.erase(3, 3, 4, 4);
    const svg = cv.toSVG(HEX_PALETTE);
    // The rows either side of the hole must be split into two runs. Runs are
    // merged vertically, so the hole appears as two tall rectangles flanking
    // it rather than one rectangle per row.
    expect(svg).toContain("M0 3h3v4z");
    expect(svg).toContain("M7 3h3v4z");
    // Nothing may be painted inside the hole itself.
    expect(svg).not.toContain("M3 3");
    expect(svg).not.toContain("M4 4");
  });

  it("bakes no colour until emit time, so one drawing serves every theme", () => {
    const cv = new PixelCanvas(10, 10);
    cv.rect(1, 1, 3, 3, "yarn");
    expect(cv.toSVG(HEX_PALETTE)).toContain('fill="#2f6fd0"');
    expect(cv.toSVG({ ...HEX_PALETTE, yarn: "rebeccapurple" })).toContain('fill="rebeccapurple"');
  });

  it("skips fills whose palette entry is \"none\" rather than emitting dead bytes", () => {
    const cv = new PixelCanvas(10, 10);
    cv.fill("paper");
    expect(cv.toSVG(DEFAULT_PALETTE)).not.toContain("<path");
  });

  it("emits no hex literal at all under the default palette", () => {
    const cv = new PixelCanvas(20, 20, { title: "theme safety" });
    for (const key of PALETTE_KEYS) cv.px(1, PALETTE_KEYS.indexOf(key), key);
    cv.text(2, 18, "label");
    expect(hexLiterals(cv.toSVG(DEFAULT_PALETTE))).toEqual([]);
  });

  it("escapes text and titles", () => {
    const cv = new PixelCanvas(20, 20, { title: 'k2tog & "ssk" <both>' });
    cv.text(1, 10, "1 < 2 & 3");
    const svg = cv.toSVG();
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&lt;");
    expect(xmlProblems(svg)).toEqual([]);
  });

  it("draws a knit V with its point at the bottom, and leans it on request", () => {
    const plain = new PixelCanvas(20, 10);
    knitV(plain, 0, 0, "yarn");
    const leaning = new PixelCanvas(20, 10);
    knitV(leaning, 0, 0, "yarn", { lean: 2 });
    // A leaned V is a different drawing — this is what separates k2tog from ssk.
    expect(plain.toSVG(HEX_PALETTE)).not.toEqual(leaning.toSVG(HEX_PALETTE));
    // The apex sits on the bottom row of the motif.
    expect(plain.toSVG(HEX_PALETTE)).toContain("M3 5h1v1z");
  });

  it("draws a purl bump that is not a knit V", () => {
    const v = new PixelCanvas(20, 10);
    knitV(v, 0, 0, "yarn");
    const bump = new PixelCanvas(20, 10);
    purlBump(bump, 0, 0, "yarn");
    expect(v.toSVG(HEX_PALETTE)).not.toEqual(bump.toSVG(HEX_PALETTE));
  });

  it("keeps a whole fabric of stitches under a few kilobytes", () => {
    const cv = new PixelCanvas(56, 42);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) knitV(cv, c * 8, r * 7, "yarn");
    expect(cv.toSVG(DEFAULT_PALETTE).length).toBeLessThan(4096);
  });
});
