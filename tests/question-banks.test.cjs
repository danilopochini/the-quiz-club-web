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
    assert.ok(bank.length >= 40, `${category} needs at least 40 questions`);
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
      assert.ok(bank.some(item => item.difficulty === difficulty), `${category} missing ${difficulty}`);
    }
  }
});

test('homepage and Explore link to each quiz and category artwork exists', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const explore = fs.readFileSync(path.join(root, 'explore.html'), 'utf8');
  for (const category of categories) {
    const link = `quiz.html?category=${category}`;
    assert.ok(homepage.includes(`href="${link}"`), `homepage missing ${category}`);
    assert.ok(explore.includes(`href="${link}"`), `Explore missing ${category}`);
    assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'categories', `${category}.jpg`)), `artwork missing for ${category}`);
  }
});
