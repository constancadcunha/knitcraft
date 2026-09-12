import { it, expect } from "vitest";
import { KNITTING_ENTRIES } from "@/lib/learn/entries/knitting";

it("inspects the knitting entries", () => {
  console.log("entries:", KNITTING_ENTRIES.length);
  const e = KNITTING_ENTRIES[0];
  console.log("keys:", Object.keys(e).join(", "));
  console.log("first:", JSON.stringify(e).slice(0, 500));
  const withSteps = KNITTING_ENTRIES.filter((x) => (x as never as {steps?: unknown[]}).steps?.length).length;
  console.log("with steps:", withSteps);
  expect(KNITTING_ENTRIES.length).toBeGreaterThan(0);
});
