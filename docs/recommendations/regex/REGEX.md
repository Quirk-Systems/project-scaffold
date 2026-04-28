# Regex

> Write-once, read-never — unless you understand them.
> Then they're a superpower.

---

## Syntax Reference

```
Anchors
  ^     start of string (or line with /m)
  $     end of string (or line with /m)
  \b    word boundary
  \B    non-word boundary

Character Classes
  .     any char except newline ([\s\S] includes newlines)
  \d    digit [0-9]            \D  non-digit
  \w    word char [a-zA-Z0-9_] \W  non-word
  \s    whitespace             \S  non-whitespace
  [abc]   set: a, b, or c
  [^abc]  negated: not a, b, c
  [a-z]   range

Quantifiers (greedy by default — add ? for lazy)
  *     0 or more    *?  lazy
  +     1 or more    +?  lazy
  ?     0 or 1       ??  lazy
  {n}   exactly n
  {n,m} between n and m

Groups
  (abc)       capturing group
  (?:abc)     non-capturing
  (?<name>)   named capturing group
  a|b         alternation

Lookarounds (zero-width)
  (?=abc)   positive lookahead  — followed by abc
  (?!abc)   negative lookahead  — not followed by abc
  (?<=abc)  positive lookbehind — preceded by abc
  (?<!abc)  negative lookbehind — not preceded by abc

Flags
  /g  global    /i  case-insensitive
  /m  multiline /s  dotall (. matches \n)
  /u  unicode
```

---

## Validation Patterns

```regex
# Email (practical)
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

# URL
/^https?:\/\/[^\s/$.?#].[^\s]*$/i

# IPv4 (with range)
/^(25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/

# UUID v4
/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

# Semver
/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-z-]+))?$/i

# Strong password (8+ chars, upper, lower, digit, special)
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

# Slug
/^[a-z0-9]+(?:-[a-z0-9]+)*$/

# Hex color
/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

# ISO 8601 date
/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

# US phone
/^(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/

# E.164 international phone
/^\+[1-9]\d{7,14}$/

# Semantic commit
/^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)(\([a-z-]+\))?:\s.+/

# Git commit hash
/\b[0-9a-f]{7,40}\b/
```

---

## Extraction Patterns

```regex
# Markdown code blocks
/```(\w+)?\n([\s\S]*?)```/g

# Markdown links  [text](url)
/\[([^\]]+)\]\(([^)]+)\)/g

# Markdown headings
/^(#{1,6})\s+(.+)$/gm

# JS/TS import paths
/^import\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gm

# Environment variable references
/\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g

# JSON key-value
/"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|\d+(?:\.\d+)?|true|false|null)/g
```

---

## Advanced Techniques

### Named Capture Groups
```typescript
const LOG = /^(?<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+(?<level>INFO|WARN|ERROR)\s+(?<message>.+)$/;

const match = LOG.exec(line);
if (match?.groups) {
  const { timestamp, level, message } = match.groups;
}
```

### Replace with Functions
```typescript
// camelCase → kebab-case
const toKebab = (s: string) => s.replace(/([A-Z])/g, (_, c) => `-${c.toLowerCase()}`);
toKebab("backgroundColor"); // "background-color"

// Named group replacement
"2025-03-26".replace(
  /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/,
  "$<m>/$<d>/$<y>"
); // "03/26/2025"
```

### Greedy vs Lazy
```typescript
const html = "<b>bold</b> and <i>italic</i>";
html.match(/<.+>/)?.[0];   // "<b>bold</b> and <i>italic</i>" — greedy
html.match(/<.+?>/)?.[0];  // "<b>" — lazy
```

---

## Performance Gotchas — ReDoS

```
Catastrophic backtracking:
  (a+)+     with input "aaaaab" → exponential backtracking
  (a|ab)+   alternation matching same thing
  (\w+\s*)+  repeated boundary matching

Red flags: nested quantifiers, alternation on same patterns

Mitigations:
  → Validate input length before expensive patterns
  → Use RE2 binding (no catastrophic backtracking)
  → Set execution timeouts for user-supplied patterns
```

```typescript
// Length guard
function safeMatch(pattern: RegExp, input: string): RegExpExecArray | null {
  if (input.length > 10_000) return null;
  return pattern.exec(input);
}
```

---

## Tools

- [regex101.com](https://regex101.com) — interactive + explanation, best tool
- [regexr.com](https://regexr.com) — visual explanation
- [re2 (Node.js)](https://github.com/uhop/node-re2) — no catastrophic backtracking
