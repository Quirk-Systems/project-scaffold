# Testing

> Tests are not proof of correctness.
> They are executable documentation of intent.
> The failure mode of no tests is not "untested code" — it's "unknown behavior."

---

## The Pyramid

```
         /\
        /  \     E2E (Playwright) — browser, critical journeys, few + slow
       /----\
      /      \   Integration — API routes, service+DB, component+API
     /--------\
    /  Unit    \  Unit — pure functions, business logic, fast + many

Also essential (not in pyramid):
  tsc --noEmit    — catches entire bug classes for free
  ESLint          — enforces patterns statically
```

---

## Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach, vi } from "vitest";
beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });
beforeEach(() => { vi.clearAllMocks(); });
```

---

## Unit Tests

```typescript
// src/lib/pricing.ts
export function calculateDiscount(
  price: number,
  coupon: { type: "percent" | "fixed"; value: number }
): number {
  if (coupon.type === "percent") return Math.round(price * (1 - coupon.value / 100));
  return Math.max(0, price - coupon.value);
}

// tests/unit/pricing.test.ts
describe("calculateDiscount", () => {
  it("applies percent discount", () =>
    expect(calculateDiscount(1000, { type: "percent", value: 20 })).toBe(800));

  it("clamps fixed discount to zero", () =>
    expect(calculateDiscount(100, { type: "fixed", value: 200 })).toBe(0));
});
```

### Mocking
```typescript
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "mock-id" }),
}));

// Per-test override
vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP failure"));

// Verify calls
expect(sendEmail).toHaveBeenCalledWith(
  expect.objectContaining({ to: "user@example.com" })
);
expect(sendEmail).toHaveBeenCalledTimes(1);
```

---

## Factory Pattern

```typescript
// tests/factories/user.ts
import { faker } from "@faker-js/faker";
import type { Prisma } from "@prisma/client";

export function buildUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    passwordHash: "$argon2id$v=19$...",
    role: "user" as const,
    ...overrides,
  };
}

export async function createUser(overrides = {}) {
  return testDb.user.create({ data: buildUser(overrides) });
}
```

---

## Integration Tests

```typescript
// tests/integration/api/users.test.ts
describe("POST /api/users", () => {
  it("creates user and returns 201", async () => {
    const res = await testClient.post("/api/users").send({
      email: "new@example.com",
      password: "securepassword123",
      name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(String), email: "new@example.com" });
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("returns 409 for duplicate email", async () => {
    await createUser({ email: "existing@example.com" });
    const res = await testClient.post("/api/users").send({
      email: "existing@example.com", password: "password123", name: "Dupe",
    });
    expect(res.status).toBe(409);
  });
});
```

---

## MSW — Mock Service Worker

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("https://api.stripe.com/v1/customers", () =>
    HttpResponse.json({ id: "cus_test123", email: "test@example.com" })
  ),
  http.post("https://api.openai.com/v1/chat/completions", () =>
    HttpResponse.json({ choices: [{ message: { content: "mocked" } }] })
  ),
];

// tests/setup.ts
import { setupServer } from "msw/node";
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## E2E — Playwright

```typescript
// tests/e2e/checkout.spec.ts
test("user can complete purchase", async ({ page }) => {
  await page.goto("/products");
  await page.getByText("Widget Pro").click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Checkout" }).click();

  const stripe = page.frameLocator('[title="Secure payment input frame"]');
  await stripe.getByLabel("Card number").fill("4242 4242 4242 4242");
  await stripe.getByLabel("Expiration").fill("12/30");
  await stripe.getByLabel("CVC").fill("123");

  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

---

## What Makes a Good Test

```
✓ Tests behavior, not implementation
✓ Deterministic — same input, same output, every time
✓ Independent — doesn't share state with other tests
✓ Fast where possible (unit < 10ms, integration < 500ms, e2e < 30s)
✓ Names describe intent: "[unit] [action] [expected result]"

✗ Tests which internal function was called
✗ Tests third-party library behavior
✗ Tests type information (TypeScript handles this)
✗ Empty catch blocks in tests
```

---

## Resources

- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [MSW](https://mswjs.io)
- [Playwright](https://playwright.dev)
- [Faker.js](https://fakerjs.dev)
