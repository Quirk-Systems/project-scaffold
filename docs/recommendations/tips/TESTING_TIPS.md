# Testing Tips

> Tests are documentation that verifies itself. Write them for the next developer, not the linter.

---

## Testing Philosophy

- Test **behavior**, not implementation
- Test the **contract** (inputs → outputs), not the internals
- One assertion per logical concept (not one per test)
- If it's hard to test, the design is probably wrong
- Server Components → E2E tests (Vitest can't render them)
- Client Components → unit tests
- User flows → E2E tests

---

## Test File Locations

```
src/
├── __tests__/
│   ├── setup.ts              # global setup
│   └── page.test.tsx         # page-level tests
├── lib/
│   ├── utils.ts
│   └── utils.test.ts         # co-located unit tests
└── components/
    ├── UserCard.tsx
    └── UserCard.test.tsx      # co-located component tests

e2e/
└── home.spec.ts              # Playwright E2E
```

---

## Vitest Patterns

### Basic Component Test
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserCard } from "@/components/UserCard";

describe("UserCard", () => {
  it("shows user name and email", () => {
    render(<UserCard user={{ id: "1", name: "Alice", email: "alice@example.com" }} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("shows placeholder when name is missing", () => {
    render(<UserCard user={{ id: "1", email: "alice@example.com" }} />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });
});
```

### User Events (Interactions)
```tsx
import userEvent from "@testing-library/user-event";

it("calls onDelete when delete button clicked", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();

  render(<UserCard user={mockUser} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: /delete/i }));

  expect(onDelete).toHaveBeenCalledWith(mockUser.id);
  expect(onDelete).toHaveBeenCalledTimes(1);
});
```

### Async Testing
```tsx
import { waitFor } from "@testing-library/react";

it("shows results after search", async () => {
  const user = userEvent.setup();
  render(<SearchBar />);

  await user.type(screen.getByRole("searchbox"), "alice");

  await waitFor(() => {
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });
});
```

---

## Test Factories

Don't manually build objects in every test. Build factories:

```typescript
// src/__tests__/factories.ts
import type { User } from "@/lib/db/schema";

let counter = 0;

export function createUser(overrides: Partial<User> = {}): User {
  counter++;
  return {
    id: `user-${counter}`,
    email: `user${counter}@example.com`,
    name: `User ${counter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Usage
const alice = createUser({ name: "Alice", email: "alice@example.com" });
const admin = createUser({ role: "admin" }); // only override what matters
```

---

## Mocking Patterns

### Mock a module
```typescript
import { vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

// In test
import { db } from "@/lib/db";

beforeEach(() => {
  vi.mocked(db.query.users.findFirst).mockResolvedValue(createUser());
});
```

### Mock fetch
```typescript
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
}));
```

### Spy on a function
```typescript
import * as authModule from "@/lib/auth";

vi.spyOn(authModule, "auth").mockResolvedValue({
  user: createUser(),
  expires: new Date().toISOString(),
});
```

### The setup.ts auto-resets mocks
```typescript
// src/__tests__/setup.ts (already configured)
afterEach(() => {
  vi.clearAllMocks(); // resets call counts
});
```

---

## TanStack Query Testing

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // don't retry in tests
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

it("fetches and displays users", async () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([createUser()]),
  } as Response);

  renderWithQuery(<UserList />);

  await waitFor(() => {
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
```

---

## Playwright E2E Patterns

### Page Object Model
```typescript
// e2e/pages/home.page.ts
import { Page, Locator } from "@playwright/test";

export class HomePage {
  readonly heading: Locator;
  readonly navLinks: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole("heading", { level: 1 });
    this.navLinks = page.getByRole("navigation").getByRole("link");
  }

  async goto() {
    await this.page.goto("/");
  }
}

// e2e/home.spec.ts
import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";

test("homepage shows heading", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.heading).toBeVisible();
});
```

### Auth State in Playwright
```typescript
// e2e/setup/auth.setup.ts
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "password");
  await page.click('[type="submit"]');
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
```

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "authenticated",
    use: { storageState: "e2e/.auth/user.json" },
    dependencies: ["setup"],
  },
],
```

---

## What NOT to Test

- Implementation details (private functions, internal state)
- Framework behavior (React renders components — trust it)
- Third-party libraries (they have their own tests)
- Trivial getters/setters with no logic
- Code that changes constantly (tests will break constantly)

---

## Coverage That Actually Matters

```typescript
// vitest.config.ts — only measure what matters
coverage: {
  include: ["src/lib/**", "src/components/**", "src/hooks/**"],
  exclude: [
    "src/**/*.test.*",
    "src/__tests__/**",
    "src/app/**", // Next.js pages — test via E2E
    "src/components/ui/**", // shadcn — trust the library
  ],
}
```
