# Data Structures — Intricate Implementations

> The ones that actually matter. With real code.

---

## Trie (Prefix Tree)

Use for: autocomplete, spell check, IP routing, prefix search.

```typescript
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd = false;
  count = 0; // how many words pass through here
}

class Trie {
  root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.count++;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) return false;
      node = node.children.get(char)!;
    }
    return node.isEnd;
  }

  startsWith(prefix: string): string[] {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    const results: string[] = [];
    this.dfs(node, prefix, results);
    return results;
  }

  private dfs(node: TrieNode, current: string, results: string[]): void {
    if (node.isEnd) results.push(current);
    for (const [char, child] of node.children) {
      this.dfs(child, current + char, results);
    }
  }

  delete(word: string): boolean {
    return this.deleteHelper(this.root, word, 0);
  }

  private deleteHelper(node: TrieNode, word: string, depth: number): boolean {
    if (depth === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      return node.children.size === 0;
    }
    const char = word[depth];
    const child = node.children.get(char);
    if (!child) return false;
    const shouldDelete = this.deleteHelper(child, word, depth + 1);
    if (shouldDelete) node.children.delete(char);
    return !node.isEnd && node.children.size === 0;
  }
}
```

---

## Bloom Filter

Use for: "definitely not in set" checks. Cache miss avoidance, duplicate detection at scale.

```typescript
class BloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;

  constructor(expectedItems: number, falsePositiveRate: number) {
    // Optimal size and hash count formulas
    this.size = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.log(2) ** 2
    );
    this.hashCount = Math.ceil(
      (this.size / expectedItems) * Math.log(2)
    );
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  private hash(item: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < item.length; i++) {
      hash = Math.imul(hash ^ item.charCodeAt(i), 0x9e3779b9);
      hash = ((hash << 13) | (hash >>> 19)) >>> 0;
    }
    return Math.abs(hash) % this.size;
  }

  add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(item, i * 0xdeadbeef);
      this.bits[idx >> 3] |= 1 << (idx & 7);
    }
  }

  mightContain(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(item, i * 0xdeadbeef);
      if ((this.bits[idx >> 3] & (1 << (idx & 7))) === 0) return false;
    }
    return true; // might be false positive
  }
}

// Usage
const filter = new BloomFilter(1_000_000, 0.01); // 1M items, 1% false positive rate
filter.add("user-123");
filter.mightContain("user-123"); // true
filter.mightContain("user-999"); // false (or rare false positive)
```

---

## LRU Cache

Use for: memoization, CDN cache, API response cache.

```typescript
class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map(); // Map preserves insertion order
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      // Delete least recently used (first entry)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, value);
  }

  get size(): number {
    return this.map.size;
  }
}
```

---

## Skip List

Use for: ordered data with O(log n) search, insert, delete. Redis uses this for sorted sets.

```typescript
const MAX_LEVEL = 16;

class SkipNode<T> {
  value: T;
  forward: (SkipNode<T> | null)[];

  constructor(value: T, level: number) {
    this.value = value;
    this.forward = new Array(level).fill(null);
  }
}

class SkipList<T> {
  private head: SkipNode<T | null>;
  private level = 1;
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
    this.head = new SkipNode(null as any, MAX_LEVEL);
  }

  private randomLevel(): number {
    let level = 1;
    while (Math.random() < 0.5 && level < MAX_LEVEL) level++;
    return level;
  }

  insert(value: T): void {
    const update: (SkipNode<T | null> | null)[] = new Array(MAX_LEVEL).fill(null);
    let current = this.head;

    for (let i = this.level - 1; i >= 0; i--) {
      while (
        current.forward[i] &&
        this.compare(current.forward[i]!.value, value) < 0
      ) {
        current = current.forward[i]!;
      }
      update[i] = current;
    }

    const newLevel = this.randomLevel();
    if (newLevel > this.level) {
      for (let i = this.level; i < newLevel; i++) update[i] = this.head;
      this.level = newLevel;
    }

    const node = new SkipNode(value, newLevel);
    for (let i = 0; i < newLevel; i++) {
      node.forward[i] = update[i]!.forward[i];
      update[i]!.forward[i] = node;
    }
  }

  search(value: T): boolean {
    let current = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (
        current.forward[i] &&
        this.compare(current.forward[i]!.value, value) < 0
      ) {
        current = current.forward[i]!;
      }
    }
    current = current.forward[0]!;
    return current !== null && this.compare(current.value, value) === 0;
  }
}
```

---

## LSM Tree (Log-Structured Merge Tree)

Concept used by: RocksDB, Cassandra, LevelDB, BigTable.

```typescript
// Simplified LSM Tree concept implementation
class MemTable {
  private data = new Map<string, string | null>(); // null = tombstone

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.set(key, null); // tombstone
  }

  get(key: string): string | null | undefined {
    return this.data.get(key);
  }

  get size(): number {
    return this.data.size;
  }

  // Sorted for SSTable flush
  toSorted(): [string, string | null][] {
    return [...this.data.entries()].sort(([a], [b]) => a.localeCompare(b));
  }
}

class SSTable {
  readonly data: Map<string, string | null>;
  readonly level: number;
  readonly timestamp: number;

  constructor(entries: [string, string | null][], level: number) {
    this.data = new Map(entries);
    this.level = level;
    this.timestamp = Date.now();
  }

  get(key: string): string | null | undefined {
    return this.data.get(key);
  }
}

class LSMTree {
  private memTable = new MemTable();
  private sstables: SSTable[] = []; // newer tables first
  private readonly memTableLimit = 100;

  write(key: string, value: string): void {
    this.memTable.set(key, value);
    if (this.memTable.size >= this.memTableLimit) this.flush();
  }

  delete(key: string): void {
    this.memTable.delete(key);
  }

  read(key: string): string | null | undefined {
    // Check memtable first
    const memResult = this.memTable.get(key);
    if (memResult !== undefined) return memResult; // null = deleted

    // Search SSTables newest first
    for (const table of this.sstables) {
      const result = table.get(key);
      if (result !== undefined) return result;
    }

    return undefined; // not found
  }

  private flush(): void {
    const entries = this.memTable.toSorted();
    this.sstables.unshift(new SSTable(entries, 0));
    this.memTable = new MemTable();
    this.maybeCompact();
  }

  private maybeCompact(): void {
    // Level 0: compact when > 4 SSTables
    const level0 = this.sstables.filter((s) => s.level === 0);
    if (level0.length > 4) this.compact(0);
  }

  private compact(level: number): void {
    const toCompact = this.sstables.filter((s) => s.level === level);
    const merged = new Map<string, string | null>();

    // Merge, newer values win
    for (const table of [...toCompact].reverse()) {
      for (const [k, v] of table.data) {
        merged.set(k, v);
      }
    }

    // Remove old tables
    this.sstables = this.sstables.filter((s) => s.level !== level);

    // Add compacted table at next level
    const entries = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b));
    this.sstables.push(new SSTable(entries, level + 1));
  }
}
```

---

## Consistent Hashing

Use for: distributed caches, load balancing, sharding without full reshuffling.

```typescript
class ConsistentHash {
  private ring = new Map<number, string>(); // hash -> node
  private sortedKeys: number[] = [];
  private readonly replicas: number;

  constructor(replicas = 150) {
    this.replicas = replicas;
  }

  private hash(key: string): number {
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) + h) ^ key.charCodeAt(i);
      h = h >>> 0; // uint32
    }
    return h;
  }

  addNode(node: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const h = this.hash(`${node}:${i}`);
      this.ring.set(h, node);
      this.sortedKeys.push(h);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  removeNode(node: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const h = this.hash(`${node}:${i}`);
      this.ring.delete(h);
    }
    this.sortedKeys = this.sortedKeys.filter((k) => this.ring.has(k));
  }

  getNode(key: string): string | null {
    if (this.ring.size === 0) return null;
    const h = this.hash(key);
    // Find first node clockwise from hash
    const idx = this.sortedKeys.findIndex((k) => k >= h);
    const target = idx === -1 ? this.sortedKeys[0] : this.sortedKeys[idx];
    return this.ring.get(target) ?? null;
  }
}

// Usage
const ring = new ConsistentHash();
ring.addNode("cache-1");
ring.addNode("cache-2");
ring.addNode("cache-3");

ring.getNode("user-123"); // → "cache-2" (stable unless nodes change)
ring.getNode("order-456"); // → "cache-1"
```

---

## Resources

- [Algorithms, 4th Ed. (Sedgewick)](https://algs4.cs.princeton.edu) — canonical reference
- [The Algorithm Design Manual (Skiena)](https://www.algorist.com) — real-world focus
- [Designing Data-Intensive Applications (Kleppmann)](https://dataintensive.net) — LSM, consistent hashing in depth
- [Visualgo](https://visualgo.net) — animated algorithm visualizations
- [Big-O Cheatsheet](https://www.bigocheatsheet.com) — complexity at a glance
