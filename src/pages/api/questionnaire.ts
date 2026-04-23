import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json() as {
    quote_id: string;
    has_photos: string;
    company_history: string;
    contact_methods: string;
    preferred_domain: string;
    other_requests: string;
  };

  // Verify this quote belongs to the session user and is accepted
  const quote = await db.prepare(
    `SELECT * FROM quotes WHERE id = ? AND email = ? AND status = 'accepted'`
  ).bind(body.quote_id, session.email).first();

  if (!quote) {
    return new Response(JSON.stringify({ error: 'Quote not found or not accepted' }), { status: 403 });
  }

  await db.prepare(
    `INSERT INTO questionnaires (quote_id, has_photos, company_history, contact_methods, preferred_domain, other_requests)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(quote_id) DO UPDATE SET
       has_photos = excluded.has_photos,
       company_history = excluded.company_history,
       contact_methods = excluded.contact_methods,
       preferred_domain = excluded.preferred_domain,
       other_requests = excluded.other_requests,
       submitted_at = datetime('now')`
  ).bind(
    body.quote_id, body.has_photos, body.company_history,
    body.contact_methods, body.preferred_domain, body.other_requests
  ).run();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
