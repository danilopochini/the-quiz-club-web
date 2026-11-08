const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'who-am-i.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'js', 'who-am-i.js'), 'utf8');
const key = 'quiz-club-who-am-i-v1';
const names = ['Historical Figures', 'Scientists & Inventors', 'Movies & Entertainment', 'Sports Legends', 'Fictional Characters', 'Famous People', 'Mixed Mysteries'];
const categories = ['historical-figures', 'scientists-inventors', 'movies-entertainment', 'sports-legends', 'fictional-characters', 'famous-people'];

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.classList = { toggle() {} };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  focus() {}
  click() { if (!this.disabled && this.listeners.click) this.listeners.click(); }
  submit() { this.listeners.submit({ preventDefault() {} }); }
}

async function setup(storage = {}, data = bank) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const errors = [];
  vm.runInNewContext(script, {
    document, Intl, Date,
    localStorage: {
      getItem(name) { if (storage.error) throw Error('Unavailable'); return storage[name] || null; },
      setItem(name, value) { if (storage.error) throw Error('Unavailable'); storage[name] = value; }
    },
    fetch: async () => ({ ok: data !== null, status: 503, json: async () => data }),
    console: { error: (...args) => errors.push(args) }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { el: elements, errors };
}

function choose(el, name) {
  const card = el.get('category-grid').children.find(button => button.children.some(child => child.textContent === name));
  assert.ok(card, name);
  card.click();
}

function state(storage) { return JSON.parse(storage[key]); }
function current(storage) {
  const active = state(storage).active;
  return bank.find(item => item.id === active.ids[active.rounds.length - 1]);
}
function guess(el, value) { el.get('guess').value = value; el.get('guess-form').submit(); }

test('bank has 60 unique complete mysteries with sourced clues and six populated categories', () => {
  assert.equal(bank.length, 60);
  assert.equal(new Set(bank.map(item => item.id)).size, 60);
  assert.equal(new Set(bank.map(item => item.answer.toLowerCase())).size, 60);
  for (const category of categories) assert.equal(bank.filter(item => item.category === category).length, 10);
  for (const item of bank) {
    assert.equal(item.clues.length, 5);
    assert.ok(item.clues.every(clue => typeof clue === 'string' && clue.trim()));
    assert.ok(item.acceptedAnswers.includes(item.answer));
    assert.ok(item.explanation.trim());
    assert.ok(item.sources.length);
    assert.ok(item.sources.every(source => source.name && /^https:\/\/\S+$/.test(source.url)));
    for (const answer of item.acceptedAnswers.filter(value => value.length > 4)) {
      assert.ok(!item.clues[0].toLowerCase().includes(answer.toLowerCase()), `${item.id} reveals an accepted name in its first clue`);
    }
  }
});

test('all seven categories complete a ten-mystery game', async () => {
  for (const name of names) {
    const storage = {};
    const { el } = await setup(storage);
    choose(el, name);
    for (let i = 0; i < 10; i++) {
      guess(el, current(storage).answer);
      el.get('next').click();
    }
    assert.equal(el.get('results').hidden, false, name);
    assert.equal(el.get('result-score').textContent, 50, name);
    assert.equal(el.get('review').children.length, 10, name);
  }
});

test('each category starts ten distinct mysteries and mixed draws from all six', async () => {
  for (const [index, name] of names.entries()) {
    const storage = {};
    const { el } = await setup(storage);
    choose(el, name);
    const active = state(storage).active;
    assert.equal(active.ids.length, 10);
    assert.equal(new Set(active.ids).size, 10);
    const selected = active.ids.map(id => bank.find(item => item.id === id));
    if (index === 6) assert.deepEqual(new Set(selected.map(item => item.category)), new Set(categories));
    else assert.ok(selected.every(item => item.category === categories[index]));
    assert.equal(el.get('round-count').textContent, 'Mystery 1 of 10');
    assert.equal(el.get('clues').children.length, 1);
    assert.match(el.get('points').textContent, /5 points/);
  }
});

test('clues, locked guesses, aliases and refresh preserve scoring and progress', async () => {
  const storage = {};
  let { el } = await setup(storage);
  choose(el, 'Scientists & Inventors');
  const mystery = current(storage);
  assert.equal(el.get('clues').children[0].textContent, mystery.clues[0]);
  guess(el, 'definitely wrong');
  assert.equal(el.get('reveal').hidden, false);
  assert.equal(el.get('guess').disabled, true);
  guess(el, mystery.answer);
  assert.equal(state(storage).active.rounds[0].guesses.length, 1);
  ({ el } = await setup(storage));
  assert.equal(el.get('guess').disabled, true);
  assert.equal(el.get('clues').children.length, 1);
  el.get('reveal').click();
  assert.equal(el.get('clues').children.length, 2);
  assert.equal(el.get('clues').children[1].textContent, mystery.clues[1]);
  assert.match(el.get('points').textContent, /4 points/);
  ({ el } = await setup(storage));
  assert.equal(el.get('clues').children.length, 2);
  const alias = mystery.acceptedAnswers[1] || mystery.answer;
  guess(el, `  ${alias.toUpperCase()}!!!  `);
  assert.match(el.get('feedback-title').textContent, /right/);
  assert.equal(el.get('score').textContent, 4);
  ({ el } = await setup(storage));
  assert.equal(el.get('score').textContent, 4);
  assert.equal(el.get('next').hidden, false);
  el.get('next').click();
  assert.equal(el.get('round-count').textContent, 'Mystery 2 of 10');
});

test('final guess, zero score, full review, completion persistence and replay preferences', async () => {
  const storage = {};
  let { el } = await setup(storage);
  choose(el, 'Mixed Mysteries');
  const firstIds = state(storage).active.ids;
  for (let round = 0; round < 10; round++) {
    const item = current(storage);
    if (round === 0) {
      for (let clue = 0; clue < 5; clue++) {
        assert.equal(el.get('clues').children.length, clue + 1);
        assert.equal(el.get('clues').children[clue].textContent, item.clues[clue]);
        assert.match(el.get('points').textContent, new RegExp(`${5 - clue} point`));
        guess(el, 'wrong');
        if (clue < 4) {
          assert.doesNotMatch(el.get('feedback-title').textContent, new RegExp(item.answer));
          el.get('reveal').click();
        }
      }
      assert.match(el.get('feedback-title').textContent, /answer was/);
    } else guess(el, item.answer);
    el.get('next').click();
  }
  assert.equal(el.get('results').hidden, false);
  assert.equal(el.get('result-score').textContent, 45);
  assert.equal(el.get('result-title').textContent, 'Master Detective!');
  assert.match(el.get('result-breakdown').textContent, /9 identified · 1 not identified · 4.5/);
  assert.equal(el.get('review').children.length, 10);
  assert.equal(el.get('review').children[0].children[2].children.length, 5);
  assert.equal(state(storage).completed.length, 1);
  ({ el } = await setup(storage));
  assert.equal(el.get('results').hidden, false);
  assert.equal(state(storage).completed.length, 1);
  el.get('play-again').click();
  assert.equal(state(storage).active.ids.filter(id => firstIds.includes(id)).length, 0);
  const selection = state(storage).active.ids.map(id => bank.find(item => item.id === id).category);
  assert.equal(new Set(selection).size, 6);
});

test('final clue accepts an answer for one point and personal bests remain independent', async () => {
  const storage = {};
  const { el } = await setup(storage);
  choose(el, 'Historical Figures');
  for (let i = 0; i < 10; i++) {
    const item = current(storage);
    for (let clue = 0; clue < 4; clue++) { guess(el, 'wrong'); el.get('reveal').click(); }
    guess(el, item.answer);
    el.get('next').click();
  }
  assert.equal(el.get('result-score').textContent, 10);
  assert.equal(state(storage).bests['historical-figures'], 10);
  el.get('choose-category').click();
  choose(el, 'Sports Legends');
  for (let i = 0; i < 10; i++) { guess(el, current(storage).answer); el.get('next').click(); }
  assert.equal(state(storage).bests['sports-legends'], 50);
  assert.equal(state(storage).bests['historical-figures'], 10);
});

test('solving at each clue awards exactly five down to one point', async () => {
  const storage = {};
  const { el } = await setup(storage);
  choose(el, 'Historical Figures');
  let total = 0;
  for (let clue = 0; clue < 5; clue++) {
    const item = current(storage);
    for (let i = 0; i < clue; i++) { guess(el, 'wrong'); el.get('reveal').click(); }
    guess(el, item.answer);
    total += 5 - clue;
    assert.equal(el.get('score').textContent, total);
    el.get('next').click();
  }
});

test('punctuation and accents normalize without accepting unrelated guesses', async () => {
  const storage = {};
  let { el } = await setup(storage);
  choose(el, 'Sports Legends');
  const saved = state(storage);
  const target = bank.find(item => item.answer === 'Nadia Comăneci');
  const position = saved.active.ids.indexOf(target.id);
  [saved.active.ids[0], saved.active.ids[position]] = [saved.active.ids[position], saved.active.ids[0]];
  storage[key] = JSON.stringify(saved);
  ({ el } = await setup(storage));
  guess(el, 'Comanec');
  assert.equal(el.get('reveal').hidden, false);
  el.get('reveal').click();
  guess(el, '  NADIA--COMANECI!!  ');
  assert.match(el.get('feedback-title').textContent, /right/);
  assert.equal(el.get('score').textContent, 4);
});

test('invalid data, shortages and unavailable storage are visible', async () => {
  const invalid = await setup({}, [...bank, bank[0]]);
  assert.equal(invalid.el.get('load-error').hidden, false);
  const short = await setup({}, bank.filter(item => item.category !== 'historical-figures'));
  choose(short.el, 'Historical Figures');
  assert.equal(short.el.get('category-message').hidden, false);
  choose(short.el, 'Mixed Mysteries');
  assert.equal(short.el.get('category-message').hidden, false);
  const unavailable = await setup({ error: true });
  assert.equal(unavailable.el.get('storage-warning').hidden, false);
  choose(unavailable.el, 'Historical Figures');
  assert.equal(unavailable.el.get('game').hidden, false);
});
