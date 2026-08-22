import { createHmac, timingSafeEqual } from "node:crypto";
import { types as utilTypes } from "node:util";
import { z } from "zod";

export const NEVER_0001 = "never.capability_implies_authority" as const;
export const PROMOTE_RUN_SCOPE = "quirk.run.promote" as const;
export const AUTHORITY_HMAC_KEY_MIN_BYTES = 32 as const;
export const AUTHORITY_TOKEN_TYPE = "quirk-authority-grant" as const;
export const AUTHORITY_TOKEN_VERSION = 1 as const;

export const AUTHORITY_GRANT_LIMITS = Object.freeze({
  fieldChars: 2_048,
  timestampChars: 64,
  scopes: 128,
  serializedPayloadBytes: 18_000,
  encodedHeaderChars: 6_000,
  encodedPayloadChars: 24_000,
  tokenChars: 32_768,
} as const);

const GrantFieldSchema = z
  .string()
  .min(1)
  .max(AUTHORITY_GRANT_LIMITS.fieldChars);
const GrantTimestampSchema = z
  .string()
  .max(AUTHORITY_GRANT_LIMITS.timestampChars)
  .pipe(z.string().datetime());
const GrantScopesSchema = z
  .unknown()
  .superRefine((value, context) => {
    if (Array.isArray(value) && value.length > AUTHORITY_GRANT_LIMITS.scopes) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: AUTHORITY_GRANT_LIMITS.scopes,
        inclusive: true,
        type: "array",
        fatal: true,
        message: "Authority grant contains too many scopes.",
      });
    }
  })
  .pipe(z.array(GrantFieldSchema).min(1).max(AUTHORITY_GRANT_LIMITS.scopes));

export const AuthorityGrantSchema = z
  .object({
    grantId: GrantFieldSchema,
    issuer: GrantFieldSchema,
    subject: GrantFieldSchema,
    scopes: GrantScopesSchema,
    issuedAt: GrantTimestampSchema,
    expiresAt: GrantTimestampSchema,
    nonce: z.string().min(8).max(AUTHORITY_GRANT_LIMITS.fieldChars),
  })
  .strict()
  .superRefine((grant, context) => {
    const fields = [
      grant.grantId,
      grant.issuer,
      grant.subject,
      grant.issuedAt,
      grant.expiresAt,
      grant.nonce,
      ...grant.scopes,
    ];
    if (
      grant.scopes.length > AUTHORITY_GRANT_LIMITS.scopes ||
      fields.some((field) => field.length > AUTHORITY_GRANT_LIMITS.fieldChars)
    ) {
      return;
    }

    if (
      Buffer.byteLength(JSON.stringify(grant), "utf8") >
      AUTHORITY_GRANT_LIMITS.serializedPayloadBytes
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Authority grant exceeds the serialized payload budget.",
      });
    }
  });

export type AuthorityGrant = z.infer<typeof AuthorityGrantSchema>;

export type AuthoritySigningKey = Readonly<{
  issuer: string;
  keyId: string;
  keyBytes: Uint8Array;
}>;

export type AuthorityKeyReference = Readonly<{
  issuer: string;
  keyId: string;
}>;

export type AuthorityKeyResolver = (
  reference: AuthorityKeyReference,
) => Uint8Array | null | undefined;

export type AuthorityDenialReason =
  | "missing_grant"
  | "missing_verifier"
  | "unknown_signing_key"
  | "invalid_verifier"
  | "malformed_grant"
  | "issuer_mismatch"
  | "invalid_signature"
  | "expired_grant"
  | "not_yet_valid_grant"
  | "invalid_grant_window"
  | "invalid_verification_time"
  | "subject_mismatch"
  | "scope_mismatch";

export type AuthorityDecision =
  | {
      authorized: true;
      grant: AuthorityGrant;
      keyReference: AuthorityKeyReference;
    }
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

const AuthorityTokenHeaderSchema = z
  .object({
    alg: z.literal("HS256"),
    issuer: GrantFieldSchema,
    keyId: GrantFieldSchema,
    type: z.literal(AUTHORITY_TOKEN_TYPE),
    version: z.literal(AUTHORITY_TOKEN_VERSION),
  })
  .strict();

function exactHmacKeyBytes(value: unknown): Buffer | undefined {
  try {
    if (!utilTypes.isUint8Array(value)) return undefined;
    if (utilTypes.isSharedArrayBuffer(value.buffer)) return undefined;
    if (value.byteLength < AUTHORITY_HMAC_KEY_MIN_BYTES) return undefined;
    return Buffer.from(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    );
  } catch {
    return undefined;
  }
}

function signingKeyParts(value: unknown): {
  issuer: string;
  keyId: string;
  keyBytes: Buffer;
} {
  if (value === null || typeof value !== "object") {
    throw new TypeError("Authority signing key must be a strict key object.");
  }
  let issuer: unknown;
  let keyId: unknown;
  let keyBytesValue: unknown;
  try {
    const issuerDescriptor = Object.getOwnPropertyDescriptor(value, "issuer");
    const keyIdDescriptor = Object.getOwnPropertyDescriptor(value, "keyId");
    const keyBytesDescriptor = Object.getOwnPropertyDescriptor(
      value,
      "keyBytes",
    );
    issuer =
      issuerDescriptor && "value" in issuerDescriptor
        ? issuerDescriptor.value
        : undefined;
    keyId =
      keyIdDescriptor && "value" in keyIdDescriptor
        ? keyIdDescriptor.value
        : undefined;
    keyBytesValue =
      keyBytesDescriptor && "value" in keyBytesDescriptor
        ? keyBytesDescriptor.value
        : undefined;
  } catch {
    throw new TypeError("Authority signing key is not safely inspectable.");
  }
  const parsedIssuer = GrantFieldSchema.safeParse(issuer);
  const parsedKeyId = GrantFieldSchema.safeParse(keyId);
  const keyBytes = exactHmacKeyBytes(keyBytesValue);
  if (!parsedIssuer.success || !parsedKeyId.success || !keyBytes) {
    throw new TypeError(
      "Authority signing keys require issuer, key ID, and at least 256 bits.",
    );
  }
  return {
    issuer: parsedIssuer.data,
    keyId: parsedKeyId.data,
    keyBytes,
  };
}

function sign(signingInput: string, keyBytes: Uint8Array): string {
  return createHmac("sha256", keyBytes)
    .update(signingInput)
    .digest("base64url");
}

function decodeCanonicalJson(segment: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw new TypeError("Authority token segment is not canonical base64url.");
  }
  const bytes = Buffer.from(segment, "base64url");
  if (bytes.toString("base64url") !== segment) {
    throw new TypeError("Authority token segment is not canonical base64url.");
  }
  return JSON.parse(bytes.toString("utf8"));
}

export function issueAuthorityGrant(
  input: AuthorityGrant,
  signingKey: AuthoritySigningKey,
): string {
  const grant = AuthorityGrantSchema.parse(input);
  const key = signingKeyParts(signingKey);
  if (key.issuer !== grant.issuer) {
    throw new TypeError("Authority signing key is not bound to grant issuer.");
  }
  const protectedHeader = encodeBase64Url(
    JSON.stringify({
      alg: "HS256",
      issuer: key.issuer,
      keyId: key.keyId,
      type: AUTHORITY_TOKEN_TYPE,
      version: AUTHORITY_TOKEN_VERSION,
    }),
  );
  const payload = encodeBase64Url(JSON.stringify(grant));
  const signingInput = `${protectedHeader}.${payload}`;
  return `${signingInput}.${sign(signingInput, key.keyBytes)}`;
}

export function verifyAuthorityGrant(input: {
  token: string | null | undefined;
  resolveKey: AuthorityKeyResolver | null | undefined;
  subject: string;
  requiredScope: string;
  now?: Date;
}): AuthorityDecision {
  if (!input.token)
    return { authorized: false, never: NEVER_0001, reason: "missing_grant" };

  if (
    typeof input.token !== "string" ||
    input.token.length > AUTHORITY_GRANT_LIMITS.tokenChars
  ) {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }

  const segments = input.token.split(".");
  if (
    segments.length !== 3 ||
    segments.some((segment) => segment.length === 0)
  ) {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }
  const [protectedHeader, payload, suppliedSignature] = segments;
  if (
    protectedHeader.length > AUTHORITY_GRANT_LIMITS.encodedHeaderChars ||
    payload.length > AUTHORITY_GRANT_LIMITS.encodedPayloadChars ||
    suppliedSignature.length !== 43
  ) {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }
  if (typeof input.resolveKey !== "function") {
    return { authorized: false, never: NEVER_0001, reason: "missing_verifier" };
  }

  let header: z.infer<typeof AuthorityTokenHeaderSchema>;
  let grant: AuthorityGrant;
  let supplied: Buffer;
  try {
    header = AuthorityTokenHeaderSchema.parse(
      decodeCanonicalJson(protectedHeader),
    );
    grant = AuthorityGrantSchema.parse(decodeCanonicalJson(payload));
    if (
      encodeBase64Url(JSON.stringify(header)) !== protectedHeader ||
      encodeBase64Url(JSON.stringify(grant)) !== payload
    ) {
      throw new TypeError();
    }
    if (!/^[A-Za-z0-9_-]+$/.test(suppliedSignature)) throw new TypeError();
    supplied = Buffer.from(suppliedSignature, "base64url");
    if (
      supplied.length !== 32 ||
      supplied.toString("base64url") !== suppliedSignature
    ) {
      throw new TypeError();
    }
  } catch {
    return { authorized: false, never: NEVER_0001, reason: "malformed_grant" };
  }
  if (header.issuer !== grant.issuer) {
    return { authorized: false, never: NEVER_0001, reason: "issuer_mismatch" };
  }

  let resolvedKey: unknown;
  try {
    resolvedKey = input.resolveKey({
      issuer: header.issuer,
      keyId: header.keyId,
    });
  } catch {
    return { authorized: false, never: NEVER_0001, reason: "missing_verifier" };
  }
  if (resolvedKey === null || resolvedKey === undefined) {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "unknown_signing_key",
    };
  }
  const keyBytes = exactHmacKeyBytes(resolvedKey);
  if (!keyBytes) {
    return { authorized: false, never: NEVER_0001, reason: "invalid_verifier" };
  }
  const signingInput = `${protectedHeader}.${payload}`;
  const expected = Buffer.from(sign(signingInput, keyBytes), "base64url");
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

  const issuedAt = new Date(grant.issuedAt).getTime();
  const expiresAt = new Date(grant.expiresAt).getTime();
  let now: number;
  try {
    now =
      input.now === undefined
        ? Date.now()
        : Date.prototype.getTime.call(input.now);
  } catch {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_verification_time",
    };
  }
  if (!Number.isFinite(now)) {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_verification_time",
    };
  }
  if (issuedAt >= expiresAt) {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "invalid_grant_window",
    };
  }
  if (issuedAt > now) {
    return {
      authorized: false,
      never: NEVER_0001,
      reason: "not_yet_valid_grant",
    };
  }
  if (expiresAt <= now) {
    return { authorized: false, never: NEVER_0001, reason: "expired_grant" };
  }
  if (grant.subject !== input.subject) {
    return { authorized: false, never: NEVER_0001, reason: "subject_mismatch" };
  }
  if (!grant.scopes.includes(input.requiredScope)) {
    return { authorized: false, never: NEVER_0001, reason: "scope_mismatch" };
  }

  return {
    authorized: true,
    grant,
    keyReference: { issuer: header.issuer, keyId: header.keyId },
  };
}

export function requireRunPromotionAuthority(input: {
  token: string | null | undefined;
  runId: string;
  resolveKey?: AuthorityKeyResolver | null;
  now?: Date;
}): AuthorityDecision {
  return verifyAuthorityGrant({
    token: input.token,
    resolveKey: input.resolveKey,
    subject: `run:${input.runId}`,
    requiredScope: PROMOTE_RUN_SCOPE,
    now: input.now,
  });
}

export function assertRunPromotionAuthority(input: {
  token: string | null | undefined;
  runId: string;
  resolveKey?: AuthorityKeyResolver | null;
  now?: Date;
}): AuthorityGrant {
  const decision = requireRunPromotionAuthority(input);
  if (!decision.authorized) throw new AuthorityDeniedError(decision.reason);
  return decision.grant;
}
