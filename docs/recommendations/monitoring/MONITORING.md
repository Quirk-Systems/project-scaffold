# Monitoring, Logging & Observability

> You cannot fix what you cannot see.
> Logs are what happened. Metrics are how often. Traces are why.
> The fourth pillar no one mentions: alerting is a product decision, not a technical one.

---

## Structured Logging — Pino

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "my-api", env: process.env.NODE_ENV },
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.token", "*.secret"],
    censor: "[REDACTED]",
  },
});
```

### Request Context via AsyncLocalStorage
```typescript
import { AsyncLocalStorage } from "async_hooks";

const store = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

app.use((req, res, next) => {
  const ctx = { requestId: req.headers["x-request-id"] as string ?? ulid(), userId: req.user?.id };
  res.setHeader("X-Request-Id", ctx.requestId);
  store.run(ctx, next);
});

const getLogger = () => {
  const ctx = store.getStore();
  return ctx ? logger.child(ctx) : logger;
};

// Usage — context is automatic
getLogger().info({ action: "user.login", email }, "Login succeeded");
getLogger().warn({ action: "auth.failed", email, reason }, "Login failed");
```

### Log Levels
```
trace  → Function entry/exit. Never production.
debug  → Dev info. Disable in prod unless debugging.
info   → Normal events. User actions, requests, state changes.
warn   → Degraded but not broken. Retries, slow queries.
error  → Something broke. Needs investigation.
fatal  → System cannot continue. Process will exit.
```

### What to Log
```typescript
// Always
logger.info({ action: "auth.login.success", userId, ip });
logger.warn({ action: "auth.login.failed", email, ip, reason });
logger.info({ action: "payment.succeeded", userId, amountCents });
logger.error({ action: "payment.failed", userId, err });
logger.warn({ action: "authz.denied", userId, resource, action });

// Never
// Passwords, tokens, API keys, full request bodies with PII
```

---

## Metrics — What to Measure

### RED Method (services)
```
Rate     → requests per second
Errors   → error rate (%)
Duration → latency (p50, p95, p99)
```

### Key Metrics
```
HTTP:       request_duration_ms, requests_total, error_rate
Database:   db_query_duration_ms, pool_waiting, db_errors_total
Business:   signups_total, payments_succeeded, active_subscriptions
Infra:      memory_bytes, cpu_percent, disk_io
```

### OpenTelemetry
```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";

const sdk = new NodeSDK({
  resource: new Resource({ "service.name": "my-api" }),
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_ENDPOINT }),
});
sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

```typescript
// Custom spans
import { trace, SpanStatusCode } from "@opentelemetry/api";
const tracer = trace.getTracer("my-api");

async function processPayment(orderId: string) {
  const span = tracer.startSpan("process_payment", { attributes: { orderId } });
  try {
    const result = await stripe.paymentIntents.create({ ... });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}
```

---

## Sentry

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  ignoreErrors: ["ResizeObserver loop limit exceeded", /^AbortError/],
  beforeSend(event) {
    if (event.request?.cookies) event.request.cookies = "[Filtered]";
    return event;
  },
});

// Capture with context
Sentry.withScope((scope) => {
  scope.setExtra("orderId", orderId);
  Sentry.captureException(err);
});
```

---

## Health Checks

```typescript
// GET /health — liveness
export async function GET() {
  return Response.json({ status: "ok", ts: new Date().toISOString() });
}

// GET /ready — readiness
export async function GET() {
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`.then(() => ({ name: "db", status: "ok" })),
    redis.ping().then(() => ({ name: "redis", status: "ok" })),
  ]);

  const results = checks.map((c, i) => ({
    name: ["db", "redis"][i],
    status: c.status === "fulfilled" ? "ok" : "error",
    error: c.status === "rejected" ? (c.reason as Error)?.message : undefined,
  }));

  const allOk = results.every((r) => r.status === "ok");
  return Response.json({ status: allOk ? "ok" : "degraded", checks: results },
    { status: allOk ? 200 : 503 });
}
```

---

## Alerting Philosophy

```
Alert on symptoms, not causes.
  ✓ "Error rate > 1% for 5 minutes" — user impact
  ✗ "Memory > 80%" — maybe fine

Every alert must be actionable.
  If the response is "watch it" — it's a dashboard, not an alert.

Alert fatigue kills on-call.
  Too many alerts → ignored → real incident missed.
  Tune ruthlessly.

Severity tiers:
  P1 — wake up NOW. Revenue impact or outage.
  P2 — page during business hours. Degraded service.
  P3 — ticket. Minor issue, no immediate impact.
```

---

## Recommended Stack

```
Startup combo:
  Sentry     → errors + traces
  Axiom      → logs (cheap, fast search)
  Grafana Cloud → metrics + dashboards (generous free tier)

Full self-hosted:
  Loki + Prometheus + Tempo → all three pillars → Grafana
```

---

## Resources

- [Pino](https://getpino.io)
- [OpenTelemetry](https://opentelemetry.io)
- [Sentry](https://sentry.io)
- [Axiom](https://axiom.co)
- [Grafana](https://grafana.com)
