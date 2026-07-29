# /quirk-fix-ci — diagnose and repair a failing check

The canonical statement of this task is `.github/prompts/quirk-fix-ci.prompt.md`.
Read it first; this file adds only what is specific to running it here.

## Read the failure before theorising

Pull the actual job log. A check that is red for an infrastructure reason
looks identical, from the outside, to one that is red for a code reason, and
guessing between them has cost this repository real time.

Known failure signatures, each of which has occurred here:

| Log line                                                                        | Cause                                                                                                         | Fix                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `lockfile had changes, but lockfile is frozen`                                  | `package.json` moved without `bun.lock` — usually a Dependabot merge, which edits the manifest only           | `bun install`, commit the lockfile                                |
| `The job was not started because your account is locked due to a billing issue` | GitHub Actions billing, not the code                                                                          | Nothing to fix in the repository; wait for it to clear and re-run |
| `contextOrFilename.getFilename is not a function`                               | eslint 10 against `eslint-plugin-react`, which still peers `eslint: ^9.7`                                     | Hold eslint at 9.x; see the guard in `.github/dependabot.yml`     |
| A failure you cannot reproduce locally                                          | PR checks build the _merge_ of your head into current `main`, so the break may be in main, not in your branch | Merge `origin/main` locally and re-run `bun run validate`         |

## Reproduce locally before changing anything

```bash
bun install --frozen-lockfile   # the exact gate CI runs first
bun run validate                # lint, type-check, unit tests, build
bun audit --prod                # what the security job enforces
```

`bun run validate` runs `next build`, which rewrites `tsconfig.json` as a side
effect. That rewrite is build output, not a change to make — restore it with
`git restore tsconfig.json` before committing.

## Reporting

Separate what you established from what you suspect:

- **VERIFIED** — reproduced locally, or read directly in the job log.
- **INFERRED** — consistent with the evidence but not reproduced.
- **UNKNOWN** — needs access or a decision you do not have.

Name the failing job and the log line you are acting on. Do not report a check
as fixed until it has completed green on the pushed head.
