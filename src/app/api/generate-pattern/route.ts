import { generatePattern } from "@/lib/openrouter";
import type { CraftType, Difficulty } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      craftType,
      garmentType,
      sizes,
      difficulty,
      extraNotes,
      imageBase64,
      textDescription,
    }: {
      craftType: CraftType;
      garmentType: string;
      sizes: string[];
      difficulty: Difficulty;
      extraNotes: string;
      imageBase64?: string;
      textDescription?: string;
    } = body;

    if (!craftType || !garmentType || !sizes?.length) {
      return Response.json(
        { error: "craftType, garmentType, and sizes are required" },
        { status: 400 }
      );
    }

    const pattern = await generatePattern({
      craftType,
      garmentType,
      sizes,
      difficulty: difficulty ?? "intermediate",
      extraNotes: extraNotes ?? "",
      imageBase64,
      textDescription,
    });

    return Response.json({ pattern });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-pattern]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
