export type RuleEffect = "allow" | "deny" | "require" | "warn";

export interface QuirkRule {
  id: `quirk://rules/${string}`;
  description: string;
  effect: RuleEffect;
  target: string;
  condition: {
    field: string;
    operator: "equals" | "not_equals" | "includes" | "exists";
    value?: unknown;
  };
  message: string;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  effect: RuleEffect;
  message: string;
}

function readPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (
      current !== null &&
      typeof current === "object" &&
      segment in current
    ) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, input);
}

export function evaluateRule(rule: QuirkRule, input: unknown): RuleResult {
  const actual = readPath(input, rule.condition.field);
  let conditionMatches = false;

  switch (rule.condition.operator) {
    case "equals":
      conditionMatches = actual === rule.condition.value;
      break;
    case "not_equals":
      conditionMatches = actual !== rule.condition.value;
      break;
    case "includes":
      conditionMatches =
        Array.isArray(actual) && actual.includes(rule.condition.value);
      break;
    case "exists":
      conditionMatches = actual !== undefined;
      break;
  }

  const passed =
    rule.effect === "deny" ? !conditionMatches : conditionMatches;

  return {
    ruleId: rule.id,
    passed,
    effect: rule.effect,
    message: rule.message,
  };
}
