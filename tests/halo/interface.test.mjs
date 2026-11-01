import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.attributes = {};
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.focused = false;
  }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  click() { return this.listeners.get('click')?.({ preventDefault() {} }); }
  input() { return this.listeners.get('input')?.(); }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

const HTML = readFileSync(new URL('../../public/halo/index.html', import.meta.url), 'utf8');

function installDom() {
  const choices = ['A', 'B', 'OTHER'].map((choice) => new FakeElement({ choice }));
  const takes = ['more_bite', 'keep_rhythm', 'surprise_me', 'no_tag'].map((take) => new FakeElement({ take }));
  const elements = Object.fromEntries([
    'selection-status', 'approve', 'reset', 'feedback', 'result', 'receipt',
    'digest', 'verified', 'copy-status', 'copy',
    'prompt-text', 'original-text', 'text-a', 'text-b',
  ].map((id) => [id, new FakeElement()]));
  elements.result.hidden = true;
  globalThis.document = {
    querySelectorAll(selector) { return selector === '[data-choice]' ? choices : selector === '[data-take]' ? takes : []; },
    querySelector(selector) { return elements[selector.slice(1)]; },
    getElementById(id) { return elements[id]; },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { async writeText(s) { globalThis.clipboardText = s; } } } });
  return { choices, takes, elements };
}

test('L2-01: HTML contains usable native controls, exact asset imports, no external telemetry', () => {
  assert.match(HTML, /<html lang="en">/);
  assert.match(HTML, /<meta name="viewport"/);
  assert.match(HTML, /<script type="module" src="\.\/halo\.mjs"><\/script>/);
  assert.match(HTML, /aria-live="polite"/);
  assert.match(HTML, /prefers-reduced-motion/);
  assert.match(HTML, /@media\(max-width: 680px\)/);
  assert.doesNotMatch(HTML, /<script[^>]+https?:\/\//);
  assert.doesNotMatch(HTML, /<iframe/);
  for (const option of ['A', 'B', 'OTHER']) assert.match(HTML, new RegExp(`data-choice="${option}"`));
  assert.match(HTML, /id="approve" disabled/);
});

test('L2-02: complete client interaction generates verified A, B, and OTHER receipts', async () => {
  const { choices, takes, elements } = installDom();
  // Import once after injecting a deterministic in-memory DOM.
  await import('../../public/halo/halo.mjs');
  assert.equal(elements.approve.disabled, true);
  assert.match(elements['prompt-text'].textContent, /personal/);
  choices[0].click();
  takes[0].click();
  elements.feedback.value = 'Keep the tension.';
  elements.feedback.input();
  assert.equal(elements.approve.disabled, false);
  await elements.approve.click();
  assert.equal(elements.result.hidden, false);
  const a = JSON.parse(elements.receipt.textContent);
  assert.equal(a.choice, 'A');
  assert.equal(a.take, 'more_bite');
  assert.equal(a.feedback, 'Keep the tension.');
  assert.equal(a.applied, false);
  assert.match(elements.verified.textContent, /VERIFIED/);
  assert.match(elements['selection-status'].textContent, /recorded, verified/);
  await elements.copy.click();
  assert.equal(JSON.parse(globalThis.clipboardText).digest, a.digest);
  choices[2].click();
  assert.equal(elements.result.hidden, true);
  await elements.approve.click();
  assert.equal(JSON.parse(elements.receipt.textContent).choice, 'OTHER');
  assert.equal(JSON.parse(elements.receipt.textContent).chosen_sha256, null);
  elements.reset.click();
  assert.equal(elements.approve.disabled, true);
  assert.equal(elements.result.hidden, true);
  assert.equal(choices[0].focused, true);
  choices[1].click();
  await elements.approve.click();
  assert.equal(JSON.parse(elements.receipt.textContent).choice, 'B');
  assert.equal(JSON.parse(elements.receipt.textContent).take, 'no_tag');
});
