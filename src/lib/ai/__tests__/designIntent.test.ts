import { describe, expect, it } from "vitest";
import { coerceDesignIntent } from "../designIntent";

const base = {
  name: "Autumn Yoke",
  motifKind: "colourwork",
  palette: [
    { role: "main", hex: "#A33333", name: "Rust" },
    { role: "contrast", hex: "#5b7a4f", name: "Moss" },
  ],
};

describe("coerceDesignIntent", () => {
  it("accepts a well-formed design", () => {
    const d = coerceDesignIntent({ ...base, construction: "raglan" });
    expect(d?.name).toBe("Autumn Yoke");
    expect(d?.motifKind).toBe("colourwork");
    expect(d?.palette).toHaveLength(2);
  });

  it("lowercases hex so the renderer can compare colours", () => {
    expect(coerceDesignIntent(base)?.palette[0].hex).toBe("#a33333");
  });

  it("drops palette entries with an unusable hex", () => {
    const d = coerceDesignIntent({
      ...base,
      palette: [...base.palette, { role: "x", hex: "rust", name: "Rust" }],
    });
    expect(d?.palette).toHaveLength(2);
  });

  it("rejects a design with fewer than two usable colours", () => {
    expect(coerceDesignIntent({ ...base, palette: [base.palette[0]] })).toBeNull();
    expect(coerceDesignIntent({ ...base, palette: [] })).toBeNull();
  });

  it("rejects a design with no name", () => {
    expect(coerceDesignIntent({ ...base, name: "  " })).toBeNull();
  });

  it("rejects anything that is not an object", () => {
    expect(coerceDesignIntent(null)).toBeNull();
    expect(coerceDesignIntent("a sweater")).toBeNull();
    expect(coerceDesignIntent([])).toBeNull();
  });
});

describe("construction is resolved to exactly one buildable shape", () => {
  it("passes through an exact value", () => {
    for (const c of ["raglan", "set-in-sleeve", "circular-yoke", "motifs-joined"]) {
      expect(coerceDesignIntent({ ...base, construction: c })?.construction).toBe(c);
    }
  });

  it("resolves the self-contradictory answer models actually give", () => {
    // Observed verbatim from a live call: two mutually exclusive constructions
    // in one string. Priority order must pick raglan, not keep both.
    const d = coerceDesignIntent({
      ...base,
      construction: "Top-down raglan with set-in sleeves, worked in the round and ribbed throughout",
    });
    expect(d?.construction).toBe("raglan");
    // The model's own wording is preserved for display, never parsed again.
    expect(d?.constructionNotes).toContain("Top-down raglan");
  });

  it("maps common phrasings", () => {
    const cases: Array<[string, string]> = [
      ["worked in the round from the crown down", "in-the-round"],
      ["granny squares joined as you go", "motifs-joined"],
      ["bottom-up, worked flat in pieces and seamed", "worked-flat"],
      ["dropped shoulder boxy fit", "drop-shoulder"],
      ["circular yoke with stranded colourwork", "circular-yoke"],
    ];
    for (const [text, expected] of cases) {
      expect(coerceDesignIntent({ ...base, construction: text })?.construction).toBe(expected);
    }
  });

  it("falls back to a real construction when the model says nothing useful", () => {
    expect(coerceDesignIntent({ ...base, construction: "lovely and cosy" })?.construction)
      .toBe("worked-flat");
    expect(coerceDesignIntent(base)?.construction).toBe("worked-flat");
  });
});
