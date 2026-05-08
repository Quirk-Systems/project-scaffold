# Debugging Tips

> Debugging is the art of removing incorrect theories about your program.

---

## General Debugging Process

1. **Reproduce reliably** — if you can't reproduce it, you can't fix it
2. **Isolate the smallest failing case** — strip everything until it breaks
3. **Form a hypothesis** — what specifically do you believe is wrong?
4. **Test the hypothesis** — add logging/breakpoints to prove or disprove
5. **Fix the root cause** — not the symptom
6. **Write a test** — so it never silently returns

---

## React DevTools

```bash
# Install browser extension
# Chrome: React Developer Tools
# Firefox: React Developer Tools

# Profiler tab: find re-render storms
# Components tab: inspect props, state, context
```

Finding unnecessary re-renders:
1. Open DevTools → Components → Settings → "Highlight updates when components render"
2. Interact with UI
3. Watch for components flashing unexpectedly
4. Use `React.memo`, `useMemo`, `useCallback` on confirmed hotspots (measure first)

```tsx
// Debug re-renders in development
if (process.env.NODE_ENV === "development") {
  // Add this to any component to see what changed
  useEffect(() => {
    console.log("[ComponentName] rendered");
  });

  // See which props changed (install react-use or inline)
  usePrevious(props); // compare manually
}
```

---

## Network Debugging

```bash
# Chrome DevTools → Network tab tricks:
# - Filter by XHR/Fetch to see API calls only
# - Right-click request → "Copy as fetch" to reproduce in console
# - Throttle network to test slow connections
# - Block specific requests to test error states

# Check headers, timing, response body for every request
# Waterfall view shows what's blocking page load
```

Intercepting Next.js fetch in dev:
```typescript
// Temporary — add to layout.tsx for debug session only
if (process.env.NODE_ENV === "development") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    console.log("[fetch]", args[0]);
    const result = await originalFetch(...args);
    console.log("[fetch response]", result.status, args[0]);
    return result;
  };
}
```

---

## Database Debugging

```typescript
// Enable query logging in dev (src/lib/db/index.ts)
const db = drizzle(sqlite, {
  schema,
  logger: process.env.NODE_ENV === "development"
    ? { logQuery: (query, params) => console.log("[db]", query, params) }
    : false,
});
```

```bash
# Inspect SQLite directly
sqlite3 local.db

# Common queries
.tables                                  # list all tables
.schema users                            # show table schema
SELECT * FROM users LIMIT 10;           # inspect data
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'x'; # index usage
```

---

## TypeScript Errors

```typescript
// When the error message is incomprehensible, simplify
type Confusing = SomeComplex<Type, WithMany<Generic<Params>>>;

// Step 1: hover over intermediate types in your editor
// Step 2: inline the type to see what it resolves to
type Step1 = SomeComplex<Type, X>;
type Step2 = WithMany<Generic<Params>>;
// Now you can see where the mismatch is

// Use type assertions temporarily to bypass and locate
const result = complexFn() as unknown as ExpectedType;
// If the error goes away, the issue is in complexFn's return type

// ts-expect-error to document known issues
// @ts-expect-error - upstream type bug, tracked in issue #123
const workaround = problematicFunction();
```

---

## Async/Race Conditions

```typescript
// Common race condition: stale state in closures
function SearchComponent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // BUG: if user types quickly, earlier response might arrive last
  useEffect(() => {
    fetch(`/api/search?q=${query}`).then(r => r.json()).then(setResults);
  }, [query]);

  // FIX: cancel stale requests with AbortController
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(err => {
        if (err.name !== "AbortError") console.error(err);
      });

    return () => controller.abort(); // cancel on cleanup
  }, [query]);
}
```

TanStack Query handles this automatically — prefer it over manual useEffect fetching.

---

## Memory Leaks

Signs: app gets slower over time, browser tab memory grows.

```typescript
// Common leak: event listener not removed
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize); // cleanup!
}, []);

// Common leak: timer not cleared
useEffect(() => {
  const id = setInterval(poll, 5000);
  return () => clearInterval(id); // cleanup!
}, []);

// Common leak: subscription not cancelled
useEffect(() => {
  const sub = store.subscribe(update);
  return () => sub.unsubscribe(); // cleanup!
}, []);
```

Detect with Chrome DevTools:
1. DevTools → Memory → Take heap snapshot
2. Interact (navigate, open/close components)
3. Take another snapshot
4. Compare — look for growing object counts

---

## Next.js-Specific Debugging

```typescript
// Hydration errors (client/server HTML mismatch)
// Error: "Hydration failed because the initial UI does not match..."

// Cause 1: rendering date/time (differs between server and client)
// Fix: format dates client-side or use suppressHydrationWarning for containers
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>

// Cause 2: accessing browser APIs in server component
if (typeof window !== "undefined") {
  // browser-only code
}

// Cause 3: third-party extension injecting elements
// Fix: add suppressHydrationWarning to <body>
```

```typescript
// Debug server component data fetching
export default async function Page() {
  console.log("[server] fetching users"); // shows in terminal, not browser
  const users = await getUsers();
  console.log("[server] got", users.length, "users");
  return <UserList users={users} />;
}
```

---

## Debugging Checklist

Before asking for help, verify:

```
[ ] Can you reproduce it consistently?
[ ] What's the smallest input that triggers it?
[ ] What did you expect vs what actually happened?
[ ] What does the full error message say (not just the first line)?
[ ] What does the stack trace point to?
[ ] Did you check the network tab?
[ ] Did you add console.logs to confirm your assumptions?
[ ] Does it happen in a fresh incognito window? (rules out extensions)
[ ] Does it happen after clearing localStorage/cookies?
[ ] What changed between working and broken state? (git diff)
```
