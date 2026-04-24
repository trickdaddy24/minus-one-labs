-- Proposal content and price tier on quotes
ALTER TABLE quotes ADD COLUMN proposal_text TEXT;
ALTER TABLE quotes ADD COLUMN price_tier TEXT;

-- Password and display preference on users
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN display_mode TEXT;

-- Site-wide default display mode
INSERT INTO site_settings (key, value) VALUES ('default_display_mode', 'dark') ON CONFLICT(key) DO NOTHING;
