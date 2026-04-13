import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import matter from "gray-matter";
import type { QuirkConfig } from "./config.js";

export interface ParsedNote {
  path: string;
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
  tags: string[];
}

/**
 * Resolve a user-supplied relative path against the vault root,
 * rejecting anything that escapes the vault or touches excluded dirs.
 */
export function resolveVaultPath(cfg: QuirkConfig, relPath: string): string {
  if (!relPath || typeof relPath !== "string") {
    throw new Error("Note path is required.");
  }
  const cleaned = relPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const full = path.resolve(cfg.vaultPath, cleaned);
  const rel = path.relative(cfg.vaultPath, full);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes the vault: ${relPath}`);
  }

  const head = rel.split(path.sep)[0] ?? "";
  if (cfg.excludedDirs.includes(head)) {
    throw new Error(`Path is inside an excluded directory: ${head}`);
  }

  return full;
}

export function toVaultRelative(cfg: QuirkConfig, absPath: string): string {
  return path.relative(cfg.vaultPath, absPath).split(path.sep).join("/");
}

export function ensureMarkdownPath(relPath: string): string {
  return relPath.endsWith(".md") ? relPath : `${relPath}.md`;
}

export function requireWrite(cfg: QuirkConfig): void {
  if (cfg.readOnly) {
    throw new Error(
      "Quirk MCP server is running in read-only mode (QUIRK_READ_ONLY=true).",
    );
  }
}

export async function listMarkdownFiles(
  cfg: QuirkConfig,
  subfolder?: string,
): Promise<string[]> {
  const base = subfolder ? resolveVaultPath(cfg, subfolder) : cfg.vaultPath;
  const pattern = path.join(base, "**/*.md").split(path.sep).join("/");

  const ignore = cfg.excludedDirs.map(
    (d) => `${cfg.vaultPath}/${d}/**`.split(path.sep).join("/"),
  );

  const files = await glob(pattern, { ignore, nodir: true });
  return files
    .map((f) => toVaultRelative(cfg, f))
    .sort((a, b) => a.localeCompare(b));
}

export async function readNote(
  cfg: QuirkConfig,
  relPath: string,
): Promise<ParsedNote> {
  const full = resolveVaultPath(cfg, ensureMarkdownPath(relPath));
  const stat = await fs.stat(full);
  if (stat.size > cfg.maxFileBytes) {
    throw new Error(
      `Note exceeds max readable size (${stat.size} > ${cfg.maxFileBytes} bytes). ` +
        `Raise QUIRK_MAX_FILE_BYTES to override.`,
    );
  }
  const raw = await fs.readFile(full, "utf-8");
  return parseNote(toVaultRelative(cfg, full), raw);
}

export function parseNote(relPath: string, raw: string): ParsedNote {
  const parsed = matter(raw);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  const content = parsed.content;
  const tags = extractTags(frontmatter, content);
  return { path: relPath, frontmatter, content, raw, tags };
}

export function extractTags(
  frontmatter: Record<string, unknown>,
  content: string,
): string[] {
  const fmTagsRaw = frontmatter.tags;
  const fmTags: string[] = Array.isArray(fmTagsRaw)
    ? fmTagsRaw.map(String)
    : typeof fmTagsRaw === "string"
      ? fmTagsRaw.split(/[,\s]+/).filter(Boolean)
      : [];

  // Inline #tags, but skip code blocks to avoid matching markdown headers / code.
  const withoutCode = content.replace(/```[\s\S]*?```/g, "");
  const inline = [...withoutCode.matchAll(/(?<![\w`])#([a-zA-Z][\w/-]*)/g)].map(
    (m) => m[1]!,
  );

  return [...new Set([...fmTags, ...inline])];
}

export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]!.trim());
  }
  return [...new Set(links)];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function writeNote(
  cfg: QuirkConfig,
  relPath: string,
  content: string,
  overwrite: boolean,
): Promise<string> {
  requireWrite(cfg);
  const withExt = ensureMarkdownPath(relPath);
  const full = resolveVaultPath(cfg, withExt);

  const exists = await fileExists(full);
  if (exists && !overwrite) {
    throw new Error(
      `Note already exists: ${withExt}. Pass overwrite=true to replace.`,
    );
  }

  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf-8");
  return toVaultRelative(cfg, full);
}

export async function appendNote(
  cfg: QuirkConfig,
  relPath: string,
  content: string,
  createIfMissing: boolean,
): Promise<string> {
  requireWrite(cfg);
  const withExt = ensureMarkdownPath(relPath);
  const full = resolveVaultPath(cfg, withExt);

  const exists = await fileExists(full);
  if (!exists) {
    if (!createIfMissing) {
      throw new Error(`Note does not exist: ${withExt}`);
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf-8");
    return toVaultRelative(cfg, full);
  }

  const existing = await fs.readFile(full, "utf-8");
  const joined =
    existing.endsWith("\n") || existing.length === 0
      ? existing + content
      : `${existing}\n${content}`;
  await fs.writeFile(full, joined, "utf-8");
  return toVaultRelative(cfg, full);
}

export async function moveNote(
  cfg: QuirkConfig,
  from: string,
  to: string,
  overwrite: boolean,
): Promise<{ from: string; to: string }> {
  requireWrite(cfg);
  const src = resolveVaultPath(cfg, ensureMarkdownPath(from));
  const dst = resolveVaultPath(cfg, ensureMarkdownPath(to));

  if (!(await fileExists(src))) {
    throw new Error(`Source note does not exist: ${from}`);
  }
  if ((await fileExists(dst)) && !overwrite) {
    throw new Error(
      `Destination note already exists: ${to}. Pass overwrite=true to replace.`,
    );
  }

  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.rename(src, dst);
  return { from: toVaultRelative(cfg, src), to: toVaultRelative(cfg, dst) };
}

export async function findBacklinks(
  cfg: QuirkConfig,
  target: string,
): Promise<string[]> {
  const withExt = ensureMarkdownPath(target);
  const targetName = path.basename(withExt, ".md");
  const targetRel = toVaultRelative(cfg, resolveVaultPath(cfg, withExt));

  const pattern = new RegExp(
    `\\[\\[${escapeRegex(targetName)}(?:#[^\\]|]*)?(?:\\|[^\\]]*)?\\]\\]`,
  );

  const allFiles = await listMarkdownFiles(cfg);
  const backlinks: string[] = [];

  for (const file of allFiles) {
    if (file === targetRel) continue;
    const full = path.join(cfg.vaultPath, file);
    const content = await fs.readFile(full, "utf-8");
    if (pattern.test(content)) backlinks.push(file);
  }
  return backlinks;
}

async function fileExists(full: string): Promise<boolean> {
  try {
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
}
