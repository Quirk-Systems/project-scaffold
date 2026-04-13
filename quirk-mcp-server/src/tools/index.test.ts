import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { QuirkConfig } from "../lib/config.js";
import { tools } from "./index.js";

function tool(name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

let cfg: QuirkConfig;

beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quirk-tools-"));
  cfg = {
    vaultPath: dir,
    dailyFolder: "Daily",
    dailyFormat: "YYYY-MM-DD",
    readOnly: false,
    maxFileBytes: 1_048_576,
    excludedDirs: [".obsidian", ".trash", ".smart-connections", ".git"],
  };
});

afterEach(async () => {
  await fs.rm(cfg.vaultPath, { recursive: true, force: true });
});

describe("tools surface", () => {
  it("registers 14 unique tools", () => {
    const names = tools.map((t) => t.name);
    expect(names.length).toBe(14);
    expect(new Set(names).size).toBe(14);
  });

  it("create_note serializes frontmatter + read_note parses it back", async () => {
    await tool("create_note").handler(
      {
        path: "Notes/atomic.md",
        content: "body text with [[LinkedNote]]",
        frontmatter: { title: "Atomic", tags: ["zettel"] },
      },
      cfg,
    );

    const read = (await tool("read_note").handler(
      { path: "Notes/atomic.md" },
      cfg,
    )) as {
      frontmatter: Record<string, unknown>;
      content: string;
      tags: string[];
    };

    expect(read.frontmatter.title).toBe("Atomic");
    expect(read.tags).toContain("zettel");
    expect(read.content).toContain("LinkedNote");
  });

  it("create_note refuses overwrite by default", async () => {
    await tool("create_note").handler(
      { path: "n.md", content: "first" },
      cfg,
    );
    await expect(
      tool("create_note").handler({ path: "n.md", content: "second" }, cfg),
    ).rejects.toThrow(/already exists/);
  });

  it("update_note preserves frontmatter when asked", async () => {
    await tool("create_note").handler(
      {
        path: "n.md",
        content: "v1",
        frontmatter: { title: "Keep", status: "active" },
      },
      cfg,
    );
    await tool("update_note").handler(
      { path: "n.md", content: "v2 body", preserveFrontmatter: true },
      cfg,
    );
    const read = (await tool("read_note").handler({ path: "n.md" }, cfg)) as {
      frontmatter: Record<string, unknown>;
      content: string;
    };
    expect(read.frontmatter.title).toBe("Keep");
    expect(read.frontmatter.status).toBe("active");
    expect(read.content.trim()).toBe("v2 body");
  });

  it("search_vault finds matches with snippets", async () => {
    await tool("create_note").handler(
      { path: "a.md", content: "the quick brown fox" },
      cfg,
    );
    await tool("create_note").handler(
      { path: "b.md", content: "lazy dog" },
      cfg,
    );
    const result = (await tool("search_vault").handler(
      { query: "quick" },
      cfg,
    )) as { hits: { path: string }[]; count: number };
    expect(result.count).toBe(1);
    expect(result.hits[0]!.path).toBe("a.md");
  });

  it("get_backlinks + get_forward_links reflect graph", async () => {
    await tool("create_note").handler(
      { path: "Hub.md", content: "I link to [[A]] and [[B]]" },
      cfg,
    );
    await tool("create_note").handler({ path: "A.md", content: "a" }, cfg);
    await tool("create_note").handler({ path: "B.md", content: "b" }, cfg);

    const fwd = (await tool("get_forward_links").handler(
      { path: "Hub.md" },
      cfg,
    )) as { links: string[] };
    expect(fwd.links.sort()).toEqual(["A", "B"]);

    const back = (await tool("get_backlinks").handler(
      { path: "A.md" },
      cfg,
    )) as { backlinks: string[] };
    expect(back.backlinks).toEqual(["Hub.md"]);
  });

  it("search_by_tag matches hierarchical descendants", async () => {
    await tool("create_note").handler(
      { path: "prod.md", content: "x", frontmatter: { tags: ["music/production"] } },
      cfg,
    );
    await tool("create_note").handler(
      { path: "theory.md", content: "y", frontmatter: { tags: ["music"] } },
      cfg,
    );
    await tool("create_note").handler(
      { path: "other.md", content: "z", frontmatter: { tags: ["ops"] } },
      cfg,
    );

    const result = (await tool("search_by_tag").handler(
      { tag: "music" },
      cfg,
    )) as { count: number; matches: { path: string }[] };
    expect(result.count).toBe(2);
    expect(result.matches.map((m) => m.path).sort()).toEqual([
      "prod.md",
      "theory.md",
    ]);
  });

  it("get_daily_note creates today's note with template", async () => {
    const result = (await tool("get_daily_note").handler(
      { date: "2026-03-26" },
      cfg,
    )) as { path: string; created: boolean };
    expect(result.created).toBe(true);
    expect(result.path).toBe("Daily/2026-03-26.md");

    const again = (await tool("get_daily_note").handler(
      { date: "2026-03-26" },
      cfg,
    )) as { created: boolean };
    expect(again.created).toBe(false);
  });

  it("move_note relocates a file", async () => {
    await tool("create_note").handler(
      { path: "Inbox/x.md", content: "body" },
      cfg,
    );
    await tool("move_note").handler(
      { from: "Inbox/x.md", to: "Archive/x.md" },
      cfg,
    );
    await expect(
      tool("read_note").handler({ path: "Inbox/x.md" }, cfg),
    ).rejects.toThrow();
    const moved = (await tool("read_note").handler(
      { path: "Archive/x.md" },
      cfg,
    )) as { content: string };
    expect(moved.content).toContain("body");
  });

  it("get_vault_stats reports orphans and folder counts", async () => {
    await tool("create_note").handler(
      { path: "Hub.md", content: "See [[Connected]]" },
      cfg,
    );
    await tool("create_note").handler(
      { path: "Connected.md", content: "x" },
      cfg,
    );
    await tool("create_note").handler(
      { path: "Lonely.md", content: "no links here" },
      cfg,
    );

    const stats = (await tool("get_vault_stats").handler({}, cfg)) as {
      totalNotes: number;
      orphanCount: number;
      orphans: string[];
    };
    expect(stats.totalNotes).toBe(3);
    // Hub and Lonely are unlinked; Connected is linked.
    expect(stats.orphans.sort()).toEqual(["Hub.md", "Lonely.md"]);
    expect(stats.orphanCount).toBe(2);
  });

  it("refuses write tools when read-only", async () => {
    const ro = { ...cfg, readOnly: true };
    await expect(
      tool("create_note").handler({ path: "x.md", content: "x" }, ro),
    ).rejects.toThrow(/read-only/);
  });

  it("rejects path traversal via tool args", async () => {
    await expect(
      tool("read_note").handler({ path: "../escape.md" }, cfg),
    ).rejects.toThrow(/escapes/);
  });
});
