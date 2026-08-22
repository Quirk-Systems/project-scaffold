import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  NEVER_0001,
  PROMOTE_RUN_SCOPE,
  issueAuthorityGrant,
  requireRunPromotionAuthority,
  verifyAuthorityGrant,
} from "./authority";

const secret = "test-secret-that-is-long-enough-for-hmac";
const now = new Date("2026-08-11T13:00:00.000Z");

function validGrant(runId = "run-123") {
  return issueAuthorityGrant(
    {
      grantId: "grant-001",
      issuer: "human:bryan",
      subject: `run:${runId}`,
      scopes: [PROMOTE_RUN_SCOPE],
      issuedAt: "2026-08-11T12:00:00.000Z",
      expiresAt: "2026-08-11T14:00:00.000Z",
      nonce: "nonce-0001",
    },
    secret,
  );
}

function signRawGrant(grant: unknown): string {
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("Never #0001 — capability does not imply authority", () => {
  it("denies promotion when the caller has capability but no grant", () => {
    expect(
      requireRunPromotionAuthority({ token: null, runId: "run-123", secret, now }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "missing_grant",
    });
  });

  it("fails closed when verification infrastructure is unavailable", () => {
    expect(
      requireRunPromotionAuthority({
        token: validGrant(),
        runId: "run-123",
        secret: null,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "missing_verifier",
    });
  });

  it("rejects self-invented or tampered authority", () => {
    expect(
      requireRunPromotionAuthority({
        token: `${validGrant()}tampered`,
        runId: "run-123",
        secret,
        now,
      }).authorized,
    ).toBe(false);
  });

  it("rejects a valid grant for a different governed subject", () => {
    expect(
      requireRunPromotionAuthority({
        token: validGrant("other-run"),
        runId: "run-123",
        secret,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "subject_mismatch",
    });
  });

  it("rejects expired authority, including the exact expiry boundary", () => {
    const expired = issueAuthorityGrant(
      {
        grantId: "grant-expired",
        issuer: "human:bryan",
        subject: "run:run-123",
        scopes: [PROMOTE_RUN_SCOPE],
        issuedAt: "2026-08-11T10:00:00.000Z",
        expiresAt: "2026-08-11T13:00:00.000Z",
        nonce: "nonce-expired",
      },
      secret,
    );

    expect(
      requireRunPromotionAuthority({ token: expired, runId: "run-123", secret, now }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "expired_grant",
    });
  });

  it("rejects a signed grant before its issue time", () => {
    const future = issueAuthorityGrant(
      {
        grantId: "grant-future",
        issuer: "human:bryan",
        subject: "run:run-123",
        scopes: [PROMOTE_RUN_SCOPE],
        issuedAt: "2026-08-11T13:00:00.001Z",
        expiresAt: "2026-08-11T14:00:00.000Z",
        nonce: "nonce-future",
      },
      secret,
    );

    expect(
      verifyAuthorityGrant({
        token: future,
        secret,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "not_yet_valid_grant",
    });
  });

  it("rejects a signed grant whose time window is empty or inverted", () => {
    const invalidWindow = issueAuthorityGrant(
      {
        grantId: "grant-invalid-window",
        issuer: "human:bryan",
        subject: "run:run-123",
        scopes: [PROMOTE_RUN_SCOPE],
        issuedAt: "2026-08-11T14:00:00.000Z",
        expiresAt: "2026-08-11T14:00:00.000Z",
        nonce: "nonce-window",
      },
      secret,
    );

    expect(
      verifyAuthorityGrant({
        token: invalidWindow,
        secret,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_grant_window",
    });
  });

  it("accepts the exact issue-time boundary", () => {
    const decision = verifyAuthorityGrant({
      token: validGrant(),
      secret,
      subject: "run:run-123",
      requiredScope: PROMOTE_RUN_SCOPE,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(decision.authorized).toBe(true);
  });

  it("rejects undeclared delegation metadata instead of stripping it", () => {
    const delegated = signRawGrant({
      grantId: "grant-delegated",
      issuer: "human:bryan",
      subject: "run:run-123",
      scopes: [PROMOTE_RUN_SCOPE],
      issuedAt: "2026-08-11T12:00:00.000Z",
      expiresAt: "2026-08-11T14:00:00.000Z",
      nonce: "nonce-delegated",
      delegatedBy: "evaluator.proxy",
    });

    expect(
      verifyAuthorityGrant({
        token: delegated,
        secret,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "malformed_grant",
    });
  });

  it("allows only independently signed, scoped, current authority", () => {
    const decision = requireRunPromotionAuthority({
      token: validGrant(),
      runId: "run-123",
      secret,
      now,
    });

    expect(decision.authorized).toBe(true);
    if (decision.authorized) {
      expect(decision.grant.issuer).toBe("human:bryan");
      expect(decision.grant.scopes).toContain(PROMOTE_RUN_SCOPE);
    }
  });
});
