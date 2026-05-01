# JLeach Photography — Setup & Deployment Guide

This guide is written for **Alyson** to follow step-by-step.

---

## What You're Building

| Part | What it does |
|------|-------------|
| Website | Static site built with Astro, hosted on Netlify (free) |
| Admin panel | Decap CMS at `/admin` — Josh logs in with email + password |
| Auth | Netlify Identity — no GitHub account needed for Josh |
| Photo storage | Photos committed to GitHub automatically when Josh saves in the CMS |
| Contact form | Cloudflare Worker (free) — emails Josh at `jmleachphotography@gmail.com` |

Everything is on **free tiers**. No monthly bills.

---

## Prerequisites — Accounts to Create (all free)

1. **GitHub** — https://github.com (where the site's files live)
2. **Netlify** — https://netlify.com (where the site is hosted + CMS auth)
3. **Resend** — https://resend.com (sends contact form emails — free, no credit card)
4. **Node.js** — https://nodejs.org — install the LTS version on your computer

---

## Step 1 — Set Up the GitHub Repository

1. Log into GitHub
2. Click **+** → **New repository**
3. Name it: `jleach-photography`, set to **Private**
4. Do NOT add a README or .gitignore
5. Click **Create repository**

In a terminal, from the `Josh Website` folder:

```bash
npm install
git init
git add .
git commit -m "Initial site build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jleach-photography.git
git push -u origin main
```

---

## Step 2 — Deploy to Netlify

1. Log into Netlify → **Add new site** → **Import an existing project**
2. Click **GitHub** and authorize Netlify
3. Select the `jleach-photography` repository
4. Build settings (should auto-detect from `netlify.toml`):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **Deploy site**

Netlify builds and deploys in ~2 minutes. You'll get a free URL like `jleach-photography.netlify.app`.

---

## Step 3 — Enable Netlify Identity (CMS Login)

This is what lets Josh log into `/admin` with just an email and password.

1. In Netlify → your site → **Site configuration** → **Identity** → **Enable Identity**
2. Under **Identity** → **Services** → **Enable Git Gateway**
3. Under **Identity** → **Registration** → set to **Invite only**
4. Click **Invite users** → enter `jmleachphotography@gmail.com`
5. Josh gets an email, clicks the link, sets his password — done

Josh's login from now on:
- Go to `https://your-site.netlify.app/admin`
- Enter email + password
- Done. No GitHub account needed.

---

## Step 4 — Connect a Custom Domain (optional)

If Josh has `jleachphotography.com`:

1. Netlify → **Domain management** → **Add a domain**
2. Follow the DNS instructions Netlify provides
3. Netlify provisions a free SSL certificate automatically

---

## Step 5 — Set Up the Contact Form Worker

### 5a. Create a Resend account

1. Go to https://resend.com → sign up (free)
2. **API Keys** → **Create API key** → copy it
3. **Domains** → **Add Domain** → verify your domain via DNS
4. Update `workers/contact-form.js` line: `const FROM_EMAIL = 'noreply@yourdomain.com'`

### 5b. Set up Cloudflare Turnstile (CAPTCHA)

1. Log into https://cloudflare.com → **Turnstile** → **Add site**
2. Name: `JLeach Photography Contact Form`
3. Domain: your Netlify domain
4. Copy the **Site Key** → paste it into `src/components/ContactForm.astro` replacing `YOUR_TURNSTILE_SITE_KEY`

### 5c. Deploy the contact form Worker

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

1. Go to `https://your-site.netlify.app/admin` (or custom domain + `/admin`)
2. Enter his email and password
3. The CMS opens

### Adding a Photo

1. Click **Gallery Photos** → **New Gallery Photos**
2. Drag a photo onto the upload box
3. Pick a **Category**
4. Optionally add Title and Caption
5. Set **Sort Order** (1 = appears first in category)
6. Toggle **Feature on About Page reel?** to add it to the About page reel
7. Click **Publish** — site rebuilds in ~1 minute

### Updating the About Page

**About Page** → **About Page Content** → edit headshot or bio → **Publish**

### Changing the Homepage Tagline

**Site Settings** → edit **Homepage Tagline** → **Publish**

---

## Adding Category Cover Images

Drop files into `public/images/covers/` named exactly:
- `portraits.jpg`
- `landscape.jpg`
- `storms.jpg`
- `animals.jpg`
- `vehicles.jpg`

Or upload any photo to that category — the card automatically uses the lowest Sort Order photo as its cover.

---

## File Structure Quick Reference

```
public/
  admin/
    index.html        ← CMS entry point (Netlify Identity)
    config.yml        ← CMS configuration
  images/
    covers/           ← Category card backgrounds
    uploads/          ← CMS photo uploads go here
  favicon.svg

src/
  components/         ← Sidebar, TopBar, Hero, galleries, etc.
  content/
    photos/           ← One .md file per photo (managed by CMS)
    about/about.md    ← About page content (managed by CMS)
  data/settings.json  ← Tagline, email, socials (managed by CMS)
  layouts/BaseLayout.astro
  pages/              ← One .astro file per URL
  styles/global.css

workers/
  contact-form.js     ← Cloudflare Worker for contact form emails

netlify.toml          ← Netlify build + redirect config
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CMS login doesn't work | Make sure Netlify Identity is enabled AND Git Gateway is enabled under Identity → Services |
| Josh didn't get the invite email | Netlify → Identity → Users → resend invite |
| Photos don't appear after upload | Site rebuilds take ~1 min after a CMS publish — wait and refresh |
| Contact form says "not yet configured" | Update `WORKER_URL` in `src/components/ContactForm.astro` |
| Category cards are dark/blank | No photos uploaded for that category yet, or no cover image in `public/images/covers/` |
| Build fails on Netlify | Check the deploy log — usually a missing dependency or content file syntax error |

---

## Making Code Changes

```bash
# Test locally
npm run dev

# Push to trigger a Netlify redeploy
git add .
git commit -m "Description of change"
git push
```

*Built 2025 for JLeach Photography*
