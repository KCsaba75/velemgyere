// Velemgyere: program-ertekeles beadasa, Gemini-alapu gyuloletbeszed-eloszuressel
// ELOTTE. Kanban 8d11173e, Csaba dontes 2026-11-15 18:38: elozetes blokkolas,
// nem utolagos rejtes -- a sertonek itelt szoveg SOHA nem kerul be a DB-be.
//
// A reviews tablan nincs tobbe kozvetlen authenticated INSERT RLS policy, es a
// public.submit_review RPC EXECUTE joga is csak service_role-nak van (ld.
// migraciok) -- ez a function az egyetlen irasi ut.
//
// A korabbi, kliens-oldali telefonszam-gyanu "flagged" logika (AppContext
// addReview) IDE koltozott at es MEGMARAD -- az egy kulon, mar mukodo
// spam-vedelem (nem blokkol, csak admin-ellenorzesre jelol), a Gemini-check
// ettol fuggetlen, ES SZIGORUBB: az nem jelol, hanem elutasit.

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

function textHasPhoneNumber(txt: string): boolean {
  const matches = txt.match(/\d[\d .()-]{5,}\d/g) || [];
  return matches.some(m => m.replace(/\D/g, '').length >= 9);
}

// Fail-open dontes, ugyanaz az indoklas mint a submit-booking-message-ben:
// Gemini-kiesesnel a review bemegy (a mar meglevo telefon-flag tovabbra is
// fut), nem all le a funkcio egesze.
async function isAbusiveContent(text: string): Promise<boolean> {
  const prompt = `Te egy magyar nyelvű utazási platform (velemgyere.hu) tartalommoderátora vagy. A feladatod KIZÁRÓLAG azt eldönteni, hogy az alábbi, felhasználó által írt program-értékelés gyűlöletbeszédet, súlyos személyeskedő sértést, fenyegetést vagy trágár szitkozódást tartalmaz-e egy szolgáltató vagy más személy felé.

NE jelöld meg (flagged=false), ha a szöveg:
- csupán negatív véleményt fogalmaz meg a programról/szolgáltatásról ("rossz volt", "nem ajánlom", "csalódás volt", "drága volt")
- udvariatlan, de nem gyűlölködő vagy trágár kritika

Jelöld meg (flagged=true), ha a szöveg:
- trágár szavakat / káromkodást tartalmaz valaki felé címezve
- gyűlöletkeltő, lealacsonyító kifejezést használ (etnikum, nem, vallás, fogyatékosság stb. alapján)
- fenyegetést vagy súlyos személyeskedő sértést tartalmaz

Szöveg: """${text}"""

Válaszolj KIZÁRÓLAG ezzel a JSON formátummal, más szöveg nélkül: {"flagged": true vagy false}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
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

interface ReviewRequestBody {
  program_id?: string;
  order_id?: string;
  rating?: number;
  rating_guide?: number;
  rating_value?: number;
  rating_organization?: number;
  rating_safety?: number;
  title?: string;
  comment?: string;
  positive_feedback?: string;
  improvement_feedback?: string;
  travel_type?: string;
  photos?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const userId = await getAuthedUserId(req.headers.get('Authorization'));
  if (!userId) return jsonResponse({ error: 'Bejelentkezés szükséges.' }, 401);

  let body: ReviewRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Érvénytelen kérés.' }, 400);
  }

  const programId = String(body.program_id ?? '').trim();
  const orderId = String(body.order_id ?? '').trim();
  const comment = String(body.comment ?? '').trim();
  const title = String(body.title ?? '').trim();
  const positiveFeedback = String(body.positive_feedback ?? '').trim();
  const improvementFeedback = String(body.improvement_feedback ?? '').trim();
  const travelType = String(body.travel_type ?? 'couple').trim();
  const photos = Array.isArray(body.photos) ? body.photos.filter(p => typeof p === 'string') : [];

  if (!programId || !orderId || comment.length < 20) {
    return jsonResponse({ error: 'Kérjük írj legalább 2-3 mondatos (min. 20 karakter) részletes leírást a személyes tapasztalataidról!' }, 400);
  }

  const textToCheck = `${comment} ${title} ${positiveFeedback}`;
  if (await isAbusiveContent(textToCheck)) {
    return jsonResponse({ error: 'A szöveg ütközik az irányelvekkel, javítsa és küldje újra.' }, 422);
  }

  const status = textHasPhoneNumber(textToCheck.toLowerCase()) ? 'flagged' : 'published';

  const clamp = (v: unknown) => Math.min(5, Math.max(1, Number(v) || 5));

  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_review`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_program_id: programId,
      p_order_id: orderId,
      p_rating: clamp(body.rating),
      p_rating_guide: clamp(body.rating_guide),
      p_rating_value: clamp(body.rating_value),
      p_rating_organization: clamp(body.rating_organization),
      p_rating_safety: clamp(body.rating_safety),
      p_title: title || null,
      p_comment: comment,
      p_positive_feedback: positiveFeedback || null,
      p_improvement_feedback: improvementFeedback || null,
      p_travel_type: travelType,
      p_photos: photos,
      p_status: status,
    }),
  });

  if (!rpcRes.ok) {
    const errBody = await rpcRes.json().catch(() => null);
    const message = errBody?.message || 'Az értékelés mentése nem sikerült.';
    return jsonResponse({ error: message }, 400);
  }

  const row = await rpcRes.json();
  return jsonResponse({
    review: row,
    message:
      status === 'flagged'
        ? 'Köszönjük az értékelést! A moderáció ellenőrzése után kerül közzétételre.'
        : 'Köszönjük az értékelést! A véleményed azonnal megjelent a program adatlapján.',
  });
});
