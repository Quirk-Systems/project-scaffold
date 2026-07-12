import type { Instrumentation } from "next";

// Next.js runs register() once when the server process boots. This is the
// canonical place to initialize Sentry, OpenTelemetry, or other agents.
// Example:
//   if (process.env.NEXT_RUNTIME === "nodejs") {
//     await import("./sentry.server.config");
//   }
export async function register(): Promise<void> {}

// Captures server-side errors (RSC, route handlers, SSR). Route to Sentry
// here; for now it goes through the structured pino logger.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  const { logger } = await import("@/lib/logger");
  logger.error(
    {
      err: err instanceof Error ? err.message : String(err),
      path: request.path,
      method: request.method,
    },
    "request error",
  );
};
