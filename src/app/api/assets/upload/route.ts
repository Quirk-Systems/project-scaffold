import { NextResponse } from "next/server";
import { captureAsset } from "@/lib/quirk/assets";
import {
  assetTypeForContentType,
  getMediaUrl,
  uploadMedia,
} from "@/lib/quirk/media";
import { serverError } from "@/lib/quirk/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Binary/visual capture: multipart form-data with a `file` field (photograph,
// graphic, video, audio, pdf) plus optional `title` and `metadata` (JSON
// string). Bytes land in the private media bucket; the Archivist captures the
// registry row pointing at them.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a `file` field" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty `file` field" },
      { status: 400 },
    );
  }

  const title = form.get("title");
  const rawMetadata = form.get("metadata");
  let extraMetadata: Record<string, unknown> = {};
  if (typeof rawMetadata === "string" && rawMetadata.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawMetadata);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extraMetadata = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json(
        { error: "`metadata` must be a JSON object" },
        { status: 400 },
      );
    }
  }

  try {
    const contentType = file.type || "application/octet-stream";
    const media = await uploadMedia({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType,
      filename: file.name || "upload",
    });

    const { asset, version } = await captureAsset({
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      assetType: assetTypeForContentType(contentType),
      storagePath: media.storagePath,
      metadata: {
        ...extraMetadata,
        content_type: media.contentType,
        size_bytes: media.sizeBytes,
        original_filename: file.name || null,
      },
    });

    const url = await getMediaUrl(media.storagePath);
    return NextResponse.json({ asset, version, url }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
