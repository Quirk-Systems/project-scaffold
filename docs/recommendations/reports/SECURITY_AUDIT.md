# Security Audit

> Run before every release. One miss can own your entire stack.

---

## OWASP Top 10 Checklist (Web)

### 1. Broken Access Control
- [ ] Every API route checks authentication before executing
- [ ] Authorization checks use server-side logic (not just UI hiding)
- [ ] User A cannot access User B's data
- [ ] Admin endpoints require admin role, not just any auth
- [ ] IDOR (Insecure Direct Object Reference): IDs in URLs cannot be guessed to access other records

```typescript
// BAD: trusting client-provided user ID
export async function GET(req: Request) {
  const { userId } = await req.json(); // attacker controls this
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

// GOOD: get ID from verified session
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  return db.query.users.findFirst({ where: eq(users.id, session.user.id) });
}
```

### 2. Cryptographic Failures
- [ ] No secrets in source code or git history
- [ ] No sensitive data logged
- [ ] Passwords hashed with bcrypt/argon2 (never stored plain)
- [ ] Auth tokens use `AUTH_SECRET` with sufficient entropy
- [ ] HTTPS enforced in production (HSTS header set)
- [ ] No MD5/SHA1 for security purposes — use SHA-256+

### 3. Injection
- [ ] All DB queries use Drizzle parameterized queries (never string concatenation)
- [ ] All user input validated with Zod before use
- [ ] No `eval()`, `new Function()`, or `dangerouslySetInnerHTML` with untrusted input

```typescript
// BAD: SQL injection via string concat (don't do this)
const result = db.run(`SELECT * FROM users WHERE email = '${email}'`);

// GOOD: Drizzle parameterized
const result = await db.query.users.findFirst({
  where: eq(users.email, email), // parameterized automatically
});
```

### 4. Insecure Design
- [ ] Rate limiting on auth endpoints (login, signup, password reset)
- [ ] Account enumeration prevented (same error for "user not found" and "wrong password")
- [ ] Password reset tokens are single-use and expire
- [ ] MFA available for privileged accounts

### 5. Security Misconfiguration
- [ ] No default credentials anywhere
- [ ] Error messages don't leak stack traces or DB schemas to users
- [ ] Security headers set (see headers section below)
- [ ] `SKIP_ENV_VALIDATION` is not set in production
- [ ] Dev tools not accessible in production builds

### 6. Vulnerable Components
- [ ] `bun audit` returns no high/critical findings
- [ ] Dependencies are up to date (run monthly)
- [ ] Unused dependencies removed

### 7. Authentication Failures
- [ ] Sessions expire (not permanent tokens)
- [ ] Sessions invalidated on logout (not just cookie clear)
- [ ] Auth.js `AUTH_SECRET` is set and not the default
- [ ] Password policy enforced (min length, etc.)

### 8. Software Integrity Failures
- [ ] `bun install --frozen-lockfile` in CI (no lockfile drift)
- [ ] Supply chain: review new dependencies before adding
- [ ] GitHub Actions use pinned SHA versions for third-party actions

```yaml
# BAD: floating version
- uses: actions/checkout@v4

# GOOD: pinned SHA
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

### 9. Logging & Monitoring Failures
- [ ] Auth events logged (login, logout, failed attempts)
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] Errors monitored in production (Sentry/etc.)
- [ ] Anomaly alerting set up (many failed logins, etc.)

### 10. SSRF (Server-Side Request Forgery)
- [ ] User-provided URLs validated before fetching
- [ ] Internal network not reachable via user-controlled URLs
- [ ] Allowlist of domains for external requests where possible

---

## Security Headers

Set these in `next.config.ts`:

```typescript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // adjust for prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join("; "),
  },
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
} satisfies NextConfig;
```

Check your headers at [securityheaders.com](https://securityheaders.com).

---

## Secret Scanning

```bash
# Scan for accidentally committed secrets
bunx secretlint "**/*"

# Or use trufflehog
bunx trufflehog git file://. --since-commit HEAD~10

# GitHub secret scanning (free for public repos)
# Settings → Code security → Secret scanning
```

Add to pre-commit (lefthook.yml):
```yaml
pre-commit:
  commands:
    secrets:
      run: bunx secretlint {staged_files}
```

---

## Input Validation Pattern

All user input validated at the boundary:

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(12).max(72), // bcrypt max is 72 bytes
});

// In API route
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // parsed.data is now type-safe and validated
}
```

---

## Auth.js Security Checklist

- [ ] `AUTH_SECRET` set (≥ 32 random bytes): `openssl rand -base64 32`
- [ ] Providers configured with real credentials (not dev keys in prod)
- [ ] Session strategy appropriate (JWT vs database)
- [ ] Callbacks validate what you think they validate
- [ ] `trustHost: true` only set if behind a trusted reverse proxy

---

## CORS Configuration

```typescript
// next.config.ts — only allow known origins for API routes
async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL ?? "" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
      ],
    },
  ];
},
```
