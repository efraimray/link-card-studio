/*
 * Link Card Studio - tools/build-demo.js
 * Builds demo/index.html: one self-contained file (CSS and JS inlined) plus the
 * "About this project" section, with real line counts per language.
 * Run from the project root: node tools/build-demo.js
 * Option: --fragment writes demo/showcase-fragment.html (no doctype/head) for hosts
 * that add their own page skeleton.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

/* Count lines per language (source only: skips demo/, .git, tests output, publisher scripts). */
function walk(dir, list) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var full = path.join(dir, d.name);
    var rel = path.relative(root, full);
    if (d.isDirectory()) {
      if (['.git', 'demo', 'node_modules', '.github'].indexOf(d.name) === -1) walk(full, list);
    } else if (!/^publish-to-github\./.test(d.name) && !/^tests[\\/]out-/.test(rel)) {
      list.push(full);
    }
  });
  return list;
}
var LANG = { '.js': 'JavaScript', '.css': 'CSS', '.html': 'HTML' };
var counts = {}, total = 0;
walk(root, []).forEach(function (f) {
  var lang = LANG[path.extname(f)];
  if (!lang) return;
  var n = fs.readFileSync(f, 'utf8').split('\n').length - 1;
  counts[lang] = (counts[lang] || 0) + n;
  total += n;
});
var langs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
var langHtml = langs.map(function (l) {
  var pct = Math.round(counts[l] / total * 100);
  return '<div class="lang"><span>' + l + '</span><span class="lang-bar"><span style="width:' + pct + '%"></span></span><span>' + pct + '%</span></div>';
}).join('');

var index = read('index.html');
var appHtml = index.split('<!--APP-START-->')[1].split('<!--APP-END-->')[0];
var about = read('tools/about.html').replace('{{LANGS}}', langHtml);
appHtml = appHtml.replace('  <footer class="lcs-foot">', about + '\n  <footer class="lcs-foot">');
var css = read('css/styles.css');
var js = read('js/core.js') + '\n' + read('js/app.js');
var fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">';
var title = 'Showcase · Link Card Studio';

var full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<title>' + title + '</title>\n' +
  '<meta name="description" content="Live demo of Link Card Studio: preview and fix social share cards, then copy meta tags for HTML, Blogger or WordPress.">\n' +
  fonts + '\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + appHtml + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n';
fs.mkdirSync(path.join(root, 'demo'), { recursive: true });
fs.writeFileSync(path.join(root, 'demo/index.html'), full);

if (process.argv.indexOf('--fragment') > -1) {
  var frag = '<title>' + title + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + fonts +
    '\n<style>\n' + css + '\n</style>\n' + appHtml + '\n<script>\n' + js + '\n</script>\n';
  fs.writeFileSync(process.argv[process.argv.indexOf('--fragment') + 1] || path.join(root, 'demo/showcase-fragment.html'), frag);
}
console.log('demo/index.html written. Lines:', JSON.stringify(counts), 'total', total);
