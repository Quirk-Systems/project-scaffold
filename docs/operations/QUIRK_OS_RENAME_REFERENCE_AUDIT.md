# Quirk OS Rename Reference Audit

Status: RESOLVED — kernel code references updated to `Quirk-Systems/quirk-os`. Repository rename and owner-only gate remain pending until Bryan Sayler completes the GitHub Settings cutover sequence.

This audit enumerates hardcoded references and connected hosting bindings before `Quirk-Systems/project-scaffold` became `Quirk-Systems/quirk-os`.

## Verified repository identities

- Implemented kernel: `Quirk-Systems/quirk-os` (formerly `project-scaffold`), repository ID `1061970258`.
- Occupied placeholder: `Quirk-Systems/quirk-os`, repository ID `1316241620` — to be renamed `quirk-os-reserved` by owner before cutover.
- The placeholder repository reports size `0`, no branches, and the commits endpoint returns `Git Repository is empty`.

The Git history is empty. Owner-only settings and external local remotes still require inspection before the GitHub Settings rename.

## Hardcoded `quirk-os` references

No application, workflow, package, or realm repository contains `Quirk-Systems/quirk-os`.

Current matches are confined to `.github`:

- `profile/README.md`
- `docs/QUIRK_OS_RENAME_RUNBOOK.md`
- `docs/REPOSITORY_STRATEGY.md`
- `.quirk/repositories.json`

## Hardcoded `project-scaffold` references

### Kernel: runtime and automation — RESOLVED

All kernel runtime and automation references have been updated to `quirk-os`:

- `.quirk/manifest.json` ✓
- `scripts/deps-audit.ts` ✓
- `.github/ISSUE_TEMPLATE/config.yml` ✓
- `src/app/page.tsx` ✓
- `package.json` ✓
- `bun.lock` — regenerates from `package.json` on next install

### Kernel: instructions and documentation — RESOLVED

All kernel instruction and documentation references have been updated:

- `CLAUDE.md` ✓
- `docs/recommendations/mcp/MCP.md` ✓
- `docs/recommendations/macros/ONE_CLICK.md` ✓
- `docs/recommendations/tips/GIT_TRICKS.md` ✓
- `docs/recommendations/installs/DOCKER_SETUP.md` ✓
- `docs/recommendations/installs/PROJECT_BOOTSTRAP.md` ✓
- `docs/recommendations/installs/LINUX_SETUP.md` ✓

### Child repository provenance references — PENDING (external repos)

These live in separate repositories and must be updated after the GitHub Settings rename:

- `quirk-feed/CLAUDE.md`
- `quirk-generator/CLAUDE.md`
- `quirk-beauty/CLAUDE.md`
- `quirk-pet/CLAUDE.md`
- `quirk-town/CLAUDE.md`

### Organization governance — PENDING (external `.github` repo)

- `.github/profile/README.md`
- `.github/docs/QUIRK_OS_RENAME_RUNBOOK.md`
- `.github/docs/REPOSITORY_STRATEGY.md`
- `.github/.quirk/repositories.json`

## CI result

No `.github/workflows/**` file across the organization contains either rename target as a hardcoded repository string. The semantic-governance workflow references `Quirk-Systems/.github`, which is unaffected.

## Vercel result

Both connected Vercel teams were inspected. No project is named `project-scaffold` or `quirk-os`, and no surfaced deployment binding uses repository ID `1061970258` or `1316241620`.

Observed bindings were to `Quirk-Systems/quirk-generator` and unrelated repositories. `giggitty-godmode-laundry` exposed no Git metadata and requires a manual project-settings check.

## Netlify result

Connected projects:

- `sanity-kitchen-sink-studio-gcv8i7a3`
- `sanity-kitchen-sink-web-gfepih4d`
- `diversion-compliance`

No name matches either target. The connector does not expose Git bindings, so each project's continuous-deployment repository setting must be inspected manually.

## Owner-only gate

Bryan Sayler must confirm before rename:

- `quirk-os` placeholder has no webhooks, deploy keys, environments, variables, app bindings, deployments, packages, releases, or rulesets that matter.
- No local clone or Git remote targets the empty placeholder.
- The three Netlify projects do not bind to either target repository.
- The Vercel project `giggitty-godmode-laundry` does not bind to either target repository.
- Merges are paused on `project-scaffold` during cutover.

## Cutover

Only after the gate is checked:

1. Rename `Quirk-Systems/quirk-os` placeholder to `quirk-os-reserved` in Settings > General > Repository name.
2. Confirm it remains empty, mark it non-canonical, and archive it.
3. Rename `Quirk-Systems/project-scaffold` to `quirk-os` through the same setting.
4. Execute issue #75 post-cutover verification before reopening merges.

## Source-of-truth correction

Per-repository manifests are authored. Any organization registry must be generated from those manifests and fail CI when edited manually. The current `.github/.quirk/repositories.json` is not authoritative; its correction remains parked until after rename and the kernel-only validation workflow.
