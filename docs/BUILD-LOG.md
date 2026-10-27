# How Link Card Studio Was Built

This is the plain-language record of how Link Card Studio went from an idea to a finished, tested project in one evening: which languages it uses, what each file does, and every step in the order it happened.

| | |
| --- | --- |
| **Project** | Link Card Studio |
| **Type** | Developer tool (static web app) |
| **Version** | 1.0.0 |
| **Built** | 2026-10-27, by Claude (nightly showcase run) for Efraim Ray |
| **Difficulty** | Intermediate (no framework, but canvas text measuring and three code generators) |
| **Time to install/run** | Under a minute: open `index.html` |

## 1. Languages Used

Real line counts of the source files (the single-file build in `demo/` and the publisher scripts are not counted):

| Language | Lines | Share of code | Files | What it does here |
| --- | ---: | ---: | --- | --- |
| JavaScript | 977 | 64% | `js/core.js`, `js/app.js`, `tests/core.test.js`, `tools/build-demo.js` | All the behaviour: measuring text, running the checks, building HTML/Blogger/WordPress code, reading pasted page source, drawing card images, saving cards, tests and the demo build |
| CSS | 271 | 18% | `css/styles.css` | The look: colour tokens for light and dark themes, the two-column workbench, and the five platform preview styles |
| HTML | 268 | 18% | `index.html`, `tools/about.html` | The page: form fields with labels, preview frames, checks list, code box, and the "About this project" section |

In one sentence: **JavaScript does the thinking, HTML holds the content, and CSS makes it look right in both themes.**

Also in the project (not counted as app code): 314+ lines of Markdown documentation, and the publisher scripts in PowerShell (191 lines) and Batch (7 lines).

### Frameworks and APIs

- No framework and no libraries. Plain ("vanilla") JavaScript in ES5 style so it runs in any browser.
- **Canvas 2D API**: `measureText()` for pixel widths, `toDataURL()` for the generated card image.
- **DOMParser**: turns pasted page source into a document so the tags can be read safely (no scripts run).
- **FileReader**: previews a local image without uploading it.
- **Clipboard API** with a select-text fallback, and **localStorage** wrapped in `try/catch`.
- Google Fonts (Bricolage Grotesque, IBM Plex Sans, JetBrains Mono) with system-font fallbacks.

### Tools used to build and test

| Tool | What it was used for |
| --- | --- |
| `node --check` | Syntax check of every JavaScript file and of the Blogger post's script |
| Node.js + `assert` | 12 unit tests for `js/core.js` (`tests/core.test.js`) |
| PHP 8.3 CLI (`php -l` and a run with stub functions) | Checked that the generated WordPress mu-plugin is valid PHP and prints correctly escaped tags |
| Python `xml.dom.minidom` | Checked that the generated Blogger theme snippet is well-formed XML |
| Playwright + Chromium | End-to-end tests at 1280 px and 390 px in light and dark, screenshots, featured image rendering |
| Pillow (Python) | Saved the featured image and sample images as JPG, composed the phone image |
| PowerShell 7.4.6 for Linux | Tested `publish-to-github.ps1` twice with a stand-in `gh` and a local Git remote |
| gzip, wc | Measured real file sizes and line counts |
| GitHub CLI + `publish-to-github.bat` | How Efraim publishes the repo, release and GitHub Pages site |

**Build step needed?** No. No npm install, no Composer, no bundler. `tools/build-demo.js` is optional: it only regenerates the single-file `demo/index.html`.

## 2. How It Works (the 30-second version)

```
 You type in the form ──> app.js readForm() ──> card { url, title, description, image, ... }
                                                   │
          ┌────────────────────────────────────────┼─────────────────────────────┐
          ▼                                        ▼                             ▼
  canvas measureText()                    core.js checkCard()          core.js buildTags() /
  "525 / 600 px" ruler                    11 checks -> score           bloggerSnippet() /
  Google preview cut-off                                               wordpressSnippet()
          │                                        │                             │
          ▼                                        ▼                             ▼
  5 previews (Google, Facebook,           Checks list + score pill      Code box + Copy button
  X, LinkedIn, chat app)
```

The key idea: social apps and Google read a handful of `<meta>` tags. If you can see exactly what they will show, and get the tags written for you, fixing a bad link card takes a minute. Everything runs in the browser, so there is no server to host and nothing private leaves the computer.

## 3. Step-by-Step: How We Built It

### Step 1: Checked for repeats
Listed the existing showcase artifacts (Bukas Hours, PilaBoard, Tinta Color Studio, Kahera POS, Sinag, Tatak Schema, Abiso Advisories, Presyo Menu Board, Hulog Paluwagan Planner, Linaw A11y Checker, Ngiti Dental Studio, Ambag Drive). Tatak Schema already covers JSON-LD; nothing covered Open Graph / social link previews. The GitHub repo list and `claude-improve` issues could not be read from the cloud session (the API is limited to connected repos and github.com issue pages refuse automated fetching), so the improvement step was skipped.

### Step 2: Picked the idea and the name
It is Tuesday, and Monday's Ambag Drive already covered this week's WordPress plugin, so tonight is a developer tool. The problem is one Efraim's clients and his own blog face every day: shared links with the wrong image or a cut-off title. The name **Link Card Studio** says what it does in plain English. A quick web search showed "Share Preview" is already a well-known GNOME app, so that name was dropped; "Link Card Studio" had no matching product. Repo slug: `link-card-studio`.

### Step 3: Planned the data
One `card` object with 11 fields (URL, site name, title, description, image, image alt, page type, X card type, X handle, locale, brand colour). The limits were written down once in `LIMITS` in `core.js`: title about 600 px, description 70-160 characters, image 1200 x 630, ratio 1.91:1.

### Step 4: Wrote the logic, `js/core.js` (JavaScript)
Pure functions only, so the same file runs in the browser and in Node: `normalize`, `esc`, `breadcrumb`, `truncateToWidth` (binary search for the longest text that fits, cut at a word, add " …"), `checkCard` (11 checks, pass = 1, warn = 0.5, fail = 0), `buildTags`, `bloggerSnippet`, `wordpressSnippet` and `parseHead`.
*Problem fixed:* the first version of `wordpressSnippet` used a confusing filter/replace to drop the optional X-handle line. It was replaced with a simple `null` entry that is filtered out.

### Step 5: Wrote the page, `index.html` (HTML)
Header with a load menu, Save and Theme buttons; the editor form (every input has a `<label>`); five preview frames; a checks list with `aria-live`; the code box with HTML / Blogger / WordPress tabs; a footer that states nothing is uploaded.

### Step 6: Wrote the interface, `js/app.js` (JavaScript)
`render()` updates everything on each keystroke: counters, pixel rulers, previews, checks, score and code. Canvas measures text in Arial 20px (titles) and 14px (descriptions). `measureImage()` reads the real image size; `makeCardImage()` draws a 1200 x 630 PNG; three sample cards (a blog post, a Valencia City bakery, and a resort promo that needs fixes) use reserved `.example` domains. Storage, clipboard and theme all have fallbacks.

### Step 7: Styled it, `css/styles.css` (CSS)
A cobalt accent on cool grey-blue neutrals, Bricolage Grotesque for headings, IBM Plex Sans for text and JetBrains Mono for numbers and code. All colours are tokens with a full dark set. Previews use Arial and their own tokens so they look like the platforms.
*Problem fixed:* the first layout used a 2 x 2 grid, which left a big empty gap under the previews when the editor was tall. It was changed to two independent columns (editor + checks | previews + code) that reorder on phones.
*Problem fixed:* at 390 px the Google breadcrumb ran past its card. Adding `min-width: 0` to its flex parent and `max-width: min(520px, 100%)` made it end with an ellipsis.

### Step 8: Tested the logic
`node tests/core.test.js`:

| Test | Result |
| --- | --- |
| `esc()` escapes all five HTML characters | PASS |
| `breadcrumb()` builds a Google-style path | PASS |
| short titles are not truncated | PASS |
| long titles are cut at a word with an ellipsis and fit | PASS |
| a good card scores 100 with no failures | PASS |
| the broken resort card: URL warn, image fail, title/desc/site warn, score under 60 | PASS |
| an empty card fails title, description, URL and image | PASS |
| image 1200x630 pass, 800x800 warn (size and shape), 400x200 fail | PASS |
| `buildTags()` escapes values and adds `@` to the X handle | PASS |
| `buildTags()` never outputs a `data:` image | PASS |
| `wordpressSnippet()` escapes quotes for PHP | PASS |
| `bloggerSnippet()` uses Blogger data tags and escapes the fallback | PASS |

**12/12 passed.** The generated WordPress file passed `php -l`, and running it with stub WordPress functions printed 12 correctly escaped meta tags. The generated Blogger snippet parsed as well-formed XML.

### Step 9: Tested the app in a real browser
Playwright + Chromium at 1280 px and 390 px, light and dark (4 runs):

| Check | Result (all 4 runs) |
| --- | --- |
| Page errors | 0 |
| Horizontal scroll (scrollWidth = viewport) | none, also after switching to Phone previews |
| Blog sample loads with a generated 1200 x 630 image | score 94 (one honest warning: the image only lives in the browser) |
| Resort sample | score 50, "1 pass · 6 warn · 1 fix", Google title cut with " …" |
| Paste page source → Read the tags | 4 tags found, 10 missing, form filled |
| Switch HTML → Blogger → WordPress → HTML | code updates each time |

The only console errors were blocked font downloads in the sandbox (Google Fonts) and the invented `.example` image address used in the import test; the page falls back to system fonts and shows "No image".

### Step 10: Measured the build
JavaScript 11.4 KB gzipped (`core.js` + `app.js` = 11,653 bytes), CSS 4.3 KB gzipped (4,421 bytes), 0 npm dependencies, 0 external scripts. Lighthouse was not run.

### Step 11: Wrote the documentation
README (features, structure, quick start, usage, customization, roadmap, `claude-improve`), `docs/TUTORIAL.md` (every function, key concepts, 3 exercises), `docs/DEPLOYMENT.md` (double-click publishing, GitHub Desktop, git CLI, Pages, versioning, cPanel, custom domain, using the generated tags), CHANGELOG and MIT LICENSE.

### Step 12: Built and published the showcase artifact
`tools/build-demo.js` inlines the CSS and JavaScript into one file, adds the "About this project" section with real language percentages, and writes `demo/index.html`. The same build (as a fragment) was published as the artifact **"Showcase · Link Card Studio"**. It was republished once after the breadcrumb fix in Step 7.

### Step 13: Made the one-click GitHub publisher
`publish-to-github.bat` and `publish-to-github.ps1` were based on the proven Ambag Drive scripts (fetched from GitHub; they already contain the LAST STEP social-preview block). Only the settings block changed: slug `link-card-studio`, version 1.0.0, a 242-character description, 8 topics, and `$DemoPath = ''` because the app lives at the site root. Both files are ASCII with CRLF line endings.

**Test** (PowerShell 7.4.6 for Linux, on a copy of the project, stand-in `gh`, pushes redirected to a local bare repo):

| Run | Result |
| --- | --- |
| 1st | Created the Git repo, set the noreply commit email, committed "Link Card Studio v1.0.0", "created" the repo, pushed `main`, added 8 topics and the label, tagged and pushed `v1.0.0`, built the zip and "created" the release, enabled Pages, printed ALL DONE and the LAST STEP block pointing at `.github/social-preview.jpg` |
| Zip | 19 files at test time (this build log was added afterwards), all under `link-card-studio/`, no `.git`, `.github` or `publish-to-github` entries |
| 2nd | "No new changes to commit", reused the repo, "Release v1.0.0 already exists", no errors |

(The only extra output on Linux was `xdg-open` saying it has no browser, which does not happen on Windows.)

### Step 14: Wrote the Blogger post
Built from the Bukas Hours reference template with a Python script: the template's scoped CSS and slider/tab/copy script copied verbatim, plus a project block with the `lcd-` mini demo (title ruler, Google cut-off, live card image, three checks), `lcs-` slider scenes, the sample-image caption style and the FAQ styles. The labels line is 197 of 200 characters (the keyword "og image size checker" was shortened to "og image checker" to fit). The JSON-LD has one `@graph` with a TechArticle and a FAQPage whose 6 questions and answers are generated from the same list as the visible FAQ.
**Checks:** settings lines in the right order; `node --check` on the script passed; FAQ questions and answers match the schema exactly; 4 sample-image slots with matching alt text; rendered in light and dark at 900 px and 390 px with no page errors and no horizontal scroll; the demo's "Too long" button changed the score from 100 to 67 and cut the Google title; one FAQ item opened; code tab and slider worked.

### Step 15: Made the featured image
A 1200 x 630 HTML scene rendered by Playwright at 2x (2400 x 1260) and saved as JPG (quality 88): dark grid background with emerald and cobalt glows, a "FREE DEVELOPER TOOL · SEO" pill, "Link Card / Studio" in two lines, a one-line benefit, a laptop showing a real screenshot of the app and a phone showing the real previews, three chips and "efraimray.com". Fonts were installed from npm (@fontsource) because Google Fonts is blocked in the sandbox.
*Problem fixed:* measuring the element boxes showed the phone overlapping the "efraimray.com" badge; the phone was moved up and left. The image was copied to `.github/social-preview.jpg`.

### Step 16: Made the sample images
Four real screenshots at 1200 x 675 (2x, JPG quality 85), saved in `docs/screenshots/`:

1. **Main screen**: the blog post sample with live Google, Facebook and X previews.
2. **Needs fixes**: the resort sample with the amber title ruler and "No image" previews.
3. **Dark mode**: the checks list and the Blogger snippet in the code box.
4. **Phone**: the 390 px layout in light (top of the editor) and dark (previews), centred on a #0b1220 canvas.

The first phone capture showed the breadcrumb overflow from Step 7; all images were retaken after the fix.

### Step 17: Packaged
Zipped the folder as `link-card-studio.zip` with `link-card-studio/` at the top level, keeping `.gitignore`, `.gitattributes`, `.github/`, `docs/screenshots/` and the publisher files, and leaving out `.git` and test output.

## 4. What You Received

| Deliverable | Where it lives |
| --- | --- |
| The app | `index.html`, `css/styles.css`, `js/core.js`, `js/app.js` |
| Single-file demo with "About this project" | `demo/index.html` |
| Live showcase | Claude artifact "Showcase · Link Card Studio" |
| Tests | `tests/core.test.js` |
| Demo builder | `tools/build-demo.js`, `tools/about.html` |
| Docs | `README.md`, `docs/BUILD-LOG.md` (this file), `docs/TUTORIAL.md`, `docs/DEPLOYMENT.md`, `CHANGELOG.md`, `LICENSE` |
| One-click publisher | `publish-to-github.bat`, `publish-to-github.ps1` |
| Featured image / README banner / Social preview | `link-card-studio-featured.jpg` and `.github/social-preview.jpg` |
| Sample image 1 (main screen) | `link-card-studio-sample-1.jpg` and `docs/screenshots/` |
| Sample image 2 (needs fixes) | `link-card-studio-sample-2.jpg` and `docs/screenshots/` |
| Sample image 3 (dark mode, Blogger snippet) | `link-card-studio-sample-3.jpg` and `docs/screenshots/` |
| Sample image 4 (phone) | `link-card-studio-sample-4.jpg` and `docs/screenshots/` |
| Blogger post | `2026-10-27-blogger-link-card-studio.html` |
| Release package | `link-card-studio.zip` |

**Publishing:** Efraim extracts the zip into `C:\Users\YodnoX\Documents\_Codes` and double-clicks `publish-to-github.bat`. It creates https://github.com/EfraimRay/link-card-studio, the v1.0.0 release and the live site at https://efraimray.github.io/link-card-studio/.

## 5. Known Limits and What's Next

- The tool cannot fetch a live URL by itself (browsers block reading other sites), so you paste the page source instead.
- Preview layouts and limits are close approximations; Google, Facebook, X and LinkedIn change their designs and cut-offs.
- Image size can't be checked for image addresses the browser can't load (for example, sites that block hotlinking).
- The Blogger snippet relies on Blogger's own data tags; some themes already print a few og: tags, so check View Source for duplicates once.
- Not run: Lighthouse, and a test inside a live Blogger theme or WordPress install (the generated PHP was run with stub functions).

**Roadmap:** an optional URL-fetch proxy, a whole-site audit from sitemap.xml, more previews (Telegram, Discord, Slack, Pinterest), and JPG export of the card image.

**Want a change?** Open an issue on GitHub with the label `claude-improve` and the nightly run will pick it up.
