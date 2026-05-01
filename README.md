# JLeach Photography — Setup & Deployment Guide

This guide is written for **Alyson** to follow step-by-step. No developer experience needed for most of it — but a few steps require creating free accounts and following instructions carefully.

---

## What You're Building

| Part | What it does |
|------|-------------|
| Website | Static site built with Astro, hosted on Cloudflare Pages (free) |
| Admin panel | Decap CMS at `/admin` — Josh logs in here to upload photos |
| Photo storage | Photos are committed to GitHub automatically when Josh saves in the CMS |
| Contact form | Handled by a Cloudflare Worker (free) — emails Josh at `jmleachphotography@gmail.com` |

Everything is on **free tiers**. No monthly bills.

---

## Prerequisites — Accounts to Create (all free)

Before you start, create or log into these:

1. **GitHub** — https://github.com (where the site's files live)
2. **Cloudflare** — https://cloudflare.com (where the site is hosted)
3. **Resend** — https://resend.com (sends contact form emails — free, no credit card)
4. **Node.js** — https://nodejs.org — install the LTS version on your computer

---

## Step 1 — Set Up the GitHub Repository

1. Log into GitHub
2. Click the **+** button (top right) → **New repository**
3. Name it: `jleach-photography`
4. Set it to **Private** (so the source code isn't public)
5. Do NOT add a README or .gitignore — leave those unchecked
6. Click **Create repository**
7. Copy the repository URL — it will look like: `https://github.com/YOUR_USERNAME/jleach-photography.git`

Now, open a terminal (search "Terminal" or "Command Prompt" on your computer) and run:

```bash
cd "Desktop/Josh Website"
git init
git add .
git commit -m "Initial site build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jleach-photography.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 2 — Run the Site Locally (optional but useful for testing)

In the terminal, from the `Josh Website` folder:

```bash
npm install
npm run dev
```

The site will be available at http://localhost:4321 in your browser.  
Press `Ctrl+C` to stop it.

---

## Step 3 — Deploy to Cloudflare Pages

1. Log into Cloudflare → **Pages** (left sidebar) → **Create a project**
2. Click **Connect to Git** → authorize Cloudflare to access your GitHub
3. Select the `jleach-photography` repository
4. Set these build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**

Cloudflare will build and deploy the site. It takes about 1–2 minutes.  
You'll get a free URL like `jleach-photography.pages.dev`.

> **Custom domain**: If Josh wants `jleachphotography.com`, go to Pages → your project → Custom domains → Add domain. You'll need to point the domain's DNS to Cloudflare.

---

## Step 4 — Set Up the GitHub OAuth Worker (for CMS login)

The CMS needs this so Josh can log in with GitHub.

### 4a. Create a GitHub OAuth App

1. Log into GitHub → **Settings** (your profile, top right) → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name**: `JLeach Photography CMS`
   - **Homepage URL**: `https://your-site.pages.dev` (your Cloudflare Pages URL)
   - **Authorization callback URL**: `https://jleach-oauth.YOUR_CF_ACCOUNT.workers.dev/callback`
     (You'll fill this in properly after deploying the worker — see 4c)
3. Click **Register application**
4. On the next page, note the **Client ID**
5. Click **Generate a new client secret** and copy it (you only see it once!)

### 4b. Install Wrangler (Cloudflare's deploy tool)

```bash
npm install -g wrangler
wrangler login
```

Follow the browser prompts to log into your Cloudflare account.

### 4c. Deploy the OAuth Worker

```bash
npx wrangler deploy workers/oauth.js --name jleach-oauth
```

This gives you a URL like: `https://jleach-oauth.YOUR_ACCOUNT.workers.dev`

**Go back to GitHub** and update the OAuth App's callback URL to:  
`https://jleach-oauth.YOUR_ACCOUNT.workers.dev/callback`

### 4d. Add secrets to the OAuth Worker

```bash
npx wrangler secret put GITHUB_CLIENT_ID --name jleach-oauth
# (paste the Client ID when prompted)

npx wrangler secret put GITHUB_CLIENT_SECRET --name jleach-oauth
# (paste the Client Secret when prompted)
```

### 4e. Update the CMS config

Open `public/admin/config.yml` and replace these lines with your actual values:

```yaml
backend:
  name: github
  repo: YOUR_GITHUB_USERNAME/jleach-photography
  branch: main
  base_url: https://jleach-oauth.YOUR_ACCOUNT.workers.dev
  auth_endpoint: auth
```

Save the file, then:

```bash
git add public/admin/config.yml
git commit -m "Configure CMS backend"
git push
```

Cloudflare Pages will auto-redeploy within a minute.

---

## Step 5 — Set Up the Contact Form Worker

### 5a. Create a Resend account

1. Go to https://resend.com and sign up (free)
2. Verify your email
3. In the Resend dashboard, go to **API Keys** → **Create API key**
4. Name it `jleach-photography` and create it — copy the key

### 5b. Set up a sending domain in Resend

1. In Resend → **Domains** → **Add Domain**
2. Follow the instructions to add the DNS records to your domain
3. Once verified, update `workers/contact-form.js` line:  
   ```js
   const FROM_EMAIL = 'noreply@yourdomain.com';
   ```
   Replace with `noreply@youractualverifieddomain.com`

> **Note**: If you don't have a domain yet, Resend provides a sandbox that still works for testing.

### 5c. Set up Cloudflare Turnstile (CAPTCHA)

1. Log into Cloudflare → **Turnstile** → **Add site**
2. Name: `JLeach Photography Contact Form`
3. Domain: your Pages domain (e.g. `jleach-photography.pages.dev`)
4. Widget type: Managed
5. Copy the **Site Key** and **Secret Key**
6. Open `src/components/ContactForm.astro` and replace `YOUR_TURNSTILE_SITE_KEY` with your Site Key

### 5d. Deploy the contact form Worker

```bash
npx wrangler deploy workers/contact-form.js --name jleach-contact
```

This gives you a URL like: `https://jleach-contact.YOUR_ACCOUNT.workers.dev`

Open `src/components/ContactForm.astro` and replace `YOUR_WORKER_NAME.YOUR_ACCOUNT.workers.dev/contact` with your actual worker URL.

### 5e. Add secrets to the contact form Worker

```bash
npx wrangler secret put RESEND_API_KEY --name jleach-contact
# (paste your Resend API key)

npx wrangler secret put TURNSTILE_SECRET_KEY --name jleach-contact
# (paste your Turnstile Secret Key)
```

### 5f. Commit changes and push

```bash
git add src/components/ContactForm.astro workers/contact-form.js
git commit -m "Configure contact form"
git push
```

---

## Step 6 — Protect the Admin Panel (Optional but Recommended)

By default, anyone can visit `/admin`. To require Josh to log in before even reaching the CMS:

1. In Cloudflare → **Zero Trust** (free tier) → **Access** → **Applications**
2. Click **Add an application** → **Self-hosted**
3. Application name: `JLeach Photography Admin`
4. Application domain: your Pages domain + `/admin*`
5. Set up an identity provider (easiest: **One-time PIN** — Josh enters his email and gets a code)
6. Add Josh's email as an allowed user

This adds a login page in front of `/admin` so only Josh can access it.

---

## How Josh Uses the Admin Panel

Once everything is set up, Josh's workflow is:

1. Visit `https://your-site.pages.dev/admin` (or your custom domain + `/admin`)
2. Click **Login with GitHub** (or enter a one-time PIN if Cloudflare Access is enabled)
3. The CMS dashboard opens

### Adding a Photo

1. Click **Gallery Photos** in the left sidebar
2. Click **New Gallery Photos** (top right)
3. Click the image upload box and drag a photo onto it (or click to browse)
4. Select a **Category** from the dropdown (Portraits, Landscape, Storms, Animals, Vehicles)
5. Optionally add a Title and Caption
6. To put it in the photo reel on the About page, turn on **Feature on About Page reel?**
7. Set a **Sort Order** number (1, 2, 3... — lower = appears first)
8. Click **Publish** (top right)

The photo uploads to GitHub and the site rebuilds automatically in ~1 minute.

### Updating the About Page

1. Click **About Page** in the left sidebar
2. Click **About Page Content**
3. Upload a headshot, edit the bio text, or update the stats numbers
4. Click **Publish**

### Changing the Homepage Tagline

1. Click **Site Settings** in the left sidebar
2. Edit the **Homepage Tagline** field
3. Click **Publish**

---

## Adding Cover Images for Category Cards

The homepage shows 5 category cards. To give each one a background photo:

1. Save an image as one of these filenames:
   - `portraits.jpg`
   - `landscape.jpg`
   - `storms.jpg`
   - `animals.jpg`
   - `vehicles.jpg`
2. Drag the files into the `public/images/covers/` folder in the GitHub repo
3. The cards will automatically show the images

---

## File Structure Quick Reference

```
public/
  admin/
    index.html        ← Decap CMS UI (don't edit)
    config.yml        ← CMS configuration (you edited this in Step 4)
  images/
    covers/           ← Category card background images
    photos/           ← CMS uploads go here automatically
  favicon.svg         ← Replace with Josh's logo

src/
  components/         ← UI building blocks (Sidebar, TopBar, etc.)
  content/
    photos/           ← One .md file per photo (managed by CMS)
    about/about.md    ← About page content (managed by CMS)
  data/
    settings.json     ← Tagline, email, social links (managed by CMS)
  layouts/
    BaseLayout.astro  ← Wraps every page (sidebar + topbar)
  pages/              ← One .astro file per URL
  styles/
    global.css        ← All the CSS

workers/
  contact-form.js     ← Cloudflare Worker for the contact form
  oauth.js            ← Cloudflare Worker for CMS login
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CMS login fails | Check `public/admin/config.yml` — `repo`, `base_url`, and `auth_endpoint` must be correct |
| Photos don't appear on the site | The site needs to rebuild after a CMS save — wait 1–2 minutes |
| Contact form says "not yet configured" | Update `WORKER_URL` in `src/components/ContactForm.astro` with your worker URL |
| Category card backgrounds are grey | Add cover images to `public/images/covers/` as described above |
| Site shows old content | Cloudflare Pages has a build cache — go to Pages → your project → Deployments and trigger a new build |

---

## Making Updates to the Code

If you ever need to change the site's design or code:

1. Edit the files in `src/`
2. Test locally with `npm run dev`
3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Description of what you changed"
   git push
   ```
4. Cloudflare Pages redeploys automatically

---

*Built May 2025 for JLeach Photography*
