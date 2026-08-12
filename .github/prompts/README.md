# Quirk GitHub Prompt Pack

Eleven reusable GitHub Copilot prompt files for evidence-backed Quirk Systems engineering.

## Install

Copy the files in `prompts/` into a repository's `.github/prompts/` directory. Invoke them in Copilot Chat with `/quirk-orient`, `/quirk-build`, or the corresponding prompt name.

Prompt files define repeatable tasks. Keep repository-wide standards in `.github/copilot-instructions.md` or `AGENTS.md`, and use custom agents for persistent specialist behavior.

## Prompt Map

| Prompt | Use |
| --- | --- |
| `quirk-orient` | Map an unfamiliar repository without changing it |
| `quirk-build` | Implement a bounded feature with proof |
| `quirk-review` | Produce a decision-grade code review |
| `quirk-poke-holes` | Adversarially test a plan or architecture |
| `quirk-fix-ci` | Diagnose and repair a failing check |
| `quirk-deps` | Assess dependency and lockfile risk |
| `quirk-architecture` | Write an evidence-backed architecture decision |
| `quirk-core-contract` | Protect canonical, runtime, and projection boundaries |
| `quirk-security-pass` | Trace credible security failures |
| `quirk-ship` | Prepare a reviewer-ready pull request |
| `quirk-compound` | Extract reusable capability from finished work |

## Quirk Prompt Spine

Every prompt moves through:

1. **Context** — governing repository state and instructions
2. **Outcome** — observable behavior that must become true
3. **Constraints** — properties that must remain true
4. **Evidence** — code, tests, logs, schemas, or documentation supporting claims
5. **Action** — smallest coherent intervention
6. **Verification** — proof that the outcome works
7. **Risk** — remaining failure conditions
8. **Residue** — unknowns, exclusions, and human decisions

The governing rule: do not claim success without evidence.
