import { describe, expect, it } from "vitest";
import {
  NEVER_0001,
  PREFERENCE_EDGE_CONFIRM_SCOPE,
  PREFERENCE_PROJECT_DECISION_SCOPE,
  PROMOTE_RUN_SCOPE,
  issueAuthorityGrant,
  verifyPreferenceDecisionAuthority,
  verifyPreferenceEdgeAuthority,
  requireRunPromotionAuthority,
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

describe("Never #0001 — capability does not imply authority", () => {
  it("denies promotion when the caller has capability but no grant", () => {
    expect(
      requireRunPromotionAuthority({
        token: null,
        runId: "run-123",
        secret,
        now,
      }),
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

  it("rejects expired authority", () => {
    const expired = issueAuthorityGrant(
      {
        grantId: "grant-expired",
        issuer: "human:bryan",
        subject: "run:run-123",
        scopes: [PROMOTE_RUN_SCOPE],
        issuedAt: "2026-08-11T10:00:00.000Z",
        expiresAt: "2026-08-11T11:00:00.000Z",
        nonce: "nonce-expired",
      },
      secret,
    );

    expect(
      requireRunPromotionAuthority({
        token: expired,
        runId: "run-123",
        secret,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "expired_grant",
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

  it("preserves legacy grant parsing that ignores unknown top-level input fields", () => {
    const legacyInput = {
      grantId: "grant-legacy-extra",
      issuer: "human:bryan",
      subject: "run:run-123",
      scopes: [PROMOTE_RUN_SCOPE],
      issuedAt: "2026-08-11T12:00:00.000Z",
      expiresAt: "2026-08-11T14:00:00.000Z",
      nonce: "nonce-legacy-extra",
      legacyExtra: "ignored",
    } as Parameters<typeof issueAuthorityGrant>[0];
    const token = issueAuthorityGrant(legacyInput, secret);
    expect(
      requireRunPromotionAuthority({ token, runId: "run-123", secret, now })
        .authorized,
    ).toBe(true);
  });

  describe("preference evidence bindings", () => {
    const proposal = {
      id: `proposal:sha256:${"a".repeat(64)}`,
      contentSha256: `sha256:${"a".repeat(64)}`,
    };
    const receipt = {
      id: `receipt:sha256:${"b".repeat(64)}`,
      contentSha256: `sha256:${"b".repeat(64)}`,
    };

    function preferenceGrant(input: {
      kind: "preference_proposal" | "preference_receipt";
      id: string;
      contentSha256: string;
      subject: string;
      scopes: string[];
      issuer?: string;
      expiresAt?: string;
    }) {
      return issueAuthorityGrant(
        {
          grantId: "grant-preference",
          issuer: input.issuer ?? "user:example",
          subject: input.subject,
          scopes: input.scopes,
          issuedAt: "2026-08-11T12:00:00.000Z",
          expiresAt: input.expiresAt ?? "2026-08-11T14:00:00.000Z",
          nonce: "nonce-preference",
          binding: {
            kind: input.kind,
            id: input.id,
            contentSha256: input.contentSha256,
          },
        },
        secret,
      );
    }

    function decisionToken(
      overrides: Partial<Parameters<typeof preferenceGrant>[0]> = {},
    ) {
      return preferenceGrant({
        kind: "preference_proposal",
        id: proposal.id,
        contentSha256: proposal.contentSha256,
        subject: `preference-proposal:${proposal.id}`,
        scopes: [PREFERENCE_PROJECT_DECISION_SCOPE],
        ...overrides,
      });
    }

    it("accepts an independently signed singleton grant bound to one proposal", () => {
      const decision = verifyPreferenceDecisionAuthority({
        token: decisionToken(),
        secret,
        proposal,
        expectedIssuer: "user:example",
        now,
      });

      expect(decision.authorized).toBe(true);
    });

    it("fails closed when preference verification time is omitted or invalid", () => {
      for (const verificationTime of [undefined, new Date("invalid")]) {
        expect(
          verifyPreferenceDecisionAuthority({
            token: decisionToken(),
            secret,
            proposal,
            expectedIssuer: "user:example",
            now: verificationTime,
          }),
        ).toEqual({
          authorized: false,
          never: NEVER_0001,
          reason: "invalid_verification_time",
        });
      }
    });

    it.each([
      {
        name: "a reused proposal identifier",
        token: () => decisionToken({ id: `proposal:sha256:${"c".repeat(64)}` }),
        reason: "binding_mismatch",
      },
      {
        name: "a swapped proposal digest",
        token: () =>
          decisionToken({ contentSha256: `sha256:${"c".repeat(64)}` }),
        reason: "binding_mismatch",
      },
      {
        name: "a different human issuer",
        token: () => decisionToken({ issuer: "user:other" }),
        reason: "issuer_mismatch",
      },
      {
        name: "an extra authority scope",
        token: () =>
          decisionToken({
            scopes: [
              PREFERENCE_PROJECT_DECISION_SCOPE,
              PREFERENCE_EDGE_CONFIRM_SCOPE,
            ],
          }),
        reason: "non_singleton_scope",
      },
      {
        name: "an expired grant",
        token: () => decisionToken({ expiresAt: "2026-08-11T12:30:00.000Z" }),
        reason: "expired_grant",
      },
    ])("rejects $name", ({ token, reason }) => {
      expect(
        verifyPreferenceDecisionAuthority({
          token: token(),
          secret,
          proposal,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({ authorized: false, never: NEVER_0001, reason });
    });

    it("rejects a grant issued in the future", () => {
      const future = issueAuthorityGrant(
        {
          grantId: "grant-future",
          issuer: "user:example",
          subject: `preference-proposal:${proposal.id}`,
          scopes: [PREFERENCE_PROJECT_DECISION_SCOPE],
          issuedAt: "2026-08-11T13:30:00.000Z",
          expiresAt: "2026-08-11T14:00:00.000Z",
          nonce: "nonce-future",
          binding: {
            kind: "preference_proposal",
            id: proposal.id,
            contentSha256: proposal.contentSha256,
          },
        },
        secret,
      );
      expect(
        verifyPreferenceDecisionAuthority({
          token: future,
          secret,
          proposal,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "not_yet_valid",
      });
    });

    it("rejects a correctly scoped preference grant with no binding", () => {
      const unbound = issueAuthorityGrant(
        {
          grantId: "grant-unbound",
          issuer: "user:example",
          subject: `preference-proposal:${proposal.id}`,
          scopes: [PREFERENCE_PROJECT_DECISION_SCOPE],
          issuedAt: "2026-08-11T12:00:00.000Z",
          expiresAt: "2026-08-11T14:00:00.000Z",
          nonce: "nonce-unbound",
        },
        secret,
      );
      expect(
        verifyPreferenceDecisionAuthority({
          token: unbound,
          secret,
          proposal,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "missing_binding",
      });
    });

    it("rejects a valid legacy-shaped token that has no preference binding", () => {
      expect(
        verifyPreferenceDecisionAuthority({
          token: validGrant(),
          secret,
          proposal,
          expectedIssuer: "human:bryan",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "subject_mismatch",
      });
    });

    it("fails closed for a missing verifier and malformed or tampered tokens", () => {
      const token = decisionToken();
      expect(
        verifyPreferenceDecisionAuthority({
          token,
          secret: null,
          proposal,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "missing_verifier",
      });
      expect(
        verifyPreferenceDecisionAuthority({
          token: `${token}tampered`,
          secret,
          proposal,
          expectedIssuer: "user:example",
          now,
        }).authorized,
      ).toBe(false);
      expect(
        verifyPreferenceDecisionAuthority({
          token: "malformed",
          secret,
          proposal,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "malformed_grant",
      });
    });

    it("requires a separately scoped grant bound to the exact projection receipt", () => {
      const token = preferenceGrant({
        kind: "preference_receipt",
        id: receipt.id,
        contentSha256: receipt.contentSha256,
        subject: `preference-receipt:${receipt.id}`,
        scopes: [PREFERENCE_EDGE_CONFIRM_SCOPE],
      });

      expect(
        verifyPreferenceEdgeAuthority({
          token,
          secret,
          receipt,
          expectedIssuer: "user:example",
          now,
        }).authorized,
      ).toBe(true);
      expect(
        verifyPreferenceEdgeAuthority({
          token: decisionToken(),
          secret,
          receipt,
          expectedIssuer: "user:example",
          now,
        }).authorized,
      ).toBe(false);

      const wrongDigest = preferenceGrant({
        kind: "preference_receipt",
        id: receipt.id,
        contentSha256: `sha256:${"c".repeat(64)}`,
        subject: `preference-receipt:${receipt.id}`,
        scopes: [PREFERENCE_EDGE_CONFIRM_SCOPE],
      });
      expect(
        verifyPreferenceEdgeAuthority({
          token: wrongDigest,
          secret,
          receipt,
          expectedIssuer: "user:example",
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "binding_mismatch",
      });
    });
  });
});
