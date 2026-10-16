const fs = require('fs');
const H = require('./hero4.cjs');
const dir = __dirname;
let css = fs.readFileSync(dir + '/style.css', 'utf8');
const I = require('./i18n.cjs');
const T = k => I.S[k][0];
const js = 'const I18N = ' + JSON.stringify(I.DICT) + ';\n' + fs.readFileSync(dir + '/app.js', 'utf8');

/* seven-sided polygons, computed once here and written as CSS calc() with cos() and sin() */
const STEP = 360 / 7;
const pt = (j, rad, ang) => {
  const a = `calc(${ang} + ${(j * STEP).toFixed(4)}deg)`;
  return rad.x(a) + ' ' + rad.y(a);
};
const tile = { x: a => `calc(50% + 50% * var(--k) * cos(${a}))`, y: a => `calc(50% + 50% * var(--k) * sin(${a}))` };
const hole = { x: a => `calc(50% + var(--rt) * cos(${a}))`, y: a => `calc(50% + var(--rt) * sin(${a}))` };
const tilePoly = 'polygon(' + Array.from({ length: 7 }, (_, j) => pt(j, tile, 'var(--ka)')).join(', ') + ')';
const holePts = Array.from({ length: 7 }, (_, j) => pt(j, hole, 'var(--at)'));
const basePoly = 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' + holePts.join(', ') + ', ' + holePts[0] + ', 0 0)';
const holeOut = { x: a => `calc(50% + (var(--rt) + 2px) * cos(${a}))`, y: a => `calc(50% + (var(--rt) + 2px) * sin(${a}))` };
const outPts = Array.from({ length: 7 }, (_, j) => pt(j, holeOut, 'var(--at)'));
const rimPoly = 'polygon(evenodd, ' + outPts.join(', ') + ', ' + outPts[0] + ', ' + holePts.join(', ') + ', ' + holePts[0] + ', ' + outPts[0] + ')';
const holeY = { x: a => `calc(50% + var(--rt) * cos(${a}))`, y: a => `calc(50% + var(--cy) + var(--rt) * sin(${a}))` };
const holePoly = 'polygon(' + Array.from({ length: 7 }, (_, j) => pt(j, holeY, 'var(--at)')).join(', ') + ')';
css = css.replace('/*HERO_CSS*/', H.css);
css = css.replace('/*BASE_POLY*/', basePoly).replace('/*RIM_POLY*/', rimPoly).replace('/*TILE_POLY*/', tilePoly);

const base = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb`;
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const GLOW = { day: '#8c8270', gold: '#d27a2c', blue: '#3a6a98', dark: '#b0483a' };
const P = 0.6667, L = 1.5;
const photos = [
  ['gold', '15518197', L, 'Silhouettes by the harbor at sunset, a ferry and a lighthouse behind them'],
  ['gold', '15297914', L, 'The sun going down behind a bridge railing'],
  ['gold', '15297911', P, 'Galata Bridge at sunset with Galata Tower in the distance'],
  ['gold', '15069348', P, 'An illuminated mosque under a dramatic dusk sky'],
  ['gold', '15207900', P, 'Ortaköy Mosque on the Bosphorus'],
  ['gold', '15297912', P, 'Dusk on a city sidewalk, minarets against the sunset'],
  ['gold', '15069347', P, 'Silhouettes at the harbor as a ferry comes in'],
  ['gold', '18349761', L, 'Palm silhouettes on the shore at sunset'],
  ['day', '15194859', L, 'A passenger ferry on open water under a clear sky'],
  ['day', '15069349', P, 'A man at a tram stop, his shadow on the pavement'],
  ['day', '15207781', P, 'A sunlit sidewalk seen from above'],
  ['day', '15069351', P, 'A crowded street of old buildings and market stalls'],
  ['day', '15194878', P, 'Sun beams across a terminal waiting room'],
  ['day', '15194877', L, 'Silhouettes in a ferry terminal, sunlight through the glass doors'],
  ['blue', '15297913', L, 'A silhouette walking inside, the street beyond the glass doors'],
  ['blue', '15207754', P, 'A man sitting alone in a dim alley at dusk'],
  ['blue', '15518194', P, 'Commuters inside a dim subway car'],
  ['blue', '15194860', P, 'A red metro train reflected in the dark'],
  ['blue', '16638283', L, 'Two people with umbrellas walking down a grey street'],
  ['dark', '15518200', P, 'A lit building reflected on wet pavement'],
  ['dark', '15194876', P, 'A rainy street, reflections on the wet pavement'],
  ['dark', '15194875', P, 'People around a street food stall on a rainy night'],
  ['dark', '15518199', P, 'A café glowing at night'],
  ['dark', '18030433', P, 'A lamp-lit path through a park at night'],
  ['dark', '15069350', P, 'People in raincoats at the harbor, a ferry behind them']
];
const tileHtml = photos.map(([cat, id, ar, cap]) => {
  const [w, h] = ar > 1 ? [1200, 800] : [800, 1200];
  const b = base(id);
  const sizes = ar > 1 ? '(min-width:1000px) 64vw, 100vw' : '(min-width:1000px) 32vw, 64vw';
  return `<li class="tile${ar > 1 ? ' wide' : ''}" data-cat="${cat}"><button class="shot" type="button" data-full="${b}&${ar > 1 ? 'w' : 'h'}=3000" data-cap="${esc(I.CAP[id][0])}" data-i18n-attr="data-cap:cap.${id}" data-ar="${ar}" data-glow="${GLOW[cat]}"><span class="ph"><img src="${b}&w=900" srcset="${b}&w=600 600w, ${b}&w=900 900w, ${b}&w=1200 1200w, ${b}&w=1600 1600w, ${b}&w=2000 2000w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(I.CAP[id][0])}" data-i18n-attr="alt:cap.${id}" loading="lazy" decoding="async"></span></button></li>`;
}).join('\n        ');

const irisHtml = `<div class="iris" aria-hidden="true">
        <div class="iris-base"></div><div class="iris-rim"></div>
        ${Array.from({ length: 7 }, (_, i) => `<i class="blade" style="--i:${i}"></i>`).join('')}
      </div>`;
const stops = ['f/22', 'f/16', 'f/11', 'f/8', 'f/5.6', 'f/4', 'f/2.8', 'f/1.8'];
const fstop = `<span class="fstop">${stops.map(s => `<span>${s}</span>`).join('')}<span>f/22</span></span>`;
const lensIris = irisHtml.replace('class="iris"', 'class="iris lens-iris"');
const hb = base('15518197'), pb = base('15297912');
const heroPicture = `<figure class="wi hero"><picture><source media="(orientation:portrait)" srcset="${pb}&w=700 700w, ${pb}&w=1100 1100w, ${pb}&w=1600 1600w" sizes="100vw"><img src="${hb}&w=1600" srcset="${hb}&w=900 900w, ${hb}&w=1600 1600w, ${hb}&w=2200 2200w" sizes="100vw" width="1600" height="1067" alt="Silhouettes by the harbor at sunset, a ferry and a lighthouse behind them" fetchpriority="high" decoding="async"></picture></figure>`;
const camBlock = H.reelHtml;

const hero = base('15518197');
const html = `<!doctype html>
<html lang="tr" translate="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-i18n="title">${T('title')}</title>
<meta name="description" content="${T('desc')}" data-i18n-attr="content:desc">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08080a">
<meta property="og:type" content="website">
<meta property="og:title" content="${T('title')}" data-i18n-attr="content:title">
<meta property="og:locale" content="tr_TR">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:description" content="${T('ogdesc')}" data-i18n-attr="content:ogdesc">
<meta property="og:image" content="${hero}&w=1200">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2308080a'/%3E%3Cpath d='M11 20V44' stroke='%23eeeae2' stroke-width='5.5'/%3E%3Cpath d='M11 22.75H17.6A4.6 4.6 0 0 1 17.6 32H11M11 32H18.6A4.6 4.6 0 0 1 18.6 41.25H11' stroke='%23eeeae2' stroke-width='5.5' fill='none' stroke-linejoin='miter'/%3E%3Cpolygon points='28,44 28,20 33.2,20 42.2,32.6 51.2,20 56.4,20 56.4,44 50.9,44 50.9,28.6 42.2,40.8 33.5,28.6 33.5,44' fill='%23eeeae2'/%3E%3Crect x='8.25' y='49' width='15' height='3' fill='%23ff5a1f'/%3E%3C/svg%3E" type="image/svg+xml">
<link rel="icon" href="media/icons/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="media/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://images.pexels.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="media/seq/01.webp" imagesrcset="media/seq/01-m.webp 960w, media/seq/01.webp 1672w" imagesizes="100vw" type="image/webp" fetchpriority="high">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Geist+Mono:wght@400..600&display=swap">
<script>document.documentElement.classList.add('js')</script>
<style>
${css}
</style>
</head>
<body>
<a class="skip" href="#work" data-i18n="skip">${T('skip')}</a>

<header class="nav">
  <a class="brand" href="#top" data-i18n-attr="aria-label:brandLabel" aria-label="${T('brandLabel')}">Berkay Mavral</a>
  <nav data-i18n-attr="aria-label:navLabel" aria-label="${T('navLabel')}">
    <ul>
      <li><a href="#work" data-i18n="navFrames">${T('navFrames')}</a></li>
      <li><a href="#about" data-i18n="navAbout">${T('navAbout')}</a></li>
      <li class="lang" role="group" aria-label="Dil / Language"><button type="button" data-lang="tr" aria-pressed="true" lang="tr">TR</button><button type="button" data-lang="en" aria-pressed="false" lang="en">EN</button></li>
      <li><a class="cta" href="#contact" data-i18n="cta">${T('cta')}</a></li>
    </ul>
  </nav>
</header>

<div class="hn" aria-hidden="true"><span class="hn-name">Berkay Mavral</span><span class="hn-sub" data-i18n="hnSub">${T('hnSub')}</span></div>
<div class="cue" aria-hidden="true"><div class="cue-in"><span class="cue-t" data-i18n="cue">${T('cue')}</span><span class="cue-l"></span></div></div>
<div class="prog" aria-hidden="true"><i></i></div>

<main>
  <section class="hero" id="top" data-i18n-attr="aria-label:heroLabel" aria-label="${T('heroLabel')}">
    <h1 class="vh" data-i18n="heroH1">${T('heroH1')}</h1>
    <p class="vh" data-i18n="heroP">${T('heroP')}</p>
    <div class="stage">
      ${camBlock}
      <div class="shade"></div>
      <div class="hud" aria-hidden="true">
        <i class="bk tl"></i><i class="bk tr"></i><i class="bk bl"></i><i class="bk br"></i>
        <div class="hud-bar">${fstop}</div>
      </div>
      <div class="hero-copy">
        <p class="hl" aria-hidden="true" data-i18n="heroHl">${T('heroHl')}</p>
        <div class="hero-side">
          <p data-i18n="heroP">${T('heroP')}</p>
          <a class="btn" href="#contact" data-i18n="cta">${T('cta')}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="frames wrap" id="work" aria-labelledby="work-title">
    <div class="frames-head">
      <div class="fh-text">
        <h2 id="work-title" data-i18n="workH2">${T('workH2')}</h2>
      </div>
      <div class="fh-side">
        <p class="count"><b id="frame-count">${String(photos.length).padStart(2, '0')}</b> <span data-i18n="photos">${T('photos')}</span></p>
        <div class="filters" role="group" data-i18n-attr="aria-label:filterLabel" aria-label="${T('filterLabel')}">
          <button type="button" data-f="all" aria-pressed="true" data-i18n="fAll">${T('fAll')}</button>
          <button type="button" data-f="gold" aria-pressed="false" data-i18n="fGold">${T('fGold')}</button>
          <button type="button" data-f="day" aria-pressed="false" data-i18n="fDay">${T('fDay')}</button>
          <button type="button" data-f="blue" aria-pressed="false" data-i18n="fBlue">${T('fBlue')}</button>
          <button type="button" data-f="dark" aria-pressed="false" data-i18n="fDark">${T('fDark')}</button>
        </div>
      </div>
    </div>
    <ul class="grid" id="grid">
        ${tileHtml}
    </ul>
  </section>

  <section class="about wrap" id="about" aria-labelledby="about-title">
    <h2 id="about-title" class="vh" data-i18n="aboutH2">${T('aboutH2')}</h2>
    <div class="about-grid">
      <figure class="portrait">
        <div class="portrait-frame">
          <img src="https://images.pexels.com/users/avatars/389232961/berkay-mavral-714.jpeg?auto=compress&fit=crop&h=1100&w=943" srcset="https://images.pexels.com/users/avatars/389232961/berkay-mavral-714.jpeg?auto=compress&fit=crop&h=700&w=600 600w, https://images.pexels.com/users/avatars/389232961/berkay-mavral-714.jpeg?auto=compress&fit=crop&h=1100&w=943 943w, https://images.pexels.com/users/avatars/389232961/berkay-mavral-714.jpeg?auto=compress&fit=crop&h=1400&w=1200 1200w" sizes="(min-width:901px) 40vw, 80vw" width="943" height="1100" alt="${T('portraitAlt')}" data-i18n-attr="alt:portraitAlt" loading="lazy" decoding="async">
          <i class="pk tl"></i><i class="pk tr"></i><i class="pk bl"></i><i class="pk br"></i>
        </div>
        <figcaption data-i18n="portraitCap">${T('portraitCap')}</figcaption>
      </figure>
      <div class="about-copy">
        <p class="lead" data-i18n="lead">${T('lead')}</p>
        <p class="about-note" data-i18n-html="note">${T('note')}</p>
        <dl class="shoots">
          <div><dt data-i18n="shUrban">${T('shUrban')}</dt><dd data-i18n="shUrbanD">${T('shUrbanD')}</dd></div>
          <div><dt data-i18n="shArch">${T('shArch')}</dt><dd data-i18n="shArchD">${T('shArchD')}</dd></div>
          <div><dt data-i18n="shPort">${T('shPort')}</dt><dd data-i18n="shPortD">${T('shPortD')}</dd></div>
        </dl>
      </div>
    </div>
  </section>

  <section class="contact-sec wrap" id="contact" aria-labelledby="contact-title">
    <div class="contact">
      <div>
        <h2 id="contact-title" data-i18n="contactH2">${T('contactH2')}</h2>
        <div class="mail-row">
          <a class="mail" id="mail" href="mailto:berkaymavral@gmail.com">berkaymavral@gmail.com</a>
          <button class="textbtn" type="button" id="copy-mail" data-i18n="copy">${T('copy')}</button>
        </div>
        <p class="status" id="copy-note" role="status" aria-live="polite"></p>
        <div class="links">
          <a href="https://www.instagram.com/berkaymavral/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.pexels.com/@Berkay-Mavral-389232961" target="_blank" rel="noopener noreferrer">Pexels</a>
        </div>
      </div>
      <!-- Demo form: no backend. On submit it validates, then opens the visitor's mail app with the message prefilled. -->
      <form id="contact-form" novalidate>
        <div class="field">
          <label for="f-name" data-i18n="lName">${T('lName')}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" maxlength="80" aria-required="true" placeholder="${T('pName')}" data-i18n-attr="placeholder:pName" aria-describedby="f-name-err">
          <p class="err" id="f-name-err"></p>
        </div>
        <div class="field">
          <label for="f-email" data-i18n="lEmail">${T('lEmail')}</label>
          <input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" aria-required="true" spellcheck="false" autocapitalize="none" placeholder="${T('pEmail')}" data-i18n-attr="placeholder:pEmail" aria-describedby="f-email-err">
          <p class="err" id="f-email-err"></p>
        </div>
        <div class="field">
          <label for="f-msg" data-i18n="lMsg">${T('lMsg')}</label>
          <textarea id="f-msg" name="message" autocomplete="off" maxlength="800" aria-required="true" placeholder="${T('pMsg')}" data-i18n-attr="placeholder:pMsg" aria-describedby="f-msg-err"></textarea>
          <p class="err" id="f-msg-err"></p>
        </div>
        <div><button class="btn" type="submit" data-i18n="send">${T('send')}</button></div>
        <p class="status" id="f-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>
</main>

<footer class="outro" data-i18n-attr="aria-label:footLabel" aria-label="${T('footLabel')}">
  <div class="outro-lens" aria-hidden="true"><img src="media/seq/22.webp" alt="" width="1672" height="941" loading="lazy" decoding="async"></div>
  <div class="o-cols">
    <p class="o-lead" data-i18n="footLead">${T('footLead')}</p>
    <div>
      <h2 class="o-h" data-i18n="footPages">${T('footPages')}</h2>
      <ul class="o-list"><li><a href="#work" data-i18n="navFrames">${T('navFrames')}</a></li><li><a href="#about" data-i18n="navAbout">${T('navAbout')}</a></li><li><a href="#contact" data-i18n="footContact">${T('footContact')}</a></li></ul>
    </div>
    <div>
      <h2 class="o-h" data-i18n="footElse">${T('footElse')}</h2>
      <ul class="o-list">
        <li><a href="https://www.instagram.com/berkaymavral/" target="_blank" rel="noopener noreferrer">Instagram <span class="vh" data-i18n="newTab">${T('newTab')}</span></a></li>
        <li><a href="https://www.pexels.com/@Berkay-Mavral-389232961" target="_blank" rel="noopener noreferrer">Pexels <span class="vh" data-i18n="newTab">${T('newTab')}</span></a></li>
      </ul>
    </div>
    <div>
      <h2 class="o-h" data-i18n="footContact">${T('footContact')}</h2>
      <ul class="o-list">
        <li><a class="o-mail" href="mailto:berkaymavral@gmail.com">berkaymavral@gmail.com</a></li>
        <li data-i18n="place">${T('place')}</li>
      </ul>
    </div>
  </div>
  <span class="outro-mark" aria-hidden="true">Berkay Mavral</span>
  <div class="o-base">
    <span data-i18n="footNote">${T('footNote')}</span>
    <a href="#top" data-i18n="footBack">${T('footBack')}</a>
  </div>
</footer>

<dialog id="lb" aria-label="${T('lbLabel')}" data-i18n-attr="aria-label:lbLabel" tabindex="-1">
  <div class="lb-scrim"></div>
  <div class="lb-stage" id="lb-stage">
    <figure class="lb-fig">
      <img id="lb-img" alt="" width="800" height="1200">
      <figcaption id="lb-cap" class="lb-ui" aria-live="polite"></figcaption>
    </figure>
  </div>
  <div class="lb-top lb-ui"><button class="textbtn" type="button" id="lb-close" data-i18n="lbClose">${T('lbClose')}</button></div>
  <div class="lb-nav lb-ui">
    <button class="textbtn" type="button" id="lb-prev" data-i18n="lbPrev">${T('lbPrev')}</button>
    <span class="lb-count" id="lb-count" aria-live="polite"></span>
    <button class="textbtn" type="button" id="lb-next" data-i18n="lbNext">${T('lbNext')}</button>
  </div>
</dialog>

<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(require('path').join(__dirname, '..', 'index.html'), html);
console.log(html.length, 'bytes; dashes:', (html.match(/—|–/g) || []).length);
