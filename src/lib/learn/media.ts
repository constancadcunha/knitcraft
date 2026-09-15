import { photoCredit, type PhotoCredit } from "@/lib/diagrams";
import { photoForLesson } from "./content";
import type { LearnEntry } from "./types";
const crossPhoto: PhotoCredit = {
  key: "cross-stitch-example", title: "Flower market cross stitch", author: "Garth Weals", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/", sourceUrl: "https://commons.wikimedia.org/wiki/File:Flower_market_cross_stitch,_v1.jpg", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Flower_market_cross_stitch,_v1.jpg?width=600", depicts: "A completed flower-market cross stitch project", verified: "2026-09-12",
};
/** Context photos are labelled as examples, never presented as a specific stitch. */
export function cardPhoto(lesson: LearnEntry): { photo: PhotoCredit; contextual: boolean } {
  const exact = photoForLesson(lesson);
  if (exact && /\.(jpg|jpeg)(?:\?|$)/i.test(decodeURIComponent(exact.url))) return { photo: exact, contextual: false };
  return { photo: lesson.craft === "cross-stitch" ? crossPhoto : photoCredit(lesson.craft === "knitting" ? "stockinette" : "granny-square")!, contextual: true };
}
export function sourcedDiagram(lesson: LearnEntry) {
  if (lesson.id === "single-crochet") return { url: "/learn/single-crochet.svg", source: "https://commons.wikimedia.org/wiki/File:Crochet_completed_single_crochet_stitch.svg", credit: "Cary Bass-Deschênes · CC BY 4.0", licence: "https://creativecommons.org/licenses/by/4.0/" };
  const p = photoForLesson(lesson);
  if (p && !/\.(jpg|jpeg)(?:\?|$)/i.test(decodeURIComponent(p.url))) return { url: p.url, source: p.sourceUrl, credit: `${p.author} · ${p.licence}`, licence: p.licenceUrl };
  return null;
}
