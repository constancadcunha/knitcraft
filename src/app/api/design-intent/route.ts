import { generateDesignIntent } from "@/lib/ai/designIntent";

/**
 * The model chain is allowed TOTAL_BUDGET_MS (~55s), so the route must outlive it. Without this
 * the platform's default cut the request off long before the chain finished —
 * one of the reasons the AI path never returned anything.
 */
export const maxDuration = 60;

interface Body {
  craftType?: string;
  garmentType?: string;
  description?: string;
  stitchPreference?: string;
  styleOption?: string;
  colourHints?: string[];
  imageBase64?: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "No OPENROUTER_API_KEY configured.",
        // The engine can still build a pattern without any AI at all, so this
        // is a degraded mode rather than a failure. Say so explicitly.
        degraded: true,
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const { craftType, garmentType } = body;
  if (!craftType || !garmentType) {
    return Response.json(
      { error: "craftType and garmentType are required." },
      { status: 400 }
    );
  }

  const started = Date.now();
  const result = await generateDesignIntent({
    apiKey,
    craftType,
    garmentType,
    description: body.description,
    stitchPreference: body.stitchPreference,
    styleOption: body.styleOption,
    colourHints: body.colourHints,
    imageBase64: body.imageBase64,
  });
  const ms = Date.now() - started;

  if (!result.ok || !result.value) {
    // Report what was actually tried. The old pipeline swallowed every failure
    // and silently served a template, so users could not tell the AI had never
    // run. The caller falls back to the deterministic engine and tells the user.
    console.warn(
      `[design-intent] no model succeeded in ${ms}ms:`,
      result.attempts.map((a) => `${a.model} (${a.ms}ms) ${a.problem}`).join("; ")
    );
    return Response.json(
      {
        error: result.error ?? "The design service did not respond.",
        degraded: true,
        attempts: result.attempts,
        elapsedMs: ms,
      },
      { status: 502 }
    );
  }

  console.info(`[design-intent] ${result.model} in ${ms}ms`);
  return Response.json({
    intent: result.value,
    model: result.model,
    elapsedMs: ms,
  });
}

export const runtime = "nodejs";
