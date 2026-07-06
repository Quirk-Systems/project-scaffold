/**
 * Populate quirk_assets.embedding for assets that don't have one yet.
 *
 * Usage:
 *   bun run db:embed
 *
 * Requires EMBEDDINGS_API_KEY (see .env.example). Processes assets in
 * batches until none remain; safe to re-run at any time — already-embedded
 * assets are never touched.
 */

import { isEmbeddingsConfigured } from "../src/lib/ai/embeddings";
import { embedPendingAssets } from "../src/lib/db/embed";

async function main() {
  if (!isEmbeddingsConfigured()) {
    console.error(
      "Embeddings not configured: set EMBEDDINGS_API_KEY in .env " +
        "(see .env.example for EMBEDDINGS_BASE_URL / EMBEDDINGS_MODEL overrides).",
    );
    process.exit(1);
  }

  let total = 0;
  for (;;) {
    const result = await embedPendingAssets();
    if (!result.ok) throw result.error;

    const { embedded, remaining } = result.value;
    total += embedded;
    console.log(`Embedded ${embedded} assets (${remaining} remaining).`);

    if (remaining === 0) break;
    if (embedded === 0) {
      console.warn(
        `Stopping: ${remaining} pending assets made no progress this batch.`,
      );
      break;
    }
  }

  console.log(`Done. ${total} assets embedded.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Embedding backfill failed:", err);
    process.exit(1);
  });
