# Next.js 15 Tips

> App Router first. Server by default. Client only when the browser has no choice.

---

## Mental Model: Where Does This Run?

```
Request
  ↓
Server Component   → runs on server, has DB access, no hooks, no events
  ↓ (passes props)
Client Component   → runs in browser, has hooks, events, no DB access

Rule: push "use client" as far DOWN the tree as possible.
```

---

## Server Components (Default)

```tsx
// No directive needed — server by default
// Can be async, can query DB directly
export default async function UsersPage() {
  const users = await db.query.users.findMany();

  return (
    <ul>
      {users.map((user) => (
        <UserCard key={user.id} user={user} /> {/* server component */}
      ))}
    </ul>
  );
}
```

Gotchas:
- Cannot use `useState`, `useEffect`, event handlers
- Props must be serializable (no functions, no class instances)
- Cannot import client-only packages (browser APIs, etc.)

---

## Client Components

```tsx
"use client"; // required if using any hooks or browser APIs

import { useState } from "react";

// Pattern: keep client components small and leaf-level
export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? "♥" : "♡"}
    </button>
  );
}
```

---

## Server Actions

```tsx
// src/app/actions.ts
"use server"; // marks all exports as server actions

import { z } from "zod";
import { auth } from "@/lib/auth";

const schema = z.object({ name: z.string().min(1) });

export async function updateUserName(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.flatten() };

  await db.update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");
  return { success: true };
}

// Usage in a form (no API route needed)
export function ProfileForm() {
  return (
    <form action={updateUserName}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Caching in App Router

```typescript
// 1. Static — never refetches (default for fetch())
const data = await fetch("https://api.example.com/static");

// 2. Timed revalidation (ISR)
const data = await fetch("https://api.example.com/posts", {
  next: { revalidate: 60 }, // seconds
});

// 3. Tag-based revalidation
const data = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
});
// Then trigger: revalidateTag("posts")

// 4. No cache (always fresh)
const data = await fetch("https://api.example.com/user", {
  cache: "no-store",
});

// 5. unstable_cache for non-fetch data (DB queries, etc.)
import { unstable_cache } from "next/cache";

const getPosts = unstable_cache(
  async () => db.query.posts.findMany(),
  ["posts"],
  { revalidate: 60, tags: ["posts"] }
);
```

---

## Metadata API

```typescript
// Static metadata
export const metadata: Metadata = {
  title: "My App",
  description: "...",
};

// Dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.id);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.coverImage],
    },
  };
}
```

---

## Parallel Routes

```
src/app/
  layout.tsx
  @sidebar/          ← parallel slot
    page.tsx
  @main/             ← parallel slot
    page.tsx
  page.tsx
```

```tsx
// layout.tsx receives slots as props
export default function Layout({
  children,
  sidebar,
  main,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside>{sidebar}</aside>
      <main>{main}</main>
    </div>
  );
}
```

---

## Intercepting Routes (Modal Pattern)

```
src/app/
  photos/
    [id]/page.tsx          ← full page
  (.)photos/               ← intercept in same segment
    [id]/page.tsx          ← show as modal when navigated client-side
```

```tsx
// (.)photos/[id]/page.tsx
import { Modal } from "@/components/ui/modal";
import { PhotoDetails } from "@/components/photo-details";

export default function PhotoModal({ params }: Props) {
  return (
    <Modal>
      <PhotoDetails id={params.id} />
    </Modal>
  );
}
```

---

## Error Handling

```tsx
// src/app/error.tsx — catches errors in segment
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// src/app/not-found.tsx — 404 handler
import { notFound } from "next/navigation";

export default async function UserPage({ params }: Props) {
  const user = await getUser(params.id);
  if (!user) notFound(); // renders not-found.tsx
  return <UserProfile user={user} />;
}
```

---

## Route Handlers (API Routes)

```typescript
// src/app/api/users/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });

  const users = await db.query.users.findMany();
  return Response.json(users);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });

  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await db.insert(users).values(parsed.data).returning();
  return Response.json(user[0], { status: 201 });
}
```

---

## Middleware

```typescript
// src/middleware.ts — runs before every request
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

---

## Common Footguns

```tsx
// ❌ Importing a server module into a client component
"use client"
import { db } from "@/lib/db"; // db uses better-sqlite3 — client will break

// ✅ Fetch data in server component, pass as prop
// Or use a server action / API route

// ❌ async client component (not supported)
"use client"
export default async function Component() { ... }

// ✅ Use useEffect or TanStack Query for async in client
"use client"
export default function Component() {
  const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
}

// ❌ Missing key in list
users.map(user => <UserCard user={user} />)

// ✅ Always add key
users.map(user => <UserCard key={user.id} user={user} />)
```
