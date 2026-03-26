# project-scaffold

A fully-loaded boilerplate to quickly get started on Quirk Systems projects.

## Tech Stack

Next.js 15 (App Router) | TypeScript | Tailwind CSS v4 | shadcn/ui | Drizzle ORM | Vitest | Playwright | Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest)
- [Node.js](https://nodejs.org/) >= 20

### Setup

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `bun run dev`        | Start dev server (Turbopack) |
| `bun run build`      | Production build             |
| `bun run start`      | Start production server      |
| `bun run lint`       | Lint with ESLint             |
| `bun run format`     | Format with Prettier         |
| `bun run type-check` | TypeScript checking          |
| `bun run test`       | Unit tests (watch)           |
| `bun run test:run`   | Unit tests (once)            |
| `bun run test:e2e`   | E2E tests (Playwright)       |
| `bun run db:push`    | Push schema to database      |
| `bun run db:studio`  | Open Drizzle Studio          |
| `bun run validate`   | Full validation pipeline     |

## Project Structure

```
src/
├── app/          # Pages, layouts, API routes (App Router)
├── components/   # React components (ui/ for shadcn)
├── hooks/        # Custom React hooks
├── lib/          # Utilities, database, auth, env validation
└── types/        # Shared TypeScript types
```

## Adding Components

```bash
bunx shadcn@latest add button
```

## License

[Apache 2.0](LICENSE)
