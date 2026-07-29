export type SemanticTermStatus =
  | "canonical"
  | "alias"
  | "deprecated"
  | "experimental";

export interface SemanticTerm {
  term: string;
  slug: string;
  definition: string;
  status: SemanticTermStatus;
  aliases?: string[];
  replacement?: string;
  domains: string[];
}

export interface SemanticDiagnostic {
  value: string;
  canonical: string | null;
  status: SemanticTermStatus | "unknown";
  message: string;
}

export function normalizeSemanticValue(value: string): string {
  return value
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createTermIndex(
  terms: SemanticTerm[],
): Map<string, SemanticTerm> {
  const index = new Map<string, SemanticTerm>();
  for (const term of terms) {
    index.set(normalizeSemanticValue(term.term), term);
    index.set(normalizeSemanticValue(term.slug), term);
    for (const alias of term.aliases ?? []) {
      index.set(normalizeSemanticValue(alias), term);
    }
  }
  return index;
}

export function inspectSemanticValue(
  value: string,
  terms: SemanticTerm[],
): SemanticDiagnostic {
  const matched = createTermIndex(terms).get(normalizeSemanticValue(value));
  if (!matched) {
    return {
      value,
      canonical: null,
      status: "unknown",
      message: "No canonical Quirk semantic term is registered.",
    };
  }
  if (matched.status === "deprecated") {
    return {
      value,
      canonical: matched.replacement ?? matched.term,
      status: "deprecated",
      message: matched.replacement
        ? `Use “${matched.replacement}” instead.`
        : "This term is deprecated without a replacement.",
    };
  }
  return {
    value,
    canonical: matched.term,
    status: matched.status,
    message:
      normalizeSemanticValue(value) === normalizeSemanticValue(matched.term)
        ? "Canonical term."
        : `Alias resolves to “${matched.term}”.`,
  };
}
