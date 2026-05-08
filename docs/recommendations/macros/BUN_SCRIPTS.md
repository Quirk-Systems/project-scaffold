# Bun Scripts

> package.json scripts are your project's CLI. Design them intentionally.

---

## Current Scripts (This Scaffold)

```json
{
  "scripts": {
    "dev":           "next dev --turbopack",
    "build":         "next build",
    "start":         "next start",
    "preview":       "next build && next start",
    "lint":          "eslint .",
    "lint:fix":      "eslint . --fix",
    "format":        "prettier --write .",
    "format:check":  "prettier --check .",
    "type-check":    "tsc --noEmit",
    "test":          "vitest",
    "test:ui":       "vitest --ui",
    "test:run":      "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e":      "playwright test",
    "test:e2e:ui":   "playwright test --ui",
    "db:generate":   "drizzle-kit generate",
    "db:push":       "drizzle-kit push",
    "db:studio":     "drizzle-kit studio",
    "db:migrate":    "drizzle-kit migrate",
    "validate":      "bun run lint && bun run type-check && bun run test:run && bun run build",
    "clean":         "rm -rf .next out node_modules",
    "prepare":       "lefthook install"
  }
}
```

---

## Recommended Additions

```json
{
  "scripts": {
    "db:seed":       "bun run src/scripts/seed.ts",
    "db:reset":      "bun run src/scripts/reset-db.ts",
    "health":        "bun run type-check && bun run lint && bun run test:coverage && bun run build",
    "audit:security":"bunx better-npm-audit audit --level moderate",
    "audit:deps":    "bunx depcheck && bunx npm-check-updates",
    "analyze":       "ANALYZE=true bun run build",
    "ci":            "SKIP_ENV_VALIDATION=1 bun run validate"
  }
}
```

---

## Script Composition Patterns

### Sequential (&&)
```json
"preview": "next build && next start"
```
Stops at first failure.

### Sequential (;)
```json
"clean:all": "rm -rf .next; rm -rf node_modules; bun install"
```
Continues even if rm fails.

### Parallel (with concurrently)
```json
"dev:full": "bunx concurrently 'bun run dev' 'bun run db:studio' --names 'next,studio'"
```

### Pre/Post Hooks
```json
"build":     "next build",
"prebuild":  "bun run type-check",    // runs before build
"postbuild": "bun run analyze"        // runs after build
```

---

## Useful Script Templates

### Seed Database
```typescript
// src/scripts/seed.ts
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const seed = async () => {
  console.log("Seeding database...");

  await db.delete(users); // clear existing

  await db.insert(users).values([
    { email: "alice@example.com", name: "Alice" },
    { email: "bob@example.com", name: "Bob" },
    { email: "admin@example.com", name: "Admin" },
  ]);

  console.log("Seeded 3 users");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

```bash
bun run src/scripts/seed.ts
```

### Reset Database
```typescript
// src/scripts/reset-db.ts
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { users, posts } from "@/lib/db/schema";

const reset = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot reset production database");
  }

  await db.delete(users);
  await db.run(sql`DELETE FROM sqlite_sequence`); // reset autoincrement

  console.log("Database reset");
  process.exit(0);
};

reset().catch(console.error);
```

### Generate Component
```typescript
// src/scripts/generate-component.ts
import { $ } from "bun";

const name = process.argv[2];
if (!name) {
  console.error("Usage: bun run scripts/generate-component.ts ComponentName");
  process.exit(1);
}

const kebab = name.replace(/([A-Z])/g, (m, l, i) => (i ? "-" : "") + l.toLowerCase());

await Bun.write(
  `src/components/${kebab}.tsx`,
  `import { cn } from "@/lib/utils";

interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export function ${name}({ className, children }: ${name}Props) {
  return (
    <div className={cn("", className)}>
      {children}
    </div>
  );
}
`
);

await Bun.write(
  `src/components/${kebab}.test.tsx`,
  `import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ${name} } from "./${kebab}";

describe("${name}", () => {
  it("renders children", () => {
    render(<${name}>content</${name}>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
`
);

console.log(`Created src/components/${kebab}.tsx and ${kebab}.test.tsx`);
```

---

## Environment-Aware Scripts

```json
{
  "scripts": {
    "build":     "next build",
    "build:ci":  "SKIP_ENV_VALIDATION=1 next build",
    "build:prod":"NODE_ENV=production next build",
    "dev":       "next dev --turbopack",
    "dev:debug": "NODE_OPTIONS='--inspect' next dev"
  }
}
```

---

## One-Liner Useful Runs

```bash
# Format, lint fix, type check in sequence
bun run format && bun run lint:fix && bun run type-check

# Full fresh install and validate
bun run clean && bun install && bun run validate

# Watch tests while developing
bun run test -- --reporter=verbose

# Run a single test file in watch mode
bun vitest src/__tests__/page.test.tsx --watch

# Run E2E only for one browser
bun run test:e2e -- --project=chromium

# Check bundle for a specific page
ANALYZE=true bun run build 2>&1 | grep "First Load JS"
```
