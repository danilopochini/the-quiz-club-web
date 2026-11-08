# The Quiz Club

A static, framework-free trivia platform. All twelve categories are playable, each with a bank of at least 100 questions; each game draws 10. The Daily Challenge offers five shared questions per UTC calendar date.

Each quiz starts with Miscellaneous difficulty, drawing from all levels. Choose Easy, Medium, Hard, or Miscellaneous in the difficulty menu and select **Start new quiz** to apply it and reset the current game. **Play Again** also uses the selected difficulty.

Picture Perfect: Around the World is a separate visual Geography game. It draws 10 distinct questions from a bank of 50, with an explanation and image credit revealed after each answer. Play Again starts a new selection.

Higher or Lower lets players choose any of the twelve categories and compare ten pairs of values. Answers are calculated from the values, and each response reveals a sourced explanation. A round never repeats a pair in either order; replays prioritize pairs not used in the preceding round in that category. Movie rounds also use each film at most once, choosing a set of ten disjoint pairs that minimizes reuse from the preceding round. Personal bests and the previous selection are saved per category in browser localStorage. Most categories contain 15 pairs derived from six sourced subjects and one measurement, so replays necessarily reuse some pairs. Movies & Television uses 20 films and excludes tied Oscar totals.

The comparison cards use locally stored images documented in `data/higher-lower-images.json`. Each image has its creator, Wikimedia Commons source and licence displayed on the card; the downloaded images are resized or converted versions of the originals. Geography uses country locator maps, and Movies & Television uses posters for the films themselves. The posters are public domain in the United States; restrictions may apply in other jurisdictions. Video-game comparisons show the relevant console rather than copyrighted game artwork. Stadiums, scientific specimens and geometric diagrams illustrate subjects where appropriate.

The generated comparison bank is `data/higher-lower.json`; its source values, individual facts and references are maintained in `scripts/build-higher-lower-bank.cjs`. To update it, verify values against the linked sources, keep definitions and units consistent, then run `node scripts/build-higher-lower-bank.cjs` and the tests. Equal-value pairs are excluded, and reverse-duplicate pairs must not be added. When a category has fewer than ten valid comparisons, or movies cannot form ten pairs without repeating a film, the game reports the shortage rather than repeating questions.

The photographs and satellite images are stored locally under `assets/images/picture-perfect/geography/`. Each question in `data/picture-perfect-geography.json` records its creator, Wikimedia Commons source and licence; the game displays these credits after the player answers. The images are resized versions of the originals. Follow the source and licence links for the original files and their reuse conditions.

The homepage game-mode cards use resized photographs under the [Pexels licence](https://www.pexels.com/license/): [Classic Quiz by Jonathan Borba](https://www.pexels.com/photo/vintage-chess-set-with-books-and-camera-29152106/), [Picture Perfect by lil artsy](https://www.pexels.com/photo/photo-of-an-old-camera-3127733/), [Higher or Lower by Robert Schrader](https://www.pexels.com/photo/close-up-of-a-vintage-weighing-scale-15130868/), and [Who Am I? by cottonbro studio](https://www.pexels.com/photo/photo-of-detective-decoding-characters-7319078/).

The Daily Challenge has five questions, one official attempt per date, a maximum score of 100, and a progressive Easy-to-Expert difficulty sequence. It saves submitted answers, completion, scores and streak history in browser localStorage. The challenge is selected using the current UTC date; dates without an entry show an unavailable message rather than reusing old content. Completed scores can be shared through WhatsApp, Facebook, the device share sheet or a copied message. Seven complete daily challenges are currently included.

To add a future challenge, append an object to `data/daily-challenges.json` with a unique `YYYY-MM-DD` date, type (`mixed` or `themed`), title, description and five questions. Give each question a unique ID, category, difficulty (`Easy`, `Medium`, `Medium`, `Hard`, `Expert` in order), four distinct answers, zero-based correct-answer index and explanation. Mixed challenges should use five different categories. The game validates this structure when loading.

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
- `picture-perfect.html` — Picture Perfect: Around the World.
- `higher-lower.html` — category-based Higher or Lower game.
- `daily.html` — date-based Daily Challenge game.
- `geography.html`, `about.html` — compatibility and informational pages.
- `css/style.css` — shared design system and page styles.
- `css/home.css` — homepage-specific styles and illustrations.
- `css/quiz.css` — quiz interface styles.
- `css/picture-perfect.css` — Picture Perfect image and welcome-screen styles.
- `css/higher-lower.css` — comparison cards and responsive game styles.
- `css/daily.css` — Daily Challenge page styles.
- `js/navigation.js` — accessible mobile navigation.
- `js/quiz.js` — quiz state, answer feedback and results.
- `js/picture-perfect.js` — visual game state, image loading and attribution.
- `js/higher-lower.js` — comparison game, validation, results and personal bests.
- `js/daily.js` — daily challenge loading, gameplay, local progress and streaks.
- `data/` — separate JSON question banks for each category.
- `data/daily-challenges.json` — date-keyed Daily Challenge content.
- `data/higher-lower.json` — sourced comparison bank.
- `scripts/build-higher-lower-bank.cjs` — source data and comparison-bank generator.
- `assets/icons/` — SVG, PNG, ICO and Apple Touch favicon assets.
- `tests/question-banks.test.cjs` — question-bank and category-link checks.
- `tests/quiz-difficulty.test.cjs` — difficulty selection and game-flow checks.
- `tests/favicon.test.cjs` — favicon asset and page-reference checks.
- `tests/picture-perfect.test.cjs`, `tests/picture-perfect-bank.test.cjs` — visual-game flow, bank and asset checks.
- `tests/higher-lower.test.cjs` — comparison validation, round flow, replays and personal bests.
- `tests/daily.test.cjs` — Daily Challenge content, gameplay, storage, streak and share checks.

Run the checks with `node --test tests/*.test.cjs`.
