# Shell Macros

> Your shell is a dev tool. Configure it like one.

---

## Add to ~/.zshrc or ~/.bashrc

```bash
# ── Project Navigation ─────────────────────────────────────

# Jump to project root (finds nearest package.json)
function root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]]; then
      cd "$dir" && return
    fi
    dir="$(dirname "$dir")"
  done
  echo "No package.json found"
}

# ── Bun Shortcuts ─────────────────────────────────────────

alias bi="bun install"
alias ba="bun add"
alias bad="bun add -d"
alias br="bun remove"
alias bx="bunx"
alias bd="bun run dev"
alias bb="bun run build"
alias bt="bun run test:run"
alias bl="bun run lint"
alias bv="bun run validate"

# ── Git Power ─────────────────────────────────────────────

alias gs="git status -sb"
alias gl="git log --oneline --graph --decorate -20"
alias gla="git log --oneline --graph --decorate --all -30"
alias gd="git diff"
alias gds="git diff --staged"
alias ga="git add"
alias gap="git add -p"          # interactive hunk staging
alias gc="git commit"
alias gcm="git commit -m"
alias gca="git commit --amend --no-edit"
alias gp="git push"
alias gpl="git pull --rebase"
alias gf="git fetch --all --prune"
alias gco="git checkout"
alias gcb="git checkout -b"
alias gb="git branch"
alias gbD="git branch -D"
alias gst="git stash"
alias gstp="git stash pop"
alias gstl="git stash list"

# Create branch from ticket ID
function gcf() {
  # Usage: gcf feature/my-feature
  git checkout -b "$1" && git push -u origin "$1"
}

# Push current branch and set upstream
function gup() {
  git push -u origin "$(git branch --show-current)"
}

# Delete merged branches
function gbclean() {
  git branch --merged main | grep -v "main\|master\|\*" | xargs git branch -d
  git remote prune origin
  echo "Cleaned merged branches"
}

# ── Docker ────────────────────────────────────────────────

alias dc="docker compose"
alias dcu="docker compose up -d"
alias dcd="docker compose down"
alias dcl="docker compose logs -f"
alias dcr="docker compose restart"
alias dps="docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Kill all docker containers
function dkillall() {
  docker kill $(docker ps -q) 2>/dev/null && echo "All containers stopped"
}

# ── Process Management ────────────────────────────────────

# Kill process on port
function killport() {
  local port="${1}"
  if [[ -z "$port" ]]; then echo "Usage: killport <port>"; return 1; fi
  lsof -ti :"$port" | xargs kill -9 2>/dev/null && echo "Killed process on port $port" || echo "No process on port $port"
}

# What's running on a port
function whatsport() {
  lsof -i :"${1}" | grep LISTEN
}

# ── File Operations ───────────────────────────────────────

# Create dir and cd into it
function mkcd() {
  mkdir -p "$1" && cd "$1"
}

# Find files by name
function f() {
  find . -name "*$1*" -not -path "*/node_modules/*" -not -path "*/.next/*"
}

# Grep source files (excludes node_modules, .next, .git)
function s() {
  grep -r "$1" . --include="*.ts" --include="*.tsx" --include="*.js" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
    --color=always | head -50
}

# ── Environment ───────────────────────────────────────────

# Show all env vars for current project
function envshow() {
  if [[ -f .env ]]; then
    grep -v "^#" .env | grep -v "^$" | sort
  else
    echo "No .env file found"
  fi
}

# Copy env example to .env
function envinit() {
  if [[ -f .env ]]; then
    echo ".env already exists"
  else
    cp .env.example .env && echo "Created .env from .env.example"
  fi
}

# ── Utilities ─────────────────────────────────────────────

# Generate a random secret (useful for AUTH_SECRET)
function gensecret() {
  openssl rand -base64 "${1:-32}"
}

# Quick HTTP server in current directory
function serve() {
  local port="${1:-8080}"
  echo "Serving on http://localhost:$port"
  bunx serve . -p "$port"
}

# Show size of directories (top 10)
function dsize() {
  du -sh "${1:-.}"/* 2>/dev/null | sort -h | tail -10
}

# Pretty JSON from stdin or file
function jpp() {
  if [[ -n "$1" ]]; then
    cat "$1" | bun -e 'process.stdout.write(JSON.stringify(JSON.parse(await new Response(process.stdin).text()), null, 2))'
  else
    bun -e 'process.stdout.write(JSON.stringify(JSON.parse(await new Response(process.stdin).text()), null, 2))'
  fi
}
```

---

## Prompt Enhancements

```bash
# Add to ~/.zshrc for a useful git-aware prompt
# (or use starship: brew install starship)

# Starship — instant, highly configurable
eval "$(starship init zsh)"  # or bash

# Minimal starship config (~/.config/starship.toml)
cat > ~/.config/starship.toml << 'EOF'
format = "$directory$git_branch$git_status$nodejs$bun$character"

[directory]
truncation_length = 3

[git_branch]
symbol = " "

[git_status]
format = '([\[$all_status$ahead_behind\]]($style) )'

[nodejs]
symbol = " "
detect_files = ["package.json"]

[bun]
symbol = "🥟 "

[character]
success_symbol = "[❯](bold green)"
error_symbol = "[❯](bold red)"
EOF
```

---

## Keyboard Shortcuts (Terminal)

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Fuzzy search history (install fzf for best results) |
| `Ctrl+L` | Clear screen |
| `Ctrl+A` | Jump to beginning of line |
| `Ctrl+E` | Jump to end of line |
| `Alt+←/→` | Move word by word |
| `Ctrl+W` | Delete word backward |
| `Ctrl+U` | Delete to beginning of line |
| `!!` | Repeat last command |
| `!$` | Last argument of previous command |
| `cd -` | Go to previous directory |

Install fzf for supercharged history: `brew install fzf && $(brew --prefix)/opt/fzf/install`
