import { extractJson } from "@/lib/ai/extractJson";
import {
  ATTEMPT_TIMEOUT_MS,
  TOTAL_BUDGET_MS,
  TEXT_MODELS,
  VISION_MODELS,
} from "@/lib/ai/models";

const BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export interface CallOutcome<T> {
  ok: boolean;
  value?: T;
  /** The model that actually served the response — OpenRouter may reroute. */
  model?: string;
  /** Every model tried, with why it failed. Surfaced to the user, not swallowed. */
  attempts: Array<{ model: string; ms: number; problem: string }>;
  error?: string;
}

interface OpenRouterChoice {
  message?: { content?: string | null; reasoning?: string | null };
  finish_reason?: string;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  model?: string;
  error?: { message?: string };
}

/**
 * Read the assistant text out of a response.
 *
 * Reasoning models return an empty `content` with the text in `reasoning`
 * instead — observed for real with dots-3-note-preview. Treating that as an
 * empty response is how the old code lost answers silently.
 */
function messageText(choice: OpenRouterChoice | undefined): string {
  if (!choice?.message) return "";
  const { content, reasoning } = choice.message;
  if (typeof content === "string" && content.trim()) return content;
  if (typeof reasoning === "string" && reasoning.trim()) return reasoning;
  return "";
}

async function callOnce(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  timeoutMs: number
): Promise<{ text: string; served: string; finish?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter uses these for attribution on its dashboard.
        "HTTP-Referer": "https://stitchcraft.studio",
        "X-Title": "StitchCraft Studio",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: maxTokens,
        // Deliberately no `response_format: json_object`: several free models
        // reject it outright, which would waste a slot in the chain. The
        // prompt asks for bare JSON and extractJson handles the rest.
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      let detail = raw.slice(0, 160);
      try {
        detail = (JSON.parse(raw) as OpenRouterResponse).error?.message ?? detail;
      } catch {
        // Non-JSON error body; the raw slice is the best we have.
      }
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    // A body of only whitespace is OpenRouter's keepalive padding, which means
    // the request was cut short rather than answered.
    if (!raw.trim()) throw new Error("empty body (keepalive padding only)");

    const parsed = JSON.parse(raw) as OpenRouterResponse;
    if (parsed.error?.message) throw new Error(parsed.error.message);

    const choice = parsed.choices?.[0];
    const text = messageText(choice);
    if (!text) throw new Error("no content in response");

    return { text, served: parsed.model ?? model, finish: choice?.finish_reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the model chain for a JSON object, returning the first valid result.
 *
 * Every failure is recorded and returned rather than swallowed — the previous
 * implementation logged nothing, so users silently received a template while
 * believing the AI had designed their pattern.
 */
export async function requestJson<T>({
  apiKey,
  messages,
  hasImage = false,
  maxTokens = 1200,
  validate,
}: {
  apiKey: string;
  messages: ChatMessage[];
  hasImage?: boolean;
  maxTokens?: number;
  /** Reject structurally valid JSON that isn't the shape we asked for. */
  validate?: (value: unknown) => value is T;
}): Promise<CallOutcome<T>> {
  const chain = hasImage ? VISION_MODELS : TEXT_MODELS;
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const attempts: CallOutcome<T>["attempts"] = [];

  for (const model of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 4_000) break;

    const started = Date.now();
    try {
      const { text, served, finish } = await callOnce(
        apiKey,
        model,
        messages,
        maxTokens,
        Math.min(remaining, ATTEMPT_TIMEOUT_MS)
      );

      const result = extractJson<T>(text);
      const ms = Date.now() - started;

      if (!result.ok || result.value === undefined) {
        attempts.push({
          model,
          ms,
          problem:
            finish === "length"
              ? "response truncated (hit the token limit)"
              : (result.error ?? "unparseable"),
        });
        continue;
      }

      if (validate && !validate(result.value)) {
        attempts.push({ model, ms, problem: "JSON did not match the requested shape" });
        continue;
      }

      return { ok: true, value: result.value, model: served, attempts };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push({
        model,
        ms: Date.now() - started,
        problem: message.includes("abort") ? "timed out" : message,
      });
    }
  }

  return {
    ok: false,
    attempts,
    error: attempts.length
      ? `all ${attempts.length} model(s) failed`
      : "no time budget remaining",
  };
}
