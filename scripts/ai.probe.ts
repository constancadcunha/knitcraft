/**
 * Live smoke test for the AI design-intent path. Excluded from `npm test`
 * because it makes real network calls and spends free-tier quota.
 *
 *   npm run probe:ai
 */
import { expect, it } from "vitest";
import { generateDesignIntent } from "@/lib/ai/designIntent";

const apiKey = process.env.OPENROUTER_API_KEY ?? "";

const CASES = [
  {
    label: "cable sweater (the explicit user ask)",
    craftType: "knitting",
    garmentType: "Sweater",
    description: "A cosy aran jumper with big twisting cables down the front",
    stitchPreference: "cable",
    expectKind: "cable",
  },
  {
    label: "fair isle yoke",
    craftType: "knitting",
    garmentType: "Pullover",
    description: "Fair Isle yoke sweater in autumn colours",
  },
  {
    label: "crochet granny blanket",
    craftType: "crocheting",
    garmentType: "Baby Blanket",
    description: "Soft granny square blanket in pastels",
  },
];

for (const c of CASES) {
  it(`designs: ${c.label}`, async () => {
    expect(apiKey, "OPENROUTER_API_KEY must be set").toBeTruthy();

    const started = Date.now();
    const result = await generateDesignIntent({ apiKey, ...c });
    const ms = Date.now() - started;

    for (const a of result.attempts) {
      console.log(`   tried ${a.model} (${a.ms}ms): ${a.problem}`);
    }

    if (!result.ok || !result.value) {
      console.log(`   FAILED after ${ms}ms: ${result.error}`);
      throw new Error(result.error ?? "failed");
    }

    const d = result.value;
    console.log(
      [
        `   ${ms}ms via ${result.model}`,
        `   name      ${d.name}`,
        `   motifKind ${d.motifKind}`,
        `   motif     ${d.motifDescription}`,
        `   stitch    ${d.stitchPattern}`,
        `   build     ${d.construction}`,
        `   palette   ${d.palette.map((p) => `${p.hex} ${p.name}`).join(" | ")}`,
      ].join("\n")
    );

    expect(d.name).toBeTruthy();
    expect(d.palette.length).toBeGreaterThanOrEqual(2);
    for (const p of d.palette) expect(p.hex).toMatch(/^#[0-9a-f]{6}$/);
    if (c.expectKind) expect(d.motifKind).toBe(c.expectKind);
  });
}
