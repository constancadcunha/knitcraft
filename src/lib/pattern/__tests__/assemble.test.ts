import { describe, expect, it } from "vitest";
import { assemblePattern } from "../index";
import { draftGarment } from "@/lib/garments";

const GAUGE = { stitchesPer10cm: 22, rowsPer10cm: 30 };

function pattern(garment = "Sweater", size = "M") {
  return assemblePattern({
    id: "p1",
    name: "Test Pattern",
    craftType: "knitting",
    garmentType: garment as never,
    size: size as never,
    gauge: GAUGE,
    draft: draftGarment({ garment, craft: "knitting", size, gauge: GAUGE }),
  });
}

describe("assemblePattern", () => {
  it("produces a section per piece, each with instructions", () => {
    const p = pattern();
    expect(p.sections.length).toBeGreaterThan(0);
    for (const section of p.sections) {
      expect(section.name).toBeTruthy();
      expect(section.instructions.length).toBeGreaterThan(1);
      // The first line says how the piece begins, and there are three
      // legitimate answers: cast on, continue from live stitches, or pick up
      // from an existing edge.
      expect(section.instructions[0].text.toLowerCase()).toMatch(
        /cast on|chain|foundation|continue from|pick up/
      );
    }
  });

  it("derives abbreviations from the symbols actually used", () => {
    const p = pattern();
    expect(p.abbreviations.length).toBeGreaterThan(0);
    for (const a of p.abbreviations) {
      expect(a.abbr).toBeTruthy();
      expect(a.meaning).toBeTruthy();
    }
    // Sorted, and unique.
    const abbrs = p.abbreviations.map((a) => a.abbr);
    expect(new Set(abbrs).size).toBe(abbrs.length);
    expect([...abbrs].sort((a, b) => a.localeCompare(b))).toEqual(abbrs);
  });

  it("costs the yarn from the real panel areas, not a lookup", () => {
    const p = pattern();
    const yarn = p.materials.yarns[0];
    expect(yarn.metres).toBeGreaterThan(0);
    expect(yarn.balls).toBeGreaterThan(0);

    // A bigger garment must need more yarn than a smaller one.
    const small = pattern("Sweater", "XS").materials.yarns[0];
    const large = pattern("Sweater", "3XL").materials.yarns[0];
    expect(large.metres).toBeGreaterThan(small.metres);
  });

  it("lands a size-M sweater in a believable yardage range", () => {
    // The audit found the old estimate ~3x reality (17 skeins for a sweater).
    const metres = pattern("Sweater", "M").materials.yarns[0].metres;
    expect(metres).toBeGreaterThan(800);
    expect(metres).toBeLessThan(3000);
  });

  it("records finished measurements for every piece", () => {
    const p = pattern();
    const keys = Object.keys(p.measurements);
    expect(keys.length).toBeGreaterThan(0);
    for (const value of Object.values(p.measurements)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it("links each section to the chart it was written from", () => {
    // Words and chart are the same data rendered twice, so they cannot
    // disagree -- the failure the old engine had.
    const p = pattern();
    for (const section of p.sections) expect(section.chartId).toBeTruthy();
  });

  it("gives a working time as a range, never false precision", () => {
    expect(pattern().estimatedTime).toMatch(/hours|weekend|evening/);
  });

  it("assembles for every garment without throwing", () => {
    for (const g of ["Hat", "Cowl", "Gloves", "Socks", "Scarf", "Baby Blanket", "Other"]) {
      const p = pattern(g, "One Size");
      expect(p.sections.length, g).toBeGreaterThan(0);
    }
  });

  it("carries design prose through but never lets it supply numbers", () => {
    const draft = draftGarment({ garment: "Hat", craft: "knitting", size: "M", gauge: GAUGE });
    const p = assemblePattern({
      id: "p", name: "Emberwood", craftType: "knitting",
      garmentType: "Hat" as never, size: "M" as never, gauge: GAUGE, draft,
      notes: "Use a softly variegated yarn.",
    });
    expect(p.notes).toContain("variegated");
    expect(p.gauge).toEqual(GAUGE);
  });
});

describe("each piece begins the way it actually begins", () => {
  function sectionsOf(garment: string) {
    const p = pattern(garment, garment === "Hat" ? "M" : "M");
    return Object.fromEntries(p.sections.map((s) => [s.name, s.instructions[0].text]));
  }

  it("casts on a piece that genuinely starts fresh", () => {
    const s = sectionsOf("Sweater");
    expect(s.Back).toMatch(/^Cast on \d+/);
    expect(s.Front).toMatch(/^Cast on \d+/);
  });

  it("continues a hat's body out of its brim rather than casting on twice", () => {
    // Writing "cast on" here tells the knitter to start a second hat.
    const s = sectionsOf("Hat");
    expect(s.Brim).toMatch(/^Cast on \d+/);
    expect(s.Body).toMatch(/^Continue from Brim/);
    expect(s.Body).not.toMatch(/Cast on/);
  });

  it("picks a neckband up from the neckline", () => {
    const s = sectionsOf("Sweater");
    expect(s.Neckband).toMatch(/pick up and knit \d+ stitches evenly from the neckline/);
    expect(s.Neckband).not.toMatch(/Cast on/);
  });

  it("walks a sock down from its cuff", () => {
    const s = sectionsOf("Socks");
    expect(s.Cuff).toMatch(/^Cast on \d+/);
    expect(s.Leg).toMatch(/^Continue from Cuff/);
    expect(s.Foot).toMatch(/^Continue from Heel flap/);
  });

  it("picks a glove's fingers up from the held stitches", () => {
    const s = sectionsOf("Gloves");
    expect(s.Fingers).toMatch(/pick up/i);
    expect(s.Thumb).toMatch(/pick up/i);
  });

  it("states the live stitch count when continuing, so it can be checked", () => {
    const p = pattern("Hat");
    const body = p.sections.find((s) => s.name === "Body")!;
    const brim = p.sections.find((s) => s.name === "Brim")!;
    const count = brim.instructions[0].text.match(/\d+/)?.[0];
    expect(body.instructions[0].text).toContain(count!);
  });
});
