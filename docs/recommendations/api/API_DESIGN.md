# API Design

> An API is a contract. Breaking it is a breaking change.
> Design for the caller, not the implementation.
> The best API is the one developers stop thinking about.

---

## Resource Naming

```
Resources are nouns, never verbs. Plural consistently.

✓ GET    /users
✓ POST   /users
✓ GET    /users/:id
✓ PATCH  /users/:id
✓ DELETE /users/:id
✓ GET    /users/:id/posts
✓ GET    /posts/:id/comments

✗ POST   /createUser
✗ GET    /users?action=delete
✗ DELETE /users/deleteAll
```

## HTTP Methods
```
GET     Read. Idempotent. Cacheable. No body.
POST    Create or action. Not idempotent.
PUT     Replace entire resource. Idempotent.
PATCH   Partial update.
DELETE  Delete. Idempotent.
```

## Status Codes
```
200 OK              GET, PATCH, PUT succeeded
201 Created         POST created resource (include Location header)
204 No Content      DELETE succeeded, PATCH with no body
202 Accepted        Async operation started

400 Bad Request     Malformed syntax, invalid JSON
401 Unauthorized    Not authenticated
403 Forbidden       Authenticated but not authorized
404 Not Found       Resource doesn't exist
409 Conflict        Duplicate email, version mismatch
422 Unprocessable   Validation failed (semantic, not syntax)
429 Too Many        Rate limited

500 Internal        Unhandled exception
503 Unavailable     Intentional downtime / overload
```

---

## Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;        // machine-readable, stable
    message: string;     // human-readable
    details?: unknown;   // field-level errors, context
    requestId?: string;
  };
}

// Examples
{ "error": { "code": "VALIDATION_FAILED", "message": "Request validation failed",
  "details": [{ "field": "email", "message": "Must be a valid email" }],
  "requestId": "req_01HX..." } }

{ "error": { "code": "RATE_LIMITED", "message": "Too many requests",
  "details": { "retryAfter": 60 } } }
```

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) { super(message); }
}

const NotFound = (msg = "Not found") => new AppError(404, "RESOURCE_NOT_FOUND", msg);
const ValidationError = (d: unknown) => new AppError(422, "VALIDATION_FAILED", "Validation failed", d);

// Global error handler
app.use((err: Error, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
    });
  }
  logger.error({ err, requestId: req.id }, "Unhandled error");
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error" } });
});
```

---

## Pagination — Cursor-Based

```typescript
// GET /posts?limit=20&cursor=eyJpZCI6IjEyMyJ9

interface PaginatedResponse<T> {
  data: T[];
  pagination: { hasMore: boolean; nextCursor: string | null };
}

async function getPosts(limit: number, cursor?: string) {
  const decoded = cursor ? decodeCursor(cursor) : null;

  const posts = await db.post.findMany({
    take: limit + 1,
    ...(decoded && { cursor: { id: decoded.id }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const hasMore = posts.length > limit;
  const data = posts.slice(0, limit);

  return {
    data,
    pagination: {
      hasMore,
      nextCursor: hasMore ? encodeCursor({ id: data.at(-1)!.id }) : null,
    },
  };
}

const encodeCursor = (d: object) => Buffer.from(JSON.stringify(d)).toString("base64url");
const decodeCursor = (c: string) => JSON.parse(Buffer.from(c, "base64url").toString());
```

---

## Filtering and Sorting

```
GET /posts?status=published&authorId=abc
GET /posts?sort=-createdAt,title    (- prefix = descending)
GET /posts?fields=id,title,author   (sparse fieldsets)
```

```typescript
const ListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
```

---

## Versioning

```
URI versioning (recommended — simplest, most visible):
  /api/v1/users
  /api/v2/users

Header versioning (cleaner URLs):
  API-Version: 2025-01-01
```

---

## Idempotency Keys

```typescript
// POST /payments with Idempotency-Key: uuid
// → First call: processes, stores response
// → Retry with same key: returns stored, no duplicate charge

async function handleWithIdempotency(key: string, op: () => Promise<unknown>) {
  const cached = await redis.get(`idempotency:${key}`);
  if (cached) return JSON.parse(cached as string);

  const result = await op();
  await redis.setex(`idempotency:${key}`, 86400, JSON.stringify(result));
  return result;
}
```

---

## Rate Limit Headers

```typescript
res.setHeader("X-RateLimit-Limit", "1000");
res.setHeader("X-RateLimit-Remaining", "742");
res.setHeader("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + 3600));
// On 429:
res.setHeader("Retry-After", "60");
```

---

## OpenAPI

```bash
# Generate TypeScript types from spec
npx openapi-typescript openapi.yaml -o src/types/api.d.ts
```

---

## Resources

- [Stripe API](https://stripe.com/docs/api) — gold standard design
- [Zod](https://zod.dev) — request validation
- [Hono](https://hono.dev) — typed edge-ready API framework
- [tRPC](https://trpc.io) — end-to-end type safety, no OpenAPI needed
