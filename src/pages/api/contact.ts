import type { APIRoute } from 'astro';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const data = await request.formData();

  const name    = data.get('name')?.toString().trim() ?? '';
  const email   = data.get('email')?.toString().trim() ?? '';
  const company = data.get('company')?.toString().trim() ?? '';
  const message = data.get('message')?.toString().trim() ?? '';
  const needs   = data.getAll('needs').join(', ');

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check registration_open setting
  const db = (locals as any).runtime?.env?.DB;
  if (db) {
    const setting = await db.prepare(
      `SELECT value FROM site_settings WHERE key = 'registration_open'`
    ).first() as { value: string } | null;
    if (setting && setting.value === '0') {
      return new Response(JSON.stringify({ error: 'We are not accepting new inquiries at this time. Please check back soon.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const text = [
    '🧪 New Minus One Labs Inquiry',
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    needs ? `Needs: ${needs}` : null,
    `Message: ${message}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Access secrets from Cloudflare runtime (not import.meta.env which is build-time only)
  const runtime = (locals as any).runtime;
  const env = runtime?.env ?? {};
  const pushoverToken  = env.PUSHOVER_TOKEN;
  const pushoverUser   = env.PUSHOVER_USER;
  const telegramToken  = env.TELEGRAM_TOKEN;
  const telegramChatId = env.TELEGRAM_CHAT_ID;
  const resendApiKey      = env.RESEND_API_KEY;
  const turnstileSecret   = env.TURNSTILE_SECRET;

  // Verify Turnstile token
  const turnstileToken = data.get('cf-turnstile-response')?.toString() ?? '';
  if (turnstileSecret) {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
    });
    const result = await verify.json() as { success: boolean };
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Bot verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const sends: Promise<Response>[] = [];

  if (pushoverToken && pushoverUser) {
    const form = new FormData();
    form.append('token', pushoverToken);
    form.append('user', pushoverUser);
    form.append('title', 'New Lead — Minus One Labs');
    form.append('message', text);
    sends.push(
      fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body: form })
    );
  }

  if (telegramToken && telegramChatId) {
    sends.push(
      fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      })
    );
  }

  if (resendApiKey) {
    const htmlBody = `
      <h2>New Minus One Labs Inquiry</h2>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      ${company ? `<p><strong>Company:</strong> ${esc(company)}</p>` : ''}
      ${needs ? `<p><strong>Needs:</strong> ${esc(needs)}</p>` : ''}
      <p><strong>Message:</strong><br>${esc(message).replace(/\n/g, '<br>')}</p>
    `;
    sends.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Minus One Labs <noreply@minus-one-labs.com>',
          to: 'admin@stunna.xyz',
          reply_to: email,
          subject: `New Inquiry from ${name}`,
          html: htmlBody,
        }),
      })
    );
  }

  // Save quote to D1
  if (db) {
    await db.prepare(
      `INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`
    ).bind(email).run();
    const user = await db.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first() as { id: string } | null;
    await db.prepare(
      `INSERT INTO quotes (user_id, name, email, company, needs, message) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user?.id ?? null, name, email, company || null, needs || null, message).run();
  }

  try {
    await Promise.all(sends);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Notification error:', err);
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
