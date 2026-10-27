/*!
 * Link Card Studio - app.js
 * Wires the form, previews, checks and code output to the pure functions in core.js.
 * MIT (c) 2026 Efraim Ray - https://www.efraimray.com/
 */
(function () {
  'use strict';
  var LC = window.LinkCard;
  var app = document.getElementById('lcs-app');
  if (!LC || !app) return;

  var FIELDS = ['url', 'siteName', 'title', 'description', 'image', 'imageAlt', 'type', 'twitterCard', 'twitterSite', 'locale', 'themeColor'];
  var KEY_SAVED = 'lcs.saved.v1';
  var KEY_DRAFT = 'lcs.draft.v1';
  var KEY_THEME = 'lcs.theme.v1';

  /* Sample cards (invented businesses; .example domains are reserved for examples). */
  var SAMPLES = [
    {
      id: 'sample-blog', label: 'Sample: blog post (good)',
      card: {
        url: 'https://www.efraimray.com/2026/10/link-card-studio.html', siteName: 'Efraim Ray',
        title: 'Link Card Studio: Preview and Fix Your Social Share Cards',
        description: 'A free browser tool that previews your link on Google, Facebook, X, LinkedIn and chat apps, flags problems and writes the meta tags for you.',
        image: 'generate', imageAlt: 'Link Card Studio title card on a cobalt background',
        type: 'article', twitterCard: 'summary_large_image', twitterSite: '', locale: 'en_PH', themeColor: '#2448d8'
      }
    },
    {
      id: 'sample-bakery', label: 'Sample: bakery home page',
      card: {
        url: 'https://breadandbloom.example/', siteName: 'Bread & Bloom Bakery',
        title: 'Bread & Bloom Bakery | Fresh Pandesal in Valencia City',
        description: 'Hot pandesal from 5 AM, ube cheese rolls and custom cakes from ₱450. Order for pickup on Messenger or visit us on Sayre Highway, Valencia City.',
        image: 'generate', imageAlt: 'Bread & Bloom Bakery card with the shop name on a warm brown background',
        type: 'website', twitterCard: 'summary_large_image', twitterSite: '', locale: 'en_PH', themeColor: '#8a4b23'
      }
    },
    {
      id: 'sample-resort', label: 'Sample: resort promo (needs fixes)',
      card: {
        url: 'http://highlandlakeside.example/promo', siteName: '',
        title: 'Highland Lakeside Resort Malaybalay City Bukidnon Weekend Promo Rooms Cottages Pool Day Tour Rates 2026',
        description: 'Book now!',
        image: '/images/promo.jpg', imageAlt: '',
        type: 'website', twitterCard: 'summary_large_image', twitterSite: '', locale: 'en_PH', themeColor: ''
      }
    }
  ];

  var form = document.getElementById('lcs-form');
  var $ = function (id) { return document.getElementById(id); };
  var card = {};
  var imgToken = 0;
  var outMode = 'html';

  /* ---------- storage (always optional) ---------- */
  function load(key, fallback) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* ---------- text measuring with a canvas, same fonts Google uses ---------- */
  var ctx = document.createElement('canvas').getContext('2d');
  function measure(font) {
    return function (text) { ctx.font = font; return ctx.measureText(text).width; };
  }
  var mTitle = measure('20px Arial');
  var mDesc = measure('14px Arial');

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('lcs-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- form <-> card ---------- */
  function readForm() {
    FIELDS.forEach(function (f) {
      var el = $('f-' + f);
      if (el && !(f === 'image' && LC.isDataUrl(card.image) && el.value === '(image made in this browser)')) card[f] = el.value;
    });
  }
  function writeForm() {
    FIELDS.forEach(function (f) {
      var el = $('f-' + f);
      if (!el) return;
      el.value = f === 'image' && LC.isDataUrl(card.image) ? '(image made in this browser)' : (card[f] || '');
    });
    if (!$('f-type').value) $('f-type').value = 'website';
    if (!$('f-twitterCard').value) $('f-twitterCard').value = 'summary_large_image';
  }

  /* ---------- image helpers ---------- */
  function wrapLines(c2d, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (c2d.measureText(test).width > maxW && line) { lines.push(line); line = w; } else { line = test; }
    });
    if (line) lines.push(line);
    return lines;
  }

  /** Draw a simple 1200 x 630 title card and return a PNG data URL. */
  function makeCardImage(c) {
    var cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 630;
    var g = cv.getContext('2d');
    var base = /^#[0-9a-f]{6}$/i.test(c.themeColor || '') ? c.themeColor : '#2448d8';
    var grad = g.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, base); grad.addColorStop(1, '#0b1220');
    g.fillStyle = grad; g.fillRect(0, 0, 1200, 630);
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
    for (var x = 0; x <= 1200; x += 40) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 630); g.stroke(); }
    for (var y = 0; y <= 630; y += 40) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(1200, y + 0.5); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = '600 26px "JetBrains Mono", Consolas, monospace';
    g.fillText((c.siteName || LC.hostOf(c.url) || 'Your site').toUpperCase(), 80, 110);
    g.fillStyle = '#ffffff';
    g.font = '800 68px "Bricolage Grotesque", "Segoe UI", Arial, sans-serif';
    var lines = wrapLines(g, LC.clean(c.title) || 'Your page title', 1040).slice(0, 4);
    lines.forEach(function (l, i) { g.fillText(l, 80, 220 + i * 80); });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.font = '500 26px "IBM Plex Sans", Arial, sans-serif';
    g.fillText(LC.hostOf(c.url) || 'example.com', 80, 560);
    return cv.toDataURL('image/png');
  }

  function measureImage(src) {
    var token = ++imgToken;
    card.imageWidth = 0; card.imageHeight = 0;
    if (!src) { $('lcs-imgmeta').textContent = 'No image'; return; }
    if (!LC.isDataUrl(src) && !LC.isAbsUrl(src)) { $('lcs-imgmeta').textContent = 'Not a full URL'; return; }
    $('lcs-imgmeta').textContent = 'Measuring…';
    var im = new Image();
    im.onload = function () {
      if (token !== imgToken) return;
      card.imageWidth = im.naturalWidth; card.imageHeight = im.naturalHeight;
      $('lcs-imgmeta').textContent = im.naturalWidth + ' × ' + im.naturalHeight + ' px';
      render();
    };
    im.onerror = function () {
      if (token !== imgToken) return;
      $('lcs-imgmeta').textContent = 'Could not load here';
      render();
    };
    im.src = src;
  }

  function setImg(id, src) {
    var box = $(id).parentNode;
    var ph = box.querySelector('.ph');
    var ok = src && (LC.isDataUrl(src) || LC.isAbsUrl(src));
    $(id).hidden = !ok;
    if (ok) {
      if ($(id).getAttribute('src') !== src) $(id).setAttribute('src', src);
      $(id).setAttribute('alt', card.imageAlt || '');
      if (ph) ph.remove();
    } else if (!ph) {
      ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = 'No image';
      box.insertBefore(ph, box.firstChild);
    }
  }

  /* ---------- syntax colouring for the code box ---------- */
  function highlight(code) {
    return LC.esc(code)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>')
      .replace(/(&quot;[^\n]*?&quot;|&#39;[^\n]*?&#39;)/g, '<span class="tok-str">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z?][\w:?-]*)/g, '$1<span class="tok-tag">$2</span>')
      .replace(/(\s)(property|name|content|rel|href|expr:content|cond|data)=/g, '$1<span class="tok-attr">$2</span>=');
  }

  var HELP = {
    html: 'Paste inside the <head> of your page. Replace an existing tag rather than adding a second copy.',
    blogger: 'Blogger: Theme → Customize arrow → Edit HTML. Paste inside <head>, below the all-head-content include. Each post then uses its own title, search description and first image; this card fills in when a post has none.',
    wordpress: 'WordPress without an SEO plugin: save as wp-content/mu-plugins/link-card-tags.php. Each post uses its title, excerpt and featured image. It switches itself off if Yoast SEO or Rank Math is active.'
  };

  function codeFor(mode) {
    if (mode === 'blogger') return LC.bloggerSnippet(card);
    if (mode === 'wordpress') return LC.wordpressSnippet(card);
    return LC.buildTags(card).join('\n');
  }

  /* ---------- main render ---------- */
  function render() {
    var c = LC.normalize(card);
    var tPx = c.title ? mTitle(c.title) : 0;
    var dPx = c.description ? mDesc(c.description) : 0;

    // counters and pixel rulers (the mark sits at the limit; the bar runs to 120% of it)
    $('c-title').textContent = c.title.length + ' chars · ' + Math.round(tPx) + ' / 600 px';
    $('c-description').textContent = c.description.length + ' / 160 chars';
    var rt = $('r-title'), rd = $('r-description');
    rt.style.width = Math.min(100, tPx / (LC.LIMITS.titlePx * 1.2) * 100) + '%';
    rt.classList.toggle('is-warn', tPx > LC.LIMITS.titlePx);
    rd.style.width = Math.min(100, c.description.length / (LC.LIMITS.descChars.max * 1.2) * 100) + '%';
    rd.classList.toggle('is-warn', c.description.length > LC.LIMITS.descChars.max);
    $('h-title').textContent = tPx > LC.LIMITS.titlePx ? 'Too wide: Google will cut it. Put the key words first.' : 'Google cuts titles near 600 px.';
    $('h-title').classList.toggle('is-warn', tPx > LC.LIMITS.titlePx);
    $('h-description').textContent = c.description.length > LC.LIMITS.descChars.max ? 'Long: search results show about 155-160 characters.' : 'Aim for 70-160 characters.';
    $('h-description').classList.toggle('is-warn', c.description.length > LC.LIMITS.descChars.max);

    // previews
    var host = LC.hostOf(c.url) || 'example.com';
    var title = c.title || 'Your page title';
    $('g-fav').textContent = (c.siteName || host).charAt(0).toUpperCase();
    $('g-site').textContent = c.siteName || host;
    $('g-crumb').textContent = LC.breadcrumb(c.url) || 'https://example.com';
    var phone = $('lcs-pv').getAttribute('data-w') === 'phone';
    $('g-title').textContent = LC.truncateToWidth(title, phone ? 1000 : LC.LIMITS.titlePx, phone ? measure('18px Arial') : mTitle).text;
    $('g-desc').textContent = c.description ? LC.truncateToWidth(c.description, phone ? 900 : LC.LIMITS.descPx, mDesc).text : 'Google will pick text from the page when there is no description.';
    $('fb-host').textContent = host;
    $('fb-title').textContent = title;
    $('fb-desc').textContent = c.description;
    $('x-over').textContent = title;
    $('x-from').textContent = 'From ' + host;
    $('x-card').classList.toggle('is-summary', c.twitterCard === 'summary');
    $('li-title').textContent = title;
    $('li-host').textContent = host;
    $('chat-url').textContent = c.url || 'https://example.com';
    $('chat-title').textContent = title;
    $('chat-host').textContent = host;
    ['fb-img', 'x-img', 'li-img', 'chat-img'].forEach(function (id) { setImg(id, c.image); });

    // checks
    var res = LC.checkCard(card, { titlePx: tPx, descPx: dPx });
    var score = $('lcs-score');
    score.querySelector('b').textContent = res.score;
    score.className = 'score ' + (res.score >= 85 ? 'is-pass' : res.score >= 60 ? 'is-warn' : '');
    score.setAttribute('aria-label', 'Card score ' + res.score + ' out of 100');
    var n = { pass: 0, warn: 0, fail: 0 };
    $('lcs-checks').innerHTML = res.checks.map(function (k) {
      n[k.level]++;
      var icon = k.level === 'pass' ? '✓' : k.level === 'warn' ? '!' : '×';
      return '<li class="check ' + k.level + '"><span class="ic" aria-hidden="true">' + icon + '</span><div><b>' + LC.esc(k.label) +
        '</b> <span class="vh">(' + k.level + ')</span><p>' + LC.esc(k.msg) + '</p></div></li>';
    }).join('');
    $('lcs-tally').textContent = n.pass + ' pass · ' + n.warn + ' warn · ' + n.fail + ' fix';

    // code
    $('lcs-outhelp').textContent = HELP[outMode];
    $('lcs-out').firstChild.innerHTML = highlight(codeFor(outMode));

    store(KEY_DRAFT, card);
  }

  /* ---------- load a card into the editor ---------- */
  function useCard(src) {
    card = {};
    FIELDS.forEach(function (f) { card[f] = src[f] || ''; });
    if (card.image === 'generate') card.image = makeCardImage(card);
    writeForm();
    measureImage(card.image);
    render();
  }

  function fillLoadMenu() {
    var saved = load(KEY_SAVED, []);
    var sel = $('lcs-load');
    var html = '<option value="">Load a card…</option><optgroup label="Samples">';
    SAMPLES.forEach(function (s) { html += '<option value="' + s.id + '">' + LC.esc(s.label) + '</option>'; });
    html += '</optgroup>';
    if (saved.length) {
      html += '<optgroup label="Saved in this browser">';
      saved.forEach(function (s, i) { html += '<option value="saved-' + i + '">' + LC.esc(s.name) + '</option>'; });
      html += '</optgroup>';
    }
    sel.innerHTML = html;
  }

  /* ---------- events ---------- */
  form.addEventListener('input', function (e) {
    if (e.target.id === 'f-source') return;
    readForm();
    if (e.target.id === 'f-image') measureImage(card.image);
    render();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  $('lcs-load').addEventListener('change', function (e) {
    var v = e.target.value;
    if (!v) return;
    if (v.indexOf('saved-') === 0) {
      var s = load(KEY_SAVED, [])[+v.slice(6)];
      if (s) { useCard(s.card); toast('Loaded “' + s.name + '”'); }
    } else {
      SAMPLES.forEach(function (s) { if (s.id === v) { useCard(s.card); toast('Loaded ' + s.label.replace('Sample: ', 'the sample ')); } });
    }
    e.target.value = '';
  });

  $('lcs-save').addEventListener('click', function () {
    var saved = load(KEY_SAVED, []);
    var name = LC.clean(card.title).slice(0, 48) || 'Untitled card';
    var copy = JSON.parse(JSON.stringify(card));
    saved = saved.filter(function (s) { return s.name !== name; });
    saved.unshift({ name: name, card: copy, at: Date.now() });
    saved = saved.slice(0, 12);
    if (store(KEY_SAVED, saved)) { fillLoadMenu(); toast('Saved “' + name + '” in this browser'); }
    else toast('This browser blocks saving. Copy the tags instead.');
  });

  $('lcs-make').addEventListener('click', function () {
    readForm();
    card.image = makeCardImage(card);
    if (!card.imageAlt) card.imageAlt = (card.siteName || 'Site') + ' title card: ' + LC.clean(card.title);
    writeForm();
    measureImage(card.image);
    render();
    toast('Made a 1200 × 630 card image. Upload it to your site to use it.');
  });

  $('f-file').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Choose an image file (JPG, PNG or WebP).'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      card.image = String(reader.result);
      writeForm();
      measureImage(card.image);
      render();
      toast('Previewing ' + file.name + ' (stays in your browser)');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  $('lcs-read').addEventListener('click', function () {
    var src = $('f-source').value;
    if (!LC.clean(src)) { toast('Paste the page source first.'); return; }
    var r = LC.parseHead(src, window.DOMParser);
    useCard(r.card);
    $('lcs-found').innerHTML = r.found.map(function (k) { return '<span class="tagpill ok">' + LC.esc(k) + '</span>'; }).join('') +
      r.missing.map(function (k) { return '<span class="tagpill no" title="Missing">' + LC.esc(k) + '</span>'; }).join('');
    toast('Found ' + r.found.length + ' of ' + (r.found.length + r.missing.length) + ' tags');
  });

  app.querySelectorAll('[data-w]').forEach(function (b) {
    if (b.tagName !== 'BUTTON') return;
    b.addEventListener('click', function () {
      $('lcs-pv').setAttribute('data-w', b.getAttribute('data-w'));
      app.querySelectorAll('button[data-w]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });

  app.querySelectorAll('[data-out]').forEach(function (b) {
    b.addEventListener('click', function () {
      outMode = b.getAttribute('data-out');
      app.querySelectorAll('[data-out]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      render();
    });
  });

  $('lcs-copy').addEventListener('click', function () {
    var text = codeFor(outMode);
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents($('lcs-out'));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(range);
      toast('Selected. Press Ctrl+C (or long-press) to copy.');
    }
    try {
      navigator.clipboard.writeText(text).then(function () { toast('Copied ' + outMode.toUpperCase() + ' tags'); }, fallback);
    } catch (err) { fallback(); }
  });

  /* theme toggle: remembers the choice in this browser */
  function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); }
  applyTheme(load(KEY_THEME, ''));
  $('lcs-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store(KEY_THEME, next);
    toast(next === 'dark' ? 'Dark theme' : 'Light theme');
  });

  /* ---------- start ---------- */
  fillLoadMenu();
  var draft = load(KEY_DRAFT, null);
  var start = function () { useCard(draft && draft.title !== undefined ? draft : SAMPLES[0].card); };
  // Wait briefly for web fonts so the generated card image uses them.
  if (document.fonts && document.fonts.ready) {
    var done = false;
    document.fonts.ready.then(function () { if (!done) { done = true; start(); } });
    setTimeout(function () { if (!done) { done = true; start(); } }, 1200);
  } else start();

  // Exposed for automated tests only.
  window.__lcs = { get card() { return card; }, render: render, useCard: useCard, samples: SAMPLES };
})();
