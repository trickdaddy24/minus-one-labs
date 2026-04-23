import type { APIRoute } from 'astro';
import { clearCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const token = cookies.get('mol_session')?.value;
  if (db && token) {
    await db.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
  }
  return new Response(null, {
    status: 302,
    headers: { Location: '/', 'Set-Cookie': clearCookie() },
  });
};
