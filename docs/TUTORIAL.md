# Link Card Studio Tutorial

A beginner-friendly walk through how the app works, file by file. You only need a text editor and a browser.

## 1. What happens when you share a link

When you paste a link into Facebook, Messenger, X or LinkedIn, their servers download your page and read a few `<meta>` tags in the `<head>`:

```html
<meta property="og:title" content="...">        <!-- headline -->
<meta property="og:description" content="..."> <!-- one line under it -->
<meta property="og:image" content="https://..."><!-- the big picture -->
<meta property="og:url" content="https://...">  <!-- the clean address -->
<meta name="twitter:card" content="summary_large_image">
```

These are the **Open Graph** tags (made by Facebook, now used almost everywhere) plus X's **card** tags. Google uses `<title>` and `<meta name="description">` instead. Link Card Studio shows you all of these before you publish.

## 2. Architecture

```
 index.html  ──loads──>  js/core.js  (pure functions, no DOM)
                         js/app.js   (reads the form, calls core.js, updates the page)
 css/styles.css          design tokens + layout + preview looks
```

The split matters: `core.js` has no knowledge of the page, so it runs in Node for tests (`tests/core.test.js`) and in the browser as `window.LinkCard`.

## 3. js/core.js, function by function

| Function | What it does |
| --- | --- |
| `normalize(card)` | Trims every field, fills defaults (`website`, `summary_large_image`, `en_PH`), adds `@` to the X handle, rejects bad colours. Every other function calls it first. |
| `esc(text)` | Escapes `& < > " '` so user text can't break the HTML it's placed in. |
| `truncateToWidth(text, maxPx, measure)` | Binary-searches the longest start of the text that, plus " …", fits `maxPx`, then backs up to the last space. `measure` is passed in, so tests can use a fake ruler. |
| `checkCard(card, m)` | Runs the 11 checks and returns `{ score, checks }`. Pass = 1 point, warn = 0.5, fail = 0; score is the percentage. |
| `buildTags(card)` | Returns the HTML lines. It never writes a `data:` image (those only exist in your browser). |
| `bloggerSnippet(card)` | Writes Blogger theme XML with `<b:if>` and `expr:content` so each post fills in its own values. |
| `wordpressSnippet(card)` | Writes a small PHP mu-plugin hooked to `wp_head` with `esc_attr()` on every value. |
| `parseHead(html, DOMParser)` | Parses pasted page source and returns the card plus lists of found and missing tags. |

### Key concept: measuring pixels, not characters

"60 characters" is only a rule of thumb: `WWWW` is much wider than `iiii`. Google cuts titles by **width**. In `app.js` we create an off-screen canvas and ask it how wide the text is in the same font:

```js
var ctx = document.createElement('canvas').getContext('2d');
ctx.font = '20px Arial';
ctx.measureText('My title').width; // pixels
```

That number drives the ruler under the Title field and the Google preview's cut-off.

## 4. js/app.js

1. **State**: one `card` object holds the 11 fields.
2. **`readForm()` / `writeForm()`** copy between the inputs and `card`.
3. **`render()`** is the heart: it updates the counters and rulers, fills all five previews, runs `checkCard()` and prints the list and score, then prints the chosen code output. It runs on every keystroke (it is fast because there is no framework and no network).
4. **Images**: `measureImage()` loads the image with `new Image()` to read `naturalWidth/Height`. A token number ignores late results if you changed the URL in the meantime. `makeCardImage()` draws a 1200 x 630 PNG with canvas.
5. **Storage**: `load()` and `store()` wrap `localStorage` in `try/catch`, because private windows and some embeds block it. The app still works without it.
6. **Copy**: uses `navigator.clipboard.writeText`; if refused, it selects the code so you can press Ctrl+C.

## 5. css/styles.css

All colours are tokens on `:root` (`--bg`, `--ink`, `--accent`, `--pass`, `--warn`, `--fail`…). Dark mode redefines the same tokens twice: once for `prefers-color-scheme: dark` and once for `[data-theme="dark"]` (the Theme button). Components only ever use `var(--token)`, so both themes stay consistent.

The previews use their own `--pv-*` tokens and Arial, so they look like the platforms instead of like the app.

## 6. Try it yourself (3 exercises)

1. **Add a Telegram preview.** Copy the LinkedIn `<article>` in `index.html`, rename the ids (`tg-img`, `tg-title`, `tg-host`), give it a left accent border in CSS, and set the three values in `render()`.
2. **Add a "keyword first" check.** In `checkCard()`, accept a `keyword` field and warn when the title doesn't contain it within the first 40 characters. Add a test in `tests/core.test.js`.
3. **Export as JSON.** Add a "Download card" button that turns `card` into `JSON.stringify(card, null, 2)`, makes a `Blob`, and downloads it with a temporary `<a download>` link.
