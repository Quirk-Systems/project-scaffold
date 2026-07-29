export type FileClass =
  | "code"
  | "test"
  | "configuration"
  | "schema"
  | "registry"
  | "documentation"
  | "prompt"
  | "asset"
  | "generated"
  | "secret-risk"
  | "unknown";

export type FileRisk = "low" | "medium" | "high" | "critical";

export interface FileRecord {
  path: string;
  extension: string;
  fileClass: FileClass;
  risk: FileRisk;
  canonicalArea: string;
  retention: "transient" | "project" | "canonical" | "generated";
  reasons: string[];
}

const EXTENSION_CLASSES: Record<string, FileClass> = {
  ".ts": "code",
  ".tsx": "code",
  ".js": "code",
  ".mjs": "code",
  ".cjs": "code",
  ".py": "code",
  ".php": "code",
  ".sql": "code",
  ".json": "configuration",
  ".jsonld": "registry",
  ".yaml": "configuration",
  ".yml": "configuration",
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

export function classifyFile(path: string): FileRecord {
  const normalized = path.replaceAll("\\", "/");
  const lower = normalized.toLowerCase();
  const extensionMatch = lower.match(/(\.[a-z0-9]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  const reasons: string[] = [];
  let fileClass = EXTENSION_CLASSES[extension] ?? "unknown";
  let risk: FileRisk = "low";
  let canonicalArea = "unclassified";
  let retention: FileRecord["retention"] = "project";

  if (/(\.test|\.spec)\.[^.]+$/.test(lower) || lower.includes("/tests/")) {
    fileClass = "test";
    canonicalArea = "tests";
    reasons.push("Test naming or test directory.");
  } else if (lower.includes("/schemas/") || lower.endsWith(".schema.json")) {
    fileClass = "schema";
    canonicalArea = "schemas";
    retention = "canonical";
    reasons.push("Schema path or suffix.");
  } else if (lower.includes("/registries/")) {
    fileClass = "registry";
    canonicalArea = "registries";
    retention = "canonical";
    reasons.push("Registry path.");
  } else if (lower.includes("/prompts/") || lower.endsWith(".prompt.md")) {
    fileClass = "prompt";
    canonicalArea = "prompts";
    retention = "canonical";
    reasons.push("Prompt registry path.");
  } else if (lower.includes("/docs/") || fileClass === "documentation") {
    canonicalArea = "docs";
  } else if (lower.includes("/generated/") || lower.includes("/dist/")) {
    fileClass = "generated";
    canonicalArea = "generated";
    retention = "generated";
    reasons.push("Generated output path.");
  } else if (lower.includes("/packages/")) {
    canonicalArea = "packages";
  } else if (lower.includes("/apps/") || lower.includes("/src/app/")) {
    canonicalArea = "apps";
  }

  if (
    /(^|\/)\.env($|\.)/.test(lower) ||
    lower.includes("private-key") ||
    lower.endsWith(".pem") ||
    lower.endsWith(".p12") ||
    lower.endsWith(".key")
  ) {
    fileClass = "secret-risk";
    risk = "critical";
    canonicalArea = "quarantine";
    retention = "transient";
    reasons.push("Credential-bearing filename pattern.");
  } else if (lower.includes("customer") || lower.includes("personal-data")) {
    risk = "high";
    reasons.push("Potential personal or customer data.");
  } else if (fileClass === "configuration" || fileClass === "registry") {
    risk = "medium";
  }

  if (reasons.length === 0) {
    reasons.push(`Classified from extension “${extension || "none"}”.`);
  }

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
