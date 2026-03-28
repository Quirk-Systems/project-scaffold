# Recommendations Index

> Dense drops of useful shit. Jump in anywhere.

---

## Core Reference

| File | What's Inside |
|------|---------------|
| [PLANNING.md](planning/PLANNING.md) | Planning doc templates, PRDs, ADRs, RFCs |
| [APPS.md](apps/APPS.md) | App stacks, starter kits, SaaS patterns |
| [WILD.md](wild/WILD.md) | Wild ideas, experiments, rabbit holes |
| [OBSIDIAN.md](obsidian/OBSIDIAN.md) | Vault setup, plugins, Dataview, templater, canvas |

---

## AI & Agents

| File | What's Inside |
|------|---------------|
| [ai/CLAUDE_SKILLS.md](ai/CLAUDE_SKILLS.md) | Claude slash commands, skills, CLAUDE.md patterns |
| [ai/OPENAI_SKILLS.md](ai/OPENAI_SKILLS.md) | OpenAI tool use, assistants, function calling |
| [ai/PROMPT_PATTERNS.md](ai/PROMPT_PATTERNS.md) | CoT, ReAct, few-shot, structured output, injection defense |
| [ai/AGENT_PATTERNS.md](ai/AGENT_PATTERNS.md) | Agentic loop, orchestrator/subagent, pipeline, evaluator-optimizer |
| [ai/MODEL_SELECTION.md](ai/MODEL_SELECTION.md) | Opus vs Sonnet vs Haiku — when, why, cost |
| [ai/AI_MEMORY.md](ai/AI_MEMORY.md) | Conversation, episodic, semantic, RAG, CLAUDE.md as memory |
| [ai/AI_EVALS.md](ai/AI_EVALS.md) | Eval suites, LLM-as-judge, A/B testing, regression in CI |

---

## AI Voice, Persona & Soul

| File | What's Inside |
|------|---------------|
| [voice/AI_VOICE.md](voice/AI_VOICE.md) | Voice principles: lead with answer, concrete > abstract, audience calibration |
| [voice/AI_PERSONA.md](voice/AI_PERSONA.md) | Persona template, example personas, persona vs. role |
| [voice/AI_SOUL.md](voice/AI_SOUL.md) | Core values, honesty over helpfulness, on being wrong, integrity |
| [voice/AI_TONE.md](voice/AI_TONE.md) | Tone per context: debugging, review, teaching, planning, casual |

---

## Tips & Tricks (By Technology)

| File | What's Inside |
|------|---------------|
| [tips/TYPESCRIPT_TIPS.md](tips/TYPESCRIPT_TIPS.md) | Utility types, template literals, discriminated unions, satisfies, WithRequired |
| [tips/NEXTJS_TIPS.md](tips/NEXTJS_TIPS.md) | App Router, server actions, caching, parallel routes, middleware |
| [tips/TESTING_TIPS.md](tips/TESTING_TIPS.md) | Test factories, mock patterns, TanStack Query testing, Playwright POM |
| [tips/DEBUGGING_TIPS.md](tips/DEBUGGING_TIPS.md) | React DevTools, network debugging, memory leaks, race conditions |
| [tips/TAILWIND_TIPS.md](tips/TAILWIND_TIPS.md) | CSS-first v4 config, dynamic classes, responsive, animation, cn() |
| [tips/DRIZZLE_TIPS.md](tips/DRIZZLE_TIPS.md) | Schema patterns, relations, queries, pagination, transactions, migrations |
| [tips/BUN_TIPS.md](tips/BUN_TIPS.md) | Bun.file, Bun.serve, Bun.$, native SQLite, bun test |
| [tips/GIT_TRICKS.md](tips/GIT_TRICKS.md) | Bisect, worktrees, reflog, stash, cherry-pick, conventional commits |

---

## Code & Data

| File | What's Inside |
|------|---------------|
| [code/DATA_STRUCTURES.md](code/DATA_STRUCTURES.md) | Tries, graphs, bloom filters, LSM trees |

---

## Reports & Audits

| File | What's Inside |
|------|---------------|
| [reports/REPO_HEALTH.md](reports/REPO_HEALTH.md) | 15-point health score, bundle budget, type safety, git hygiene |
| [reports/DEPENDENCY_AUDIT.md](reports/DEPENDENCY_AUDIT.md) | CVE scan, license check, bundle impact, upgrade strategy |
| [reports/SECURITY_AUDIT.md](reports/SECURITY_AUDIT.md) | OWASP Top 10, security headers, input validation, CORS |
| [reports/PERFORMANCE_REPORT.md](reports/PERFORMANCE_REPORT.md) | Core Web Vitals, caching, image optimization, DB query profiling |
| [reports/CODE_QUALITY.md](reports/CODE_QUALITY.md) | Complexity, dead code, duplication, code review checklist |

---

## Macros & One-Click

| File | What's Inside |
|------|---------------|
| [macros/CLAUDE_COMMANDS.md](macros/CLAUDE_COMMANDS.md) | 8 Claude slash commands: /ship, /audit, /scaffold, /review, /debug, /docs, /migrate, /health |
| [macros/SHELL_MACROS.md](macros/SHELL_MACROS.md) | .zshrc aliases, dev shortcuts, git shortcuts, process management |
| [macros/BUN_SCRIPTS.md](macros/BUN_SCRIPTS.md) | Script patterns, seed/reset/generate scripts, one-liners |
| [macros/GIT_ALIASES.md](macros/GIT_ALIASES.md) | ~/.gitconfig power aliases, fuzzy checkout, global git settings |
| [macros/ONE_CLICK.md](macros/ONE_CLICK.md) | Bootstrap, auth secret, reset DB, clean install, release tagging |

---

## Setup & Installation

| File | What's Inside |
|------|---------------|
| [installs/MACOS_SETUP.md](installs/MACOS_SETUP.md) | One-paste macOS setup: Homebrew, Bun, Node, VS Code, git |
| [installs/LINUX_SETUP.md](installs/LINUX_SETUP.md) | Ubuntu 24.04 setup, Docker, Nix flakes, WSL2 |
| [installs/PROJECT_BOOTSTRAP.md](installs/PROJECT_BOOTSTRAP.md) | New project from scaffold in 5 min, customize, deploy checklist |
| [installs/DOCKER_SETUP.md](installs/DOCKER_SETUP.md) | Dockerfile, compose (dev + prod), dev containers, CI registry push |
| [installs/DEVTOOLS.md](installs/DEVTOOLS.md) | Terminal tools, browser extensions, VS Code extensions, DB GUIs |

---

## Architecture & Structure

| File | What's Inside |
|------|---------------|
| [structure/FOLDER_STRUCTURES.md](structure/FOLDER_STRUCTURES.md) | Opinionated folder layouts for every project type |
| [pipelines/CICD.md](pipelines/CICD.md) | GitHub Actions, Docker, deploy pipelines, secrets |

---

## Quick Philosophy

- Flat > nested when possible
- Every doc answers: **what, why, how**
- Templates are starting points, not cages
- If it took you > 30min to figure out, write it down
- Measure before optimizing
- Ship it, then improve it
