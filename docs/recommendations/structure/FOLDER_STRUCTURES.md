# Folder Structures

> Opinionated layouts. Pick one. Commit to it.

---

## Next.js App (App Router)

```
my-app/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   └── pull_request_template.md
├── .claude/
│   └── commands/
│       ├── commit.md
│       ├── review.md
│       └── spec.md
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── webhooks/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # Primitives (shadcn, radix)
│   │   │   ├── button.tsx
│   │   │   └── input.tsx
│   │   └── features/           # Feature components
│   │       ├── auth/
│   │       └── dashboard/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts               # Prisma client
│   │   ├── utils.ts
│   │   └── validators/         # Zod schemas
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   └── config/                 # App config, constants
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                    # Playwright
├── CLAUDE.md
├── .env.example
├── docker-compose.yml
├── Makefile
└── package.json
```

---

## Python FastAPI

```
my-api/
├── .github/workflows/
├── src/
│   └── app/
│       ├── main.py             # FastAPI app entry
│       ├── config.py           # Settings (pydantic-settings)
│       ├── dependencies.py     # FastAPI dependencies
│       ├── api/
│       │   ├── __init__.py
│       │   ├── router.py       # Route registration
│       │   └── v1/
│       │       ├── auth.py
│       │       ├── users.py
│       │       └── health.py
│       ├── core/
│       │   ├── auth.py         # Auth logic
│       │   ├── security.py     # JWT, hashing
│       │   └── errors.py       # Error handlers
│       ├── db/
│       │   ├── base.py         # SQLAlchemy base
│       │   ├── session.py      # DB session
│       │   └── models/
│       ├── schemas/            # Pydantic models
│       ├── services/           # Business logic
│       ├── repositories/       # DB access layer
│       └── utils/
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── alembic/
│   ├── env.py
│   └── versions/
├── CLAUDE.md
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── pyproject.toml
```

---

## Go Service

```
my-service/
├── .github/workflows/
├── cmd/
│   └── server/
│       └── main.go             # Entry point
├── internal/                   # Private packages
│   ├── config/
│   │   └── config.go
│   ├── handler/                # HTTP handlers
│   │   ├── handler.go
│   │   ├── auth.go
│   │   └── users.go
│   ├── service/                # Business logic
│   │   ├── auth.go
│   │   └── users.go
│   ├── repository/             # DB access
│   │   └── users.go
│   ├── middleware/
│   │   ├── auth.go
│   │   └── logging.go
│   └── model/                  # Domain types
│       └── user.go
├── pkg/                        # Public packages
│   ├── logger/
│   └── validator/
├── migrations/
├── tests/
├── CLAUDE.md
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── go.mod
```

---

## CLI Tool (Node.js)

```
my-cli/
├── src/
│   ├── index.ts                # Entry — parses args, routes commands
│   ├── commands/
│   │   ├── init.ts
│   │   ├── build.ts
│   │   └── deploy.ts
│   ├── lib/
│   │   ├── config.ts           # Load/save config (~/.mycli/config.json)
│   │   ├── api.ts              # Remote API calls
│   │   └── output.ts           # chalk, ora, boxen helpers
│   └── types/
├── tests/
├── CLAUDE.md
└── package.json
```

---

## Monorepo (Turborepo)

```
monorepo/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── api/                    # Node/Express API
│   └── docs/                   # Docusaurus
├── packages/
│   ├── ui/                     # Shared component library
│   ├── config/                 # Shared TS, ESLint, Tailwind configs
│   ├── db/                     # Shared Prisma schema + client
│   └── utils/                  # Shared utilities
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-web.yml
├── CLAUDE.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## File Naming Conventions

```
# TypeScript / JavaScript
components/        → PascalCase.tsx         (UserCard.tsx)
hooks/             → camelCase with use      (useUser.ts)
utils/lib/         → camelCase              (formatDate.ts)
types/             → camelCase or PascalCase (user.types.ts)
api routes/        → kebab-case             (user-profile/route.ts)
tests/             → same name + .test/.spec (UserCard.test.tsx)
constants/         → SCREAMING_SNAKE in file, kebab file name

# Python
modules/           → snake_case.py          (user_service.py)
classes/           → PascalCase in file     (class UserService)
constants/         → SCREAMING_SNAKE        (MAX_RETRIES = 3)

# Go
packages/          → lowercase single word  (handler, service)
files/             → snake_case.go          (user_handler.go)
```

---

## .gitignore Essentials

```gitignore
# Dependencies
node_modules/
.venv/
vendor/

# Build outputs
dist/
build/
.next/
__pycache__/
*.pyc

# Environment
.env
.env.local
.env.*.local

# Editors
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
.nyc_output/

# Logs
*.log
logs/

# Secrets (belt AND suspenders)
*.pem
*.key
*.p12
secrets/
```

---

## .env.example Template

```bash
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# External APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage
S3_BUCKET=my-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@example.com
```
