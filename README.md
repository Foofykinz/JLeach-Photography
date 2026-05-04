# JLeach Photography — Setup & Deployment Guide

This guide is written for **Alyson** to follow step-by-step.

---

## What You're Building

| Part | What it does |
|------|-------------|
| Website | Static site built with Astro, hosted on Cloudflare Pages (free) |
| Admin panel | Decap CMS at `/admin` — protected by Cloudflare Access |
| Auth | Cloudflare Access — Josh logs in with his email + a one-time code |
| Photo storage | Cloudflare R2 bucket (free tier) |
| Contact form | Cloudflare Worker (free) — emails Josh at `jmleachphotography@gmail.com` |

Everything is on **free tiers**. No monthly bills.

---

## Prerequisites — Accounts to Create (all free)

1. **GitHub** — https://github.com (where the site's files live)
2. **Cloudflare** — https://cloudflare.com (hosting, auth, storage, workers)
3. **Resend** — https://resend.com (contact form emails)
4. **Node.js** — https://nodejs.org — install the LTS version on your computer

---

## Step 1 — Push to GitHub

In a terminal, from the `Josh Website` folder:

```bash
npm install
git init
git add .
git commit -m "Initial site build"
git branch -M main
git remote add origin https://github.com/Foofykinz/JLeach-Photography.git
git push -u origin main
```

---

## Step 2 — Deploy to Cloudflare Pages

1. Log into Cloudflare → **Workers & Pages** → **Create** → **Pages**
2. Click **Connect to Git** → authorize Cloudflare → select `JLeach-Photography`
3. Build settings:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Click **Save and Deploy**

Cloudflare builds and deploys in ~2 minutes.

> **Custom domain**: Workers & Pages → your project → **Custom domains** → Add `jleachphotography.com`

---

## Step 3 — Set Up Cloudflare R2 (Image Storage)

1. Cloudflare dashboard → **R2** → **Create bucket**
2. Name the bucket: `jleach-photography`
3. Once created → **Settings** → **Custom Domains** → Add `images.jleachphotography.com`

---

## Step 4 — Set Up Cloudflare Access (Admin Login)

This puts a login gate in front of `/admin` so only Josh can reach it.

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications**
2. Click **Add an application** → **Self-hosted**
3. Fill in:
   - **Application name**: JLeach Photography Admin
   - **Application domain**: `jleachphotography.com/admin`
4. Click **Next** → **Add a policy**
   - Policy name: Allow Josh
   - Action: Allow
   - Include: **Emails** → `jmleachphotography@gmail.com`
5. Click **Save**

**How Josh logs in:**
1. Goes to `jleachphotography.com/admin`
2. Cloudflare Access prompts for his email
3. He enters `jmleachphotography@gmail.com`
4. Gets a one-time code in his inbox
5. Enters the code → straight into the CMS

---

## Step 5 — Set Up the Contact Form Worker

### 5a. Sign up for Resend

1. Go to https://resend.com → sign up (free)
2. **API Keys** → **Create API key** → copy it
3. **Domains** → **Add Domain** → verify your sending domain via DNS
4. Update `workers/contact-form.js`: change `FROM_EMAIL` to `noreply@yourdomain.com`

### 5b. Set up Cloudflare Turnstile (CAPTCHA)

1. Cloudflare dashboard → **Turnstile** → **Add site**
2. Name: `JLeach Photography Contact Form`, Domain: `jleachphotography.com`
3. Copy the **Site Key** → paste into `src/components/ContactForm.astro` replacing `YOUR_TURNSTILE_SITE_KEY`

### 5c. Deploy the Worker

```bash
npm install -g wrangler
wrangler login
npx wrangler deploy workers/contact-form.js --name jleach-contact
npx wrangler secret put RESEND_API_KEY --name jleach-contact
npx wrangler secret put TURNSTILE_SECRET_KEY --name jleach-contact
```

Update the worker URL in `src/components/ContactForm.astro`.

---

## How Josh Uses the Admin Panel

1. Go to `jleachphotography.com/admin`
2. Enter email → receive one-time code → enter code
3. CMS opens

### Adding a Photo

1. **Gallery Photos** → **New Gallery Photos**
2. Upload a photo, pick a **Category**
3. Optionally add Title and Caption
4. Set **Sort Order** (1 = appears first)
5. Toggle **Feature on About Page reel?** if wanted
6. Click **Publish** — site rebuilds in ~1 minute

### Updating the About Page

**About Page** → **About Page Content** → edit headshot or bio → **Publish**

### Changing the Homepage Tagline

**Site Settings** → edit **Homepage Tagline** → **Publish**

---

## Adding Category Cover Images

Drop files into `public/images/covers/` named:
- `portraits.jpg` · `landscape.jpg` · `storms.jpg` · `animals.jpg` · `vehicles.jpg`

Or upload any photo to that category — the card automatically uses the lowest Sort Order photo as its cover.

---

## File Structure

```
public/
  admin/
    index.html        ← CMS entry point
    config.yml        ← CMS configuration
  images/
    covers/           ← Category card backgrounds
    uploads/          ← CMS photo uploads
  favicon.svg

src/
  components/
  content/
    photos/           ← One .md file per photo (CMS managed)
    about/about.md    ← About page content (CMS managed)
  data/settings.json  ← Tagline, email, socials (CMS managed)
  layouts/BaseLayout.astro
  pages/
  styles/global.css

workers/
  contact-form.js     ← Email Worker
  r2-upload.js        ← R2 image upload Worker

wrangler.toml         ← Cloudflare Workers + R2 config
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Josh can't reach `/admin` | Check Cloudflare Access policy — make sure his email is listed |
| One-time code email not arriving | Check spam folder; re-send from Access → Applications |
| CMS login fails after Access | Check `config.yml` `base_url` and `auth_endpoint` are correct |
| Photos don't appear after upload | Rebuild takes ~1 min — wait and refresh |
| Category cards are dark | No photos uploaded yet, or no cover in `public/images/covers/` |
| Contact form not working | Update `WORKER_URL` in `src/components/ContactForm.astro` |

---

## Making Code Changes

```bash
npm run dev        # preview locally
git add .
git commit -m "description"
git push           # triggers Cloudflare Pages redeploy automatically
```

*Built 2026 for JLeach Photography*
