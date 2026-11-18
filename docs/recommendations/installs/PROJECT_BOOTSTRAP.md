# Project Bootstrap

There are two different starting points in this repository. Choose the one
that matches the project.

## A small new web application

The candidate Quirk Web Starter is a separate, minimal Next.js app. Its first
screen is a local idea preview that can be replaced. It does not include the
reference application's database, authentication, billing, AI providers,
asset engine, repository identity guard, or existing evidence receipts.

From a checkout of this repository, using Node 22.22.2 or later:

```sh
node scripts/create-quirk-starter.mjs --name my-project --output ../my-project
cd ../my-project
npm ci
npm test
npm run dev
```

The output directory must not exist. The command creates files and a local
hash receipt; it does not install packages, run the generated application,
create a Git repository, connect services, deploy, or grant authority. If an
I/O error interrupts creation, inspect the partial directory before deleting
or retrying. `npm run build` checks a production build; a successful build is
not deployment or user acceptance.

Give the new project its own name, source control, permissions, dependencies,
and release process. Add integrations only when they are needed. The receipt
is a record of generated file bytes, not an approval or a behavior test.

## The existing reference application

The root of this repository contains the larger application with the Quirk
asset lifecycle and other integrations. To work on that reference app:

```sh
bun install --frozen-lockfile
cp .env.example .env
# Set DATABASE_URL to a reachable PostgreSQL database with pgvector available.
bun run dev
```

`bun run dev` runs `db:migrate` first. The migrations use PostgreSQL and create
the `vector` extension; SQLite's `local.db` is not the configured database.
Other integrations need their own credentials when used. The source
repository's identity check deliberately fixes its repository and package
identity; simply changing the root `package.json` name makes that check fail.

See [Architecture](../../ARCHITECTURE.md),
[Project Scaffold Identity](../../canon/PROJECT_SCAFFOLD_IDENTITY.md), and the
[dissection proposal](../../architecture/project-scaffold-dissection-2026-11-18.md)
for the current boundaries and outstanding migration decisions.
