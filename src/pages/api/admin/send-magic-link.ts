import type { APIRoute } from 'astro';
import { generateToken, expiresAt } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  const db = env.DB;
  const session = (locals as any).session;

  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { email } = await request.json() as { email: string };
  if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });

  // Invalidate all existing unused links for this email
  await db.prepare(`UPDATE magic_links SET used = 1 WHERE email = ? AND used = 0`).bind(email).run();

  // Upsert user
  await db.prepare(`INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`).bind(email).run();

  const token = generateToken();
  const expires = expiresAt(60); // 1 hour for admin-sent links
  await db.prepare(`INSERT INTO magic_links (email, token, expires_at) VALUES (?, ?, ?)`)
    .bind(email, token, expires).run();

  const link = `https://minus-one-labs.com/api/auth/verify?token=${token}`;

  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Minus One Labs <noreply@minus-one-labs.com>',
        to: email,
        subject: 'Your login link — Minus One Labs',
        html: `
          <h2>Sign in to Minus One Labs</h2>
          <p>Click the link below to access your dashboard. It expires in 1 hour.</p>
          <p><a href="${link}" style="background:#635bff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Access My Dashboard</a></p>
          <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
        `,
      }),
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
