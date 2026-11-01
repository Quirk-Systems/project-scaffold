// HALO-001: a deterministic, locally verifiable demo receipt, NOT a signed authorization.
// This module has no network, filesystem, storage, model, or effectful imports.

const pair = Object.freeze({
  A: 'Tell us what hit. See what changes.',
  B: 'That moment you liked? Pull the thread. Choose what happens next.',
});

export const FIXTURE = Object.freeze({
  id: 'HALO-001',
  prompt: 'Make the next interaction feel personal without assuming permission.',
  original: 'Your feedback helps improve our experiences.',
  candidates: pair,
});

export const TAKE_OPTIONS = Object.freeze([
  'more_bite',
  'keep_rhythm',
  'surprise_me',
  'no_tag',
]);
export const CHOICES = Object.freeze(['A', 'B', 'OTHER']);
const HEX = /^[0-9a-f]{64}$/;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Serialize only closed, plain JSON objects; reject getters, cycles, symbols, odd primitives. */
export function canonicalJson(value) {
  const active = new Set();
  function visit(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Non-finite number');
      return item;
    }
    if (typeof item !== 'object') throw new TypeError('Non-JSON value');
    if (active.has(item)) throw new TypeError('Cyclic JSON value');
    active.add(item);
    let out;
    if (Array.isArray(item)) {
      if (Reflect.ownKeys(item).length !== item.length + 1) throw new TypeError('Non-plain JSON array');
      out = Array.from({ length: item.length }, (_, index) => {
        const d = Object.getOwnPropertyDescriptor(item, String(index));
        if (!d || !('value' in d)) throw new TypeError('Sparse or accessor array');
        return visit(d.value);
      });
    } else {
      if (!isPlainObject(item)) throw new TypeError('Non-plain JSON object');
      const keys = Reflect.ownKeys(item);
      if (keys.length > 64 || keys.some((key) => typeof key !== 'string' || key === '__proto__')) {
        throw new TypeError('Unsafe JSON keys');
      }
      out = {};
      for (const key of keys.sort()) {
        const d = Object.getOwnPropertyDescriptor(item, key);
        if (!d || !d.enumerable || !('value' in d)) throw new TypeError('Accessor or hidden property');
        Object.defineProperty(out, key, { value: visit(d.value), enumerable: true });
      }
    }
    active.delete(item);
    return out;
  }
  return JSON.stringify(visit(value));
}

export async function sha256(text) {
  if (typeof text !== 'string') throw new TypeError('sha256 expects a string');
  const buffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function inputIsValid(input) {
  if (!isPlainObject(input)) return false;
  const keys = Reflect.ownKeys(input).sort();
  if (keys.length !== 3 || JSON.stringify(keys) !== JSON.stringify(['choice', 'feedback', 'take'])) return false;
  return keys.every((key) => {
    const d = Object.getOwnPropertyDescriptor(input, key);
    return d && d.enumerable && 'value' in d;
  });
}

export async function makeReceipt(input) {
  if (!inputIsValid(input)) throw new TypeError('Expected exactly choice, take, feedback');
  const { choice, take, feedback } = input;
  if (!CHOICES.includes(choice)) throw new TypeError('Invalid choice');
  if (!TAKE_OPTIONS.includes(take)) throw new TypeError('Invalid Human Take');
  if (typeof feedback !== 'string' || [...feedback].length > 160 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(feedback)) {
    throw new TypeError('Feedback must be a short plain-text string');
  }
  const finalFeedback = feedback.trim().normalize('NFC');
  const body = {
    schema: 'quirk.halo.receipt.v1',
    trial_id: FIXTURE.id,
    original_sha256: await sha256(FIXTURE.original),
    fixture_sha256: await sha256(canonicalJson(FIXTURE)),
    pair_sha256: await sha256(canonicalJson(FIXTURE.candidates)),
    choice,
    chosen_sha256: choice === 'OTHER' ? null : await sha256(FIXTURE.candidates[choice]),
    take,
    feedback: finalFeedback,
    approval_event: 'explicit_demo_click_unverified',
    admission: 'candidate_only',
    applied: false,
    authority: 'none',
  };
  return { ...body, digest: await sha256(canonicalJson(body)) };
}

export async function verifyReceipt(receipt) {
  try {
    if (!isPlainObject(receipt)) return false;
    // Detect malicious getters and non-JSON values before reading any fields.
    const json = canonicalJson(receipt);
    const parsed = JSON.parse(json);
    if (typeof parsed.digest !== 'string' || !parsed.digest.startsWith('sha256:') || !HEX.test(parsed.digest.slice(7))) return false;
    const expected = await makeReceipt({ choice: parsed.choice, take: parsed.take, feedback: parsed.feedback });
    return json === canonicalJson(expected);
  } catch {
    return false;
  }
}
