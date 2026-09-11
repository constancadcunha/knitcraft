/**
 * src/lib/learn/photos.ts — the photographs the Learn section is allowed to use.
 *
 * `src/lib/diagrams/attribution.ts` already curates the knitting and crochet
 * photographs, re-verified on 2026-09-10. Cross stitch is new, so its photos are
 * curated here, in the same shape and under the same rule: a picture cannot
 * enter the app except as a `PhotoCredit`, and a `PhotoCredit` cannot exist
 * without a named author, a licence, a licence URL and a link to the source.
 *
 * PROVENANCE
 * ----------
 * Every entry below was checked on 2026-09-11:
 *   - licence, author and description read from the Wikimedia Commons
 *     `imageinfo`/`extmetadata` API, not from the rendered file page;
 *   - the Special:FilePath delivery URL fetched with
 *     `curl -sIL -A 'StitchCraft/1.0'` and confirmed 200 image/jpeg.
 *
 * DELIBERATELY NOT HERE
 * ---------------------
 *   - "Aida-cloth.jpg" (CC BY-SA 3.0). Its Commons author field reads
 *     "Wikipedia.it et Wikipedia.en" — a project, not a person. CC BY without a
 *     nameable author cannot be complied with, so it stays out even though the
 *     photo itself is exactly on topic.
 *   - "Basic cross stitch.jpg" (PD-self, PKM) and "Ex point de croix.jpg"
 *     ("copyrighted free use"). Both are probably fine to use, but neither
 *     licence is in the `LicenceId` union, and widening that union is a decision
 *     for whoever owns the attribution module, not a convenience for this one.
 */

import {
  LICENCE_URLS,
  commonsFilePage,
  commonsFileUrl,
  photoCredit,
  type LicenceId,
  type PhotoCredit,
} from "@/lib/diagrams";
import type { LearnPhoto } from "./types";

interface CrossStitchPhotoInput {
  key: string;
  file: string;
  title: string;
  author: string;
  licence: LicenceId;
  depicts: string;
}

/** Date on which the licence was re-read and the delivery URL returned 200. */
const VERIFIED = "2026-09-11";

const CROSS_STITCH_INPUTS: readonly CrossStitchPhotoInput[] = [
  {
    key: "xs-aida-closeup",
    file: "Counted Cross Stitch with Beadwork on Black Aida Cloth.jpg",
    title: "Counted Cross Stitch with Beadwork on Black Aida Cloth",
    author: "Changku88",
    licence: "CC BY-SA 4.0",
    depicts:
      "Close-up of a counted cross-stitch picture worked on black Aida cloth, with beadwork. The individual Aida blocks and the holes between them are clearly visible.",
  },
  {
    key: "xs-full-crosses",
    file: "Cross stitch detail.jpg",
    title: "Cross stitch detail",
    author: "Paula Kate Marmor",
    licence: "CC BY-SA 3.0",
    depicts:
      "Detail of cross-stitch embroidery: a tea-cloth border in black and red cotton floss, Hungarian, mid-twentieth century. Every top leg slants the same way.",
  },
  {
    key: "xs-in-progress",
    file: "Cross-stich-in-progress.jpg",
    title: "Cross-stitch in progress",
    author: "DomenikaBo",
    licence: "CC BY-SA 4.0",
    depicts:
      "A cross-stitch picture part-way through, photographed beside the paper chart it is being worked from.",
  },
  {
    key: "xs-whole-stitches",
    file: "Heart In Cross Stitch (64645833).jpeg",
    title: "Heart In Cross Stitch",
    author: "Yiota S Xstitch",
    licence: "CC BY 3.0",
    depicts:
      "A swirled heart worked in whole cross stitches only, on 16-count Aida — the photographer's own description names the fabric count.",
  },
  {
    key: "xs-finished-piece",
    file: "Thai biscornu with orchid cross-stitch decoration.jpg",
    title: "Thai biscornu with orchid cross-stitch decoration",
    author: "Melissa Gutierrez",
    licence: "CC BY-SA 2.0",
    depicts:
      "A finished biscornu made up from cross stitch worked on 14-count white Aida, showing how a stitched piece looks once it is made up.",
  },
];

export const CROSS_STITCH_PHOTOS: readonly PhotoCredit[] = CROSS_STITCH_INPUTS.map((e) => ({
  key: e.key,
  url: commonsFileUrl(e.file),
  title: e.title,
  author: e.author,
  licence: e.licence,
  licenceUrl: LICENCE_URLS[e.licence],
  sourceUrl: commonsFilePage(e.file),
  depicts: e.depicts,
  verified: VERIFIED,
}));

const byKey = new Map(CROSS_STITCH_PHOTOS.map((p) => [p.key, p]));

/**
 * Look up a credit by key, searching the shared curated set first and then the
 * cross-stitch additions. Throws rather than returning undefined: an entry that
 * asks for a photo which does not exist is an authoring mistake, and silently
 * dropping it is how a card ends up with a broken image and no explanation.
 */
export function credit(key: string): PhotoCredit {
  const found = photoCredit(key) ?? byKey.get(key);
  if (!found) throw new Error(`No verified photo credit for "${key}"`);
  return found;
}

/** Attach a credit to an entry, with the editorial reason it is there. */
export function photo(key: string, caption: string, why: string): LearnPhoto {
  return { credit: credit(key), caption, why };
}

/** Every credit the Learn section can draw on — for an "Image credits" page. */
export function learnPhotoKeys(): readonly string[] {
  return CROSS_STITCH_PHOTOS.map((p) => p.key);
}
