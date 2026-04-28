# Database

> Data is the only thing that survives a rewrite.
> Schema decisions made in week one echo for years.
> Get them right, or get comfortable living with them wrong.

---

## Schema Design Principles

```
1NF: Atomic values. No arrays in columns (Postgres arrays are fine when intentional).
2NF: No partial dependencies on composite keys.
3NF: No transitive dependencies — non-key columns depend only on the key.

Denormalize when:
  → Read-heavy aggregates rarely updated (cache counts, totals)
  → Reporting tables (materialized views)
  → JOINs become the dominant query cost at scale
```

### Standard Columns on Every Table
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at TIMESTAMPTZ   -- soft delete (when needed)

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON your_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Postgres Patterns

### JSONB
```sql
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

-- Index specific paths you query
CREATE INDEX idx_products_brand ON products ((metadata->>'brand'));

-- GIN index for containment
CREATE INDEX idx_products_meta_gin ON products USING GIN (metadata);

SELECT * FROM products WHERE metadata @> '{"brand": "Nike"}';
```

### Full-Text Search
```sql
ALTER TABLE posts ADD COLUMN search_vector TSVECTOR;

CREATE TRIGGER posts_search_vector_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);

CREATE INDEX idx_posts_search ON posts USING GIN (search_vector);

SELECT id, title,
  ts_rank(search_vector, query) AS rank,
  ts_headline('english', body, query) AS excerpt
FROM posts, to_tsquery('english', 'rust & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC LIMIT 20;
```

### Window Functions
```sql
SELECT
  user_id, amount, order_date,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS running_total,
  LAG(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS prev_amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rank_by_amount
FROM orders;
```

### Recursive CTEs
```sql
WITH RECURSIVE thread AS (
  SELECT id, parent_id, content, 0 AS depth FROM messages WHERE id = $1
  UNION ALL
  SELECT m.id, m.parent_id, m.content, t.depth + 1
  FROM messages m JOIN thread t ON m.parent_id = t.id
  WHERE t.depth < 50
)
SELECT * FROM thread ORDER BY depth, id;
```

---

## Indexing Strategy

### Decision Tree
```
Column used in WHERE/JOIN/ORDER BY?
  YES → consider index
  NO  → don't add one

High cardinality (many distinct values)?
  YES → B-tree likely helps
  NO  → partial or bitmap index

Multi-column queries?
  → Composite index, most selective column first

Query subset of rows?
  → Partial index with WHERE clause
```

### Index Types
```sql
-- B-tree (default)
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- Composite
CREATE INDEX idx_posts_user_date ON posts (user_id, created_at DESC);

-- Partial
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;

-- Expression
CREATE INDEX idx_users_lower_email ON users (lower(email));

-- GIN (arrays, JSONB, full-text)
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- BRIN (large time-ordered tables)
CREATE INDEX idx_events_brin ON events USING BRIN (created_at);
```

### Finding Missing Indexes
```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

-- Sequential scans on large tables
SELECT tablename, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;

-- EXPLAIN ANALYZE — run it
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
-- Watch for: Seq Scan on large tables, high actual rows, shared read >> hit
```

---

## Safe Migrations

```
NEVER without careful thought:
  → ADD COLUMN NOT NULL without DEFAULT (table lock in old Postgres)
  → DROP COLUMN (data loss if code still reads it)
  → RENAME COLUMN (breaks old code)
  → Change column type (may lock table)

Safe rename pattern:
  1. Add new column
  2. Dual-write old + new
  3. Backfill new column
  4. Switch reads to new
  5. Stop writing to old
  6. Drop old column

Safe NOT NULL add:
  1. ADD COLUMN nullable
  2. Backfill in batches
  3. Add NOT NULL constraint (validates in place)
```

```bash
# Check what SQL will run before prod
npx prisma migrate diff \
  --from-url $DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Production deploy (never migrate dev in prod)
npx prisma migrate deploy
```

---

## Connection Pooling

```
Each Postgres connection costs ~5-10MB RAM + ~50ms to establish.
Without pooling: serverless = connection storm = OOM.

Solutions:
  PgBouncer (self-hosted)
  Prisma Accelerate (managed)
  Supabase Pooler (managed)
  Neon (built-in)
```

```ini
# PgBouncer
[pgbouncer]
pool_mode = transaction     # best for serverless
max_client_conn = 1000
default_pool_size = 20
```

```typescript
// Prisma singleton (critical for serverless)
let prisma: PrismaClient;
declare global { var prisma: PrismaClient | undefined }

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  global.prisma ??= new PrismaClient({ log: ["query"] });
  prisma = global.prisma;
}

export { prisma };
```

---

## The N+1 Problem

```typescript
// WRONG — N queries after 1
const posts = await prisma.post.findMany();
const withAuthors = await Promise.all(
  posts.map(p => prisma.user.findUnique({ where: { id: p.authorId } }))
);

// RIGHT — 1 query
const posts = await prisma.post.findMany({ include: { author: true } });
```

---

## Cursor Pagination

```sql
-- Offset: inconsistent under mutations, slow at high offsets
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- Cursor: consistent, efficient, correct
-- First page
SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT 20;

-- Next pages
SELECT * FROM posts
WHERE (created_at, id) < ($last_created_at, $last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Required index
CREATE INDEX ON posts (created_at DESC, id DESC);
```

---

## Observability

```sql
-- Enable pg_stat_statements (postgresql.conf)
shared_preload_libraries = 'pg_stat_statements'

-- Top slow queries
SELECT left(query, 80) AS q, round(mean_exec_time::numeric, 2) AS avg_ms, calls
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC LIMIT 20;

-- Table bloat
SELECT tablename, n_dead_tup, n_live_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;

-- Active locks
SELECT pid, query, state, wait_event_type, age(clock_timestamp(), query_start)
FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC;
```

---

## Resources

- [Use the Index, Luke](https://use-the-index-luke.com) — indexing, visually explained
- [Designing Data-Intensive Applications](https://dataintensive.net)
- [Explain.dalibo.com](https://explain.dalibo.com) — visual EXPLAIN ANALYZE
- [pganalyze](https://pganalyze.com) — continuous monitoring
- [pg_partman](https://github.com/pgpartman/pg_partman) — partition management
- [pgvector](https://github.com/pgvector/pgvector) — vector search
