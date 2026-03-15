# CLAUDE.md

## Project Overview

**project-scaffold** is a boilerplate/scaffold/template for quickly bootstrapping Quirk Systems projects. It provides a minimal starting point with standard configuration.

## Current State

This repository is a **minimal scaffold** — no source code, dependencies, or tooling have been added yet. It contains only:

- `.gitignore` — configured for Next.js/TypeScript/Node.js projects
- `LICENSE` — Apache License 2.0
- `README.md` — brief project description

## Intended Tech Stack

Based on the `.gitignore` configuration, this scaffold targets:

- **Framework**: Next.js
- **Language**: TypeScript
- **Runtime**: Node.js
- **Package Manager**: npm or yarn
- **Deployment**: Vercel
- **Testing**: Jest (coverage directory pattern present)

## Repository Structure

```
project-scaffold/
├── .gitignore        # Git ignore rules for Next.js/TS/Node
├── LICENSE           # Apache 2.0
├── README.md         # Project description
└── CLAUDE.md         # This file
```

## Development Conventions

### Environment Variables
- Local environment files use the pattern `.env*.local` and `.env`
- These are gitignored — never commit secrets or environment files

### Build Artifacts
- Next.js build output: `/.next/`
- Static export output: `/out/`
- Production build: `/build/`
- These directories are gitignored

### Dependencies
- Node modules are in `/node_modules/` (gitignored)
- PnP (Plug'n'Play) files are gitignored if using Yarn Berry

## License

Apache License 2.0 — see `LICENSE` file for full terms.

## Guidelines for AI Assistants

- **Keep changes minimal** — only modify what is directly requested
- **Follow existing patterns** — match the style and conventions already in the codebase
- **Don't over-engineer** — this is a scaffold; keep things simple and extensible
- **No secrets in commits** — never commit `.env` files, API keys, or credentials
- **Preserve the scaffold nature** — additions should be broadly useful template code, not project-specific logic
