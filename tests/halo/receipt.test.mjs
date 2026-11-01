import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHOICES, FIXTURE, TAKE_OPTIONS, canonicalJson, makeReceipt, sha256, verifyReceipt } from '../../public/halo/receipt.mjs';

const input = Object.freeze({ choice: 'A', take: 'more_bite', feedback: 'Keep the tension.' });
const edited = (receipt, changes) => ({ ...receipt, ...changes });

test('L1-01: same inputs yield byte-identical receipts and verified SHA-256', async () => {
  const a = await makeReceipt(input);
  const b = await makeReceipt({ feedback: input.feedback, take: input.take, choice: input.choice });
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.match(a.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(await verifyReceipt(a), true);
  assert.equal(a.applied, false);
  assert.equal(a.authority, 'none');
});

test('L1-02: receipts bind original and both alternatives', async () => {
  const r = await makeReceipt(input);
  assert.equal(r.original_sha256, await sha256(FIXTURE.original));
  assert.equal(r.pair_sha256, await sha256(canonicalJson(FIXTURE.candidates)));
  assert.equal(r.chosen_sha256, await sha256(FIXTURE.candidates.A));
});

test('L1-03: A / B / Neither are independently and repeatably verifiable', async () => {
  for (const choice of CHOICES) {
    const r = await makeReceipt({ choice, take: 'no_tag', feedback: '' });
    assert.equal(await verifyReceipt(r), true);
    assert.equal(r.chosen_sha256, choice === 'OTHER' ? null : await sha256(FIXTURE.candidates[choice]));
  }
});

test('L1-04: every Human Take is explicit; no implicit inference', async () => {
  for (const take of TAKE_OPTIONS) {
    const r = await makeReceipt({ choice: 'B', take, feedback: '' });
    assert.equal(await verifyReceipt(r), true);
    assert.equal(r.take, take);
  }
});

test('L1-05: editing any business-critical field fails verification', async () => {
  const r = await makeReceipt(input);
  const attacks = [
    { choice: 'B' }, { feedback: 'I never approved this.' }, { take: 'surprise_me' },
    { applied: true }, { admission: 'admitted' }, { authority: 'admin' },
    { approval_event: 'signed_by_Bryan' }, { original_sha256: 'sha256:' + '0'.repeat(64) },
    { pair_sha256: 'sha256:' + '1'.repeat(64) }, { chosen_sha256: null },
    { trial_id: 'HALO-002' }, { schema: 'quirk.halo.receipt.v2' },
    { digest: 'sha256:' + 'f'.repeat(64) }, { injected: 'surprise' },
  ];
  for (const attack of attacks) assert.equal(await verifyReceipt(edited(r, attack)), false, JSON.stringify(attack));
});

test('L1-06: invalid choices, cues, and oversized feedback fail closed', async () => {
  for (const bad of [
    { choice: 'C', take: 'no_tag', feedback: '' },
    { choice: null, take: 'no_tag', feedback: '' },
    { choice: 'A', take: 'approve_system_wide', feedback: '' },
    { choice: 'A', take: 'no_tag', feedback: 'x'.repeat(161) },
    { choice: 'A', take: 'no_tag', feedback: '\u0000' },
    { choice: 'A', take: 'no_tag' },
    { choice: 'A', take: 'no_tag', feedback: '', auto_apply: true },
  ]) {
    await assert.rejects(makeReceipt(bad), TypeError);
  }
});

test('L1-07: accessor and prototype payloads cannot pass as trusted receipts', async () => {
  const r = await makeReceipt(input);
  const accessor = { ...r };
  Object.defineProperty(accessor, 'choice', { enumerable: true, get() { throw Error('poison'); } });
  assert.equal(await verifyReceipt(accessor), false);
  assert.equal(await verifyReceipt(Object.assign(Object.create({ admin: true }), r)), false);
  const cyclic = { ...r }; cyclic.self = cyclic;
  assert.equal(await verifyReceipt(cyclic), false);
});

test('L1-08: consent is represented as demo click, never actual authority', async () => {
  const r = await makeReceipt(input);
  assert.equal(r.approval_event, 'explicit_demo_click_unverified');
  assert.equal(r.admission, 'candidate_only');
  assert.equal(r.applied, false);
  assert.equal(r.authority, 'none');
});

test('L1-09: normalized feedback binds exactly and changes digest', async () => {
  const a = await makeReceipt({ ...input, feedback: '  café  ' });
  const b = await makeReceipt({ ...input, feedback: 'cafe\u0301' });
  assert.equal(a.digest, b.digest);
  const c = await makeReceipt({ ...input, feedback: 'cafe' });
  assert.notEqual(c.digest, a.digest);
});

test('L1-10: canonical JSON rejects cycle, functions, and accessor aliases', () => {
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic), TypeError);
  assert.throws(() => canonicalJson({ callback: () => {} }), TypeError);
  const getter = {}; Object.defineProperty(getter, 'a', { enumerable: true, get: () => 'x' });
  assert.throws(() => canonicalJson(getter), TypeError);
});
