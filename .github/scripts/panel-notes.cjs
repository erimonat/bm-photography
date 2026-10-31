/* Turns a change to content/*.json (made in the admin panel) into a short, classified note.
   Run by .github/workflows/panel-notes.yml on every push to live: BEFORE and AFTER are commit ids.
   Posts the note as a comment on the commit and in the job summary. DRY_RUN=1 prints it instead. */
const { execFileSync } = require('child_process');
const fs = require('fs');

const BEFORE = process.env.BEFORE || '', AFTER = process.env.AFTER || 'HEAD';
const REPO = process.env.REPO, TOKEN = process.env.GH_TOKEN, DRY = !!process.env.DRY_RUN;
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const show = (rev, file) => { try { return JSON.parse(git(['show', rev + ':' + file])); } catch { return null; } };
const noBefore = !BEFORE || /^0+$/.test(BEFORE);

const statusLines = noBefore ? [] : git(['diff', '--name-status', BEFORE, AFTER]).split('\n').filter(Boolean).map(l => l.split('\t'));
const changedFiles = statusLines.map(x => x[x.length - 1]);
const addedFiles = statusLines.filter(x => x[0][0] === 'A' || x[0][0] === 'M').map(x => x[x.length - 1]);
const touched = f => changedFiles.includes(f);
if (!touched('content/photos.json') && !touched('content/site.json') && !changedFiles.some(f => f.startsWith('media/uploads/'))) {
  console.log('no content change, nothing to note');
  process.exit(0);
}

/* text safe to put in a GitHub comment: no mentions, no markdown surprises, bounded */
const clean = (s, n = 60) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/@/g, '＠').replace(/[`*_<>[\]]/g, '').trim().slice(0, n);
const list = (items, max = 8) => items.slice(0, max).join('; ') + (items.length > max ? ' … +' + (items.length - max) + ' daha' : '');

const lines = [];

/* ---- photographs ---- */
if (touched('content/photos.json')) {
  const norm = p => ({
    key: p.image ? 'c:' + p.image : 'p:' + p.ref,
    cap: p.caption && p.caption.tr || '', capEn: p.caption && p.caption.en || '',
    light: p.light || '', hero: !!p.hero, orientation: p.orientation || '',
    where: p.image ? (/^\//.test(p.image) ? 'sitenin kendi dosyası' : 'Cloudinary') : 'Pexels'
  });
  const a = ((show(BEFORE, 'content/photos.json') || {}).photos || []).map(norm);
  const b = ((show(AFTER, 'content/photos.json') || {}).photos || []).map(norm);
  const am = new Map(a.map(p => [p.key, p])), bm = new Map(b.map(p => [p.key, p]));
  const added = b.filter(p => !am.has(p.key)), removed = a.filter(p => !bm.has(p.key));
  const LIGHT = { gold: 'altın saat', day: 'gün ışığı', blue: 'mavi saat', dark: 'gece' };
  const edits = [];
  for (const p of b) {
    const o = am.get(p.key); if (!o) continue;
    const what = [];
    if (o.cap !== p.cap) what.push('Türkçe açıklama');
    if (o.capEn !== p.capEn) what.push('İngilizce açıklama');
    if (o.light !== p.light) what.push('ışık türü: ' + (LIGHT[o.light] || o.light) + ' → ' + (LIGHT[p.light] || p.light));
    if (o.hero !== p.hero) what.push(p.hero ? 'açılış sahnesine eklendi' : 'açılış sahnesinden çıkarıldı');
    if (what.length) edits.push('“' + clean(p.cap) + '” (' + what.join(', ') + ')');
  }
  const common = b.filter(p => am.has(p.key)).map(p => p.key), commonBefore = a.filter(p => bm.has(p.key)).map(p => p.key);
  const reordered = common.length > 1 && common.join('|') !== commonBefore.join('|');
  if (added.length || removed.length || edits.length || reordered) {
    lines.push('### Fotoğraflar (' + b.length + ' fotoğraf)');
    if (added.length) lines.push('- **Eklendi (' + added.length + '):** ' + list(added.map(p => '“' + clean(p.cap) + '” (' + LIGHT[p.light] + ', ' + p.where + (p.hero ? ', açılış sahnesi' : '') + ')')));
    if (removed.length) lines.push('- **Silindi (' + removed.length + '):** ' + list(removed.map(p => '“' + clean(p.cap) + '”')));
    if (edits.length) lines.push('- **Düzenlendi (' + edits.length + '):** ' + list(edits));
    if (reordered) lines.push('- **Sıra değişti** (sitedeki arka plan sırası ve çerçeve bölümündeki sıra)');
  }
}

/* ---- texts and contact details ---- */
if (touched('content/site.json')) {
  const GROUP = { galeri: 'Galeri bölümü', hakkimda: 'Hakkımda bölümü', cerceve: 'Çerçeve bölümü', iletisim: 'İletişim bölümü', alt: 'Sayfanın en altı' };
  const flat = s => {
    const m = new Map();
    for (const [k, v] of Object.entries(s || {})) {
      if (k === 'texts') {
        for (const [g, o] of Object.entries(v || {})) {
          const put = (key, t, grp) => { for (const l of ['tr', 'en']) m.set(key + ' (' + l.toUpperCase() + ')', { v: (t && t[l]) || '', sec: grp ? GROUP[grp] || grp : 'Metin' }); };
          if (o && 'tr' in o) put(g, o, null); else for (const [k2, t] of Object.entries(o || {})) put(k2, t, g);
        }
      } else if (typeof v === 'string') m.set('site:' + k, { v, sec: 'İletişim bilgisi', name: ({ email: 'e-posta', instagram: 'Instagram', pexels: 'Pexels' })[k] || k });
    }
    return m;
  };
  const a = flat(show(BEFORE, 'content/site.json')), b = flat(show(AFTER, 'content/site.json'));
  const changed = [...b.keys()].filter(k => ((a.get(k) || {}).v || '') !== (b.get(k).v || ''));
  const bySection = new Map();
  for (const k of changed) { const e = b.get(k); bySection.set(e.sec, [...(bySection.get(e.sec) || []), e.name || k]); }
  if (bySection.size) {
    lines.push('### Metinler ve bilgiler');
    for (const [sec, items] of bySection) lines.push('- **' + sec + ':** ' + list(items));
  }
}

/* ---- uploads that went to the repository instead of Cloudinary ---- */
const uploads = addedFiles.filter(f => f.startsWith('media/uploads/'));
if (uploads.length) lines.push('### Dikkat\n- Siteye doğrudan yüklenen dosya: ' + list(uploads.map(f => clean(f, 80))) + '. Fotoğraflar Cloudinary\'den seçilmeli; bu dosyalar sitede gösterilmez.');

if (!lines.length) { console.log('content files changed but nothing visible, nothing to note'); process.exit(0); }
const body = '**Panel değişikliği özeti**\n\n' + lines.join('\n') + '\n\n<sub>Bu not otomatik üretildi (.github/scripts/panel-notes.cjs).</sub>';

(async () => {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body + '\n');
  if (DRY || !TOKEN || !REPO) { console.log(body); return; }
  const r = await fetch('https://api.github.com/repos/' + REPO + '/commits/' + AFTER + '/comments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body })
  });
  if (!r.ok) { console.error('comment failed', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  console.log('note posted on', AFTER);
})();
