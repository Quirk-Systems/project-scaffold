const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "this",
  "that",
  "with",
  "as",
  "at",
  "by",
  "from",
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "my",
  "your",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(
    (w) => w.length > 1,
  );
}

export function contentWords(text: string): string[] {
  return tokenize(text).filter((w) => !STOP_WORDS.has(w));
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}
