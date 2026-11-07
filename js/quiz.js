(() => {
  const gameLength = 10;
  const elements = {
    loading: document.querySelector('#loading'),
    error: document.querySelector('#load-error'),
    retry: document.querySelector('#retry'),
    game: document.querySelector('#game'),
    count: document.querySelector('#question-count'),
    score: document.querySelector('#score'),
    progress: document.querySelector('#progress'),
    progressFill: document.querySelector('#progress-fill'),
    difficulty: document.querySelector('#difficulty'),
    question: document.querySelector('#question'),
    answers: document.querySelector('#answers'),
    feedback: document.querySelector('#feedback'),
    feedbackTitle: document.querySelector('#feedback-title'),
    explanation: document.querySelector('#explanation'),
    next: document.querySelector('#next'),
    results: document.querySelector('#results'),
    resultTitle: document.querySelector('#result-title'),
    resultSummary: document.querySelector('#result-summary'),
    resultRingScore: document.querySelector('#result-ring-score'),
    playAgain: document.querySelector('#play-again')
  };
  let bank = [];
  let questions = [];
  let previousQuestions = [];
  let index = 0;
  let score = 0;
  let answered = false;

  function shuffle(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function validQuestion(item) {
    return item && typeof item.question === 'string' && item.question.trim() &&
      Array.isArray(item.answers) && item.answers.length === 4 &&
      item.answers.every(answer => typeof answer === 'string' && answer.trim()) &&
      new Set(item.answers).size === 4 && Number.isInteger(item.correct) &&
      item.correct >= 0 && item.correct < 4 &&
      typeof item.explanation === 'string' && item.explanation.trim() &&
      ['Easy', 'Medium', 'Hard'].includes(item.difficulty);
  }

  async function loadQuestions() {
    elements.loading.hidden = false;
    elements.error.hidden = true;
    try {
      const response = await fetch('data/geography.json');
      if (!response.ok) throw new Error(`Question bank request failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data) || data.length < gameLength + 1 ||
          !data.every(validQuestion) || new Set(data.map(item => item.question)).size !== data.length) {
        throw new Error('The question bank is invalid or does not contain enough unique questions.');
      }
      bank = data;
      elements.loading.hidden = true;
      startGame();
    } catch (error) {
      console.error('Unable to load the Geography quiz:', error);
      elements.loading.hidden = true;
      elements.error.hidden = false;
    }
  }

  function startGame() {
    const selection = shuffle(bank).slice(0, gameLength);
    if (previousQuestions.length && selection.every(question => previousQuestions.includes(question))) {
      selection[gameLength - 1] = shuffle(bank.filter(question => !previousQuestions.includes(question)))[0];
    }
    questions = selection;
    previousQuestions = selection;
    index = 0;
    score = 0;
    elements.results.hidden = true;
    elements.game.hidden = false;
    renderQuestion();
    elements.question.focus();
  }

  function updateProgress() {
    const completed = index + (answered ? 1 : 0);
    elements.count.textContent = `Question ${index + 1} of ${gameLength}`;
    elements.score.textContent = score;
    elements.progress.setAttribute('aria-valuenow', completed);
    elements.progress.setAttribute('aria-valuetext', `${completed} of ${gameLength} questions answered`);
    elements.progressFill.style.width = `${completed / gameLength * 100}%`;
  }

  function renderQuestion() {
    const current = questions[index];
    answered = false;
    elements.difficulty.textContent = current.difficulty;
    elements.question.textContent = current.question;
    elements.answers.replaceChildren();
    elements.feedback.hidden = true;
    elements.feedback.classList.remove('is-incorrect');
    elements.next.hidden = true;
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
      elements.answers.append(button);
    });
    updateProgress();
  }

  function selectAnswer(selected) {
    if (answered) return;
    answered = true;
    const current = questions[index];
    const correct = selected === current.correct;
    if (correct) score++;
    [...elements.answers.children].forEach(button => {
      const answerIndex = Number(button.dataset.answerIndex);
      button.disabled = true;
      if (answerIndex === current.correct) button.classList.add('correct');
      if (!correct && answerIndex === selected) button.classList.add('incorrect');
    });
    elements.feedback.classList.toggle('is-incorrect', !correct);
    elements.feedbackTitle.textContent = correct ? 'That’s correct!' : `Not quite. The answer is ${current.answers[current.correct]}.`;
    elements.explanation.textContent = current.explanation;
    elements.feedback.hidden = false;
    elements.next.firstChild.textContent = index === gameLength - 1 ? 'See Results ' : 'Next Question ';
    elements.next.hidden = false;
    updateProgress();
    elements.next.focus();
  }

  function showResults() {
    elements.game.hidden = true;
    elements.results.hidden = false;
    elements.resultTitle.textContent = score >= 9 ? 'Geography Master!' : score >= 7 ? 'Excellent knowledge!' : score >= 5 ? 'Not bad! Keep exploring.' : 'Time to brush up on your geography!';
    elements.resultSummary.textContent = `You got ${score} out of ${gameLength} correct — ${score / gameLength * 100}%.`;
    elements.resultRingScore.textContent = score;
    elements.resultTitle.focus();
  }

  elements.next.addEventListener('click', () => {
    if (!answered) return;
    if (index === gameLength - 1) {
      showResults();
    } else {
      index++;
      renderQuestion();
      elements.question.focus();
    }
  });
  elements.playAgain.addEventListener('click', startGame);
  elements.retry.addEventListener('click', loadQuestions);
  loadQuestions();
})();
