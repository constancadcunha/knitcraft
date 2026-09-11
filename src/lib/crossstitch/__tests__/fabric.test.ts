import { describe, expect, it } from "vitest";
import {
  finishedSize,
  makeFabric,
  recommendedStrands,
  stitchesPerCm,
  stitchesPerInch,
} from "../fabric";
import { estimateFloss, stitchesPerSkein, threadPerStitchMm } from "../floss";

describe("stitchesPerInch", () => {
  it("is the count itself on Aida, which is worked one stitch per block", () => {
    expect(stitchesPerInch(makeFabric("aida", 14))).toBe(14);
    expect(stitchesPerInch(makeFabric("aida", 18))).toBe(18);
  });

  it("is HALF the count on evenweave and linen, which are worked over two threads", () => {
    // The classic beginner error: 28-count linen is not twice as fine as
    // 14-count Aida, it is exactly the same size.
    expect(stitchesPerInch(makeFabric("linen", 28))).toBe(14);
    expect(stitchesPerInch(makeFabric("evenweave", 28))).toBe(14);
    expect(stitchesPerInch(makeFabric("aida", 14))).toBe(
      stitchesPerInch(makeFabric("linen", 28))
    );
  });

  it("honours an explicit over-count for stitching over one", () => {
    expect(stitchesPerInch(makeFabric("linen", 32, 1))).toBe(32);
  });

  it("converts to centimetres", () => {
    expect(stitchesPerCm(makeFabric("aida", 14))).toBeCloseTo(5.512, 3);
  });

  it("rejects a nonsense count rather than dividing by zero", () => {
    expect(() => makeFabric("aida", 0)).toThrow();
  });
});

describe("finishedSize", () => {
  it("divides stitch count by stitches per inch", () => {
    // A 140x70 design on 14-count is 10 x 5 inches.
    const size = finishedSize(140, 70, makeFabric("aida", 14));
    expect(size.widthIn).toBeCloseTo(10, 2);
    expect(size.heightIn).toBeCloseTo(5, 2);
    expect(size.widthCm).toBeCloseTo(25.4, 1);
  });

  it("gives the same finished size on 28-count linen as on 14-count Aida", () => {
    const aida = finishedSize(140, 70, makeFabric("aida", 14));
    const linen = finishedSize(140, 70, makeFabric("linen", 28));
    expect(linen.widthIn).toBeCloseTo(aida.widthIn, 5);
    expect(linen.heightIn).toBeCloseTo(aida.heightIn, 5);
  });

  it("gets smaller as the fabric gets finer", () => {
    const coarse = finishedSize(140, 70, makeFabric("aida", 11));
    const fine = finishedSize(140, 70, makeFabric("aida", 18));
    expect(fine.widthIn).toBeLessThan(coarse.widthIn);
  });

  it("adds the framing margin to every side of the cut size", () => {
    const size = finishedSize(140, 70, makeFabric("aida", 14), 3);
    expect(size.cutWidthIn).toBeCloseTo(16, 2); // 10 + 3 + 3
    expect(size.cutHeightIn).toBeCloseTo(11, 2); // 5 + 3 + 3
  });
});

describe("recommendedStrands", () => {
  it("tracks stitches per inch, not the printed count", () => {
    expect(recommendedStrands(makeFabric("aida", 11))).toBe(3);
    expect(recommendedStrands(makeFabric("aida", 14))).toBe(2);
    expect(recommendedStrands(makeFabric("aida", 18))).toBe(1);
    // Same stitches per inch as 14-count Aida, so the same strand count.
    expect(recommendedStrands(makeFabric("linen", 28))).toBe(2);
  });
});

describe("floss estimation", () => {
  it("uses less thread per stitch on finer fabric", () => {
    expect(threadPerStitchMm(makeFabric("aida", 18)))
      .toBeLessThan(threadPerStitchMm(makeFabric("aida", 11)));
  });

  it("lands in the range stitchers actually quote for 14-count at 2 strands", () => {
    // Published guidance is roughly 1500-2500 stitches from one skein at this
    // gauge. The geometry plus the waste factor has to reproduce that, or the
    // waste factor is wrong.
    const perSkein = stitchesPerSkein(makeFabric("aida", 14), 2);
    expect(perSkein).toBeGreaterThan(1500);
    expect(perSkein).toBeLessThan(2500);
  });

  it("gets more stitches per skein when using fewer strands", () => {
    const fabric = makeFabric("aida", 14);
    expect(stitchesPerSkein(fabric, 1)).toBeGreaterThan(stitchesPerSkein(fabric, 2));
    expect(stitchesPerSkein(fabric, 2)).toBeGreaterThan(stitchesPerSkein(fabric, 3));
  });

  it("never tells you to buy less than a whole skein", () => {
    const e = estimateFloss({ stitches: 12, fabric: makeFabric("aida", 14), strands: 2 });
    expect(e.skeins).toBe(1);
  });

  it("scales linearly with stitch count", () => {
    const fabric = makeFabric("aida", 14);
    const one = estimateFloss({ stitches: 1000, fabric, strands: 2 });
    const two = estimateFloss({ stitches: 2000, fabric, strands: 2 });
    expect(two.workingMetres).toBeCloseTo(one.workingMetres * 2, 2);
  });

  it("shows its working", () => {
    const e = estimateFloss({ stitches: 1000, fabric: makeFabric("aida", 14), strands: 2 });
    expect(e.formula).toContain("1000 stitches");
    expect(e.formula).toContain("waste");
  });

  it("rejects an impossible strand count", () => {
    const fabric = makeFabric("aida", 14);
    expect(() => estimateFloss({ stitches: 10, fabric, strands: 0 })).toThrow();
    expect(() => estimateFloss({ stitches: 10, fabric, strands: 7 })).toThrow();
  });
});
