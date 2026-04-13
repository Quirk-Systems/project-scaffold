/**
 * Run an async mapper over items with a bounded concurrency limit.
 * Keeps result order aligned with input order. Used to parallelize
 * vault scans without exhausting file descriptors on large vaults.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await mapper(items[i]!, i);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

/**
 * Default concurrency for vault-wide file scans. Tuned to stay below
 * typical OS fd limits while still getting real parallelism.
 */
export const SCAN_CONCURRENCY = 16;
