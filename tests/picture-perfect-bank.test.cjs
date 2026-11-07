const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'picture-perfect-geography.json'), 'utf8'));

test('Picture Perfect has 50 unique, fully attributed questions and local JPEGs', () => {
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(item => item.id)).size, questions.length);
  assert.equal(new Set(questions.map(item => item.question)).size, questions.length);
  const difficulties = { Easy: 0, Medium: 0, Hard: 0 };
  for (const item of questions) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    for (const field of ['question', 'imageAlt', 'explanation', 'topic']) {
      assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.id}: ${field}`);
    }
    assert.equal(item.answers.length, 4, item.id);
    assert.ok(item.answers.every(answer => typeof answer === 'string' && answer.trim()), item.id);
    assert.equal(new Set(item.answers.map(answer => answer.trim().toLowerCase())).size, 4, item.id);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, item.id);
    assert.ok(Object.hasOwn(difficulties, item.difficulty), item.id);
    difficulties[item.difficulty]++;
    assert.equal(item.image, `assets/images/picture-perfect/geography/${item.id}.jpg`);
    const image = fs.readFileSync(path.join(root, ...item.image.split('/')));
    assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff], item.id);
    assert.ok(item.attribution.author.trim() && item.attribution.license.trim(), item.id);
    assert.match(item.attribution.source, /^https:\/\/commons\.wikimedia\.org\//);
    assert.match(item.attribution.licenseUrl, /^https:\/\//);
  }
  assert.deepEqual(difficulties, { Easy: 15, Medium: 20, Hard: 15 });
});

test('homepage links to the Picture Perfect game', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(homepage, /href="picture-perfect\.html"/);
  assert.ok(fs.existsSync(path.join(root, 'picture-perfect.html')));
});
