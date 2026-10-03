import { createHmac } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  AuthorityGrantSchema,
  NEVER_0001,
  PROMOTE_RUN_SCOPE,
  issueAuthorityGrant,
  requireRunPromotionAuthority,
  verifyAuthorityGrant,
} from "./authority";

const signingKey = Object.freeze({
  issuer: "human:bryan",
  keyId: "human-bryan.2026-08",
  keyBytes: Uint8Array.from({ length: 32 }, (_, index) => index + 1),
});
const rotatedSigningKey = Object.freeze({
  issuer: "human:bryan",
  keyId: "human-bryan.2026-09",
  keyBytes: Uint8Array.from({ length: 32 }, (_, index) => 255 - index),
});
const otherIssuerKey = Object.freeze({
  issuer: "service:automation",
  keyId: signingKey.keyId,
  keyBytes: Uint8Array.from({ length: 32 }, (_, index) => 127 - index),
});
const resolveKey = ({ issuer, keyId }: { issuer: string; keyId: string }) => {
  const key = [signingKey, rotatedSigningKey, otherIssuerKey].find(
    (candidate) => candidate.issuer === issuer && candidate.keyId === keyId,
  );
  return key?.keyBytes;
};
const now = new Date("2026-08-11T13:00:00.000Z");

function validGrantInput(runId = "run-123") {
  return {
    grantId: "grant-001",
    issuer: "human:bryan",
    subject: `run:${runId}`,
    scopes: [PROMOTE_RUN_SCOPE],
    issuedAt: "2026-08-11T12:00:00.000Z",
    expiresAt: "2026-08-11T14:00:00.000Z",
    nonce: "nonce-0001",
  };
}

function validGrant(runId = "run-123") {
  return issueAuthorityGrant(validGrantInput(runId), signingKey);
}

function signRawGrant(
  grant: unknown,
  key = signingKey,
  header: unknown = {
    alg: "HS256",
    issuer: key.issuer,
    keyId: key.keyId,
    type: "quirk-authority-grant",
    version: 1,
  },
): string {
  return signRawJson(JSON.stringify(header), JSON.stringify(grant), key);
}

function signRawJson(
  headerJson: string,
  grantJson: string,
  key = signingKey,
): string {
  const protectedHeader = Buffer.from(headerJson).toString("base64url");
  const payload = Buffer.from(grantJson).toString("base64url");
  const signature = createHmac("sha256", key.keyBytes)
    .update(`${protectedHeader}.${payload}`)
    .digest("base64url");
  return `${protectedHeader}.${payload}.${signature}`;
}

describe("Never #0001 — capability does not imply authority", () => {
  it.each([
    ["grantId", { grantId: "g".repeat(2_049) }],
    ["issuer", { issuer: "i".repeat(2_049) }],
    ["subject", { subject: "s".repeat(2_049) }],
    ["nonce", { nonce: "n".repeat(2_049) }],
    ["scope", { scopes: ["scope:" + "x".repeat(2_043)] }],
    [
      "scope count",
      { scopes: Array.from({ length: 129 }, (_, i) => `s:${i}`) },
    ],
  ])("rejects an oversized %s in the canonical grant schema", (_, change) => {
    expect(
      AuthorityGrantSchema.safeParse({ ...validGrantInput(), ...change })
        .success,
    ).toBe(false);
  });

  it("rejects an oversized aggregate grant payload", () => {
    const scopes = Array.from(
      { length: 10 },
      (_, index) => `scope:${index}:` + "x".repeat(2_040),
    );

    expect(
      AuthorityGrantSchema.safeParse({ ...validGrantInput(), scopes }).success,
    ).toBe(false);
  });

  it("rejects an oversized scope array before traversing its entries", () => {
    const scopes = new Proxy(
      Array.from({ length: 129 }, () => "scope"),
      {
        get(target, property, receiver) {
          if (typeof property === "string" && /^\d+$/.test(property)) {
            throw new Error("oversized scope entry was traversed");
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );

    expect(() =>
      AuthorityGrantSchema.safeParse({ ...validGrantInput(), scopes }),
    ).not.toThrow();
    expect(
      AuthorityGrantSchema.safeParse({
        ...validGrantInput(),
        scopes: Array.from({ length: 129 }, () => "scope"),
      }).success,
    ).toBe(false);
  });

  it("rejects an oversized token before cryptographic verification", () => {
    const poisonResolver = () => {
      throw new Error("HMAC verification was invoked");
    };
    const token = `${"x".repeat(32_725)}.${"s".repeat(43)}`;

    expect(
      verifyAuthorityGrant({
        token,
        resolveKey: poisonResolver,
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

  it("rejects an oversized encoded payload before HMAC or decoding", () => {
    const poisonResolver = () => {
      throw new Error("HMAC verification was invoked");
    };
    const protectedHeader = signRawGrant(validGrantInput()).split(".")[0];
    const token = `${protectedHeader}.${"x".repeat(24_001)}.${"s".repeat(43)}`;

    expect(
      verifyAuthorityGrant({
        token,
        resolveKey: poisonResolver,
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

  it("denies promotion when the caller has capability but no grant", () => {
    expect(
      requireRunPromotionAuthority({
        token: null,
        runId: "run-123",
        resolveKey,
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
        resolveKey: null,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "missing_verifier",
    });
  });

  it("requires issuer-bound keys with at least 256 bits of material", () => {
    expect(() =>
      issueAuthorityGrant(validGrantInput(), {
        ...signingKey,
        keyBytes: signingKey.keyBytes.slice(0, 31),
      }),
    ).toThrow(TypeError);
    expect(() =>
      issueAuthorityGrant(validGrantInput(), {
        ...signingKey,
        issuer: "service:automation",
      }),
    ).toThrow(TypeError);

    expect(
      verifyAuthorityGrant({
        token: validGrant(),
        resolveKey: () => signingKey.keyBytes.slice(0, 31),
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_verifier",
    });
  });

  it("selects rotated keys by issuer and key ID and fails closed after revocation", () => {
    const rotated = issueAuthorityGrant(validGrantInput(), rotatedSigningKey);
    expect(
      verifyAuthorityGrant({
        token: rotated,
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }).authorized,
    ).toBe(true);

    expect(
      verifyAuthorityGrant({
        token: rotated,
        resolveKey: ({ issuer, keyId }) =>
          issuer === signingKey.issuer && keyId === signingKey.keyId
            ? signingKey.keyBytes
            : undefined,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "unknown_signing_key",
    });
  });

  it("prevents one trusted issuer key from minting as another issuer", () => {
    const forgedGrant = {
      ...validGrantInput(),
      issuer: otherIssuerKey.issuer,
    };
    const forged = signRawGrant(forgedGrant, signingKey, {
      alg: "HS256",
      issuer: otherIssuerKey.issuer,
      keyId: otherIssuerKey.keyId,
      type: "quirk-authority-grant",
      version: 1,
    });

    expect(
      verifyAuthorityGrant({
        token: forged,
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_signature",
    });

    const mismatchedHeader = signRawGrant(forgedGrant, signingKey);
    expect(
      verifyAuthorityGrant({
        token: mismatchedHeader,
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "issuer_mismatch",
    });
  });

  it("rejects the retired two-segment shared-secret token dialect", () => {
    const payload = Buffer.from(JSON.stringify(validGrantInput())).toString(
      "base64url",
    );
    const signature = createHmac("sha256", signingKey.keyBytes)
      .update(payload)
      .digest("base64url");

    expect(
      verifyAuthorityGrant({
        token: `${payload}.${signature}`,
        resolveKey,
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

  it("rejects signed but non-canonical or duplicate-key JSON", () => {
    const canonicalHeader = JSON.stringify({
      alg: "HS256",
      issuer: signingKey.issuer,
      keyId: signingKey.keyId,
      type: "quirk-authority-grant",
      version: 1,
    });
    const canonicalGrant = JSON.stringify(validGrantInput());
    const duplicateHeader = canonicalHeader.replace(
      '"issuer":"human:bryan"',
      '"issuer":"service:automation","issuer":"human:bryan"',
    );
    const duplicatePayload = canonicalGrant.replace(
      '"subject":"run:run-123"',
      '"subject":"run:other","subject":"run:run-123"',
    );
    const reorderedPayload = JSON.stringify({
      issuer: "human:bryan",
      grantId: "grant-001",
      subject: "run:run-123",
      scopes: [PROMOTE_RUN_SCOPE],
      issuedAt: "2026-08-11T12:00:00.000Z",
      expiresAt: "2026-08-11T14:00:00.000Z",
      nonce: "nonce-0001",
    });

    for (const token of [
      signRawJson(duplicateHeader, canonicalGrant),
      signRawJson(canonicalHeader, duplicatePayload),
      signRawJson(canonicalHeader, reorderedPayload),
    ]) {
      expect(
        verifyAuthorityGrant({
          token,
          resolveKey,
          subject: "run:run-123",
          requiredScope: PROMOTE_RUN_SCOPE,
          now,
        }),
      ).toEqual({
        authorized: false,
        never: NEVER_0001,
        reason: "malformed_grant",
      });
    }
  });

  it.each([
    ["boxed string", Object("resolver")],
    ["Promise", Promise.resolve(resolveKey)],
    ["thenable", { then() {} }],
  ])("fails closed for a truthy non-function %s verifier", (_, verifier) => {
    expect(
      verifyAuthorityGrant({
        token: validGrant(),
        resolveKey: verifier as unknown as typeof resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
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
        resolveKey,
        now,
      }).authorized,
    ).toBe(false);
  });

  it("rejects a valid grant for a different governed subject", () => {
    expect(
      requireRunPromotionAuthority({
        token: validGrant("other-run"),
        runId: "run-123",
        resolveKey,
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
      signingKey,
    );

    expect(
      requireRunPromotionAuthority({
        token: expired,
        runId: "run-123",
        resolveKey,
        now,
      }),
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
      signingKey,
    );

    expect(
      verifyAuthorityGrant({
        token: future,
        resolveKey,
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
      signingKey,
    );

    expect(
      verifyAuthorityGrant({
        token: invalidWindow,
        resolveKey,
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
      resolveKey,
      subject: "run:run-123",
      requiredScope: PROMOTE_RUN_SCOPE,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(decision.authorized).toBe(true);
  });

  it("rejects an invalid verification clock", () => {
    expect(
      verifyAuthorityGrant({
        token: validGrant(),
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now: new Date(Number.NaN),
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_verification_time",
    });
  });

  it.each([
    ["boxed timestamp", Object(now.getTime())],
    ["Promise", Promise.resolve(now)],
    [
      "hostile clock object",
      {
        getTime() {
          throw new Error("hostile clock was invoked");
        },
      },
    ],
  ])("fails closed for a non-Date %s", (_, invalidNow) => {
    expect(
      verifyAuthorityGrant({
        token: validGrant(),
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now: invalidNow as Date,
      }),
    ).toEqual({
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_verification_time",
    });
  });

  it("accepts a valid Date from another JavaScript realm", () => {
    const crossRealmNow = runInNewContext(
      'new Date("2026-08-11T13:00:00.000Z")',
    ) as Date;

    expect(
      verifyAuthorityGrant({
        token: validGrant(),
        resolveKey,
        subject: "run:run-123",
        requiredScope: PROMOTE_RUN_SCOPE,
        now: crossRealmNow,
      }).authorized,
    ).toBe(true);
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
        resolveKey,
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
      resolveKey,
      now,
    });

    expect(decision.authorized).toBe(true);
    if (decision.authorized) {
      expect(decision.grant.issuer).toBe("human:bryan");
      expect(decision.grant.scopes).toContain(PROMOTE_RUN_SCOPE);
      expect(decision.keyReference).toEqual({
        issuer: signingKey.issuer,
        keyId: signingKey.keyId,
      });
    }
  });
});
