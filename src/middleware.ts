import { defineMiddleware } from 'astro:middleware';
import { getSession, getClientIp } from './lib/auth';

const CUSTOMER_PROTECTED = ['/dashboard', '/questionnaire'];
const ADMIN_PROTECTED = ['/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const env = (context.locals as any).runtime?.env ?? {};
  const db = env.DB;

  const clientIp = getClientIp(context.request);
  (context.locals as any).clientIp = clientIp;

  // Check if IP is blocked
  if (db) {
    const blocked = await db.prepare(
      `SELECT id FROM blocked_ips WHERE ip = ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))`
    ).bind(clientIp).first();
    if (blocked && !pathname.startsWith('/access-denied')) {
      return context.redirect('/access-denied');
    }
  }

  const cookie = context.cookies.get('mol_session')?.value ?? null;
  const session = db ? await getSession(db, cookie) : null;
  (context.locals as any).session = session;

  // Log authenticated visitor
  if (session && db && !pathname.startsWith('/api') && !pathname.startsWith('/admin')) {
    const cf = (context.request as any).cf ?? {};
    db.prepare(
      `INSERT INTO visitor_logs (user_id, ip, country, city, user_agent, page)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      session.id,
      clientIp,
      cf.country ?? null,
      cf.city ?? null,
      context.request.headers.get('user-agent') ?? null,
      pathname
    ).run().catch(() => {});
  }

  const needsCustomer = CUSTOMER_PROTECTED.some(p => pathname.startsWith(p));
  const needsAdmin = ADMIN_PROTECTED.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/setup');

  if (needsCustomer && !session) {
    return context.redirect('/login?next=' + encodeURIComponent(pathname));
  }
  if (needsAdmin && (!session || session.role !== 'admin')) {
    return context.redirect('/admin/login');
  }

  return next();
});
