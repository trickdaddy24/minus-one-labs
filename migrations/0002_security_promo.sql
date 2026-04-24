-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT UNIQUE NOT NULL,
  discount_pct INTEGER NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  active INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Login attempt tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ip TEXT NOT NULL,
  email TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Blocked IPs
CREATE TABLE IF NOT EXISTS blocked_ips (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ip TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Visitor logs
CREATE TABLE IF NOT EXISTS visitor_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  page TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site settings
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Add IP column to magic_links
ALTER TABLE magic_links ADD COLUMN requesting_ip TEXT;

-- Default settings
INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('rate_limit_attempts', '5'),
  ('rate_limit_window_minutes', '15'),
  ('inactivity_timeout_minutes', '30'),
  ('registration_open', '1');
