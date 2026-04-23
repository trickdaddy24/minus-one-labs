import type { APIRoute } from 'astro';
import { generateToken, expiresAt } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  const db = env.DB;
  const resendKey = env.RESEND_API_KEY;

  const body = await request.json() as { email: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
  }

  // Upsert user
  await db.prepare(
    `INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`
  ).bind(email).run();

  const token = generateToken();
  const expires = expiresAt(15);

  await db.prepare(
    `INSERT INTO magic_links (email, token, expires_at) VALUES (?, ?, ?)`
  ).bind(email, token, expires).run();

  const link = `https://minus-one-labs.com/api/auth/verify?token=${token}`;

  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Minus One Labs <noreply@minus-one-labs.com>',
        to: email,
        subject: 'Your login link — Minus One Labs',
        html: `
          <h2>Sign in to Minus One Labs</h2>
          <p>Click the link below to log in. It expires in 15 minutes.</p>
          <p><a href="${link}" style="background:#635bff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign In</a></p>
          <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
        `,
      }),
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
