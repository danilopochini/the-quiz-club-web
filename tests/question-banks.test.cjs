const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const categories = [
  'geography', 'movies-television', 'music', 'history', 'sports',
  'science-nature', 'art-literature', 'lifestyle-brands', 'people-places',
  'mathematics-logic', 'pop-culture', 'general-knowledge'
];

test('all category banks contain complete, unique questions', () => {
  for (const category of categories) {
    const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', `${category}.json`), 'utf8'));
    assert.ok(bank.length >= 100, `${category} needs at least 100 questions`);
    assert.equal(new Set(bank.map(item => item.question)).size, bank.length, `${category} has duplicate questions`);
    for (const item of bank) {
      assert.ok(typeof item.question === 'string' && item.question.trim(), category);
      assert.equal(item.answers.length, 4, item.question);
      assert.ok(item.answers.every(answer => typeof answer === 'string' && answer.trim()), item.question);
      assert.equal(new Set(item.answers.map(answer => answer.trim().toLowerCase())).size, 4, item.question);
      assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, item.question);
      assert.ok(typeof item.explanation === 'string' && item.explanation.trim(), item.question);
      assert.ok(['Easy', 'Medium', 'Hard'].includes(item.difficulty), item.question);
    }
    for (const difficulty of ['Easy', 'Medium', 'Hard']) {
      assert.ok(bank.filter(item => item.difficulty === difficulty).length >= 11, `${category} needs at least 11 ${difficulty} questions`);
    }
  }
});

test('Olympic host questions do not include a city in the prompt', () => {
  const sports = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sports.json'), 'utf8'));
  const hostQuestions = sports.filter(item => /^Which (?:country|city) hosted the \d{4} (?:Summer|Winter) Olympics\b/i.test(item.question));
  assert.ok(hostQuestions.length > 0, 'expected Olympic host questions');
  for (const item of hostQuestions) {
    assert.match(item.question, /^Which (?:country|city) hosted the \d{4} (?:Summer|Winter) Olympics\?$/, item.question);
  }
});

test('quiz difficulty menu defaults to miscellaneous and offers every level', () => {
  const quiz = fs.readFileSync(path.join(root, 'quiz.html'), 'utf8');
  assert.match(quiz, /<label for="difficulty-select">Difficulty<\/label>/);
  assert.match(quiz, /<option value="Miscellaneous" selected>Miscellaneous<\/option>/);
  for (const level of ['Easy', 'Medium', 'Hard']) {
    assert.ok(quiz.includes(`<option value="${level}">${level}</option>`), `missing ${level} option`);
  }
});

test('homepage links to each quiz and category artwork exists', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const category of categories) {
    const link = `quiz.html?category=${category}`;
    assert.ok(homepage.includes(`href="${link}"`), `homepage missing ${category}`);
    assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'categories', `${category}.jpg`)), `artwork missing for ${category}`);
  }
});

test('homepage category and game-mode labels are not numbered', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [className, count] of [['cat-number', 12], ['mode-index', 4]]) {
    const labels = [...homepage.matchAll(new RegExp(`<span class="${className}">([^<]+)</span>`, 'g'))];
    assert.equal(labels.length, count, className);
    for (const [, label] of labels) assert.doesNotMatch(label, /^\s*\d+\s*\/\s*/, label);
  }
});

test('game-mode cards use local photographs and retain their availability', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css', 'home.css'), 'utf8');
  for (const mode of ['classic', 'picture', 'higher', 'mystery']) {
    const card = homepage.match(new RegExp(`<article class="mode-card mode-${mode}">([\\s\\S]*?)</article>`));
    assert.ok(card, `missing ${mode} card`);
    assert.match(card[1], /class="mode-art" aria-hidden="true"/);
    assert.ok(styles.includes(`../assets/images/game-modes/${mode}.jpg`), `missing ${mode} image reference`);
    assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'game-modes', `${mode}.jpg`)), `missing ${mode} image`);
    if (mode !== 'classic') {
      const links = { picture: /href="picture-perfect\.html"/, higher: /href="higher-lower\.html"/, mystery: /href="who-am-i\.html"/ };
      assert.match(card[1], links[mode]);
      assert.match(card[1], /class="mode-arrow" aria-hidden="true"/);
      if (mode !== 'picture') assert.match(card[1], /AVAILABLE NOW/);
    } else {
      assert.doesNotMatch(card[1], /<a\b/);
      assert.match(card[1], /AVAILABLE NOW/);
    }
  }
});

test('quiz return links point to the homepage categories', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const quiz = fs.readFileSync(path.join(root, 'quiz.html'), 'utf8');
  assert.match(homepage, /id="categories"/);
  assert.match(quiz, /class="quiz-back" href="index\.html#categories"/);
  assert.match(quiz, /class="button result-back" href="index\.html#categories"/);
});

test('site pages and scripts do not reference the removed category directory', () => {
  const files = ['index.html', 'quiz.html', 'daily.html', 'about.html', 'geography.html', 'js/navigation.js', 'js/quiz.js'];
  assert.equal(fs.existsSync(path.join(root, 'explore.html')), false);
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /explore\.html/i, file);
  }
});
