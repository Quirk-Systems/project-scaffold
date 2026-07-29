import { overallScore, scoreText, type QuirkScores } from "./scoring";

export const SWERVEME_V1 = "SWERVEME_V1" as const;
export const SWERVEME_SOURCE_PHRASE =
  "Develop Quirk Swerveme Journey of Squirther Fourmore Sureslurpers";

export const SWERVEME_COVENANT = {
  coreClaim:
    "One volatile source should produce four strategically different descendants without losing visible ancestry.",
  preserve: [
    "Swerveme Journey",
    "Squirther",
    "Fourmore",
    "Sureslurpers",
    "controlled creative deviation",
  ],
  promotionGate: "Human Sureslurper Council",
  minimumSourceCare: 9,
} as const;

export const SWERVEME_STRATEGIES = [
  {
    key: "bone",
    name: "Bone Sureslurper",
    intent: "Preserve the load-bearing oddity and make the source legible.",
  },
  {
    key: "wild",
    name: "Wild Sureslurper",
    intent: "Change at least two major dimensions and prove meaningful travel.",
  },
  {
    key: "bridge",
    name: "Bridge Sureslurper",
    intent: "Create an entry point without flattening the source.",
  },
  {
    key: "bounty",
    name: "Bounty Sureslurper",
    intent: "Reveal one concrete reusable or sellable form.",
  },
] as const;

export type SwervemeStrategy = (typeof SWERVEME_STRATEGIES)[number]["key"];

export type SwervemeCandidate = {
  sourceId: string;
  journeyId: typeof SWERVEME_V1;
  strategy: SwervemeStrategy;
  name: string;
  intent: string;
  prompt: string;
  output: string;
  scores: QuirkScores;
  score: number;
  outcome: "pending";
  lineage: {
    parentIds: string[];
    origin: "swerveme_v1";
  };
};

const OUTPUTS: Record<SwervemeStrategy, (source: string) => string> = {
  bone: (source) =>
    `${source}\n\nA supervised journey: one pressurized source, four deliberate descendants, visible lineage, and a human promotion gate.`,
  wild: (source) =>
    `FOUR DOORS OPEN FROM ONE SENTENCE.\n\n${source}\n\nChoose Bone, Wild, Bridge, or Bounty. Each door must change the experience, disclose what it lost, and return with evidence.`,
  bridge: (source) =>
    `${source}\n\nIn plain language: start with one promising idea, develop four genuinely different versions, compare their gains and losses, then let a person decide what deserves to continue.`,
  bounty: (source) =>
    `${source}\n\nProduct form: a facilitated four-route creative development sprint delivering four candidates, a lineage report, evaluation scores, and one decision-ready recommendation.`,
};

export function generateSwervemeCandidates(input: {
  sourceId: string;
  text?: string;
}): SwervemeCandidate[] {
  const text = input.text?.trim() || SWERVEME_SOURCE_PHRASE;

  return SWERVEME_STRATEGIES.map((strategy) => {
    const output = OUTPUTS[strategy.key](text);
    const scores = scoreText(output);
    return {
      sourceId: input.sourceId,
      journeyId: SWERVEME_V1,
      strategy: strategy.key,
      name: strategy.name,
      intent: strategy.intent,
      prompt: `Create the ${strategy.name}. ${strategy.intent}`,
      output,
      scores,
      score: overallScore(scores),
      outcome: "pending",
      lineage: { parentIds: [input.sourceId], origin: "swerveme_v1" },
    };
  });
}

export const SWERVEME_V1_STEPS = [
  { stepKey: "capture", stepName: "Squirt Capture", agentRole: "archivist_goblin" },
  { stepKey: "source_covenant", stepName: "Source Covenant", agentRole: "curator_imp" },
  { stepKey: "annotate", stepName: "Covenant Annotation", agentRole: "curator_imp" },
  { stepKey: "spawn_fourmore", stepName: "Fourmore Spawn", agentRole: "lab_rat_king" },
  { stepKey: "diff_four", stepName: "Diff Witch Crossing", agentRole: "diff_witch" },
  { stepKey: "sure_test", stepName: "Sure Test", agentRole: "lab_rat_king" },
  { stepKey: "review", stepName: "Sureslurper Council", agentRole: null },
  { stepKey: "promote", stepName: "Crown or Preserve", agentRole: "pipeline_foreman" },
  { stepKey: "publish", stepName: "Swerveme Exit", agentRole: "pipeline_foreman" },
] as const;
