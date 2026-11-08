const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'daily.js'), 'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'daily-challenges.json'), 'utf8'));

class Element {
  constructor() {
    this._textContent = '';
    this.hidden = false;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.value = '';
    this.href = '';
    this.open = false;
    this.classNames = new Set();
    this.classList = {
      add: name => this.classNames.add(name),
      remove: name => this.classNames.delete(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classNames.has(name) : force;
        if (shouldAdd) this.classNames.add(name);
        else this.classNames.delete(name);
        return shouldAdd;
      }
    };
  }
  get textContent() { return this._textContent; }
  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  click() {
    if (!this.disabled && !this.hidden) this.listeners.click?.();
  }
}

async function setup(date, storage = new Map(), options = {}) {
  const elements = new Map();
  const pageIds = new Set(options.homePage
    ? ['daily-home-status', 'daily-home-title', 'daily-home-description', 'daily-home-cta']
    : [
      'daily-loading', 'daily-unavailable', 'daily-unavailable-copy', 'daily-error',
      'daily-error-copy', 'daily-welcome', 'daily-date', 'daily-streak', 'daily-title',
      'daily-description', 'daily-welcome-status', 'daily-start', 'daily-game',
      'daily-question-count', 'daily-score', 'daily-progress', 'daily-progress-fill',
      'daily-category', 'daily-difficulty', 'daily-question', 'daily-answers',
      'daily-feedback', 'daily-feedback-title', 'daily-explanation', 'daily-continue',
      'daily-results', 'daily-result-score', 'daily-result-heading', 'daily-result-message',
      'daily-result-stats', 'daily-review-list', 'daily-share', 'daily-share-status',
      'daily-share-dialog', 'daily-share-close', 'daily-share-whatsapp', 'daily-share-facebook',
      'daily-share-device', 'daily-share-copy'
    ]);
  const document = {
    getElementById(id) {
      if (!pageIds.has(id)) return null;
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : [`${date}T23:59:30.000Z`]));
    }
    static now() { return new NativeDate(`${date}T23:59:30.000Z`).valueOf(); }
  }
  const errors = [];
  const navigator = options.navigator || { clipboard: { writeText: async () => {} } };
  vm.runInNewContext(script, {
    document,
    Date: FixedDate,
    Intl,
    URL,
    URLSearchParams,
    location: { origin: 'https://the-quiz-club.com', pathname: '/daily' },
    console: { error: (...args) => errors.push(args) },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value)
    },
    navigator,
    fetch: async () => ({
      ok: options.responseOk !== false,
      status: 500,
      json: async () => options.data || bank
    })
  });
  await new Promise(resolve => setImmediate(resolve));
  return { elements, errors, storage };
}

function answerCurrentQuestion(elements, item, correct = true) {
  const desired = correct ? item.correct : (item.correct + 1) % 4;
  const button = elements.get('daily-answers').children.find(child =>
    Number(child.dataset.answerIndex) === desired);
  assert.ok(button, `missing answer button for ${item.id}`);
  button.click();
  return desired;
}

function playDay(elements, day, wrongQuestion = -1) {
  elements.get('daily-start').click();
  for (let index = 0; index < 5; index++) {
    const item = day.questions[index];
    answerCurrentQuestion(elements, item, index !== wrongQuestion);
    assert.ok(elements.get('daily-answers').children.every(button => button.disabled));
    assert.equal(elements.get('daily-feedback').hidden, false);
    assert.equal(elements.get('daily-explanation').textContent, item.explanation);
    elements.get('daily-continue').click();
  }
}

test('daily bank contains valid consecutive challenges with the required difficulty progression', () => {
  assert.equal(bank.length, 7);
  const ids = new Set();
  const dates = new Set();
  const expectedDifficulties = ['Easy', 'Medium', 'Medium', 'Hard', 'Expert'];
  for (const challenge of bank) {
    assert.match(challenge.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!dates.has(challenge.date), `duplicate date: ${challenge.date}`);
    dates.add(challenge.date);
    assert.ok(['mixed', 'themed'].includes(challenge.type));
    assert.ok(challenge.title.trim() && challenge.description.trim());
    assert.equal(challenge.questions.length, 5, challenge.date);
    assert.deepEqual(challenge.questions.map(question => question.difficulty), expectedDifficulties);
    assert.equal(new Set(challenge.questions.map(question => question.id)).size, 5);
    for (const question of challenge.questions) {
      assert.ok(!ids.has(question.id), `duplicate question id: ${question.id}`);
      ids.add(question.id);
      assert.equal(question.answers.length, 4, question.id);
      assert.equal(new Set(question.answers.map(answer => answer.toLowerCase())).size, 4, question.id);
      assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4);
      assert.ok(question.category && question.explanation);
    }
    if (challenge.type === 'mixed') {
      assert.equal(new Set(challenge.questions.map(question => question.category)).size, 5);
    }
  }
  const sortedDates = [...dates].sort();
  for (let index = 1; index < sortedDates.length; index++) {
    const previous = new Date(`${sortedDates[index - 1]}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() + 1);
    assert.equal(sortedDates[index], previous.toISOString().slice(0, 10));
  }
});

test('daily challenge scores answers, locks selections, saves completion, and prevents a second attempt', async () => {
  const storage = new Map();
  const { elements, errors } = await setup('2026-11-08', storage);
  const day = bank[0];
  assert.equal(elements.get('daily-welcome').hidden, false);
  assert.match(elements.get('daily-date').textContent, /2026/);
  playDay(elements, day, 1);
  assert.equal(elements.get('daily-result-score').textContent, '80');
  assert.equal(elements.get('daily-result-stats').textContent, '4 of 5 correct · 80% · 1 day streak');
  assert.equal(elements.get('daily-result-message').textContent, 'Excellent work!');
  assert.equal(elements.get('daily-review-list').children.length, 5);
  const saved = JSON.parse(storage.get('quizclub.daily.v1'));
  assert.equal(saved.progress['2026-11-08'].completed, true);
  assert.equal(saved.progress['2026-11-08'].score, 80);
  assert.deepEqual(saved.history, [{ date: '2026-11-08', score: 80 }]);
  assert.equal(errors.length, 0);

  const replay = await setup('2026-11-08', storage);
  replay.elements.get('daily-start').click();
  assert.equal(replay.elements.get('daily-results').hidden, false);
  assert.equal(replay.elements.get('daily-result-score').textContent, '80');
  const afterReplay = JSON.parse(storage.get('quizclub.daily.v1'));
  assert.equal(afterReplay.history.length, 1);
  assert.equal(afterReplay.streak, 1);
});

test('a fresh challenge starts at question 1 and inconsistent saved progress cannot skip unanswered questions', async () => {
  const fresh = await setup('2026-11-08');
  fresh.elements.get('daily-start').click();
  assert.equal(fresh.elements.get('daily-question-count').textContent, 'Question 1 of 5');

  const storage = new Map([['quizclub.daily.v1', JSON.stringify({
    version: 1,
    progress: {
      '2026-11-08': { index: 1, answers: [null, null, null, null, null], completed: false, score: null }
    },
    streak: 0,
    lastCompletedDate: null,
    history: []
  })]]);
  const recovered = await setup('2026-11-08', storage);
  recovered.elements.get('daily-start').click();
  assert.equal(recovered.elements.get('daily-question-count').textContent, 'Question 1 of 5');
  assert.equal(JSON.parse(storage.get('quizclub.daily.v1')).progress['2026-11-08'].index, 0);
});

test('unfinished challenge resumes at the saved question and keeps the submitted answer locked', async () => {
  const storage = new Map();
  const first = await setup('2026-11-09', storage);
  first.elements.get('daily-start').click();
  const day = bank[1];
  answerCurrentQuestion(first.elements, day.questions[0]);
  first.elements.get('daily-continue').click();
  answerCurrentQuestion(first.elements, day.questions[1], false);

  const resumed = await setup('2026-11-09', storage);
  assert.equal(resumed.elements.get('daily-welcome-status').textContent,
    'Your progress is saved. Resume at Question 2 of 5.');
  assert.equal(resumed.elements.get('daily-start').textContent, 'Resume at Question 2');
  resumed.elements.get('daily-start').click();
  assert.equal(resumed.elements.get('daily-question').textContent, day.questions[1].question);
  assert.equal(resumed.elements.get('daily-feedback').hidden, false);
  assert.ok(resumed.elements.get('daily-answers').children.every(button => button.disabled));
  resumed.elements.get('daily-continue').click();
  assert.equal(resumed.elements.get('daily-question').textContent, day.questions[2].question);

  const homepage = await setup('2026-11-09', storage, { homePage: true });
  assert.match(homepage.elements.get('daily-home-status').textContent, /resume at Question 3 of 5/);
  assert.equal(homepage.elements.get('daily-home-cta').textContent, 'Resume at Question 3');
});

test('streak increases on consecutive UTC dates and resets after a missed day', async () => {
  const storage = new Map();
  let session = await setup('2026-11-08', storage);
  playDay(session.elements, bank[0]);
  session = await setup('2026-11-09', storage);
  playDay(session.elements, bank[1]);
  assert.match(session.elements.get('daily-result-stats').textContent, /2 day streak/);

  session = await setup('2026-11-11', storage);
  playDay(session.elements, bank[3]);
  assert.match(session.elements.get('daily-result-stats').textContent, /1 day streak/);
  const saved = JSON.parse(storage.get('quizclub.daily.v1'));
  assert.equal(saved.streak, 1);
  assert.equal(saved.lastCompletedDate, '2026-11-11');
});

test('missing dates show an unavailable state instead of reusing an old challenge', async () => {
  const { elements, errors } = await setup('2026-11-15');
  assert.equal(elements.get('daily-unavailable').hidden, false);
  assert.match(elements.get('daily-unavailable-copy').textContent, /Sunday, November 15, 2026/);
  assert.equal(elements.get('daily-welcome').hidden, true);
  assert.equal(errors.length, 0);
});

test('homepage shows today’s title and updates to completed score and streak', async () => {
  const storage = new Map();
  let home = await setup('2026-11-08', storage, { homePage: true });
  assert.equal(home.elements.get('daily-home-title').textContent, bank[0].title);
  assert.equal(home.elements.get('daily-home-cta').textContent, 'Start today’s challenge');
  assert.match(home.elements.get('daily-home-status').textContent, /5 questions/);

  const game = await setup('2026-11-08', storage);
  playDay(game.elements, bank[0]);
  home = await setup('2026-11-08', storage, { homePage: true });
  assert.match(home.elements.get('daily-home-status').textContent, /Completed · 100\/100 points · 1 day streak/);
  assert.equal(home.elements.get('daily-home-cta').textContent, 'Review today’s results');
});

test('share uses native sharing when available and clipboard fallback otherwise', async () => {
  const nativeCalls = [];
  const native = await setup('2026-11-08', new Map(), {
    navigator: { share: async payload => nativeCalls.push(payload) }
  });
  playDay(native.elements, bank[0]);
  await native.elements.get('daily-share').listeners.click();
  assert.equal(native.elements.get('daily-share-dialog').open, true);
  await native.elements.get('daily-share-device').listeners.click();
  assert.match(nativeCalls[0].text, /100\/100/);
  assert.equal(native.elements.get('daily-share-dialog').open, false);

  let clipboardText = '';
  const fallback = await setup('2026-11-08', new Map(), {
    navigator: { clipboard: { writeText: async text => { clipboardText = text; } } }
  });
  playDay(fallback.elements, bank[0]);
  await fallback.elements.get('daily-share').listeners.click();
  assert.equal(fallback.elements.get('daily-share-device').hidden, true);
  await fallback.elements.get('daily-share-copy').listeners.click();
  assert.match(clipboardText, /100\/100/);
  assert.match(fallback.elements.get('daily-share-status').textContent, /copied/);
});

test('share dialog contains WhatsApp and Facebook options without separate result buttons', async () => {
  const { elements } = await setup('2026-11-08');
  playDay(elements, bank[0], 2);
  elements.get('daily-share').click();
  assert.equal(elements.get('daily-share-dialog').open, true);

  const whatsapp = new URL(elements.get('daily-share-whatsapp').href);
  assert.equal(whatsapp.origin, 'https://wa.me');
  assert.match(whatsapp.searchParams.get('text'), /80\/100/);
  assert.match(whatsapp.searchParams.get('text'), /https:\/\/the-quiz-club\.com\/daily/);

  const facebook = new URL(elements.get('daily-share-facebook').href);
  assert.equal(facebook.origin, 'https://www.facebook.com');
  assert.equal(facebook.pathname, '/sharer/sharer.php');
  assert.equal(facebook.searchParams.get('u'), 'https://the-quiz-club.com/daily');
  assert.match(facebook.searchParams.get('quote'), /80\/100/);
  const html = fs.readFileSync(path.join(root, 'daily.html'), 'utf8');
  assert.match(html, /id="daily-share-whatsapp"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /id="daily-share-facebook"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /<dialog id="daily-share-dialog"/);
  assert.equal((html.match(/class="button button-whatsapp"/g) || []).length, 0);
  assert.equal((html.match(/class="button button-facebook"/g) || []).length, 0);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
});
