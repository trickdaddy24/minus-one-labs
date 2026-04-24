import type { APIRoute } from 'astro';
import { generateToken, expiresAt, sessionCookie, getClientIp } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, locals, request }) => {
  const db = (locals as any).runtime?.env?.DB;
  const token = url.searchParams.get('token');

  if (!token || !db) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=invalid' } });
  }

  const clientIp = getClientIp(request);

  const link = await db.prepare(
    `SELECT * FROM magic_links WHERE token = ? AND expires_at > datetime('now') AND used = 0`
  ).bind(token).first() as any;

  if (!link) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=expired' } });
  }

  // IP restriction — must match requesting IP
  if (link.requesting_ip && link.requesting_ip !== 'unknown' && link.requesting_ip !== clientIp) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=ip_mismatch' } });
  }

  // Mark link used and log success
  await db.prepare(`UPDATE magic_links SET used = 1 WHERE id = ?`).bind(link.id).run();
  await db.prepare(
    `UPDATE login_attempts SET success = 1 WHERE ip = ? AND email = ? AND success = 0`
  ).bind(clientIp, link.email).run().catch(() => {});

  // Ensure user exists
  await db.prepare(`INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`).bind(link.email).run();
  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(link.email).first() as any;

  if (!user) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=invalid' } });
  }

  const sessionToken = generateToken();
  const expires = expiresAt(60 * 24 * 7); // 7 days
  const expiresDate = new Date(Date.now() + 60 * 24 * 7 * 60 * 1000);

  await db.prepare(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`
  ).bind(user.id, sessionToken, expires).run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/dashboard',
      'Set-Cookie': sessionCookie(sessionToken, expiresDate),
    },
  });
};
