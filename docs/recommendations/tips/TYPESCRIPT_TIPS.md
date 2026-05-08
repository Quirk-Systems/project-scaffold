# TypeScript Tips

> Strict mode isn't a punishment. It's a contract with your future self.

---

## Utility Types You Should Know

```typescript
// Pick — take only what you need
type UserPreview = Pick<User, "id" | "name" | "email">;

// Omit — exclude sensitive fields
type PublicUser = Omit<User, "passwordHash" | "authToken">;

// Partial — all keys optional (great for update payloads)
type UserUpdate = Partial<Pick<User, "name" | "email">>;

// Required — force all keys to be present
type CompleteUser = Required<User>;

// Readonly — prevent mutation
type ImmutableConfig = Readonly<AppConfig>;

// Record — map type (key → value)
type RouteHandlers = Record<HttpMethod, RequestHandler>;

// ReturnType — infer function return type
type GetUserResult = ReturnType<typeof getUser>;

// Awaited — unwrap Promise
type UserData = Awaited<ReturnType<typeof fetchUser>>;

// Parameters — extract function params as tuple
type SearchParams = Parameters<typeof searchUsers>[0];
```

---

## Template Literal Types

```typescript
// Build string unions from combinations
type Color = "red" | "green" | "blue";
type Variant = "light" | "dark";
type Theme = `${Variant}-${Color}`;
// = "light-red" | "light-green" | "light-blue" | "dark-red" | ...

// HTTP method routing
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type ApiRoute = `/${string}`;
type Endpoint = `${HttpMethod} ${ApiRoute}`;

// Type-safe event names
type EventName = `on${Capitalize<string>}`;
// usage: function on(event: EventName, handler: () => void)

// CSS property types
type CssProperty = `${string}-${string}` | `--${string}`;
```

---

## Discriminated Unions

```typescript
// Pattern: shared discriminant field + narrowing
type Result<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string }
  | { status: "loading" };

function renderResult(result: Result<User>) {
  switch (result.status) {
    case "success":
      return <UserCard user={result.data} />; // result.data: User
    case "error":
      return <Error message={result.error} />; // result.error: string
    case "loading":
      return <Spinner />;
  }
}

// Works for API responses too
type ApiResponse<T> =
  | { ok: true; data: T; statusCode: number }
  | { ok: false; error: string; statusCode: number };
```

---

## The `satisfies` Operator

```typescript
// Validates against type WITHOUT widening
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
} satisfies Record<string, string | number[]>;

// palette.red is number[] (not string | number[])
// palette.green is string (not string | number[])
// Without satisfies, both would be widened to string | number[]

// Great for config objects
const config = {
  port: 3000,
  host: "localhost",
  debug: true,
} satisfies Partial<AppConfig>;
```

---

## Type Guards

```typescript
// Narrowing with type predicates
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    typeof (value as User).email === "string"
  );
}

// Assertion function (throws if wrong type)
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError("Expected User");
}

// Exhaustive check — catches missing cases at compile time
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function handleStatus(status: "active" | "inactive" | "pending") {
  switch (status) {
    case "active": return "green";
    case "inactive": return "gray";
    case "pending": return "yellow";
    default: return assertNever(status); // compile error if case missing
  }
}
```

---

## Const Assertions

```typescript
// Without: widened type
const directions = ["north", "south", "east", "west"]; // string[]

// With as const: literal tuple
const directions = ["north", "south", "east", "west"] as const;
// readonly ["north", "south", "east", "west"]

type Direction = (typeof directions)[number]; // "north" | "south" | "east" | "west"

// Object const assertion
const CONFIG = {
  maxRetries: 3,
  timeout: 5000,
  env: "production",
} as const;

type Config = typeof CONFIG; // { readonly maxRetries: 3; readonly timeout: 5000; ... }
```

---

## Generic Constraints and Defaults

```typescript
// Constraint: T must have id
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// Default generic
type ApiState<T = unknown> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Conditional type
type NonNullable<T> = T extends null | undefined ? never : T;

// Infer within conditional
type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;

// Map over union
type Nullable<T> = { [K in keyof T]: T[K] | null };
```

---

## `WithRequired` Pattern (from this scaffold)

```typescript
// src/types/index.ts
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Usage: make "name" required on User (where it's normally optional)
type UserWithName = WithRequired<User, "name">;

// Useful for function params that require specific optional fields
function sendWelcomeEmail(user: WithRequired<User, "name" | "email">) {
  // user.name: string (not string | undefined)
  // user.email: string (not string | undefined)
}
```

---

## Strict Mode Best Practices

```typescript
// Never use `any` — use `unknown` and narrow
function parseJson(input: string): unknown {
  return JSON.parse(input);
}

// Use `unknown` for error handling
try {
  doSomething();
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}

// Prefer interface for objects that can be extended
interface User { id: string; email: string; }

// Prefer type for unions, intersections, mapped types
type ID = string | number;
type UserOrAdmin = User | Admin;
```

---

## Project-Wide Type Patterns

```typescript
// Branded types — prevent mixing IDs
type UserId = string & { readonly __brand: "UserId" };
type PostId = string & { readonly __brand: "PostId" };

function createUserId(id: string): UserId { return id as UserId; }

// Now you can't pass a PostId where UserId is expected
function getUser(id: UserId): User { ... }
getUser(postId); // compile error!

// Opaque API response types
type ApiPage<T> = {
  data: T[];
  cursor: string | null;
  total: number;
};
```
