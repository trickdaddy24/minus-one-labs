import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const env = (locals as any).runtime?.env ?? {};
  const session = (locals as any).session;

  if (!session || session.role !== 'user') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { quote_id, reason } = await request.json() as { quote_id: string; reason?: string };
  if (!quote_id) {
    return new Response(JSON.stringify({ error: 'Missing quote_id' }), { status: 400 });
  }

  // Verify quote belongs to this user and is in proposal_sent state
  const quote = await db.prepare(
    `SELECT * FROM quotes WHERE id = ? AND email = ? AND status = 'proposal_sent'`
  ).bind(quote_id, session.email).first() as any;

  if (!quote) {
    return new Response(JSON.stringify({ error: 'Quote not found or not eligible for rejection' }), { status: 404 });
  }

  // Mark as rejected, store reason in admin_note if provided
  await db.prepare(
    `UPDATE quotes SET status = 'proposal_rejected', updated_at = datetime('now') WHERE id = ?`
  ).bind(quote_id).run();

  // Notify admin
  const text = [
    '❌ Proposal Rejected',
    `Client: ${quote.name} (${quote.email})`,
    quote.company ? `Company: ${quote.company}` : null,
    quote.price_tier ? `Plan was: ${quote.price_tier}` : null,
    reason ? `Reason: ${reason}` : null,
    'Update the proposal and resend from the admin dashboard.',
  ].filter(Boolean).join('\n');

  const notifs: Promise<any>[] = [];

  if (env.PUSHOVER_TOKEN && env.PUSHOVER_USER) {
    const form = new FormData();
    form.append('token', env.PUSHOVER_TOKEN);
    form.append('user', env.PUSHOVER_USER);
    form.append('title', 'Proposal Rejected — Minus One Labs');
    form.append('message', text);
    notifs.push(fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body: form }));
  }

  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    notifs.push(
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
      })
    );
  }

  await Promise.all(notifs);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
