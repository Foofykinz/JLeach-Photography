/**
 * Cloudflare Worker — GitHub OAuth for Decap CMS
 *
 * Flow:
 *   1. CMS opens popup → /auth → GitHub OAuth page
 *   2. GitHub redirects back → /callback?code=xxx
 *   3. Worker exchanges code for token
 *   4. Worker redirects popup to /admin/#access_token=xxx
 *   5. admin/index.html picks up the hash and posts the token to the opener
 *
 * Required Worker secrets:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *
 * GitHub OAuth App — Authorization callback URL:
 *   https://jleach-oauth.alysonwalters22.workers.dev/callback
 */

const ADMIN_URL = 'https://jleachphotography.com/admin/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Step 1: redirect to GitHub ───────────────────────────────────────────
    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id:    env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope:        'repo,user',
        state:        url.searchParams.get('state') ?? crypto.randomUUID(),
      });

      return Response.redirect(
        `https://github.com/login/oauth/authorize?${params}`,
        302
      );
    }

    // ── Step 2: exchange code, redirect popup back to admin with token hash ──
    if (url.pathname === '/callback') {
      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        return errorPage(error ?? 'authorization_failed');
      }

      let tokenData;
      try {
        const res = await fetch('https://github.com/login/oauth/access_token', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
          body: JSON.stringify({
            client_id:     env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri:  `${url.origin}/callback`,
          }),
        });
        tokenData = await res.json();
      } catch {
        return errorPage('token_fetch_failed');
      }

      if (tokenData.error || !tokenData.access_token) {
        return errorPage(tokenData.error_description ?? tokenData.error ?? 'no_access_token');
      }

      // Redirect the popup to /admin/#access_token=xxx
      // admin/index.html picks this up and posts it to the opener window
      return Response.redirect(
        `https://jleachphotography.com/callback.html#access_token=${tokenData.access_token}`,
        302
      );
    }

    return new Response('Not found', { status: 404 });
  },
};

function errorPage(message) {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">
      <p>Authentication error: <strong>${message}</strong></p>
      <p>Close this window and try again.</p>
    </body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } }
  );
}
