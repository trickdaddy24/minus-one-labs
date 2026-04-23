import type { APIRoute } from 'astro';
import { hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const body = await request.json() as { username: string; password: string };
  const { username, password } = body;

  if (!username || !password || password.length < 8) {
    return new Response(JSON.stringify({ error: 'Username and password (8+ chars) required' }), { status: 400 });
  }

  const existing = await db.prepare(`SELECT id FROM admin_users LIMIT 1`).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Admin already exists' }), { status: 403 });
  }

  const hash = await hashPassword(password);
  await db.prepare(
    `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)`
  ).bind(username, hash).run();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
