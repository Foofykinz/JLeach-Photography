/**
 * Cloudflare Worker — GitHub OAuth for Decap CMS
 * ================================================
 * Decap CMS's GitHub backend needs an OAuth server to exchange
 * authorization codes for access tokens.  This worker acts as
 * that server so there's no need for a Netlify account.
 *
 * SETUP (one-time):
 *   1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
 *      · Application name:    JLeach Photography CMS
 *      · Homepage URL:        https://jleachphotography.com
 *      · Authorization callback URL: https://YOUR_WORKER.workers.dev/callback
 *        (deploy the worker first to get the URL, then come back and set this)
 *   2. Deploy this worker:
 *        npx wrangler deploy workers/oauth.js --name jleach-oauth
 *   3. Add secrets:
 *        npx wrangler secret put GITHUB_CLIENT_ID
 *        npx wrangler secret put GITHUB_CLIENT_SECRET
 *   4. Update public/admin/config.yml:
 *        base_url: https://jleach-oauth.YOUR_ACCOUNT.workers.dev
 *
 * The worker runs on Cloudflare's free tier — no cost.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Step 1: Redirect browser to GitHub OAuth page
    if (url.pathname === '/auth') {
      const params = new URLSearchParams({
        client_id:    env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope:        'repo,user',
      });
      return Response.redirect(
        `https://github.com/login/oauth/authorize?${params}`,
        302
      );
    }

    // Step 2: Receive callback from GitHub, exchange code for token
    if (url.pathname === '/callback') {
      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        return postMessageHtml('error', { error: error ?? 'no_code' });
      }

      // Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
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

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return postMessageHtml('error', tokenData);
      }

      return postMessageHtml('success', tokenData);
    }

    return new Response('Not found', { status: 404 });
  },
};

/**
 * Returns an HTML page that posts a message back to the Decap CMS popup opener
 * and then closes itself.  The message format is what Decap expects.
 */
function postMessageHtml(status, data) {
  const message = `authorization:github:${status}:${JSON.stringify(data)}`;
  const html = `<!doctype html>
<html>
<body>
<script>
  (function() {
    function receiveMessage(e) {
      console.log("[oauth] message from opener:", e.data);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage(${JSON.stringify(message)}, "*");
    setTimeout(function() { window.close(); }, 500);
  })();
</script>
<p>Authenticating&hellip; this window will close automatically.</p>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
