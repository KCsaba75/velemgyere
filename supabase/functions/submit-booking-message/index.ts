// Velemgyere: foglalashoz tartozo uzenet kuldese, Gemini-alapu gyuloletbeszed-
// eloszuressel ELOTTE. Kanban 8d11173e, Csaba dontes 2026-11-15 18:38: elozetes
// blokkolas, nem utolagos rejtes -- a sertonek itelt szoveg SOHA nem kerul be a
// DB-be, a masik fel nem latja.
//
// A booking_messages tablan nincs tobbe kozvetlen authenticated INSERT RLS
// policy, es a public.submit_booking_message RPC EXECUTE joga is csak
// service_role-nak van (ld. migraciok) -- ez a function az egyetlen irasi ut,
// a moderacio nem megkerulheto egy kozvetlen .insert() vagy .rpc() hivassal.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

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

async function getAuthedUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: authHeader },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.id === 'string' ? user.id : null;
}

// Fail-open dontes: ha a Gemini-hivas maga hibazik (halozat/kvota/kulcs), az
// uzenetkuldes nem all le teljesen -- a hiba logolva van (console.error), a
// szoveg atmegy. Ez egy mellekes, nem biztonsagkritikus funkcio (ket fel kozti
// foglalas-csevegés); a fail-closed valtozat egy Gemini-kiesessel az egesz
// uzenetkuldest leallitana, ami rosszabb UX-regresszio, mint a ritka, nem-
// detektalt sertes. Ha Csaba fail-closed-ot akar, ez a pont valtoztatando.
async function isAbusiveContent(text: string): Promise<boolean> {
  const prompt = `Te egy magyar nyelvű utazási platform (velemgyere.hu) tartalommoderátora vagy. A feladatod KIZÁRÓLAG azt eldönteni, hogy az alábbi, felhasználó által írt szöveg (utazó és szolgáltató közötti foglalás-üzenet) gyűlöletbeszédet, súlyos személyeskedő sértést, fenyegetést vagy trágár szitkozódást tartalmaz-e a másik fél felé.

NE jelöld meg (flagged=false), ha a szöveg:
- hétköznapi, akár kicsit türelmetlen hangvételű kérdés vagy kérés
- negatív, de tényszerű panasz ("késtünk, mikor érünk oda?", "nem kaptuk meg az információt")

Jelöld meg (flagged=true), ha a szöveg:
- trágár szavakat / káromkodást tartalmaz a másik fél felé címezve
- gyűlöletkeltő, lealacsonyító kifejezést használ (etnikum, nem, vallás, fogyatékosság stb. alapján)
- fenyegetést vagy súlyos személyeskedő sértést tartalmaz

Szöveg: """${text}"""

Válaszolj KIZÁRÓLAG ezzel a JSON formátummal, más szöveg nélkül: {"flagged": true vagy false}`;

  try {
    // Explicit modellnev, NEM "gemini-flash-latest" alias: a 2026-11-16-i
    // kulcs-csere (5d22b0fb) soran az alias-feloldas ennel az uj Google
    // projektnel vegtelenre lefagyott (90mp+ valasz nelkul), mig explicit
    // nevvel masodperceken belul valaszolt, akar hibaval is.
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) {
      console.error('Gemini moderation call failed:', res.status, await res.text());
      return false;
    }
    const data = await res.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textOut);
    return Boolean(parsed.flagged);
  } catch (err) {
    console.error('Gemini moderation error:', err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const userId = await getAuthedUserId(req.headers.get('Authorization'));
  if (!userId) return jsonResponse({ error: 'Bejelentkezés szükséges.' }, 401);

  let body: { order_id?: string; sender_role?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Érvénytelen kérés.' }, 400);
  }

  const orderId = String(body.order_id ?? '').trim();
  const senderRole = body.sender_role;
  const content = String(body.content ?? '').trim();

  if (!orderId || (senderRole !== 'customer' && senderRole !== 'provider') || !content || content.length > 4000) {
    return jsonResponse({ error: 'Érvénytelen üzenet.' }, 400);
  }

  if (await isAbusiveContent(content)) {
    return jsonResponse({ error: 'A szöveg ütközik az irányelvekkel, javítsa és küldje újra.' }, 422);
  }

  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_booking_message`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_order_id: orderId,
      p_sender_role: senderRole,
      p_sender_id: userId,
      p_content: content,
    }),
  });

  if (!rpcRes.ok) {
    const errBody = await rpcRes.json().catch(() => null);
    const message = errBody?.message || 'Az üzenet küldése nem sikerült.';
    return jsonResponse({ error: message }, 400);
  }

  const row = await rpcRes.json();
  return jsonResponse({ message: row });
});
