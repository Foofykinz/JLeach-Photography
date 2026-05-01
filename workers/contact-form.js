/**
 * Cloudflare Worker — Contact Form Handler
 * ==========================================
 * Receives POST from the contact form, validates the Turnstile CAPTCHA,
 * then sends an email via Resend (free tier: 3,000 emails/month).
 *
 * SETUP (one-time):
 *   1. Sign up at https://resend.com (free — no credit card needed)
 *   2. Verify a sending domain (or use the sandbox domain for testing)
 *   3. Create an API key in the Resend dashboard
 *   4. Create a Cloudflare Turnstile widget at dash.cloudflare.com → Turnstile
 *      and note the Secret Key
 *   5. Deploy this worker:
 *        npx wrangler deploy workers/contact-form.js --name jleach-contact
 *   6. Add secrets (never put these in code!):
 *        npx wrangler secret put RESEND_API_KEY
 *        npx wrangler secret put TURNSTILE_SECRET_KEY
 *   7. Update the WORKER_URL in src/components/ContactForm.astro
 *
 * The worker runs on Cloudflare's free tier — no cost.
 */

const ALLOWED_ORIGIN = 'https://jleachphotography.com'; // update to your domain
const TO_EMAIL       = 'jmleachphotography@gmail.com';
const FROM_EMAIL     = 'noreply@yourdomain.com'; // must match your verified Resend domain

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin?.includes('localhost');
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, origin);
    }

    const { name, email, subject, message } = body;
    const turnstileToken = body['cf-turnstile-response'];

    // Basic field validation
    if (!name || !email || !subject || !message) {
      return json({ error: 'All fields are required' }, 400, origin);
    }

    // Validate Turnstile CAPTCHA
    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        secret:   env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP'),
      }),
    });

    const tsData = await tsRes.json();
    if (!tsData.success) {
      return json({ error: 'CAPTCHA verification failed' }, 400, origin);
    }

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:     FROM_EMAIL,
        to:       [TO_EMAIL],
        reply_to: email,
        subject:  `Contact Form: ${subject}`,
        html: `
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr />
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend error:', errBody);
      return json({ error: 'Failed to send email' }, 500, origin);
    }

    return json({ success: true }, 200, origin);
  },
};

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g, '&#39;');
}
