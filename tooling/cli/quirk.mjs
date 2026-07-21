#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const command = args.shift() ?? "help";

const REQUIRED_SURFACES = [
  "apps",
  "packages",
  "registries",
  "rulesets",
  "runtimes",
  "schemas",
  "templates",
  "tooling",
  "docs/architecture",
  "docs/operations",
  "docs/semantics",
  ".github/actions/quirk-validate",
  ".github/rulesets",
];

const DECLARATIVE_ROOTS = [
  "registries",
  "rulesets",
  "runtimes/profiles",
  "schemas",
  "templates",
  ".github/rulesets",
];

const IDENTIFIER_PATTERN = /^quirk:\/\/[a-z0-9][a-z0-9/_-]*$/;

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`! ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function walk(path, predicate = () => true) {
  if (!existsSync(path)) return [];
  const output = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (predicate(fullPath)) output.push(fullPath);
    }
  };
  visit(path);
  return output;
}

function parseJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${relative(ROOT, path)}: ${error.message}`);
    return null;
  }
}

function collectIds(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      (key === "id" || key.endsWith("_id") || key === "@id") &&
      child.startsWith("quirk://")
    ) {
      output.push(child);
    }
    collectIds(child, output);
  }
  return output;
}

function printHelp() {
  console.log(`Quirk CLI

Usage:
  quirk doctor
  quirk validate
  quirk graph [output.mmd]
  quirk classify [path]
  quirk runtime list
  quirk semantics inspect <term>
  quirk rules check
  quirk init system <name>
`);
}

function doctor() {
  console.log("Quirk foundation doctor\n");
  for (const surface of REQUIRED_SURFACES) {
    const path = resolve(ROOT, surface);
    if (existsSync(path)) pass(surface);
    else fail(`missing ${surface}`);
  }

  const packageJson = parseJson(resolve(ROOT, "package.json"));
  if (packageJson?.scripts?.["quirk:validate"]) pass("quirk scripts registered");
  else fail("package.json is missing quirk:validate");

  const ruleset = parseJson(resolve(ROOT, ".github/rulesets/main.json"));
  if (ruleset?.enforcement === "active") pass("main ruleset desired state is active");
  else warn("main ruleset desired state is not active");
}

function validate() {
  const files = DECLARATIVE_ROOTS.flatMap((root) =>
    walk(resolve(ROOT, root), (path) => path.endsWith(".json")),
  );
  const identifiers = [];
  const parsed = new Map();

  for (const file of files) {
    const value = parseJson(file);
    if (value) {
      parsed.set(file, value);
      identifiers.push(...collectIds(value));
    }
  }

  pass(`${parsed.size} declarative files parsed`);

  const invalidIds = [...new Set(identifiers)].filter(
    (id) => !IDENTIFIER_PATTERN.test(id),
  );
  if (invalidIds.length > 0) {
    for (const id of invalidIds) fail(`invalid canonical identifier: ${id}`);
  } else {
    pass(`${new Set(identifiers).size} canonical identifiers inspected`);
  }

  validateSemantics(parsed);
  validateActionPins();
  validateRequiredSurfaces();

  if (!process.exitCode) pass("foundation validation complete");
}

function validateSemantics(parsed) {
  const semanticsPath = resolve(ROOT, "registries/semantics/terms.json");
  const semantics = parsed.get(semanticsPath) ?? parseJson(semanticsPath);
  if (!semantics) return;

  const names = new Set();
  for (const term of semantics.terms ?? []) {
    const key = String(term.term).toLowerCase();
    if (names.has(key)) fail(`duplicate semantic term: ${term.term}`);
    names.add(key);
    if (term.status === "deprecated" && !term.replacement) {
      fail(`deprecated term requires replacement: ${term.term}`);
    }
  }
  pass(`${names.size} semantic terms inspected`);
}

function validateActionPins() {
  const workflowFiles = walk(resolve(ROOT, ".github/workflows"), (path) =>
    /\.ya?ml$/.test(path),
  );
  const unpinned = [];
  const usesPattern = /^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm;

  for (const file of workflowFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(usesPattern)) {
      const action = match[1];
      if (action.startsWith("./") || action.startsWith("docker://")) continue;
      const separator = action.lastIndexOf("@");
      const ref = separator >= 0 ? action.slice(separator + 1) : "";
      if (!/^[a-f0-9]{40}$/.test(ref)) {
        unpinned.push(`${relative(ROOT, file)} -> ${action}`);
      }
    }
  }

  if (unpinned.length > 0) {
    for (const item of unpinned) fail(`unpinned GitHub Action: ${item}`);
  } else {
    pass("external GitHub Actions use immutable SHA pins");
  }
}

function validateRequiredSurfaces() {
  for (const surface of REQUIRED_SURFACES) {
    if (!existsSync(resolve(ROOT, surface))) fail(`missing surface: ${surface}`);
  }
}

function graph(outputPath) {
  const ontology = parseJson(resolve(ROOT, "registries/ontology/quirk-core.jsonld"));
  if (!ontology) return;

  const nodes = ontology["@graph"] ?? [];
  const relations = [
    "quirk:dependsOn",
    "quirk:produces",
    "quirk:consumes",
    "quirk:governs",
    "quirk:projectsTo",
    "quirk:implements",
    "quirk:integratesWith",
  ];
  const lines = ["flowchart LR"];
  const nodeIds = new Map();

  for (const node of nodes) {
    const nodeId = String(node["@id"]).replace(/[^a-z0-9]/gi, "_");
    nodeIds.set(node["@id"], nodeId);
    lines.push(`  ${nodeId}["${node.name ?? node["@id"]}"]`);
  }

  for (const node of nodes) {
    for (const relation of relations) {
      const targets = node[relation] ? [node[relation]].flat() : [];
      for (const target of targets) {
        const sourceId = nodeIds.get(node["@id"]);
        const targetId =
          nodeIds.get(target) ?? String(target).replace(/[^a-z0-9]/gi, "_");
        if (!nodeIds.has(target)) {
          lines.push(`  ${targetId}["${target}"]`);
        }
        lines.push(`  ${sourceId} -->|${relation}| ${targetId}`);
      }
    }
  }

  const rendered = `${lines.join("\n")}\n`;
  if (outputPath) {
    writeFileSync(resolve(ROOT, outputPath), rendered);
    pass(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(rendered);
  }
}

function classifyOne(path) {
  const normalized = path.replaceAll("\\", "/");
  const lower = normalized.toLowerCase();
  const extension = extname(lower);
  let risk = "low";
  let canonicalArea = "unclassified";
  let retention = "project";
  const reasons = [];

  const extensionMap = {
    ".ts": "code",
    ".tsx": "code",
    ".js": "code",
    ".mjs": "code",
    ".py": "code",
    ".php": "code",
    ".sql": "code",
    ".json": "configuration",
    ".jsonld": "registry",
    ".yml": "configuration",
    ".yaml": "configuration",
    ".toml": "configuration",
    ".md": "documentation",
    ".mdx": "documentation",
    ".png": "asset",
    ".jpg": "asset",
    ".jpeg": "asset",
    ".webp": "asset",
    ".svg": "asset",
    ".mp3": "asset",
    ".wav": "asset",
    ".mp4": "asset",
  };
  let fileClass = extensionMap[extension] ?? "unknown";

  if (/(\.test|\.spec)\.[^.]+$/.test(lower) || lower.includes("/tests/")) {
    fileClass = "test";
    canonicalArea = "tests";
    reasons.push("test naming");
  } else if (lower.includes("/schemas/") || lower.endsWith(".schema.json")) {
    fileClass = "schema";
    canonicalArea = "schemas";
    retention = "canonical";
    reasons.push("schema path");
  } else if (lower.includes("/registries/")) {
    fileClass = "registry";
    canonicalArea = "registries";
    retention = "canonical";
    reasons.push("registry path");
  } else if (lower.includes("/docs/") || fileClass === "documentation") {
    canonicalArea = "docs";
  } else if (lower.includes("/packages/")) {
    canonicalArea = "packages";
  } else if (lower.includes("/apps/") || lower.includes("/src/app/")) {
    canonicalArea = "apps";
  }

  if (/(^|\/)\.env($|\.)/.test(lower) || /\.(pem|p12|key)$/.test(lower)) {
    fileClass = "secret-risk";
    risk = "critical";
    canonicalArea = "quarantine";
    retention = "transient";
    reasons.push("credential pattern");
  } else if (fileClass === "configuration" || fileClass === "registry") {
    risk = "medium";
  }

  if (reasons.length === 0) reasons.push(`extension ${extension || "none"}`);
  return {
    path: normalized,
    extension,
    fileClass,
    risk,
    canonicalArea,
    retention,
    reasons,
  };
}

function classify(target = ".") {
  const absolute = resolve(ROOT, target);
  if (!existsSync(absolute)) {
    fail(`path not found: ${target}`);
    return;
  }

  const files = statSync(absolute).isDirectory()
    ? walk(absolute, (path) => !path.includes("/node_modules/") && !path.includes("/.git/"))
    : [absolute];

  const output = files.map((file) => classifyOne(relative(ROOT, file)));
  console.log(JSON.stringify(output, null, 2));
}

function runtime(subcommand) {
  if (subcommand !== "list") {
    fail("usage: quirk runtime list");
    return;
  }

  const registry = parseJson(resolve(ROOT, "registries/runtimes/index.json"));
  for (const profile of registry?.profiles ?? []) {
    console.log(`${profile.id}\t${profile.name}\t${profile.path}`);
  }
}

function semantics(subcommand, term) {
  if (subcommand !== "inspect" || !term) {
    fail("usage: quirk semantics inspect <term>");
    return;
  }

  const registry = parseJson(resolve(ROOT, "registries/semantics/terms.json"));
  const normalized = term.toLowerCase();
  const found = (registry?.terms ?? []).find(
    (item) =>
      item.term.toLowerCase() === normalized ||
      (item.aliases ?? []).some((alias) => alias.toLowerCase() === normalized),
  );

  if (!found) {
    fail(`unknown term: ${term}`);
    return;
  }
  console.log(JSON.stringify(found, null, 2));
}

function rules(subcommand) {
  if (subcommand !== "check") {
    fail("usage: quirk rules check");
    return;
  }

  const files = walk(resolve(ROOT, "rulesets"), (path) => path.endsWith(".json"));
  for (const file of files) {
    const ruleset = parseJson(file);
    if (!ruleset) continue;
    if (!ruleset.owner) fail(`${relative(ROOT, file)} has no owner`);
    if (!Array.isArray(ruleset.rules) || ruleset.rules.length === 0) {
      fail(`${relative(ROOT, file)} has no rules`);
    } else {
      pass(`${relative(ROOT, file)} (${ruleset.rules.length} rules)`);
    }
  }
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function initSystem(name) {
  if (!name) {
    fail("usage: quirk init system <name>");
    return;
  }

  const slug = slugify(name);
  const destination = resolve(ROOT, "systems", slug);
  if (existsSync(destination)) {
    fail(`system already exists: systems/${slug}`);
    return;
  }

  mkdirSync(destination, { recursive: true });
  cpSync(resolve(ROOT, "templates/system/charter.json"), join(destination, "charter.json"));
  cpSync(
    resolve(ROOT, "templates/capability/manifest.json"),
    join(destination, "capability.json"),
  );
  writeFileSync(
    join(destination, "README.md"),
    `# ${name}\n\nGenerated by Quirk CLI. Replace template values before promotion.\n`,
  );
  pass(`Created systems/${slug}`);
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "validate":
    validate();
    break;
  case "graph":
    graph(args[0]);
    break;
  case "classify":
    classify(args[0] ?? ".");
    break;
  case "runtime":
    runtime(args[0]);
    break;
  case "semantics":
    semantics(args[0], args[1]);
    break;
  case "rules":
    rules(args[0]);
    break;
  case "init":
    if (args[0] !== "system") fail("usage: quirk init system <name>");
    else initSystem(args.slice(1).join(" "));
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    fail(`unknown command: ${command}`);
    printHelp();
}
