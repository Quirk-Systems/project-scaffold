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
| A failure you cannot reproduce locally                                          | PR checks build the _merge_ of your head into current `main`, so the break may be in main, not in your branch | Reproduce the merge in a throwaway worktree (below)               |

## Reproduce locally before changing anything

```bash
bun install --frozen-lockfile   # the exact gate CI runs first
bun run validate                # lint, type-check, unit tests, build
bun audit --prod                # what the security job enforces
```

To test against a moved base without touching the branch:

```bash
git fetch origin main
git worktree add --detach /tmp/ci-repro HEAD
git -C /tmp/ci-repro merge origin/main   # conflicts stay inside the worktree

# Run the gate against the merged tree — this is the point of the exercise.
# Testing the unmerged branch here would reproduce nothing.
(cd /tmp/ci-repro && bun install --frozen-lockfile && bun run validate)

git worktree remove --force /tmp/ci-repro
```

Merging into the branch itself is a change to the branch. Ask first.

`bun run validate` runs `next build`, which rewrites `tsconfig.json` as a side
effect. Check whether the file was already dirty before you ran it — if it was
clean, `git restore tsconfig.json` discards only build output; if it was not,
you would be discarding someone's edit along with it, so drop just the
generated hunk instead.

## Reporting

Separate what you established from what you suspect:

- **VERIFIED** — reproduced locally, or read directly in the job log.
- **INFERRED** — consistent with the evidence but not reproduced.
- **UNKNOWN** — needs access or a decision you do not have.

Name the failing job and the log line you are acting on. Do not report a check
as fixed until it has completed green on the pushed head.
