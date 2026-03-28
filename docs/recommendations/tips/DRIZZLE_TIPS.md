# Drizzle ORM Tips

> SQL you can reason about. Type-safe. No magic.

---

## Schema Patterns

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Timestamps helper (reuse across tables)
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  ...timestamps,
});

// Posts table with foreign key
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  ...timestamps,
});

// Export types inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

---

## Relations

```typescript
// Define relations (Drizzle-level, not DB constraints)
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

---

## Query Patterns

### Select
```typescript
// All users
const allUsers = await db.select().from(users);

// With filter
const activeUsers = await db
  .select()
  .from(users)
  .where(isNotNull(users.name));

// Select specific columns
const emails = await db
  .select({ id: users.id, email: users.email })
  .from(users);

// Relational query (includes relations)
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true },
});

// Nested relations
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      orderBy: desc(posts.createdAt),
      limit: 10,
      with: { comments: true },
    },
  },
});
```

### Insert
```typescript
// Single insert
const [newUser] = await db
  .insert(users)
  .values({ email: "alice@example.com", name: "Alice" })
  .returning();

// Batch insert
const newUsers = await db
  .insert(users)
  .values([
    { email: "alice@example.com" },
    { email: "bob@example.com" },
  ])
  .returning();

// Upsert
await db
  .insert(users)
  .values({ email: "alice@example.com", name: "Alice" })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: "Alice Updated", updatedAt: sql`(unixepoch())` },
  });
```

### Update
```typescript
const [updated] = await db
  .update(users)
  .set({ name: "New Name", updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();

if (!updated) throw new Error("User not found");
```

### Delete
```typescript
await db.delete(users).where(eq(users.id, userId));

// Soft delete pattern
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

---

## Filtering

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, inArray, notInArray,
         isNull, isNotNull, and, or, not, between, sql } from "drizzle-orm";

// Combining conditions
const results = await db.select().from(users).where(
  and(
    isNotNull(users.name),
    or(
      like(users.email, "%@company.com"),
      eq(users.role, "admin")
    )
  )
);

// Full-text search (SQLite LIKE)
const search = await db.select().from(posts).where(
  like(posts.title, `%${query}%`)
);

// Array filtering
const specific = await db.select().from(users).where(
  inArray(users.id, ["id1", "id2", "id3"])
);
```

---

## Pagination

```typescript
// Offset pagination (simple, consistent)
async function getUsers(page: number, perPage = 20) {
  const offset = (page - 1) * perPage;

  const [items, [{ count }]] = await Promise.all([
    db.select().from(users).limit(perPage).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);

  return {
    items,
    total: count,
    pages: Math.ceil(count / perPage),
    page,
  };
}

// Cursor pagination (better for infinite scroll)
async function getUsersAfterCursor(cursor?: string, limit = 20) {
  return db.select().from(users)
    .where(cursor ? gt(users.id, cursor) : undefined)
    .orderBy(asc(users.id))
    .limit(limit);
}
```

---

## Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: "alice@example.com" })
    .returning();

  await tx.insert(posts).values({
    title: "First Post",
    authorId: user.id,
    content: "Hello world",
  });

  return user;
});
```

---

## Migrations Workflow

```bash
# 1. Edit schema in src/lib/db/schema.ts

# 2. Generate migration file
bun run db:generate
# Creates drizzle/migrations/0001_*.sql

# 3. Apply to dev database
bun run db:push

# 4. For production: apply migration in deploy script
bun run db:migrate

# 5. Inspect with Drizzle Studio
bun run db:studio
```

---

## Switching to PostgreSQL

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});

// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

Schema changes: `sqliteTable` → `pgTable`, integer timestamps → proper `timestamp()`.
