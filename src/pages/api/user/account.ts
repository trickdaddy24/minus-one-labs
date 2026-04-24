import type { APIRoute } from 'astro';

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime?.env?.DB;
  const session = (locals as any).session;
  if (!session || !['user', 'customer'].includes(session.role)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json() as {
    display_mode?: 'dark' | 'light';
    new_password?: string;
  };

  const updates: string[] = [];
  const binds: any[] = [];

  if (body.display_mode) {
    updates.push('display_mode = ?');
    binds.push(body.display_mode);
  }

  if (body.new_password) {
    if (body.new_password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400 });
    }
    updates.push('password_hash = ?');
    binds.push(await hashPassword(body.new_password));
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'Nothing to update' }), { status: 400 });
  }

  binds.push(session.user_id);
  await db.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
