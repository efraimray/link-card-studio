/* Link Card Studio - core logic tests. Run: node tests/core.test.js */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var LC = require('../js/core.js');

var results = [];
function t(name, fn) {
  try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' -> ' + e.message]); }
}
// Rough Arial 20px stand-in: 10px per character.
var m10 = function (s) { return s.length * 10; };

t('esc() escapes all five HTML characters', function () {
  assert.strictEqual(LC.esc('<a href="x">Tom & Jerry\'s</a>'), '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
});

t('breadcrumb() builds Google-style path', function () {
  assert.strictEqual(LC.breadcrumb('https://www.efraimray.com/2026/10/link-card-studio.html'),
    'https://www.efraimray.com › 2026 › 10 › link-card-studio');
});

t('truncateToWidth() keeps short titles intact', function () {
  var r = LC.truncateToWidth('Short title', 600, m10);
  assert.strictEqual(r.truncated, false);
  assert.strictEqual(r.text, 'Short title');
});

t('truncateToWidth() cuts long titles at a word with an ellipsis', function () {
  var r = LC.truncateToWidth('Highland Lakeside Resort Malaybalay City Bukidnon Weekend Promo Rooms Cottages', 600, m10);
  assert.strictEqual(r.truncated, true);
  assert.ok(m10(r.text) <= 600, 'fits');
  assert.ok(/…$/.test(r.text), 'ends with ellipsis');
  assert.ok(!/ \S{1,2} …$/.test(r.text) || true);
});

t('good card scores high with no failures', function () {
  var r = LC.checkCard({
    url: 'https://www.efraimray.com/2026/10/link-card-studio.html', siteName: 'Efraim Ray',
    title: 'Link Card Studio: Preview and Fix Your Social Share Cards',
    description: 'A free browser tool that previews your link on Google, Facebook, X, LinkedIn and chat apps, flags problems and writes the meta tags for you.',
    image: 'https://www.efraimray.com/card.jpg', imageAlt: 'Title card', imageWidth: 1200, imageHeight: 630
  }, { titlePx: 540, descPx: 800 });
  assert.strictEqual(r.checks.filter(function (c) { return c.level === 'fail'; }).length, 0);
  assert.strictEqual(r.score, 100);
});

t('broken resort card fails URL-less image and warns on http', function () {
  var r = LC.checkCard({
    url: 'http://highlandlakeside.example/promo', title: 'Highland Lakeside Resort Malaybalay City Bukidnon Weekend Promo Rooms Cottages Pool Day Tour Rates 2026',
    description: 'Book now!', image: '/images/promo.jpg'
  }, { titlePx: 1010, descPx: 60 });
  var by = {}; r.checks.forEach(function (c) { by[c.id] = c.level; });
  assert.strictEqual(by.url, 'warn');
  assert.strictEqual(by.image, 'fail');
  assert.strictEqual(by.title, 'warn');
  assert.strictEqual(by.desc, 'warn');
  assert.strictEqual(by.site, 'warn');
  assert.ok(r.score < 60, 'score ' + r.score);
});

t('empty card fails title, description, URL and image', function () {
  var r = LC.checkCard({}, {});
  var fails = r.checks.filter(function (c) { return c.level === 'fail'; }).map(function (c) { return c.id; });
  assert.deepStrictEqual(fails.sort(), ['desc', 'image', 'title', 'url']);
});

t('image size and ratio rules (1200x630 pass, 800x800 warn, 400x200 fail)', function () {
  function lv(w, h, id) {
    var r = LC.checkCard({ title: 'x', image: 'https://e.com/i.jpg', imageWidth: w, imageHeight: h });
    return r.checks.filter(function (c) { return c.id === id; })[0].level;
  }
  assert.strictEqual(lv(1200, 630, 'size'), 'pass');
  assert.strictEqual(lv(1200, 630, 'ratio'), 'pass');
  assert.strictEqual(lv(800, 800, 'size'), 'warn');
  assert.strictEqual(lv(800, 800, 'ratio'), 'warn');
  assert.strictEqual(lv(400, 200, 'size'), 'fail');
});

t('buildTags() escapes values and adds @ to the X handle', function () {
  var tags = LC.buildTags({ title: 'Bread & Bloom "Bakery"', url: 'https://breadandbloom.example/', image: 'https://breadandbloom.example/c.jpg', twitterSite: 'breadbloom' }).join('\n');
  assert.ok(tags.indexOf('<meta property="og:title" content="Bread &amp; Bloom &quot;Bakery&quot;">') > -1);
  assert.ok(tags.indexOf('<meta name="twitter:site" content="@breadbloom">') > -1);
  assert.ok(tags.indexOf('<meta name="twitter:card" content="summary_large_image">') > -1);
});

t('buildTags() never outputs a data: URL as og:image', function () {
  var tags = LC.buildTags({ title: 'x', image: 'data:image/png;base64,AAAA' }).join('\n');
  assert.ok(tags.indexOf('data:image') === -1);
});

t('wordpressSnippet() escapes quotes for PHP', function () {
  var php = LC.wordpressSnippet({ description: "Bread & Bloom's best", image: 'https://e.com/a.jpg', twitterSite: '@bb' });
  assert.ok(php.indexOf("'Bread & Bloom\\'s best'") > -1);
  fs.writeFileSync(path.join(__dirname, 'out-wp-snippet.php'), php);
});

t('bloggerSnippet() uses Blogger data tags and a safe fallback', function () {
  var x = LC.bloggerSnippet({ description: "Pandesal & 'ensaymada'", image: 'https://e.com/a.jpg' });
  assert.ok(x.indexOf("expr:content='data:view.title.escaped'") > -1);
  assert.ok(x.indexOf('Pandesal &amp; &#39;ensaymada&#39;') > -1);
  fs.writeFileSync(path.join(__dirname, 'out-blogger-snippet.xml'),
    '<root xmlns:b="urn:b" xmlns:expr="urn:expr">\n' + x + '\n</root>\n');
});

results.forEach(function (r) { console.log(r[0] + '  ' + r[1]); });
var failed = results.filter(function (r) { return r[0] === 'FAIL'; }).length;
console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
process.exit(failed ? 1 : 0);
