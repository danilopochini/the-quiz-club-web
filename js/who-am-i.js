(() => {
  const length = 10;
  const storageKey = 'quiz-club-who-am-i-v1';
  const categories = [
    ['historical-figures', 'Historical Figures', 'history'],
    ['scientists-inventors', 'Scientists & Inventors', 'science-nature'],
    ['movies-entertainment', 'Movies & Entertainment', 'movies-television'],
    ['sports-legends', 'Sports Legends', 'sports'],
    ['fictional-characters', 'Fictional Characters', 'art-literature'],
    ['famous-people', 'Famous People', 'people-places'],
    ['mixed', 'Mixed Mysteries', 'general-knowledge']
  ];
  const ids = ['loading', 'load-error', 'retry', 'storage-warning', 'categories', 'categories-title',
    'category-grid', 'category-message', 'saved-game', 'saved-game-message', 'resume-game', 'game-categories',
    'game', 'round-count', 'score', 'progress', 'progress-fill',
    'category-name', 'question', 'points', 'clues', 'guess-form', 'guess', 'submit', 'feedback',
    'feedback-title', 'explanation', 'sources', 'reveal', 'next', 'results', 'result-score',
    'result-title', 'result-summary', 'result-breakdown', 'result-best', 'play-again', 'choose-category', 'review'];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const categoryIds = new Set(categories.slice(0, -1).map(category => category[0]));
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/['’‘.]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  let bank = [];
  let byId = new Map();
  let store = { version: 1, bests: {}, previous: {}, completed: [], active: null };
  let state = null;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function validateBank(data) {
    if (!Array.isArray(data)) throw new Error('Mystery bank must be an array.');
    const seenIds = new Set();
    const seenNames = new Set();
    for (const item of data) {
      if (!item || !text(item.id) || seenIds.has(item.id) || !categoryIds.has(item.category) ||
          !['real_person', 'fictional_character'].includes(item.type) ||
          (item.category === 'fictional-characters') !== (item.type === 'fictional_character') ||
          !text(item.answer) || !normalize(item.answer) || seenNames.has(normalize(item.answer)) ||
          !Array.isArray(item.acceptedAnswers) || !item.acceptedAnswers.length ||
          !item.acceptedAnswers.every(answer => text(answer) && normalize(answer)) ||
          !item.acceptedAnswers.some(answer => normalize(answer) === normalize(item.answer)) ||
          !Array.isArray(item.clues) || item.clues.length !== 5 || !item.clues.every(text) ||
          !text(item.explanation) || !Array.isArray(item.sources) || !item.sources.length ||
          !item.sources.every(source => source && text(source.name) && /^https:\/\/[^\s]+$/.test(source.url))) {
        throw new Error(`Invalid or duplicate mystery: ${item && item.id}`);
      }
      seenIds.add(item.id);
      seenNames.add(normalize(item.answer));
    }
    return data;
  }

  function warning(error) {
    console.error('Who Am I? storage error:', error);
    el['storage-warning'].textContent = 'Your progress and personal bests could not be saved or loaded on this device.';
    el['storage-warning'].hidden = false;
  }

  function validState(value) {
    if (!value || !categories.some(c => c[0] === value.category) ||
        !Array.isArray(value.ids) || value.ids.length !== length ||
        new Set(value.ids).size !== length || !value.ids.every(id => byId.has(id)) ||
        !Array.isArray(value.rounds) || value.rounds.length < 1 || value.rounds.length > length ||
        typeof value.completed !== 'boolean') return false;
    if (value.category === 'mixed') {
      if (new Set(value.ids.map(id => byId.get(id).category)).size !== categoryIds.size) return false;
    } else if (value.ids.some(id => byId.get(id).category !== value.category)) return false;
    if (value.completed && value.rounds.length !== length) return false;
    return value.rounds.every((round, index) => {
      if (!round || !Number.isInteger(round.clue) || round.clue < 0 || round.clue > 4 ||
          !Array.isArray(round.guesses) || !round.guesses.every(guess => guess === null || text(guess)) ||
          !['guess', 'incorrect', 'solved', 'failed'].includes(round.phase)) return false;
      const answers = byId.get(value.ids[index]).acceptedAnswers.map(normalize);
      const correct = round.guesses.map(guess => guess !== null && answers.includes(normalize(guess)));
      const last = correct[correct.length - 1] === true;
      if (correct.slice(0, -1).some(Boolean)) return false;
      if (round.phase === 'guess' && (round.guesses.length !== round.clue || correct.some(Boolean))) return false;
      if (round.phase === 'incorrect' && (round.guesses.length !== round.clue + 1 || round.clue === 4 || !text(round.guesses.at(-1)) || last)) return false;
      if (round.phase === 'solved' && (round.guesses.length !== round.clue + 1 || !last)) return false;
      if (round.phase === 'failed' && (round.clue !== 4 || round.guesses.length !== 5 || !text(round.guesses.at(-1)) || last)) return false;
      if ((index < value.rounds.length - 1 || value.completed) && !['solved', 'failed'].includes(round.phase)) return false;
      return true;
    });
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !saved.bests || typeof saved.bests !== 'object' ||
          !saved.previous || typeof saved.previous !== 'object' || !Array.isArray(saved.completed) ||
          (saved.active !== null && !validState(saved.active))) throw new Error('Invalid saved game data.');
      for (const [key, best] of Object.entries(saved.bests)) {
        if (!categories.some(c => c[0] === key) || !Number.isInteger(best) || best < 0 || best > 50) throw new Error('Invalid personal best.');
      }
      for (const [key, previous] of Object.entries(saved.previous)) {
        if (!categories.some(c => c[0] === key) || !Array.isArray(previous) || !previous.every(text)) throw new Error('Invalid replay history.');
      }
      store = saved;
      state = saved.active;
    } catch (error) {
      warning(error);
    }
  }

  function save() {
    store.active = state;
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (error) {
      warning(error);
    }
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function showCategories(focus = false) {
    el.game.hidden = true;
    el.results.hidden = true;
    el.categories.hidden = false;
    el['category-message'].hidden = true;
    el['saved-game'].hidden = !state;
    if (state) {
      const name = categories.find(category => category[0] === state.category)[1];
      el['saved-game-message'].textContent = state.completed
        ? `Your ${name} results are available.`
        : `Your ${name} game is saved. Starting another category will replace it.`;
      el['resume-game'].textContent = state.completed ? 'View Results →' : 'Resume Game →';
    }
    el['category-grid'].replaceChildren();
    for (const [id, name, image] of categories) {
      const pool = id === 'mixed' ? bank : bank.filter(item => item.category === id);
      const ready = pool.length >= length && (id !== 'mixed' || categoryIds.size === new Set(pool.map(item => item.category)).size);
      const button = element('button', 'category-card higher-category cat-lavender');
      button.type = 'button';
      const art = element('span', 'cat-art');
      art.setAttribute('aria-hidden', 'true');
      art.style.backgroundImage = `url("assets/images/categories/${image}.jpg")`;
      const best = store.bests[id];
      button.append(element('span', 'cat-number', 'THE MYSTERY'), art, element('span', 'cat-name', name),
        element('span', 'cat-description', !ready ? 'More mysteries coming soon' : best === undefined ? 'No personal best yet' : `Personal best: ${best} / 50`));
      if (ready) {
        const arrow = element('span', 'cat-arrow', '↗');
        arrow.setAttribute('aria-hidden', 'true');
        button.append(arrow);
      }
      button.addEventListener('click', () => start(id));
      el['category-grid'].append(button);
    }
    if (focus) el['categories-title'].focus();
  }

  function start(category) {
    const pool = category === 'mixed' ? bank : bank.filter(item => item.category === category);
    if (pool.length < length || (category === 'mixed' && new Set(pool.map(item => item.category)).size !== categoryIds.size)) {
      el['category-message'].textContent = 'More mysteries are being added to this category. Please choose another one.';
      el['category-message'].hidden = false;
      return;
    }
    const last = new Set(store.previous[category] || []);
    const sorted = items => {
      const shuffled = shuffle(items);
      return [...shuffled.filter(item => !last.has(item.id)), ...shuffled.filter(item => last.has(item.id))];
    };
    let selected = [];
    if (category === 'mixed') {
      selected = [...categoryIds].map(id => sorted(pool.filter(item => item.category === id))[0]);
    }
    const chosen = new Set(selected.map(item => item.id));
    selected.push(...sorted(pool.filter(item => !chosen.has(item.id))).slice(0, length - selected.length));
    state = { category, ids: shuffle(selected).map(item => item.id), rounds: [{ clue: 0, guesses: [], phase: 'guess' }], completed: false };
    store.previous[category] = [...state.ids];
    save();
    clearCategoryAnchor();
    renderGame(true);
  }

  function clearCategoryAnchor() {
    if (location.hash === '#categories') history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  function points(round) {
    return round.phase === 'solved' ? 5 - round.clue : 0;
  }

  function score() {
    return state.rounds.reduce((sum, round) => sum + points(round), 0);
  }

  function renderGame(focus = false) {
    const index = state.rounds.length - 1;
    const round = state.rounds[index];
    const item = byId.get(state.ids[index]);
    el.categories.hidden = true;
    el.results.hidden = true;
    el.game.hidden = false;
    el['round-count'].textContent = `Mystery ${index + 1} of ${length}`;
    el.score.textContent = score();
    const completed = index + Number(['solved', 'failed'].includes(round.phase));
    el.progress.setAttribute('aria-valuenow', completed);
    el.progress.setAttribute('aria-valuetext', `${completed} of ${length} mysteries completed`);
    el['progress-fill'].style.width = `${completed * 10}%`;
    el['category-name'].textContent = categories.find(c => c[0] === item.category)[1];
    el.question.textContent = item.type === 'fictional_character' ? 'Can you identify this character?' : 'Can you identify this person?';
    el.points.textContent = round.phase === 'guess' || round.phase === 'incorrect'
      ? `${5 - round.clue} ${5 - round.clue === 1 ? 'point' : 'points'} available · Clue ${round.clue + 1} of 5`
      : `${points(round)} ${points(round) === 1 ? 'point' : 'points'} earned`;
    el.clues.replaceChildren(...item.clues.slice(0, round.clue + 1).map((clue, clueIndex) => {
      const row = element('li', '', clue);
      if (round.guesses[clueIndex]) row.append(element('small', 'mystery-previous-guess', `Your guess: ${round.guesses[clueIndex]}`));
      return row;
    }));
    el.guess.value = '';
    el.guess.disabled = round.phase !== 'guess';
    el.submit.disabled = round.phase !== 'guess';
    el.feedback.hidden = round.phase === 'guess';
    el.feedback.classList.toggle('is-incorrect', round.phase === 'incorrect' || round.phase === 'failed');
    el.reveal.hidden = round.clue === 4 || !['guess', 'incorrect'].includes(round.phase);
    el.reveal.textContent = `Reveal next clue (${4 - round.clue} ${4 - round.clue === 1 ? 'point' : 'points'}) →`;
    el.next.hidden = !['solved', 'failed'].includes(round.phase);
    el.explanation.textContent = '';
    el.sources.replaceChildren();
    if (round.phase === 'incorrect') {
      el['feedback-title'].textContent = 'Not quite. Reveal the next clue and try again.';
    } else if (round.phase === 'solved' || round.phase === 'failed') {
      el['feedback-title'].textContent = round.phase === 'solved' ? `That's right! ${item.answer}.` : `The answer was ${item.answer}.`;
      el.explanation.textContent = item.explanation;
      el.sources.append(element('span', '', 'Source: '));
      item.sources.forEach((source, i) => {
        if (i) el.sources.append(element('span', '', ' · '));
        const link = element('a', '', source.name);
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        el.sources.append(link);
      });
    }
    if (focus) el.question.focus();
  }

  function submitGuess(event) {
    event.preventDefault();
    const round = state.rounds.at(-1);
    if (round.phase !== 'guess') return;
    const guess = el.guess.value.trim();
    if (!normalize(guess)) {
      el.feedback.hidden = false;
      el['feedback-title'].textContent = 'Please enter a name before submitting your guess.';
      return;
    }
    const item = byId.get(state.ids[state.rounds.length - 1]);
    round.guesses.push(guess);
    round.phase = item.acceptedAnswers.some(answer => normalize(answer) === normalize(guess))
      ? 'solved' : round.clue === 4 ? 'failed' : 'incorrect';
    save();
    renderGame();
  }

  function complete() {
    if (!state.completed) {
      state.completed = true;
      const total = score();
      store.bests[state.category] = Math.max(store.bests[state.category] || 0, total);
      store.completed.push({ category: state.category, score: total, ids: [...state.ids], completedAt: new Date().toISOString() });
      save();
    }
    showResults(true);
  }

  function showResults(focus = false) {
    const total = score();
    const solved = state.rounds.filter(round => round.phase === 'solved').length;
    el.game.hidden = true;
    el.categories.hidden = true;
    el.results.hidden = false;
    el['result-score'].textContent = total;
    el['result-title'].textContent = total >= 45 ? 'Master Detective!' : total >= 35 ? 'Brilliant deduction!' :
      total >= 25 ? 'A keen eye for clues!' : total >= 15 ? "You're getting warmer!" : 'The mysteries got the better of you!';
    el['result-summary'].textContent = `${total} / 50 points · ${total * 2}%`;
    el['result-breakdown'].textContent = `${solved} identified · ${length - solved} not identified · ${(total / length).toFixed(1)} points per mystery`;
    el['result-best'].textContent = `Personal best: ${store.bests[state.category]} / 50`;
    el.review.replaceChildren();
    state.rounds.forEach((round, index) => {
      const item = byId.get(state.ids[index]);
      const row = element('article', 'review-item');
      row.append(element('h4', '', `${index + 1}. ${item.answer}`),
        element('p', '', `${round.phase === 'solved' ? 'Solved' : 'Not solved'} · ${round.clue + 1} ${round.clue === 0 ? 'clue' : 'clues'} · ${points(round)} ${points(round) === 1 ? 'point' : 'points'}`));
      const clues = element('ol', 'mystery-review-clues');
      clues.append(...item.clues.map(clue => element('li', '', clue)));
      row.append(clues, element('p', '', item.explanation));
      el.review.append(row);
    });
    if (focus) el['result-title'].focus();
  }

  async function load() {
    el.loading.hidden = false;
    el['load-error'].hidden = true;
    try {
      const response = await fetch('data/who-am-i.json');
      if (!response.ok) throw new Error(`Mystery bank request failed (${response.status}).`);
      bank = validateBank(await response.json());
      byId = new Map(bank.map(item => [item.id, item]));
      readStore();
      el.loading.hidden = true;
      if (location.hash === '#categories') showCategories();
      else if (state && state.completed) showResults();
      else if (state) renderGame();
      else showCategories();
    } catch (error) {
      console.error('Unable to load Who Am I?:', error);
      el.loading.hidden = true;
      el['load-error'].hidden = false;
    }
  }

  el['guess-form'].addEventListener('submit', submitGuess);
  el.reveal.addEventListener('click', () => {
    const round = state.rounds.at(-1);
    if (round.clue === 4 || !['guess', 'incorrect'].includes(round.phase)) return;
    if (round.phase === 'guess') round.guesses.push(null);
    round.clue++;
    round.phase = 'guess';
    save();
    renderGame();
    el.guess.focus();
  });
  el.next.addEventListener('click', () => {
    if (!['solved', 'failed'].includes(state.rounds.at(-1).phase)) return;
    if (state.rounds.length === length) complete();
    else {
      state.rounds.push({ clue: 0, guesses: [], phase: 'guess' });
      save();
      renderGame(true);
    }
  });
  el['play-again'].addEventListener('click', () => start(state.category));
  el['game-categories'].addEventListener('click', () => showCategories(true));
  el['resume-game'].addEventListener('click', () => {
    if (!state) return;
    clearCategoryAnchor();
    if (state.completed) showResults(true);
    else renderGame(true);
  });
  el['choose-category'].addEventListener('click', () => {
    state = null;
    save();
    showCategories(true);
  });
  el.retry.addEventListener('click', load);
  load();
})();
