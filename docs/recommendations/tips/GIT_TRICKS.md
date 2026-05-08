# Git Tricks

> Git rewards those who learn it. Every power user has the same 20 commands.

---

## Aliases Worth Adding (~/.gitconfig)

```ini
[alias]
  # Short status
  st = status -sb

  # Pretty log
  lg = log --oneline --graph --decorate --all

  # Last commit
  last = log -1 HEAD --format="%h %s (%ar by %an)"

  # What I did today
  today = log --since=midnight --author="$(git config user.name)" --oneline

  # Undo last commit, keep changes staged
  undo = reset --soft HEAD~1

  # Stash with timestamp
  snap = stash push -m "snap-$(date +%Y%m%d-%H%M%S)"

  # Show files changed in last N commits
  changed = diff --name-only HEAD~1

  # Upstream comparison
  incoming = log HEAD..@{upstream} --oneline
  outgoing = log @{upstream}..HEAD --oneline
```

---

## Rebase Workflows

### Interactive rebase — clean up before merging
```bash
# Squash last 4 commits into one
git rebase -i HEAD~4
# In editor:
# pick abc1234 first commit
# squash def5678 wip
# squash ghi9012 more wip
# squash jkl3456 fix typo
# → single clean commit

# Edit a specific old commit
git rebase -i HEAD~5
# Mark the target commit as "edit"
# Make your changes
git add .
git commit --amend
git rebase --continue

# Reorder commits (just reorder lines in editor)
```

### Rebase onto main (keep history clean)
```bash
git fetch origin
git rebase origin/main
# Resolve conflicts per commit, then:
git add .
git rebase --continue
# Or abort if things go wrong:
git rebase --abort
```

---

## Bisect — Find the Breaking Commit

```bash
git bisect start
git bisect bad HEAD              # current commit is broken
git bisect good v1.2.0           # this version worked

# Git checks out the midpoint
# Test it — is it broken?
git bisect bad   # yes, still broken
# or
git bisect good  # no, this one works

# Repeat until git says "abc1234 is the first bad commit"

# Automate with a script
git bisect run bun run test:run  # exits 0 = good, non-0 = bad

git bisect reset  # cleanup
```

---

## Worktrees — Multiple Branches Simultaneously

```bash
# Work on a hotfix without stashing/switching
git worktree add ../project-hotfix hotfix/critical-bug

# Now you have two working directories:
# ./project-scaffold  — your current branch
# ../project-hotfix   — hotfix branch

# Remove when done
git worktree remove ../project-hotfix
```

---

## Reflog — Undo Almost Anything

```bash
# See everything HEAD has pointed to
git reflog

# Output:
# abc1234 HEAD@{0}: commit: add feature
# def5678 HEAD@{1}: checkout: moving from main to feature
# ghi9012 HEAD@{2}: commit: fix bug

# Recover "deleted" branch
git checkout -b recovered-branch ghi9012

# Undo a bad rebase
git reset --hard HEAD@{5}   # go back to before rebase

# Reflog is your safety net — use it before panicking
```

---

## Stash Power

```bash
# Stash with a message
git stash push -m "wip: oauth integration"

# Stash only staged changes
git stash push --staged

# Stash specific files
git stash push src/components/auth.tsx src/lib/auth.ts

# List stashes
git stash list

# Apply specific stash (keep it in list)
git stash apply stash@{2}

# Apply and remove
git stash pop stash@{2}

# Show what's in a stash
git stash show -p stash@{1}

# Drop a stash
git stash drop stash@{2}

# Clear all stashes (careful)
git stash clear
```

---

## Cherry-Pick

```bash
# Apply a single commit to current branch
git cherry-pick abc1234

# Apply a range of commits
git cherry-pick abc1234..def5678

# Apply without committing (review first)
git cherry-pick abc1234 --no-commit

# Pick from another repo
git fetch upstream
git cherry-pick upstream/main~3
```

---

## Blame and History

```bash
# Find who wrote a line
git blame src/lib/auth.ts

# Find which commit introduced a string
git log -S "passwordHash" --oneline

# Show history of a specific function
git log -L :functionName:file.ts

# Show history of a file including renames
git log --follow src/lib/auth.ts

# Show diff between two branches on specific file
git diff main..feature -- src/lib/auth.ts
```

---

## Cleanup

```bash
# Delete merged local branches
git branch --merged main | grep -v main | xargs git branch -d

# Delete merged remote branches
git remote prune origin

# Clean untracked files (dry run first)
git clean -n    # preview
git clean -fd   # actually delete files and directories

# Remove file from last commit (forgot to gitignore)
git rm --cached secret.env
echo "secret.env" >> .gitignore
git commit --amend
```

---

## Hooks (via Lefthook)

This scaffold uses Lefthook. Config in `lefthook.yml`:

```yaml
pre-commit:
  commands:
    lint:
      run: bunx eslint {staged_files}
      glob: "*.{ts,tsx}"
    format:
      run: bunx prettier --check {staged_files}
      glob: "*.{ts,tsx,css,json,md}"
    type-check:
      run: bun run type-check

commit-msg:
  commands:
    commitlint:
      run: bunx commitlint --edit {1}
```

```bash
# Skip hooks for a WIP commit (use sparingly)
git commit --no-verify -m "chore: wip"

# Re-install hooks after clone
bun run prepare  # or: lefthook install
```

---

## Conventional Commits Reference

```
feat(scope): add user authentication
fix(scope): resolve token expiry race condition
docs(scope): update API documentation
style(scope): fix indentation in auth module
refactor(scope): extract validation logic
test(scope): add unit tests for auth service
chore(scope): upgrade dependency versions
perf(scope): optimize database queries
ci(scope): add e2e test workflow
build(scope): update Docker base image

# Breaking change (bumps major version)
feat!: redesign authentication API

# Or with body
feat(auth): redesign token system

BREAKING CHANGE: JWT tokens now expire in 1h (was 24h)
```

Scope is optional but valuable: `(auth)`, `(db)`, `(api)`, `(ui)`, `(ci)`.
