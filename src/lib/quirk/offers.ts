import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkAssets,
  quirkOffers,
  type QuirkAsset,
  type QuirkOffer,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { generateText } from "@/lib/ai";
import type { RegisterName } from "@/lib/ai";
import { scoreText, overallScore, type QuirkScores } from "./scoring";

export class OfferAlreadyMintedError extends Error {
  constructor(assetId: string) {
    super(`Asset ${assetId} already has a minted offer`);
    this.name = "OfferAlreadyMintedError";
  }
}

export type OfferWithAsset = QuirkOffer & {
  asset: Pick<
    QuirkAsset,
    "id" | "title" | "assetType" | "status" | "storagePath"
  >;
};

/**
 * Deterministic pitch copy for when the voice layer isn't configured. The
 * ontology speaks for itself: title + strongest score axis + the 1/1 hook.
 */
export function fallbackPitch(
  title: string,
  scores: QuirkScores | null,
): string {
  const strongest = scores
    ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const axis = strongest
    ? strongest.replace(/([A-Z])/g, " $1").toLowerCase()
    : null;
  const hook = axis ? `Peak ${axis.trim()}.` : "Curated signal.";
  return `${title} — one of one. ${hook} Claimed once, gone forever.`;
}

/** Prompt for the persona layer when ANTHROPIC_API_KEY is configured. */
export function buildPitchPrompt(
  title: string,
  rawText: string | null,
  scores: QuirkScores | null,
): string {
  const excerpt = rawText ? rawText.slice(0, 600) : "(visual/media asset)";
  const signal = scores
    ? Object.entries(scores)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ")
    : "unscored";
  return [
    `Write a two-sentence pitch for a one-of-one drop titled "${title}".`,
    "Exactly one person can ever claim it. Make the scarcity felt without",
    "saying 'scarcity'. No hashtags, no emoji, no preamble.",
    `Signal: ${signal}`,
    `Material: ${excerpt}`,
  ].join("\n");
}

/**
 * Mint the 1/1 offer for an asset. The unique constraint on asset_id makes
 * minting idempotent-hostile by design: once minted, ever, for any asset.
 */
export async function mintOffer(input: {
  assetId: string;
  register?: RegisterName;
}): Promise<OfferWithAsset> {
  const [asset] = await db
    .select()
    .from(quirkAssets)
    .where(eq(quirkAssets.id, input.assetId))
    .limit(1);
  if (!asset) {
    throw new Error(`Asset ${input.assetId} not found`);
  }

  const title = asset.title ?? "Untitled drop";
  const scores = asset.rawText ? scoreText(asset.rawText) : null;
  const register = input.register ?? "hype";

  let pitch: string | null = null;
  if (env.ANTHROPIC_API_KEY) {
    pitch = await generateText(buildPitchPrompt(title, asset.rawText, scores), {
      register,
      maxTokens: 200,
    }).catch(() => null);
  }
  pitch = pitch?.trim() || fallbackPitch(title, scores);

  const [offer] = await db
    .insert(quirkOffers)
    .values({
      assetId: asset.id,
      title,
      pitch,
      register,
      scores: scores ? { ...scores, overall: overallScore(scores) } : {},
    })
    .onConflictDoNothing({ target: quirkOffers.assetId })
    .returning();

  if (!offer) {
    throw new OfferAlreadyMintedError(asset.id);
  }
  return { ...offer, asset: pickAsset(asset) };
}

/**
 * Atomically claim an offer for a user. A single conditional UPDATE enforces
 * the one-of-one: whoever's statement matches status='open' first wins;
 * everyone else gets null.
 */
export async function claimOffer(input: {
  offerId: string;
  userId: string;
}): Promise<QuirkOffer | null> {
  const [claimed] = await db
    .update(quirkOffers)
    .set({
      status: "claimed",
      claimedBy: input.userId,
      claimedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(quirkOffers.id, input.offerId), eq(quirkOffers.status, "open")),
    )
    .returning();
  return claimed ?? null;
}

/**
 * Curatorial pull-back: retire an open offer so it can never be claimed.
 * Same atomic conditional-UPDATE shape as claiming — a claimed offer cannot
 * be retired (it already belongs to someone).
 */
export async function retireOffer(offerId: string): Promise<QuirkOffer | null> {
  const [retired] = await db
    .update(quirkOffers)
    .set({ status: "retired", updatedAt: sql`now()` })
    .where(and(eq(quirkOffers.id, offerId), eq(quirkOffers.status, "open")))
    .returning();
  return retired ?? null;
}

export async function getOffer(id: string): Promise<OfferWithAsset | null> {
  const rows = await db
    .select()
    .from(quirkOffers)
    .innerJoin(quirkAssets, eq(quirkOffers.assetId, quirkAssets.id))
    .where(eq(quirkOffers.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.quirk_offers, asset: pickAsset(row.quirk_assets) };
}

export async function listOffers(filter?: {
  status?: QuirkOffer["status"];
}): Promise<OfferWithAsset[]> {
  const rows = await db
    .select()
    .from(quirkOffers)
    .innerJoin(quirkAssets, eq(quirkOffers.assetId, quirkAssets.id))
    .where(filter?.status ? eq(quirkOffers.status, filter.status) : undefined)
    .orderBy(desc(quirkOffers.createdAt));
  return rows.map((r) => ({
    ...r.quirk_offers,
    asset: pickAsset(r.quirk_assets),
  }));
}

function pickAsset(asset: QuirkAsset): OfferWithAsset["asset"] {
  return {
    id: asset.id,
    title: asset.title,
    assetType: asset.assetType,
    status: asset.status,
    storagePath: asset.storagePath,
  };
}
