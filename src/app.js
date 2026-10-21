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

  /* the photographs of the opening wall are lazy, so nothing is fetched for them on arrival. Once the visitor is well into the film, fetch them, so they are there when the wall opens. */
  (() => {
    const wall = $$('.wall .wi:not(.hero) img');
    if (!wall.length) return;
    const go = () => {
      if (scrollY < innerHeight * 2.2) return;
      wall.forEach(i => { i.loading = 'eager'; });
      removeEventListener('scroll', go);
    };
    addEventListener('scroll', go, { passive: true });
    go();
  })();

  /* ---------- hero: camera sequence on a canvas, scrubbed by scroll with eased catch-up ---------- */
  (() => {
    const seq = $('.seq'), cv = $('.seq-cv');
    if (!seq || !cv || reduce.matches || !(window.CSS && CSS.supports('animation-timeline: scroll()'))) return;
    const N = +cv.dataset.frames, T0 = +cv.dataset.t0, STEP = +cv.dataset.step, K = +cv.dataset.k || 1;
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
    const POS = JSON.parse(cv.dataset.pos);
    POS.forEach((v, i) => { POS[i] = v * K; }); /* the hero is shortened by K: the frames move with it */
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

  /* ---------- cursor: a dot on the pointer and a ring that follows it on a spring (fine pointers only) ---------- */
  (() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const root = document.createElement('div');
    root.className = 'cur'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<i class="c-ring"></i><i class="c-dot"></i>';
    document.body.append(root);
    const ring = root.firstChild, dot = root.lastChild, html = document.documentElement;
    html.classList.add('cur-on');

    /* the same springs as the reference: ring position (stiffness 250, damping 25, mass .6), ring size (stiffness 300, damping 22) */
    const spring = (k, c, m) => ({ k, c, m, x: 0, v: 0 });
    const step = (s, target, dt) => { const a = (-s.k * (s.x - target) - s.c * s.v) / s.m; s.v += a * dt; s.x += s.v * dt; };
    const px = spring(250, 25, 0.6), py = spring(250, 25, 0.6), sz = spring(300, 22, 1), op = spring(300, 22, 1);
    let mx = -100, my = -100, seen = false, active = false, ink = false, last = 0, raf = 0;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016); last = now;
      const targetS = active ? 1 : 0.7895, targetO = active ? 1 : 0.5;   // 30px resting ring, 38px on links and photos
      if (reduced()) { px.x = mx; py.x = my; px.v = py.v = 0; sz.x = targetS; op.x = targetO; sz.v = op.v = 0; }
      else { for (let n = 0; n < 2; n += 1) { step(px, mx, dt / 2); step(py, my, dt / 2); step(sz, targetS, dt / 2); step(op, targetO, dt / 2); } }
      ring.style.transform = 'translate3d(' + px.x.toFixed(1) + 'px,' + py.x.toFixed(1) + 'px,0) scale(' + (sz.x * 1.2667).toFixed(3) + ')';
      ring.style.opacity = Math.max(0, Math.min(1, op.x)).toFixed(2);
      const settled = Math.abs(px.x - mx) < 0.1 && Math.abs(py.x - my) < 0.1 && Math.abs(px.v) + Math.abs(py.v) < 0.5 && Math.abs(sz.x - targetS) < 0.002 && Math.abs(op.x - targetO) < 0.004 && Math.abs(sz.v) + Math.abs(op.v) < 0.01;
      if (!settled) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!seen) { seen = true; px.x = mx; py.x = my; root.classList.add('on'); }
      const t = e.target && e.target.closest ? e.target : null;
      const field = t && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
      root.classList.toggle('hide', !!field);
      active = !!(t && t.closest('a, button, [role="button"], label, summary, .shot'));
      const onOrange = !!(t && t.closest('.btn, .cta'));
      if (onOrange !== ink) { ink = onOrange; root.classList.toggle('ink', ink); }
      kick();
    }, { passive: true });
    html.addEventListener('mouseleave', () => root.classList.remove('on'));
    html.addEventListener('mouseenter', () => seen && root.classList.add('on'));
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
  /* the library is long: show a page at a time (25), and open the next page on request, within the chosen light */
  const PAGE = 25, more = $('#more'), moreN = $('#more-n'), moreLive = $('#more-live');
  let limit = PAGE;
  /* "tiles" stays in the logic order from the data. Each visit draws one random order; the first page of any view is the first 25 of that draw, then the view continues in logic order. */
  const draw = [...tiles];
  for (let i = draw.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [draw[i], draw[j]] = [draw[j], draw[i]]; }
  function apply(reorder) {
    const match = t => filter === 'all' || t.dataset.cat === filter;
    const first = draw.filter(match).slice(0, PAGE), lead = new Set(first);
    const list = [...first, ...tiles.filter(t => match(t) && !lead.has(t))];
    const rest = tiles.filter(t => !match(t));
    /* moving nodes only when the view changes keeps "show more" from touching what is already on screen */
    if (reorder) grid.append(...list, ...rest);
    tiles.forEach(t => t.classList.remove('fill'));
    /* a short last row is closed by also showing the next photos that fit the gap, so nothing gets cropped */
    const span = t => t.classList.contains("wide") ? 2 : 1;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const vis = new Set(list.slice(0, limit));
    let gap = (cols - list.slice(0, limit).reduce((n, t) => n + span(t), 0) % cols) % cols;
    for (let i = limit; gap && i < list.length; i++) if (span(list[i]) <= gap) { vis.add(list[i]); gap -= span(list[i]); }
    list.forEach(t => { t.hidden = !vis.has(t); });
    rest.forEach(t => { t.hidden = true; });
    const total = list.length, shown = vis.size;
    fillRow();
    const fc = $('#frame-count'); if (fc) fc.textContent = String(total).padStart(2, '0');
    if (more) { more.hidden = total <= shown; moreN.textContent = '(' + (total - shown) + ')'; }
  }
  /* when the last row would be short, the last portrait tile widens to close the gap */
  function fillRow() {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const shown = $$('.tile:not([hidden])', grid);
    const cells = shown.reduce((n, t) => n + (t.classList.contains('wide') ? 2 : 1), 0);
    const gap = (cols - (cells % cols)) % cols;
    /* end of the list, nothing left to pull in: widen the last portrait tiles instead */
    const ports = [...shown].reverse().filter(t => !t.classList.contains("wide"));
    for (let i = 0; i < gap && i < ports.length; i++) ports[i].classList.add("fill");
  }
  matchMedia('(max-width:1000px)').addEventListener('change', () => apply());
  matchMedia('(max-width:640px)').addEventListener('change', () => apply());
  function setFilter(f) {
    filter = f;
    limit = PAGE;
    grid.dataset.f = f;
    $$('.filters button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    try { const u = new URL(location.href); f === 'all' ? u.searchParams.delete('filter') : u.searchParams.set('filter', f); history.replaceState(null, '', u); } catch { /* file:// pages cannot change the URL */ }
    if (reduce.matches) { apply(true); return; }
    grid.classList.add('closing');
    setTimeout(() => {
      tiles.forEach(t => { t.classList.remove('in', 'done'); t.querySelector('.shot').style.transitionDelay = '0ms'; });
      apply(true);
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
  if (more) more.addEventListener('click', () => {
    const before = new Set($$('.tile:not([hidden])', grid));
    limit += PAGE;
    apply();
    const added = $$('.tile:not([hidden])', grid).filter(t => !before.has(t));
    if (moreLive) moreLive.textContent = t('moreAdded').replace('{n}', added.length);
    if (added[0]) added[0].querySelector('.shot').focus({ preventScroll: true });
  });
  apply(true);
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

  /* ---------- contact form (opens the visitor's mail app) ---------- */
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
    const url = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(t('mailSubject') + n) + '&body=' + encodeURIComponent(m + '\n\n' + n + ' (' + em + ')');
    status.textContent = t('fStatus');
    location.href = url;
  });
  /* ---------- prints: photos slide through a column of frames, both loop forever, then buy by email ---------- */
  (() => {
    const sec = $('#prints');
    if (!sec) return;
    const stage = $('.pr-stage', sec), strip = $('.pr-strip', sec), rail = $('#pr-rail');
    const N = $$('.pcl', strip).length, M = $$('.fr', rail).length;
    /* photo strip: three copies of the list, the middle one is real, the outer two let the loop wrap invisibly */
    const items = [...strip.children];
    const copy = () => items.map(li => {
      const c = li.cloneNode(true);
      c.dataset.clone = '1'; c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });
      return c;
    });
    strip.prepend(...copy()); strip.append(...copy());
    /* 127 photos in three copies: nothing is requested until the section is near, then a picture only when it is about to scroll into view */
    const feed = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const im = e.target;
      if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
      feed.unobserve(im);
    }), { root: strip, rootMargin: '0px 900px 0px 900px' });
    let armed = false; const queue = [];
    const arm = () => { if (armed) return; armed = true; $$('img[data-src]', strip).forEach(im => feed.observe(im)); queue.splice(0).forEach(fn => fn()); };
    const whenNear = fn => (armed ? fn() : queue.push(fn));
    new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); arm(); } }, { rootMargin: '1400px 0px' }).observe(sec);
    const lis = $$('.pcl', strip), cards = $$('.pc', strip), frs = $$('.fr', rail);
    const imgs = $$('.win img', rail), chips = $$('.chip', sec);
    const capEl = $('#pr-cap'), frEl = $('#pr-frame');
    const prev = $('#pr-prev'), next = $('#pr-next'), up = $('#pr-up'), down = $('#pr-down'), buy = $('#pr-buy');
    const mob = matchMedia('(max-width: 900px)');
    const smooth = () => (reduce.matches ? 'auto' : 'smooth');
    const frac = n => parseFloat(getComputedStyle(stage).getPropertyValue(n)) || .5;
    const clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
    const mod = (v, n) => ((v % n) + n) % n;
    /* strip indexes are raw (0 .. 3n-1), the real photo sits at n + logical; frames are 0 .. m-1 */
    let cur = 0, sel = -1, af = 0, lastAuto = '', st1 = 0;

    const summary = () => {
      const ref = cards[N + Math.max(sel, 0)].dataset.ref;
      capEl.textContent = t('cap.' + ref);
      frEl.textContent = t('prFrameLbl') + t('fr' + (af + 1));
      imgs.forEach(i => { i.alt = t('cap.' + ref); });
    };
    /* the photo that has settled under the frame column: the other frames show it too */
    let token = 0;
    const settle = () => {
      const lg = mod(cur, N);
      if (sel === lg) return;
      sel = lg;
      const c = cards[N + lg], url = c.dataset.u.split('{k}').join(c.dataset.o === 'portrait' ? 'h' : 'w').split('{n}').join(1000);
      const mine = ++token, pre = new Image();
      const swap = () => { if (mine === token) imgs.forEach(im => { im.src = url; }); };
      pre.onload = swap; pre.onerror = swap; pre.src = url;
      summary();
    };

    /* ----- frame column: positioned by script, so looping is arithmetic (no scrolling, no snapping, no jumps) ----- */
    let pos = 0, goal = 0, raf = 0, last = 0;
    /* neighbours are drawn at .88 scale, so centre-to-centre = half the big one + half the small one + the gap: the next frame sits close, and you can see there is one */
    const pitch = () => Math.max(...frs.map(f => f.offsetHeight)) * .94 + Math.max(14, Math.min(26, innerHeight * .022));
    const render = () => {
      const P = pitch(), half = M / 2;
      frs.forEach((f, i) => {
        const d = mod(i - pos + half, M) - half, a = Math.abs(d), k = Math.min(a, 1);
        const op = (1 - .27 * k) * Math.max(0, Math.min(1, (2.3 - a) / .5));
        f.style.transform = 'translate(-50%,-50%) translateY(' + (d * P).toFixed(1) + 'px) scale(' + (1 - .12 * k).toFixed(3) + ')';
        f.style.opacity = op.toFixed(3);
        f.style.zIndex = String(10 - Math.round(a * 2));
        f.style.visibility = op < .01 ? 'hidden' : '';
      });
      const nearest = mod(Math.round(pos), M);
      if (nearest !== af) setFrame(nearest);
    };
    const tick = now => {
      raf = 0;
      const dt = Math.min(64, now - last || 16); last = now;
      const d = goal - pos;
      if (Math.abs(d) < .002) { pos = goal; render(); last = 0; return; }
      pos += d * (1 - Math.exp(-dt / 95));
      render();
      raf = requestAnimationFrame(tick);
    };
    const go = g => {
      goal = g;
      if (mob.matches || reduce.matches) { pos = goal; render(); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const setFrame = i => {
      af = mod(i, M);
      frs.forEach((f, k) => $('.fr-b', f).setAttribute('aria-current', String(k === af)));
      chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === af)));
      summary();
    };
    const step = n => go(Math.round(goal) + n);
    /* a frame you click takes the shortest way to the middle */
    const toFrame = i => { const base = Math.round(goal); go(base + mod(i - base + M / 2, M) - M / 2); };
    frs.forEach((f, k) => $('.fr-b', f).addEventListener('click', () => { if (mob.matches) { setFrame(k); return; } if (!fDrag.moved) toFrame(k); }));
    chips.forEach((c, k) => c.addEventListener('click', () => setFrame(k)));
    up.addEventListener('click', () => step(-1));
    down.addEventListener('click', () => step(1));
    rail.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      step(e.key === 'ArrowDown' ? 1 : -1);
      $('.fr-b', frs[mod(Math.round(goal), M)]).focus({ preventScroll: true });
    });
    /* drag the column with the mouse or a finger; let go with a flick and it carries on */
    const fDrag = { on: false, moved: false, y0: 0, p0: 0, hist: [] };
    rail.addEventListener('pointerdown', e => {
      if (mob.matches || (e.pointerType === 'mouse' && e.button !== 0)) return;
      fDrag.on = true; fDrag.moved = false; fDrag.y0 = e.clientY; fDrag.p0 = pos; fDrag.hist = [[performance.now(), e.clientY]];
    });
    window.addEventListener('pointermove', e => {
      if (!fDrag.on) return;
      const dy = e.clientY - fDrag.y0;
      if (!fDrag.moved && Math.abs(dy) > 5) { fDrag.moved = true; goal = pos; }
      if (!fDrag.moved) return;
      pos = fDrag.p0 - dy / pitch(); goal = pos;
      fDrag.hist.push([performance.now(), e.clientY]); if (fDrag.hist.length > 6) fDrag.hist.shift();
      render();
    });
    window.addEventListener('pointerup', () => {
      if (!fDrag.on) return;
      fDrag.on = false;
      if (fDrag.moved) {
        const h = fDrag.hist, a = h[0], b = h[h.length - 1], v = b[0] > a[0] ? -(b[1] - a[1]) / (b[0] - a[0]) / pitch() : 0;
        go(Math.round(pos + Math.max(-2, Math.min(2, v * 220))));
      }
      setTimeout(() => { fDrag.moved = false; }, 0);
    });

    /* ----- photo strip ----- */
    const snapX = () => strip.clientWidth * frac('--cx');
    const centreOf = li => li.offsetLeft + li.offsetWidth / 2;
    const goCard = (i, instant) => strip.scrollTo({ left: centreOf(lis[clamp(i, lis.length)]) - snapX(), behavior: instant ? 'auto' : smooth() });
    const setCur = i => {
      cur = i;
      lis.forEach((li, k) => li.classList.toggle('is-cur', k === i));
      if (sec.dataset.o !== cards[i].dataset.o) { sec.dataset.o = cards[i].dataset.o; render(); }
    };
    /* jump one whole copy sideways without anyone seeing it */
    const rebaseStrip = () => {
      const len = lis[N].offsetLeft - lis[0].offsetLeft, d = cur < N ? len : cur >= 2 * N ? -len : 0;
      if (!d) return;
      strip.style.scrollSnapType = 'none';
      strip.scrollLeft += d;
      setTimeout(() => { strip.style.scrollSnapType = ''; }, 60);
    };
    const onStrip = () => {
      const m = strip.scrollLeft + snapX(); let b = 0, bd = Infinity;
      lis.forEach((li, k) => { const d = Math.abs(centreOf(li) - m); if (d < bd) { bd = d; b = k; } });
      if (b !== cur) setCur(b);
      clearTimeout(st1); st1 = setTimeout(() => { whenNear(settle); rebaseStrip(); }, 160);
    };
    strip.addEventListener('scroll', onStrip, { passive: true });
    prev.addEventListener('click', () => goCard(cur - 1));
    next.addEventListener('click', () => goCard(cur + 1));

    /* mouse drag on the strip; touch and trackpad already scroll natively */
    const sDrag = { on: false, drag: false, p0: 0, s0: 0 };
    strip.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      sDrag.on = true; sDrag.drag = false; sDrag.p0 = e.clientX; sDrag.s0 = strip.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!sDrag.on) return;
      const d = e.clientX - sDrag.p0;
      if (!sDrag.drag && Math.abs(d) > 5) { sDrag.drag = true; strip.style.scrollSnapType = 'none'; }
      if (sDrag.drag) strip.scrollLeft = sDrag.s0 - d;
    });
    window.addEventListener('pointerup', () => {
      if (!sDrag.on) return;
      sDrag.on = false; strip.style.scrollSnapType = '';
      setTimeout(() => { sDrag.drag = false; }, 0);
    });
    cards.forEach((c, i) => c.addEventListener('click', () => { if (!sDrag.drag) goCard(i); }));

    buy.addEventListener('click', () => {
      const msg = t('prMsg').replace('{p}', t('cap.' + cards[N + Math.max(sel, 0)].dataset.ref)).replace('{f}', t('fr' + (af + 1)));
      const ta = $('#f-msg'), have = ta.value.trim();
      ta.value = !have || have === lastAuto ? msg : have + '\n\n' + msg;
      lastAuto = msg;
      ta.dispatchEvent(new Event('input'));
      $('#contact').scrollIntoView({ behavior: smooth() });
      setTimeout(() => ta.focus({ preventScroll: true }), reduce.matches ? 0 : 500);
    });

    onLang(summary);
    mob.addEventListener('change', () => { goCard(cur, true); pos = goal = Math.round(goal); render(); });
    const START = N + Math.min(2, N - 1);
    setCur(START); whenNear(settle); setFrame(0);
    render(); goCard(START, true); onStrip();
    window.addEventListener('resize', () => { goCard(cur, true); render(); });
  })();
  applyLang(lang);
})();
