export const OPENAI_KEY_LITERAL_PATTERN = /\bsk-[a-zA-Z0-9_-]{20,}\b/;
export const FORBIDDEN_PUBLIC_OPENAI_ENV_PATTERN =
  /\bNEXT_PUBLIC_OPENAI_API_KEY\b/;
const WORKFLOW_OPENAI_ENV_ASSIGNMENT_PATTERN =
  /^\s*OPENAI_API_KEY\s*:\s*(.+?)\s*$/;
const WORKFLOW_ALLOWED_OPENAI_SECRET_BINDING_PATTERN =
  /^\$\{\{\s*secrets\.OPENAI_API_KEY\s*\}\}$/;
const WORKFLOW_SECRET_LOG_PATTERN = /\b(?:echo|printf)\b[^\n]*OPENAI_API_KEY/i;

export function scanTextForOpenAiSecretLeak(text: string): string[] {
  const violations: string[] = [];
  if (FORBIDDEN_PUBLIC_OPENAI_ENV_PATTERN.test(text)) {
    violations.push("forbidden public OpenAI env reference");
  }
  if (OPENAI_KEY_LITERAL_PATTERN.test(text)) {
    violations.push("OpenAI-style key literal");
  }
  return violations;
}

export function scanWorkflowLineForOpenAiLeak(line: string): string[] {
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
