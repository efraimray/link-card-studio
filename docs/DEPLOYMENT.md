# Deploying Link Card Studio

Link Card Studio is a static site: `index.html`, `css/`, `js/`. Any web host works and there is no build step.

## Easiest: double-click (Windows)

1. **One-time setup.** Open PowerShell and run:

   ```powershell
   winget install Git.Git
   winget install GitHub.cli
   ```

   Close and reopen PowerShell afterwards.
2. Extract `link-card-studio.zip` to `C:\Users\<you>\Documents\_Codes` so you have `_Codes\link-card-studio\`.
3. Double-click **`publish-to-github.bat`**. The first time, a browser opens so you can sign in to GitHub.
4. The script runs six steps and prints **ALL DONE** with three links:
   - Repository: https://github.com/EfraimRay/link-card-studio
   - Release: https://github.com/EfraimRay/link-card-studio/releases/tag/v1.0.0
   - Live demo: https://efraimray.github.io/link-card-studio/ (ready 1-2 minutes later)
5. **Last step:** the repository Settings page and a File Explorer window open. Scroll to **Social preview → Edit → Upload an image…**, press **Ctrl+V** in File name (the path of `.github\social-preview.jpg` is already copied) and press Enter.

Run it again any time; it only pushes new changes and never deletes anything.

## With GitHub Desktop

1. File → Add local repository → choose the folder → "create a repository" → Publish repository (untick "Keep this code private").
2. On github.com: Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.

## With the git CLI

```bash
cd link-card-studio
git init
git add -A
git commit -m "Link Card Studio v1.0.0"
git branch -M main
gh repo create EfraimRay/link-card-studio --public --source . --push \
  --description "Preview social share cards and generate meta tags for HTML, Blogger and WordPress"
gh api -X POST repos/EfraimRay/link-card-studio/pages -f "source[branch]=main" -f "source[path]=/"
```

## Releasing a new version

1. Change the version in **all** of these places:
   - `CHANGELOG.md` (new dated section at the top)
   - `index.html` footer (`Link Card Studio v1.0.0`)
   - `README.md` version badge
   - `$Version` in `publish-to-github.ps1`
2. Rebuild the single-file demo: `node tools/build-demo.js`
3. Run the tests: `node tests/core.test.js`
4. Double-click `publish-to-github.bat`. It commits, pushes, tags `v<version>` and creates the release with the zip.

By hand instead:

```bash
git add -A && git commit -m "Link Card Studio v1.1.0"
git tag v1.1.0 && git push origin main --tags
gh release create v1.1.0 --notes-file CHANGELOG.md
```

## Other hosts

- **cPanel / shared hosting:** upload the folder's contents (or the zip and Extract) into `public_html/link-card-studio/`. Open `https://yourdomain.com/link-card-studio/`.
- **Netlify / Cloudflare Pages:** connect the GitHub repo; build command empty, publish directory `/`.
- **Inside a Blogger page:** Blogger strips some scripts in Compose view. Use `demo/index.html` on GitHub Pages and link to it, or embed it with an `<iframe src="https://efraimray.github.io/link-card-studio/demo/" ...>` in HTML view.

## Custom domain (GitHub Pages)

1. Settings → Pages → Custom domain: `tools.yourdomain.com` → Save (this adds a `CNAME` file).
2. At your DNS provider, add a CNAME record: `tools` → `efraimray.github.io`.
3. Wait for DNS, then tick **Enforce HTTPS**.

## Using the generated tags on a real site

- **Plain HTML:** paste the HTML output inside `<head>`. Remove older duplicates of the same tags.
- **Blogger:** Theme → arrow next to Customize → Edit HTML. Find `<b:include data='blog' name='all-head-content'/>` and paste the Blogger output right below it. Save, open a post, View Source, and delete any og: tag that now appears twice. Set each post's **Search description** in Post settings.
- **WordPress:** if you don't use Yoast SEO or Rank Math, save the WordPress output as `wp-content/mu-plugins/link-card-tags.php` (create the `mu-plugins` folder if needed). Add an excerpt and a featured image to each post.
- After publishing, ask each platform to re-read the page with its sharing debugger, or the old card can stay cached for days.
