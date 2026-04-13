/**
 * Format a date using a subset of Obsidian / moment-style tokens.
 * Supports: YYYY, YY, MM, M, DD, D, HH, mm, ss.
 */
export function formatDate(date: Date, format: string): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, "0");

  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  // Replace longest tokens first so YYYY matches before YY.
  const ordered = Object.keys(tokens).sort((a, b) => b.length - a.length);
  let out = format;
  for (const token of ordered) {
    out = out.split(token).join(tokens[token]!);
  }
  return out;
}
