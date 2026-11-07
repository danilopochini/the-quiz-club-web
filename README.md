# The Quiz Club

A static, framework-free starting point for a trivia platform. The homepage introduces the planned categories and game modes; quizzes and the daily challenge are not playable yet.

## Run locally

Open `index.html` in a browser, or serve this directory with any static file server. For example, from this directory run:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. No backend or package installation is required.

## Structure

- `index.html` — homepage.
- `explore.html`, `daily.html`, `about.html` — linked placeholder pages.
- `css/style.css` — shared design system and page styles.
- `css/home.css` — homepage-specific styles and illustrations.
- `js/navigation.js` — accessible mobile navigation.
