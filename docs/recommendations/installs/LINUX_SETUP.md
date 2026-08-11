# Linux Dev Setup

> Ubuntu/Debian. Adapt for other distros.

---

## Full Setup Script (Ubuntu 24.04+)

```bash
#!/bin/bash
set -e

echo "=== Linux Dev Setup ==="

# ── System Updates ───────────────────────────────────────────
sudo apt-get update && sudo apt-get upgrade -y

# ── Core Tools ───────────────────────────────────────────────
sudo apt-get install -y \
  build-essential \
  git \
  curl \
  wget \
  jq \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  ripgrep \
  fd-find \
  fzf \
  bat \
  zsh

# ── Bun ──────────────────────────────────────────────────────
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.zshrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.zshrc

# ── Node.js LTS (via nvm) ────────────────────────────────────
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts && nvm use --lts

# ── Docker ───────────────────────────────────────────────────
# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Run Docker without sudo
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker "$USER"

# ── GitHub CLI ───────────────────────────────────────────────
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
  sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
  https://cli.github.com/packages stable main" | \
  sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt-get update && sudo apt-get install -y gh

# ── Git Config ───────────────────────────────────────────────
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true

# SSH key
if [[ ! -f ~/.ssh/id_ed25519 ]]; then
  ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519 -N ""
  echo "Add this public key to GitHub → Settings → SSH keys:"
  cat ~/.ssh/id_ed25519.pub
fi

# ── Zsh Setup ────────────────────────────────────────────────
if [[ "$SHELL" != "$(which zsh)" ]]; then
  chsh -s "$(which zsh)"
  echo "Shell changed to zsh — log out and back in"
fi

# Starship prompt
curl -sS https://starship.rs/install.sh | sh
echo 'eval "$(starship init zsh)"' >> ~/.zshrc

# Zoxide (smarter cd)
curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash
echo 'eval "$(zoxide init zsh)"' >> ~/.zshrc

# ── VS Code ──────────────────────────────────────────────────
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] \
  https://packages.microsoft.com/repos/code stable main" | \
  sudo tee /etc/apt/sources.list.d/vscode.list > /dev/null
sudo apt-get update && sudo apt-get install -y code

echo ""
echo "=== Setup complete. Log out and back in for group changes to take effect. ==="
```

---

## Nix (Reproducible Dev Environments)

For team consistency, consider Nix flakes:

```nix
# flake.nix
{
  description = "project-scaffold dev environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_20
            git
            just
            docker
          ];
          shellHook = ''
            echo "dev environment ready"
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
          '';
        };
      });
}
```

```bash
# Enter dev shell (installs nothing globally)
nix develop

# Or use direnv to auto-activate
echo "use flake" > .envrc && direnv allow
```

---

## WSL2 (Windows Subsystem for Linux)

```powershell
# PowerShell (admin) — install WSL2 with Ubuntu
wsl --install -d Ubuntu-24.04

# After reboot, open Ubuntu terminal
# Run the Linux setup script above
```

Key WSL2 tips:
- Access Windows files at `/mnt/c/Users/<name>/`
- Access WSL files from Windows: `\\wsl$\Ubuntu\home\<user>\`
- VS Code + WSL: `code .` from WSL terminal auto-connects
- Docker Desktop integrates with WSL2 automatically
- Performance: keep project files in WSL filesystem (not `/mnt/c/`)
