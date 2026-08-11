import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, serverError } from "@/lib/quirk/http";
import { registerNames, getRegister, type RegisterName } from "@/lib/ai/registers";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  text: z.string().min(1).max(4000),
  register: z.enum(registerNames as [string, ...string[]]).optional(),
  persona: z.string().optional(),
});

/**
 * Voice preview: compose a persona + register pitch from arbitrary text.
 * Returns the generated pitch and the register's animation vocabulary so
 * the UI can demonstrate the motion layer without needing the Anthropic key
 * on the client.
 *
 * Falls back to a deterministic heuristic pitch when ANTHROPIC_API_KEY is
 * not configured, matching the same fallback used by mintOffer.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, previewSchema);
  if (!parsed.ok) return parsed.response;

  const { text, register = "hype", persona = "house" } = parsed.data;
  const registerName = register as RegisterName;
  const animation = getRegister(registerName).animation;

  try {
    let pitch: string;

    if (env.ANTHROPIC_API_KEY) {
      const { generateText } = await import("@/lib/ai/generate");
      pitch = await generateText(
        `Write a short, compelling pitch (2-3 sentences) for this content:\n\n${text}`,
        { register: registerName, persona: persona as "house" },
      );
    } else {
      const { scoreText } = await import("@/lib/quirk/scoring");
      const { fallbackPitch } = await import("@/lib/quirk/offers");
      const scores = scoreText(text);
      const title = text.split(/\s+/).slice(0, 8).join(" ");
      pitch = fallbackPitch(title, scores);
    }

    return NextResponse.json({ pitch, register: registerName, animation });
  } catch (e) {
    return serverError(e);
  }
}
