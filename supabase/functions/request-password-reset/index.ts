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

// Csaba sajat tesztje (2026-10-25, Android Chrome, dev-preview-n) ebbe futott: a
// SITE_URL secret a PROD domainre mutat meg a dev sandbox projektben is, tehat a
// dev-preview-n kert reset-link egy olyan domainre vitte, ahol ez a route meg
// nincs fent (main 13 napja nem merge-elt, lasd 0ba671d7). A SITE_URL secretet
// NEM allitjuk at (azt a create_edge_function_secret csak emberi dashboard-
// beiras utjan tudja, es a prod SITE_URL-t ez szandekosan nem erintheti) --
// helyette a Resend-link celja a hivo oldal Origin fejlecebol jon, de CSAK ha az
// egy ismert, jovahagyott domain (allowlist), kulonben a SITE_URL marad az
// alapertelmezes. Ez zarja ki, hogy egy hamisitott Origin fejlec a reset-emailt
// (valodi, hitelesitett Resend-feladotol!) tetszoleges kulso domainre iranyitsa
// (host-header-injection-szeru jelszo-reset phishing).
const ALLOWED_LINK_ORIGINS = new Set([
  'https://velemgyere.hu',
  'https://www.velemgyere.hu',
  'https://velemgyere-git-dev-marveen.vercel.app',
]);

function resolveSiteUrl(req: Request): string {
  const origin = req.headers.get('origin');
  return origin && ALLOWED_LINK_ORIGINS.has(origin) ? origin : SITE_URL;
}

const GENERIC_MESSAGE = 'Ha létezik fiók ezzel az e-mail címmel, néhány percen belül kapsz egy e-mailt a jelszó visszaállításához.';

// Browserbol hivjuk (supabase.functions.invoke()), ami CORS-preflight OPTIONS
// kerest kuld -- enelkul a kulonben jol mukodo POST valaszat is elutasitja a
// bongeszo (2. koros review, Zora, 2026-10-25: Playwright-tal elkapva, az en
// sajat python3/urllib tesztem ezt nem mutatta, mert az nem ervenyesit CORS-t).
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
  // Brand-sablon a confirm-signup.html mintajara (Csaba 10-24-i karta-kerese:
  // "brandelt email", lasd supabase/email-templates/confirm-signup.html).
  const html = `
    <div style="background-color:#f5f5f4; padding:40px 16px; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e7e5e4;">
        <div style="padding:32px 32px 24px; text-align:center; border-bottom:1px solid #f5f5f4;">
          <img
            src="https://velemgyere.hu/brand/velemgyere-logo-wide-v2.jpg"
            alt="Velem Gyere"
            width="220"
            style="max-width:220px; height:auto;"
          />
        </div>
        <div style="padding:32px;">
          <h1 style="font-size:20px; font-weight:800; color:#1c1917; margin:0 0 16px;">
            Jelszó visszaállítása
          </h1>
          <p style="font-size:14px; line-height:1.6; color:#57534e; margin:0 0 24px;">
            Kérést kaptunk a Velem Gyere fiókod jelszavának visszaállítására.
            Kattints az alábbi gombra, hogy új jelszót állíthass be.
          </p>
          <div style="text-align:center; margin:0 0 24px;">
            <a
              href="${link}"
              style="display:inline-block; background:#059669; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:14px 32px; border-radius:12px;"
            >
              Új jelszó beállítása
            </a>
          </div>
          <p style="font-size:12px; line-height:1.6; color:#a8a29e; margin:0;">
            Ez a link <strong>15 percig érvényes</strong>, és csak egyszer használható fel.
            Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt -- a jelszavad nem változik.
          </p>
        </div>
        <div style="padding:20px 32px; background:#fafaf9; text-align:center;">
          <p style="font-size:11px; color:#a8a29e; margin:0;">
            © 2026 Velem Gyere -- Külföldi programok magyarul
          </p>
        </div>
      </div>
    </div>
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'method not allowed' }, 405);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: 'Érvénytelen kérés.' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return jsonResponse({ success: false, message: 'Érvénytelen e-mail cím.' }, 400);
  }

  try {
    const rawToken = await createResetToken(email);
    if (rawToken) {
      const siteUrl = resolveSiteUrl(req);
      const link = `${siteUrl}/jelszo-visszaallitas?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`;
      await sendResetEmail(email, link);
    }
    // Ugyanaz a valasz rate-limit, nincs-ilyen-fiok es sikeres-kuldes eseten is --
    // lasd a fuggveny fejenel levo indoklast.
    return jsonResponse({ success: true, message: GENERIC_MESSAGE }, 200);
  } catch (err) {
    console.error('request-password-reset error:', err);
    return jsonResponse({ success: false, message: 'Hiba történt a kérés feldolgozása során.' }, 500);
  }
});
