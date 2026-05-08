# Bun Tips

> Bun runs, tests, bundles, and manages packages. One tool. Fast.

---

## Why Bun

| Feature | Bun | Node |
|---------|-----|------|
| Install (cold) | ~1s | ~30s |
| Install (warm) | ~100ms | ~5s |
| Test runner | Built-in | Vitest/Jest |
| Bundler | Built-in | webpack/esbuild |
| TypeScript | Native (no compile step) | ts-node needed |
| `.env` loading | Built-in | dotenv needed |

---

## Bun-Specific APIs

### File I/O
```typescript
// Write a file
await Bun.write("output.txt", "hello world");
await Bun.write("data.json", JSON.stringify({ key: "value" }));

// Read a file
const text = await Bun.file("input.txt").text();
const json = await Bun.file("data.json").json();
const buffer = await Bun.file("image.png").arrayBuffer();

// Stream a large file
const file = Bun.file("large.csv");
const stream = file.stream(); // ReadableStream
```

### HTTP Server
```typescript
// src/scripts/server.ts — standalone server (not Next.js)
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    return new Response("Not Found", { status: 404 });
  },
  error(error) {
    return new Response(error.message, { status: 500 });
  },
});

console.log(`Listening on port ${server.port}`);
```

### Shell Commands
```typescript
import { $ } from "bun";

// Run shell command
const result = await $`git log --oneline -10`.text();
console.log(result);

// Pipe
const lineCount = await $`cat package.json | wc -l`.text();

// Error handling
const { exitCode, stderr } = await $`bun run lint`.quiet().nothrow();
if (exitCode !== 0) {
  console.error("Lint failed:", stderr.toString());
}
```

### SQLite
```typescript
import { Database } from "bun:sqlite";

// Bun has built-in SQLite (no better-sqlite3 needed for scripts)
const db = new Database("local.db");
const users = db.query("SELECT * FROM users WHERE email = ?").all("alice@example.com");
```

---

## Bun Test (native)

The scaffold uses Vitest for React testing (jsdom environment). For pure server-side logic, Bun's native test runner is faster:

```typescript
// scripts/my.test.ts
import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe("utils", () => {
  test("adds numbers", () => {
    expect(1 + 2).toBe(3);
  });

  test("handles async", async () => {
    const result = await fetchSomething();
    expect(result).toBeDefined();
  });
});
```

```bash
bun test                    # run all .test.ts files
bun test --watch            # watch mode
bun test --coverage         # coverage report
bun test utils.test.ts      # run specific file
```

---

## Bun Build (bundler)

```typescript
// bundle.ts — for scripts, CLIs, or edge functions
await Bun.build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "bun",     // or "node", "browser"
  minify: true,
  sourcemap: "external",
  external: ["better-sqlite3"], // don't bundle native modules
});
```

---

## Environment Variables

Bun auto-loads `.env`, `.env.local`, `.env.production` — no `dotenv` needed.

```typescript
// Direct access
const secret = process.env.AUTH_SECRET;

// Or Bun-specific
const secret = Bun.env.AUTH_SECRET;

// Load in scripts (Bun does this automatically for .env)
// For other env files:
const env = Bun.file(".env.staging").text();
```

---

## Package Management

```bash
# Install (significantly faster than npm/yarn)
bun install

# Add dependency
bun add react
bun add -d typescript          # dev dep

# Remove
bun remove lodash

# Run script
bun run build
bun run dev
bun dev                        # shorthand (common scripts)

# Execute package binary
bunx eslint .
bunx shadcn@latest add button

# Link local package
bun link ../my-lib
```

---

## Lockfile

Bun uses `bun.lockb` (binary format).

```bash
# View contents
bun bun.lockb | head              # or
cat bun.lockb | bun -e 'console.log(await Bun.file("/dev/stdin").text())'

# Regenerate
rm bun.lockb && bun install

# CI: ensure lockfile is respected
bun install --frozen-lockfile     # fails if lockfile would change
```

---

## Scripts in package.json

```json
{
  "scripts": {
    "db:seed": "bun run src/scripts/seed.ts",
    "db:reset": "bun run src/scripts/reset-db.ts",
    "codegen": "bun run scripts/generate-types.ts",
    "clean": "rm -rf .next out node_modules bun.lockb && bun install"
  }
}
```

Bun runs TypeScript directly — no compilation step for scripts.

---

## Bun Macros (Compile-time evaluation)

```typescript
// Embed at build time (not useful for Next.js, but powerful for CLIs/bundled scripts)
import { version } from "./package.json" with { type: "macro" };
// version is inlined as a string literal at build time — no runtime import
```

---

## Performance Tips

```bash
# Use bun instead of node for scripts
bun scripts/migrate.ts    # not: npx ts-node scripts/migrate.ts

# Use Bun.file() for reading — much faster than fs.readFile
const content = await Bun.file(path).text();

# Use native SQLite for scripts instead of Drizzle overhead
import { Database } from "bun:sqlite";

# Install with frozen lockfile in Docker for consistent builds
RUN bun install --frozen-lockfile
```
