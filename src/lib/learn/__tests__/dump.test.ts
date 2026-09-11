import { test } from "vitest";
import fs from "node:fs";
import { STITCH_LIBRARY } from "@/lib/craftKnowledge";

test("dump", () => {
  const out = STITCH_LIBRARY.map((s) => {
    const steps = (s.tutorialImages ?? [])
      .filter((t) => t.startsWith("data:"))
      .map((t) => {
        const svg = decodeURIComponent(t.replace("data:image/svg+xml;utf8,", ""));
        return [...svg.matchAll(/font-size="11"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ");
      });
    return [`## ${s.id} [${s.craftType}] ${s.name} (${s.abbreviation})`,
     `APPEARANCE: ${s.appearance}`,
     `USEFOR: ${s.useFor}`,
     `TUTORIAL: ${s.tutorial}`,
     `VIDEO: ${s.videoQuery}`,
     `SOURCE: ${s.sourceUrl}`,
     ...steps.map((x, i) => `STEP${i + 1}: ${x}`),
    ].join("\n");
  }).join("\n");
  fs.writeFileSync("/private/tmp/claude-501/-Users-constancacunha-knitcraft-ai/664ebc33-9767-49f7-bc3a-4fb685110c94/scratchpad/stitches.txt", out);
});
