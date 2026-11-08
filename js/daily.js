(() => {
  const storageKey = 'quizclub.daily.v1';
  const difficultyOrder = ['Easy', 'Medium', 'Medium', 'Hard', 'Expert'];
  const categoryNames = new Set([
    'Geography', 'Movies & Television', 'Music', 'History', 'Sports',
    'Science & Nature', 'Art & Literature', 'Lifestyle & Brands',
    'People & Places', 'Mathematics & Logic', 'Pop Culture', 'General Knowledge'
  ]);
  const page = document.getElementById('daily-loading');
  const home = document.getElementById('daily-home-status');
  if (!page && !home) return;

  const element = id => document.getElementById(id);
  const ui = {
    loading: page,
    unavailable: element('daily-unavailable'),
    unavailableCopy: element('daily-unavailable-copy'),
    error: element('daily-error'),
    errorCopy: element('daily-error-copy'),
    welcome: element('daily-welcome'),
    date: element('daily-date'),
    streak: element('daily-streak'),
    title: element('daily-title'),
    description: element('daily-description'),
    welcomeStatus: element('daily-welcome-status'),
    start: element('daily-start'),
    game: element('daily-game'),
    questionCount: element('daily-question-count'),
    score: element('daily-score'),
    progress: element('daily-progress'),
    progressFill: element('daily-progress-fill'),
    category: element('daily-category'),
    difficulty: element('daily-difficulty'),
    question: element('daily-question'),
    answers: element('daily-answers'),
    feedback: element('daily-feedback'),
    feedbackTitle: element('daily-feedback-title'),
    explanation: element('daily-explanation'),
    continue: element('daily-continue'),
    results: element('daily-results'),
    resultScore: element('daily-result-score'),
    resultMessage: element('daily-result-message'),
    resultStats: element('daily-result-stats'),
    reviewList: element('daily-review-list'),
    share: element('daily-share'),
    shareStatus: element('daily-share-status'),
    homeTitle: element('daily-home-title'),
    homeDescription: element('daily-home-description'),
    homeCta: element('daily-home-cta')
  };
  let challenges = [];
  let challenge = null;
  let store;
  let progress;
  let activeDate;

  function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }

  function validQuestion(question, index, ids) {
    if (!question || typeof question !== 'object') return false;
    if (typeof question.id !== 'string' || !question.id.trim() || ids.has(question.id)) return false;
    ids.add(question.id);
    return categoryNames.has(question.category) &&
      question.difficulty === difficultyOrder[index] &&
      typeof question.question === 'string' && question.question.trim() &&
      Array.isArray(question.answers) && question.answers.length === 4 &&
      question.answers.every(answer => typeof answer === 'string' && answer.trim()) &&
      new Set(question.answers.map(answer => answer.trim().toLowerCase())).size === 4 &&
      Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4 &&
      typeof question.explanation === 'string' && question.explanation.trim();
  }

  function validateChallenges(data) {
    if (!Array.isArray(data)) throw new Error('The Daily Challenge data must be an array.');
    const dates = new Set();
    const ids = new Set();
    for (const item of data) {
      if (!item || !isValidDate(item.date) || dates.has(item.date)) {
        throw new Error('The Daily Challenge data contains an invalid or duplicate date.');
      }
      dates.add(item.date);
      if (!['mixed', 'themed'].includes(item.type) ||
          typeof item.title !== 'string' || !item.title.trim() ||
          typeof item.description !== 'string' || !item.description.trim() ||
          !Array.isArray(item.questions) || item.questions.length !== 5 ||
          !item.questions.every((question, index) => validQuestion(question, index, ids))) {
        throw new Error(`The Daily Challenge for ${item.date} is incomplete or invalid.`);
      }
      if (item.type === 'mixed' &&
          new Set(item.questions.map(question => question.category)).size !== item.questions.length) {
        throw new Error(`The mixed challenge for ${item.date} repeats a category.`);
      }
    }
    return data;
  }

  function initialStore() {
    return { version: 1, progress: {}, streak: 0, lastCompletedDate: null, history: [] };
  }

  function validStore(value) {
    return value && value.version === 1 && value.progress && typeof value.progress === 'object' &&
      !Array.isArray(value.progress) && Number.isInteger(value.streak) && value.streak >= 0 &&
      (value.lastCompletedDate === null || isValidDate(value.lastCompletedDate)) &&
      Array.isArray(value.history) && value.history.every(entry =>
        entry && isValidDate(entry.date) && Number.isInteger(entry.score) &&
        entry.score >= 0 && entry.score <= 100);
  }

  function readStore() {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return initialStore();
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Saved Daily Challenge progress is not valid JSON: ${error.message}`);
    }
    if (!validStore(value)) throw new Error('Saved Daily Challenge progress has an invalid format.');
    return value;
  }

  function saveStore() {
    localStorage.setItem(storageKey, JSON.stringify(store));
  }

  function freshProgress() {
    return { index: 0, answers: Array(5).fill(null), completed: false, score: null };
  }

  function validProgress(value) {
    return value && Number.isInteger(value.index) && value.index >= 0 && value.index < 5 &&
      Array.isArray(value.answers) && value.answers.length === 5 &&
      value.answers.every(answer => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < 4)) &&
      typeof value.completed === 'boolean' &&
      (value.completed ? Number.isInteger(value.score) && value.score >= 0 && value.score <= 100 : value.score === null);
  }

  function getProgress(date) {
    const saved = store.progress[date];
    if (!saved) return null;
    if (!validProgress(saved)) throw new Error(`Saved progress for ${date} has an invalid format.`);
    if (!saved.completed) {
      const skippedQuestion = saved.answers.slice(0, saved.index).findIndex(answer => answer === null);
      if (skippedQuestion !== -1) {
        saved.index = skippedQuestion;
        saveStore();
      }
    }
    return saved;
  }

  function asUtcDate(date) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  function previousDate(date) {
    const previous = asUtcDate(date);
    previous.setUTCDate(previous.getUTCDate() - 1);
    return previous.toISOString().slice(0, 10);
  }

  function formattedDate(date, options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) {
    return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(asUtcDate(date));
  }

  function currentStreak() {
    if (!store.lastCompletedDate ||
        (store.lastCompletedDate !== activeDate && store.lastCompletedDate !== previousDate(activeDate))) return 0;
    return store.streak;
  }

  function showError(message) {
    if (ui.loading) ui.loading.hidden = true;
    if (ui.unavailable) ui.unavailable.hidden = true;
    if (ui.error) {
      showPanel(ui.error);
      ui.errorCopy.textContent = message;
    } else {
      console.error('Unable to load the Daily Challenge:', message);
    }
    if (home) {
      home.textContent = 'Today’s challenge could not be loaded. Please try again later.';
      if (ui.homeCta) ui.homeCta.textContent = 'Try today’s challenge';
    }
  }

  function runAction(action) {
    try {
      action();
    } catch (error) {
      console.error('Unable to save or update the Daily Challenge:', error);
      showError(error.message || 'Your progress could not be saved. Please try again.');
    }
  }

  function renderHome() {
    if (!home) return;
    const title = ui.homeTitle;
    const description = ui.homeDescription;
    const cta = ui.homeCta;
    if (!challenge) {
      title.textContent = 'No challenge scheduled today';
      description.textContent = 'There is not a Daily Challenge available for today yet. Check back soon for five fresh questions.';
      home.textContent = `No challenge is available for ${formattedDate(activeDate)}.`;
      cta.textContent = 'Check today’s challenge';
      return;
    }
    const todaysProgress = getProgress(activeDate);
    title.textContent = challenge.title;
    description.textContent = challenge.description;
    if (todaysProgress && todaysProgress.completed) {
      home.textContent = `Completed · ${todaysProgress.score}/100 points · ${currentStreak()} day streak`;
      cta.textContent = 'Review today’s results';
    } else if (todaysProgress && todaysProgress.answers.some(answer => answer !== null)) {
      home.textContent = `In progress · 5 questions · about 3 minutes · ${currentStreak()} day streak`;
      cta.textContent = 'Resume today’s challenge';
    } else {
      home.textContent = `${formattedDate(activeDate)} · 5 questions · about 3 minutes · up to 100 points`;
      cta.textContent = 'Start today’s challenge';
    }
  }

  function showPanel(panel) {
    for (const candidate of [ui.loading, ui.unavailable, ui.error, ui.welcome, ui.game, ui.results]) {
      if (candidate) candidate.hidden = candidate !== panel;
    }
  }

  function renderWelcome() {
    showPanel(ui.welcome);
    ui.date.textContent = formattedDate(activeDate);
    ui.streak.textContent = currentStreak() ? `✦ ${currentStreak()} day streak` : '';
    ui.title.textContent = challenge.title;
    ui.description.textContent = challenge.description;
    progress = getProgress(activeDate);
    const completed = Boolean(progress && progress.completed);
    const answered = Boolean(progress && progress.answers.some(answer => answer !== null));
    ui.welcomeStatus.textContent = completed
      ? `You’ve completed today’s challenge with ${progress.score}/100 points.`
      : answered ? 'Your progress is saved. Pick up where you left off.' : 'Five questions. One official score. Ready?';
    ui.start.textContent = completed ? 'Review your results' : answered ? 'Resume challenge' : 'Start challenge';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    ui.start.append(arrow);
  }

  function answerScore() {
    return progress.answers.reduce((sum, answer, index) =>
      sum + (answer !== null && answer === challenge.questions[index].correct ? 20 : 0), 0);
  }

  function updateProgress() {
    const answeredCount = progress.answers.filter(answer => answer !== null).length;
    ui.questionCount.textContent = `Question ${progress.index + 1} of 5`;
    ui.score.textContent = answerScore();
    ui.progress.setAttribute('aria-valuenow', answeredCount);
    ui.progress.setAttribute('aria-valuetext', `${answeredCount} of 5 questions answered`);
    ui.progressFill.style.width = `${answeredCount * 20}%`;
  }

  function renderQuestion() {
    const item = challenge.questions[progress.index];
    const selected = progress.answers[progress.index];
    showPanel(ui.game);
    ui.category.textContent = item.category;
    ui.difficulty.textContent = item.difficulty;
    ui.question.textContent = item.question;
    ui.answers.replaceChildren();
    ui.feedback.hidden = selected === null;
    ui.feedback.classList.remove('is-incorrect');
    ui.continue.hidden = selected === null;
    item.answers.forEach((answer, answerIndex) => {
      const button = document.createElement('button');
      const letter = document.createElement('span');
      const label = document.createElement('span');
      button.type = 'button';
      button.className = 'answer';
      letter.className = 'answer-letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = String.fromCharCode(65 + answerIndex);
      label.textContent = answer;
      button.append(letter, label);
      button.dataset.answerIndex = answerIndex;
      button.disabled = selected !== null;
      button.addEventListener('click', () => runAction(() => selectAnswer(answerIndex)));
      ui.answers.append(button);
    });
    updateProgress();
    if (selected !== null) renderFeedback(item, selected);
    ui.question.focus();
  }

  function renderFeedback(item, selected) {
    const correct = selected === item.correct;
    ui.feedback.hidden = false;
    ui.feedback.classList.toggle('is-incorrect', !correct);
    ui.feedbackTitle.textContent = correct ? 'That’s correct! +20 points' : 'Not quite. The correct answer is shown.';
    ui.explanation.textContent = item.explanation;
    [...ui.answers.children].forEach(button => {
      const answerIndex = Number(button.dataset.answerIndex);
      if (answerIndex === item.correct) button.classList.add('correct');
      if (!correct && answerIndex === selected) button.classList.add('incorrect');
    });
  }

  function selectAnswer(selected) {
    if (!progress || progress.completed || progress.answers[progress.index] !== null) return;
    progress.answers[progress.index] = selected;
    saveStore();
    renderFeedback(challenge.questions[progress.index], selected);
    [...ui.answers.children].forEach(button => { button.disabled = true; });
    ui.continue.hidden = false;
    updateProgress();
  }

  function performanceMessage(score) {
    if (score === 100) return 'Perfect score! Outstanding!';
    if (score === 80) return 'Excellent work!';
    if (score === 60) return 'Not bad! A few tricky ones.';
    if (score === 40) return 'There’s room for improvement!';
    return 'Today’s questions got the better of you!';
  }

  function renderResults() {
    showPanel(ui.results);
    const score = progress.score;
    const correctCount = score / 20;
    ui.resultScore.textContent = score;
    ui.resultMessage.textContent = performanceMessage(score);
    ui.resultStats.textContent = `${correctCount} of 5 correct · ${correctCount * 20}% · ${currentStreak()} day streak`;
    ui.reviewList.replaceChildren();
    challenge.questions.forEach((item, index) => {
      const card = document.createElement('article');
      const heading = document.createElement('h3');
      const chosen = document.createElement('p');
      const answer = document.createElement('p');
      const explanation = document.createElement('p');
      const isCorrect = progress.answers[index] === item.correct;
      card.className = 'daily-review-item';
      heading.textContent = `${index + 1}. ${item.question}`;
      chosen.className = isCorrect ? 'daily-review-correct' : 'daily-review-incorrect';
      chosen.textContent = `Your answer: ${item.answers[progress.answers[index]]}${isCorrect ? ' — correct' : ' — incorrect'}`;
      answer.textContent = `Correct answer: ${item.answers[item.correct]}`;
      explanation.className = 'daily-review-explanation';
      explanation.textContent = item.explanation;
      card.append(heading, chosen, answer, explanation);
      ui.reviewList.append(card);
    });
    element('daily-result-heading').focus();
  }

  function completeChallenge() {
    if (progress.completed) {
      renderResults();
      return;
    }
    const score = answerScore();
    const alreadyRecorded = store.history.some(entry => entry.date === activeDate);
    progress.completed = true;
    progress.score = score;
    if (!alreadyRecorded) {
      store.streak = store.lastCompletedDate === previousDate(activeDate) ? store.streak + 1 : 1;
      store.lastCompletedDate = activeDate;
      store.history.push({ date: activeDate, score });
    }
    saveStore();
    renderResults();
    renderHome();
  }

  function continueChallenge() {
    if (!progress || progress.answers[progress.index] === null) return;
    if (progress.index === 4) {
      completeChallenge();
      return;
    }
    progress.index++;
    saveStore();
    renderQuestion();
  }

  function startOrReview() {
    progress = getProgress(activeDate);
    if (progress && progress.completed) {
      renderResults();
      return;
    }
    if (!progress) {
      progress = freshProgress();
      store.progress[activeDate] = progress;
      saveStore();
    }
    renderQuestion();
  }

  async function shareResult() {
    const text = `I scored ${progress.score}/100 on today’s Quiz Club Daily Challenge! Can you beat me?`;
    ui.shareStatus.textContent = '';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'The Quiz Club Daily Challenge', text });
        ui.shareStatus.textContent = 'Thanks for sharing!';
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.error('Native sharing failed:', error);
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        ui.shareStatus.textContent = 'Score summary copied to your clipboard.';
      } catch (error) {
        console.error('Unable to copy the score summary:', error);
        ui.shareStatus.textContent = 'Sharing is unavailable. You can copy your score summary manually.';
      }
    } else {
      ui.shareStatus.textContent = 'Sharing is unavailable. You can copy your score summary manually.';
    }
  }

  function renderUnavailable() {
    if (ui.unavailable) {
      showPanel(ui.unavailable);
      ui.unavailableCopy.textContent = `No challenge is scheduled for ${formattedDate(activeDate)} yet. Please check back soon.`;
    }
  }

  async function initialize() {
    try {
      activeDate = new Date().toISOString().slice(0, 10);
      store = readStore();
      const response = await fetch('data/daily-challenges.json');
      if (!response.ok) throw new Error(`Daily Challenge data request failed (${response.status}).`);
      challenges = validateChallenges(await response.json());
      challenge = challenges.find(item => item.date === activeDate) || null;
      renderHome();
      if (ui.loading) ui.loading.hidden = true;
      if (!challenge) {
        renderUnavailable();
        return;
      }
      if (ui.welcome) {
        renderWelcome();
        ui.start.addEventListener('click', () => runAction(startOrReview));
        ui.continue.addEventListener('click', () => runAction(continueChallenge));
        ui.share.addEventListener('click', shareResult);
      }
    } catch (error) {
      console.error('Unable to initialize the Daily Challenge:', error);
      showError(error.message || 'Please refresh the page and try again.');
    }
  }

  initialize();
})();
