// Public contact form submission for Velemgyere.
// Stores the message for the admin inbox and sends an email notification via Resend.
// The function is intentionally callable by anonymous visitors; validate and constrain
// every field here because browser-side validation is not a security boundary.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAIL = 'info@velemgyere.hu';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sendNotification(name: string, email: string, message: string): Promise<void> {
  const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f5f5f4;font-family:Arial,sans-serif;padding:32px 16px;color:#292524">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;padding:30px;border:1px solid #e7e5e4">
      <div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#047857;text-transform:uppercase">VELEMGYERE · ÚJ KAPCSOLATI ÜZENET</div>
      <h1 style="font-size:24px;margin:14px 0 24px">Új üzenet érkezett a weboldalról</h1>
      <p><strong>Név:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-mail:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#047857">${escapeHtml(email)}</a></p>
      <div style="margin-top:22px;padding:18px;background:#f5f5f4;border-radius:12px;white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</div>
      <p style="font-size:12px;color:#78716c;margin-top:24px">A felhasználó üzenete a Velemgyere admin felületén is elérhető.</p>
    </div>
  </body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Velemgyere <info@velemgyere.hu>',
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject: `Új kapcsolati üzenet – ${name}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  let body: { name?: string; email?: string; message?: string; userId?: string | null; website?: string };
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Érvénytelen kérés.' }, 400); }

  // Honeypot: bots that fill the hidden field receive a generic success response.
  if (body.website) return jsonResponse({ sent: true });

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || message.length < 5 || message.length > 5000) {
    return jsonResponse({ error: 'Kérjük, ellenőrizd a megadott adatokat.' }, 400);
  }

  try {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: body.userId || null,
        name,
        email,
        message,
        status: 'new',
      }),
    });
    if (!insertRes.ok) throw new Error(`Contact message insert failed (${insertRes.status}): ${await insertRes.text()}`);

    await sendNotification(name, email, message);
    return jsonResponse({ sent: true });
  } catch (error) {
    console.error('submit-contact-message error:', error);
    return jsonResponse({ error: 'Az üzenet mentése vagy az e-mail értesítés nem sikerült. Kérjük, próbáld újra később.' }, 500);
  }
});
