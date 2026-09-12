import { it } from "vitest";
import { lessonsForCraft, photoForLesson } from "@/lib/learn/content";
import { learnDiagram } from "@/lib/learn/diagrams";
import { diagramFor } from "@/lib/diagrams";

it("finds duplicate artwork", () => {
  for (const craft of ["knitting", "crocheting", "cross-stitch"] as const) {
    const bySvg = new Map<string, string[]>();
    const byPhoto = new Map<string, string[]>();
    for (const l of lessonsForCraft(craft)) {
      const p = photoForLesson(l);
      if (p) byPhoto.set(p.key, [...(byPhoto.get(p.key) ?? []), l.id]);
      const svg = l.diagram.source === "learn" ? learnDiagram(l.diagram.id) : diagramFor(l.diagram.id).svg;
      if (svg) bySvg.set(svg, [...(bySvg.get(svg) ?? []), l.id]);
    }
    const dupPhotos = [...byPhoto.entries()].filter(([, ids]) => ids.length > 1);
    const dupSvgs = [...bySvg.entries()].filter(([, ids]) => ids.length > 1);
    console.log(`${craft}: ${lessonsForCraft(craft).length} lessons, ${dupPhotos.length} shared photos, ${dupSvgs.length} shared diagrams`);
    for (const [k, ids] of dupPhotos) console.log(`   photo ${k} -> ${ids.join(", ")}`);
    for (const [, ids] of dupSvgs) console.log(`   diagram shared by -> ${ids.join(", ")}`);
  }
});
