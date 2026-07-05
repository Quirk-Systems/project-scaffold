// Shared shape for lazily-constructed third-party clients (Stripe, Resend,
// Anthropic, …). Construction is deferred and memoized so the scaffold can
// build/import without secrets; assertConfigured() throws a clear, aggregated
// error at first use when required env vars are missing.
export type LazyClient<T> = {
  get: () => T;
  assertConfigured: () => void;
};

export function createLazyClient<T>(opts: {
  // Human-readable label used in the error message (e.g. "Stripe").
  name: string;
  // Required env vars by name → current value. Missing/empty ones are reported.
  requires: Record<string, string | undefined>;
  // Constructs the client. Only called after assertConfigured() passes.
  create: () => T;
}): LazyClient<T> {
  let cached: T | null = null;

  function assertConfigured(): void {
    const missing = Object.entries(opts.requires)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length > 0) {
      throw new Error(`${opts.name} not configured: set ${missing.join(", ")}`);
    }
  }

  function get(): T {
    if (cached === null) {
      assertConfigured();
      cached = opts.create();
    }
    return cached;
  }

  return { get, assertConfigured };
}
