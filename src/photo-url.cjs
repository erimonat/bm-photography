/* One place that turns a photo entry into image addresses. Templates carry {k} (w or h) and {n} (pixels). */
const SITE = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'content', 'site.json'), 'utf8'));
const pexels = id => 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb';
const cloud = ref => 'https://res.cloudinary.com/' + SITE.cloudinary + '/image/upload/c_limit,{k}_{n},q_auto,f_auto/' + encodeURI(ref);
const tpl = p => p.source === 'cloudinary' ? cloud(p.ref) : pexels(p.ref) + '&{k}={n}';
const url = (p, k, n) => tpl(p).split('{k}').join(k).split('{n}').join(n);
const widthTpl = p => tpl(p).split('{k}').join('w');
const hosts = ps => [...new Set(ps.map(p => p.source === 'cloudinary' ? 'https://res.cloudinary.com' : 'https://images.pexels.com'))];
module.exports = { tpl, url, widthTpl, hosts };
