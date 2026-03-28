# Dev Tools

> The best tool is the one you actually use. Here's what's worth learning.

---

## Terminal

| Tool | What | Install |
|------|------|---------|
| [Warp](https://warp.dev) | AI-native terminal, blocks, autocomplete | `brew install --cask warp` |
| [iTerm2](https://iterm2.com) | Classic Mac terminal | `brew install --cask iterm2` |
| [Starship](https://starship.rs) | Fast, minimal cross-shell prompt | `brew install starship` |
| [Zoxide](https://github.com/ajeetdsouza/zoxide) | Smarter `cd` (jumps to recent dirs) | `brew install zoxide` |
| [fzf](https://github.com/junegunn/fzf) | Fuzzy finder for history, files, etc. | `brew install fzf` |
| [bat](https://github.com/sharkdp/bat) | `cat` with syntax highlighting | `brew install bat` |
| [eza](https://eza.rocks) | Modern `ls` with icons and git info | `brew install eza` |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | Faster grep | `brew install ripgrep` |
| [fd](https://github.com/sharkdp/fd) | Faster find | `brew install fd` |
| [delta](https://github.com/dandavison/delta) | Better git diff pager | `brew install git-delta` |
| [lazygit](https://github.com/jesseduffield/lazygit) | TUI git client | `brew install lazygit` |

---

## Browser Extensions

### Chrome / Arc / Firefox

| Extension | Why |
|-----------|-----|
| React Developer Tools | Component tree, props, profiler |
| Wappalyzer | See what stack any site uses |
| VisBug | CSS inspection on any site |
| JSON Viewer | Readable JSON in browser |
| ModHeader | Add/modify request headers |
| Requestly | Intercept/redirect requests |
| OctoTree | GitHub file tree sidebar |
| GitHub Refined | 100 small GitHub UX improvements |
| Lighthouse | Performance auditing |

---

## VS Code Extensions (For This Stack)

```bash
# Install all at once
code --install-extension \
  dbaeumer.vscode-eslint \
  esbenp.prettier-vscode \
  bradlc.vscode-tailwindcss \
  ms-vscode.vscode-typescript-next \
  vitest.explorer \
  ms-playwright.playwright \
  eamodio.gitlens \
  usernamehw.errorlens \
  antfu.iconify \
  styled-components.vscode-styled-components \
  streetsidesoftware.code-spell-checker \
  christian-kohler.path-intellisense \
  drizzle-team.drizzle-vscode \
  biomejs.biome
```

| Extension | Why |
|-----------|-----|
| ESLint | Inline errors as you type |
| Prettier | Format on save |
| Tailwind CSS IntelliSense | Autocomplete, hover docs |
| TypeScript Nightly | Latest TS features |
| Vitest Explorer | Run/debug tests in sidebar |
| Playwright | E2E test runner in editor |
| GitLens | Git blame, history, compare |
| Error Lens | Errors inline, not just gutter |
| Drizzle ORM | Schema syntax support |

---

## Database Tools

| Tool | What | Best For |
|------|------|---------|
| [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) | Built-in — `bun run db:studio` | Dev inspection |
| [TablePlus](https://tableplus.com) | Native DB GUI (Mac/Win/Linux) | PostgreSQL, MySQL, SQLite |
| [DBeaver](https://dbeaver.io) | Free, cross-platform | Any DB |
| [Beekeeper Studio](https://www.beekeeperstudio.io) | Open source DB GUI | SQLite/Postgres/MySQL |
| [Postico 2](https://eggerapps.at/postico2/) | Mac-only, minimal | PostgreSQL |

---

## API Testing

| Tool | What | When |
|------|------|------|
| [HTTPie Desktop](https://httpie.io/desktop) | Cleaner than Postman | General API testing |
| [Bruno](https://www.usebruno.com) | File-based, git-friendly | Team API collections |
| [Postman](https://www.postman.com) | Industry standard | Shared collections, monitors |
| `curl` | Universal, scriptable | One-off requests, CI |
| `bun -e "fetch(...)"` | Inline fetch test | Quick smoke tests |

```bash
# Quick API test without a tool
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .
```

---

## Performance Tools

| Tool | What |
|------|------|
| [Lighthouse](https://developer.chrome.com/docs/lighthouse/) | Built into Chrome DevTools |
| [WebPageTest](https://webpagetest.org) | Real-browser perf from multiple locations |
| [Bundle Phobia](https://bundlephobia.com) | Check npm package size before installing |
| [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) | Visual bundle breakdown (`ANALYZE=true bun run build`) |

---

## AI Coding Tools

| Tool | What | Best For |
|------|------|---------|
| Claude Code | This CLI | Complex multi-file tasks, refactoring |
| [Cursor](https://cursor.com) | VS Code fork with AI | AI-native editing |
| [GitHub Copilot](https://copilot.github.com) | Inline completions | Fast autocomplete |
| [Cody](https://sourcegraph.com/cody) | Sourcegraph AI | Large codebase Q&A |

---

## Monitoring / Observability

| Tool | What | Free Tier |
|------|------|-----------|
| [Sentry](https://sentry.io) | Error tracking + performance | 5k errors/month |
| [Vercel Analytics](https://vercel.com/analytics) | Core Web Vitals | Included with Vercel |
| [Posthog](https://posthog.com) | Product analytics + session replay | 1M events/month |
| [Better Uptime](https://betterstack.com) | Uptime monitoring + status page | 10 monitors free |
| [Axiom](https://axiom.co) | Log management | 500GB/month |
