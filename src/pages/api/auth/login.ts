import type { APIRoute } from 'astro';
import { generateToken, expiresAt, sessionCookie, hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;

  const { email, password } = await request.json() as { email: string; password: string };

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
  }

  // Look up user with a password set
  const user = await db.prepare(
    `SELECT id, email, role, password_hash FROM users WHERE email = ? AND password_hash IS NOT NULL`
  ).bind(email.toLowerCase().trim()).first() as { id: string; email: string; role: string; password_hash: string } | null;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
  }

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
  }

  // Create session
  const token = generateToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.prepare(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`
  ).bind(user.id, token, expires.toISOString()).run();

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Set-Cookie': sessionCookie(token, expires) },
  });
};
