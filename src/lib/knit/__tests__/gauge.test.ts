import { describe, expect, it } from "vitest";
import {
  DEFAULT_SNAP_TOLERANCE_CM,
  HOOK_SIZES,
  NEEDLE_SIZES,
  YARN_WEIGHTS,
  describeGauge,
  describeNeedle,
  describeRepeat,
  gaugeFromPer4in,
  gaugeFromPerInch,
  gaugeFromSwatch,
  gaugeInInches,
  heightCmFor,
  makeGauge,
  nearestNeedle,
  parseRepeat,
  ribNeedleMm,
  rowsFor,
  rowsForHeight,
  snapToRepeat,
  stitchesFor,
  stitchesForWidth,
  suggestedNeedleMm,
  typicalGaugeFor,
  widthCmFor,
  yarnWeightForGauge,
  type CycWeight,
} from "../gauge";

const WORSTED = makeGauge(20, 26, { measuredOver: "stockinette" });

describe("gauge conversions", () => {
  it("converts cm to stitches and rows", () => {
    expect(stitchesFor(10, WORSTED)).toBe(20);
    expect(stitchesFor(50, WORSTED)).toBe(100);
    expect(rowsFor(10, WORSTED)).toBe(26);
    expect(rowsFor(61, WORSTED)).toBe(159);
  });

  it("round-trips stitches and rows back to centimetres", () => {
    for (const gauge of [WORSTED, makeGauge(13.5, 18), makeGauge(33, 44), makeGauge(7, 10)]) {
      for (let cm = 1; cm <= 200; cm += 1) {
        const sts = stitchesFor(cm, gauge);
        // A whole number of stitches can only land within half a stitch of the
        // requested width; that half-stitch is the rounding error a pattern
        // carries, and it must never be larger than that.
        expect(Math.abs(widthCmFor(sts, gauge) - cm)).toBeLessThanOrEqual(
          0.5 / (gauge.stitchesPer10cm / 10) + 1e-9,
        );
        const rows = rowsFor(cm, gauge);
        expect(Math.abs(heightCmFor(rows, gauge) - cm)).toBeLessThanOrEqual(
          0.5 / (gauge.rowsPer10cm / 10) + 1e-9,
        );
      }
    }
  });

  it("round-trips between per-10cm, per-inch and per-4in statements", () => {
    const fromInch = gaugeFromPerInch(5, 6.5);
    expect(fromInch.stitchesPer10cm).toBeCloseTo(19.685, 3);
    const back = gaugeInInches(fromInch);
    expect(back.stitchesPerInch).toBeCloseTo(5, 6);
    expect(back.rowsPerInch).toBeCloseTo(6.5, 6);
    expect(back.stitchesPer4in).toBeCloseTo(20, 6);

    const fromFour = gaugeFromPer4in(20, 26);
    expect(gaugeInInches(fromFour).stitchesPer4in).toBeCloseTo(20, 6);
    expect(gaugeInInches(fromFour).rowsPer4in).toBeCloseTo(26, 6);
  });

  it("builds a gauge from a real swatch measurement", () => {
    const gauge = gaugeFromSwatch(23, 11, 31, 10.5);
    expect(gauge.stitchesPer10cm).toBeCloseTo(20.909, 3);
    expect(gauge.rowsPer10cm).toBeCloseTo(29.524, 3);
  });

  it("rejects a nonsense gauge instead of dividing by zero", () => {
    expect(() => makeGauge(0, 26)).toThrow(RangeError);
    expect(() => makeGauge(20, -1)).toThrow(RangeError);
  });

  it("states the gauge the way CYC requires", () => {
    const text = describeGauge(WORSTED);
    expect(text).toContain("20 sts and 26 rows = 10 cm / 4 in");
    expect(text).toContain("in stockinette");
    expect(text).toContain("after blocking");
    expect(describeGauge(makeGauge(20, 26, { inTheRound: true }))).toContain("rounds");
  });
});

describe("snapping to a stitch-pattern repeat", () => {
  it("snaps to a multiple plus edge stitches, flat", () => {
    // "multiple of 4 sts + 2", worked flat with one selvedge stitch per edge.
    const result = snapToRepeat(100, WORSTED, { repeat: { multiple: 4, plus: 2 }, selvedge: 1 });
    expect((result.stitches - 2 - 2) % 4).toBe(0);
    expect(result.stitches).toBe(100);

    const odd = snapToRepeat(103, WORSTED, { repeat: { multiple: 4, plus: 2 }, selvedge: 1 });
    expect((odd.stitches - 4) % 4).toBe(0);
    expect(Math.abs(odd.delta)).toBeLessThanOrEqual(2);
  });

  it("drops the plus and the selvedges in the round", () => {
    // A tube closes on itself, so the balancing stitches must not be added —
    // a very common pattern-writing error.
    const result = snapToRepeat(101, WORSTED, {
      repeat: { multiple: 6, plus: 3 },
      selvedge: 1,
      inTheRound: true,
    });
    expect(result.stitches % 6).toBe(0);
    expect(result.stitches).toBe(102);
  });

  it("always lands on a workable count for every multiple", () => {
    for (let multiple = 1; multiple <= 24; multiple += 1) {
      for (let plus = 0; plus <= 5; plus += 1) {
        for (let count = 20; count <= 200; count += 7) {
          const r = snapToRepeat(count, WORSTED, { repeat: { multiple, plus }, selvedge: 1 });
          expect((r.stitches - plus - 2) % multiple, `mult ${multiple} + ${plus} from ${count}`).toBe(0);
          expect(r.stitches).toBeGreaterThan(0);
          // Snapping can never move more than half a repeat.
          expect(Math.abs(r.delta)).toBeLessThanOrEqual(Math.ceil(multiple / 2));
        }
      }
    }
  });

  it("can force an even count for symmetric shaping", () => {
    const r = snapToRepeat(51, WORSTED, { repeat: { multiple: 5, plus: 0 }, even: true });
    expect(r.stitches % 2).toBe(0);
    expect(r.stitches % 5).toBe(0);
  });

  it("warns when a large repeat has distorted the piece", () => {
    // A 24-stitch Nordic motif over a narrow sleeve moves the width by more
    // than the 2 cm tolerance; the knitter must be told, not silently resized.
    const r = snapToRepeat(40, WORSTED, { repeat: { multiple: 24, plus: 0 } });
    expect(r.stitches).toBe(48);
    expect(r.distortionCm).toBeCloseTo(4, 3);
    expect(r.withinTolerance).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/changed the width/);
    expect(DEFAULT_SNAP_TOLERANCE_CM).toBe(2);
  });

  it("widens rather than vanishing when the piece is narrower than one repeat", () => {
    const r = snapToRepeat(6, WORSTED, { repeat: { multiple: 24, plus: 1 } });
    expect(r.stitches).toBe(25);
    expect(r.warnings.join(" ")).toMatch(/narrower than one full repeat/);
  });

  it("goes from a width straight to a cast-on count", () => {
    // Half the finished chest of a classic-fit adult L pullover.
    const r = stitchesForWidth(58.25, WORSTED, { repeat: { multiple: 2, plus: 0 }, even: true });
    expect(r.requested).toBe(117);
    expect(r.stitches).toBe(118);
    expect(r.stitches % 2).toBe(0);
    expect(widthCmFor(r.stitches, WORSTED)).toBeCloseTo(59, 6);
  });

  it("reads and writes repeats in pattern language", () => {
    expect(parseRepeat("multiple of 4 sts + 2")).toEqual({ multiple: 4, plus: 2 });
    expect(parseRepeat("Multiple of 18 stitches")).toEqual({ multiple: 18, plus: 0 });
    expect(parseRepeat("worked over any number")).toBeNull();
    expect(describeRepeat({ multiple: 8, plus: 4 })).toBe("multiple of 8 sts + 4");
    expect(describeRepeat({ multiple: 1, plus: 0 })).toBe("any number of sts");
  });

  it("rounds rows to a vertical repeat and to a wrong-side row", () => {
    expect(rowsForHeight(20, WORSTED)).toBe(52);
    expect(rowsForHeight(20, WORSTED, { rowRepeat: 8 })).toBe(56);
    expect(rowsForHeight(19.5, WORSTED, { endOnWrongSide: true }) % 2).toBe(0);
    expect(rowsForHeight(1, WORSTED, { minimum: 6 })).toBe(6);
  });
});

describe("CYC yarn weight system", () => {
  it("covers categories 0 through 7", () => {
    expect(YARN_WEIGHTS).toHaveLength(8);
    YARN_WEIGHTS.forEach((spec, index) => {
      expect(spec.cyc).toBe(index);
      expect(spec.knitGaugePer10cm[0]).toBeLessThanOrEqual(spec.knitGaugePer10cm[1]);
      expect(spec.knitNeedleMm[0]).toBeLessThanOrEqual(spec.knitNeedleMm[1]);
      expect(spec.wpi[0]).toBeLessThanOrEqual(spec.wpi[1]);
      expect(spec.typicalBall.metres).toBeGreaterThan(0);
    });
  });

  it("gets finer as the category number falls", () => {
    for (let i = 1; i < YARN_WEIGHTS.length; i += 1) {
      expect(YARN_WEIGHTS[i].knitGaugePer10cm[1]).toBeLessThan(YARN_WEIGHTS[i - 1].knitGaugePer10cm[1]);
      expect(YARN_WEIGHTS[i].typicalBall.metres).toBeLessThan(YARN_WEIGHTS[i - 1].typicalBall.metres);
    }
  });

  it("identifies a yarn weight from a measured gauge", () => {
    expect(yarnWeightForGauge(20)?.name).toBe("Medium");
    expect(yarnWeightForGauge(13.5)?.name).toBe("Bulky");
    expect(yarnWeightForGauge(28)?.name).toBe("Super Fine");
    expect(yarnWeightForGauge(1000)).toBeNull();
  });

  it("gives a plausible starting gauge for every weight", () => {
    for (let cyc = 0 as CycWeight; cyc <= 7; cyc = (cyc + 1) as CycWeight) {
      const gauge = typicalGaugeFor(cyc);
      const spec = YARN_WEIGHTS[cyc];
      expect(gauge.stitchesPer10cm).toBeGreaterThanOrEqual(spec.knitGaugePer10cm[0]);
      expect(gauge.stitchesPer10cm).toBeLessThanOrEqual(spec.knitGaugePer10cm[1]);
      expect(gauge.rowsPer10cm).toBeGreaterThan(gauge.stitchesPer10cm);
    }
    // Bulky: the weight the old app hardcoded, and the one its 220 m/skein
    // assumption (DK meterage) got wrong.
    expect(typicalGaugeFor(5).stitchesPer10cm).toBe(13.5);
    expect(typicalGaugeFor(5).rowsPer10cm).toBe(18);
  });
});

describe("needles and hooks", () => {
  it("converts metric to US and UK", () => {
    expect(NEEDLE_SIZES.find((n) => n.mm === 4)).toEqual({ mm: 4, us: "6", uk: "8" });
    expect(NEEDLE_SIZES.find((n) => n.mm === 6.5)?.us).toBe("10.5");
    expect(describeNeedle(5)).toBe("5 mm / US 8 / UK 6");
    expect(describeNeedle(3)).toBe("3 mm / UK 11");
    expect(nearestNeedle(4.1).mm).toBe(4);
    expect(HOOK_SIZES.find((h) => h.mm === 5)?.us).toBe("H/8");
  });

  it("suggests a needle in the CYC range and a smaller one for ribbing", () => {
    for (let cyc = 0 as CycWeight; cyc <= 7; cyc = (cyc + 1) as CycWeight) {
      const mm = suggestedNeedleMm(cyc);
      const [lo, hi] = YARN_WEIGHTS[cyc].knitNeedleMm;
      expect(mm).toBeGreaterThanOrEqual(lo - 0.3);
      expect(mm).toBeLessThanOrEqual(hi + 0.3);
      expect(ribNeedleMm(mm)).toBeLessThanOrEqual(mm);
    }
    expect(suggestedNeedleMm(4)).toBe(5);
    expect(ribNeedleMm(5)).toBe(4.5);
  });
});
