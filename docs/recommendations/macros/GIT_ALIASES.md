# Git Aliases

> ~/.gitconfig [alias] section. Drop these in and level up permanently.

---

## Core Workflow Aliases

```ini
[alias]
  # Status
  st  = status -sb
  s   = status

  # Log views
  lg  = log --oneline --graph --decorate --all
  l   = log --oneline -20
  ll  = log --format="%C(auto)%h%d %s %C(dim)(%ar by %an)" -20
  last = log -1 HEAD --format="%h %s (%ar by %an)"

  # Diff
  d   = diff
  ds  = diff --staged
  dc  = diff --cached
  dw  = diff --word-diff

  # Add
  a   = add
  ap  = add -p             # interactive hunk staging
  aa  = add -A

  # Commit
  c   = commit
  cm  = commit -m
  ca  = commit --amend --no-edit
  cam = commit --amend

  # Checkout
  co  = checkout
  cb  = checkout -b
  main = checkout main
  m   = checkout main

  # Branch
  b   = branch
  ba  = branch -a
  bd  = branch -d
  bD  = branch -D

  # Push/Pull
  p   = push
  pu  = push -u origin HEAD    # push current branch with upstream tracking
  pl  = pull --rebase
  f   = fetch --all --prune

  # Stash
  ss  = stash push
  sp  = stash pop
  sl  = stash list
  sd  = stash drop

  # Rebase
  rb  = rebase
  rbi = rebase -i
  rbc = rebase --continue
  rba = rebase --abort
```

---

## Power Aliases

```ini
[alias]
  # What I did today
  today = log --since=midnight --author="$(git config user.name)" --oneline --no-merges

  # What changed this week
  week = log --since='7 days ago' --oneline --no-merges

  # Commits not yet pushed
  outgoing = log @{upstream}..HEAD --oneline

  # Commits not yet pulled
  incoming = log HEAD..@{upstream} --oneline

  # Undo last commit, keep changes staged
  undo    = reset --soft HEAD~1

  # Unstage file
  unstage = restore --staged

  # Discard unstaged changes (careful)
  discard = restore .

  # Show which files changed in last commit
  changed = diff --name-only HEAD~1 HEAD

  # Find string in git history
  find    = log -S

  # Short summary of files in last commit
  short   = diff --stat HEAD~1

  # List all tags with dates
  tags    = tag -l --sort=-version:refname --format='%(refname:short) %(creatordate:short)'

  # Repo stats
  stats   = shortlog -sn --no-merges

  # Show remote info
  remotes = remote -v

  # Size of objects (find large files in history)
  bigfiles = !git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | grep '^blob' | sort -k3 -rn | head -10

  # Delete merged branches (local + remote tracking)
  trim    = !git branch --merged main | grep -v 'main\\|\\*' | xargs git branch -d && git remote prune origin

  # Cherry-pick with attribution
  pick    = cherry-pick

  # Sync fork with upstream
  sync = !git fetch upstream && git rebase upstream/main
```

---

## Fuzzy Checkout (requires fzf)

```ini
[alias]
  # Interactive branch checkout
  fco = !git branch -a | fzf --preview 'git log --oneline {}' | sed 's/remotes\\/origin\\///' | xargs git checkout

  # Interactive stash apply
  fsp = !git stash list | fzf | cut -d: -f1 | xargs git stash pop

  # Interactive commit to checkout
  fshow = !git log --oneline | fzf --preview 'git show {}' | awk '{print $1}' | xargs git show
```

---

## Global Git Config Settings

```ini
[core]
  editor          = code --wait      # or vim, nano
  autocrlf        = input            # on Mac/Linux
  excludesfile    = ~/.gitignore_global

[init]
  defaultBranch   = main

[pull]
  rebase          = true             # pull --rebase by default

[push]
  default         = current          # push current branch by default
  autoSetupRemote = true             # auto set upstream on push

[rebase]
  autoStash       = true             # stash before rebase, pop after

[diff]
  algorithm       = histogram        # better diff algorithm
  colorMoved      = default

[merge]
  conflictstyle   = zdiff3           # shows base in conflicts (cleaner)

[branch]
  sort            = -committerdate   # sort branches by most recent

[log]
  date            = relative         # show "3 days ago" instead of dates

[color]
  ui              = auto

[credential]
  helper          = osxkeychain      # Mac — use Git Credential Manager on Windows
```

---

## Global .gitignore

```bash
# ~/.gitignore_global
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
Thumbs.db
*.swp
*.swo
.idea/
.vscode/settings.json   # keep .vscode/extensions.json though
*.orig
.env.local
*.log
```

---

## Applying This Config

```bash
# Merge into ~/.gitconfig
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.st "status -sb"
# ... (tedious for many aliases)

# Better: edit directly
git config --global --edit
# Pastes into your editor — paste the [alias] block
```

Or maintain a dotfiles repo and symlink `~/.gitconfig`.
