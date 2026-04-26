export function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown';
}

export function generateToken(length = 48): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function expiresAt(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

// ── PBKDF2 password hashing ──────────────────────────────────────────────────

async function _pbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
  const hash = await _pbkdf2(password, salt);
  return `pbkdf2:${saltHex}:${hash}`;
}

export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith('pbkdf2:');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2:')) {
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const expected = await _pbkdf2(password, salt);
    if (expected.length !== hashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hashHex.charCodeAt(i);
    return diff === 0;
  }
  // Legacy SHA-256 path — still accepted, auto-upgraded on next login
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  const legacyHash = Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  return legacyHash === stored;
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function getSession(db: any, cookie: string | null) {
  if (!cookie) return null;
  const row = await db.prepare(
    `SELECT s.*, u.email, u.role, u.name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(cookie).first();
  return row ?? null;
}

export function sessionCookie(token: string, expires: Date): string {
  return `mol_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function clearCookie(): string {
  return `mol_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
