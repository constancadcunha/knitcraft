import { it } from "vitest";
import { CURATED_PHOTOS } from "@/lib/diagrams";
it("lists curated photos", () => {
  console.log("count:", CURATED_PHOTOS.length);
  for (const p of CURATED_PHOTOS) console.log(`${p.key} | ${p.licence} | ${p.author} | ${p.url}`);
});
