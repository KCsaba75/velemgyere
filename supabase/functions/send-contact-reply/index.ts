// Velemgyere admin reply to a contact_messages row -- kanban 6f9ad755 (Csaba
// bovites, msg 3189): "Uzenetek" panel az admin Beallitasok alatt, kinyithato
// reszlettel olvasashoz+valaszolashoz.
//
// Called directly from the admin UI (supabase.functions.invoke), NOT via a
// pg_net trigger -- this is a synchronous admin action, not a reaction to a
// DB write. verify_jwt stays at its default (true): Supabase's gateway
// rejects a request with no/invalid JWT before this code ever runs.
//
// Deliberately does NOT re-implement an admin role check -- it forwards the
// CALLER's own JWT (not the service-role key) to every contact_messages
// read/write below, so the existing RLS policies (is_admin()) are the single
// source of truth for who may read/update a message. A non-admin caller's
// request will see 0 matching rows and get a clean 404, with no risk of the
// in-function check drifting out of sync with the real RLS policy.
//
// The email send itself needs the service-role key only to read SUPABASE_URL
// (shared with send-booking-email) -- Resend has no concept of Supabase roles.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

// Browserbol hivjuk (supabase.functions.invoke()), ami CORS-preflight OPTIONS
// kerest kuld -- enelkul a kulonben jol mukodo POST valaszat is elutasitja a
// bongeszo (lasd request-password-reset/index.ts ugyanerre a buktatora, 2026-10-25).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type RequestBody = {
  messageId: string;
  replyText: string;
};

async function dbQuery<T>(path: string, callerAuthHeader: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: callerAuthHeader,
    },
  });
  if (!res.ok) {
    throw new Error(`DB query failed (${res.status}) for ${path}: ${await res.text()}`);
  }
  return res.json();
}

async function dbUpdate(path: string, body: Record<string, unknown>, callerAuthHeader: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: callerAuthHeader,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DB update failed (${res.status}) for ${path}: ${await res.text()}`);
  }
  return res.json();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderReplyEmail(originalMessage: string, replyText: string): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding-bottom:24px;">
          <img src="https://velemgyere.hu/brand/velemgyere-logo-wide-v2.jpg" alt="Velem Gyere" width="200" style="display:block; width:200px; max-width:70%; height:auto; border:0;" />
        </td></tr>
        <tr><td style="background-color:#ffffff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(16,24,20,0.08);">
          <p style="font-size:14px; color:#44403c; line-height:1.6; margin:0 0 20px 0; white-space:pre-wrap;">${escapeHtml(replyText)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px; border-top:1px solid #e7e5e4; padding-top:16px;">
            <tr><td style="font-size:12px; color:#78716c;">
              <strong>A te üzeneted:</strong><br/>
              <span style="white-space:pre-wrap;">${escapeHtml(originalMessage)}</span>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:16px; font-size:11px; color:#a8a29e;">
          Velem Gyere -- velemgyere.hu
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendViaResend(to: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Velem Gyere <info@velemgyere.hu>',
      to: [to],
      subject: 'Válasz az üzenetedre -- Velem Gyere',
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'missing Authorization header' }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  if (!body.messageId || !body.replyText?.trim()) {
    return jsonResponse({ error: 'messageId and replyText are required' }, 400);
  }

  try {
    const rows = await dbQuery<any[]>(
      `contact_messages?id=eq.${body.messageId}&select=id,email,message`,
      authHeader,
    );
    const row = rows[0];
    if (!row) {
      // Either the id doesn't exist, or the caller isn't admin and RLS hid it
      // -- same response either way, no information leak about which.
      return jsonResponse({ error: 'message not found' }, 404);
    }

    await sendViaResend(row.email, renderReplyEmail(row.message, body.replyText.trim()));

    await dbUpdate(
      `contact_messages?id=eq.${body.messageId}`,
      { admin_reply: body.replyText.trim(), replied_at: new Date().toISOString(), status: 'resolved' },
      authHeader,
    );

    return jsonResponse({ sent: true }, 200);
  } catch (err) {
    console.error('send-contact-reply error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
