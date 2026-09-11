/**
 * attribution.ts — licensing for the handful of places a photograph genuinely
 * beats a drawing.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Learn page shipped ~20 Creative Commons photographs with no credit line
 * anywhere in the source tree. CC BY and CC BY-SA both make attribution a
 * CONDITION of the licence: without the author, the licence name and a link,
 * there is no licence at all. Three of the files in use went further and stated
 * the requirement inside their own Commons description.
 *
 * The fix is structural, not editorial. A photo cannot enter this app except as
 * a `PhotoCredit`, and a `PhotoCredit` cannot be constructed without an author,
 * a licence, a licence URL and a link back to the source. If you cannot fill
 * those fields in, you may not use the picture.
 *
 * Diagrams remain the default. This list exists only for the cases where a
 * learner needs to compare their fabric against real yarn — texture, drape,
 * colour — which no pixel drawing can honestly stand in for.
 *
 * PROVENANCE OF THIS LIST
 * -----------------------
 * Every entry below was checked twice on 2026-09-10:
 *   - licence, author and description read from the Wikimedia Commons
 *     `imageinfo`/`extmetadata` API, not from the file page's rendered HTML;
 *   - the delivery URL fetched with `curl -L -A 'StitchCraft/1.0'` and confirmed
 *     to return HTTP 200.
 *
 * URLs use `Special:FilePath`, never a hand-written `/thumb/<h>/<hh>/` path. The
 * old code hardcoded those two-level MD5-derived directories and got three of
 * them wrong; Special:FilePath resolves the hash and an available thumbnail
 * width server-side, so that entire class of bug cannot recur.
 *
 * DELIBERATELY NOT HERE
 * ---------------------
 *   - Anything from craftyarncouncil.com. Their site is "Website (c)2009-2026
 *     Craft Yarn Council"; their "reprinted with permission" note grants THEM a
 *     right, not us. Two of the twelve hotlinks in the old code already 404.
 *   - "Slip Stitch.jpg", "Crocheted bobble edging.jpg" and "Scallop edge...
 *     shell stitch border.jpg", which demand credit to mostcraft.com in their
 *     file description. They are usable, but only with that exact credit; until
 *     someone adds it deliberately they stay out.
 *   - "Florence home needle-work (1895).jpg", an 1895 plate of MOSAIC
 *     EMBROIDERY that was standing in for two crochet stitches.
 */

/** The licences we accept. Anything else needs a human decision, not a default. */
export type LicenceId =
  | "CC0"
  | "CC BY 2.0"
  | "CC BY 3.0"
  | "CC BY 4.0"
  | "CC BY-SA 2.0"
  | "CC BY-SA 3.0"
  | "CC BY-SA 4.0";

/** Canonical deed URLs. Held here so no entry can link to a mistyped licence. */
export const LICENCE_URLS: Record<LicenceId, string> = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};

export interface PhotoCredit {
  /** Stable lookup key used by the app. */
  key: string;
  /** Ready-to-use delivery URL (Special:FilePath, width-limited). */
  url: string;
  /** The work's title, as the licence's "title" element. */
  title: string;
  /** The named author. Never blank: CC BY without a name is not a licence. */
  author: string;
  licence: LicenceId;
  licenceUrl: string;
  /** Where the licence and author can be verified — the Commons file page. */
  sourceUrl: string;
  /**
   * What the photograph ACTUALLY shows, taken from its own description and
   * categories. This field exists because the previous library used a crochet
   * slip-stitch photo for a knitted slipped stitch and for a mattress seam.
   */
  depicts: string;
  /** ISO date on which the URL returned 200 and the licence was re-read. */
  verified: string;
}

const COMMONS_FILE_PAGE = "https://commons.wikimedia.org/wiki/File:";
const COMMONS_FILE_PATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

/**
 * Build a delivery URL for a Commons file. `width` asks the thumbnailer for a
 * sensible size — the originals here run to 3928x2444, and the old code shipped
 * full-resolution JPEGs into a 144px-tall card.
 */
export function commonsFileUrl(fileName: string, width = 960): string {
  return `${COMMONS_FILE_PATH}${encodeURIComponent(fileName)}?width=${width}`;
}

/** The Commons file page — the licence's required link back to the source. */
export function commonsFilePage(fileName: string): string {
  return `${COMMONS_FILE_PAGE}${encodeURIComponent(fileName)}`;
}

interface CuratedInput {
  key: string;
  file: string;
  title: string;
  author: string;
  licence: LicenceId;
  depicts: string;
}

function curate(entries: readonly CuratedInput[], verified: string): readonly PhotoCredit[] {
  return entries.map((e) => ({
    key: e.key,
    url: commonsFileUrl(e.file),
    title: e.title,
    author: e.author,
    licence: e.licence,
    licenceUrl: LICENCE_URLS[e.licence],
    sourceUrl: commonsFilePage(e.file),
    depicts: e.depicts,
    verified,
  }));
}

/**
 * The curated set. Small on purpose: a photograph earns its place only when the
 * thing being taught is how real yarn behaves.
 */
export const CURATED_PHOTOS: readonly PhotoCredit[] = curate(
  [
    // — knitted fabric, for comparing against your own —
    {
      key: "stockinette",
      file: "Stockinette example front.JPG",
      title: "Stockinette example front",
      author: "Pschemp",
      licence: "CC BY-SA 3.0",
      depicts: "Hand-knitted stockinette fabric photographed from the front.",
    },
    {
      key: "stockinette-cc0",
      file: "Knit stockinette stitch.jpg",
      title: "Knit stockinette stitch",
      author: "Kawan856",
      licence: "CC0",
      depicts:
        "A swatch of stockinette. The only public-domain photo in this set — use it where a credit line will not fit.",
    },
    {
      key: "garter",
      file: "Rätstickning.jpg",
      title: "Rätstickning",
      author: "Hobbsansak",
      licence: "CC BY-SA 4.0",
      depicts: "Knitting swatch of garter stitch.",
    },
    {
      key: "ribbing",
      file: "Ribbstickning.jpg",
      title: "Ribbstickning",
      author: "Hobbsansak",
      licence: "CC BY-SA 4.0",
      depicts: "Knitting swatch of ribbed knitting, 2 knit and 2 purled.",
    },
    {
      key: "cable",
      file: "Flätstickning.jpg",
      title: "Flätstickning",
      author: "Hobbsansak",
      licence: "CC BY-SA 4.0",
      depicts: "Cable knitting, showing one left-leaning and one right-leaning cable.",
    },
    {
      key: "brioche",
      file: "Patentstickning.jpg",
      title: "Patentstickning",
      author: "Hobbsansak",
      licence: "CC BY-SA 4.0",
      depicts: "Knitting swatch of fisherman's rib (brioche) stitch.",
    },
    {
      key: "stranded-colourwork",
      file: "Fairisle work.jpg",
      title: "Fairisle work",
      author: "Sudzie",
      licence: "CC BY-SA 4.0",
      depicts: "Fair Isle: a knitted pattern worked in several colours of wool.",
    },
    {
      key: "lace",
      file: "Lace knitting.JPG",
      title: "Lace knitting",
      author: "NellieBly",
      licence: "CC BY-SA 3.0",
      depicts: "Lace knitting in progress on the needles.",
    },
    {
      key: "yarn-over",
      file: "Knit Texture Eyelet Lace.jpg",
      title: "Knit Texture Eyelet Lace",
      author: "beep1o",
      licence: "CC BY-SA 2.0",
      depicts: "Eyelet lace — the holes left by yarn overs, close up.",
    },
    {
      key: "short-rows",
      file: "Short row rib scarf.jpg",
      title: "Short row rib scarf",
      author: "starathena",
      licence: "CC BY 2.0",
      depicts: "A ribbed scarf hand-knitted with a pattern that uses short rows.",
    },
    {
      key: "slipped-stitch",
      file: "Knitting wales slip stitch.png",
      title: "Knitting wales slip stitch",
      author: "WillowW",
      licence: "CC BY 3.0",
      depicts:
        "Diagram of a knitting wale in which one stitch is slipped rather than worked.",
    },
    {
      key: "knit-purl-anatomy",
      file: "Knitting knit and purl stitches.png",
      title: "Knitting knit and purl stitches",
      author: "WillowW",
      licence: "CC BY 3.0",
      depicts:
        "Large-scale illustration of the knit stitch and the purl stitch side by side.",
    },
    // — finishing techniques —
    {
      key: "picking-up-stitches",
      file: "Picking up stitches for mitton thumb.jpg",
      title: "Picking up stitches for mitten thumb",
      author: "mararie",
      licence: "CC BY-SA 2.0",
      depicts: "Stitches being picked up along an edge to make a mitten thumb.",
    },
    {
      key: "grafting",
      file: "Grafting knitting.jpg",
      title: "Grafting knitting",
      author: "katrinket",
      licence: "CC BY-SA 2.0",
      depicts: "Knitted stitches being grafted (Kitchener stitch).",
    },
    {
      key: "slipped-stitch-mistake",
      file: "Slipped stitch mistake.jpg",
      title: "Slipped stitch mistake",
      author: "rmkoske",
      licence: "CC BY-SA 2.0",
      depicts: "A stitch accidentally slipped while knitting — what the error looks like.",
    },
    // — reference charts —
    {
      key: "knit-chart-symbols",
      file: "KnitChartSymbols CYC103.png",
      title: "KnitChartSymbols CYC103",
      author: "Stilfehler",
      licence: "CC BY-SA 4.0",
      depicts:
        "Knitting chart symbols for a 2/2 left cross, using symbols endorsed by the Craft Yarn Council.",
    },
    {
      key: "crochet-terms-us-uk",
      file: "Crochet-terms-zh-us-uk.png",
      title: "Crochet-terms-zh-us-uk",
      author: "prattflora",
      licence: "CC BY-SA 3.0",
      depicts:
        "Crochet stitch names compared across Chinese, US and UK terminology — the US dc / UK tr trap.",
    },
    // — crocheted fabric —
    {
      key: "granny-square",
      file: "Granny square.jpg",
      title: "Granny square",
      author: "Durova",
      licence: "CC BY-SA 4.0",
      depicts: "A crocheted granny square in cotton, worked on a 4mm hook.",
    },
    {
      key: "v-stitch",
      file: "Crochet Single V Stitch.jpg",
      title: "Crochet Single V Stitch",
      author: "Stilfehler",
      licence: "CC BY-SA 4.0",
      depicts:
        "A crocheted V-stitch: one stitch, two chains and another stitch worked into the same hole.",
    },
    {
      key: "working-in-the-round",
      file: "Crochet-round.jpg",
      title: "Crochet-round",
      author: "flora",
      licence: "CC BY-SA 3.0",
      depicts: "Crochet worked in the round.",
    },
    {
      key: "foundation-chain",
      file: "Łańcuszek szydełkowanie Chain.png",
      title: "Łańcuszek szydełkowanie Chain",
      author: "Allen Muszyński",
      licence: "CC BY-SA 4.0",
      depicts: "Step-by-step instructions for making a crochet foundation chain.",
    },
  ],
  "2026-09-10",
);

const byKey = new Map(CURATED_PHOTOS.map((p) => [p.key, p]));

/** Look a curated photo up. Returns undefined rather than a near-miss. */
export function photoCredit(key: string): PhotoCredit | undefined {
  return byKey.get(key);
}

/** CC0 waives attribution; every other licence here requires it. */
export function requiresAttribution(licence: LicenceId): boolean {
  return licence !== "CC0";
}

/**
 * ShareAlike licences additionally require that adaptations be released under
 * the same terms. Cropping or recolouring one of these for the app makes the
 * result a derivative — which is a decision, not a styling choice.
 */
export function isShareAlike(licence: LicenceId): boolean {
  return licence.includes("-SA");
}

/**
 * The credit line, in Creative Commons' own recommended TASL order:
 * Title, Author, Source, Licence.
 */
export function creditLine(photo: PhotoCredit): string {
  if (!requiresAttribution(photo.licence)) {
    return `"${photo.title}" by ${photo.author} (${photo.licence}, no attribution required)`;
  }
  return `"${photo.title}" by ${photo.author}, via Wikimedia Commons, licensed ${photo.licence}`;
}

/**
 * The same credit as a fragment of HTML, with the two links the licence asks
 * for: one to the source and one to the licence deed. Returns a plain string so
 * this module stays framework-free; render it with `dangerouslySetInnerHTML` or
 * rebuild it in JSX from the fields.
 */
export function creditHtml(photo: PhotoCredit): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return (
    `<a href="${esc(photo.sourceUrl)}" rel="noopener noreferrer" target="_blank">${esc(photo.title)}</a>` +
    ` by ${esc(photo.author)}, ` +
    `<a href="${esc(photo.licenceUrl)}" rel="license noopener noreferrer" target="_blank">${esc(photo.licence)}</a>`
  );
}

/**
 * Every credit the app owes, deduplicated — for an "Image credits" section.
 * A page-level list does not replace a per-image credit, but it is what makes
 * the ShareAlike obligations visible to whoever maintains this next.
 */
export function allCredits(): readonly PhotoCredit[] {
  return CURATED_PHOTOS.filter((p) => requiresAttribution(p.licence));
}
