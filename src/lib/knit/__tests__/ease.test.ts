import { describe, expect, it } from "vitest";
import {
  ADULT_SIZES,
  ALL_SIZES,
  getBodyMeasurements,
} from "../sizes";
import {
  CARDIGAN_BAND_ALLOWANCE_CM,
  DEFAULT_FIT,
  EASE_TABLE,
  FIT_PREFERENCES,
  applyEase,
  checkNeckOpening,
  easeCm,
  finishedFromBody,
  fitClassFor,
  getEase,
  minimumNeckOpeningCm,
  type GarmentCategory,
} from "../ease";

const CHEST_CATEGORIES: GarmentCategory[] = ["pullover", "cardigan", "vest", "dropShoulder"];

describe("ease", () => {
  it("REGRESSION: ease is never the dead ternary's zero", () => {
    // The old engine's entire ease system was
    //   const cardiganEase = garment === "Cardigan" ? 0 : 0;
    // so every finished garment equalled the wearer's body. At the default fit
    // every torso garment must add real room at every size.
    for (const category of CHEST_CATEGORIES) {
      for (const size of ALL_SIZES) {
        const applied = applyEase(getBodyMeasurements(size), category, DEFAULT_FIT[category]);
        expect(applied.easeCm, `${category} ${size}`).toBeGreaterThanOrEqual(6);
        expect(applied.finishedCm, `${category} ${size}`).toBeGreaterThan(applied.bodyCm);
      }
    }
  });

  it("finished chest = body chest + the ease for the chosen fit", () => {
    for (const category of CHEST_CATEGORIES) {
      for (const fit of FIT_PREFERENCES) {
        const spec = getEase(category, fit);
        for (const size of ALL_SIZES) {
          const body = getBodyMeasurements(size);
          const applied = applyEase(body, category, fit);
          const expectedEase = easeCm(spec.primary, body.chest);
          expect(applied.bodyCm).toBe(body.chest);
          expect(applied.easeCm, `${category}/${fit}/${size}`).toBeCloseTo(expectedEase, 6);
          expect(applied.finishedCm, `${category}/${fit}/${size}`).toBeCloseTo(body.chest + expectedEase, 6);
        }
      }
    }
  });

  it("worked example: a classic-fit pullover for an adult L", () => {
    const body = getBodyMeasurements("L");
    const applied = applyEase(body, "pullover", "classic");
    expect(body.chest).toBe(106.5);
    expect(applied.easeCm).toBe(10);
    expect(applied.finishedCm).toBe(116.5);
    expect(applied.fitClass.name).toBe("Loose-fitting");
    expect(applied.upperArmFinishedCm).toBe(38); // 30.5 cm bicep + 7.5 cm
    expect(applied.warnings).toHaveLength(0);
  });

  it("orders the fit preferences monotonically within every category", () => {
    for (const category of Object.keys(EASE_TABLE) as GarmentCategory[]) {
      const body = getBodyMeasurements("M");
      const reference = EASE_TABLE[category].classic.primary.mode === "proportional" ? 50 : body.chest;
      let previous = Number.NEGATIVE_INFINITY;
      for (const fit of FIT_PREFERENCES) {
        const value = easeCm(EASE_TABLE[category][fit].primary, reference);
        expect(value, `${category}/${fit}`).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  it("applies negative, proportional ease to hats, socks and mittens", () => {
    const body = getBodyMeasurements("M");
    const hat = applyEase(body, "hat", "classic");
    expect(hat.primaryMeasure).toBe("headCircumference");
    expect(hat.bodyCm).toBe(56);
    expect(hat.finishedCm).toBeCloseTo(53.2, 3); // 5% negative ease
    expect(hat.easeCm).toBeLessThan(0);

    const sock = applyEase(body, "sock", "classic");
    expect(sock.primaryMeasure).toBe("footCircumference");
    expect(sock.finishedCm).toBeCloseTo(20.25, 3); // 22.5 cm foot, 10% negative

    const mitten = applyEase(body, "mitten", "classic");
    expect(mitten.finishedCm).toBeCloseTo(17.86, 2); // 19 cm hand, 6% negative
  });

  it("scales proportional ease with the wearer, so a baby hat is a baby hat", () => {
    const baby = applyEase(getBodyMeasurements("0-3m"), "hat", "classic");
    const adult = applyEase(getBodyMeasurements("L"), "hat", "classic");
    expect(baby.finishedCm).toBeCloseTo(38 * 0.95, 3);
    expect(adult.finishedCm).toBeCloseTo(56.5 * 0.95, 3);
    expect(baby.finishedCm).toBeLessThan(adult.finishedCm * 0.75);
  });

  it("keeps the cardigan band allowance out of the ease number", () => {
    // The old engine added 1.5 in to EACH front and then added a separate band
    // piece, so a declared 42 in cardigan measured 47.5 in.
    const body = getBodyMeasurements("L");
    const cardigan = applyEase(body, "cardigan", "classic");
    expect(cardigan.finishedCm).toBe(114.5);
    expect(CARDIGAN_BAND_ALLOWANCE_CM).toBe(3);
    // A construction adds the overlap ONCE, to the buttoned circumference.
    expect(cardigan.finishedCm + CARDIGAN_BAND_ALLOWANCE_CM).toBe(117.5);
  });

  it("warns when the sleeve would bind at the bicep", () => {
    const tight = applyEase(getBodyMeasurements("M"), "pullover", "zero");
    expect(tight.warnings.join(" ")).toMatch(/bind/i);
    const roomy = applyEase(getBodyMeasurements("M"), "pullover", "classic");
    expect(roomy.warnings).toHaveLength(0);
  });

  it("maps ease onto the CYC fit classes", () => {
    expect(fitClassFor(0).name).toBe("Very close-fitting");
    expect(fitClassFor(3).name).toBe("Close-fitting");
    expect(fitClassFor(7.5).name).toBe("Standard-fitting");
    expect(fitClassFor(12).name).toBe("Loose-fitting");
    expect(fitClassFor(20).name).toBe("Oversized");
    expect(fitClassFor(-5).name).toBe("Very close-fitting");
  });

  it("finishedFromBody is the one equation the module exists to enforce", () => {
    expect(finishedFromBody(100, { mode: "absolute", cm: 10 })).toBe(110);
    expect(finishedFromBody(100, { mode: "absolute", cm: -5 })).toBe(95);
    expect(finishedFromBody(50, { mode: "proportional", factor: 0.9 })).toBe(45);
  });

  it("REGRESSION: rejects a neckband no adult head fits through", () => {
    // The old engine emitted 58 sts = 40.6 cm of neckband for an adult L.
    const head = getBodyMeasurements("L").headCircumference; // 56.5 cm
    const tooSmall = checkNeckOpening(40.6, head, { ribbed: true });
    expect(tooSmall.ok).toBe(false);
    expect(tooSmall.message).toMatch(/too small/);

    expect(minimumNeckOpeningCm(head, { ribbed: true })).toBeCloseTo(45.2, 2);
    expect(minimumNeckOpeningCm(head, { ribbed: false })).toBe(56.5);
    expect(checkNeckOpening(48, head, { ribbed: true }).ok).toBe(true);
    // A cardigan or a placket opens at the neck, so the check does not apply.
    expect(checkNeckOpening(20, head, { hasOpening: true }).ok).toBe(true);
  });

  it("scales the neck-opening minimum to a baby's head", () => {
    const babyHead = getBodyMeasurements("0-3m").headCircumference; // 38 cm
    expect(minimumNeckOpeningCm(babyHead, { ribbed: true })).toBeCloseTo(30.4, 2);
    expect(checkNeckOpening(32, babyHead, { ribbed: true }).ok).toBe(true);
  });

  it("leaves non-body garments alone", () => {
    for (const category of ["cowl", "scarf", "shawl", "blanket"] as GarmentCategory[]) {
      const applied = applyEase(getBodyMeasurements("M"), category, "classic");
      expect(applied.primaryMeasure).toBeNull();
      expect(applied.finishedCm).toBe(0);
    }
  });

  it("has a default fit for every category", () => {
    for (const category of Object.keys(EASE_TABLE) as GarmentCategory[]) {
      expect(DEFAULT_FIT[category]).toBeDefined();
      expect(getEase(category)).toBe(EASE_TABLE[category][DEFAULT_FIT[category]]);
    }
  });

  it("keeps adult torso ease inside the CYC bands", () => {
    for (const size of ADULT_SIZES) {
      const body = getBodyMeasurements(size);
      const oversized = applyEase(body, "pullover", "oversized");
      expect(oversized.easeCm).toBeGreaterThanOrEqual(15);
      const zero = applyEase(body, "pullover", "zero");
      expect(zero.easeCm).toBe(0);
    }
  });
});
