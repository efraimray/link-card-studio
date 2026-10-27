# Changelog

All notable changes to Link Card Studio are listed here. This project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-27

### Added
- Live link previews for Google search (desktop and phone), Facebook, X, LinkedIn and chat apps.
- Pixel ruler that measures the title in Arial 20px, the font Google uses, against the ~600px cut-off.
- 11 checks with a 0-100 score: title and description length, https URL, image present and absolute,
  image size (1200 x 630), 1.91:1 shape, alt text, site name, duplicate text, X card type.
- Copy-ready output as plain HTML head tags, a dynamic Blogger theme snippet, or a WordPress mu-plugin
  that steps aside when Yoast SEO or Rank Math is active.
- "Check an existing page": paste page source to read its tags and see which are missing.
- "Make a card image": draws a 1200 x 630 title card in the browser.
- Local image preview (FileReader; nothing is uploaded), saved cards and draft in localStorage.
- Light and dark themes, keyboard focus states, screen-reader labels, works down to 360px.
- Node test suite for the core logic (`node tests/core.test.js`).
- One-click publisher: `publish-to-github.bat` / `publish-to-github.ps1`.
