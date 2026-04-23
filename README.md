# Minus One Labs

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Astro](https://img.shields.io/badge/Astro-5-ff5d01?logo=astro)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare)
![License](https://img.shields.io/badge/license-MIT-green)

**Your business. Online in 14 days — website, reviews, and SEO included.**

Minus One Labs is a done-for-you website platform for local businesses. Interested businesses request a quote, fill out a questionnaire, and get a fully built, hosted, and SEO-optimized one-page website — without touching a single line of code.

---

## Table of Contents

- [Core Features](#core-features)
- [All Features](#all-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Telegram Bot Setup](#telegram-bot-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Version History](#version-history)
- [Roadmap](#roadmap)
- [License](#license)

---

## Core Features

| Feature | Description |
|---|---|
| One-Page Website | Hero, Services, Portfolio, Testimonials, Contact — all on one fast page |
| Quote Request | Businesses submit their info; admin gets notified instantly via Telegram + Pushover |
| Dual-Row Testimonials | CSS infinite-scroll testimonial strip, two rows, opposite directions, hover-to-pause |
| SEO Built In | Schema markup, fast load times, and local search optimization from day one |
| Hosting Included | Deployed on Cloudflare Pages — global CDN, SSL, zero extra cost |
| Admin Notifications | Every contact form submission pings you instantly via Pushover and Telegram |

---

## All Features

### Platform
- Static marketing site built with Astro 5 + Tailwind CSS
- Cloudflare Pages deployment — auto-deploy on every push to `main`
- Cloudflare Functions for serverless API endpoints (contact form handler)
- Mobile-first, responsive layout across all screen sizes

### Quote & Lead System
- Contact form sends lead data to admin via **Pushover** (mobile push) and **Telegram** (chat notification)
- Form accepts business name, contact info, and project description
- No third-party form service — self-contained Cloudflare Function

### Client Sites (Phase 2)
- Client auth via Cloudflare D1 + JWT sessions (coming)
- Questionnaire flow — multi-step form after quote is accepted (coming)
- Admin dashboard to view requests, track status, and send proposals (coming)
- Live comment system — verified visitors can leave public comments on client sites (coming)

### Visual & UX
- Dark navy color scheme (`#0a2540` → `#1a3a66`)
- Dual-row infinite CSS scroll testimonials — 8 cards per row, seamless loop
- Gradient hero section with CTA buttons
- Hover-to-pause on testimonials animation
- Font Awesome icons, Google Fonts (Montserrat heading, DM Sans body)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Astro 5 + Tailwind CSS |
| Deployment | Cloudflare Pages |
| API / Functions | Cloudflare Functions (TypeScript) |
| Notifications | Pushover API + Telegram Bot API |
| Auth *(coming)* | Cloudflare D1 + JWT sessions |
| Comments *(coming)* | Cloudflare D1 |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Cloudflare account (for deployment)
- Pushover account + app token
- Telegram bot token + chat ID

### Local Development (Windows)

```bash
# 1. Clone the repo
git clone https://github.com/trickdaddy24/minus-one-labs.git
cd minus-one-labs

# 2. Install dependencies
npm install

# 3. Create environment file
copy .env.example .env
# Edit .env with your credentials

# 4. Start dev server
npm run dev
# → http://localhost:4321
```

### Local Development (macOS / Linux)

```bash
git clone https://github.com/trickdaddy24/minus-one-labs.git
cd minus-one-labs
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Build for Production

```bash
npm run build
# Output in ./dist/
```

---

## Telegram Bot Setup

Admin notifications are sent to your Telegram on every contact form submission.

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Run `/newbot` — follow prompts, copy the **bot token**
3. Start a conversation with your new bot
4. Get your chat ID: visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and copy `chat.id`
5. Add both values to your `.env`:

```env
TELEGRAM_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

Test it — submit the contact form locally and you should receive a Telegram message within seconds.

---

## Environment Variables

Set these in your `.env` (local) and in Cloudflare Pages → Settings → Environment Variables (production).

| Variable | Required | Description |
|---|---|---|
| `PUSHOVER_TOKEN` | Yes | Pushover application API token |
| `PUSHOVER_USER` | Yes | Pushover user key |
| `TELEGRAM_TOKEN` | Yes | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Yes | Your Telegram chat ID (admin) |

---

## Project Structure

```
minus-one-labs/
├── public/                  # Static assets (favicon, images)
├── src/
│   ├── components/
│   │   ├── Navbar.astro     # Site navigation
│   │   ├── Hero.astro       # Hero section + CTA
│   │   ├── Services.astro   # 4-column services grid
│   │   ├── Portfolio.astro  # Portfolio / past work
│   │   ├── Testimonials.astro  # Dual-row infinite scroll testimonials
│   │   ├── Process.astro    # How it works steps
│   │   └── ContactForm.astro   # Lead capture form
│   ├── layouts/
│   │   └── Layout.astro     # Base HTML layout (fonts, meta, FA icons)
│   └── pages/
│       ├── index.astro      # Home page (assembles all components)
│       └── api/
│           └── contact.ts   # POST handler → Pushover + Telegram
├── astro.config.mjs         # Astro config (SSR + Cloudflare adapter)
├── tailwind.config.mjs      # Tailwind config (custom fonts)
├── package.json
└── .env                     # Local credentials (gitignored)
```

---

## Usage

### Running Locally

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Deploying to Cloudflare Pages

1. Push to GitHub (`main` branch)
2. Connect repo in Cloudflare Pages dashboard
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the 4 environment variables (see [Environment Variables](#environment-variables))
6. Deploy — Cloudflare auto-deploys on every push

### Updating Testimonials

Edit the `testimonials` array in `src/components/Testimonials.astro`. Each entry:

```js
{
  initials: 'MG',
  color: '#635bff',      // avatar background color
  name: 'Maria G.',
  business: "Maria's Bakery",
  stars: 5,
  quote: 'Quote text here.',
}
```

---

## Version History

| Version | Date | Notes |
|---|---|---|
| 1.0.0 | 2026-04-21 | Initial launch — marketing site with dual-row testimonials, contact form, Cloudflare Pages deploy |

---

## Roadmap

### Phase 1 — Marketing Site ✅
- [x] Hero, Services, Portfolio, Testimonials, Process, Contact sections
- [x] CSS infinite-scroll dual-row testimonials
- [x] Contact form → Pushover + Telegram + Resend email notifications
- [x] Cloudflare Turnstile bot protection on contact form
- [x] Cloudflare Pages deployment (SSR mode)
- [x] SEO: schema markup, meta tags, fast load times

### Phase 2 — Platform (Coming)
- [ ] Customer auth — login / register with Cloudflare D1 + JWT sessions
- [ ] Quote request flow — business submits info, admin gets notified, sends proposal
- [ ] Questionnaire — multi-step form after quote is accepted
- [ ] Admin dashboard — view requests, track status, mark as launched
- [ ] Live comment system — registered users comment on client sites
- [ ] Google review widget — pull and display live star ratings

---

## License

MIT © [Minus One Labs](https://github.com/trickdaddy24/minus-one-labs)
