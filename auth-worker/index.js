/* GitHub sign-in for the Sveltia CMS admin panel.
   /auth     sends the editor to GitHub (with a one-time CSRF token kept in a cookie)
   /callback receives GitHub's code, swaps it for a token and hands the token to the admin page that opened this window.
   The client secret lives only in the Worker's secrets. The token is only ever posted to ALLOWED_ORIGIN. */

const GITHUB = 'https://github.com';
const SCOPE = 'repo';

const cookie = (name, value, maxAge) =>
  `${name}=${value}; HttpOnly; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;

const page = (origin, status, content) => new Response(
  `<!doctype html><meta charset="utf-8"><title>Sign in</title><script>
(() => {
  const target = ${JSON.stringify(origin)};
  const msg = ${JSON.stringify('authorization:github:' + status + ':' + JSON.stringify(content))};
  addEventListener('message', e => {
    if (e.origin === target && e.data === 'authorizing:github') window.opener?.postMessage(msg, target);
  });
  window.opener?.postMessage('authorizing:github', target);
})();
</script>`,
  { headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Set-Cookie': cookie('csrf-token', 'deleted', 0), 'Cache-Control': 'no-store' } }
);

const fail = (env, error, errorCode) => page(env.ALLOWED_ORIGIN, 'error', { provider: 'github', error, errorCode });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const csrf = crypto.randomUUID().replaceAll('-', '');
      const authorize = new URL(`${GITHUB}/login/oauth/authorize`);
      authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorize.searchParams.set('scope', SCOPE);
      authorize.searchParams.set('state', csrf);
      return new Response(null, {
        status: 302,
        headers: { Location: authorize.href, 'Set-Cookie': cookie('csrf-token', csrf, 600), 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code'), state = url.searchParams.get('state');
      const saved = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)csrf-token=([0-9a-f]+)/)?.[1];
      if (!code || !state || !saved || saved !== state) return fail(env, 'Sign-in could not be verified. Please try again.', 'CSRF_DETECTED');

      let data;
      try {
        const res = await fetch(`${GITHUB}/login/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
        });
        data = await res.json();
      } catch {
        return fail(env, 'GitHub did not answer. Please try again.', 'TOKEN_REQUEST_FAILED');
      }
      if (!data.access_token) return fail(env, 'GitHub refused the sign-in.', 'TOKEN_REFUSED');
      return page(env.ALLOWED_ORIGIN, 'success', { provider: 'github', token: data.access_token });
    }

    return new Response('Not found', { status: 404 });
  }
};
