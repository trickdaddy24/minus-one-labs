import type { APIRoute } from 'astro';

const SITE = 'https://minus-one-labs.com';

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic — $500',
  standard: 'Standard — $1,500',
  premium: 'Premium — $3,000',
};

function buildEmailHtml(opts: {
  name: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  note?: string;
  proposal?: string;
  tier?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060f1a;font-family:'DM Sans',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060f1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0f1f35;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0a2540,#1a3a66);padding:32px 40px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">Minus One Labs</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">Your business. Online in 14 days.</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">${opts.heading}</h2>
          <p style="margin:0 0 12px;color:#94a3b8;font-size:15px;line-height:1.6;">Hi ${opts.name},</p>
          <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.6;">${opts.body}</p>
          ${opts.tier ? `<div style="background:#635bff22;border:1px solid #635bff44;border-radius:10px;padding:12px 20px;margin-bottom:24px;"><span style="color:#a5a0ff;font-size:13px;font-weight:600;">Selected Plan: ${TIER_LABELS[opts.tier] ?? opts.tier}</span></div>` : ''}
          ${opts.proposal ? `<div style="background:#060f1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:20px;margin-bottom:24px;"><strong style="color:#e2e8f0;font-size:14px;display:block;margin-bottom:10px;">Your Proposal:</strong><div style="color:#94a3b8;font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.proposal}</div></div>` : ''}
          ${opts.note ? `<div style="background:#060f1a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px 20px;margin-bottom:24px;color:#94a3b8;font-size:14px;line-height:1.5;"><strong style="color:#e2e8f0;">Note from our team:</strong><br>${opts.note}</div>` : ''}
          ${opts.cta ? `<a href="${opts.cta.url}" style="display:inline-block;background:#635bff;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">${opts.cta.label}</a>` : ''}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0;color:#475569;font-size:13px;">Questions? Reply to this email or visit <a href="${SITE}" style="color:#635bff;">${SITE}</a></p>
          <p style="margin:8px 0 0;color:#334155;font-size:12px;">© 2026 Minus One Labs · All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendStatusEmail(opts: {
  resendApiKey: string;
  to: string;
  name: string;
  status: string;
  adminNote?: string;
  proposalText?: string;
  priceTier?: string;
}) {
  const { to, name, status, adminNote, proposalText, priceTier, resendApiKey } = opts;

  const configs: Record<string, { subject: string; heading: string; body: string; cta?: { label: string; url: string } }> = {
    proposal_sent: {
      subject: 'Your Minus One Labs Proposal Is Ready',
      heading: 'Your proposal is ready!',
      body: "Great news — we've reviewed your inquiry and put together a proposal for your project. Review the details below, then log in to your dashboard to accept or ask questions.",
      cta: { label: 'View My Dashboard', url: `${SITE}/login` },
    },
    accepted: {
      subject: 'Your Quote Is Accepted — Next Step: Questionnaire',
      heading: 'Welcome aboard!',
      body: "We're excited to get started on your website. The next step is to fill out a short questionnaire (about 10 minutes) so we can build exactly what you need. Click the button below to sign in and get started.",
      cta: { label: 'Fill Out Questionnaire', url: `${SITE}/login` },
    },
    launched: {
      subject: '🚀 Your Website Is Live!',
      heading: 'Your site is live!',
      body: "The moment you've been waiting for — your website is now live and ready for the world to see. Log in to your dashboard to find your site URL and next steps for promoting your new online presence.",
      cta: { label: 'View My Dashboard', url: `${SITE}/login` },
    },
  };

  const cfg = configs[status];
  if (!cfg) return;

  const html = buildEmailHtml({
    name,
    heading: cfg.heading,
    body: cfg.body,
    cta: cfg.cta,
    note: adminNote,
    proposal: status === 'proposal_sent' ? proposalText : undefined,
    tier: priceTier || undefined,
  });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Minus One Labs <noreply@minus-one-labs.com>',
      to,
      subject: cfg.subject,
      html,
    }),
  });
}

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
  const env = (locals as any).runtime?.env ?? {};
  const session = (locals as any).session;
  if (!session || session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await request.json() as {
    id: string;
    status?: string;
    admin_note?: string;
    proposal_text?: string;
    price_tier?: string;
  };

  // Save proposal text / tier independently (no status change required)
  if (body.proposal_text !== undefined || body.price_tier !== undefined) {
    await db.prepare(
      `UPDATE quotes SET
        proposal_text = COALESCE(?, proposal_text),
        price_tier = COALESCE(?, price_tier),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(body.proposal_text ?? null, body.price_tier ?? null, body.id).run();
  }

  // Update status + admin note if provided
  if (body.status !== undefined) {
    await db.prepare(
      `UPDATE quotes SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(body.status, body.admin_note ?? null, body.id).run();

    // Send status-change email to client for key milestones
    const resendApiKey = env.RESEND_API_KEY;
    if (resendApiKey && ['proposal_sent', 'accepted', 'launched'].includes(body.status)) {
      const quote = await db.prepare(
        `SELECT name, email, proposal_text, price_tier FROM quotes WHERE id = ?`
      ).bind(body.id).first() as { name: string; email: string; proposal_text?: string; price_tier?: string } | null;

      if (quote?.email) {
        await sendStatusEmail({
          resendApiKey,
          to: quote.email,
          name: quote.name || 'there',
          status: body.status,
          adminNote: body.admin_note || undefined,
          proposalText: quote.proposal_text || undefined,
          priceTier: quote.price_tier || undefined,
        });
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
