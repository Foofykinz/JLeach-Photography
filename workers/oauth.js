/**
 * Cloudflare Worker — GitHub OAuth for Decap CMS
 *
 * Flow:
 *   1. CMS opens popup → /auth → GitHub OAuth page
 *   2. GitHub redirects back → /callback?code=xxx
 *   3. Worker exchanges code for token
 *   4. Worker redirects popup to /callback.html#access_token=xxx
 *   5. callback.html reads the hash and postMessages the token to the opener (admin window)
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

      // Redirect the popup to /callback.html#access_token=xxx
      // callback.html reads the hash and postMessages the token back to the opener
      return popupResponse(tokenData.access_token);
    }

    return new Response('Not found', { status: 404 });
  },
};

function popupResponse(token) {
  const successMsg = `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`;

  // Implements the Netlify OAuth handshake protocol that Decap CMS expects:
  //   1. Popup sends "authorizing:github" to opener (handshake)
  //   2. Decap responds with "authorized"
  //   3. Popup sends the success message to opener using opener's origin
  return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Authenticating...</title></head>
<body>
<script>
  var successMsg = ${JSON.stringify(successMsg)};

  // Step 2: when Decap ACKs our handshake, send it the token
  window.addEventListener('message', function(e) {
    console.log('[oauth] received ACK:', e.data, 'from:', e.origin);
    window.opener.postMessage(successMsg, e.origin);
    console.log('[oauth] sent success message');
    setTimeout(function() { window.close(); }, 500);
  });

  // Step 1: tell Decap we are authorizing
  if (window.opener) {
    window.opener.postMessage('authorizing:github', '*');
    console.log('[oauth] sent handshake: authorizing:github');
  } else {
    console.error('[oauth] window.opener is null');
  }
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function errorPage(message) {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">
      <p>Authentication error: <strong>${message}</strong></p>
      <p>Close this window and try again.</p>
    </body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } }
  );
}
