# Changelog

All notable changes to Minus One Labs are documented here.

---

## [2.1.0] — 2026-04-26

### Security

- **Password hashing** — replaced SHA-256 with PBKDF2 (100,000 iterations, random salt per hash) via Web Crypto API. No npm dependencies added. Existing passwords auto-upgrade to PBKDF2 on next successful login with no forced reset.
- **Admin login rate limiting** — `/api/admin/login` now enforces 5 failed attempts per IP per 15 minutes (same as magic link flow). Failed attempts logged to `login_attempts` table.
- **Timing-safe super admin compare** — `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` env var comparison now uses constant-time string equality to prevent timing attacks.
- **XSS fix — contact email** — all user-supplied fields (name, email, company, message) HTML-escaped before insertion into Resend email body.
- **XSS fix — quote status emails** — proposal text and admin note HTML-escaped in `buildEmailHtml()`.
- **Magic link IP fix** — requesting IP stored as `NULL` (not `'unknown'`) when CF-Connecting-IP is unavailable, eliminating the silent IP-restriction bypass on verify.
- **Removed duplicate `hashPassword`** — `api/user/account.ts` was duplicating the SHA-256 hash function; now imports from `lib/auth`.

---

## [2.0.0] — 2026-04-23

### Major Release — Platform Phase 2

This release transforms Minus One Labs from a static marketing page into a full small business SaaS platform with customer auth, quote management, admin dashboard, and security infrastructure.

### Added — Auth System
- Magic link authentication for customers (email only, no password)
- IP-locked magic links — link only works on the same device/network it was requested from
- 7-day session cookies (HttpOnly, Secure, SameSite=Lax)
- Inactivity auto-logout after 30 minutes of idle time
- `/login` page — enter email, receive magic link via Resend
- `/api/auth/verify` — validates token, creates session, redirects to dashboard
- `/api/auth/logout` — clears session from DB and cookie
- Rate limiting: 5 failed magic link requests per IP per 15 min → blocked

### Added — Customer Dashboard
- `/dashboard` — authenticated view showing all quotes for that email
- Status badges: Pending / Proposal Sent / Accepted / Launched
- Admin notes visible to client per quote
- Questionnaire CTA unlocks automatically when quote is marked `accepted`

### Added — Questionnaire
- `/questionnaire?quote_id=...` — 5-question form unlocked after quote acceptance
- Questions: photos, company history, contact methods, domain preference, other requests
- Saves to D1, prevents duplicate submissions, shows confirmation on re-visit

### Added — Admin Dashboard (`/admin`)
- Separate login URL not linked from public site
- Super admin via env vars (`SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD`)
- First-run setup wizard at `/admin/setup` to create a regular admin account
- Password visibility toggle on all admin login/setup pages
- Stats bar: Total / Pending / Accepted / Launched counts
- Full quote list with questionnaire answers inline
- Status buttons with **confirm modal** to prevent accidental emails
- Admin note textarea per quote (sent to client with status change)
- **🔗 Send Login Link** button — invalidates old magic links, sends fresh one to client

### Added — Admin Security Dashboard (`/admin/security`)
- Tabbed interface: Settings · Promo Codes · Blocked IPs · Visitor Logs · Login Attempts
- Configurable settings: rate limit threshold, window, inactivity timeout, registration toggle
- Promo code management: create with % discount, max uses, expiry; enable/disable/delete
- IP blocking: manual block/unblock + auto-block from rate limiting
- Visitor logs with Cloudflare geo data (country, city) — no external API required
- Login attempt history (IP, email, success/fail, timestamp)
- Access denied page for blocked IPs

### Added — Public Pages
- `/about` — company story, mission, who we serve, values
- `/blog` — 6 placeholder articles with tags, ready to expand
- `/support` — accordion FAQ with 6 questions answered
- `/access-denied` — shown to blocked IPs with no site access

### Added — Navbar
- Full navigation: Home · Pricing · Blog · About · Support · Sign In
- Shows "My Dashboard" when customer is logged in
- Mobile hamburger menu
- "Start Your Project" CTA button

### Added — Pricing Section
- 3-tier pricing on home page (`/#pricing`):
  - **Basic** — $500 (one-time)
  - **Standard** — $1,500 (one-time, most popular)
  - **Premium** — $3,000 (one-time, full white-glove)
- Feature lists, highlighted middle tier, custom inquiry CTA

### Added — Promo Codes
- Client types promo code in contact form — live validation shows discount %
- `/api/promo/validate` — checks active, not expired, under max uses
- Used codes auto-increment usage counter

### Added — Notifications
- Resend email on every contact form submission (HTML formatted, reply-to client)
- Pushover + Telegram still fire alongside email
- Cloudflare Turnstile bot protection on contact form (dark theme, managed mode)

### Added — Database (Cloudflare D1)
- 9 tables: `users`, `sessions`, `magic_links`, `admin_users`, `quotes`, `questionnaires`, `promo_codes`, `login_attempts`, `blocked_ips`, `visitor_logs`, `site_settings`
- All migrations in `/migrations/`

### Fixed
- Contact form secrets now read from `locals.runtime.env` (not `import.meta.env`)
- Magic link URL corrected to `/api/auth/verify` (was pointing to display page)
- verify.ts: `request` was missing from destructured params — caused 500 on every link click
- "All of the above" checkbox now correctly checks/unchecks all sibling options

---

## [1.0.0] — 2026-04-21

### Initial Launch — Marketing Site

- One-page marketing site: Hero, Services, Portfolio, Dual-row Testimonials, Process, Contact
- Dual-row infinite CSS scroll testimonials (hover-to-pause, 8 cards per row)
- Contact form → Pushover + Telegram admin notifications
- Cloudflare Pages deployment (SSR mode with `@astrojs/cloudflare` adapter)
- SEO: schema markup, meta tags, local search optimization
- Cloudflare Turnstile bot protection
- Full README with login-x style documentation structure
