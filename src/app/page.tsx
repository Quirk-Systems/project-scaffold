import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Quirk Systems</h1>
        <p className="text-muted-foreground max-w-md">
          Your project scaffold is ready. Next.js 15, Tailwind v4, TypeScript
          strict, shadcn/ui, Drizzle, Auth.js — all configured.
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <Separator className="max-w-lg" />

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>App Router</CardTitle>
            <CardDescription>Server-first by default</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Server Components, route handlers, middleware, streaming — all
              ready. Add <code className="text-xs">&quot;use client&quot;</code>{" "}
              only when you need interactivity.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>Drizzle + Supabase Postgres</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Schema in <code className="text-xs">src/lib/db/schema.ts</code>,
              backed by Supabase Postgres with pgvector embeddings. Powers the{" "}
              <a href="/quirk" className="underline">
                Quirk OS
              </a>{" "}
              asset engine.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing</CardTitle>
            <CardDescription>Vitest + Playwright</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Unit tests with React Testing Library, E2E across Chromium,
              Firefox, and WebKit. Coverage reporting via v8.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tooling</CardTitle>
            <CardDescription>Fully wired</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              ESLint 9, Prettier, Lefthook hooks, commitlint, CI/CD — run{" "}
              <code className="text-xs">bun run validate</code> to check
              everything at once.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <a
            href="https://github.com/Quirk-Systems/project-scaffold"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js Docs
          </a>
        </Button>
      </div>
    </main>
  );
}
