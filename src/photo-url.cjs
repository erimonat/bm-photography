/* One place that turns a photo entry into image addresses. Templates carry {k} (w or h) and {n} (pixels). */
const SITE = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'content', 'site.json'), 'utf8'));
const pexels = id => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb';
const cloud = ref => 'https://res.cloudinary.com/' + SITE.cloudinary + '/image/upload/c_limit,{k}_{n},q_auto,f_auto/' + encodeURI(ref);
const tpl = p => p.source === 'cloudinary' ? cloud(p.ref) : pexels(p.ref) + '&{k}={n}';
const url = (p, k, n) => tpl(p).split('{k}').join(k).split('{n}').join(n);
const widthTpl = p => tpl(p).split('{k}').join('w');
const hosts = ps => [...new Set(ps.map(p => p.source === 'cloudinary' ? 'https://res.cloudinary.com' : 'https://images.pexels.com'))];

/* a Cloudinary pick in the admin panel is a full address; the site only needs the public id (folder/name, no version, no extension) */
const publicId = ref => {
  let id = String(ref).trim();
  const m = id.match(/\/image\/upload\/(.+)$/);
  if (m) {
    const parts = m[1].split('?')[0].split('/');
    while (parts.length > 1 && (/^v\d+$/.test(parts[0]) || /^s--.*--$/.test(parts[0]) || /^[a-z]{1,3}_[^/]*$/.test(parts[0]) || parts[0].includes(','))) parts.shift();
    id = parts.map(decodeURIComponent).join('/');
  }
  return id.replace(/\.(jpe?g|png|webp|avif|gif|heic|tiff?)$/i, '');
};

/* width and height from Cloudinary, read once at build time (a few photos, so a blocking call is fine) */
const dims = id => {
  try {
    const out = require('child_process').execFileSync(process.execPath, ['-e',
      "fetch(process.argv[1]).then(r => { if (!r.ok) process.exit(2); return r.json(); }).then(j => console.log(JSON.stringify(j.input || {}))).catch(() => process.exit(1))",
      'https://res.cloudinary.com/' + SITE.cloudinary + '/image/upload/fl_getinfo/' + encodeURI(id)], { timeout: 20000, encoding: 'utf8' });
    const d = JSON.parse(out);
    return d.width && d.height ? d : null;
  } catch { return null; }
};

/* the editor panel stores either a Pexels number or a Cloudinary pick; everything after this point sees ref, source and orientation only */
const normalize = photos => {
  photos.forEach((p, i) => {
    const name = '#' + (i + 1) + ' ' + ((p.caption && p.caption.tr) || p.ref || p.image || '');
    if (p.image) { p.source = 'cloudinary'; p.ref = publicId(p.image); }
    if (!p.ref) throw new Error('photos.json ' + name + ': no photo chosen (pick one from Cloudinary or give a Pexels number)');
    if (!p.caption || !p.caption.tr) throw new Error('photos.json ' + name + ': the Turkish caption is empty');
    if (p.source === 'cloudinary') {
      const d = dims(p.ref);
      if (d) p.orientation = d.width > d.height ? 'landscape' : 'portrait';
      else if (!p.orientation) { p.orientation = 'landscape'; console.warn('warning: could not read the size of Cloudinary photo "' + p.ref + '", treating it as landscape'); }
    }
    if (p.orientation !== 'landscape' && p.orientation !== 'portrait') throw new Error('photos.json ' + name + ': orientation is missing');
    if (!p.light) throw new Error('photos.json ' + name + ': the light type is missing');
  });
  return photos;
};

module.exports = { tpl, url, widthTpl, hosts, publicId, normalize };
