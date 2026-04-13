import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { QuirkConfig } from "./config.js";
import {
  appendNote,
  extractTags,
  extractWikiLinks,
  findBacklinks,
  listMarkdownFiles,
  moveNote,
  parseNote,
  readNote,
  resolveVaultPath,
  writeNote,
} from "./vault.js";

async function makeVault(): Promise<QuirkConfig> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quirk-vault-"));
  return {
    vaultPath: dir,
    dailyFolder: "Daily",
    dailyFormat: "YYYY-MM-DD",
    readOnly: false,
    maxFileBytes: 1_048_576,
    excludedDirs: [".obsidian", ".trash", ".smart-connections", ".git"],
  };
}

let cfg: QuirkConfig;

beforeEach(async () => {
  cfg = await makeVault();
});

afterEach(async () => {
  await fs.rm(cfg.vaultPath, { recursive: true, force: true });
});

describe("resolveVaultPath", () => {
  it("resolves a relative path inside the vault", () => {
    const full = resolveVaultPath(cfg, "Notes/foo.md");
    expect(full).toBe(path.join(cfg.vaultPath, "Notes/foo.md"));
  });

  it("rejects path traversal", () => {
    expect(() => resolveVaultPath(cfg, "../outside.md")).toThrow(/escapes/);
  });

  it("rejects excluded directories", () => {
    expect(() => resolveVaultPath(cfg, ".obsidian/plugins.json")).toThrow(
      /excluded/,
    );
  });
});

describe("extractWikiLinks", () => {
  it("extracts plain wikilinks", () => {
    expect(extractWikiLinks("See [[Foo]] and [[Bar]]")).toEqual(["Foo", "Bar"]);
  });

  it("strips headings and aliases", () => {
    expect(extractWikiLinks("[[Foo#Section|alias]] [[Bar|other]]")).toEqual([
      "Foo",
      "Bar",
    ]);
  });

  it("dedupes", () => {
    expect(extractWikiLinks("[[Foo]] [[Foo]]")).toEqual(["Foo"]);
  });
});

describe("extractTags", () => {
  it("combines frontmatter and inline tags", () => {
    const tags = extractTags(
      { tags: ["music", "project"] },
      "Body with #inline and #music/production #project",
    );
    expect(tags.sort()).toEqual(
      ["inline", "music", "music/production", "project"].sort(),
    );
  });

  it("ignores tags inside fenced code blocks", () => {
    const tags = extractTags({}, "Real #tag\n```\n#notatag\n```");
    expect(tags).toEqual(["tag"]);
  });

  it("parses space-separated string frontmatter tags", () => {
    expect(extractTags({ tags: "foo bar" }, "").sort()).toEqual(["bar", "foo"]);
  });
});

describe("parseNote", () => {
  it("parses frontmatter + content + tags", () => {
    const raw = [
      "---",
      "title: Test",
      "tags: [alpha, beta]",
      "---",
      "",
      "Body with #gamma",
    ].join("\n");
    const note = parseNote("Test.md", raw);
    expect(note.frontmatter.title).toBe("Test");
    expect(note.content.trim()).toBe("Body with #gamma");
    expect(note.tags.sort()).toEqual(["alpha", "beta", "gamma"]);
  });
});

describe("write + read + append + move", () => {
  it("round-trips a note", async () => {
    await writeNote(cfg, "Notes/hello.md", "# Hello\n\nWorld\n", false);
    const note = await readNote(cfg, "Notes/hello.md");
    expect(note.content).toContain("World");
  });

  it("refuses to overwrite without flag", async () => {
    await writeNote(cfg, "a.md", "one", false);
    await expect(writeNote(cfg, "a.md", "two", false)).rejects.toThrow(
      /already exists/,
    );
  });

  it("appends with newline separator", async () => {
    await writeNote(cfg, "log.md", "first", false);
    await appendNote(cfg, "log.md", "second", false);
    const note = await readNote(cfg, "log.md");
    expect(note.raw).toBe("first\nsecond");
  });

  it("refuses to append to missing file by default", async () => {
    await expect(appendNote(cfg, "missing.md", "x", false)).rejects.toThrow(
      /does not exist/,
    );
  });

  it("creates on append when flagged", async () => {
    await appendNote(cfg, "new.md", "content", true);
    const note = await readNote(cfg, "new.md");
    expect(note.raw).toBe("content");
  });

  it("moves a note", async () => {
    await writeNote(cfg, "Projects/old.md", "body", false);
    await moveNote(cfg, "Projects/old.md", "Archive/new.md", false);
    await expect(readNote(cfg, "Projects/old.md")).rejects.toThrow();
    const moved = await readNote(cfg, "Archive/new.md");
    expect(moved.content).toContain("body");
  });

  it("respects read-only mode", async () => {
    const ro = { ...cfg, readOnly: true };
    await expect(writeNote(ro, "x.md", "x", false)).rejects.toThrow(
      /read-only/,
    );
  });
});

describe("listMarkdownFiles", () => {
  it("lists markdown and excludes special dirs", async () => {
    await writeNote(cfg, "a.md", "a", false);
    await writeNote(cfg, "sub/b.md", "b", false);
    await fs.mkdir(path.join(cfg.vaultPath, ".obsidian"), { recursive: true });
    await fs.writeFile(
      path.join(cfg.vaultPath, ".obsidian/workspace.json"),
      "{}",
    );
    // Non-markdown file should be ignored.
    await fs.writeFile(path.join(cfg.vaultPath, "image.png"), "fake");

    const files = await listMarkdownFiles(cfg);
    expect(files).toEqual(["a.md", "sub/b.md"]);
  });
});

describe("findBacklinks", () => {
  it("finds notes that wikilink the target", async () => {
    await writeNote(cfg, "Target.md", "I am the target", false);
    await writeNote(cfg, "LinksToTarget.md", "See [[Target]]", false);
    await writeNote(cfg, "AliasLink.md", "See [[Target|the target]]", false);
    await writeNote(cfg, "Unrelated.md", "nothing here", false);

    const backlinks = await findBacklinks(cfg, "Target.md");
    expect(backlinks.sort()).toEqual(["AliasLink.md", "LinksToTarget.md"]);
  });

  it("does not include the target itself", async () => {
    await writeNote(cfg, "Self.md", "I reference [[Self]]", false);
    const backlinks = await findBacklinks(cfg, "Self.md");
    expect(backlinks).toEqual([]);
  });
});
