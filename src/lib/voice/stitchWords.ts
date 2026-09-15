/**
 * Spoken stitch vocabulary, for counting a row out loud stitch by stitch:
 * "knit, purl, knit, purl, purl" marks five stitches, in that order.
 *
 * Homophones matter more than completeness here. Speech recognisers reliably
 * return "pearl" for purl, "nit" for knit and "sale" for ssk, and a knitter
 * will not notice a dropped stitch until the row is wrong — so every plausible
 * misrecognition is mapped rather than ignored.
 */

export type StitchCraft = "knitting" | "crocheting" | "cross-stitch";

export interface StitchCall {
  /** Canonical stitch id, matching the chart symbol ids where possible. */
  stitch: string;
  /** Display abbreviation, e.g. "k", "p", "dc". */
  abbr: string;
  craft: StitchCraft;
}

interface StitchWord extends StitchCall {
  /** Spoken forms, including homophones the recogniser actually produces. */
  spoken: string[];
}

const WORDS: StitchWord[] = [
  // --- knitting ---------------------------------------------------------
  { stitch: "knit", abbr: "k", craft: "knitting",
    spoken: ["knit", "nit", "kay", "kn", "knitted", "net"] },
  { stitch: "purl", abbr: "p", craft: "knitting",
    spoken: ["purl", "pearl", "pearls", "pur", "perl", "pearl stitch", "pee"] },
  { stitch: "yarn-over", abbr: "yo", craft: "knitting",
    spoken: ["yarn over", "yarnover", "yo", "why oh", "wire over"] },
  { stitch: "k2tog", abbr: "k2tog", craft: "knitting",
    spoken: ["knit two together", "k two tog", "k2tog", "knit 2 together", "two together"] },
  { stitch: "ssk", abbr: "ssk", craft: "knitting",
    spoken: ["slip slip knit", "ssk", "s s k", "sale", "slip slip"] },
  { stitch: "slip", abbr: "sl", craft: "knitting",
    spoken: ["slip", "slip one", "sl one", "slipped"] },
  { stitch: "m1", abbr: "M1", craft: "knitting",
    spoken: ["make one", "m one", "m1", "increase"] },
  { stitch: "kfb", abbr: "kfb", craft: "knitting",
    spoken: ["knit front back", "kfb", "knit front and back"] },
  { stitch: "bobble", abbr: "MB", craft: "knitting",
    spoken: ["bobble", "make bobble", "nupp"] },
  { stitch: "cable", abbr: "C", craft: "knitting",
    spoken: ["cable", "cross", "cable cross", "twist"] },

  // --- crochet ----------------------------------------------------------
  { stitch: "chain", abbr: "ch", craft: "crocheting",
    spoken: ["chain", "chains", "ch", "chain stitch"] },
  { stitch: "single-crochet", abbr: "sc", craft: "crocheting",
    spoken: ["single crochet", "single", "sc", "s c", "double crochet uk"] },
  { stitch: "half-double-crochet", abbr: "hdc", craft: "crocheting",
    spoken: ["half double", "half double crochet", "hdc", "half treble"] },
  { stitch: "double-crochet", abbr: "dc", craft: "crocheting",
    spoken: ["double crochet", "double", "dc", "d c", "treble uk"] },
  { stitch: "treble-crochet", abbr: "tr", craft: "crocheting",
    spoken: ["treble", "treble crochet", "triple crochet", "tr"] },
  { stitch: "slip-stitch-crochet", abbr: "sl st", craft: "crocheting",
    spoken: ["slip stitch", "sl st", "slipstitch"] },
  { stitch: "cluster", abbr: "cl", craft: "crocheting",
    spoken: ["cluster", "cl"] },
  { stitch: "shell", abbr: "shell", craft: "crocheting",
    spoken: ["shell", "fan"] },
  { stitch: "picot", abbr: "picot", craft: "crocheting",
    spoken: ["picot", "pico"] },

  // --- cross stitch -----------------------------------------------------
  { stitch: "full-cross", abbr: "X", craft: "cross-stitch",
    spoken: ["cross", "full cross", "x", "ex", "cross stitch"] },
  { stitch: "half-cross", abbr: "/", craft: "cross-stitch",
    spoken: ["half cross", "half stitch", "half"] },
  { stitch: "backstitch", abbr: "bs", craft: "cross-stitch",
    spoken: ["backstitch", "back stitch", "outline"] },
  { stitch: "french-knot", abbr: "fk", craft: "cross-stitch",
    spoken: ["french knot", "knot"] },
];

/**
 * Longest spoken form first, so "knit two together" is matched before "knit"
 * and "half double crochet" before "double crochet".
 */
function buildLookup(words: StitchWord[]) {
  return words
    .flatMap((w) =>
      w.spoken.map((phrase) => ({
        phrase,
        call: { stitch: w.stitch, abbr: w.abbr, craft: w.craft },
      }))
    )
    .sort((a, b) => b.phrase.length - a.phrase.length);
}

const LOOKUP_ALL = buildLookup(WORDS);

/**
 * Some words mean different things in different crafts: "cross" is a cable
 * crossing to a knitter and a full cross to a cross-stitcher. Resolving
 * against the project's own craft first removes the ambiguity instead of
 * letting sort order decide it.
 */
const LOOKUP_BY_CRAFT: Record<StitchCraft, ReturnType<typeof buildLookup>> = {
  knitting: buildLookup(WORDS.filter((w) => w.craft === "knitting")),
  crocheting: buildLookup(WORDS.filter((w) => w.craft === "crocheting")),
  "cross-stitch": buildLookup(WORDS.filter((w) => w.craft === "cross-stitch")),
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function readCount(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) {
    const n = Number.parseInt(token, 10);
    return n > 0 && n <= 99 ? n : null;
  }
  return NUMBER_WORDS[token] ?? null;
}

/**
 * Parse a spoken run of stitches into individual calls.
 *
 * Handles both "knit purl knit purl purl" (five calls) and "knit two purl two"
 * (also four calls — a trailing number multiplies the stitch before it, the way
 * a pattern is read aloud).
 *
 * Returns null when the utterance contains no stitch words at all, so the
 * caller can fall through to other command handling.
 */
export function parseStitchSequence(
  text: string,
  craft?: StitchCraft
): StitchCall[] | null {
  // Words from the project's craft win; everything else is still understood so
  // a mixed-craft utterance is not silently dropped.
  const lookup = craft
    ? [...LOOKUP_BY_CRAFT[craft], ...LOOKUP_ALL]
    : LOOKUP_ALL;
  const cleaned = text
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  const calls: StitchCall[] = [];
  let rest = cleaned;
  let guard = 0;

  while (rest && guard < 200) {
    guard += 1;

    const match = lookup.find(
      (entry) => rest === entry.phrase || rest.startsWith(`${entry.phrase} `)
    );

    if (!match) {
      // Skip a leading filler token and try again.
      const space = rest.indexOf(" ");
      if (space === -1) break;
      const skipped = rest.slice(0, space);
      // A number with no stitch before it is not a sequence — bail out so
      // "twenty four" stays a count, not a mystery stitch.
      if (calls.length === 0 && readCount(skipped) !== null) return null;
      rest = rest.slice(space + 1);
      continue;
    }

    rest = rest.slice(match.phrase.length).trim();

    // A number directly after the stitch repeats it: "knit two" = k, k.
    const nextToken = rest.split(" ")[0];
    const repeat = readCount(nextToken);
    if (repeat !== null) {
      rest = rest.slice(nextToken.length).trim();
      for (let i = 0; i < repeat; i += 1) calls.push(match.call);
    } else {
      calls.push(match.call);
    }
  }

  return calls.length ? calls : null;
}

/** Summarise a sequence the way a pattern would write it: "k2, p2, k1". */
export function describeSequence(calls: StitchCall[]): string {
  if (!calls.length) return "";
  const parts: string[] = [];
  let current = calls[0];
  let run = 1;

  for (let i = 1; i <= calls.length; i += 1) {
    const next = calls[i];
    if (next && next.stitch === current.stitch) {
      run += 1;
      continue;
    }
    parts.push(run > 1 ? `${current.abbr}${run}` : current.abbr);
    if (next) {
      current = next;
      run = 1;
    }
  }
  return parts.join(", ");
}
