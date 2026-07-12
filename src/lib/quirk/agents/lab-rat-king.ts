import { scoreText, overallScore } from "../scoring";
import type { VariantProposal } from "./types";

type Mutation = {
  label: string;
  prompt: string;
  apply: (text: string) => string;
};

const MUTATIONS: Mutation[] = [
  {
    label: "punch up the hook",
    prompt: "Rewrite with a stronger opening hook.",
    apply: (t) =>
      `What if ${firstClause(t).toLowerCase()} — here's the part nobody says.\n${t}`,
  },
  {
    label: "make it commercial",
    prompt: "Reframe around a clear product benefit and CTA.",
    apply: (t) =>
      `${t}\n\nThe offer: get the result above without the grind. Start free today.`,
  },
  {
    label: "weirder",
    prompt: "Inject surreal, goblin-brained chaos.",
    apply: (t) =>
      `${t}\n\n(A goblin appears, eats the thesis, and somehow it makes more sense now.)`,
  },
  {
    label: "tighter",
    prompt: "Cut to the single sharpest line.",
    apply: (t) => firstClause(t),
  },
  {
    label: "more emotional",
    prompt: "Raise the emotional stakes.",
    apply: (t) =>
      `${t}\n\nAnd if I'm honest, it aches a little — because it matters more than I let on.`,
  },
];

/**
 * Lab Rat King — designs an experiment by generating N variants of an input,
 * scoring each, and surfacing the winner and the next mutation to try.
 */
export function labRatGenerate(input: {
  text: string;
  count?: number;
}): VariantProposal[] {
  const base = (input.text ?? "").trim();
  const count = clampCount(input.count ?? 3);
  const variants: VariantProposal[] = [];

  // Run 0 is always the unmutated control.
  variants.push(makeVariant("control", "Leave the input unchanged.", base));

  for (let i = 0; i < count - 1; i++) {
    const m = MUTATIONS[i % MUTATIONS.length];
    variants.push(makeVariant(m.label, m.prompt, m.apply(base)));
  }
  return variants;
}

export function pickWinner(variants: VariantProposal[]): number {
  let bestIdx = 0;
  for (let i = 1; i < variants.length; i++) {
    if (variants[i].score > variants[bestIdx].score) bestIdx = i;
  }
  return bestIdx;
}

function makeVariant(
  label: string,
  prompt: string,
  output: string,
): VariantProposal {
  const scores = scoreText(output);
  return { label, prompt, output, scores, score: overallScore(scores) };
}

function firstClause(text: string): string {
  const m = text
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .find(Boolean);
  return m ?? text.trim();
}

function clampCount(n: number): number {
  if (Number.isNaN(n)) return 3;
  return Math.max(2, Math.min(11, Math.floor(n)));
}
