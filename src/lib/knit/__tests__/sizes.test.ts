import { describe, expect, it } from "vitest";
import {
  ADULT_SIZES,
  ALL_SIZES,
  CHILD_SIZES,
  getBodyMeasurements,
  getBodyMeasurementsIn,
  isBabySize,
  isChildSize,
  isOneSize,
  resolveSize,
  sizeForChest,
  sizeLabel,
  type SizeKey,
} from "../sizes";
import { cmToIn } from "../units";
import { makeGauge, stitchesFor } from "../gauge";

describe("size resolution", () => {
  it("REGRESSION: a child size resolves to that child size, never to adult L", () => {
    // The old `normalizeSize()` returned "L" for every unrecognised input, so
    // "0-3m" drafted a 107 cm adult Large. Every child label must survive.
    for (const size of CHILD_SIZES) {
      expect(resolveSize(size)).toBe(size);
    }
    expect(resolveSize("0-3 months")).toBe("0-3m");
    expect(resolveSize("newborn")).toBe("0-3m");
    expect(resolveSize("2-4 years")).toBe("2-4yr");
  });

  it("REGRESSION: a child size produces child numbers, not adult L numbers", () => {
    const baby = getBodyMeasurements("0-3m");
    const adultL = getBodyMeasurements("L");

    expect(baby.chest).toBe(40.5);
    expect(baby.chest).toBeLessThan(adultL.chest / 2);
    expect(baby.totalLength).toBeLessThan(adultL.totalLength / 2);
    expect(baby.armholeDepth).toBeLessThan(adultL.armholeDepth);
    expect(baby.headCircumference).toBeLessThan(adultL.headCircumference);

    // And the numbers survive all the way to a cast-on: at one gauge, a baby
    // back panel must be a fraction of an adult Large's.
    const gauge = makeGauge(20, 26);
    const babyBack = stitchesFor(baby.chest / 2, gauge);
    const adultBack = stitchesFor(adultL.chest / 2, gauge);
    expect(babyBack).toBe(41);
    expect(adultBack).toBe(107);
    expect(babyBack).toBeLessThan(adultBack * 0.5);
  });

  it("returns null rather than guessing for anything it does not know", () => {
    for (const input of ["banana", "", "  ", "toddler-ish", "42in"]) {
      expect(resolveSize(input)).toBeNull();
    }
    expect(resolveSize(null)).toBeNull();
    expect(resolveSize(undefined)).toBeNull();
    // Specifically: it must never fall back to a body size.
    expect(resolveSize("One Size")).toBeNull();
    expect(isOneSize("one size")).toBe(true);
    expect(isOneSize("L")).toBe(false);
  });

  it("accepts the aliases that turn up in stored data and in LLM output", () => {
    expect(resolveSize("xxl")).toBe("2XL");
    expect(resolveSize("XXL")).toBe("2XL");
    expect(resolveSize("2x")).toBe("2XL");
    expect(resolveSize("3XL")).toBe("3XL");
    expect(resolveSize("medium")).toBe("M");
    expect(resolveSize(" l ")).toBe("L");
    expect(resolveSize("0_3m")).toBe("0-3m");
  });
});

describe("body measurement tables", () => {
  it("covers every declared size", () => {
    expect(ALL_SIZES).toHaveLength(ADULT_SIZES.length + CHILD_SIZES.length);
    for (const size of ALL_SIZES) {
      const body = getBodyMeasurements(size);
      for (const [field, value] of Object.entries(body)) {
        expect(value, `${size}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("uses the CYC upper-of-range chest values for adults", () => {
    // CYC women's chest ranges, upper value, converted to cm.
    expect(getBodyMeasurements("XS").chest).toBe(76);
    expect(getBodyMeasurements("S").chest).toBe(86);
    expect(getBodyMeasurements("M").chest).toBe(96.5);
    expect(getBodyMeasurements("L").chest).toBe(106.5);
    expect(getBodyMeasurements("XL").chest).toBe(117);
    expect(getBodyMeasurements("2XL").chest).toBe(127);
    expect(getBodyMeasurements("3XL").chest).toBe(137);
  });

  it("uses CYC baby and child chest values", () => {
    expect(getBodyMeasurements("0-3m").chest).toBe(40.5); // CYC 3 months
    expect(getBodyMeasurements("3-6m").chest).toBe(43); // CYC 6 months
    expect(getBodyMeasurements("6-12m").chest).toBe(45.5); // CYC 12 months
    expect(getBodyMeasurements("1-2yr").chest).toBe(53); // CYC 2 years
    expect(getBodyMeasurements("2-4yr").chest).toBe(58.5); // CYC 4 years
    expect(getBodyMeasurements("4-6yr").chest).toBe(63.5); // CYC 6 years
  });

  it("grows monotonically through the full size run", () => {
    const ordered: SizeKey[] = [...CHILD_SIZES, ...ADULT_SIZES];
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = getBodyMeasurements(ordered[i - 1]);
      const next = getBodyMeasurements(ordered[i]);
      expect(next.chest, `${ordered[i]} chest`).toBeGreaterThan(prev.chest);
      expect(next.armholeDepth, `${ordered[i]} armhole`).toBeGreaterThan(prev.armholeDepth);
      expect(next.totalLength, `${ordered[i]} length`).toBeGreaterThan(prev.totalLength);
      expect(next.shoulderWidth, `${ordered[i]} shoulder`).toBeGreaterThanOrEqual(prev.shoulderWidth);
    }
  });

  it("keeps the shoulder/neck/shoulder partition consistent with the cross-back", () => {
    // This is the invariant the old engine broke: shoulder + neck + shoulder
    // must reconstruct the cross-back exactly, at every size.
    for (const size of ALL_SIZES) {
      const b = getBodyMeasurements(size);
      expect(b.shoulderWidth * 2 + b.backNeckWidth).toBeCloseTo(b.crossBack, 6);
    }
  });

  it("keeps the back neck absolute, not a percentage of the chest", () => {
    // Back neck runs 13-16 cm across the whole adult range while the chest
    // nearly doubles. "back neck = 44% of back width" is what produced a
    // neckband no head fits through.
    for (const size of ADULT_SIZES) {
      const b = getBodyMeasurements(size);
      expect(b.backNeckWidth).toBeGreaterThanOrEqual(13);
      expect(b.backNeckWidth).toBeLessThanOrEqual(16.5);
    }
  });

  it("keeps armhole depth a measured dimension, not a fraction of body length", () => {
    for (const size of ADULT_SIZES) {
      const b = getBodyMeasurements(size);
      expect(b.armholeDepth / b.totalLength).toBeLessThan(0.4);
      expect(b.armholeDepth).toBeGreaterThanOrEqual(16.5);
      expect(b.armholeDepth).toBeLessThanOrEqual(26.5);
    }
  });

  it("exposes inches as a faithful conversion of the stored centimetres", () => {
    for (const size of ALL_SIZES) {
      const cm = getBodyMeasurements(size);
      const inches = getBodyMeasurementsIn(size);
      expect(inches.chest).toBeCloseTo(cmToIn(cm.chest), 2);
      expect(inches.armholeDepth).toBeCloseTo(cmToIn(cm.armholeDepth), 2);
    }
    // Sanity: adult L is the classic 42 in bust.
    expect(getBodyMeasurementsIn("L").chest).toBeCloseTo(41.93, 2);
  });

  it("classifies sizes for the UI", () => {
    expect(isChildSize("2-4yr")).toBe(true);
    expect(isChildSize("M")).toBe(false);
    expect(isBabySize("6-12m")).toBe(true);
    expect(isBabySize("2-4yr")).toBe(false);
    expect(sizeLabel("2XL")).toBe("2XL (adult)");
    expect(sizeLabel("0-3m")).toBe("0-3m (baby)");
    expect(sizeLabel("4-6yr")).toBe("4-6yr (child)");
  });

  it("matches a measured chest to a size, adults only unless asked", () => {
    expect(sizeForChest(96)).toBe("M");
    expect(sizeForChest(140)).toBe("3XL");
    // A 63 cm chest is a six-year-old; without opting in we must not silently
    // hand back an adult XS.
    expect(sizeForChest(63, { includeChildren: true })).toBe("4-6yr");
    expect(sizeForChest(63)).toBe("XS");
  });
});
