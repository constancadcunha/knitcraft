import { describe, expect, it } from "vitest";
import { draftGarment } from "../index";
import type { GarmentKind } from "../types";

const KINDS: GarmentKind[] = [
  "sweater", "cardigan", "vest", "tankTop", "hat", "cowl", "scarf", "shawl",
  "socks", "mittens", "gloves", "headband", "legWarmers", "toteBag",
  "dishcloth", "babyBlanket", "throwBlanket", "other",
];

const CRAFTS = ["knitting", "crochet"] as const;
const SIZES = ["XS", "M", "3XL", "2-4yr", "One Size"];

describe("every garment drafts a real baseline", () => {
  // This is the regression test for the reported bug: choosing Cowl or Gloves
  // produced an empty grid with no baseline at all.
  it.each(KINDS)("%s produces at least one charted piece", (kind) => {
    for (const craft of CRAFTS) {
      const draft = draftGarment({ garment: kind, craft, size: "M" });
      expect(draft.pieces.length, `${kind}/${craft}`).toBeGreaterThan(0);
      for (const piece of draft.pieces) {
        expect(piece.chart.width, `${kind} ${piece.panel.name} width`).toBeGreaterThan(0);
        expect(piece.chart.height, `${kind} ${piece.panel.name} height`).toBeGreaterThan(0);
        expect(piece.chart.rows.length).toBe(piece.chart.height);
        expect(piece.chart.rows[0].length).toBe(piece.chart.width);
      }
    }
  });

  it("never produces a zero-stitch panel at any size", () => {
    for (const kind of KINDS) {
      for (const size of SIZES) {
        for (const craft of CRAFTS) {
          const draft = draftGarment({ garment: kind, craft, size });
          for (const piece of draft.pieces) {
            expect(piece.panel.stitches, `${kind}/${size}/${craft}`).toBeGreaterThan(0);
            expect(piece.panel.rows, `${kind}/${size}/${craft}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("gives every piece a distinct name so the editor can list them", () => {
    for (const kind of KINDS) {
      const names = draftGarment({ garment: kind, craft: "knitting", size: "M" })
        .pieces.map((p) => p.panel.name);
      expect(new Set(names).size, kind).toBe(names.length);
    }
  });
});

describe("counts follow the body, not a fixed table", () => {
  it("a bigger size means more stitches", () => {
    const small = draftGarment({ garment: "sweater", craft: "knitting", size: "XS" });
    const large = draftGarment({ garment: "sweater", craft: "knitting", size: "3XL" });
    const back = (d: typeof small) => d.pieces.find((p) => p.panel.name === "Back")!;
    expect(back(large).panel.stitches).toBeGreaterThan(back(small).panel.stitches);
  });

  it("a child size drafts child numbers, never an adult L", () => {
    // The old engine silently drafted every child size as an adult L.
    const child = draftGarment({ garment: "sweater", craft: "knitting", size: "2-4yr" });
    const adult = draftGarment({ garment: "sweater", craft: "knitting", size: "L" });
    const back = (d: typeof child) => d.pieces.find((p) => p.panel.name === "Back")!;
    expect(back(child).panel.stitches).toBeLessThan(back(adult).panel.stitches);
    expect(back(child).panel.widthCm).toBeLessThan(back(adult).panel.widthCm);
  });

  it("a finer gauge means more stitches for the same body", () => {
    const chunky = draftGarment({
      garment: "hat", craft: "knitting", size: "M",
      gauge: { stitchesPer10cm: 12, rowsPer10cm: 16 },
    });
    const fine = draftGarment({
      garment: "hat", craft: "knitting", size: "M",
      gauge: { stitchesPer10cm: 30, rowsPer10cm: 40 },
    });
    expect(fine.pieces[0].panel.stitches).toBeGreaterThan(chunky.pieces[0].panel.stitches);
  });

  it("a hat is drafted smaller than the head so it grips", () => {
    const draft = draftGarment({ garment: "hat", craft: "knitting", size: "M" });
    const brim = draft.pieces.find((p) => p.panel.name === "Brim")!;
    // Negative ease: the brim must be narrower than the head it goes on.
    expect(brim.panel.widthCm).toBeLessThan(56);
    expect(brim.panel.widthCm).toBeGreaterThan(40);
  });

  it("a cowl clears the head, which is the point of a cowl", () => {
    const draft = draftGarment({ garment: "cowl", craft: "knitting", size: "M" });
    expect(draft.pieces[0].panel.widthCm).toBeGreaterThan(55);
  });
});
