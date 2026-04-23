import type { APIRoute } from 'astro';
import { hashPassword, verifyPassword, generateToken, expiresAt, sessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  const db = env.DB;
  const body = await request.json() as { username: string; password: string };
  const { username, password } = body;

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400 });
  }

  // Super admin check (env-based, no DB)
  const superUser = env.SUPER_ADMIN_USERNAME;
  const superPass = env.SUPER_ADMIN_PASSWORD;
  if (superUser && superPass && username === superUser && password === superPass) {
    return issueAdminSession(db, 'super@minus-one-labs.com');
  }

  // Regular admin check
  const admin = await db.prepare(
    `SELECT * FROM admin_users WHERE username = ?`
  ).bind(username).first();

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  return issueAdminSession(db, admin.username + '@admin');
};

async function issueAdminSession(db: any, email: string) {
  // Upsert admin user record
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

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Set-Cookie': sessionCookie(token, expiresDate) },
  });
}
