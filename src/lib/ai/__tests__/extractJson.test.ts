import { describe, expect, it } from "vitest";
import { extractJson, findJsonSpan, stripWrappers } from "../extractJson";

describe("stripWrappers", () => {
  it("unwraps a fenced json block", () => {
    expect(stripWrappers('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripWrappers('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("removes reasoning blocks", () => {
    expect(stripWrappers('<think>hmm, autumn colours</think>{"a":1}')).toBe('{"a":1}');
  });

  it("drops everything after an unterminated reasoning block", () => {
    expect(stripWrappers('{"a":1}<think>still thinking')).toBe('{"a":1}');
  });

  it("handles an opening fence with no closing fence", () => {
    expect(stripWrappers('```json\n{"a":1}')).toBe('{"a":1}');
  });
});

describe("findJsonSpan", () => {
  it("ignores braces inside strings", () => {
    const text = '{"note":"use {this} motif"}';
    expect(findJsonSpan(text)).toEqual({ start: 0, end: text.length - 1, balanced: true });
  });

  it("ignores escaped quotes", () => {
    expect(findJsonSpan('{"note":"a \\"cabled\\" yoke"}')?.balanced).toBe(true);
  });

  it("reports an unbalanced span as truncated", () => {
    expect(findJsonSpan('{"a":1,"b":{"c":2')?.balanced).toBe(false);
  });
});

describe("extractJson", () => {
  it("parses clean json", () => {
    expect(extractJson('{"name":"Yoke"}')).toMatchObject({ ok: true, value: { name: "Yoke" } });
  });

  it("parses json surrounded by prose", () => {
    expect(extractJson('Sure! Here is the design:\n{"name":"Yoke"}\nHope that helps.'))
      .toMatchObject({ ok: true, value: { name: "Yoke" } });
  });

  it("strips trailing commas", () => {
    expect(extractJson('{"a":1,"b":[1,2,],}')).toMatchObject({ ok: true, value: { a: 1, b: [1, 2] } });
  });

  it("normalises smart quotes", () => {
    expect(extractJson('{“a”:1}')).toMatchObject({ ok: true, value: { a: 1 } });
  });

  it("salvages a truncated response by dropping the incomplete tail", () => {
    // finish_reason "length" — observed for real with nemotron-3.5-lightning.
    const raw = '{"name":"Autumn Yoke","palette":[{"hex":"#a33"},{"hex":"#5b7"}],"notes":"work the yo';
    const result = extractJson<{ name: string; palette: unknown[] }>(raw);
    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.value?.name).toBe("Autumn Yoke");
    expect(result.value?.palette).toHaveLength(2);
  });

  it("reports empty responses", () => {
    // OpenRouter sends whitespace keepalive padding; a short timeout yields only that.
    expect(extractJson("           ")).toMatchObject({ ok: false, error: "empty response" });
    expect(extractJson("")).toMatchObject({ ok: false });
  });

  it("reports responses with no object at all", () => {
    expect(extractJson("I cannot help with that.")).toMatchObject({ ok: false });
  });

  it("does not invent values when nothing is salvageable", () => {
    expect(extractJson('{"a":').ok).toBe(false);
  });
});
