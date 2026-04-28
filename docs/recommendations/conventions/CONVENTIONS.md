# Conventions

> Conventions are the social contract of a codebase.
> Pick your battles. Standardize the rest.
> Every decision here trades local freedom for global coherence.

---

## Commit Messages (Conventional Commits)

```
<type>(<scope>): <description>

[optional body — explain WHY, not what]

[optional footer — "Closes #123", "BREAKING CHANGE: ..."]
```

### Types
```
feat      new feature
fix       bug fix
docs      documentation only
refactor  neither feat nor fix
test      add or update tests
chore     build, tooling, dependencies
ci        CI/CD configuration
perf      performance improvement
revert    reverting a commit
```

### Rules
```
→ Imperative mood: "add feature" not "added feature"
→ Subject line max 72 chars, no trailing period
→ Body explains WHY (the diff shows what)
→ Footer: "Closes #123", "BREAKING CHANGE: <description>"
```

### Examples
```
feat(auth): add OAuth2 login with Google

Enables sign-in via authorization code + PKCE. Links provider
to user profile. Avoids password storage for OAuth users.

Closes #42

---

fix(api): prevent duplicate webhook deliveries

Idempotency check was comparing timestamps instead of event IDs,
causing duplicate processing when delivery retried in the same second.

Fixes #156
```

---

## Branch Naming

```
feature/<ticket-id>-short-description   feature/AUTH-42-google-oauth
fix/<ticket-id>-short-description       fix/API-156-duplicate-webhooks
chore/<description>                     chore/upgrade-node-20
docs/<description>                      docs/add-api-reference
hotfix/<description>                    hotfix/stripe-webhook-sig
```

---

## Pull Request Template

```markdown
## What
-

## Why
Closes #

## How

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested: [describe]

## Checklist
- [ ] Self-reviewed the diff
- [ ] No console.logs or debug code
- [ ] No secrets or PII
- [ ] Breaking changes documented
```

---

## Code Review

### Authors
```
→ PRs < 400 meaningful lines. > 800 → split it.
→ Write a clear description. Don't make reviewers reverse-engineer intent.
→ Respond to every comment before re-requesting review.
→ Mark your own non-blocking comments: "nit:", "question:", "suggestion:"
```

### Reviewers
```
→ Review intent first, implementation second.
→ Distinguish blocking from preference.
→ Be specific: cite file and line.
→ Respond within 24h or say when you will.
→ Don't block on style — that's the linter's job.
```

### Vocabulary
```
nit:        Minor, not blocking. Author uses judgment.
question:   I don't understand. Please explain.
suggestion: Alternative worth considering. Not required.
blocking:   Must be addressed before merge.
consider:   Future thought, not blocking this PR.
```

---

## TypeScript Conventions

```typescript
// Naming
const MAX_RETRIES = 3;                     // constants: SCREAMING_SNAKE
type UserId = string;                       // type aliases: PascalCase
interface UserProfile { ... }              // interfaces: PascalCase
function getUserById(id: string) { ... }  // functions: camelCase

// prefer type for unions/computed types
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

// prefer interface for extensible shapes
interface Repository<T> {
  findById(id: string): Promise<T | null>;
}

// No `any`. Use `unknown` and narrow.
function process(input: unknown) {
  if (typeof input === "string") { /* safe */ }
}

// Explicit return types on public functions
export async function createUser(data: CreateUserInput): Promise<User> { ... }

// Const assertions for literal types
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];
```

---

## File + Export Conventions

```typescript
// Named exports over default (refactor-friendly, searchable)
export function UserCard({ user }: { user: User }) { ... }

// Co-locate related files
// UserCard.tsx
// UserCard.test.tsx
// UserCard.stories.tsx

// Barrel files only when abstraction is real
// src/components/ui/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
// Don't create them just for aesthetics — hurts tree-shaking
```

---

## Error Handling

```typescript
// Never swallow errors silently
try {
  await doSomething();
} catch { /* WRONG: nothing here */ }

// Always log at minimum
try {
  await doSomething();
} catch (err) {
  logger.error({ err }, "doSomething failed");
  throw err;
}

// Typed errors for expected failure modes
class InsufficientFundsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Need ${required}, have ${available}`);
    this.name = "InsufficientFundsError";
  }
}
```

---

## Environment Config

```typescript
// src/env.ts — validate at startup
import { z } from "zod";

export const env = z.object({
  DATABASE_URL:        z.string().url(),
  JWT_SECRET:          z.string().min(32),
  STRIPE_SECRET_KEY:   z.string().startsWith("sk_"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
}).parse(process.env);
// Throws immediately if anything is missing or wrong shape
```

---

## Definition of Done

```markdown
- [ ] Code written + self-reviewed
- [ ] Tests written (unit + integration where appropriate)
- [ ] All tests pass
- [ ] Lint + typecheck pass
- [ ] PR description complete
- [ ] PR reviewed + approved
- [ ] Deployed to staging + smoke-tested
- [ ] Monitoring in place for new behavior (if applicable)
- [ ] Docs updated (if user-facing or API change)
```

---

## Things We Don't Bikeshed

```
Prettier handles these — don't discuss in review:
  formatting, quote style, semicolons, trailing commas, import order

The config is the final word. Disagree? Open a PR to change it.
```
