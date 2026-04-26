import type { APIRoute } from 'astro';
import { hashPassword, verifyPassword, generateToken, expiresAt, sessionCookie,
         getClientIp, isLegacyHash, timingSafeStringEqual } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  const db = env.DB;
  const body = await request.json() as { username: string; password: string };
  const { username, password } = body;

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400 });
  }

  const clientIp = getClientIp(request);

  // Rate limit: 5 failed attempts per IP in 15 min
  const recent = await db.prepare(
    `SELECT COUNT(*) as cnt FROM login_attempts
     WHERE ip = ? AND success = 0 AND created_at > datetime('now', '-15 minutes')`
  ).bind(clientIp).first() as { cnt: number };
  if (recent.cnt >= 5) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Try again later.' }), { status: 429 });
  }

  // Super admin check (env-based, timing-safe comparison)
  const superUser = env.SUPER_ADMIN_USERNAME;
  const superPass = env.SUPER_ADMIN_PASSWORD;
  if (superUser && superPass &&
      timingSafeStringEqual(username, superUser) &&
      timingSafeStringEqual(password, superPass)) {
    return issueAdminSession(db, 'super@minus-one-labs.com', clientIp, username, true);
  }

  // Regular admin check
  const admin = await db.prepare(
    `SELECT * FROM admin_users WHERE username = ?`
  ).bind(username).first() as any;

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    await db.prepare(
      `INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, 0)`
    ).bind(clientIp, username).run().catch(() => {});
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  // Auto-upgrade legacy SHA-256 hash to PBKDF2
  if (isLegacyHash(admin.password_hash)) {
    const newHash = await hashPassword(password);
    await db.prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`)
      .bind(newHash, admin.id).run().catch(() => {});
  }

  return issueAdminSession(db, admin.username + '@admin', clientIp, username, false);
};

async function issueAdminSession(db: any, email: string, clientIp: string, username: string, isSuperAdmin: boolean) {
  await db.prepare(
    `INSERT INTO users (email, role) VALUES (?, 'admin') ON CONFLICT(email) DO NOTHING`
  ).bind(email).run();

  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first();
  const token = generateToken();
  const expires = expiresAt(60 * 8); // 8 hours
  const expiresDate = new Date(Date.now() + 60 * 8 * 60 * 1000);

  await db.prepare(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`
  ).bind(user.id, token, expires).run();

  if (!isSuperAdmin) {
    await db.prepare(
      `UPDATE login_attempts SET success = 1 WHERE ip = ? AND email = ? AND success = 0`
    ).bind(clientIp, username).run().catch(() => {});
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Set-Cookie': sessionCookie(token, expiresDate) },
  });
}
