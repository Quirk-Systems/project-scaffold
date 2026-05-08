# Performance Report

> Measure first. Optimize second. Never guess.

---

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4.0s | > 4.0s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |
| TTFB (Time to First Byte) | < 800ms | 800ms–1.8s | > 1.8s |
| FCP (First Contentful Paint) | < 1.8s | 1.8–3.0s | > 3.0s |

Measure at: [PageSpeed Insights](https://pagespeed.web.dev) · [WebPageTest](https://webpagetest.org) · Chrome DevTools → Lighthouse

---

## Next.js Build Analysis

```bash
bun run build
# Read the route table output:
# ● (SSG) = pre-rendered — fast, cheap
# λ (Server) = server-rendered — slower, flexible
# ○ (Static) = fully static
```

Enable bundle analyzer:
```bash
ANALYZE=true bun run build
# Interactive treemap opens in browser
# Look for: large libs, duplicate code, unnecessary client-side JS
```

Key things to find:
- Any server-only library shipped to the client (e.g., `better-sqlite3`)
- Large vendor chunks (>100 kB)
- Duplicate modules (same lib, multiple versions)

---

## Caching Strategy

```typescript
// Static data — cache forever, revalidate in background
const data = await fetch("https://api.example.com/static", {
  next: { revalidate: 3600 }, // ISR: revalidate every hour
});

// Dynamic per-user data — no cache
const userData = await fetch(`/api/user/${id}`, {
  cache: "no-store",
});

// Unstable cache (server component memoization)
import { unstable_cache } from "next/cache";

const getCachedUser = unstable_cache(
  async (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }),
  ["user"],
  { revalidate: 60, tags: ["user"] }
);
```

---

## Image Optimization

```tsx
import Image from "next/image";

// Always specify width + height to prevent CLS
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // for above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." // tiny base64 preview
/>
```

Rules:
- Use `priority` on the LCP image
- Never use `<img>` without Next.js wrapper (prevents optimization)
- Use `sizes` prop for responsive images
- Prefer WebP/AVIF (Next.js converts automatically)

---

## Font Optimization

```typescript
// src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",      // prevent FOIT
  variable: "--font-sans",
  preload: true,        // preload critical font
});
```

Font loading is already configured. Never import fonts via CSS `@import` — it blocks rendering.

---

## Database Query Performance

```typescript
// Slow: N+1 query problem
const users = await db.query.users.findMany();
for (const user of users) {
  const posts = await db.query.posts.findMany({ // N queries!
    where: eq(posts.userId, user.id)
  });
}

// Fast: join in one query
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true }, // single JOIN query
});
```

Add query logging in development:
```typescript
// src/lib/db/index.ts
const db = drizzle(sqlite, {
  schema,
  logger: process.env.NODE_ENV === "development",
});
```

```bash
# Check for slow queries (SQLite)
sqlite3 local.db ".timer on" "SELECT * FROM users WHERE email LIKE '%@%'"
```

---

## React Performance

```typescript
// Prevent unnecessary re-renders
import { memo, useMemo, useCallback } from "react";

// Memoize expensive component
const HeavyList = memo(function HeavyList({ items }: { items: Item[] }) {
  return <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});

// Memoize expensive calculation
const total = useMemo(
  () => items.reduce((sum, item) => sum + item.price, 0),
  [items]
);

// Stable callback reference
const handleClick = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);
```

When to memoize:
- Component re-renders unnecessarily (use React DevTools Profiler to verify)
- Expensive calculation runs on every render
- Callback passed to memoized child component

When NOT to memoize:
- Small/simple components — overhead isn't worth it
- Already fast operations — adds complexity for no gain

---

## Code Splitting

```typescript
// Dynamic import — only load when needed
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // client-only
});

// Lazy load below-fold sections
const BelowFoldSection = dynamic(
  () => import("@/components/BelowFoldSection")
);
```

---

## TanStack Query Performance

```typescript
// Prefetch on the server
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function Page() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList /> {/* hydrates instantly on client */}
    </HydrationBoundary>
  );
}
```

---

## Performance Monitoring Script

```bash
# Add to package.json
"perf": "lighthouse http://localhost:3000 --output json --output-path ./reports/lighthouse.json --chrome-flags='--headless' && bunx lighthouse-badges -s 90 -r ./reports/lighthouse.json"

# Run before release
bun run build && bun run start &
sleep 3
bun run perf
```
