import { describe, expect, it } from "vitest";
import { parseCommand, parseSpokenNumber } from "../parseCommand";

describe("parseSpokenNumber", () => {
  it("reads digits", () => {
    expect(parseSpokenNumber("42")).toBe(42);
    expect(parseSpokenNumber("go to row 7")).toBe(7);
  });

  it("reads number words", () => {
    expect(parseSpokenNumber("forty two")).toBe(42);
    expect(parseSpokenNumber("forty-two")).toBe(42);
    expect(parseSpokenNumber("one hundred twelve")).toBe(112);
    expect(parseSpokenNumber("twelve")).toBe(12);
  });

  it("returns null when there is no number", () => {
    expect(parseSpokenNumber("banana")).toBeNull();
    expect(parseSpokenNumber("")).toBeNull();
  });

  it("tolerates common misrecognitions of small numbers", () => {
    // Recognisers routinely return these homophones.
    expect(parseSpokenNumber("to")).toBe(2);
    expect(parseSpokenNumber("for")).toBe(4);
    expect(parseSpokenNumber("ate")).toBe(8);
  });
});

describe("parseCommand", () => {
  it("treats short affirmations as a single stitch", () => {
    for (const phrase of ["one", "yep", "next", "count", "stitch", "done", "check"]) {
      expect(parseCommand(phrase)).toEqual({ kind: "increment", by: 1 });
    }
  });

  it("prefers specific row commands over the bare tally word", () => {
    expect(parseCommand("next row")).toEqual({ kind: "nextRow" });
    expect(parseCommand("new row")).toEqual({ kind: "nextRow" });
    expect(parseCommand("turn")).toEqual({ kind: "nextRow" });
    expect(parseCommand("previous row")).toEqual({ kind: "prevRow" });
  });

  it("jumps to a numbered row", () => {
    expect(parseCommand("row twelve")).toEqual({ kind: "gotoRow", row: 12 });
    expect(parseCommand("go to row 42")).toEqual({ kind: "gotoRow", row: 42 });
  });

  it("handles multi-stitch arithmetic", () => {
    expect(parseCommand("plus five")).toEqual({ kind: "increment", by: 5 });
    expect(parseCommand("add three")).toEqual({ kind: "increment", by: 3 });
    expect(parseCommand("minus two")).toEqual({ kind: "decrement", by: 2 });
    expect(parseCommand("back one")).toEqual({ kind: "decrement", by: 1 });
  });

  it("sets an absolute count from a bare number above one", () => {
    expect(parseCommand("twenty four")).toEqual({ kind: "setCount", count: 24 });
    expect(parseCommand("set count to sixty")).toEqual({ kind: "setCount", count: 60 });
  });

  it("reads 'one' as a tally rather than a jump to row 1", () => {
    // The overwhelmingly common case is counting out loud.
    expect(parseCommand("one")).toEqual({ kind: "increment", by: 1 });
  });

  it("recognises corrections", () => {
    expect(parseCommand("undo")).toEqual({ kind: "undo" });
    expect(parseCommand("oops")).toEqual({ kind: "undo" });
    expect(parseCommand("reset the count")).toEqual({ kind: "resetRow" });
  });

  it("recognises spoken-output requests", () => {
    expect(parseCommand("where am i")).toEqual({ kind: "status" });
    expect(parseCommand("how many")).toEqual({ kind: "status" });
    expect(parseCommand("read it")).toEqual({ kind: "readNext" });
    expect(parseCommand("repeat")).toEqual({ kind: "repeat" });
  });

  it("survives curly apostrophes from the recogniser", () => {
    expect(parseCommand("what’s next")).toEqual({ kind: "readNext" });
    expect(parseCommand("what's next")).toEqual({ kind: "readNext" });
  });

  it("stops listening on request", () => {
    expect(parseCommand("pause")).toEqual({ kind: "pause" });
    expect(parseCommand("stop listening")).toEqual({ kind: "pause" });
  });

  it("ignores unrecognised speech instead of guessing", () => {
    expect(parseCommand("banana bread")).toBeNull();
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
  });

  it("does not tally on long sentences that merely contain a tally word", () => {
    // This is the dangerous case: a silent +1 the knitter never notices.
    expect(parseCommand("i wonder what comes next in this pattern")).toBeNull();
    expect(parseCommand("the dog is done with his dinner now")).toBeNull();
  });
});
