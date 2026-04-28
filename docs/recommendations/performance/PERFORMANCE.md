# Performance

> Slow is a bug. Fast is a competitive advantage.
> Measure first. Optimize second. Never guess.
> The fastest code is the code that doesn't run.

---

## The Rules

```
1. Measure before optimizing. Profile. Intuition is wrong.
2. Optimize the biggest bottleneck first.
   10x improvement on 5% cost = 0.5% gain.
   10x improvement on 40% cost = 36% gain.
3. Stop when fast enough.
4. Caching > optimizing. Fewer operations > faster operations.
```

---

## Web Vitals

```
LCP (Largest Contentful Paint) — Loading
  Goal: < 2.5s | Fix: optimize images, reduce TTFB, preload critical resources

INP (Interaction to Next Paint) — Interactivity
  Goal: < 200ms | Fix: smaller JS, defer non-critical, web workers

CLS (Cumulative Layout Shift) — Stability
  Goal: < 0.1 | Fix: explicit width/height on images, reserve space for dynamic content

TTFB (Time to First Byte)
  Goal: < 800ms | Fix: CDN, edge functions, DB indexes
```

### Image Optimization
```tsx
import Image from "next/image";

// Always set dimensions for above-fold images
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// Responsive
<Image src="/hero.jpg" alt="Hero" fill
  sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
```

### Bundle Analysis
```bash
ANALYZE=true npm run build  # with @next/bundle-analyzer

# Look for:
# → Large deps (moment.js → date-fns, lodash → native)
# → Duplicate packages
# → Client code that should be server-only
```

### Code Splitting
```tsx
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```

---

## React Performance

```tsx
// React.memo — only when parent re-renders frequently AND component is expensive
const Chart = React.memo(function Chart({ data }: { data: DataPoint[] }) {
  // heavy computation
});

// useMemo — expensive calculations
const sorted = useMemo(
  () => items.filter((i) => i.active).sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback — stable refs for memoized children
const handleDelete = useCallback((id: string) => deleteItem(id), [deleteItem]);

// Rule: profile first. React DevTools Profiler shows what's actually slow.
```

### Virtualization — Long Lists
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map((row) => (
          <div key={row.index} style={{ position: "absolute", transform: `translateY(${row.start}px)` }}>
            <ItemRow item={items[row.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Caching Hierarchy

```
1. Memory (in-process)  — nanoseconds, lost on restart
2. Redis                — microseconds, survives restarts
3. CDN edge             — milliseconds, global
4. Browser cache        — milliseconds, per-user
5. Database query cache — milliseconds
6. Database disk        — milliseconds to seconds
```

### Redis Cache-Aside
```typescript
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null) return hit;

  const fresh = await fn();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}

const user = await cached(`user:${userId}`, 300, () =>
  db.user.findUnique({ where: { id: userId } })
);

// Invalidate on update
await redis.del(`user:${userId}`);
```

### Next.js Caching
```typescript
import { unstable_cache } from "next/cache";

const getUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ["user"],
  { revalidate: 300, tags: [`user-${id}`] }
);

// Invalidate by tag
import { revalidateTag } from "next/cache";
revalidateTag(`user-${userId}`);
```

---

## Profiling Tools

```bash
# Node.js — clinic.js
npm install -g clinic
clinic doctor -- node server.js   # diagnose
clinic flame -- node server.js    # flame graph

# Load testing
npx autocannon -c 100 -d 30 http://localhost:3000/api/endpoint
# -c: concurrent connections  -d: duration seconds

# Bundle size
npx bundlephobia <package-name>  # before you install

# Chrome DevTools → Performance tab
# Record → perform action → Stop → read flame chart
# Long red bars (>50ms) = long tasks = jank
```

---

## Quick Wins Checklist

```markdown
### Images
- [ ] next/image or equivalent
- [ ] WebP/AVIF formats
- [ ] Lazy load below-fold
- [ ] Explicit width + height

### JavaScript
- [ ] Bundle analyzed, unused deps removed
- [ ] Dynamic import for heavy components
- [ ] Virtualize long lists (>100 items)
- [ ] Debounce search inputs (300ms)

### API
- [ ] Compression enabled
- [ ] Cache-Control headers set
- [ ] Large responses paginated
- [ ] Frequently queried columns indexed

### Infrastructure
- [ ] CDN for static assets
- [ ] Connection pooling for DB
- [ ] Redis for hot data
- [ ] Edge functions for geography-sensitive routes
```

---

## Resources

- [web.dev/performance](https://web.dev/performance/) — Google guides
- [WebPageTest](https://www.webpagetest.org) — real-world testing
- [Bundlephobia](https://bundlephobia.com) — package size checker
- [Clinic.js](https://clinicjs.org) — Node.js profiling
- [High Performance Browser Networking](https://hpbn.co) — free, comprehensive
