import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createLazyClient } from "@/lib/lazy-client";

// Binary/visual assets (photography, graphic design, video, audio) live in
// Supabase Storage; quirk_assets.storage_path points into this bucket. The
// bucket is private — serve media through signed URLs so curation state, not
// bucket ACLs, decides what's public.
export const MEDIA_BUCKET = "quirk-assets";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

const client = createLazyClient<SupabaseClient>({
  name: "Media storage",
  requires: {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  create: () =>
    createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    }),
});

export const getMediaStorage = client.get;
export const assertMediaConfigured = client.assertConfigured;

export type UploadMediaInput = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

export type UploadMediaResult = {
  storagePath: string;
  contentType: string;
  sizeBytes: number;
};

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "file"
  );
}

/** Detect the quirk_asset_type for a media upload from its MIME type. */
export function assetTypeForContentType(contentType: string): string {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "application/pdf") return "pdf";
  return "other";
}

/**
 * Store raw media bytes and return the storage path to record on the asset.
 * Creates the (private) bucket on first use so a fresh Supabase project
 * works without manual setup.
 */
export async function uploadMedia(
  input: UploadMediaInput,
): Promise<UploadMediaResult> {
  const storage = getMediaStorage().storage;
  const storagePath = `media/${crypto.randomUUID()}/${sanitizeFilename(input.filename)}`;

  let { error } = await storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, input.bytes, { contentType: input.contentType });

  if (error && /bucket not found/i.test(error.message)) {
    const created = await storage.createBucket(MEDIA_BUCKET, {
      public: false,
    });
    if (created.error) {
      throw new Error(
        `Failed to create media bucket: ${created.error.message}`,
      );
    }
    ({ error } = await storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, input.bytes, { contentType: input.contentType }));
  }
  if (error) {
    throw new Error(`Media upload failed: ${error.message}`);
  }

  return {
    storagePath,
    contentType: input.contentType,
    sizeBytes: input.bytes.byteLength,
  };
}

/** Time-limited URL for serving a stored media object. */
export async function getMediaUrl(storagePath: string): Promise<string> {
  const storage = getMediaStorage().storage;
  const { data, error } = await storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to sign media URL for ${storagePath}: ${error?.message ?? "no URL returned"}`,
    );
  }
  return data.signedUrl;
}
