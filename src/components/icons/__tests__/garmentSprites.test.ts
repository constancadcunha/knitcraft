import { describe, expect, it } from "vitest";
import { GARMENT_SPRITES, SPRITE_ALIASES, spriteFor } from "../garmentSprites";
import { spriteCanvas, spriteProblems } from "../pixelSprite";
import { DEFAULT_PALETTE } from "@/lib/diagrams/primitives";
import { GARMENT_TYPES } from "@/types";

describe("sprite art is well formed", () => {
  it.each(Object.keys(GARMENT_SPRITES))("%s is a clean 20x20 block", (name) => {
    const art = GARMENT_SPRITES[name];
    expect(spriteProblems(art)).toEqual([]);
    expect(art).toHaveLength(20);
    expect(art[0]).toHaveLength(20);
  });

  it("draws something — no sprite is blank", () => {
    for (const [name, art] of Object.entries(GARMENT_SPRITES)) {
      const painted = art.join("").replace(/\./g, "").length;
      expect(painted, `${name} is empty`).toBeGreaterThan(20);
    }
  });
});

describe("every garment type resolves", () => {
  it.each(GARMENT_TYPES)("%s has an icon", (type) => {
    expect(spriteFor(type)).toBeDefined();
    expect(spriteProblems(spriteFor(type))).toEqual([]);
  });

  it("resolves the aliases the app has used", () => {
    for (const alias of Object.keys(SPRITE_ALIASES)) {
      expect(spriteFor(alias)).toBe(GARMENT_SPRITES[SPRITE_ALIASES[alias]]);
    }
    expect(spriteFor("Hat / Beanie")).toBe(GARMENT_SPRITES.Hat);
  });

  it("falls back rather than throwing on something unknown", () => {
    expect(spriteFor("Trebuchet")).toBe(GARMENT_SPRITES.Other);
  });
});

describe("the icons are actually distinguishable", () => {
  // This is the regression test for the reported bug: the old icons did not
  // read as the garments they named, and several looked alike.
  it("no two garments rasterise to the same picture", () => {
    const seen = new Map<string, string>();
    for (const [name, art] of Object.entries(GARMENT_SPRITES)) {
      const svg = spriteCanvas(art).toSVG(DEFAULT_PALETTE);
      const clash = seen.get(svg);
      expect(clash, `${name} is identical to ${clash}`).toBeUndefined();
      seen.set(svg, name);
    }
  });

  it.each([
    ["Gloves", "Mittens"],
    ["Cardigan", "Sweater"],
    ["Scarf", "Leg Warmers"],
    ["Baby Blanket", "Throw Blanket"],
    ["Vest", "Tank Top"],
    ["Sampler", "Framed Picture"],
  ])("%s is clearly not %s", (a, b) => {
    expect(GARMENT_SPRITES[a]).not.toEqual(GARMENT_SPRITES[b]);
  });

  it("gloves show separated fingers and mittens do not", () => {
    // The top rows of a glove are broken by gaps between the fingers.
    const gloveTop = GARMENT_SPRITES.Gloves[1];
    const mittenTop = GARMENT_SPRITES.Mittens[1];
    const gaps = (row: string) => (row.match(/#\.#/g) ?? []).length;
    expect(gaps(gloveTop)).toBeGreaterThan(gaps(mittenTop));
  });
});

describe("no icon contains a colour of its own", () => {
  it.each(Object.keys(GARMENT_SPRITES))("%s bakes no hex", (name) => {
    const svg = spriteCanvas(GARMENT_SPRITES[name]).toSVG(DEFAULT_PALETTE);
    expect(svg.match(/#[0-9a-fA-F]{6}/g) ?? []).toEqual([]);
  });
});
