/**
 * Salvage a JSON object from an LLM response.
 *
 * Free models return JSON wrapped in every imaginable way. Measured against
 * the models this app actually uses (see models.ts), the real cases are:
 *   - ```json fenced blocks, sometimes unterminated
 *   - <think>...</think> reasoning preambles (deepseek-style)
 *   - a sentence of prose before or after the object
 *   - trailing commas, and single quotes instead of double
 *   - truncation mid-string when finish_reason is "length"
 *
 * Everything here is pure so it can be tested without network access.
 */

export interface ExtractResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  /** True when the input looked truncated rather than merely malformed. */
  truncated?: boolean;
}

/** Strip reasoning preambles and markdown fences. */
export function stripWrappers(raw: string): string {
  let text = raw.trim();

  // Reasoning blocks. Handle an unterminated <think> too — some models get cut
  // off mid-thought, in which case everything after it is unusable.
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const danglingThink = text.search(/<think>/i);
  if (danglingThink !== -1) text = text.slice(0, danglingThink);

  // Fenced code blocks: prefer the contents of the first fence.
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();

  // An opening fence with no closing fence (truncated response).
  const openFence = text.match(/```(?:json|JSON)?\s*([\s\S]*)$/);
  if (openFence) return openFence[1].trim();

  return text.trim();
}

/**
 * Find the outermost balanced {...} span, respecting strings and escapes so a
 * brace inside a string value doesn't end the object early.
 */
export function findJsonSpan(text: string): { start: number; end: number; balanced: boolean } | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: i, balanced: true };
    }
  }

  // Ran out of input with braces still open — truncated.
  return { start, end: text.length - 1, balanced: false };
}

/** Repairs that are safe because they only remove syntax, never invent values. */
function repairSyntax(text: string): string {
  return text
    // Trailing commas before a closing brace/bracket.
    .replace(/,\s*([}\]])/g, "$1")
    // Smart quotes the model may have used for keys or values.
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

/**
 * Close a truncated object by discarding the incomplete tail and balancing
 * the brackets. Returns null when there is nothing salvageable.
 */
function closeTruncated(fragment: string): string | null {
  // Drop everything after the last complete key/value pair.
  let cut = fragment.lastIndexOf(",");
  const lastBrace = Math.max(fragment.lastIndexOf("}"), fragment.lastIndexOf("]"));
  if (lastBrace > cut) cut = lastBrace;
  if (cut <= 0) return null;

  let body = fragment.slice(0, cut === lastBrace ? cut + 1 : cut);

  // Balance whatever is still open, ignoring brackets inside strings.
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of body) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { if (inString) escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) return null;

  while (stack.length) body += stack.pop() === "{" ? "}" : "]";
  return body;
}

/** Parse an LLM response into an object, repairing what can be repaired. */
export function extractJson<T = unknown>(raw: string): ExtractResult<T> {
  if (!raw || !raw.trim()) return { ok: false, error: "empty response" };

  const text = stripWrappers(raw);
  const span = findJsonSpan(text);
  if (!span) return { ok: false, error: "no JSON object found" };

  const fragment = text.slice(span.start, span.end + 1);

  const attempts: Array<{ source: string; truncated: boolean }> = [
    { source: fragment, truncated: !span.balanced },
    { source: repairSyntax(fragment), truncated: !span.balanced },
  ];
  if (!span.balanced) {
    const closed = closeTruncated(repairSyntax(fragment));
    if (closed) attempts.push({ source: closed, truncated: true });
  }

  for (const attempt of attempts) {
    try {
      return {
        ok: true,
        value: JSON.parse(attempt.source) as T,
        truncated: attempt.truncated,
      };
    } catch {
      // Try the next repair.
    }
  }

  return {
    ok: false,
    error: span.balanced ? "malformed JSON" : "response was truncated",
    truncated: !span.balanced,
  };
}
