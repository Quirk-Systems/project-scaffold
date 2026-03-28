# Project Bootstrap

> Go from zero to running in under 5 minutes.

---

## New Project from Scratch

```bash
# 1. Clone the scaffold
git clone https://github.com/quirk-systems/project-scaffold my-project
cd my-project

# 2. Reset git history
rm -rf .git && git init && git add . && git commit -m "chore: initial scaffold"

# 3. Set up environment
cp .env.example .env
# Edit .env with your values:
# - AUTH_SECRET: openssl rand -base64 32
# - DATABASE_URL: leave as local.db for SQLite
# - NEXT_PUBLIC_APP_URL: http://localhost:3000

# 4. Install and initialize
bun install
bun run db:push    # creates local.db with users table
lefthook install   # installs git hooks

# 5. Verify everything works
bun run validate   # lint + type-check + test + build

# 6. Start developing
bun run dev
```

---

## Customize the Scaffold

### 1. Update package.json
```json
{
  "name": "my-project",
  "version": "0.1.0",
  "description": "What this does in one sentence"
}
```

### 2. Update CLAUDE.md
Replace the "Project Overview" section with your project's actual description, stack, and conventions.

### 3. Update app metadata
```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  title: "My Project",
  description: "What this does",
};
```

### 4. Update home page
```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>My Project</h1>
      {/* Your landing page */}
    </main>
  );
}
```

### 5. Configure Auth.js (if needed)
```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
});
```

Add to `.env`:
```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 6. Set up GitHub repo
```bash
# Create repo on GitHub (via gh CLI or web)
gh repo create my-project --private
git remote add origin git@github.com:username/my-project.git
git push -u origin main
```

---

## Remote Repository Setup

### Branch Protection (GitHub)

Required for real projects:
1. Settings → Branches → Add rule for `main`
2. Enable: "Require a pull request before merging"
3. Enable: "Require status checks to pass" → select `validate` and `e2e`
4. Enable: "Require conversation resolution before merging"
5. Enable: "Do not allow bypassing the above settings"

### Repository Secrets (CI)

Go to Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Production DB URL |
| Any other env vars needed by build | ... |

For `SKIP_ENV_VALIDATION`, it's set directly in the workflow yaml (not a secret).

---

## Adding Your First Feature

1. **Write the PRD** (even one paragraph in `docs/`)
2. **Update the DB schema** if needed (`src/lib/db/schema.ts`)
3. **Generate migration**: `bun run db:generate && bun run db:push`
4. **Write the feature** (server component or server action first, add client only if needed)
5. **Write the tests**:
   - Unit test: `src/components/MyFeature.test.tsx`
   - E2E test: `e2e/my-feature.spec.ts` (for user-facing flows)
6. **Validate**: `bun run validate`
7. **Commit**: `git commit -m "feat(feature-name): add thing"`
8. **Push and PR**: `git push -u origin feature/name`

---

## Deployment Checklist

### Vercel (simplest for Next.js)
```bash
bunx vercel

# Environment variables: set in Vercel dashboard or:
bunx vercel env add AUTH_SECRET production
bunx vercel env add DATABASE_URL production
```

### Self-hosted (VPS/Docker)
See `docs/recommendations/installs/DOCKER_SETUP.md`.

### Key env vars for production:
```bash
NODE_ENV=production
AUTH_SECRET=<random 32 bytes>
DATABASE_URL=<production DB URL>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# Remove SKIP_ENV_VALIDATION — you want validation in prod
```
