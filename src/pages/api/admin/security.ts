import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') return new Response('Unauthorized', { status: 401 });

  const body = await request.json() as { action: string; ip?: string; reason?: string; key?: string; value?: string };

  if (body.action === 'block_ip') {
    await db.prepare(
      `INSERT INTO blocked_ips (ip, reason) VALUES (?, ?) ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, blocked_at = datetime('now')`
    ).bind(body.ip, body.reason ?? 'Manual block').run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (body.action === 'unblock_ip') {
    await db.prepare(`DELETE FROM blocked_ips WHERE ip = ?`).bind(body.ip).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (body.action === 'update_setting') {
    await db.prepare(
      `INSERT INTO site_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(body.key, body.value).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};
