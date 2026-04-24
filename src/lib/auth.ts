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

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
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
