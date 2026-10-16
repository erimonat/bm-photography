(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.32,.72,0,1)';
  const IRIS_EASE = 'cubic-bezier(.55,.05,.2,1)';

  /* ---------- language: Turkish by default, English as the second language ---------- */
  const LANGS = ['tr', 'en'], langHooks = [];
  let lang = 'tr';
  try {
    const q = new URLSearchParams(location.search).get('lang'), s = localStorage.getItem('bm-lang');
    lang = LANGS.includes(q) ? q : LANGS.includes(s) ? s : 'tr';
  } catch { /* storage can be blocked */ }
  const t = k => (I18N[lang] && I18N[lang][k]) ?? I18N.tr[k] ?? k;
  const onLang = fn => langHooks.push(fn);
  function applyLang(l, persist) {
    lang = l;
    document.documentElement.lang = l;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(p => { const [a, k] = p.split(':'); el.setAttribute(a, t(k)); }));
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    const hc = window.__heroCap, hi = $('[data-pick=hero] img');
    if (hc && hi) hi.alt = (matchMedia('(orientation:portrait)').matches ? hc.p : hc.l)[l === 'en' ? 1 : 0];
    langHooks.forEach(fn => fn(l));
    if (persist) {
      try { localStorage.setItem('bm-lang', l); } catch { /* ignore */ }
      try { const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u); } catch { /* file:// pages cannot change the URL */ }
    }
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => b.dataset.lang !== lang && applyLang(b.dataset.lang, true)));

  /* ---------- hero: camera sequence on a canvas, scrubbed by scroll with eased catch-up ---------- */
  (() => {
    const seq = $('.seq'), cv = $('.seq-cv');
    if (!seq || !cv || reduce.matches || !(window.CSS && CSS.supports('animation-timeline: scroll()'))) return;
    const N = +cv.dataset.frames, T0 = +cv.dataset.t0, STEP = +cv.dataset.step;
    const small = matchMedia('(max-width: 820px)').matches;
    const ctx = cv.getContext('2d');
    const imgs = new Array(N), ok = new Array(N).fill(false);
    const url = i => 'media/seq/' + String(i + 1).padStart(2, '0') + (small ? '-m' : '') + '.webp';
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9px;top:0;width:1px;height:100svh;visibility:hidden;pointer-events:none';
    document.body.append(probe);
    let sv = innerHeight, W = 0, H = 0, cur = 0, shown = -1, running = false, visible = true, last = 0;
    const resize = () => {
      sv = probe.getBoundingClientRect().height || innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.25);
      W = Math.round(cv.clientWidth * dpr); H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; shown = -1; }
    };
    /* frame -> scroll (svh): the sequence manifest, 30 + progress * 336 */
    const POS = [30,37.2,44.5,51.7,58.9,66.2,78.1,90,101.9,113.7,125.6,137.5,148.4,159.2,170.1,180.9,191.8,202.7,213.5,224.4,235.2,246.1,259.5,273,286.4,299.8,316.4,332.9,349.5,366];
    const targetOf = () => {
      const s = scrollY / sv * 100;
      if (s <= POS[0]) return 0;
      if (s >= POS[N - 1]) return N - 1;
      let k = 0; while (k < N - 2 && s > POS[k + 1]) k++;
      return k + (s - POS[k]) / (POS[k + 1] - POS[k]);
    };
    const cover = img => {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      /* on tall screens the camera sits right of centre: follow it early on, then settle on the centre */
      const fx = W < H ? 0.57 - 0.07 * Math.min(1, Math.max(0, (cur - 9) / 7)) : 0.5;
      return [(W - w) * fx, (H - h) / 2, w, h];
    };
    const nearest = (i, dir) => { for (let k = i; k >= 0 && k < N; k += dir) if (ok[k]) return k; return -1; };
    const draw = p => {
      const a = Math.floor(p), f = p - a;
      const ia = ok[a] ? a : nearest(a, -1), ib = a + 1 < N ? (ok[a + 1] ? a + 1 : nearest(a + 1, 1)) : -1;
      const key = ia + ':' + ib + ':' + f.toFixed(3);
      if (key === shown) return;
      shown = key;
      if (ia < 0) return;
      ctx.clearRect(0, 0, W, H);
      /* the frames are photographs, each already showing its own camera position: hold a frame, then dissolve to the next one in the last part of the interval.
         Blend as premultiplied RGBA (A*(1-w) + B*w) so the clear lens opening never leaks the previous frame. */
      if (ib >= 0 && f > 0.004) {
        const t = Math.min(1, Math.max(0, (f - 0.45) / 0.55)), w = t * t * (3 - 2 * t);
        if (w < 0.002) { ctx.globalAlpha = 1; ctx.drawImage(imgs[ia], ...cover(imgs[ia])); }
        else {
          ctx.globalAlpha = 1 - w; ctx.drawImage(imgs[ia], ...cover(imgs[ia]));
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = w; ctx.drawImage(imgs[ib], ...cover(imgs[ib]));
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
      } else { ctx.globalAlpha = 1; ctx.drawImage(imgs[ia], ...cover(imgs[ia])); }
      if (!seq.classList.contains('ready')) seq.classList.add('ready');
    };
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      const t = targetOf();
      cur += (t - cur) * (1 - Math.exp(-dt * 9));
      if (Math.abs(t - cur) < 0.002) cur = t;
      draw(cur);
      if ((visible || cur !== t) && !document.hidden) requestAnimationFrame(tick); else running = false;
    };
    const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };
    /* load the first frames at once and the rest in order, so scrubbing never waits on the end of the film */
    const load = i => new Promise(res => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { imgs[i] = im; ok[i] = true; shown = -1; res(); };
      im.onerror = res; im.src = url(i);
    });
    (async () => { for (let i = 0; i < N; i += 1) { await load(i); if (i === 0) { resize(); wake(); } } })();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '25% 0px 25% 0px' }).observe($('.hero'));
    addEventListener('resize', () => { resize(); wake(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    cur = targetOf();
    resize();
  })();

  /* ---------- hero name: measure the brand so the scroll animation lands exactly on it ---------- */
  (() => {
    const hn = $('.hn'), nm = $('.hn-name'), br = $('.brand');
    if (!hn || !nm || !br) return;
    const fit = () => {
      const cs = getComputedStyle(hn);
      const top = parseFloat(cs.top) || 0, left = parseFloat(cs.left) || 0;
      const big = parseFloat(getComputedStyle(nm).fontSize) || 1;
      const small = parseFloat(getComputedStyle(br).fontSize) || 16;
      hn.style.setProperty('--k', (small / big).toFixed(4));
      hn.style.setProperty('--dx', (br.offsetLeft - left).toFixed(1) + 'px');
      hn.style.setProperty('--dy', (br.offsetTop - top).toFixed(1) + 'px');
    };
    fit();
    addEventListener('resize', fit, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ---------- photographs: no context menu, no drag, no long-press save (a deterrent, not protection) ---------- */
  (() => {
    const isPhoto = el => el.matches && el.matches('img, canvas, picture, video');
    /* hit-test the whole stack under the pointer, because the hero photographs sit under overlay layers */
    document.addEventListener('contextmenu', e => {
      const stack = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [e.target];
      if (stack.some(isPhoto)) e.preventDefault();
    });
    document.addEventListener('dragstart', e => { if (isPhoto(e.target)) e.preventDefault(); });
    $$('img').forEach(i => { i.draggable = false; });
  })();

  /* ---------- nav: a solid bar after the hero ---------- */
  const nav = $('.nav');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle('solid', !e.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }).observe($('.hero'));
  }

  /* ---------- frames: each photo opens like an aperture as it enters ---------- */
  const grid = $('#grid'), tiles = $$('.tile', grid);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    let n = 0;
    entries.filter(e => e.isIntersecting).forEach(e => {
      e.target.querySelector('.shot').style.transitionDelay = reduce.matches ? '0ms' : Math.min(n++, 5) * 45 + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }) : null;
  tiles.forEach(t => io ? io.observe(t) : t.classList.add('in'));
  grid.addEventListener('transitionend', e => {
    if (e.propertyName === '--k' && e.target.classList.contains('shot') && e.target.parentElement.classList.contains('in')) e.target.parentElement.classList.add('done');
  });

  /* filters: the visible photos close, the set changes, then they open again */
  const valid = ['all', 'gold', 'day', 'blue', 'dark'];
  let filter = new URLSearchParams(location.search).get('filter');
  if (!valid.includes(filter)) filter = 'all';
  function apply() {
    tiles.forEach(t => { t.hidden = !(filter === 'all' || t.dataset.cat === filter); t.classList.remove('fill'); });
    fillRow();
    const fc = $('#frame-count'); if (fc) fc.textContent = String(tiles.filter(t => !t.hidden).length).padStart(2, '0');
  }
  /* when the last row would be short, the last portrait tile widens to close the gap */
  function fillRow() {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const shown = tiles.filter(t => !t.hidden);
    const cells = shown.reduce((n, t) => n + (t.classList.contains('wide') ? 2 : 1), 0);
    const gap = (cols - (cells % cols)) % cols;
    if (gap === 1) {
      const last = [...shown].reverse().find(t => !t.classList.contains('wide'));
      if (last) last.classList.add('fill');
    }
  }
  matchMedia('(max-width:1000px)').addEventListener('change', apply);
  matchMedia('(max-width:640px)').addEventListener('change', apply);
  function setFilter(f) {
    filter = f;
    grid.dataset.f = f;
    $$('.filters button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    try { const u = new URL(location.href); f === 'all' ? u.searchParams.delete('filter') : u.searchParams.set('filter', f); history.replaceState(null, '', u); } catch { /* file:// pages cannot change the URL */ }
    if (reduce.matches) { apply(); return; }
    grid.classList.add('closing');
    setTimeout(() => {
      tiles.forEach(t => { t.classList.remove('in', 'done'); t.querySelector('.shot').style.transitionDelay = '0ms'; });
      apply();
      grid.classList.remove('closing');
      let n = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => tiles.filter(t => !t.hidden).forEach(t => {
        t.querySelector('.shot').style.transitionDelay = Math.min(n++, 8) * 35 + 'ms';
        t.classList.add('in');
      })));
    }, 280);
  }
  $$('.filters button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.f === filter));
    b.addEventListener('click', () => b.dataset.f !== filter && setFilter(b.dataset.f));
  });
  apply();
  grid.dataset.f = filter;

  /* ---------- about: split the lead into words for the scroll-driven reveal ---------- */
  const lead = $('.lead');
  const splitLead = () => {
    if (!lead) return;
    const words = lead.textContent.trim().split(/\s+/);
    lead.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i); s.style.setProperty('--n', words.length);
      s.textContent = w + (i < words.length - 1 ? ' ' : '');
      lead.append(s);
    });
  };
  splitLead();
  onLang(splitLead);

  /* ---------- lightbox: opens as a seven-bladed aperture from the chosen photo ---------- */
  const dlg = $('#lb'), img = $('#lb-img'), cap = $('#lb-cap'), scrim = $('.lb-scrim'), ui = $$('.lb-ui', dlg);
  let set = [], idx = 0, closing = false;
  const iris = (cx, cy, r, rot) => 'polygon(' + Array.from({ length: 7 }, (_, i) => {
    const a = rot + i * 2 * Math.PI / 7;
    return `${(cx + r * Math.cos(a)).toFixed(1)}px ${(cy + r * Math.sin(a)).toFixed(1)}px`;
  }).join(',') + ')';
  const reach = () => Math.hypot(innerWidth, innerHeight) * 1.2;
  const centerOf = b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  const thumbOf = b => $('img', b);
  onLang(() => { if (dlg.open && set[idx]) cap.textContent = set[idx].dataset.cap; });
  function setActive(i) {
    if (set[idx]) set[idx].style.visibility = '';
    idx = (i + set.length) % set.length;
    const b = set[idx];
    b.style.visibility = 'hidden';
    img.style.setProperty('--ar', b.dataset.ar);
    dlg.style.setProperty('--glow', b.dataset.glow || '#8a7a64');
    img.src = thumbOf(b).currentSrc || thumbOf(b).src;
    cap.textContent = b.dataset.cap;
    img.alt = ''; // the live caption below carries the description
    $('#lb-count').textContent = (idx + 1) + ' / ' + set.length;
    const hi = new Image(); hi.src = b.dataset.full;
    hi.decode().then(() => { if (set[idx] === b) img.src = b.dataset.full; }).catch(() => {});
  }
  /* A thumbnail may be a crop of the photo. When its shape differs from the viewer image,
     scale uniformly (cover) and animate a clip-path so the photo is never stretched. */
  function flip(b, opening) {
    const t = b.getBoundingClientRect(), f = img.getBoundingClientRect();
    const sameShape = Math.abs(t.width / t.height - f.width / f.height) < 0.02;
    const s = sameShape ? t.width / f.width : Math.max(t.width / f.width, t.height / f.height);
    const dx = t.left + t.width / 2 - (f.left + (f.width * s) / 2);
    const dy = t.top + t.height / 2 - (f.top + (f.height * s) / 2);
    const from = { transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${s})` };
    const to = { transformOrigin: '0 0', transform: 'none' };
    if (!sameShape) {
      const cx = Math.max(0, (f.width * s - t.width) / 2 / s), cy = Math.max(0, (f.height * s - t.height) / 2 / s);
      from.clipPath = `inset(${cy}px ${cx}px ${cy}px ${cx}px)`; to.clipPath = 'inset(0px)';
    }
    return img.animate(opening ? [from, to] : [to, from], { duration: opening ? 480 : 380, easing: IRIS_EASE, fill: 'both' }).finished;
  }
  async function open(b) {
    if (dlg.open) return;
    closing = false;
    set = $$('#grid .tile:not([hidden]) .shot');
    idx = set.indexOf(b); set.forEach(s => (s.style.visibility = ''));
    dlg.showModal();
    dlg.focus();
    document.documentElement.classList.add('lb-open');
    setActive(idx);
    ui.forEach(u => u.classList.remove('hide'));
    if (!reduce.matches) {
      const [cx, cy] = centerOf(b);
      scrim.animate({ clipPath: [iris(cx, cy, 0, -0.6), iris(cx, cy, reach(), 0.35)] }, { duration: 480, easing: IRIS_EASE });
      ui.forEach(u => u.animate({ opacity: [0, 1] }, { duration: 260, delay: 260, easing: 'ease-out', fill: 'backwards' }));
      try { await flip(b, true); } catch { /* interrupted by close() */ }
      if (closing) return;
      img.getAnimations().forEach(a => a.cancel());
    }
  }
  /* close() can interrupt an unfinished open. All cleanup lives in the dialog's "close" event,
     so it also runs when the browser closes the dialog itself (for example a second Escape). */
  async function close() {
    if (closing || !dlg.open) return;
    closing = true;
    img.getAnimations().forEach(a => a.cancel());
    ui.forEach(u => u.classList.add('hide'));
    set[idx].scrollIntoView({ block: 'nearest', behavior: 'instant' });
    if (!reduce.matches) {
      const [cx, cy] = centerOf(set[idx]);
      scrim.animate({ clipPath: [iris(cx, cy, reach(), 0.35), iris(cx, cy, 0, -0.6)] }, { duration: 420, easing: IRIS_EASE, fill: 'forwards' });
      try { await flip(set[idx], false); } catch { /* dialog closed natively mid-animation */ }
    }
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', () => {
    [img, scrim].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    set.forEach(s => (s.style.visibility = ''));
    document.documentElement.classList.remove('lb-open');
    closing = false;
    if (set[idx]) set[idx].focus({ preventScroll: true });
  });
  function go(d, instant) {
    if (closing) return;
    const next = () => { setActive(idx + d); if (!reduce.matches && !instant) img.animate({ opacity: [0, 1] }, { duration: 200, easing: 'ease-out' }); };
    reduce.matches || instant ? next() : img.animate({ opacity: [1, 0] }, { duration: 90 }).finished.then(next, next);
  }
  document.addEventListener('click', e => { const b = e.target.closest('#grid .shot'); if (b) open(b); });
  $('#lb-close').addEventListener('click', close);
  $('#lb-prev').addEventListener('click', () => go(-1));
  $('#lb-next').addEventListener('click', () => go(1));
  $('#lb-stage').addEventListener('click', e => { if (e.target.id === 'lb-stage') close(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  /* swipe: left or right pages through the photos, a downward swipe closes */
  let sx = 0, sy = 0, sid = null;
  const stage = $('#lb-stage');
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; sid = e.pointerId; });
  stage.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return;
    sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && dy > Math.abs(dx) * 1.4) close();
  });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') go(1, true);
    else if (e.key === 'ArrowLeft') go(-1, true);
  });

  /* ---------- copy email ---------- */
  const copyBtn = $('#copy-mail'), copyNote = $('#copy-note');
  let copyTimer;
  copyBtn.addEventListener('click', async () => {
    const addr = $('#mail').textContent.trim();
    clearTimeout(copyTimer);
    try { await navigator.clipboard.writeText(addr); copyBtn.textContent = t('copied'); copyNote.textContent = t('copyNote'); }
    catch { copyNote.textContent = t('copyFail'); const r = document.createRange(); r.selectNodeContents($('#mail')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    copyTimer = setTimeout(() => { copyBtn.textContent = t('copy'); copyNote.textContent = ''; }, 2200);
  });

  /* ---------- contact form (demo: opens the visitor's mail app) ---------- */
  const form = $('#contact-form'), status = $('#f-status');
  const fields = { name: $('#f-name'), email: $('#f-email'), msg: $('#f-msg') };
  const rules = {
    name: v => v.trim().length < 2 && t('eName'),
    email: v => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && t('eEmail'),
    msg: v => v.trim().length < 10 && t('eMsg')
  };
  const mark = (k, msg) => { fields[k].setAttribute('aria-invalid', String(!!msg)); $('#' + fields[k].id + '-err').textContent = msg || ''; };
  Object.keys(fields).forEach(k => fields[k].addEventListener('input', () => fields[k].getAttribute('aria-invalid') === 'true' && mark(k, rules[k](fields[k].value))));
  onLang(() => { Object.keys(fields).forEach(k => fields[k].getAttribute('aria-invalid') === 'true' && mark(k, rules[k](fields[k].value))); });
  form.addEventListener('submit', e => {
    e.preventDefault(); status.textContent = '';
    let first = null;
    Object.keys(fields).forEach(k => { const m = rules[k](fields[k].value); mark(k, m); if (m && !first) first = fields[k]; });
    if (first) { first.focus(); return; }
    const n = fields.name.value.trim(), em = fields.email.value.trim(), m = fields.msg.value.trim();
    const url = 'mailto:berkaymavral@gmail.com?subject=' + encodeURIComponent(t('mailSubject') + n) + '&body=' + encodeURIComponent(m + '\n\n' + n + ' (' + em + ')');
    status.textContent = t('fStatus');
    location.href = url;
  });
  applyLang(lang);
})();
