export const QUIRK_STATUSES = [
  "proposed",
  "exploring",
  "experimental",
  "validated",
  "active",
  "constrained",
  "deprecated",
  "archived",
] as const;

export type QuirkStatus = (typeof QUIRK_STATUSES)[number];

export type QuirkScope = "personal" | "project" | "organization" | "public";
export type QuirkActorType = "human" | "agent" | "service";
export type QuirkRisk = "low" | "medium" | "high" | "irreversible";

export interface QuirkRef {
  id: `quirk://${string}`;
  version?: string;
}

export interface QuirkEntity {
  id: `quirk://${string}`;
  type:
    | "principle"
    | "memory"
    | "preference"
    | "capability"
    | "workflow"
    | "evidence"
    | "asset"
    | "metric"
    | "system"
    | "runtime"
    | "rule";
  version: string;
  status: QuirkStatus;
  name: string;
  purpose: string;
  owner: string;
  scope: QuirkScope;
  createdAt: string;
  updatedAt: string;
}

export interface QuirkEvent<TPayload = unknown> {
  eventId: `qevt_${string}`;
  eventType: string;
  eventVersion: string;
  occurredAt: string;
  actor: {
    type: QuirkActorType;
    id: `quirk://${string}`;
  };
  subject?: QuirkRef;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
}

export interface AuthorityEnvelope {
  risk: QuirkRisk;
  approvalState: "not_required" | "requested" | "approved" | "denied" | "expired";
  approvalId?: string;
  actionHash?: string;
}

export function isQuirkId(value: string): value is `quirk://${string}` {
  return /^quirk:\/\/[a-z0-9][a-z0-9/_-]*$/i.test(value);
}
