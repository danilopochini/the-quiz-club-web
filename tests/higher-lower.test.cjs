const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'higher-lower.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'js', 'higher-lower.js'), 'utf8');
const categories = ['geography', 'movies-television', 'music', 'history', 'sports', 'science-nature',
  'art-literature', 'lifestyle-brands', 'people-places', 'mathematics-logic', 'pop-culture', 'general-knowledge'];
const names = ['Geography', 'Movies & Television', 'Music', 'History', 'Sports', 'Science & Nature',
  'Art & Literature', 'Lifestyle & Brands', 'People & Places', 'Mathematics & Logic', 'Pop Culture', 'General Knowledge'];

class Element {
  constructor() {
    this.children = [];
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, state) => state ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() {}
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
  click() { if (!this.disabled && this.listeners.click) this.listeners.click(); }
}

async function setup(data = bank, storage = {}, random = () => 0.25) {
  const elements = new Map();
  const document = {
    getElementById(id) {
        if (!elements.has(id)) {
          const element = new Element();
          element.parentElement = { style: { setProperty() {} } };
          elements.set(id, element);
        }
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const errors = [];
  const math = Object.create(Math);
  math.random = random;
  vm.runInNewContext(script, {
    document, Math: math, Intl,
    localStorage: {
      getItem(key) { if (storage.error) throw Error('Storage unavailable'); return storage[key] || null; },
      setItem(key, value) { if (storage.error) throw Error('Storage unavailable'); storage[key] = value; }
    },
    fetch: async () => ({ ok: data !== null, status: 503, json: async () => data }),
    console: { error: (...args) => errors.push(args) }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { el: elements, errors, storage };
}

function choose(el, name) {
  const button = el.get('category-grid').children.find(card => card.children.some(child => child.textContent === name));
  assert.ok(button, name);
  button.click();
}

function playRound(el, category, desiredCorrect = 10) {
  const seen = new Set();
  const subjects = new Set();
  for (let i = 0; i < 10; i++) {
    assert.equal(el.get('question-count').textContent, `Comparison ${i + 1} of 10`);
    assert.equal(el.get('category-name').textContent, names[categories.indexOf(category)]);
    assert.equal(el.get('right-value').textContent, '?');
    const left = el.get('left-name').textContent;
    const right = el.get('right-name').textContent;
    if (category === 'movies-television') {
      assert.ok(!subjects.has(left), `repeated film: ${left}`);
      assert.ok(!subjects.has(right), `repeated film: ${right}`);
      subjects.add(left);
      subjects.add(right);
    }
    const item = bank.find(q => q.category === category &&
      [q.left.name, q.right.name].includes(left) && [q.left.name, q.right.name].includes(right));
    assert.ok(item);
    const leftItem = item.left.name === left ? item.left : item.right;
    const rightItem = item.left.name === right ? item.left : item.right;
    assert.equal(el.get('left-image').src, leftItem.image.path);
    assert.equal(el.get('right-image').src, rightItem.image.path);
    assert.equal(el.get('left-image').alt, leftItem.image.alt);
    assert.equal(el.get('right-image').alt, rightItem.image.alt);
    assert.ok(el.get('left-image-credit').children.some(child => child.href === leftItem.image.source));
    assert.ok(el.get('right-image-credit').children.some(child => child.href === rightItem.image.source));
    const key = [left, right].sort().join('|');
    assert.ok(!seen.has(key), 'duplicate pair');
    seen.add(key);
    const leftValue = item.left.name === left ? item.left.value : item.right.value;
    const rightValue = item.left.name === right ? item.left.value : item.right.value;
    const answer = rightValue > leftValue ? 'higher' : 'lower';
    const chosen = i < desiredCorrect ? answer : (answer === 'higher' ? 'lower' : 'higher');
    el.get(chosen).click();
    assert.notEqual(el.get('right-value').textContent, '?');
    assert.equal(el.get('feedback').hidden, false);
    assert.equal(el.get('higher').disabled, true);
    assert.equal(el.get('lower').disabled, true);
    assert.ok(el.get(answer).classes.has('correct'));
    assert.equal(el.get('progress').attributes['aria-valuenow'], i + 1);
    const score = el.get('score').textContent;
    el.get(chosen).click();
    assert.equal(el.get('score').textContent, score);
    el.get('next').click();
  }
  assert.equal(el.get('results').hidden, false);
  assert.equal(el.get('review').children.length, 10);
  assert.equal(el.get('result-ring-score').textContent, desiredCorrect);
  assert.match(el.get('result-summary').textContent, new RegExp(`${desiredCorrect * 10}%`));
  assert.equal(el.get('result-breakdown').textContent, `${desiredCorrect} correct · ${10 - desiredCorrect} incorrect`);
  for (const row of el.get('review').children) {
    assert.match(row.children[1].textContent, / vs /);
    assert.match(row.children[2].textContent, /Your answer: .*Correct answer:/);
    assert.ok(row.children[3].textContent);
  }
  return seen;
}

test('bank has complete, uniquely sourced and comparable entries for every category', () => {
  const ids = new Set();
  const pairs = new Set();
  const units = new Map();
  for (const item of bank) {
    assert.ok(!ids.has(item.id), item.id);
    ids.add(item.id);
    assert.ok(categories.includes(item.category), item.id);
    for (const field of ['id', 'metric', 'question', 'unit', 'explanation', 'sourceName', 'source', 'referenceYear']) {
      assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.id}: ${field}`);
    }
    assert.match(item.source, /^https:\/\/\S+$/);
    assert.ok(item.left.name && item.right.name && item.left.name !== item.right.name);
    assert.ok(Number.isFinite(item.left.value) && Number.isFinite(item.right.value));
    assert.notEqual(item.left.value, item.right.value);
    const pair = JSON.stringify([item.category, ...[item.left.name, item.right.name].sort()]);
    assert.ok(!pairs.has(pair), `duplicate pair ${pair}`);
    pairs.add(pair);
    const metric = `${item.category}/${item.metric}`;
    if (units.has(metric)) assert.equal(item.unit, units.get(metric), metric);
    units.set(metric, item.unit);
  }
  for (const category of categories) {
    assert.ok(bank.filter(item => item.category === category).length >= 10, category);
  }
});

test('every subject has a valid local image with accessible licensing details', () => {
  const imageBySubject = new Map();
  for (const item of bank) {
    for (const subject of [item.left, item.right]) {
      const image = subject.image;
      assert.ok(image, `${item.id}: ${subject.name}`);
      for (const field of ['path', 'alt', 'creator', 'license', 'source']) {
        assert.ok(typeof image[field] === 'string' && image[field].trim(), `${item.id}: ${field}`);
      }
      assert.match(image.path, /^assets\/images\/(?:higher-lower|picture-perfect\/geography)\/[a-z0-9-]+\.(jpg|png)$/);
      assert.match(image.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (image.licenseUrl) assert.match(image.licenseUrl, /^https:\/\//);
      const bytes = fs.readFileSync(path.join(root, ...image.path.split('/')));
      assert.ok(bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), image.path);
      const key = `${item.category}/${subject.name}`;
      if (imageBySubject.has(key)) assert.deepEqual(image, imageBySubject.get(key));
      imageBySubject.set(key, image);
    }
  }
  assert.equal(imageBySubject.size, 86);
  for (const [key, image] of imageBySubject) {
    if (key.startsWith('geography/')) assert.match(image.alt, /^Map highlighting /);
    if (key.startsWith('movies-television/')) {
      assert.equal(image.alt, `Film poster for ${key.slice('movies-television/'.length)}`);
      assert.match(image.path, /\/film-/);
      assert.match(image.license, /^Public domain/);
    }
  }
});

test('all twelve categories play complete rounds and replay prioritizes new pairs', async () => {
  const { el, errors } = await setup();
  assert.equal(el.get('category-grid').children.length, 12);
  for (let i = 0; i < categories.length; i++) {
    choose(el, names[i]);
    const first = playRound(el, categories[i], i % 2 ? 5 : 10);
    el.get('play-again').click();
    const second = playRound(el, categories[i], 0);
    assert.equal([...second].filter(pair => !first.has(pair)).length, categories[i] === 'movies-television' ? 10 : 5);
    el.get('choose-category').click();
  }
  assert.equal(errors.length, 0);
});

test('movie rounds use twenty distinct films and prefer unused pairs across many random seeds', async () => {
  for (let seed = 1; seed <= 30; seed++) {
    let state = seed;
    const random = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
    const { el } = await setup(bank, {}, random);
    choose(el, 'Movies & Television');
    const first = playRound(el, 'movies-television');
    el.get('play-again').click();
    const second = playRound(el, 'movies-television');
    assert.equal([...second].filter(pair => first.has(pair)).length, 0);
  }
});

test('movie category reports shortage when ten comparisons do not form ten disjoint pairs', async () => {
  const movies = bank.filter(item => item.category === 'movies-television');
  const star = movies.filter(item => item.left.name === 'Ben-Hur (1959)').slice(0, 10);
  assert.equal(star.length, 10);
  const { el } = await setup(star);
  const card = el.get('category-grid').children[1];
  assert.equal(card.children[3].textContent, 'More comparisons coming soon');
  choose(el, 'Movies & Television');
  assert.equal(el.get('category-message').hidden, false);
  assert.notEqual(el.get('game').hidden, false);

  const disconnectedStars = Array.from({ length: 20 }, (_, i) => ({
    ...movies[i],
    id: `test-star-${i}`,
    left: { ...movies[i].left, name: `Hub ${Math.floor(i / 10)}` },
    right: { ...movies[i].right, name: `Leaf ${i}` }
  }));
  const sparse = await setup(disconnectedStars);
  assert.equal(sparse.el.get('category-grid').children[1].children[3].textContent, 'More comparisons coming soon');
  choose(sparse.el, 'Movies & Television');
  assert.equal(sparse.el.get('category-message').hidden, false);
});

test('movie matching finds the available disjoint round and minimizes previous pairs', async () => {
  const movies = bank.filter(item => item.category === 'movies-television');
  const first = await setup();
  choose(first.el, 'Movies & Television');
  const pairs = playRound(first.el, 'movies-television');
  const chosen = movies.filter(item => pairs.has([item.left.name, item.right.name].sort().join('|')));
  assert.equal(chosen.length, 10);
  const storage = {
    'quiz-club-higher-lower-previous-v1': JSON.stringify({
      'movies-television': [chosen[0].id]
    })
  };
  const { el } = await setup(chosen, storage);
  choose(el, 'Movies & Television');
  assert.equal(playRound(el, 'movies-television').size, 10);
  const saved = JSON.parse(storage['quiz-club-higher-lower-previous-v1'])['movies-television'];
  assert.ok(saved.includes(chosen[0].id));

  let alternatives;
  for (let i = 0; i < chosen.length && !alternatives; i++) {
    for (let j = i + 1; j < chosen.length && !alternatives; j++) {
      const a = chosen[i], b = chosen[j];
      const findPair = (x, y) => movies.find(item =>
        [item.left.name, item.right.name].includes(x) && [item.left.name, item.right.name].includes(y));
      const one = findPair(a.left.name, b.left.name);
      const two = findPair(a.right.name, b.right.name);
      if (one && two) alternatives = { a, b, one, two };
    }
  }
  assert.ok(alternatives);
  const { a, b, one, two } = alternatives;
  const replayStorage = {
    'quiz-club-higher-lower-previous-v1': JSON.stringify({ 'movies-television': [a.id, b.id] })
  };
  const replay = await setup([...chosen, one, two], replayStorage);
  choose(replay.el, 'Movies & Television');
  playRound(replay.el, 'movies-television');
  const replayIds = JSON.parse(replayStorage['quiz-club-higher-lower-previous-v1'])['movies-television'];
  assert.ok(!replayIds.includes(a.id) && !replayIds.includes(b.id));
});

test('personal bests persist independently and never decrease', async () => {
  const storage = {};
  const { el } = await setup(bank, storage);
  choose(el, 'Geography');
  playRound(el, 'geography', 5);
  el.get('play-again').click();
  playRound(el, 'geography', 0);
  el.get('choose-category').click();
  choose(el, 'Music');
  playRound(el, 'music', 10);
  const saved = JSON.parse(storage['quiz-club-higher-lower-bests-v1']);
  assert.deepEqual(saved, { geography: 5, music: 10 });
  const again = await setup(bank, storage);
  const descriptions = again.el.get('category-grid').children.map(card => card.children[3].textContent);
  assert.equal(descriptions[0], 'Personal best: 5 / 10');
  assert.equal(descriptions[2], 'Personal best: 10 / 10');
});

test('replay history persists across page loads', async () => {
  const storage = {};
  const first = await setup(bank, storage);
  choose(first.el, 'Geography');
  const previous = playRound(first.el, 'geography');
  const second = await setup(bank, storage);
  choose(second.el, 'Geography');
  const next = playRound(second.el, 'geography');
  assert.equal([...next].filter(pair => !previous.has(pair)).length, 5);
});

test('insufficient and duplicate comparisons are reported rather than repeated', async () => {
  const smaller = bank.filter(item => item.category !== 'geography').concat(bank.filter(item => item.category === 'geography').slice(0, 9));
  smaller.push({ ...smaller.at(-1), id: 'reverse-duplicate', left: smaller.at(-1).right, right: smaller.at(-1).left });
  const { el, errors } = await setup(smaller);
  choose(el, 'Geography');
  assert.equal(el.get('category-message').hidden, false);
  assert.match(el.get('category-message').textContent, /More comparisons/);
  assert.notEqual(el.get('game').hidden, false);
  assert.equal(errors.length, 1);
});

test('storage failures are visible without blocking gameplay', async () => {
  const { el, errors } = await setup(bank, { error: true });
  assert.equal(el.get('storage-warning').hidden, false);
  assert.equal(errors.length, 1);
  choose(el, 'Geography');
  assert.equal(el.get('game').hidden, false);
});

test('invalid comparisons are excluded and a failed fetch shows a retry state', async () => {
  const geography = bank.filter(item => item.category === 'geography').slice(0, 9);
  const bad = { ...bank.find(item => item.category === 'geography'), id: 'invalid',
    right: { name: 'Invalid', value: NaN } };
  const { el, errors } = await setup([...geography, bad]);
  choose(el, 'Geography');
  assert.equal(el.get('category-message').hidden, false);
  assert.equal(errors.length, 1);
  const failed = await setup(null);
  assert.equal(failed.el.get('load-error').hidden, false);
  assert.equal(failed.errors.length, 1);
});

test('an image load failure is visible without stopping the game and resets on the next comparison', async () => {
  const { el, errors } = await setup();
  choose(el, 'Geography');
  el.get('left-image').onerror();
  assert.equal(el.get('left-image').hidden, true);
  assert.equal(el.get('left-image-error').hidden, false);
  assert.equal(errors.length, 1);
  el.get('higher').click();
  el.get('next').click();
  assert.equal(el.get('left-image').hidden, false);
  assert.equal(el.get('left-image-error').hidden, true);
});
