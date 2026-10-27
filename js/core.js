/*!
 * Link Card Studio - core.js
 * Pure logic: no DOM access except the optional DOMParser passed to parseHead().
 * Works in the browser (window.LinkCard) and in Node (module.exports) for tests.
 * MIT (c) 2026 Efraim Ray - https://www.efraimray.com/
 */
(function (root) {
  'use strict';

  /** Approximate limits used by search and social previews (they change; treat as guides). */
  var LIMITS = {
    titleChars: { min: 30, max: 60 },
    descChars: { min: 70, max: 160 },
    titlePx: 600,        // Google desktop title, Arial 20px
    descPx: 920,         // Google desktop description, about two lines of Arial 14px
    imageBest: { w: 1200, h: 630 },
    imageMin: { w: 600, h: 315 },
    ratio: 1.91,
    ratioTolerance: 0.06
  };

  /** Escape text for an HTML attribute or text node. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Escape text for a single-quoted PHP string. */
  function phpStr(value) {
    return "'" + String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function parseUrl(u) {
    try {
      var x = new URL(String(u || '').trim());
      if (x.protocol === 'https:' || x.protocol === 'http:') return x;
    } catch (e) { /* not a URL */ }
    return null;
  }

  function isAbsUrl(u) { return !!parseUrl(u); }

  function isDataUrl(u) { return /^data:image\//i.test(String(u || '')); }

  /** "www.example.com" -> "example.com" */
  function hostOf(u) {
    var x = parseUrl(u);
    return x ? x.hostname.replace(/^www\./i, '') : '';
  }

  /** Google-style breadcrumb: "https://example.com › blog › post-name" */
  function breadcrumb(u) {
    var x = parseUrl(u);
    if (!x) return '';
    var parts = x.pathname.split('/').filter(Boolean).map(function (p) {
      return decodeURIComponent(p).replace(/\.html?$/i, '');
    });
    return [x.protocol + '//' + x.hostname].concat(parts.slice(0, 3)).join(' \u203A ');
  }

  /**
   * Cut text so it fits maxPx, ending at a word boundary with an ellipsis.
   * measure(text) must return the rendered width in pixels.
   */
  function truncateToWidth(text, maxPx, measure) {
    text = clean(text);
    var full = measure(text);
    if (full <= maxPx) return { text: text, truncated: false, width: full };
    var ell = ' \u2026';
    var lo = 0, hi = text.length;
    while (lo < hi) {               // binary search for the longest prefix that fits
      var mid = Math.ceil((lo + hi) / 2);
      if (measure(text.slice(0, mid) + ell) <= maxPx) lo = mid; else hi = mid - 1;
    }
    var cut = text.slice(0, lo);
    var space = cut.lastIndexOf(' ');
    if (space > lo * 0.6) cut = cut.slice(0, space);
    cut = cut.replace(/[\s,.;:\-\u2013\u2014|]+$/, '');
    return { text: cut + ell, truncated: true, width: full };
  }

  /** Build the list of head tags for a card. Returns an array of HTML lines. */
  function buildTags(card) {
    var c = normalize(card);
    var lines = [];
    var img = c.image && !isDataUrl(c.image) ? c.image : 'https://example.com/path/to/card-image.jpg';
    if (c.title) lines.push('<title>' + esc(c.title) + '</title>');
    if (c.description) lines.push('<meta name="description" content="' + esc(c.description) + '">');
    if (c.url) lines.push('<link rel="canonical" href="' + esc(c.url) + '">');
    lines.push('');
    lines.push('<!-- Open Graph: Facebook, Messenger, LinkedIn, Viber and most chat apps -->');
    lines.push('<meta property="og:type" content="' + esc(c.type) + '">');
    if (c.siteName) lines.push('<meta property="og:site_name" content="' + esc(c.siteName) + '">');
    if (c.title) lines.push('<meta property="og:title" content="' + esc(c.title) + '">');
    if (c.description) lines.push('<meta property="og:description" content="' + esc(c.description) + '">');
    if (c.url) lines.push('<meta property="og:url" content="' + esc(c.url) + '">');
    lines.push('<meta property="og:image" content="' + esc(img) + '">');
    if (c.imageWidth && c.imageHeight) {
      lines.push('<meta property="og:image:width" content="' + c.imageWidth + '">');
      lines.push('<meta property="og:image:height" content="' + c.imageHeight + '">');
    }
    if (c.imageAlt) lines.push('<meta property="og:image:alt" content="' + esc(c.imageAlt) + '">');
    if (c.locale) lines.push('<meta property="og:locale" content="' + esc(c.locale) + '">');
    lines.push('');
    lines.push('<!-- X (Twitter) card -->');
    lines.push('<meta name="twitter:card" content="' + esc(c.twitterCard) + '">');
    if (c.twitterSite) lines.push('<meta name="twitter:site" content="' + esc(c.twitterSite) + '">');
    if (c.title) lines.push('<meta name="twitter:title" content="' + esc(c.title) + '">');
    if (c.description) lines.push('<meta name="twitter:description" content="' + esc(c.description) + '">');
    lines.push('<meta name="twitter:image" content="' + esc(img) + '">');
    if (c.imageAlt) lines.push('<meta name="twitter:image:alt" content="' + esc(c.imageAlt) + '">');
    if (c.themeColor) {
      lines.push('');
      lines.push('<meta name="theme-color" content="' + esc(c.themeColor) + '">');
    }
    return lines;
  }

  /** Fill defaults and trim every field. */
  function normalize(card) {
    card = card || {};
    var handle = clean(card.twitterSite);
    if (handle && handle.charAt(0) !== '@') handle = '@' + handle;
    return {
      title: clean(card.title),
      description: clean(card.description),
      url: clean(card.url),
      siteName: clean(card.siteName),
      image: String(card.image || '').trim(),
      imageAlt: clean(card.imageAlt),
      imageWidth: parseInt(card.imageWidth, 10) || 0,
      imageHeight: parseInt(card.imageHeight, 10) || 0,
      type: card.type === 'article' ? 'article' : 'website',
      twitterCard: card.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      twitterSite: handle,
      locale: clean(card.locale) || 'en_PH',
      themeColor: /^#[0-9a-f]{3,8}$/i.test(clean(card.themeColor)) ? clean(card.themeColor) : ''
    };
  }

  /**
   * Check a card. m = { titlePx, descPx } measured widths (optional).
   * Returns { score, checks: [{ id, level: 'pass'|'warn'|'fail', label, msg }] }.
   */
  function checkCard(card, m) {
    var c = normalize(card);
    m = m || {};
    var out = [];
    function add(id, level, label, msg) { out.push({ id: id, level: level, label: label, msg: msg }); }
    var tl = c.title.length, dl = c.description.length;

    if (!tl) add('title', 'fail', 'Title', 'Add a title. Every preview uses it as the headline.');
    else if (m.titlePx > LIMITS.titlePx) add('title', 'warn', 'Title', 'About ' + Math.round(m.titlePx) + 'px wide. Google cuts titles near ' + LIMITS.titlePx + 'px, so move the key words to the front.');
    else if (tl < LIMITS.titleChars.min) add('title', 'warn', 'Title', tl + ' characters. A title of 30-60 characters usually describes the page better.');
    else if (tl > LIMITS.titleChars.max) add('title', 'warn', 'Title', tl + ' characters. It fits the pixel width, but over 60 characters often gets cut on phones.');
    else add('title', 'pass', 'Title', tl + ' characters' + (m.titlePx ? ', about ' + Math.round(m.titlePx) + 'px' : '') + '. Fits.');

    if (!dl) add('desc', 'fail', 'Description', 'Add a description. Without one, sites pick random text from the page.');
    else if (dl < LIMITS.descChars.min) add('desc', 'warn', 'Description', dl + ' characters. Add detail; 70-160 characters works best.');
    else if (dl > LIMITS.descChars.max || m.descPx > LIMITS.descPx) add('desc', 'warn', 'Description', dl + ' characters. Search results will cut it near 155-160 characters.');
    else add('desc', 'pass', 'Description', dl + ' characters. Fits.');

    if (!c.url) add('url', 'fail', 'Page URL', 'Add the full page address, starting with https://');
    else if (!isAbsUrl(c.url)) add('url', 'fail', 'Page URL', 'Use a full address such as https://example.com/page, not a relative path.');
    else if (/^http:/i.test(c.url)) add('url', 'warn', 'Page URL', 'The address uses http://. Switch to https:// so browsers and apps trust it.');
    else add('url', 'pass', 'Page URL', 'Full https address. Used for og:url and the canonical link.');

    if (!c.image) add('image', 'fail', 'Image', 'Add an image. Posts without one get a small, easy-to-miss card.');
    else if (isDataUrl(c.image)) add('image', 'warn', 'Image', 'This image only lives in your browser. Upload it to your site and paste its full https address.');
    else if (!isAbsUrl(c.image)) add('image', 'fail', 'Image', 'og:image must be a full https address; relative paths are ignored by Facebook and X.');
    else add('image', 'pass', 'Image', 'Full image address.');

    if (c.image) {
      if (!c.imageWidth || !c.imageHeight) {
        add('size', 'warn', 'Image size', 'Size unknown (the image could not be loaded here). Aim for 1200 x 630 px.');
      } else {
        var w = c.imageWidth, h = c.imageHeight, ratio = w / h;
        if (w >= LIMITS.imageBest.w && h >= LIMITS.imageBest.h) add('size', 'pass', 'Image size', w + ' x ' + h + ' px. Sharp on large cards.');
        else if (w >= LIMITS.imageMin.w && h >= LIMITS.imageMin.h) add('size', 'warn', 'Image size', w + ' x ' + h + ' px. Works, but 1200 x 630 px looks sharper.');
        else add('size', 'fail', 'Image size', w + ' x ' + h + ' px. Below 600 x 315 px most apps fall back to a small thumbnail.');
        if (Math.abs(ratio - LIMITS.ratio) <= LIMITS.ratioTolerance) add('ratio', 'pass', 'Image shape', 'Ratio ' + ratio.toFixed(2) + ':1, matches the 1.91:1 card.');
        else add('ratio', 'warn', 'Image shape', 'Ratio ' + ratio.toFixed(2) + ':1. Cards are 1.91:1, so the edges will be cropped.');
      }
    }

    if (c.image) {
      if (c.imageAlt) add('alt', 'pass', 'Image alt text', 'Screen reader users hear a description of the image.');
      else add('alt', 'warn', 'Image alt text', 'Add alt text (og:image:alt) so screen reader users know what the image shows.');
    }

    if (c.siteName) add('site', 'pass', 'Site name', 'Shown above the title on Facebook and in chat apps.');
    else add('site', 'warn', 'Site name', 'Add a site name (og:site_name) so people recognise the source.');

    if (tl && dl && c.title.toLowerCase() === c.description.toLowerCase()) {
      add('dupe', 'warn', 'Title vs description', 'The description repeats the title. Use it to add new information.');
    }

    if (c.twitterCard === 'summary_large_image' && !c.image) add('xcard', 'warn', 'X card', 'Large image card selected but there is no image.');
    else add('xcard', 'pass', 'X card', c.twitterCard === 'summary' ? 'Small square card.' : 'Large image card.');

    var points = 0;
    out.forEach(function (x) { points += x.level === 'pass' ? 1 : x.level === 'warn' ? 0.5 : 0; });
    return { score: out.length ? Math.round(points / out.length * 100) : 0, checks: out };
  }

  /**
   * Read social tags out of a page's HTML source.
   * DOMParserCtor: window.DOMParser in the browser (or a compatible implementation).
   * Returns { card, found: [names], missing: [names] }.
   */
  function parseHead(html, DOMParserCtor) {
    var doc = new DOMParserCtor().parseFromString(String(html || ''), 'text/html');
    function meta(attr, name) {
      var els = doc.querySelectorAll('meta[' + attr + ']');
      for (var i = 0; i < els.length; i++) {
        if ((els[i].getAttribute(attr) || '').toLowerCase() === name) return clean(els[i].getAttribute('content'));
      }
      return '';
    }
    var t = doc.querySelector('title');
    var canon = doc.querySelector('link[rel="canonical"]');
    var raw = {
      'title': t ? clean(t.textContent) : '',
      'description': meta('name', 'description'),
      'canonical': canon ? clean(canon.getAttribute('href')) : '',
      'og:title': meta('property', 'og:title'),
      'og:description': meta('property', 'og:description'),
      'og:url': meta('property', 'og:url'),
      'og:image': meta('property', 'og:image'),
      'og:image:alt': meta('property', 'og:image:alt'),
      'og:site_name': meta('property', 'og:site_name'),
      'og:type': meta('property', 'og:type'),
      'og:locale': meta('property', 'og:locale'),
      'twitter:card': meta('name', 'twitter:card'),
      'twitter:site': meta('name', 'twitter:site'),
      'twitter:image': meta('name', 'twitter:image')
    };
    var found = [], missing = [];
    Object.keys(raw).forEach(function (k) { (raw[k] ? found : missing).push(k); });
    var w = parseInt(meta('property', 'og:image:width'), 10) || 0;
    var h = parseInt(meta('property', 'og:image:height'), 10) || 0;
    return {
      card: {
        title: raw['og:title'] || raw.title,
        description: raw['og:description'] || raw.description,
        url: raw['og:url'] || raw.canonical,
        image: raw['og:image'] || raw['twitter:image'],
        imageAlt: raw['og:image:alt'],
        imageWidth: w,
        imageHeight: h,
        siteName: raw['og:site_name'],
        type: raw['og:type'] === 'article' ? 'article' : 'website',
        twitterCard: raw['twitter:card'] === 'summary' ? 'summary' : 'summary_large_image',
        twitterSite: raw['twitter:site'],
        locale: raw['og:locale'] || 'en_PH',
        themeColor: meta('name', 'theme-color')
      },
      found: found,
      missing: missing
    };
  }

  /** Blogger theme snippet: dynamic per post, with this card as the fallback. */
  function bloggerSnippet(card) {
    var c = normalize(card);
    var img = c.image && !isDataUrl(c.image) && isAbsUrl(c.image) ? c.image : 'https://example.com/your-default-card.jpg';
    var desc = c.description || 'Describe your blog in one sentence.';
    var L = [];
    L.push("<!-- Link Card Studio: social cards for Blogger.");
    L.push("     Theme > Edit HTML > paste inside <head>, below <b:include data='blog' name='all-head-content'/>.");
    L.push("     Back up your theme first. If View Source then shows an og: tag twice, delete one copy. -->");
    L.push("<meta property='og:site_name' expr:content='data:blog.title.escaped'/>");
    L.push("<meta property='og:locale' content='" + esc(c.locale) + "'/>");
    L.push("<meta property='og:url' expr:content='data:view.url.canonical'/>");
    L.push("<b:if cond='data:view.isSingleItem'>");
    L.push("  <meta property='og:type' content='article'/>");
    L.push("<b:else/>");
    L.push("  <meta property='og:type' content='website'/>");
    L.push("</b:if>");
    L.push("<meta property='og:title' expr:content='data:view.title.escaped'/>");
    L.push("<meta name='twitter:title' expr:content='data:view.title.escaped'/>");
    L.push("<b:if cond='data:view.description'>");
    L.push("  <meta property='og:description' expr:content='data:view.description.escaped'/>");
    L.push("  <meta name='twitter:description' expr:content='data:view.description.escaped'/>");
    L.push("<b:else/>");
    L.push("  <meta property='og:description' content='" + esc(desc) + "'/>");
    L.push("  <meta name='twitter:description' content='" + esc(desc) + "'/>");
    L.push("</b:if>");
    L.push("<b:if cond='data:view.featuredImage'>");
    L.push("  <meta property='og:image' expr:content='resizeImage(data:view.featuredImage, 1200, &quot;1200:630&quot;)'/>");
    L.push("  <meta name='twitter:image' expr:content='resizeImage(data:view.featuredImage, 1200, &quot;1200:630&quot;)'/>");
    L.push("<b:else/>");
    L.push("  <meta property='og:image' content='" + esc(img) + "'/>");
    L.push("  <meta name='twitter:image' content='" + esc(img) + "'/>");
    L.push("</b:if>");
    L.push("<meta name='twitter:card' content='" + esc(c.twitterCard) + "'/>");
    if (c.twitterSite) L.push("<meta name='twitter:site' content='" + esc(c.twitterSite) + "'/>");
    return L.join('\n');
  }

  /** WordPress mu-plugin: dynamic per post, skips output when an SEO plugin is active. */
  function wordpressSnippet(card) {
    var c = normalize(card);
    var img = c.image && !isDataUrl(c.image) && isAbsUrl(c.image) ? c.image : 'https://example.com/your-default-card.jpg';
    var desc = c.description || 'Describe your site in one sentence.';
    return [
      '<?php',
      '/**',
      ' * Plugin Name: Link Card Tags',
      ' * Description: Open Graph and X card tags generated with Link Card Studio. Skips output when Yoast SEO or Rank Math is active.',
      ' * Version:     1.0.0',
      ' * License:     GPL-2.0-or-later',
      ' *',
      ' * Save as wp-content/mu-plugins/link-card-tags.php (create the folder if needed).',
      ' */',
      '',
      "defined( 'ABSPATH' ) || exit;",
      '',
      "add_action( 'wp_head', 'lcs_print_card_tags', 5 );",
      '',
      'function lcs_print_card_tags() {',
      "\tif ( defined( 'WPSEO_VERSION' ) || class_exists( 'RankMath' ) ) {",
      '\t\treturn; // An SEO plugin already prints these tags.',
      '\t}',
      '',
      '\t$default_desc  = ' + phpStr(desc) + ';',
      '\t$default_image = ' + phpStr(img) + ';',
      '\t$single        = is_singular();',
      '',
      "\t$title = $single ? get_the_title() : get_bloginfo( 'name' );",
      "\t$desc  = ( $single && has_excerpt() ) ? wp_strip_all_tags( get_the_excerpt() ) : $default_desc;",
      "\t$url   = $single ? get_permalink() : home_url( '/' );",
      '\t$image = $default_image;',
      '\tif ( $single && has_post_thumbnail() ) {',
      "\t\t$src = wp_get_attachment_image_src( get_post_thumbnail_id(), 'full' );",
      '\t\tif ( $src ) {',
      '\t\t\t$image = $src[0];',
      '\t\t}',
      '\t}',
      '',
      '\t$og = array(',
      "\t\t'og:type'        => $single ? 'article' : 'website',",
      "\t\t'og:site_name'   => get_bloginfo( 'name' ),",
      "\t\t'og:title'       => $title,",
      "\t\t'og:description' => $desc,",
      "\t\t'og:url'         => $url,",
      "\t\t'og:image'       => $image,",
      "\t\t'og:locale'      => " + phpStr(c.locale) + ',',
      '\t);',
      '\t$x = array(',
      "\t\t'twitter:card'        => " + phpStr(c.twitterCard) + ',',
      "\t\t'twitter:title'       => $title,",
      "\t\t'twitter:description' => $desc,",
      "\t\t'twitter:image'       => $image,",
      c.twitterSite ? "\t\t'twitter:site'        => " + phpStr(c.twitterSite) + ',' : null,
      '\t);',
      '',
      '\tforeach ( $og as $property => $content ) {',
      "\t\tprintf( '<meta property=\"%s\" content=\"%s\" />' . \"\\n\", esc_attr( $property ), esc_attr( $content ) );",
      '\t}',
      '\tforeach ( $x as $name => $content ) {',
      "\t\tprintf( '<meta name=\"%s\" content=\"%s\" />' . \"\\n\", esc_attr( $name ), esc_attr( $content ) );",
      '\t}',
      '}',
      ''
    ].filter(function (line) { return line !== null; }).join('\n');
  }

  var api = {
    LIMITS: LIMITS,
    esc: esc,
    clean: clean,
    isAbsUrl: isAbsUrl,
    isDataUrl: isDataUrl,
    hostOf: hostOf,
    breadcrumb: breadcrumb,
    truncateToWidth: truncateToWidth,
    normalize: normalize,
    buildTags: buildTags,
    checkCard: checkCard,
    parseHead: parseHead,
    bloggerSnippet: bloggerSnippet,
    wordpressSnippet: wordpressSnippet
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LinkCard = api;
})(typeof window !== 'undefined' ? window : this);
