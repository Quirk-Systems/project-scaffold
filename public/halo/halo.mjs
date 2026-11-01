import { FIXTURE, makeReceipt, verifyReceipt } from './receipt.mjs';

// The entire demo is client-only. There is no request, storage, or preference mutation.
const choiceButtons = Array.from(document.querySelectorAll('[data-choice]'));
const takeButtons = Array.from(document.querySelectorAll('[data-take]'));
const status = document.querySelector('#selection-status');
const approve = document.querySelector('#approve');
const reset = document.querySelector('#reset');
const feedback = document.querySelector('#feedback');
const result = document.querySelector('#result');
const proof = document.querySelector('#receipt');
const digest = document.querySelector('#digest');
const verified = document.querySelector('#verified');
const copyStatus = document.querySelector('#copy-status');
const copy = document.querySelector('#copy');

// This DOM assertion prevents accidental drift between the visible fixture and the receipt fixture.
for (const [id, expected] of [
  ['prompt-text', FIXTURE.prompt],
  ['original-text', FIXTURE.original],
  ['text-a', FIXTURE.candidates.A],
  ['text-b', FIXTURE.candidates.B],
]) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing fixture element: ${id}`);
  element.textContent = expected;
}

let choice = null;
let take = 'no_tag';
let latestReceipt = null;
let busy = false;

function clearProof() {
  latestReceipt = null;
  result.hidden = true;
  proof.textContent = '';
  digest.textContent = '';
  verified.textContent = '';
  copyStatus.textContent = 'Local, in-memory receipt. Not submitted, stored, published, or applied.';
}

function render() {
  for (const button of choiceButtons) button.setAttribute('aria-pressed', String(choice === button.dataset.choice));
  for (const button of takeButtons) button.setAttribute('aria-pressed', String(take === button.dataset.take));
  approve.disabled = choice === null || busy;
  status.textContent = latestReceipt !== null
    ? `${choice === 'OTHER' ? 'Dissent' : `Direction ${choice}`} recorded, verified, and unapplied.`
    : choice === null
      ? 'Choose A, B, or Neither first.'
    : choice === 'OTHER'
      ? 'Neither selected. Approve to preserve your dissent, not a winner.'
      : `Direction ${choice} selected. Nothing will change until you approve.`;
}

for (const button of choiceButtons) button.addEventListener('click', () => {
  if (busy) return;
  choice = button.dataset.choice;
  clearProof();
  render();
});
for (const button of takeButtons) button.addEventListener('click', () => {
  if (busy) return;
  take = button.dataset.take;
  clearProof();
  render();
});
feedback.addEventListener('input', () => { clearProof(); render(); });
reset.addEventListener('click', () => {
  if (busy) return;
  choice = null;
  take = 'no_tag';
  feedback.value = '';
  clearProof();
  render();
  choiceButtons[0].focus();
});

approve.addEventListener('click', async () => {
  if (choice === null || busy) return;
  busy = true;
  render();
  try {
    const receipt = await makeReceipt({ choice, take, feedback: feedback.value });
    const valid = await verifyReceipt(receipt);
    if (!valid) throw new Error('Verifier rejected receipt');
    latestReceipt = receipt;
    proof.textContent = JSON.stringify(receipt, null, 2);
    digest.textContent = receipt.digest;
    verified.textContent = '✓ VERIFIED / NO EFFECT';
    result.hidden = false;
    status.textContent = `${choice === 'OTHER' ? 'Dissent' : `Direction ${choice}`} recorded, verified, and unapplied.`;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    latestReceipt = null;
    result.hidden = false;
    proof.textContent = '';
    digest.textContent = '';
    verified.textContent = 'REJECTED / VERIFIER ERROR';
    copyStatus.textContent = 'No approved proof was created; no effects occurred.';
  } finally {
    busy = false;
    render();
  }
});

copy.addEventListener('click', async () => {
  if (latestReceipt === null) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(latestReceipt, null, 2));
    copyStatus.textContent = 'Copied locally. Pasting the receipt does not grant execution authority.';
  } catch {
    copyStatus.textContent = 'Clipboard unavailable. Select the receipt text above to copy it.';
  }
});
render();
