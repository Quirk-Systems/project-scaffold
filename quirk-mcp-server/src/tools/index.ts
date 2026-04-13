import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { QuirkConfig } from "../lib/config.js";
import {
  appendNote,
  ensureMarkdownPath,
  extractWikiLinks,
  findBacklinks,
  listMarkdownFiles,
  moveNote,
  readNote,
  resolveVaultPath,
  toVaultRelative,
  writeNote,
} from "../lib/vault.js";
import { formatDate } from "../lib/daily.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown, cfg: QuirkConfig) => Promise<unknown>;
}

// ---------- read_note ----------
const readNoteSchema = z.object({
  path: z.string().min(1).describe("Vault-relative path to the note, e.g. 'Daily/2026-03-26.md'"),
});

const readNoteTool: ToolDefinition = {
  name: "read_note",
  description:
    "Read a note's raw content and parsed YAML frontmatter. Returns { path, frontmatter, content, tags }.",
  inputSchema: readNoteSchema,
  async handler(args, cfg) {
    const { path: relPath } = readNoteSchema.parse(args);
    const note = await readNote(cfg, relPath);
    return {
      path: note.path,
      frontmatter: note.frontmatter,
      content: note.content,
      tags: note.tags,
    };
  },
};

// ---------- create_note ----------
const createNoteSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Vault-relative destination path. '.md' is appended if missing."),
  content: z.string().describe("Full note body. Prefix with YAML frontmatter if desired."),
  frontmatter: z
    .record(z.unknown())
    .optional()
    .describe("Optional YAML frontmatter object. Merged into content if provided."),
  overwrite: z.boolean().optional().default(false),
});

const createNoteTool: ToolDefinition = {
  name: "create_note",
  description:
    "Create a new note. Rejects existing files unless overwrite=true. If frontmatter is passed, it's serialized and prepended.",
  inputSchema: createNoteSchema,
  async handler(args, cfg) {
    const parsed = createNoteSchema.parse(args);
    const body =
      parsed.frontmatter && Object.keys(parsed.frontmatter).length > 0
        ? matter.stringify(parsed.content, parsed.frontmatter)
        : parsed.content;
    const written = await writeNote(cfg, parsed.path, body, parsed.overwrite);
    return { path: written, created: true };
  },
};

// ---------- update_note ----------
const updateNoteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  preserveFrontmatter: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "If true, keep the existing YAML frontmatter block and replace only the body below it.",
    ),
});

const updateNoteTool: ToolDefinition = {
  name: "update_note",
  description:
    "Replace a note's content. Pass preserveFrontmatter=true to keep existing YAML metadata intact.",
  inputSchema: updateNoteSchema,
  async handler(args, cfg) {
    const parsed = updateNoteSchema.parse(args);
    if (parsed.preserveFrontmatter) {
      const existing = await readNote(cfg, parsed.path);
      const merged = matter.stringify(parsed.content, existing.frontmatter);
      const written = await writeNote(cfg, parsed.path, merged, true);
      return { path: written, updated: true, preservedFrontmatter: true };
    }
    const written = await writeNote(cfg, parsed.path, parsed.content, true);
    return { path: written, updated: true };
  },
};

// ---------- append_to_note ----------
const appendNoteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  createIfMissing: z.boolean().optional().default(false),
});

const appendNoteTool: ToolDefinition = {
  name: "append_to_note",
  description:
    "Append content to an existing note. Ensures a newline between existing content and the appended block.",
  inputSchema: appendNoteSchema,
  async handler(args, cfg) {
    const parsed = appendNoteSchema.parse(args);
    const written = await appendNote(
      cfg,
      parsed.path,
      parsed.content,
      parsed.createIfMissing,
    );
    return { path: written, appended: true };
  },
};

// ---------- search_vault ----------
const searchVaultSchema = z.object({
  query: z.string().min(1),
  caseSensitive: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(500).optional().default(50),
  contextChars: z.number().int().min(0).max(1000).optional().default(80),
});

interface SearchHit {
  path: string;
  line: number;
  snippet: string;
}

const searchVaultTool: ToolDefinition = {
  name: "search_vault",
  description:
    "Full-text search across all markdown notes. Returns file paths, line numbers, and snippets.",
  inputSchema: searchVaultSchema,
  async handler(args, cfg) {
    const parsed = searchVaultSchema.parse(args);
    const files = await listMarkdownFiles(cfg);
    const needle = parsed.caseSensitive
      ? parsed.query
      : parsed.query.toLowerCase();

    const hits: SearchHit[] = [];
    for (const file of files) {
      if (hits.length >= parsed.limit) break;
      const content = await fs.readFile(
        path.join(cfg.vaultPath, file),
        "utf-8",
      );
      const haystack = parsed.caseSensitive ? content : content.toLowerCase();
      if (!haystack.includes(needle)) continue;

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (hits.length >= parsed.limit) break;
        const line = lines[i]!;
        const cmp = parsed.caseSensitive ? line : line.toLowerCase();
        const idx = cmp.indexOf(needle);
        if (idx === -1) continue;
        const start = Math.max(0, idx - parsed.contextChars);
        const end = Math.min(
          line.length,
          idx + parsed.query.length + parsed.contextChars,
        );
        hits.push({
          path: file,
          line: i + 1,
          snippet: line.slice(start, end).trim(),
        });
      }
    }
    return { query: parsed.query, count: hits.length, hits };
  },
};

// ---------- list_notes ----------
const listNotesSchema = z.object({
  folder: z
    .string()
    .optional()
    .describe("Vault-relative folder to scope the listing, e.g. '01-Projects'"),
  limit: z.number().int().min(1).max(2000).optional().default(200),
});

const listNotesTool: ToolDefinition = {
  name: "list_notes",
  description:
    "List markdown notes in the vault, optionally filtered to a folder. Excludes .obsidian, .trash, etc.",
  inputSchema: listNotesSchema,
  async handler(args, cfg) {
    const parsed = listNotesSchema.parse(args);
    const files = await listMarkdownFiles(cfg, parsed.folder);
    return {
      folder: parsed.folder ?? null,
      total: files.length,
      notes: files.slice(0, parsed.limit),
      truncated: files.length > parsed.limit,
    };
  },
};

// ---------- get_backlinks ----------
const getBacklinksSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Vault-relative target note. Backlinks are matched by basename."),
});

const getBacklinksTool: ToolDefinition = {
  name: "get_backlinks",
  description:
    "Find all notes in the vault that contain a [[wikilink]] pointing to the target note.",
  inputSchema: getBacklinksSchema,
  async handler(args, cfg) {
    const parsed = getBacklinksSchema.parse(args);
    const backlinks = await findBacklinks(cfg, parsed.path);
    return { target: parsed.path, count: backlinks.length, backlinks };
  },
};

// ---------- get_forward_links ----------
const getForwardLinksSchema = z.object({
  path: z.string().min(1),
});

const getForwardLinksTool: ToolDefinition = {
  name: "get_forward_links",
  description: "Extract all [[wikilinks]] from a note's content.",
  inputSchema: getForwardLinksSchema,
  async handler(args, cfg) {
    const parsed = getForwardLinksSchema.parse(args);
    const note = await readNote(cfg, parsed.path);
    const links = extractWikiLinks(note.content);
    return { path: note.path, count: links.length, links };
  },
};

// ---------- get_tags ----------
const getTagsSchema = z.object({
  folder: z.string().optional(),
});

const getTagsTool: ToolDefinition = {
  name: "get_tags",
  description:
    "List every tag in the vault with the count of notes using it. Includes both YAML and inline #tags.",
  inputSchema: getTagsSchema,
  async handler(args, cfg) {
    const parsed = getTagsSchema.parse(args);
    const files = await listMarkdownFiles(cfg, parsed.folder);
    const counts = new Map<string, number>();

    for (const file of files) {
      const note = await readNote(cfg, file).catch(() => null);
      if (!note) continue;
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));

    return { total: tags.length, tags };
  },
};

// ---------- get_frontmatter ----------
const getFrontmatterSchema = z.object({
  path: z.string().min(1),
});

const getFrontmatterTool: ToolDefinition = {
  name: "get_frontmatter",
  description: "Parse and return only the YAML frontmatter of a note.",
  inputSchema: getFrontmatterSchema,
  async handler(args, cfg) {
    const parsed = getFrontmatterSchema.parse(args);
    const note = await readNote(cfg, parsed.path);
    return { path: note.path, frontmatter: note.frontmatter };
  },
};

// ---------- move_note ----------
const moveNoteSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  overwrite: z.boolean().optional().default(false),
});

const moveNoteTool: ToolDefinition = {
  name: "move_note",
  description:
    "Move or rename a note. Creates intermediate folders as needed. Does not update backlinks.",
  inputSchema: moveNoteSchema,
  async handler(args, cfg) {
    const parsed = moveNoteSchema.parse(args);
    const result = await moveNote(cfg, parsed.from, parsed.to, parsed.overwrite);
    return { ...result, moved: true };
  },
};

// ---------- get_daily_note ----------
const getDailyNoteSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("ISO date (YYYY-MM-DD). Defaults to today."),
  create: z.boolean().optional().default(true),
  template: z
    .string()
    .optional()
    .describe("Initial content to write if the daily note is created."),
});

const getDailyNoteTool: ToolDefinition = {
  name: "get_daily_note",
  description:
    "Get today's (or a specific day's) daily note, creating it from an optional template if missing.",
  inputSchema: getDailyNoteSchema,
  async handler(args, cfg) {
    const parsed = getDailyNoteSchema.parse(args);
    const date = parsed.date ? new Date(`${parsed.date}T00:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${parsed.date}`);
    }

    const filename = formatDate(date, cfg.dailyFormat);
    const relPath = ensureMarkdownPath(
      path.join(cfg.dailyFolder, filename).split(path.sep).join("/"),
    );
    const full = resolveVaultPath(cfg, relPath);

    try {
      await fs.access(full);
      const note = await readNote(cfg, relPath);
      return {
        path: note.path,
        created: false,
        frontmatter: note.frontmatter,
        content: note.content,
      };
    } catch {
      if (!parsed.create) {
        throw new Error(`Daily note does not exist: ${relPath}`);
      }
      const body = parsed.template ?? defaultDailyTemplate(date);
      const written = await writeNote(cfg, relPath, body, false);
      return { path: written, created: true, content: body };
    }
  },
};

function defaultDailyTemplate(date: Date): string {
  const iso = formatDate(date, "YYYY-MM-DD");
  return matter.stringify(
    "\n## Notes\n\n## Ledger\n\n## Tomorrow\n",
    {
      title: iso,
      date: iso,
      type: "daily",
      tags: ["daily"],
    },
  );
}

// ---------- search_by_tag ----------
const searchByTagSchema = z.object({
  tag: z
    .string()
    .min(1)
    .describe("Tag name without leading '#'. Matches exact tag or any sub-tag."),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

const searchByTagTool: ToolDefinition = {
  name: "search_by_tag",
  description:
    "Find notes carrying a specific tag. Matches exact tag and hierarchical descendants (e.g. 'music' matches 'music/production').",
  inputSchema: searchByTagSchema,
  async handler(args, cfg) {
    const parsed = searchByTagSchema.parse(args);
    const needle = parsed.tag.replace(/^#/, "");
    const files = await listMarkdownFiles(cfg);
    const matches: { path: string; tags: string[] }[] = [];

    for (const file of files) {
      if (matches.length >= parsed.limit) break;
      const note = await readNote(cfg, file).catch(() => null);
      if (!note) continue;
      const hit = note.tags.some(
        (t) => t === needle || t.startsWith(`${needle}/`),
      );
      if (hit) matches.push({ path: note.path, tags: note.tags });
    }

    return { tag: needle, count: matches.length, matches };
  },
};

// ---------- get_vault_stats ----------
const getVaultStatsSchema = z.object({});

const getVaultStatsTool: ToolDefinition = {
  name: "get_vault_stats",
  description:
    "Summary of vault health: total notes, total unique tags, orphan count, and top folders.",
  inputSchema: getVaultStatsSchema,
  async handler(_args, cfg) {
    const files = await listMarkdownFiles(cfg);
    const tags = new Set<string>();
    const linkedTargets = new Set<string>();
    const notesByBasename = new Map<string, string>();
    const folderCounts = new Map<string, number>();

    for (const file of files) {
      const base = path.basename(file, ".md");
      notesByBasename.set(base, file);
      const top = file.split("/")[0] ?? "(root)";
      folderCounts.set(top, (folderCounts.get(top) ?? 0) + 1);

      const note = await readNote(cfg, file).catch(() => null);
      if (!note) continue;
      for (const tag of note.tags) tags.add(tag);
      for (const link of extractWikiLinks(note.content)) {
        linkedTargets.add(link);
      }
    }

    const orphans: string[] = [];
    for (const [base, rel] of notesByBasename) {
      if (!linkedTargets.has(base)) orphans.push(rel);
    }

    const topFolders = [...folderCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([folder, count]) => ({ folder, count }));

    return {
      totalNotes: files.length,
      totalTags: tags.size,
      orphanCount: orphans.length,
      orphans: orphans.slice(0, 25),
      topFolders,
    };
  },
};

// ---------- export ----------
export const tools: ToolDefinition[] = [
  readNoteTool,
  createNoteTool,
  updateNoteTool,
  appendNoteTool,
  searchVaultTool,
  listNotesTool,
  getBacklinksTool,
  getForwardLinksTool,
  getTagsTool,
  getFrontmatterTool,
  moveNoteTool,
  getDailyNoteTool,
  searchByTagTool,
  getVaultStatsTool,
];
