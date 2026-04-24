import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const { code } = await request.json() as { code: string };

  if (!code || !db) return new Response(JSON.stringify({ valid: false }), { status: 200 });

  const promo = await db.prepare(
    `SELECT * FROM promo_codes
     WHERE code = ? AND active = 1
     AND (max_uses IS NULL OR uses < max_uses)
     AND (expires_at IS NULL OR expires_at > datetime('now'))`
  ).bind(code.toUpperCase().trim()).first() as any;

  if (!promo) return new Response(JSON.stringify({ valid: false, error: 'Invalid or expired code' }), { status: 200 });

  return new Response(JSON.stringify({ valid: true, discount_pct: promo.discount_pct, code: promo.code }), { status: 200 });
};
