# Security

> The only doc where gaps don't cost hours — they cost everything.
> Read this before you ship. Breaches are not bugs. They are failures of discipline.

---

## The Mental Model

Security is not a feature. It's a property of the system — emergent from every
decision made about data flow, trust boundaries, and failure modes. You can't bolt
it on afterward. The best time to think about security is before the first line of
code. The second best time is right now.

**Threat model in one question:** *Who wants what, and what's the worst they can do?*

---

## Authentication

### Password Storage
```typescript
import { hash, verify } from "@node-rs/argon2";
// Argon2id is the gold standard. bcrypt is acceptable. MD5/SHA1 are not.

const stored = await hash(password, {
  memoryCost: 19456,  // 19MB — makes GPU cracking expensive
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
});

const valid = await verify(stored, candidatePassword);
```

### JWT — Done Right
```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET); // min 32 bytes

const token = await new SignJWT({ sub: userId, role: userRole })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("15m")       // short-lived access token
  .sign(secret);

const { payload } = await jwtVerify(token, secret); // throws on invalid/expired

// Pattern:
// access token:  15m TTL, stateless
// refresh token: 7d TTL, httpOnly cookie, tracked in DB (allows revocation)
```

### Session Security Checklist
```
✓ httpOnly cookies (no JS access)
✓ Secure flag (HTTPS only)
✓ SameSite=Strict or Lax (CSRF defense)
✓ Short TTL with sliding expiry
✓ Invalidate on password change
✓ Invalidate on logout (server-side)
✓ Rotate refresh tokens on use
```

### OAuth 2.0 Pitfalls
```
✗ Never store tokens in localStorage — XSS game over
✗ Never skip state parameter — CSRF on OAuth flow
✗ Never trust id_token without signature verification
✗ Never use implicit flow — always authorization code + PKCE
✓ Validate iss, aud, exp, nonce on every verification
```

---

## Authorization

### RBAC Pattern
```typescript
type Role = "admin" | "editor" | "viewer";

const PERMISSIONS: Record<Role, string[]> = {
  admin:  ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
};

function can(user: { role: Role }, action: string): boolean {
  return PERMISSIONS[user.role].includes(action);
}

// ABAC — when ownership matters
function canEditPost(user: User, post: Post): boolean {
  if (user.role === "admin") return true;
  if (post.authorId === user.id) return true;
  return false;
}
```

### Row-Level Security (Postgres)
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_select ON posts
  FOR SELECT USING (author_id = current_user_id() OR is_public = true);

CREATE POLICY posts_update ON posts
  FOR UPDATE USING (author_id = current_user_id());

-- Set per request
SET LOCAL app.user_id = '123';
SET LOCAL app.user_role = 'editor';
```

---

## OWASP Top 10 — With Code

### SQL Injection
```typescript
// WRONG
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// RIGHT
const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

// Prisma is safe by default
const user = await prisma.user.findUnique({ where: { email } });
```

### Sensitive Data Exposure
```typescript
// WRONG — leaking internals
return res.json(user);

// RIGHT — explicit shape
const UserPublic = z.object({ id: z.string(), email: z.string(), name: z.string() });
return res.json(UserPublic.parse(user)); // strips unknown fields
```

### Broken Access Control
```typescript
// WRONG — trusting user-supplied IDs without ownership check
const doc = await db.document.findUnique({ where: { id: req.params.id } });

// RIGHT — scope to current user
const doc = await db.document.findFirst({
  where: { id: req.params.id, ownerId: req.user.id },
});
if (!doc) return res.status(404).json({ error: "Not found" });
// 404 not 403 — don't confirm existence of unauthorized resources
```

### XSS
```typescript
// React escapes by default — only dangerous with dangerouslySetInnerHTML
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

### Security Headers
```typescript
import helmet from "helmet";
app.use(helmet()); // sane defaults in one line

// Content Security Policy (Next.js)
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'nonce-{nonce}'; img-src 'self' data: https:",
  },
];
```

---

## Input Validation — Every Boundary

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(["user", "editor"]), // never let users assign admin themselves
});

export async function POST(req: Request) {
  const result = CreateUserSchema.safeParse(await req.json());
  if (!result.success) {
    return Response.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 });
  }
  // safe to use result.data
}
```

---

## Secrets Management

```bash
# NEVER
const apiKey = "sk-live-abc123";       # hardcoded
STRIPE_KEY=sk_live_...                  # committed .env

# ALWAYS
STRIPE_SECRET_KEY=sk_test_placeholder  # .env.example (committed)
STRIPE_SECRET_KEY=sk_live_...          # .env.local (gitignored)
```

```typescript
// Validate required secrets at startup
const required = ["DATABASE_URL", "JWT_SECRET", "STRIPE_SECRET_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
```

### Rotation Pattern
```
1. Generate new secret
2. Deploy accepting BOTH old and new
3. Confirm nothing uses old
4. Remove old from config
5. Revoke old from provider
```

---

## Rate Limiting — Layered

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-IP: 10 req / 10s
const ipLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// Per-user: 1000 req / day
const userLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(1000, "1 d"),
  prefix: "user",
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await ipLimit.limit(ip);
  if (!success) return Response.json({ error: "Rate limited" }, { status: 429 });
}
```

---

## CORS — Never Wildcard Production

```typescript
const allowedOrigins = [
  "https://yourapp.com",
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
```

---

## Pre-Deploy Security Checklist

```markdown
- [ ] Passwords hashed with Argon2id/bcrypt
- [ ] JWTs short-lived with refresh token rotation
- [ ] All routes have auth middleware (default-deny)
- [ ] Authorization scopes resources to current user
- [ ] All user input validated with Zod at boundaries
- [ ] Parameterized queries everywhere
- [ ] Sensitive fields excluded from API responses
- [ ] HTTPS + HSTS header set
- [ ] Security headers (helmet or equivalent)
- [ ] CORS allowlist to known origins only
- [ ] Cookies: httpOnly, Secure, SameSite
- [ ] No secrets in code or committed .env
- [ ] npm audit passing at high/critical level
- [ ] Error messages don't leak stack traces
- [ ] Auth events logged (login, logout, fail, ratelimit)
```

---

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org)
- [Security Headers scanner](https://securityheaders.com)
- [Snyk](https://snyk.io) — dependency scanning
- [semgrep](https://semgrep.dev) — static analysis
