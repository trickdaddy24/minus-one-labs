import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';

const CUSTOMER_PROTECTED = ['/dashboard', '/questionnaire'];
const ADMIN_PROTECTED = ['/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const db = (context.locals as any).runtime?.env?.DB;
  const cookie = context.cookies.get('mol_session')?.value ?? null;

  const session = db ? await getSession(db, cookie) : null;
  (context.locals as any).session = session;

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
