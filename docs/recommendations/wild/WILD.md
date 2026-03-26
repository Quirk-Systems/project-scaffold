# Wild Ideas, Rabbit Holes & Mind Drops

> No guardrails. Follow the threads.

---

## Concepts That Rewire How You Think

### Gall's Law
> "A complex system that works is invariably found to have evolved from a simple system that worked."

Start small. Let complexity emerge from use, not from planning.

### Chesterton's Fence
> Before removing a fence, understand why it was built.

Applied to code: before deleting that weird `setTimeout(fn, 0)`, understand what race condition it was masking.

### Goodhart's Law
> "When a measure becomes a target, it ceases to be a good measure."

Code coverage % as proxy for test quality. Lines of code as proxy for productivity. Every metric you optimize will eventually be gamed.

### Postel's Law (Robustness Principle)
> "Be conservative in what you send, be liberal in what you accept."

The entire internet runs on this. Also the source of most security vulnerabilities.

### The Lindy Effect
> Things that have survived a long time are likely to survive longer.

C is 50 years old. JavaScript is 30. That new framework is 6 months old. Weight accordingly.

---

## Programming Rabbit Holes

### Homoiconicity
Lisp programs are data. Data is programs. You can write code that writes code with no special syntax. This is why Lisp macros are genuinely more powerful than macros in other languages, not just syntactic sugar.

### Continuation-Passing Style (CPS)
Any program can be transformed to pass its "rest of computation" explicitly as a function. This is how async/await desugars. Understanding CPS unlocks understanding callbacks → promises → async → generators.

### Type Theory
- **Curry-Howard Correspondence**: Types are propositions. Programs are proofs. A function `A → B` is a proof that if you have `A` you can derive `B`.
- **Dependent Types** (Idris, Agda): Types that depend on values. You can encode "a list of exactly 5 elements" in the type system.
- **Linear Types** (Rust's ownership): Every value used exactly once. Eliminates entire classes of memory bugs at compile time.

### The Halting Problem
No program can decide, for all possible programs, whether they will halt or run forever. Proof: assume it exists, use it to construct a program that contradicts it. This is why perfect static analysis is impossible.

### Byzantine Fault Tolerance
A system with `n` nodes can tolerate `f` traitors only if `n >= 3f + 1`. Bitcoin's proof-of-work is a different solution to the same problem — make betrayal economically irrational.

---

## Wild Technical Ideas Worth Exploring

### Temporal Databases
Every update creates a new row. Nothing is ever overwritten. You can query "what did this data look like on March 3rd at 2:17pm?" Built into: Datomic, CockroachDB, some Postgres extensions.

### Event Sourcing as the Default
Instead of storing current state, store every event that led to it. Current state = replay of events. Audit log is free. Time travel is free. Projections are flexible. The tradeoff: complexity and storage.

### CRDT (Conflict-free Replicated Data Types)
Data structures that can be merged without conflicts, regardless of order. Two people edit a document offline, sync later — no conflicts possible. Used in Figma, Linear, Apple Notes. Most people don't know these exist.

### Purely Functional Data Structures
Immutable data structures that share structure. When you "modify" a list, you get a new list that shares 95% of nodes with the old one. This is how Clojure, Elm, and Haskell achieve immutability without copying everything.

### Datalog
Logic programming for databases. You define rules, not queries. The engine figures out how to execute them. Datomic and xtdb use it. You can express recursive queries (find all transitive dependencies) in a few lines.

### Probabilistic Programming
Write programs that reason about uncertainty. Define a model, observe some data, ask "what parameters best explain this?" The language/runtime does the math. Used in Bayesian ML, simulation.

---

## Media That Changes How You Build

### Books
- **SICP** (Structure and Interpretation of Computer Programs) — builds computing from scratch, mind-bending
- **The Design of Everyday Things** — why bad UX is a design failure, not user failure
- **A Philosophy of Software Design** — complexity is the enemy, simplicity is the craft
- **The Pragmatic Programmer** — timeless engineering habits
- **Hackers & Painters** (Paul Graham) — essays on creativity and computing
- **Gödel, Escher, Bach** (Hofstadter) — consciousness, recursion, self-reference as one unified phenomenon

### Papers
- [Out of the Tar Pit](http://curtclifton.net/papers/MoseleyMarks06a.pdf) — complexity in software systems
- [Reflections on Trusting Trust](https://www.cs.cmu.edu/~rdz/Papers/Thompson-CACM84.pdf) — Ken Thompson, 3 pages, destroys your trust in compilers
- [The Mythical Man-Month](https://www.cs.drexel.edu/~yfcai/CS451/RequiredReadings/MythicalManMonth.pdf) — why adding people slows down projects
- [No Silver Bullet](http://worrydream.com/refs/Brooks-NoSilverBullet.pdf) — essence vs accidents of complexity
- [Dynamo: Amazon's Highly Available Key-Value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) — consistent hashing, vector clocks, quorums in practice

### Talks
- **Inventing on Principle** (Bret Victor) — tools should provide immediate feedback
- **Simple Made Easy** (Rich Hickey) — simple ≠ easy, and why it matters
- **The Future of Programming** (Bret Victor) — what we lost when we converged on text-file programming
- **Wat** (Gary Bernhardt) — JavaScript and Ruby absurdities, 4 minutes, essential
- **The Birth & Death of JavaScript** (Gary Bernhardt) — 30 year arc speculation, surprisingly accurate

### Channels / People
- **Computerphile** (YouTube) — CS concepts explained visually
- **3Blue1Brown** — math and intuition, beautiful
- **Primeagen** — strong opinions on software, entertaining
- **ThePrimeagen's reading list** — curated engineering posts
- **Hillel Wayne** — formal methods made approachable

---

## Cheatsheets

### Git (Power User)
```bash
# Interactive rebase (squash, reorder, edit)
git rebase -i HEAD~5

# Find commit that introduced bug
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# git will checkout middle commit, mark good/bad until found

# Stash with message
git stash push -m "wip: oauth flow"

# Recover deleted branch
git reflog                    # find the SHA
git checkout -b recovered SHA

# See who changed a line
git log -L 42,42:src/auth.ts

# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Cherry pick range
git cherry-pick A..B

# Diff only specific file between branches
git diff main..feature -- src/auth.ts
```

### SQL Power Moves
```sql
-- Window functions
SELECT
  user_id,
  amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) AS running_total,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rank
FROM orders;

-- CTEs (Common Table Expressions)
WITH monthly_revenue AS (
  SELECT DATE_TRUNC('month', created_at) AS month, SUM(amount) AS revenue
  FROM orders
  GROUP BY 1
),
growth AS (
  SELECT month, revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT month, revenue,
  ROUND((revenue - prev_revenue) / prev_revenue * 100, 2) AS growth_pct
FROM growth;

-- UPSERT
INSERT INTO users (id, email, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, updated_at = NOW();

-- Recursive CTE (organizational hierarchy)
WITH RECURSIVE org AS (
  SELECT id, name, manager_id, 0 AS depth FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, org.depth + 1
  FROM employees e JOIN org ON e.manager_id = org.id
)
SELECT * FROM org ORDER BY depth, name;
```

### Regex Essentials
```
(?:...)     non-capturing group
(?=...)     lookahead
(?<=...)    lookbehind
(?!...)     negative lookahead
\b          word boundary
\K          reset match start (PCRE)

# Useful patterns
Email:      [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
UUID:       [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
Semver:     (0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-z-]+))?
URL:        https?://[^\s/$.?#].[^\s]*
IPv4:       (\d{1,3}\.){3}\d{1,3}
```

---

## Tools That Deserve More Attention

| Tool | What | Why Underrated |
|------|------|----------------|
| [Zellij](https://zellij.dev) | Terminal multiplexer | Better tmux, sane defaults |
| [Helix](https://helix-editor.com) | Modal editor | Vim ideas, done right |
| [Atuin](https://atuin.sh) | Shell history | Sync + search your history across machines |
| [Bun](https://bun.sh) | JS runtime | Actually fast, drops in for Node |
| [Deno](https://deno.com) | JS runtime | Secure by default, built-in TS |
| [Hono](https://hono.dev) | Web framework | Tiny, edge-ready, great DX |
| [Drizzle](https://orm.drizzle.team) | ORM | SQL-like, type-safe, fast |
| [Warp](https://warp.dev) | Terminal | AI-native terminal |
| [Raycast](https://raycast.com) | Launcher | Replaces Alfred + spotlight |
| [Linear](https://linear.app) | Issue tracker | Fastest PM tool ever made |

---

## Provocations

> Things to sit with.

- What if your primary abstraction is wrong?
- The most important line of code is the one you deleted.
- Every abstraction leaks. The question is where and when.
- Simplicity is a prerequisite for reliability. (Dijkstra)
- The best code is the code that doesn't need to exist.
- Premature optimization is the root of all evil — but what about premature abstraction?
- Distributed systems don't fail. They fail partially.
- Your mental model of the system is always wrong. Always.
- The map is not the territory. The schema is not the data.
- Naming is the hardest and most important thing in programming.
