import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OPENAI_KEY_LITERAL_PATTERN = /\bsk-[a-zA-Z0-9_-]{20,}\b/;
const FORBIDDEN_PUBLIC_OPENAI_ENV_PATTERN = /\bNEXT_PUBLIC_OPENAI_API_KEY\b/;
const WORKFLOW_OPENAI_ENV_ASSIGNMENT_PATTERN =
  /^\s*OPENAI_API_KEY\s*:\s*(.+?)\s*$/;
const WORKFLOW_ALLOWED_OPENAI_SECRET_BINDING_PATTERN =
  /^\$\{\{\s*secrets\.OPENAI_API_KEY\s*\}\}$/;
const WORKFLOW_SECRET_LOG_PATTERN = /\b(?:echo|printf)\b[^\n]*OPENAI_API_KEY/i;

function scanTextForOpenAiSecretLeak(text: string): string[] {
  const violations: string[] = [];
  if (FORBIDDEN_PUBLIC_OPENAI_ENV_PATTERN.test(text)) {
    violations.push("forbidden public OpenAI env reference");
  }
  if (OPENAI_KEY_LITERAL_PATTERN.test(text)) {
    violations.push("OpenAI-style key literal");
  }
  return violations;
}

function scanWorkflowLineForOpenAiLeak(line: string): string[] {
  const violations: string[] = [];
  if (WORKFLOW_SECRET_LOG_PATTERN.test(line)) {
    violations.push("workflow logs OpenAI key");
  }

  const match = line.match(WORKFLOW_OPENAI_ENV_ASSIGNMENT_PATTERN);
  if (match) {
    const value = match[1]?.trim() ?? "";
    if (!WORKFLOW_ALLOWED_OPENAI_SECRET_BINDING_PATTERN.test(value)) {
      violations.push(
        "workflow OpenAI key binding must use secrets.OPENAI_API_KEY",
      );
    }
  }
  return violations;
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function gitSucceeds(args: string[]): boolean {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkEnvLocalIsIgnoredAndUntracked(violations: string[]): void {
  if (!gitSucceeds(["check-ignore", "-q", "--no-index", ".env.local"])) {
    violations.push(".env.local must be gitignored");
  }

  if (gitSucceeds(["ls-files", "--error-unmatch", ".env.local"])) {
    violations.push(".env.local must not be tracked");
  }
}

function collectTrackedFiles(): string[] {
  const output = runGit(["ls-files"]);
  return output.split("\n").filter(Boolean);
}

function checkTrackedFilesForOpenAiLeaks(
  files: string[],
  violations: string[],
): void {
  const excludedFiles = new Set([
    "scripts/check-openai-secret-hygiene.ts",
    "src/lib/security/openai-secret-hygiene.ts",
    "src/lib/security/openai-secret-hygiene.test.ts",
  ]);

  for (const file of files) {
    if (excludedFiles.has(file)) continue;

    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (content.includes("\u0000")) continue;

    const leakViolations = scanTextForOpenAiSecretLeak(content);
    for (const violation of leakViolations) {
      violations.push(`${file}: ${violation}`);
    }
  }
}

function checkWorkflowsForUnsafeBindings(violations: string[]): void {
  const workflowsDir = ".github/workflows";
  if (!existsSync(workflowsDir)) return;

  for (const entry of readdirSync(workflowsDir, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      (!entry.name.endsWith(".yml") && !entry.name.endsWith(".yaml"))
    ) {
      continue;
    }
    const file = join(workflowsDir, entry.name);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const lineViolations = scanWorkflowLineForOpenAiLeak(line);
      for (const violation of lineViolations) {
        violations.push(`${file}:${index + 1}: ${violation}`);
      }
    });
  }
}

function main(): void {
  const violations: string[] = [];
  checkEnvLocalIsIgnoredAndUntracked(violations);
  checkTrackedFilesForOpenAiLeaks(collectTrackedFiles(), violations);
  checkWorkflowsForUnsafeBindings(violations);

  if (violations.length === 0) {
    console.log("OpenAI secret hygiene checks passed.");
    return;
  }

  console.error("OpenAI secret hygiene checks failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

main();
