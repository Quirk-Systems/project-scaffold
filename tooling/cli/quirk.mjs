#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const REQUIRED_DIRECTORIES = [
  "apps",
  "packages",
  "registries",
  "rulesets",
  "runtimes",
  "schemas",
  "templates",
  "tooling",
  "docs",
  ".github/actions",
  ".github/workflows",
];
const DECLARATIVE_ROOTS = [
  "registries",
  "rulesets",
  "runtimes",
  "schemas",
  "templates",
];
const QUIRK_ID = /^quirk:\/\/[a-z0-9][a-z0-9/_-]*$/i;
const FULL_SHA_ACTION =
  /^\s*(?:-\s*)?uses:\s*[^./][^@]*@[0-9a-f]{40}(?:\s+#.*)?$/i;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`! ${message}`);
}

function walk(path, predicate = () => true) {
  if (!existsSync(path)) return [];
  const entries = [];
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === ".next")
        continue;
      entries.push(...walk(full, predicate));
    } else if (predicate(full)) {
      entries.push(full);
    }
  }
  return entries;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function declarativeFiles() {
  return DECLARATIVE_ROOTS.flatMap((directory) =>
    walk(resolve(ROOT, directory), (path) =>
      [".json", ".jsonld"].includes(extname(path)),
    ),
  );
}

function collectIds(value, source, ids, diagnostics) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectIds(item, source, ids, diagnostics));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "id" || key === "@id") &&
      typeof child === "string" &&
      child.startsWith("quirk:")
    ) {
      const normalized = child.startsWith("quirk://")
        ? child
        : child.replace(/^quirk:/, "quirk://ontology/");
      if (child.startsWith("quirk://") && !QUIRK_ID.test(child)) {
        diagnostics.push(`${source}: invalid Quirk identifier ${child}`);
      }
      if (key === "id" && ids.has(normalized)) {
        diagnostics.push(
          `${source}: duplicate identifier ${child}; first seen in ${ids.get(normalized)}`,
        );
      } else if (key === "id") {
        ids.set(normalized, source);
      }
    }
    collectIds(child, source, ids, diagnostics);
  }
}

function validateActions(diagnostics) {
  const workflowFiles = walk(resolve(ROOT, ".github/workflows"), (path) =>
    [".yml", ".yaml"].includes(extname(path)),
  );
  for (const path of workflowFiles) {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (
        !line.trim().startsWith("uses:") &&
        !line.trim().startsWith("- uses:")
      )
        return;
      if (line.includes("uses: ./")) return;
      if (!FULL_SHA_ACTION.test(line)) {
        diagnostics.push(
          `${relative(ROOT, path)}:${index + 1}: external action is not pinned to a 40-character commit SHA`,
        );
      }
    });
  }
}

function validateTerms(diagnostics) {
  const path = resolve(ROOT, "registries/semantics/terms.json");
  if (!existsSync(path)) return;
  const registry = readJson(path);
  const canonical = new Set();
  for (const term of registry.terms ?? []) {
    const key = String(term.term).toLowerCase();
    if (canonical.has(key))
      diagnostics.push(`Duplicate semantic term: ${term.term}`);
    canonical.add(key);
    if (term.status === "deprecated" && !term.replacement) {
      diagnostics.push(
        `Deprecated semantic term lacks replacement: ${term.term}`,
      );
    }
  }
}

function validate() {
  const diagnostics = [];
  const warnings = [];

  for (const directory of REQUIRED_DIRECTORIES) {
    if (!existsSync(resolve(ROOT, directory))) {
      diagnostics.push(`Missing required foundation directory: ${directory}`);
    }
  }

  const ids = new Map();
  for (const path of declarativeFiles()) {
    try {
      const value = readJson(path);
      collectIds(value, relative(ROOT, path), ids, diagnostics);
    } catch (error) {
      diagnostics.push(`${relative(ROOT, path)}: ${error.message}`);
    }
  }

  validateActions(diagnostics);
  validateTerms(diagnostics);

  const packageJson = readJson(resolve(ROOT, "package.json"));
  for (const command of ["quirk", "quirk:validate", "quirk:doctor"]) {
    if (!packageJson.scripts?.[command]) {
      diagnostics.push(`package.json is missing script: ${command}`);
    }
  }

  const deprecatedMatches = [];
  for (const path of [
    ...walk(resolve(ROOT, "registries"), (p) =>
      [".json", ".jsonld"].includes(extname(p)),
    ),
    ...walk(resolve(ROOT, "rulesets"), (p) => extname(p) === ".json"),
  ]) {
    const text = readFileSync(path, "utf8");
    if (/"artifact"\s*:/i.test(text)) {
      deprecatedMatches.push(relative(ROOT, path));
    }
  }
  if (deprecatedMatches.length > 0) {
    warnings.push(
      `Potential deprecated semantic key “artifact” in: ${deprecatedMatches.join(", ")}`,
    );
  }

  if (diagnostics.length > 0) {
    diagnostics.forEach(fail);
  } else {
    pass(`${declarativeFiles().length} declarative foundation files parsed`);
    pass(`${ids.size} canonical identifiers inspected`);
    pass("external GitHub Actions are SHA-pinned");
    pass("semantic registry checks passed");
  }
  warnings.forEach(warn);
  if (diagnostics.length === 0) {
    console.log("\nQuirk foundation is structurally valid.");
  }
}

function doctor() {
  console.log("Quirk Repository Doctor\n");
  console.log(`Root: ${ROOT}`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  for (const directory of REQUIRED_DIRECTORIES) {
    console.log(
      `${existsSync(resolve(ROOT, directory)) ? "✓" : "✗"} ${directory}`,
    );
  }
  console.log(`\nDeclarative files: ${declarativeFiles().length}`);
}

function graph(outputPath) {
  const ontologyPath = resolve(ROOT, "registries/ontology/quirk-core.jsonld");
  const ontology = readJson(ontologyPath);
  const graph = ontology["@graph"] ?? [];
  const nodes = graph.filter((item) => item["@type"] === "quirk:System");
  const relations = [
    "dependsOn",
    "produces",
    "consumes",
    "governs",
    "evaluates",
    "projectsTo",
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
  let fileClass = "unknown";
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
  fileClass = extensionMap[extension] ?? "unknown";

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
    fail(`Path does not exist: ${target}`);
    return;
  }
  const paths = statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  const records = paths.map((path) => classifyOne(relative(ROOT, path)));
  console.log(
    JSON.stringify({ root: target, count: records.length, records }, null, 2),
  );
}

function runtimeList() {
  const directory = resolve(ROOT, "runtimes/profiles");
  const profiles = walk(directory, (path) => extname(path) === ".json")
    .map(readJson)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const profile of profiles) {
    console.log(
      `${profile.id}\t${profile.kind}\t${profile.status}\t${profile.name}`,
    );
  }
}

function semanticsInspect(term) {
  if (!term) {
    fail("Provide a term to inspect.");
    return;
  }
  const registry = readJson(resolve(ROOT, "registries/semantics/terms.json"));
  const normalized = term
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const matched = (registry.terms ?? []).find((item) => {
    const values = [item.term, item.slug, ...(item.aliases ?? [])];
    return values.some(
      (value) =>
        String(value)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") === normalized,
    );
  });
  console.log(
    JSON.stringify(
      matched ?? {
        term,
        status: "unknown",
        message: "No canonical semantic term registered.",
      },
      null,
      2,
    ),
  );
}

function initSystem(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    fail("System slug must use lowercase letters, numbers, and hyphens.");
    return;
  }
  const directory = resolve(ROOT, "systems", slug);
  if (existsSync(directory)) {
    fail(`System already exists: systems/${slug}`);
    return;
  }
  mkdirSync(directory, { recursive: true });
  const charter = {
    id: `quirk://systems/${slug}`,
    name: slug
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" "),
    version: "0.1.0",
    status: "proposed",
    owner: "bryansayler",
    foundingProblem: "",
    foundingClaim: "",
    jurisdiction: { governs: [], doesNotGovern: [] },
    principles: [],
    humanRights: [
      "inspect",
      "correct",
      "override",
      "revoke",
      "forget",
      "appeal",
    ],
    relationships: { upstream: [], downstream: [], peers: [], external: [] },
    successConditions: [],
    dissolutionConditions: [],
  };
  writeFileSync(
    join(directory, "charter.json"),
    `${JSON.stringify(charter, null, 2)}\n`,
  );
  writeFileSync(
    join(directory, "README.md"),
    `# ${charter.name}\n\nStatus: proposed\n\nComplete the charter before implementation.\n`,
  );
  pass(`Created systems/${slug}`);
}

function help() {
  console.log(`Quirk CLI

Commands:
  doctor                         inspect repository foundation
  validate                       validate JSON/JSON-LD, identifiers, semantics, and Action pins
  graph [--out <path>]            emit a Mermaid ontology graph
  classify [path]                 dry-run advanced file classification
  runtime list                    list runtime profiles
  semantics inspect <term>        resolve a Quirk semantic term
  rules check                     validate all rulesets and foundation files
  init system <slug>              create a proposed system charter
`);
}

const [command = "help", ...args] = process.argv.slice(2);

switch (command) {
  case "doctor":
    doctor();
    break;
  case "validate":
    validate();
    break;
  case "graph": {
    const outIndex = args.indexOf("--out");
    graph(outIndex >= 0 ? args[outIndex + 1] : undefined);
    break;
  }
  case "classify":
    classify(args[0] ?? ".");
    break;
  case "runtime":
    if (args[0] === "list") runtimeList();
    else help();
    break;
  case "semantics":
    if (args[0] === "inspect") semanticsInspect(args.slice(1).join(" "));
    else help();
    break;
  case "rules":
    if (args[0] === "check") validate();
    else help();
    break;
  case "init":
    if (args[0] === "system") initSystem(args[1]);
    else help();
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    fail(`Unknown command: ${command}`);
    help();
}
