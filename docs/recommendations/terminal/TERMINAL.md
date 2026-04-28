# Terminal

> You live here. Set it up like you mean it.
> Every minute invested compounds daily for the rest of your career.

---

## Zsh Config

```bash
# ~/.zshrc

# History
HISTSIZE=100000; SAVEHIST=100000; HISTFILE="$HOME/.zsh_history"
setopt HIST_IGNORE_ALL_DUPS HIST_FIND_NO_DUPS INC_APPEND_HISTORY SHARE_HISTORY HIST_VERIFY

# Navigation
setopt AUTO_CD AUTO_PUSHD PUSHD_IGNORE_DUPS

# Zinit — fastest plugin manager
source "$HOME/.local/share/zinit/zinit.git/zinit.zsh"
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-history-substring-search
zinit light Aloxaf/fzf-tab

# Substring search on ↑↓
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down
```

---

## Starship Prompt

```toml
# ~/.config/starship.toml
"$schema" = "https://starship.rs/config-schema.json"

format = """$directory$git_branch$git_status$nodejs$python$rust$line_break$character"""

[character]
success_symbol = "[❯](bold green)"
error_symbol   = "[❯](bold red)"

[directory]
style = "bold cyan"
truncation_length = 3

[git_branch]
symbol = " "

[git_status]
ahead  = "⇡${count}"
behind = "⇣${count}"
staged = "[+${count}](green)"
modified = "[!${count}](yellow)"
```

---

## Aliases

```bash
# Navigation
alias ..='cd ..' && alias ...='cd ../..' && alias -- -='cd -'

# ls → eza
alias ls='eza --icons --group-directories-first'
alias ll='eza -la --icons --group-directories-first --git'
alias lt='eza --tree --icons --level=2'

# cat → bat
alias cat='bat --style=plain'

# Git
alias gs='git status'    && alias ga='git add'     && alias gc='git commit'
alias gp='git push'      && alias gpl='git pull'   && alias gl='git log --oneline --graph --decorate -20'
alias gb='git branch'    && alias gco='git checkout' && alias gd='git diff'
alias gds='git diff --staged' && alias gst='git stash' && alias gstp='git stash pop'

# Docker
alias dc='docker compose' && alias dcu='docker compose up -d' && alias dcd='docker compose down'
alias dcl='docker compose logs -f'

# NPM
alias ni='npm install' && alias nr='npm run' && alias nd='npm run dev'
alias nt='npm run test' && alias nb='npm run build'

# Misc
alias reload='source ~/.zshrc'
alias myip='curl -s ipinfo.io/ip'
alias ports='lsof -i -P -n | grep LISTEN'
alias uuid='uuidgen | tr "[:upper:]" "[:lower:]"'
```

---

## Functions

```bash
# mkdir + cd
mkcd() { mkdir -p "$1" && cd "$1"; }

# Kill port
pork() {
  local pid=$(lsof -ti:"$1")
  [[ -n "$pid" ]] && kill -9 "$pid" && echo "Killed $pid on :$1" || echo "Nothing on :$1"
}

# Quick HTTP server
serve() { python3 -m http.server "${1:-8000}"; }

# Git: create branch + push
feature() {
  local b="feature/$1"
  git fetch origin && git checkout -b "$b" origin/main && git push -u origin "$b"
}

# Extract anything
extract() {
  case "$1" in
    *.tar.gz)  tar xzf "$1" ;; *.zip) unzip "$1" ;;
    *.tar.bz2) tar xjf "$1" ;; *.gz)  gunzip "$1" ;;
    *) echo "Cannot extract '$1'" ;;
  esac
}

# Clone + cd
clone() { git clone "$1" && cd "$(basename "$1" .git)"; }
```

---

## FZF — Fuzzy Everything

```bash
export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border --preview "bat --color=always {}"'

# Ctrl+T → fuzzy file picker
# Ctrl+R → fuzzy history search
# Alt+C  → fuzzy directory jump

# Fuzzy branch checkout
fco() {
  local branch=$(git branch --all | grep -v HEAD | fzf | tr -d '[:space:]')
  git checkout "${branch#remotes/origin/}"
}
```

---

## Essential CLI Tools

```bash
brew install eza          # ls replacement
brew install bat          # cat with syntax highlighting
brew install fd           # find replacement
brew install ripgrep      # grep replacement
brew install fzf          # fuzzy finder
brew install delta        # git diff highlighting
brew install zoxide       # smart cd (z project-name)
brew install atuin        # history sync across machines
brew install starship     # prompt
brew install jq           # JSON processor
brew install gh           # GitHub CLI
brew install lazygit      # terminal git UI
brew install httpie       # curl replacement
```

### Git Delta
```ini
# ~/.gitconfig
[core]
  pager = delta
[delta]
  navigate = true
  line-numbers = true
  side-by-side = true
  syntax-theme = "Catppuccin Mocha"
[interactive]
  diffFilter = delta --color-only
```

---

## Dotfiles — Version Control

```bash
git init --bare $HOME/.dotfiles
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
dotfiles config status.showUntrackedFiles no

dotfiles add ~/.zshrc ~/.gitconfig ~/.config/starship.toml
dotfiles commit -m "feat: initial dotfiles"
dotfiles push

# Restore on new machine
git clone --bare https://github.com/you/dotfiles.git $HOME/.dotfiles
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
dotfiles checkout
```

---

## Resources

- [Starship](https://starship.rs)
- [Zinit](https://github.com/zdharma-continuum/zinit)
- [FZF](https://github.com/junegunn/fzf)
- [Atuin](https://atuin.sh)
- [The Missing Semester (MIT)](https://missing.csail.mit.edu)
