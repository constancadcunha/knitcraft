import { describe, expect, it } from "vitest";
import { parseCommand } from "../parseCommand";
import { describeSequence, parseStitchSequence } from "../stitchWords";

/** Helper: how many squares would this utterance mark? */
function marks(text: string): number {
  const cmd = parseCommand(text);
  if (!cmd) return 0;
  if (cmd.kind === "sequence") return cmd.calls.length;
  if (cmd.kind === "increment") return cmd.by;
  return 0;
}

describe("the user's stated examples", () => {
  it('"one done" marks one', () => {
    expect(marks("one done")).toBe(1);
  });

  it('"done" marks one', () => {
    expect(marks("done")).toBe(1);
  });

  it('"knit, purl, knit, purl, purl" marks five', () => {
    expect(marks("knit, purl, knit, purl, purl")).toBe(5);
  });

  it('"knit, purl, knit" marks three, in order', () => {
    const cmd = parseCommand("knit, purl, knit");
    expect(cmd?.kind).toBe("sequence");
    if (cmd?.kind !== "sequence") throw new Error("expected a sequence");
    expect(cmd.calls.map((c) => c.abbr)).toEqual(["k", "p", "k"]);
  });
});

describe("parseStitchSequence", () => {
  it("counts a bare stitch as one", () => {
    expect(parseStitchSequence("knit")).toHaveLength(1);
  });

  it("expands a trailing repeat count", () => {
    // Read aloud the way a pattern is written: k2, p2.
    const calls = parseStitchSequence("knit two purl two");
    expect(calls).toHaveLength(4);
    expect(calls?.map((c) => c.abbr)).toEqual(["k", "k", "p", "p"]);
  });

  it("prefers the longest stitch name", () => {
    expect(parseStitchSequence("knit two together")?.map((c) => c.abbr)).toEqual(["k2tog"]);
    expect(parseStitchSequence("half double crochet")?.map((c) => c.abbr)).toEqual(["hdc"]);
  });

  it("survives the homophones recognisers actually produce", () => {
    // "pearl" for purl is the single most common misrecognition.
    expect(parseStitchSequence("pearl pearl")?.map((c) => c.abbr)).toEqual(["p", "p"]);
    expect(parseStitchSequence("nit pearl")?.map((c) => c.abbr)).toEqual(["k", "p"]);
  });

  it("handles crochet and cross stitch", () => {
    expect(parseStitchSequence("double crochet chain")?.map((c) => c.abbr)).toEqual(["dc", "ch"]);
    // "cross" is a cable crossing to a knitter and a full cross to a
    // cross-stitcher, so the craft decides.
    expect(parseStitchSequence("cross cross half cross", "cross-stitch")?.map((c) => c.abbr))
      .toEqual(["X", "X", "/"]);
    expect(parseStitchSequence("cross", "knitting")?.map((c) => c.abbr)).toEqual(["C"]);
  });

  it("ignores filler words between stitches", () => {
    expect(parseStitchSequence("knit and then purl")?.map((c) => c.abbr)).toEqual(["k", "p"]);
  });

  it("returns null when there are no stitch words", () => {
    expect(parseStitchSequence("where am i")).toBeNull();
    expect(parseStitchSequence("")).toBeNull();
  });

  it("does not treat a bare number as a sequence", () => {
    // "twenty four" must stay a count, not become a mystery stitch.
    expect(parseStitchSequence("twenty four")).toBeNull();
  });
});

describe("sequences never shadow the existing commands", () => {
  it.each([
    ["next row", "nextRow"],
    ["row twelve", "gotoRow"],
    ["undo", "undo"],
    ["where am i", "status"],
    ["pause", "pause"],
    ["twenty four", "setCount"],
  ])("%s stays %s", (utterance, kind) => {
    expect(parseCommand(utterance)?.kind).toBe(kind);
  });

  it('"slip slip knit" is one ssk, not slip+slip+knit', () => {
    const calls = parseStitchSequence("slip slip knit");
    expect(calls?.map((c) => c.abbr)).toEqual(["ssk"]);
  });
});

describe("describeSequence", () => {
  it("writes runs the way a pattern does", () => {
    const calls = parseStitchSequence("knit two purl two knit")!;
    expect(describeSequence(calls)).toBe("k2, p2, k");
  });
});
