import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { results } = await db.prepare(
    `SELECT q.*, qn.submitted_at as questionnaire_submitted
     FROM quotes q
     LEFT JOIN questionnaires qn ON qn.quote_id = q.id
     ORDER BY q.created_at DESC`
  ).all();
  return new Response(JSON.stringify(results), { status: 200 });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await request.json() as { id: string; status: string; admin_note?: string };
  await db.prepare(
    `UPDATE quotes SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(body.status, body.admin_note ?? null, body.id).run();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
