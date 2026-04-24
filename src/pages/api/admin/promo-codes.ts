import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') return new Response('Unauthorized', { status: 401 });

  const { results } = await db.prepare(
    `SELECT * FROM promo_codes ORDER BY created_at DESC`
  ).all();
  return new Response(JSON.stringify(results), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') return new Response('Unauthorized', { status: 401 });

  const body = await request.json() as {
    code: string; discount_pct: number; max_uses?: number; expires_at?: string;
  };

  if (!body.code || !body.discount_pct) {
    return new Response(JSON.stringify({ error: 'Code and discount required' }), { status: 400 });
  }

  await db.prepare(
    `INSERT INTO promo_codes (code, discount_pct, max_uses, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(
    body.code.toUpperCase().trim(),
    body.discount_pct,
    body.max_uses ?? null,
    body.expires_at ?? null
  ).run();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') return new Response('Unauthorized', { status: 401 });

  const { id, active } = await request.json() as { id: string; active: boolean };
  await db.prepare(`UPDATE promo_codes SET active = ? WHERE id = ?`).bind(active ? 1 : 0, id).run();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') return new Response('Unauthorized', { status: 401 });

  const { id } = await request.json() as { id: string };
  await db.prepare(`DELETE FROM promo_codes WHERE id = ?`).bind(id).run();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
