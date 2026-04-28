.PHONY: dev build test lint clean setup \
        docker-up docker-down docker-reset docker-logs \
        db-migrate db-seed db-studio db-reset \
        deploy-staging deploy-prod

# ── Dev ──────────────────────────────────────────────────────────────────────

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

test-watch:
	npm run test:watch

test-e2e:
	npx playwright test

lint:
	npm run lint && npm run typecheck

clean:
	rm -rf dist .next node_modules .turbo

# ── Setup ────────────────────────────────────────────────────────────────────

setup:
	./scripts/setup.sh

# ── Docker ───────────────────────────────────────────────────────────────────

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	docker compose down -v && docker compose up -d

docker-logs:
	docker compose logs -f app

# ── Database ─────────────────────────────────────────────────────────────────

db-migrate:
	npx prisma migrate dev

db-migrate-prod:
	npx prisma migrate deploy

db-seed:
	npx prisma db seed

db-studio:
	npx prisma studio

db-reset:
	npx prisma migrate reset --force && npx prisma db seed

db-generate:
	npx prisma generate

# ── Deploy ───────────────────────────────────────────────────────────────────

deploy-staging:
	gh workflow run deploy.yml --ref develop

deploy-prod:
	gh workflow run deploy.yml --ref main

# ── Utilities ────────────────────────────────────────────────────────────────

logs:
	docker compose logs -f

env:
	cp .env.example .env.local
	@echo ".env.local created — fill in real values"

install:
	npm ci

update:
	npm update && npm audit fix
