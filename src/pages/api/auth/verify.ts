import type { APIRoute } from 'astro';
import { generateToken, expiresAt, sessionCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const token = url.searchParams.get('token');

  if (!token || !db) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=invalid' } });
  }

  const link = await db.prepare(
    `SELECT * FROM magic_links WHERE token = ? AND expires_at > datetime('now') AND used = 0`
  ).bind(token).first();

  if (!link) {
    return new Response(null, { status: 302, headers: { Location: '/login?error=expired' } });
  }

  await db.prepare(`UPDATE magic_links SET used = 1 WHERE id = ?`).bind(link.id).run();

  const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(link.email).first();

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
