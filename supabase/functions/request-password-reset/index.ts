// Velemgyere jelszo-reset keres -- kanban af2a6460.
//
// A frontend hivja (AppContext.requestPasswordReset), amikor a felhasznalo az
// "Elfelejtett jelszo?" urlapot kuldi be. A tenyleges rate-limit (max 3/ora) + user-lookup +
// token-generalas a public.create_password_reset_token() SECURITY DEFINER SQL fuggvenyben
// tortenik (csak service_role hivhatja) -- ez a fuggveny csak akkor kuld emailt, ha az
// visszaad egy nyers tokent, es MINDIG ugyanazt a biztonsagos, fiok-letezest nem
// szivargato uzenetet adja vissza, fuggetlenul attol hogy rate-limitelve volt-e, nem
// letezik-e a fiok, vagy sikeres volt a token-keres.
//
// Ez a fuggetlen, sajat token-rendszer azert kell a Supabase natÍv resetPasswordForEmail()
// helyett, mert a GoTrue mailer_otp_exp / rate_limit_email_sent mezok MINDEN mailer-flow-ra
// (signup-confirm IS) egyetlen kozos erteket vonatkoznak -- ld. a migraciós fájl fejét.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://velemgyere.hu';

const GENERIC_MESSAGE = 'Ha létezik fiók ezzel az e-mail címmel, néhány percen belül kapsz egy e-mailt a jelszó visszaállításához.';

async function createResetToken(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_password_reset_token`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_email: email }),
  });
  if (!res.ok) {
    throw new Error(`create_password_reset_token failed (${res.status}): ${await res.text()}`);
  }
  const token = await res.json();
  return typeof token === 'string' ? token : null;
}

async function sendResetEmail(to: string, link: string): Promise<void> {
  const html = `
    <h2>Jelszó visszaállítása</h2>
    <p>Kérést kaptunk a Velem Gyere fiókod jelszavának visszaállítására.</p>
    <p><a href="${link}">Új jelszó beállítása</a></p>
    <p>Ez a link <strong>15 percig érvényes</strong>, és csak egyszer használható fel.</p>
    <p>Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt -- a jelszavad nem változik.</p>
  `;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Velemgyere <info@velemgyere.hu>',
      to: [to],
      subject: 'Jelszó visszaállítása -- Velem Gyere',
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Érvénytelen kérés.' }), { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ success: false, message: 'Érvénytelen e-mail cím.' }), { status: 400 });
  }

  try {
    const rawToken = await createResetToken(email);
    if (rawToken) {
      const link = `${SITE_URL}/jelszo-visszaallitas?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`;
      await sendResetEmail(email, link);
    }
    // Ugyanaz a valasz rate-limit, nincs-ilyen-fiok es sikeres-kuldes eseten is --
    // lasd a fuggveny fejenel levo indoklast.
    return new Response(JSON.stringify({ success: true, message: GENERIC_MESSAGE }), { status: 200 });
  } catch (err) {
    console.error('request-password-reset error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Hiba történt a kérés feldolgozása során.' }), { status: 500 });
  }
});
