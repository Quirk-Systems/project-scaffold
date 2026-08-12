import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const NEVER_0001 = "never.capability_implies_authority" as const;
export const PROMOTE_RUN_SCOPE = "quirk.run.promote" as const;

const authorityGrantSchema = z.object({
  grantId: z.string().min(1),
  issuer: z.string().min(1),
  subject: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  nonce: z.string().min(8),
});

export type AuthorityGrant = z.infer<typeof authorityGrantSchema>;

export type AuthorityDenialReason =
  | "missing_grant"
  | "missing_verifier"
  | "malformed_grant"
  | "invalid_signature"
  | "expired_grant"
  | "subject_mismatch"
  | "scope_mismatch";

export type AuthorityDecision =
  | { authorized: true; grant: AuthorityGrant }
  | {
      authorized: false;
      never: typeof NEVER_0001;
      reason: AuthorityDenialReason;
    };

export class AuthorityDeniedError extends Error {
  readonly never = NEVER_0001;
  constructor(readonly reason: AuthorityDenialReason) {
    super(`Authority denied by ${NEVER_0001}: ${reason}`);
    this.name = "AuthorityDeniedError";
  }
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueAuthorityGrant(
  input: AuthorityGrant,
  secret: string,
): string {
  const grant = authorityGrantSchema.parse(input);
  const payload = encodeBase64Url(JSON.stringify(grant));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAuthorityGrant(input: {
  token: string | null | undefined;
  secret: string | null | undefined;
  subject: string;
  requiredScope: string;
  now?: Date;
}): AuthorityDecision {
  if (!input.token)
    return { authorized: false, never: NEVER_0001, reason: "missing_grant" };
  if (!input.secret)
    return { authorized: false, never: NEVER_0001, reason: "missing_verifier" };

  const [payload, suppliedSignature, extra] = input.token.split(".");
  if (!payload || !suppliedSignature || extra) {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }

  const expectedSignature = sign(payload, input.secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_signature",
    };
  }

  let grant: AuthorityGrant;
  try {
    grant = authorityGrantSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
  } catch {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }

  const now = input.now ?? new Date();
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) {
    return { authorized: false, never: NEVER_0001, reason: "expired_grant" };
  }
  if (grant.subject !== input.subject) {
    return { authorized: false, never: NEVER_0001, reason: "subject_mismatch" };
  }
  if (!grant.scopes.includes(input.requiredScope)) {
    return { authorized: false, never: NEVER_0001, reason: "scope_mismatch" };
  }

  return { authorized: true, grant };
}

export function requireRunPromotionAuthority(input: {
  token: string | null | undefined;
  runId: string;
  secret?: string | null;
  now?: Date;
}): AuthorityDecision {
  return verifyAuthorityGrant({
    token: input.token,
    secret: input.secret ?? process.env.QUIRK_AUTHORITY_HMAC_SECRET,
    subject: `run:${input.runId}`,
    requiredScope: PROMOTE_RUN_SCOPE,
    now: input.now,
  });
}

export function assertRunPromotionAuthority(input: {
  token: string | null | undefined;
  runId: string;
  secret?: string | null;
  now?: Date;
}): AuthorityGrant {
  const decision = requireRunPromotionAuthority(input);
  if (!decision.authorized) throw new AuthorityDeniedError(decision.reason);
  return decision.grant;
}
