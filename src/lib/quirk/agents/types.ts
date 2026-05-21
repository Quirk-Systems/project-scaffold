import type { AssetType } from "../text";
import type { QuirkScores } from "../scoring";

export type AgentRole =
  | "archivist_goblin"
  | "curator_imp"
  | "diff_witch"
  | "lab_rat_king"
  | "pipeline_foreman";

export const AGENT_LABELS: Record<AgentRole, string> = {
  archivist_goblin: "Archivist Goblin",
  curator_imp: "Curator Imp",
  diff_witch: "Diff Witch",
  lab_rat_king: "Lab Rat King",
  pipeline_foreman: "Pipeline Foreman",
};

export type IngestResult = {
  title: string;
  assetType: AssetType;
  rawText: string | null;
  metadata: Record<string, unknown>;
  snapshot: Record<string, unknown>;
};

export type ProposedAnnotation = {
  annotationType:
    | "tag"
    | "rating"
    | "comment"
    | "persona_fit"
    | "spawn_path"
    | "risk"
    | "quality"
    | "theme";
  label: string | null;
  value: Record<string, unknown>;
  confidence: number;
};

export type DiffResult = {
  summary: string;
  additions: string[];
  removals: string[];
  meaningShift: Record<string, unknown>;
  scoreDelta: Record<keyof QuirkScores, number>;
};

export type VariantProposal = {
  label: string;
  prompt: string;
  output: string;
  scores: QuirkScores;
  score: number;
};
