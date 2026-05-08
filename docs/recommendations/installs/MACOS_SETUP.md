# macOS Dev Setup

> One paste to get a new Mac ready for development. No ceremony.

---

## Full Setup Script

Save as `setup-mac.sh`, run once on a new machine:

```bash
#!/bin/bash
set -e

echo "=== macOS Dev Setup ==="

# ── Homebrew ─────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# ── Core Tools ───────────────────────────────────────────────
brew install \
  git \
  curl \
  wget \
  jq \
  ripgrep \
  fd \
  fzf \
  bat \
  eza \
  zoxide \
  starship \
  tldr \
  gh             # GitHub CLI

# ── Languages & Runtimes ─────────────────────────────────────
# Bun (includes Node via BunJS compat)
curl -fsSL https://bun.sh/install | bash

# Node.js via nvm (for projects that need specific Node versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install --lts
nvm use --lts

# ── Cask Apps ────────────────────────────────────────────────
brew install --cask \
  visual-studio-code \
  docker \
  warp \            # AI-native terminal
  raycast \         # launcher
  tableplus \       # DB GUI
  httpie \          # HTTP client with UI
  postman

# ── Git Setup ────────────────────────────────────────────────
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true
git config --global core.editor "code --wait"

# Generate SSH key
if [[ ! -f ~/.ssh/id_ed25519 ]]; then
  ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519 -N ""
  eval "$(ssh-agent -s)"
  ssh-add --apple-use-keychain ~/.ssh/id_ed25519
  echo "Host *\n  AddKeysToAgent yes\n  UseKeychain yes\n  IdentityFile ~/.ssh/id_ed25519" >> ~/.ssh/config
  echo "SSH key created. Add to GitHub: https://github.com/settings/keys"
  cat ~/.ssh/id_ed25519.pub | pbcopy
  echo "Public key copied to clipboard"
fi

# ── Shell Config ─────────────────────────────────────────────
cat >> ~/.zshrc << 'ZSHRC'

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Starship prompt
eval "$(starship init zsh)"

# Zoxide (smarter cd)
eval "$(zoxide init zsh)"

# fzf
source <(fzf --zsh)

# Better defaults
alias ls="eza --icons"
alias ll="eza -la --icons --git"
alias cat="bat"
alias grep="rg"

# Dev shortcuts
alias b="bun"
alias bi="bun install"
alias bd="bun run dev"
alias bv="bun run validate"
ZSHRC

echo "=== Setup complete. Restart terminal. ==="
```

---

## VS Code Extensions

```bash
# Install all at once
code --install-extension \
  dbaeumer.vscode-eslint \
  esbenp.prettier-vscode \
  bradlc.vscode-tailwindcss \
  ms-vscode.vscode-typescript-next \
  prisma.prisma \
  vitest.explorer \
  ms-playwright.playwright \
  eamodio.gitlens \
  github.copilot \
  usernamehw.errorlens \
  antfu.unocss \
  streetsidesoftware.code-spell-checker \
  formulahendry.auto-rename-tag
```

---

## VS Code Settings for This Stack

```json
// .vscode/settings.json (commit this to the repo)
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.tabSize": 2,
  "editor.rulers": [80],
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "\"([^\"]*)\"|'([^']*)'"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

---

## macOS Productivity Settings

```bash
# Show hidden files in Finder
defaults write com.apple.finder AppleShowAllFiles -bool true
killall Finder

# Show full path in Finder title bar
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true

# Faster key repeat
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 15

# Disable auto-correct (ruins code pasting)
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# Show battery percentage
defaults write com.apple.menuextra.battery ShowPercent -string "YES"
```
