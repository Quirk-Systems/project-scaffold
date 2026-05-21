import type { AssetType } from "../text";
import { contentWords } from "../text";
import { scoreText, type QuirkScores } from "../scoring";
import type { ProposedAnnotation } from "./types";

type PersonaKey = keyof QuirkScores;

const PERSONAS: { name: string; driver: PersonaKey }[] = [
  { name: "The Hustler", driver: "commercial" },
  { name: "The Trickster", driver: "funny" },
  { name: "The Goblin", driver: "weirdness" },
  { name: "The Romantic", driver: "emotionalCharge" },
  { name: "The Showrunner", driver: "hookDensity" },
  { name: "The Oracle", driver: "spawnPotential" },
];

/**
 * Curator Imp — reads an asset and proposes tags, themes, persona matches,
 * spawnable formats, scores, risk, and a "why this might matter" note. The user
 * approves, edits, or rejects each before it is persisted.
 */
export function curatorPropose(input: {
  rawText: string | null;
  assetType: AssetType;
}): ProposedAnnotation[] {
  const text = input.rawText ?? "";
  const scores = scoreText(text);
  const proposals: ProposedAnnotation[] = [];

  // Tags from the most frequent content words.
  for (const { word, weight } of topWords(text, 5)) {
    proposals.push({
      annotationType: "tag",
      label: word,
      value: { source: "frequency" },
      confidence: round(0.4 + weight * 0.5),
    });
  }

  // Dominant theme.
  const theme = dominantTheme(scores);
  proposals.push({
    annotationType: "theme",
    label: theme.label,
    value: { axis: theme.axis, strength: theme.strength },
    confidence: round(0.5 + theme.strength * 0.4),
  });

  // Persona fit — best matching persona by its driving axis.
  const persona = bestPersona(scores);
  proposals.push({
    annotationType: "persona_fit",
    label: persona.name,
    value: { driver: persona.driver, match: persona.match },
    confidence: round(persona.match),
  });

  // Spawn paths — what this could become.
  for (const path of spawnPaths(input.assetType, scores)) {
    proposals.push({
      annotationType: "spawn_path",
      label: path,
      value: { basis: input.assetType },
      confidence: round(0.5 + scores.spawnPotential * 0.4),
    });
  }

  // Quality + usefulness rating.
  proposals.push({
    annotationType: "quality",
    label: qualityBand(scores.quality),
    value: { scores },
    confidence: round(0.6),
  });
  proposals.push({
    annotationType: "rating",
    label: "usefulness",
    value: { score: scores.quality },
    confidence: round(0.6),
  });

  // Risk / weirdness flag.
  if (scores.weirdness >= 0.6) {
    proposals.push({
      annotationType: "risk",
      label: "high weirdness",
      value: { weirdness: scores.weirdness },
      confidence: round(scores.weirdness),
    });
  }

  // Why this might matter.
  proposals.push({
    annotationType: "comment",
    label: "why this might matter",
    value: { note: whyItMatters(scores, theme.label) },
    confidence: round(0.5),
  });

  return proposals;
}

function topWords(text: string, n: number): { word: string; weight: number }[] {
  const words = contentWords(text);
  if (words.length === 0) return [];
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, weight: count / max }));
}

function dominantTheme(scores: QuirkScores): {
  label: string;
  axis: PersonaKey;
  strength: number;
} {
  const labels: Record<PersonaKey, string> = {
    hookDensity: "attention-grabbing",
    commercial: "monetizable",
    funny: "comedic",
    weirdness: "surreal",
    emotionalCharge: "emotional",
    spawnPotential: "generative",
    quality: "polished",
  };
  let bestAxis: PersonaKey = "spawnPotential";
  let best = -1;
  (Object.keys(labels) as PersonaKey[]).forEach((axis) => {
    if (axis === "quality") return;
    if (scores[axis] > best) {
      best = scores[axis];
      bestAxis = axis;
    }
  });
  return { label: labels[bestAxis], axis: bestAxis, strength: best };
}

function bestPersona(scores: QuirkScores): {
  name: string;
  driver: PersonaKey;
  match: number;
} {
  let winner = PERSONAS[0];
  let best = -1;
  for (const p of PERSONAS) {
    if (scores[p.driver] > best) {
      best = scores[p.driver];
      winner = p;
    }
  }
  return {
    name: winner.name,
    driver: winner.driver,
    match: Math.max(best, 0.1),
  };
}

function spawnPaths(type: AssetType, scores: QuirkScores): string[] {
  const paths = new Set<string>();
  if (scores.hookDensity >= 0.4) paths.add("short-form video script");
  if (scores.commercial >= 0.4) paths.add("ad / landing copy");
  if (scores.emotionalCharge >= 0.4) paths.add("personal essay");
  if (scores.funny >= 0.4) paths.add("bit / sketch");
  switch (type) {
    case "song":
      paths.add("full lyric sheet");
      break;
    case "prompt":
      paths.add("agent system prompt");
      break;
    case "image":
      paths.add("moodboard entry");
      break;
    case "dataset":
      paths.add("eval set");
      break;
    default:
      break;
  }
  if (paths.size === 0) paths.add("thread / note");
  return [...paths].slice(0, 4);
}

function qualityBand(q: number): string {
  if (q >= 0.66) return "strong";
  if (q >= 0.33) return "promising";
  return "raw";
}

function whyItMatters(scores: QuirkScores, theme: string): string {
  const top = (Object.entries(scores) as [keyof QuirkScores, number][])
    .filter(([k]) => k !== "quality")
    .sort((a, b) => b[1] - a[1])[0];
  return `Reads as ${theme}; strongest on ${humanize(top[0])} (${top[1]}). Worth a spawn pass.`;
}

function humanize(key: keyof QuirkScores): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase();
}

function round(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}
