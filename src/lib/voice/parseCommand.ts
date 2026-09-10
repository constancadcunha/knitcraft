/**
 * Pure speech-command parser for hands-free stitch counting.
 *
 * Design notes:
 *  - A knitter's hands are busy and the mic is far away, so recognition is
 *    noisy. We match on *contained phrases*, not exact equality, and we sort
 *    patterns longest-first so "next row" wins over "next".
 *  - The most common utterance by far is a bare tally ("one", "yep", "next").
 *    Those map to a +1 increment so the user can literally count out loud.
 *  - Anything unrecognised returns null and the caller ignores it, rather than
 *    guessing — a wrong increment is worse than a missed one, because the
 *    knitter won't notice it until the row is wrong.
 */

export type VoiceCommand =
  | { kind: "increment"; by: number }
  | { kind: "decrement"; by: number }
  | { kind: "nextRow" }
  | { kind: "prevRow" }
  | { kind: "gotoRow"; row: number }
  | { kind: "setCount"; count: number }
  | { kind: "resetRow" }
  | { kind: "status" }
  | { kind: "readNext" }
  | { kind: "repeat" }
  | { kind: "undo" }
  | { kind: "pause" }
  | { kind: "markRow" };

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4,
  for: 4, five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

/**
 * Parse a spoken number: digits ("42"), words ("forty two"), or hyphenated
 * words ("forty-two"). Returns null when no number is present.
 */
export function parseSpokenNumber(text: string): number | null {
  const digits = text.match(/\d+/);
  if (digits) {
    const n = Number.parseInt(digits[0], 10);
    return Number.isFinite(n) ? n : null;
  }

  const words = text.replace(/-/g, " ").split(/\s+/).filter(Boolean);
  let total: number | null = null;
  let current: number | null = null;

  for (const word of words) {
    if (word === "hundred") {
      current = (current ?? 1) * 100;
      continue;
    }
    if (word in TENS) {
      current = (current ?? 0) + TENS[word];
      continue;
    }
    if (word in UNITS) {
      current = (current ?? 0) + UNITS[word];
      continue;
    }
    // A non-number word ends the current run.
    if (current !== null) {
      total = (total ?? 0) + current;
      current = null;
    }
  }
  if (current !== null) total = (total ?? 0) + current;
  return total;
}

/** Phrases that mean "+1", i.e. counting a single stitch out loud. */
const TALLY = [
  "next stitch", "one more", "plus one", "add one", "count one",
  "next", "count", "stitch", "yep", "yes", "yup", "okay", "check",
  "tick", "done", "got it", "there", "and", "one",
];

const RULES: Array<{
  match: RegExp;
  build: (m: RegExpMatchArray, text: string) => VoiceCommand | null;
}> = [
  // --- pause / stop ------------------------------------------------------
  { match: /\b(pause|stop listening|stop counting|hold on|wait)\b/, build: () => ({ kind: "pause" }) },

  // --- explicit row navigation (must precede bare "next") ----------------
  { match: /\b(go to|goto|jump to|switch to)?\s*row\s+(.+)$/, build: (m) => {
      const row = parseSpokenNumber(m[2]);
      return row !== null && row > 0 ? { kind: "gotoRow", row } : null;
    } },
  { match: /\b(next row|new row|row done|finish(ed)? (the )?row|turn work|turn)\b/, build: () => ({ kind: "nextRow" }) },
  { match: /\b(previous row|last row|back a row|row back|go back a row)\b/, build: () => ({ kind: "prevRow" }) },
  { match: /\b(mark|complete|tick off)( this)? row\b/, build: () => ({ kind: "markRow" }) },

  // --- explicit counts ---------------------------------------------------
  { match: /\b(set|make)( the)? count( to)?\s+(.+)$/, build: (m) => {
      const count = parseSpokenNumber(m[4]);
      return count !== null ? { kind: "setCount", count } : null;
    } },
  { match: /\b(plus|add|count|forward)\s+(.+)$/, build: (m) => {
      const by = parseSpokenNumber(m[2]);
      return by !== null && by > 0 ? { kind: "increment", by } : null;
    } },
  { match: /\b(minus|subtract|back|remove|take off)\s+(.+)$/, build: (m) => {
      const by = parseSpokenNumber(m[2]);
      return by !== null && by > 0 ? { kind: "decrement", by } : null;
    } },

  // --- corrections -------------------------------------------------------
  { match: /\b(undo|oops|mistake|scratch that|no wait|wrong)\b/, build: () => ({ kind: "undo" }) },
  { match: /\b(back one|minus one|back up|one less)\b/, build: () => ({ kind: "decrement", by: 1 }) },
  { match: /\b(reset|start over|clear)( the)?( count| row)?\b/, build: () => ({ kind: "resetRow" }) },

  // --- speech output -----------------------------------------------------
  { match: /\b(where am i|status|what row|how many|how far|count\?)\b/, build: () => ({ kind: "status" }) },
  { match: /\b(read|what's next|whats next|next instruction|read it|read that)\b/, build: () => ({ kind: "readNext" }) },
  { match: /\b(repeat|say again|again please|come again)\b/, build: () => ({ kind: "repeat" }) },
];

/**
 * Turn a raw recognition transcript into a command, or null if unrecognised.
 * Rules are evaluated in order; the tally fallback runs last so that specific
 * phrases like "next row" are never swallowed by the bare "next" tally.
 */
export function parseCommand(transcript: string): VoiceCommand | null {
  const text = transcript
    .toLowerCase()
    .replace(/['\u2018\u2019]/g, "")   // "what's" -> "whats", never "what s"
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;

  for (const rule of RULES) {
    const m = text.match(rule.match);
    if (m) {
      const cmd = rule.build(m, text);
      if (cmd) return cmd;
    }
  }

  // Bare number on its own = jump the stitch count to that value.
  // ("twenty four" while counting a row means you're at 24.)
  const bare = text.match(/^[\d\s\w-]+$/) ? parseSpokenNumber(text) : null;
  if (bare !== null && /^(\d|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thir|four|fif|six|seven|eigh|nine|twenty|thirty|forty|fourty|fifty|sixty|seventy|eighty|ninety|hundred)/.test(text)) {
    // "one" alone is far more likely a tally than a jump to 1.
    if (bare > 1) return { kind: "setCount", count: bare };
  }

  // Tally fallback. Deliberately restricted to utterances of at most three
  // words: someone counting out loud says "one" or "next", not a sentence.
  // Without this guard any unmatched phrase containing "next" or "done" would
  // silently add a stitch — a miscount the knitter only discovers rows later.
  const words = text.split(" ");
  if (words.length <= 3) {
    const tally = [...TALLY].sort((a, b) => b.length - a.length);
    for (const phrase of tally) {
      if (
        text === phrase ||
        text.includes(` ${phrase} `) ||
        text.startsWith(`${phrase} `) ||
        text.endsWith(` ${phrase}`)
      ) {
        return { kind: "increment", by: 1 };
      }
    }
  }

  return null;
}
