/* Contact form endpoint. Static files are served by Cloudflare itself; this Worker only runs for /api/*.
   Secrets and settings come from the environment: RESEND_API_KEY (secret), MAIL_TO, MAIL_FROM (vars). */

const LIMITS = { name: [2, 80], email: [5, 120], message: [10, 800] };
const MAX_BODY = 4096;
const MIN_FILL_MS = 2500;

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

const oneLine = s => s.replace(/[\r\n\t]+/g, ' ').trim();

export function validate(input, now = Date.now()) {
  if (!input || typeof input !== 'object') return { error: 'invalid' };
  /* a hidden field only bots fill in: pretend it worked so they do not retry */
  if (typeof input.website === 'string' && input.website !== '') return { bot: true };
  const out = {};
  for (const [k, [min, max]] of Object.entries(LIMITS)) {
    const v = input[k];
    if (typeof v !== 'string') return { error: 'invalid' };
    const s = k === 'message' ? v.trim() : oneLine(v);
    if (s.length < min || s.length > max) return { error: 'invalid' };
    out[k] = s;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return { error: 'invalid' };
  if (typeof input.t === 'number' && now - input.t < MIN_FILL_MS) return { bot: true };
  return { value: out };
}

async function contact(request, env) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method' }, { allow: 'POST' });
  /* same-origin only: the form lives on this site */
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'origin' });
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'type' });

  if (env.RL) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const { success } = await env.RL.limit({ key: ip });
    if (!success) return json(429, { ok: false, error: 'rate' }, { 'retry-after': '60' });
  }

  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { ok: false, error: 'size' });
  let input;
  try { input = JSON.parse(text); } catch { return json(400, { ok: false, error: 'invalid' }); }

  const v = validate(input);
  if (v.bot) return json(200, { ok: true });
  if (v.error) return json(400, { ok: false, error: 'invalid' });
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json(500, { ok: false, error: 'config' });

  const { name, email, message } = v.value;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Site <onboarding@resend.dev>',
      to: [env.MAIL_TO],
      reply_to: email,
      subject: 'Yeni mesaj: ' + name,
      text: message + '\n\n' + name + ' <' + email + '>'
    })
  });
  if (!res.ok) return json(502, { ok: false, error: 'send' });
  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return contact(request, env);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  }
};
