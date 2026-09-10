/**
 * OpenRouter model chains.
 *
 * IMPORTANT: free model ids churn constantly. Every id below was verified
 * against the live /models endpoint and exercised with a real strict-JSON
 * request on 2026-09-10; the latencies in the comments are measured, not
 * estimated. The ten ids this file previously contained (deepseek-r1, qwen3,
 * llama-4, gemma-3, mistral-small) had ALL become 404 "unavailable for free",
 * which is why the AI path silently never returned anything.
 *
 * Re-verify with:
 *   curl -H "Authorization: Bearer $KEY" https://openrouter.ai/api/v1/models
 *
 * Chains are ordered by measured latency, not by model size — the request we
 * make is small (design intent only, never a whole pattern), so a fast small
 * model beats a slow large one.
 */

/** Text-only requests: a written garment description. */
export const TEXT_MODELS = [
  "nex-agi/nex-n2.5-mini:free",              //  2.2s, valid JSON
  "openrouter/free",                          //  4.2s, routes to ling-3.0-flash-vl
  "nvidia/nemotron-3-super-120b-a12b:free",   //  4.9s, valid JSON
  "nex-agi/nex-n2.5-pro:free",                // 12.7s, valid JSON
  "google/gemma-4-31b-it:free",               // often 429, worth a last try
] as const;

/** Requests carrying an image. Every id here accepts the image modality. */
export const VISION_MODELS = [
  "nex-agi/nex-n2.5-mini:free",
  "openrouter/free",
  "nex-agi/nex-n2.5-pro:free",
  "google/gemma-4-31b-it:free",
] as const;

/**
 * Models to avoid, recorded so nobody re-adds them:
 *   *-fin / *-sante          domain-tuned for finance / health
 *   north-mini-code, laguna-* code-tuned, poor at prose
 *   lyria-*                   music generation
 *   dots-3-note-preview       reasoning model: returns empty `content` with
 *                             the text in `reasoning`, and burns the whole
 *                             token budget thinking
 *   nemotron-3.5-lightning    ~50s and truncates (finish_reason "length")
 *   thinkingmachines/inkling  403, not actually available on the free tier
 */
export const AVOID_MODELS = [
  "inclusionai/ling-3.0-flash-fin:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-lightning:free",
  "thinkingmachines/inkling:free",
] as const;

/**
 * Timeouts. The previous code allowed 3000ms per attempt against models whose
 * real latency is 2-45s, so no attempt could ever succeed. OpenRouter also
 * sends whitespace keepalive padding, so a request that times out early
 * returns a body of literal spaces rather than an error — which then parsed
 * as "empty" and fell through silently.
 */
export const ATTEMPT_TIMEOUT_MS = 30_000;
export const TOTAL_BUDGET_MS = 55_000;
