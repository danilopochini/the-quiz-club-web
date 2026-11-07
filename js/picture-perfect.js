(() => {
  const gameLength = 10;
  const fields = [
    'loading', 'load-error', 'retry', 'welcome', 'start', 'game', 'question-count',
    'score', 'progress', 'progress-fill', 'question-image', 'photo-credit', 'image-error',
    'retry-image', 'topic', 'difficulty', 'question', 'answers', 'feedback',
    'feedback-title', 'explanation', 'next', 'results', 'result-title', 'result-summary',
    'result-breakdown', 'result-ring-score', 'play-again'
  ];
  const el = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  let bank = [];
  let selected = [];
  let previous = [];
  let index = 0;
  let score = 0;
  let answered = false;
  let imageReady = false;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function validQuestion(item) {
    return item && typeof item.id === 'string' && /^[a-z0-9-]+$/.test(item.id) &&
      typeof item.question === 'string' && item.question.trim() &&
      typeof item.image === 'string' && /^assets\/images\/picture-perfect\/geography\/[a-z0-9-]+\.jpg$/.test(item.image) &&
      typeof item.imageAlt === 'string' && item.imageAlt.trim() &&
      Array.isArray(item.answers) && item.answers.length === 4 &&
      item.answers.every(answer => typeof answer === 'string' && answer.trim()) &&
      new Set(item.answers.map(answer => answer.trim().toLowerCase())).size === 4 &&
      Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4 &&
      typeof item.explanation === 'string' && item.explanation.trim() &&
      ['Easy', 'Medium', 'Hard'].includes(item.difficulty) &&
      typeof item.topic === 'string' && item.topic.trim() &&
      item.attribution && typeof item.attribution.author === 'string' && item.attribution.author.trim() &&
      typeof item.attribution.license === 'string' && item.attribution.license.trim() &&
      /^https:\/\/commons\.wikimedia\.org\//.test(item.attribution.source) &&
      /^https:\/\//.test(item.attribution.licenseUrl);
  }

  async function loadQuestions() {
    el.loading.hidden = false;
    el['load-error'].hidden = true;
    try {
      const response = await fetch('data/picture-perfect-geography.json');
      if (!response.ok) throw new Error(`Question bank request failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data) || data.length < gameLength + 1 || !data.every(validQuestion) ||
          new Set(data.map(item => item.id)).size !== data.length ||
          new Set(data.map(item => item.question)).size !== data.length) {
        throw new Error('The Picture Perfect question bank is invalid or too small.');
      }
      bank = data;
      el.loading.hidden = true;
      el.welcome.hidden = false;
    } catch (error) {
      console.error('Unable to load Picture Perfect:', error);
      el.loading.hidden = true;
      el['load-error'].hidden = false;
    }
  }

  function startGame() {
    selected = shuffle(bank).slice(0, gameLength);
    if (previous.length && selected.every(question => previous.includes(question))) {
      selected[gameLength - 1] = shuffle(bank.filter(question => !previous.includes(question)))[0];
    }
    previous = selected;
    index = 0;
    score = 0;
    el.welcome.hidden = true;
    el.results.hidden = true;
    el.game.hidden = false;
    renderQuestion();
    el.question.focus();
  }

  function updateProgress() {
    const completed = index + (answered ? 1 : 0);
    el['question-count'].textContent = `Question ${index + 1} of ${gameLength}`;
    el.score.textContent = score;
    el.progress.setAttribute('aria-valuenow', completed);
    el.progress.setAttribute('aria-valuetext', `${completed} of ${gameLength} questions answered`);
    el['progress-fill'].style.width = `${completed / gameLength * 100}%`;
  }

  function loadImage() {
    imageReady = false;
    el['image-error'].hidden = true;
    el.answers.querySelectorAll('button').forEach(button => { button.disabled = true; });
    const image = el['question-image'];
    const currentId = selected[index].id;
    image.onload = () => {
      if (selected[index].id !== currentId) return;
      imageReady = true;
      image.hidden = false;
      el['image-error'].hidden = true;
      if (!answered) el.answers.querySelectorAll('button').forEach(button => { button.disabled = false; });
    };
    image.onerror = () => {
      if (selected[index].id !== currentId) return;
      console.error(`Unable to load Picture Perfect image: ${selected[index].image}`);
      image.hidden = true;
      el['image-error'].hidden = false;
    };
    image.hidden = true;
    image.alt = selected[index].imageAlt;
    image.src = selected[index].image;
  }

  function renderQuestion() {
    const current = selected[index];
    answered = false;
    el.topic.textContent = current.topic;
    el.difficulty.textContent = current.difficulty;
    el.question.textContent = current.question;
    el.answers.replaceChildren();
    el.feedback.hidden = true;
    el.feedback.classList.remove('is-incorrect');
    el.next.hidden = true;
    el['photo-credit'].hidden = true;
    el['photo-credit'].replaceChildren();
    shuffle(current.answers.map((_, answerIndex) => answerIndex)).forEach((answerIndex, position) => {
      const button = document.createElement('button');
      const letter = document.createElement('span');
      const label = document.createElement('span');
      button.type = 'button';
      button.className = 'answer';
      letter.className = 'answer-letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = String.fromCharCode(65 + position);
      label.textContent = current.answers[answerIndex];
      button.append(letter, label);
      button.dataset.answerIndex = answerIndex;
      button.addEventListener('click', () => selectAnswer(answerIndex));
      el.answers.append(button);
    });
    updateProgress();
    loadImage();
  }

  function showCredit(attribution) {
    const credit = el['photo-credit'];
    const source = document.createElement('a');
    const license = document.createElement('a');
    source.href = attribution.source;
    source.textContent = 'Wikimedia Commons';
    license.href = attribution.licenseUrl;
    license.textContent = attribution.license;
    credit.append(`Photo: ${attribution.author} / `, source, ' / ', license, '. Image resized for display.');
    credit.hidden = false;
  }

  function selectAnswer(selectedAnswer) {
    if (answered || !imageReady) return;
    answered = true;
    const current = selected[index];
    const correct = selectedAnswer === current.correct;
    if (correct) score++;
    [...el.answers.children].forEach(button => {
      const answerIndex = Number(button.dataset.answerIndex);
      button.disabled = true;
      if (answerIndex === current.correct) button.classList.add('correct');
      if (!correct && answerIndex === selectedAnswer) button.classList.add('incorrect');
    });
    el.feedback.classList.toggle('is-incorrect', !correct);
    el['feedback-title'].textContent = correct ? 'That’s correct!' : `Not quite. The answer is ${current.answers[current.correct]}.`;
    el.explanation.textContent = current.explanation;
    el.feedback.hidden = false;
    showCredit(current.attribution);
    el.next.firstChild.textContent = index === gameLength - 1 ? 'See Results ' : 'Next Question ';
    el.next.hidden = false;
    updateProgress();
    el.next.focus();
  }

  function showResults() {
    el.game.hidden = true;
    el.results.hidden = false;
    el['result-title'].textContent = score >= 9 ? 'Geography Master!' : score >= 7 ? 'Excellent geographical knowledge!' : score >= 5 ? 'Not bad! Keep exploring.' : 'There’s a whole world left to discover!';
    el['result-summary'].textContent = `You scored ${score} out of ${gameLength} — ${score / gameLength * 100}%.`;
    el['result-breakdown'].textContent = `${score} correct · ${gameLength - score} incorrect`;
    el['result-ring-score'].textContent = score;
    el['result-title'].focus();
  }

  el.start.addEventListener('click', startGame);
  el['play-again'].addEventListener('click', startGame);
  el.retry.addEventListener('click', loadQuestions);
  el['retry-image'].addEventListener('click', loadImage);
  el.next.addEventListener('click', () => {
    if (!answered) return;
    if (index === gameLength - 1) showResults();
    else {
      index++;
      renderQuestion();
      el.question.focus();
    }
  });
  loadQuestions();
})();
