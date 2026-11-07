# The Quiz Club

A static, framework-free trivia platform. All twelve categories are playable, each with a bank of at least 100 questions; each game draws 10. The daily challenge is coming soon.

Each quiz starts with Miscellaneous difficulty, drawing from all levels. Choose Easy, Medium, Hard, or Miscellaneous in the difficulty menu and select **Start new quiz** to apply it and reset the current game. **Play Again** also uses the selected difficulty.

## Run locally

Serve this directory with a static file server so the quiz can load its JSON question bank. For example, from this directory run:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. No backend or package installation is required.
Opening pages directly as `file://` may prevent the quiz data from loading; use the local server instead.

## Structure

- `index.html` — homepage.
- `quiz.html` — shared quiz page; choose a category with `?category=...`.
- `geography.html` — compatibility link to the Geography quiz.
- `daily.html`, `about.html` — informational pages.
- `css/style.css` — shared design system and page styles.
- `css/home.css` — homepage-specific styles and illustrations.
- `css/quiz.css` — quiz interface styles.
- `js/navigation.js` — accessible mobile navigation.
- `js/quiz.js` — quiz state, answer feedback and results.
- `data/` — separate JSON question banks for each category.
- `tests/question-banks.test.cjs` — question-bank and category-link checks.
- `tests/quiz-difficulty.test.cjs` — difficulty selection and game-flow checks.

Run the checks with `node --test tests/*.test.cjs`.
