/* Search and answer-engine optimisation: head tags, structured data, sitemap, robots.txt, llms.txt and response headers.
   Everything is generated from content/*.json, so a change made in the admin panel reaches search engines on the next build. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const I = require('./i18n.cjs');
const PU = require('./photo-url.cjs');

const ORIGIN = I.SITE.url.replace(/\/$/, '');
const NAME = 'Berkay Mavral', BRAND = 'Berkay Mavral Photography';
const LOGO = ORIGIN + '/media/og-logo.png';
const AVATAR = 'https://images.pexels.com/users/avatars/389232961/berkay-mavral-714.jpeg?auto=compress&fit=crop&h=700&w=600';
const idx = lang => (lang === 'en' ? 1 : 0);
const pageUrl = lang => ORIGIN + (lang === 'en' ? '/en/' : '/');
const text = (lang, k) => I.S[k][idx(lang)];
const plain = s => s.replace(/<[^>]+>/g, '');
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* tags that depend on the language of the page */
const head = lang => [
  '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
  '<meta name="author" content="' + NAME + '">',
  '<link rel="canonical" href="' + pageUrl(lang) + '">',
  '<link rel="alternate" hreflang="tr" href="' + pageUrl('tr') + '">',
  '<link rel="alternate" hreflang="en" href="' + pageUrl('en') + '">',
  '<link rel="alternate" hreflang="x-default" href="' + pageUrl('tr') + '">',
  '<meta property="og:url" content="' + pageUrl(lang) + '">',
  '<meta property="og:locale" content="' + (lang === 'en' ? 'en_US' : 'tr_TR') + '">',
  '<meta property="og:locale:alternate" content="' + (lang === 'en' ? 'tr_TR' : 'en_US') + '">'
].join('\n');

/* structured data: who the photographer is, what the business offers, and the pictures themselves */
const jsonLd = lang => {
  const li = idx(lang), url = pageUrl(lang), home = ORIGIN + '/';
  const T = k => I.S[k][li];
  const personId = home + '#person', siteId = home + '#website', bizId = home + '#business';
  const same = [I.SITE.instagram, I.SITE.pexels].filter(Boolean);
  const city = { '@type': 'City', name: li ? 'Istanbul' : 'İstanbul', containedInPlace: { '@type': 'Country', name: 'Türkiye' } };
  const featured = I.PHOTOS.photos.filter(p => p.hero || p.source === 'cloudinary').slice(0, 40);
  const image = p => {
    const cap = I.CAP[p.ref][li];
    return {
      '@type': 'ImageObject', contentUrl: PU.url(p, 'w', 1600), thumbnailUrl: PU.url(p, 'w', 400),
      name: cap, caption: cap, creator: { '@id': personId }, creditText: NAME,
      copyrightNotice: '© ' + NAME, acquireLicensePage: home + '#contact'
    };
  };
  const graph = [
    { '@type': 'WebSite', '@id': siteId, url: home, name: BRAND, alternateName: [NAME], inLanguage: ['tr', 'en'], publisher: { '@id': personId } },
    {
      '@type': 'Person', '@id': personId, name: NAME, url: home, image: AVATAR,
      jobTitle: li ? 'Photographer' : 'Fotoğrafçı', description: T('desc'), email: I.SITE.email, sameAs: same,
      homeLocation: city, nationality: { '@type': 'Country', name: 'Türkiye' }, knowsLanguage: ['tr', 'en'],
      knowsAbout: li
        ? ['Street photography', 'City photography', 'Portrait photography', 'Architecture photography', 'Golden hour photography', 'Night photography']
        : ['Sokak fotoğrafçılığı', 'Şehir fotoğrafçılığı', 'Portre fotoğrafçılığı', 'Mimari fotoğrafçılık', 'Gün batımı fotoğrafçılığı', 'Gece fotoğrafçılığı'],
      worksFor: { '@id': bizId }
    },
    {
      '@type': 'ProfessionalService', '@id': bizId, name: BRAND, url: home, image: LOGO, logo: LOGO, description: T('desc'),
      founder: { '@id': personId }, email: I.SITE.email, sameAs: same, areaServed: city,
      address: { '@type': 'PostalAddress', addressLocality: li ? 'Istanbul' : 'İstanbul', addressCountry: 'TR' },
      serviceType: li
        ? ['Street photography', 'City photography', 'Portrait photography', 'Architecture photography', 'Framed photo prints']
        : ['Sokak fotoğrafçılığı', 'Şehir fotoğrafçılığı', 'Portre fotoğrafçılığı', 'Mimari fotoğrafçılık', 'Çerçeveli fotoğraf baskısı']
    },
    {
      '@type': 'WebPage', '@id': url + '#webpage', url, name: T('title'), description: T('desc'), inLanguage: lang,
      isPartOf: { '@id': siteId }, about: { '@id': personId }, primaryImageOfPage: { '@type': 'ImageObject', url: LOGO }
    },
    {
      '@type': 'ImageGallery', '@id': url + '#gallery', name: T('workH2'), url: url + '#work', inLanguage: lang,
      isPartOf: { '@id': url + '#webpage' }, author: { '@id': personId }, hasPart: featured.map(image)
    }
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
};

/* date of the last change to the site's content or code (falls back to today) */
const lastmod = () => {
  try {
    const d = cp.execFileSync('git', ['log', '-1', '--format=%cs', '--', 'content', 'src'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch { /* no git here */ }
  return new Date().toISOString().slice(0, 10);
};

const sitemap = () => {
  const date = lastmod();
  const alt = ['tr', 'en'].map(l => '    <xhtml:link rel="alternate" hreflang="' + l + '" href="' + pageUrl(l) + '"/>').join('\n') +
    '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + pageUrl('tr') + '"/>';
  const entry = lang => {
    const imgs = I.PHOTOS.photos.map(p =>
      '    <image:image><image:loc>' + xml(PU.url(p, 'w', 1600)) + '</image:loc><image:caption>' + xml(I.CAP[p.ref][idx(lang)]) + '</image:caption></image:image>').join('\n');
    return '  <url>\n    <loc>' + pageUrl(lang) + '</loc>\n    <lastmod>' + date + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>' + (lang === 'tr' ? '1.0' : '0.9') + '</priority>\n' + alt + '\n' + imgs + '\n  </url>';
  };
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + entry('tr') + '\n' + entry('en') + '\n</urlset>\n';
};

/* search and answer bots may read everything; bots that only collect training data are turned away (the photographs are the artist's work) */
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'Meta-ExternalAgent', 'cohere-ai'];
const robots = () => [
  'User-agent: *', 'Allow: /', '',
  '# Bots that collect photographs and text only to train AI models are not welcome.',
  '# Search engines and AI answer engines (which link back to the site) are.',
  ...TRAINING_BOTS.flatMap(b => ['User-agent: ' + b, 'Disallow: /', '']),
  'Sitemap: ' + ORIGIN + '/sitemap.xml', ''
].join('\n');

/* a plain summary for AI assistants (llms.txt convention) */
const llms = () => {
  const en = 1, views = (plain(I.S.note[en]).match(/[\d.,]+ million/) || [])[0];
  return [
    '# ' + BRAND, '',
    '> ' + I.S.desc[en] + ' / ' + I.S.desc[0], '',
    'Berkay Mavral is a photographer based in Istanbul, Türkiye. He photographs street life, the city, architecture and portraits, from the morning commute to after dark, in four kinds of light: golden hour, daylight, blue hour and night. The site is in Turkish (/) and English (/en/).', '',
    views ? 'His photographs on Pexels have passed ' + views + ' views.' : '', '',
    '## Pages', '',
    '- [Home, Turkish](' + ORIGIN + '/): the portfolio and shop in Turkish',
    '- [Home, English](' + ORIGIN + '/en/): the same in English',
    '- [Photo gallery](' + ORIGIN + '/#work): ' + I.PHOTOS.photos.length + ' photographs, filterable by light (golden hour, daylight, blue hour, night)',
    '- [About](' + ORIGIN + '/#about): who Berkay is and what he photographs',
    '- [Try a photo in a frame, then buy](' + ORIGIN + '/#prints): framed prints, ordered by email',
    '- [Contact](' + ORIGIN + '/#contact): shoot requests and collaborations, ' + I.SITE.email, '',
    '## Elsewhere', '',
    '- [Instagram](' + I.SITE.instagram + ')',
    '- [Pexels](' + I.SITE.pexels + ')', '',
    '## Using this content', '',
    'The photographs and texts are © ' + NAME + '. When you quote or describe the work, please name Berkay Mavral and link to ' + ORIGIN + '/. For licensing or prints, write to ' + I.SITE.email + '.', ''
  ].join('\n');
};

/* Cloudflare static-asset headers */
const headers = () => [
  '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', '',
  '/media/*', '  Cache-Control: public, max-age=86400, stale-while-revalidate=604800', '',
  '/admin/*', '  X-Robots-Tag: noindex, nofollow', ''
].join('\n');

module.exports = { head, jsonLd, sitemap, robots, llms, headers };
