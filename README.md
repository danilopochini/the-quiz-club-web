# The Quiz Club

A static, framework-free trivia platform. Geography is playable now; the other categories and daily challenge are coming soon.

## Run locally

Serve this directory with a static file server so the quiz can load its JSON question bank. For example, from this directory run:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. No backend or package installation is required.
Opening pages directly as `file://` may prevent the quiz data from loading; use the local server instead.

## Structure

- `index.html` — homepage.
- `geography.html` — playable Geography quiz.
- `explore.html`, `daily.html`, `about.html` — category directory and informational pages.
- `css/style.css` — shared design system and page styles.
- `css/home.css` — homepage-specific styles and illustrations.
- `css/quiz.css` — quiz interface styles.
- `js/navigation.js` — accessible mobile navigation.
- `js/quiz.js` — quiz state, answer feedback and results.
- `data/geography.json` — Geography question bank.
