const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'quiz.js'), 'utf8');
const categories = [
  'geography', 'movies-television', 'music', 'history', 'sports',
  'science-nature', 'art-literature', 'lifestyle-brands', 'people-places',
  'mathematics-logic', 'pop-culture', 'general-knowledge'
];

class Element {
  constructor() {
    this.hidden = false;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.firstChild = { textContent: '' };
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  setAttribute() {}
  focus() {}
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelector() { return this.paragraph ||= new Element(); }
}

async function setup(category, bank) {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, new Element());
      return elements.get(selector);
    },
    createElement() { return new Element(); }
  };
  for (const selector of ['#load-error', '#quiz-settings', '#game', '#feedback', '#next', '#results']) {
    document.querySelector(selector).hidden = true;
  }
  document.querySelector('#difficulty-select').value = 'Miscellaneous';
  const math = Object.create(Math);
  math.random = () => 0.5;
  const errors = [];
  vm.runInNewContext(script, {
    document, location: { search: `?category=${category}` }, URLSearchParams,
    fetch: async () => ({ ok: true, json: async () => bank }),
    console: { error: (...args) => errors.push(args) },
    Math: math
  });
  await new Promise(resolve => setImmediate(resolve));
  return { elements, errors };
}

function playGame(elements, bank, level) {
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    const text = elements.get('#question').textContent;
    const item = bank.find(question => question.question === text);
    assert.ok(item, `unknown question: ${text}`);
    if (level !== 'Miscellaneous') assert.equal(item.difficulty, level, text);
    assert.ok(!seen.has(text), `repeated question: ${text}`);
    seen.add(text);
    const answerIndex = i % 2 === 0 ? item.correct : (item.correct + 1) % 4;
    const button = elements.get('#answers').children.find(child => Number(child.dataset.answerIndex) === answerIndex);
    button.click();
    assert.equal(elements.get('#feedback').hidden, false);
    assert.ok(elements.get('#answers').children.every(child => child.disabled));
    elements.get('#next').click();
  }
  assert.equal(elements.get('#results').hidden, false);
  assert.equal(elements.get('#result-ring-score').textContent, 5);
  return seen;
}

test('every difficulty yields a complete game and a fresh replay for each category', async () => {
  for (const category of categories) {
    const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', `${category}.json`), 'utf8'));
    const { elements, errors } = await setup(category, bank);
    assert.equal(errors.length, 0, category);
    assert.equal(elements.get('#difficulty-select').value, 'Miscellaneous');
    let first = playGame(elements, bank, 'Miscellaneous');
    elements.get('#play-again').click();
    let replay = playGame(elements, bank, 'Miscellaneous');
    assert.ok([...replay].some(question => !first.has(question)), `${category}: miscellaneous replay unchanged`);

    for (const level of ['Easy', 'Medium', 'Hard']) {
      elements.get('#difficulty-select').value = level;
      elements.get('#start-new').click();
      first = playGame(elements, bank, level);
      elements.get('#play-again').click();
      replay = playGame(elements, bank, level);
      assert.ok([...replay].some(question => !first.has(question)), `${category}: ${level} replay unchanged`);
    }
  }
});

test('changing the selection does not reset a game until the player starts a new quiz', async () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sports.json'), 'utf8'));
  const { elements } = await setup('sports', bank);
  const question = elements.get('#question').textContent;
  elements.get('#difficulty-select').value = 'Hard';
  assert.equal(elements.get('#question').textContent, question);
  elements.get('#start-new').click();
  assert.equal(bank.find(item => item.question === elements.get('#question').textContent).difficulty, 'Hard');
  assert.equal(elements.get('#score').textContent, 0);
});

test('an undersized difficulty pool displays a loading error', async () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sports.json'), 'utf8'));
  const { elements, errors } = await setup('sports', bank.filter(item => item.difficulty !== 'Hard').concat(bank.filter(item => item.difficulty === 'Hard').slice(0, 10)));
  assert.equal(elements.get('#load-error').hidden, false);
  assert.equal(elements.get('#quiz-settings').hidden, true);
  assert.ok(errors.length > 0);
});
