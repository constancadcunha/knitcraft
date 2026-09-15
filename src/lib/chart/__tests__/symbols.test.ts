import { describe, expect, it } from "vitest";
import {
  ART_CELL,
  allSymbols,
  getSymbol,
  plainSymbolId,
  symbolArtRects,
  symbolsForCraft,
  workedForm,
} from "../symbols";

describe("catalogue integrity", () => {
  it("has unique ids and well-formed artwork", () => {
    const ids = new Set<string>();
    for (const symbol of allSymbols()) {
      expect(ids.has(symbol.id), `duplicate id ${symbol.id}`).toBe(false);
      ids.add(symbol.id);
      expect(symbol.width, symbol.id).toBeGreaterThanOrEqual(1);
      expect(symbol.art.width, symbol.id).toBe(symbol.width);
      expect(symbol.art.cols, symbol.id).toBe(ART_CELL * symbol.width);
      expect(symbol.art.pixels.length, symbol.id).toBe(ART_CELL);
      for (const row of symbol.art.pixels) expect(row.length, symbol.id).toBe(symbol.art.cols);
    }
  });

  it("declares stitch arithmetic for every symbol", () => {
    for (const symbol of allSymbols()) {
      expect(Number.isInteger(symbol.stitchesConsumed), symbol.id).toBe(true);
      expect(Number.isInteger(symbol.stitchesProduced), symbol.id).toBe(true);
      expect(symbol.stitchesConsumed, symbol.id).toBeGreaterThanOrEqual(0);
      expect(symbol.stitchesProduced, symbol.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps craft filtering honest — no-stitch is available to both crafts", () => {
    const knit = symbolsForCraft("knitting").map((s) => s.id);
    const crochet = symbolsForCraft("crocheting").map((s) => s.id);
    expect(knit).toContain("2/2 RC");
    expect(knit).not.toContain("dc");
    expect(crochet).toContain("dc");
    expect(crochet).not.toContain("k2tog");
    expect(knit).toContain("nostitch");
    expect(crochet).toContain("nostitch");
  });

  it("resolves the plain stitch per craft", () => {
    expect(plainSymbolId("knitting")).toBe("k");
    expect(plainSymbolId("crocheting")).toBe("sc");
  });
});

describe("RS/WS pairing", () => {
  it("flips the basic knit/purl pair", () => {
    const k = getSymbol("k")!;
    expect(workedForm(k, "RS").abbr).toBe("k");
    expect(workedForm(k, "WS").abbr).toBe("p");
    const p = getSymbol("p")!;
    expect(workedForm(p, "RS").abbr).toBe("p");
    expect(workedForm(p, "WS").abbr).toBe("k");
  });

  it("flips decreases to their purl-side equivalents", () => {
    expect(workedForm(getSymbol("k2tog")!, "WS").abbr).toBe("p2tog");
    expect(workedForm(getSymbol("ssk")!, "WS").abbr).toBe("ssp");
    expect(workedForm(getSymbol("k3tog")!, "WS").abbr).toBe("p3tog");
    expect(workedForm(getSymbol("sssk")!, "WS").abbr).toBe("sssp");
  });

  it("keeps yarn overs identical on both sides", () => {
    const yo = getSymbol("yo")!;
    expect(workedForm(yo, "RS").abbr).toBe(workedForm(yo, "WS").abbr);
  });

  it("moves the slipped-stitch yarn to whichever side is the wrong side", () => {
    const sl = getSymbol("sl1")!;
    expect(workedForm(sl, "RS").abbr).toBe("sl1 wyib");
    expect(workedForm(sl, "WS").abbr).toBe("sl1 wyif");
  });

  it("swaps front and back post crochet, which are relative to the working side", () => {
    expect(workedForm(getSymbol("fpdc")!, "RS").abbr).toBe("FPdc");
    expect(workedForm(getSymbol("fpdc")!, "WS").abbr).toBe("BPdc");
    expect(workedForm(getSymbol("bpdc")!, "WS").abbr).toBe("FPdc");
  });
});

describe("cables", () => {
  it("consumes, produces and spans the same number of cells", () => {
    for (const symbol of allSymbols().filter((s) => s.cable)) {
      const total = symbol.cable!.front + symbol.cable!.back;
      expect(symbol.width, symbol.id).toBe(total);
      expect(symbol.stitchesConsumed, symbol.id).toBe(total);
      expect(symbol.stitchesProduced, symbol.id).toBe(total);
    }
  });

  it("names the front group first: 2/1 LC holds two stitches at the front", () => {
    const lc = getSymbol("2/1 LC")!;
    expect(lc.cable).toEqual({ front: 2, back: 1, cross: "left", purledBackground: false });
    expect(lc.rs.instruction).toBe(
      "slip 2 stitches to a cable needle and hold at the front, k1, then k2 from the cable needle",
    );
  });

  it("holds at the back on RS and at the front on WS for a right cross", () => {
    // Looking at the back of the fabric, holding the cable needle at the FRONT
    // is what puts those stitches behind on the right side.
    const rc = getSymbol("2/2 RC")!;
    expect(rc.rs.instruction).toBe(
      "slip 2 stitches to a cable needle and hold at the back, k2, then k2 from the cable needle",
    );
    expect(rc.ws.instruction).toBe(
      "slip 2 stitches to a cable needle and hold at the front, p2, then p2 from the cable needle",
    );
  });

  it("purls the background group of a P variant, and knits it from the wrong side", () => {
    const rpc = getSymbol("2/1 RPC")!;
    expect(rpc.rs.instruction).toBe(
      "slip 1 stitch to a cable needle and hold at the back, k2, then p1 from the cable needle",
    );
    expect(rpc.ws.instruction).toBe(
      "slip 1 stitch to a cable needle and hold at the front, p2, then k1 from the cable needle",
    );
  });

  it("covers the full crossing vocabulary the editor needs", () => {
    for (const id of [
      "1/1 RC",
      "1/1 LC",
      "2/1 RC",
      "2/1 LC",
      "2/1 RPC",
      "2/1 LPC",
      "2/2 RC",
      "2/2 LC",
      "3/3 RC",
      "3/3 LC",
    ]) {
      expect(getSymbol(id), id).toBeDefined();
    }
  });
});

describe("artwork geometry", () => {
  it("merges horizontal runs into rectangles", () => {
    const purl = getSymbol("p")!;
    const rects = symbolArtRects(purl.art);
    // The purl bar is two solid 7-wide rows, so it merges to two rectangles.
    expect(rects).toEqual([
      { x: 1, y: 4, w: 7, h: 1, ink: "ink" },
      { x: 1, y: 5, w: 7, h: 1, ink: "ink" },
    ]);
  });

  it("draws a cable wide enough to cross all of its cells", () => {
    const rc = getSymbol("2/2 RC")!;
    const rects = symbolArtRects(rc.art);
    expect(rects.length).toBeGreaterThan(0);
    expect(Math.max(...rects.map((r) => r.x + r.w))).toBeGreaterThan(ART_CELL * 3);
    // Both strands are inked: the one in front, and the broken one behind.
    expect(new Set(rects.map((r) => r.ink))).toEqual(new Set(["ink", "accent"]));
  });

  it("shades the no-stitch cell rather than inking it", () => {
    const rects = symbolArtRects(getSymbol("nostitch")!.art);
    expect(rects.every((r) => r.ink === "shade")).toBe(true);
  });
});
