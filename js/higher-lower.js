(() => {
  const gameLength = 10;
  const storageKey = 'quiz-club-higher-lower-bests-v1';
  const historyKey = 'quiz-club-higher-lower-previous-v1';
  const categories = [
    ['geography', 'Geography', 'cat-yellow', 'THE WORLD'],
    ['movies-television', 'Movies & Television', 'cat-lavender', 'SCREEN TIME'],
    ['music', 'Music', 'cat-coral', 'TURN IT UP'],
    ['history', 'History', 'cat-mint', 'WAY BACK'],
    ['sports', 'Sports', 'cat-blue', 'GAME ON'],
    ['science-nature', 'Science & Nature', 'cat-peach', 'GET CURIOUS'],
    ['art-literature', 'Art & Literature', 'cat-pink', 'THE CREATIVE'],
    ['lifestyle-brands', 'Lifestyle & Brands', 'cat-yellow', 'EVERYDAY ICONS'],
    ['people-places', 'People & Places', 'cat-lavender', 'OUT & ABOUT'],
    ['mathematics-logic', 'Mathematics & Logic', 'cat-mint', 'THINK IT OVER'],
    ['pop-culture', 'Pop Culture', 'cat-peach', 'IN THE KNOW'],
    ['general-knowledge', 'General Knowledge', 'cat-blue', 'A BIT OF IT ALL']
  ];
  const fields = ['loading', 'load-error', 'retry', 'storage-warning', 'categories', 'category-grid',
    'categories-title', 'category-message', 'game', 'question-count', 'score', 'progress', 'progress-fill',
    'category-name', 'question', 'metric', 'left-name', 'left-value', 'right-name', 'right-value',
    'left-image', 'left-image-credit', 'left-image-error', 'right-image', 'right-image-credit', 'right-image-error',
    'higher', 'lower', 'feedback', 'feedback-title', 'explanation', 'source', 'reference-year', 'next',
    'results', 'result-ring-score', 'result-title', 'result-summary', 'result-breakdown', 'result-best',
    'play-again', 'choose-category', 'review'];
  const el = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  const categoryIds = new Set(categories.map(category => category[0]));
  const previous = new Map();
  let bank = [];
  let bests = {};
  let category = '';
  let selected = [];
  let history = [];
  let index = 0;
  let score = 0;
  let answered = false;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function validItem(item) {
    const text = value => typeof value === 'string' && value.trim().length > 0;
    const validImage = image => image && /^assets\/images\/(?:higher-lower|picture-perfect\/geography)\/[a-z0-9-]+\.(jpg|png)$/.test(image.path) &&
      text(image.alt) && text(image.creator) && text(image.license) &&
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(image.source) &&
      (!image.licenseUrl || /^https:\/\//.test(image.licenseUrl));
    return item && text(item.id) && categoryIds.has(item.category) && text(item.metric) &&
      text(item.question) && text(item.unit) && item.left && item.right &&
      text(item.left.name) && text(item.right.name) &&
      validImage(item.left.image) && validImage(item.right.image) &&
      item.left.name.trim().toLowerCase() !== item.right.name.trim().toLowerCase() &&
      Number.isFinite(item.left.value) && Number.isFinite(item.right.value) &&
      item.left.value !== item.right.value && text(item.explanation) && text(item.sourceName) &&
      typeof item.source === 'string' && /^https:\/\/[^\s]+$/.test(item.source) &&
      text(item.referenceYear);
  }

  function pairKey(item) {
    return JSON.stringify([item.category,
      ...[item.left.name.trim().toLowerCase(), item.right.name.trim().toLowerCase()].sort()]);
  }

  function selectMovieRound(pool, last = new Set()) {
    const subjectKey = subject => subject.name.trim().toLowerCase();
    const edges = pool.map(item => ({
      item, left: subjectKey(item.left), right: subjectKey(item.right), old: last.has(item.id)
    }));
    const subjects = [...new Set(edges.flatMap(edge => [edge.left, edge.right]))];
    if (subjects.length < gameLength * 2) return null;

    function find(available, needed, oldBudget, memo) {
      if (needed === 0) return [];
      if (available.size < needed * 2) return null;
      const state = `${[...available].sort().join('\u0000')}\u0001${needed}\u0001${oldBudget}`;
      if (memo.has(state)) return null;
      const candidates = edges.filter(edge => available.has(edge.left) && available.has(edge.right) &&
        (!edge.old || oldBudget > 0));
      const connected = new Set(candidates.flatMap(edge => [edge.left, edge.right]));
      if (connected.size < needed * 2) return null;
      let pivot;
      let choices;
      for (const subject of connected) {
        const adjacent = candidates.filter(edge => edge.left === subject || edge.right === subject);
        if (!choices || adjacent.length < choices.length) {
          pivot = subject;
          choices = adjacent;
        }
      }
      choices.sort((a, b) => Number(a.old) - Number(b.old));
      for (const edge of choices) {
        const remaining = new Set(available);
        remaining.delete(edge.left);
        remaining.delete(edge.right);
        const rest = find(remaining, needed - 1, oldBudget - Number(edge.old), memo);
        if (rest) return [edge.item, ...rest];
      }
      const remaining = new Set(available);
      remaining.delete(pivot);
      const skipped = find(remaining, needed, oldBudget, memo);
      if (skipped) return skipped;
      memo.add(state);
      return null;
    }

    for (let budget = 0; budget <= gameLength; budget++) {
      const result = find(new Set(subjects), gameLength, budget, new Set());
      if (result) return result;
    }
    return null;
  }

  function validateBank(data) {
    if (!Array.isArray(data)) throw new Error('Comparison bank must be an array.');
    const ids = new Set();
    const pairs = new Set();
    const result = [];
    for (const item of data) {
      if (!validItem(item)) {
        console.error('Invalid Higher or Lower comparison:', item);
        continue;
      }
      const key = pairKey(item);
      if (ids.has(item.id) || pairs.has(key)) {
        console.error('Duplicate Higher or Lower comparison:', item.id);
        continue;
      }
      ids.add(item.id);
      pairs.add(key);
      result.push(item);
    }
    return result;
  }

  function storageWarning(error) {
    console.error('Higher or Lower personal best storage failed:', error);
    el['storage-warning'].textContent = 'Personal bests and replay history could not be saved or loaded on this device.';
    el['storage-warning'].hidden = false;
  }

  function loadBests() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid personal best data.');
      for (const [key, value] of Object.entries(stored)) {
        if (categoryIds.has(key) && Number.isInteger(value) && value >= 0 && value <= gameLength) bests[key] = value;
      }
      const savedPrevious = JSON.parse(localStorage.getItem(historyKey) || '{}');
      if (!savedPrevious || typeof savedPrevious !== 'object' || Array.isArray(savedPrevious)) throw new Error('Invalid replay history.');
      for (const [key, value] of Object.entries(savedPrevious)) {
        if (categoryIds.has(key) && Array.isArray(value) && value.every(id => typeof id === 'string')) {
          previous.set(key, new Set(value));
        }
      }
    } catch (error) {
      storageWarning(error);
    }
  }

  function saveBest() {
    if (bests[category] !== undefined && score <= bests[category]) return;
    bests[category] = score;
    try {
      localStorage.setItem(storageKey, JSON.stringify(bests));
    } catch (error) {
      storageWarning(error);
    }
  }

  async function loadBank() {
    el.loading.hidden = false;
    el['load-error'].hidden = true;
    try {
      const response = await fetch('data/higher-lower.json');
      if (!response.ok) throw new Error(`Comparison bank request failed (${response.status}).`);
      bank = validateBank(await response.json());
      el.loading.hidden = true;
      showCategories(false);
    } catch (error) {
      console.error('Unable to load Higher or Lower:', error);
      el.loading.hidden = true;
      el['load-error'].hidden = false;
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showCategories(focus) {
    el.game.hidden = true;
    el.results.hidden = true;
    el.categories.hidden = false;
    el['category-message'].hidden = true;
    el['category-grid'].replaceChildren();
    for (const [id, name, color, label] of categories) {
      const pool = bank.filter(item => item.category === id);
      const available = pool.length >= gameLength &&
        (id !== 'movies-television' || selectMovieRound(pool) !== null);
      const button = makeElement('button', `category-card higher-category ${color}`);
      button.type = 'button';
      const art = makeElement('span', 'cat-art');
      art.setAttribute('aria-hidden', 'true');
      art.style.backgroundImage = `url("assets/images/categories/${id}.jpg")`;
      const best = bests[id] === undefined ? 'No personal best yet' : `Personal best: ${bests[id]} / 10`;
      button.append(makeElement('span', 'cat-number', label), art, makeElement('span', 'cat-name', name),
        makeElement('span', 'cat-description', available ? best : 'More comparisons coming soon'));
      const arrow = makeElement('span', 'cat-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      if (available) button.append(arrow);
      button.addEventListener('click', () => startGame(id));
      el['category-grid'].append(button);
    }
    if (focus) el['categories-title'].focus();
  }

  function startGame(id) {
    const pool = bank.filter(item => item.category === id);
    const last = previous.get(id) || new Set();
    const round = id === 'movies-television'
      ? selectMovieRound(shuffle(pool), last)
      : [...shuffle(pool.filter(item => !last.has(item.id))), ...shuffle(pool.filter(item => last.has(item.id)))].slice(0, gameLength);
    if (!round || round.length < gameLength) {
      el['category-message'].textContent = 'More comparisons are being added to this category. Please choose another one.';
      el['category-message'].hidden = false;
      return;
    }
    category = id;
    selected = shuffle(round).map(item => Math.random() < 0.5 ? item : { ...item, left: item.right, right: item.left });
    previous.set(id, new Set(selected.map(item => item.id)));
    try {
      localStorage.setItem(historyKey, JSON.stringify(Object.fromEntries(
        [...previous].map(([key, ids]) => [key, [...ids]])
      )));
    } catch (error) {
      storageWarning(error);
    }
    history = [];
    index = 0;
    score = 0;
    el.categories.hidden = true;
    el.results.hidden = true;
    el.game.hidden = false;
    renderQuestion();
    el.question.focus();
  }

  function formatValue(value, unit) {
    if (unit === 'year') return String(value);
    return `${new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value)} ${unit}`;
  }

  function updateProgress() {
    const completed = index + (answered ? 1 : 0);
    el['question-count'].textContent = `Comparison ${index + 1} of ${gameLength}`;
    el.score.textContent = score;
    el.progress.setAttribute('aria-valuenow', completed);
    el.progress.setAttribute('aria-valuetext', `${completed} of ${gameLength} comparisons answered`);
    el['progress-fill'].style.width = `${completed / gameLength * 100}%`;
  }

  function renderQuestion() {
    const item = selected[index];
    answered = false;
    el['category-name'].textContent = categories.find(entry => entry[0] === category)[1];
    el.question.textContent = item.question;
    el.metric.textContent = `${item.metric} · Is the second item's value higher or lower than the first?`;
    el['left-name'].textContent = item.left.name;
    el['right-name'].textContent = item.right.name;
    renderImage('left', item.left);
    renderImage('right', item.right);
    el['left-value'].textContent = formatValue(item.left.value, item.unit);
    el['right-value'].textContent = '?';
    for (const button of [el.higher, el.lower]) {
      button.disabled = false;
      button.classList.remove('correct', 'incorrect');
    }
    el.feedback.hidden = true;
    el.feedback.classList.remove('is-incorrect');
    el.next.hidden = true;
    updateProgress();
  }

  function renderImage(side, item) {
    const image = el[`${side}-image`];
    const credit = el[`${side}-image-credit`];
    const error = el[`${side}-image-error`];
    image.hidden = false;
    error.hidden = true;
    credit.replaceChildren();
    if (!item.image) {
      image.hidden = true;
      error.textContent = 'A subject image is not yet available.';
      error.hidden = false;
      return;
    }
    image.onerror = () => {
      console.error(`Unable to load Higher or Lower image: ${item.image.path}`);
      image.hidden = true;
      error.textContent = 'Image unavailable.';
      error.hidden = false;
    };
    image.alt = item.image.alt;
    image.src = item.image.path;
    const source = makeElement('a', '', item.image.creator);
    source.href = item.image.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    credit.append(`${item.image.alt}. Image: `, source, ` / ${item.image.license}`);
    if (item.image.licenseUrl) {
      const license = makeElement('a', '', ' licence');
      license.href = item.image.licenseUrl;
      license.target = '_blank';
      license.rel = 'noopener noreferrer';
      credit.append(license);
    }
    credit.append('. Image resized or converted for display.');
  }

  function answer(choice) {
    if (answered) return;
    answered = true;
    const item = selected[index];
    const correctAnswer = item.right.value > item.left.value ? 'higher' : 'lower';
    const correct = choice === correctAnswer;
    if (correct) score++;
    history.push({ item, choice, correctAnswer, correct });
    el['right-value'].textContent = formatValue(item.right.value, item.unit);
    for (const button of [el.higher, el.lower]) button.disabled = true;
    el[correctAnswer].classList.add('correct');
    if (!correct) el[choice].classList.add('incorrect');
    el.feedback.classList.toggle('is-incorrect', !correct);
    el['feedback-title'].textContent = correct ? 'That’s correct!' : `Not quite. The answer is ${correctAnswer.toUpperCase()}.`;
    el.explanation.textContent = item.explanation;
    el.source.href = item.source;
    el.source.textContent = item.sourceName;
    el['reference-year'].textContent = `(${item.referenceYear})`;
    el.feedback.hidden = false;
    el.next.textContent = index === gameLength - 1 ? 'See Results →' : 'Continue →';
    el.next.hidden = false;
    updateProgress();
    el.next.focus();
  }

  function showResults() {
    saveBest();
    el.game.hidden = true;
    el.results.hidden = false;
    el['result-ring-score'].textContent = score;
    el['result-ring-score'].parentElement.style.setProperty('--result-percent', `${score * 10}%`);
    el['result-title'].textContent = score === 10 ? 'Perfect! You know your numbers.' : score >= 8 ? 'Excellent work!' :
      score >= 6 ? 'Not bad! You know your stuff.' : score >= 4 ? 'Room for improvement!' : 'Those comparisons were tricky!';
    el['result-summary'].textContent = `You scored ${score} out of ${gameLength} — ${score * 10}%.`;
    el['result-breakdown'].textContent = `${score} correct · ${gameLength - score} incorrect`;
    el['result-best'].textContent = `Personal best: ${bests[category]} / ${gameLength}`;
    el.review.replaceChildren();
    history.forEach(({ item, choice, correctAnswer, correct }, position) => {
      const row = makeElement('article', 'review-item');
      row.append(makeElement('h4', '', `${position + 1}. ${item.left.name} vs ${item.right.name}`),
        makeElement('p', '', `${item.metric}: ${formatValue(item.left.value, item.unit)} vs ${formatValue(item.right.value, item.unit)}.`),
        makeElement('p', '', `Your answer: ${choice.toUpperCase()} · Correct answer: ${correctAnswer.toUpperCase()} · ${correct ? 'Correct' : 'Incorrect'}`),
        makeElement('p', '', item.explanation));
      const source = makeElement('a', '', item.sourceName);
      source.href = item.source;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      const credit = makeElement('small', '', 'Source: ');
      credit.append(source, ` (${item.referenceYear})`);
      row.append(credit);
      el.review.append(row);
    });
    el['result-title'].focus();
  }

  el.retry.addEventListener('click', loadBank);
  el.higher.addEventListener('click', () => answer('higher'));
  el.lower.addEventListener('click', () => answer('lower'));
  el.next.addEventListener('click', () => {
    if (!answered) return;
    if (index === gameLength - 1) showResults();
    else { index++; renderQuestion(); el.question.focus(); }
  });
  el['play-again'].addEventListener('click', () => startGame(category));
  el['choose-category'].addEventListener('click', () => showCategories(true));
  loadBests();
  loadBank();
})();
