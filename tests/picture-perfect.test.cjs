const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'picture-perfect.js'), 'utf8');

class Element {
  constructor() {
    this.hidden = false;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.attributes = {};
    this.firstChild = { textContent: '' };
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() {}
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelectorAll() { return this.children; }
}

function fixture() {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `place-${i}`, question: `Question ${i}?`, image: `assets/images/picture-perfect/geography/place-${i}.jpg`,
    imageAlt: 'A landscape', answers: ['Right', 'Wrong one', 'Wrong two', 'Wrong three'],
    correct: 0, explanation: 'A clear explanation.', difficulty: 'Medium', topic: 'Landscapes',
    attribution: { author: 'Photographer', source: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
      license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }
  }));
}

async function setup(bank) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  for (const id of ['load-error', 'welcome', 'game', 'results', 'feedback', 'next', 'photo-credit', 'image-error']) {
    document.getElementById(id).hidden = true;
  }
  const errors = [];
  const math = Object.create(Math);
  math.random = () => 0.5;
  vm.runInNewContext(script, {
    document, Math: math,
    fetch: async () => ({ ok: true, json: async () => bank }),
    console: { error: (...args) => errors.push(args) }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { elements, errors };
}

function completeGame(el, bank) {
  const questions = [];
  for (let i = 0; i < 10; i++) {
    const text = el.get('question').textContent;
    questions.push(text);
    const item = bank.find(q => q.question === text);
    assert.ok(item);
    assert.equal(el.get('photo-credit').hidden, true);
    assert.ok(el.get('answers').children.every(button => button.disabled));
    el.get('question-image').onload();
    const answerIndex = i % 2 ? 1 : 0;
    const button = el.get('answers').children.find(child => Number(child.dataset.answerIndex) === answerIndex);
    button.click();
    assert.equal(el.get('feedback').hidden, false);
    if (answerIndex === item.correct) {
      assert.equal(el.get('feedback-title').textContent, 'That’s correct!');
    } else {
      assert.match(el.get('feedback-title').textContent, /Not quite\. The answer is Right\./);
    }
    assert.equal(el.get('photo-credit').hidden, false);
    assert.equal(el.get('progress').attributes['aria-valuenow'], i + 1);
    assert.ok(el.get('answers').children.every(child => child.disabled));
    el.get('next').click();
  }
  assert.equal(new Set(questions).size, 10);
  assert.equal(el.get('result-ring-score').textContent, 5);
  assert.match(el.get('result-summary').textContent, /50%/);
  assert.equal(el.get('result-breakdown').textContent, '5 correct · 5 incorrect');
  return questions;
}

test('game starts, gives feedback and score, and replays with a fresh selection', async () => {
  const bank = fixture();
  const { elements: el, errors } = await setup(bank);
  assert.equal(el.get('welcome').hidden, false);
  el.get('start').click();
  const first = completeGame(el, bank);
  assert.equal(el.get('results').hidden, false);
  el.get('play-again').click();
  const second = completeGame(el, bank);
  assert.ok(second.some(question => !first.includes(question)));
  assert.equal(errors.length, 0);
});

test('a failed image blocks answers and can be retried', async () => {
  const { elements: el, errors } = await setup(fixture());
  el.get('start').click();
  el.get('question-image').onerror();
  assert.equal(el.get('image-error').hidden, false);
  assert.ok(el.get('answers').children.every(button => button.disabled));
  el.get('retry-image').click();
  el.get('question-image').onload();
  assert.equal(el.get('image-error').hidden, true);
  assert.ok(el.get('answers').children.every(button => !button.disabled));
  assert.equal(errors.length, 1);
});

test('invalid data is reported rather than starting a game', async () => {
  const { elements: el, errors } = await setup(fixture().slice(0, 5));
  assert.equal(el.get('load-error').hidden, false);
  assert.equal(el.get('welcome').hidden, true);
  assert.equal(errors.length, 1);
});
