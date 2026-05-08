# Dependency Audit

> Know what you're shipping. Every dep is code you own.

---

## Quick Audit Commands

```bash
# Security vulnerabilities
bun audit

# With severity filter
bunx better-npm-audit audit --level high

# Outdated packages (interactive)
bunx npm-check-updates -i

# Unused dependencies
bunx depcheck

# What's in your bundle
bunx @next/bundle-analyzer
```

---

## Bundle Analysis Setup

```typescript
// next.config.ts
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  // your next config
});
```

```bash
ANALYZE=true bun run build
# Opens browser with interactive treemap
```

---

## License Compliance

Check licenses before shipping anything commercial:

```bash
bunx license-checker --summary
bunx license-checker --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;CC0-1.0;Unlicense;0BSD"
```

License risk tiers:
| License | Risk | Commercial Use |
|---------|------|----------------|
| MIT, ISC, BSD | None | Yes |
| Apache-2.0 | None (patent clause) | Yes |
| CC-BY | None with attribution | Yes (with credit) |
| LGPL | Medium | Yes (if not bundling) |
| GPL | High | Contact lawyer |
| AGPL | High (network copyleft) | Contact lawyer |
| SSPL | High | Contact lawyer |

---

## CVE Scanning

```bash
# GitHub native (for public repos)
# Enable Dependabot in Settings → Security

# Local scan
bunx audit-ci --high
# or
bunx better-npm-audit audit --level moderate

# Check a specific package
bunx snyk test --package <name>
```

Add to CI:
```yaml
# .github/workflows/ci.yml
- name: Security audit
  run: bunx better-npm-audit audit --level moderate
```

---

## Upgrade Strategy

### Safe upgrades (patch/minor)
```bash
# Update patch versions (x.y.Z)
bunx npm-check-updates --target patch -u && bun install

# Update minor versions (x.Y.z)
bunx npm-check-updates --target minor -u && bun install

# Verify nothing broke
bun run validate
```

### Major upgrades
1. Read the changelog / migration guide first
2. Upgrade one package at a time
3. Run tests after each
4. Commit each upgrade separately (easier to revert)

```bash
# Single package upgrade
bun add package-name@latest
bun run validate
git add . && git commit -m "chore(deps): upgrade package-name to vX.Y.Z"
```

---

## Dep Size Impact

Before adding any package, check its size:

```bash
bunx bundlephobia <package-name>
# or visit bundlephobia.com
```

Rules of thumb:
- Under 5 kB gzipped: fine
- 5–50 kB: justify it
- Over 50 kB: seriously consider alternatives or dynamic import

---

## Removing Unused Dependencies

```bash
# Find unused
bunx depcheck

# Example output:
# Unused dependencies
# * moment (26 kB — use date-fns or native Intl instead)
# * lodash (try native JS equivalents)

bun remove moment lodash
bun run validate
```

---

## Peer Dependency Validation

```bash
# Check peer deps
bun install --strict-peer-dependencies

# Audit peer dep issues
bunx check-peer-dependencies
```

---

## Automated Dependency Updates (Dependabot)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: "development"
      production-dependencies:
        dependency-type: "production"
```

---

## Red Flags

Stop and investigate before shipping if:
- Any `bun audit` result is `high` or `critical`
- A package hasn't been updated in > 2 years (check GitHub)
- A package has < 500 weekly downloads (bus factor risk)
- A package has a GPL/AGPL license in commercial code
- A package pulls in unexpected heavy transitive deps
