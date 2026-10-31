// Velemgyere EUR/HUF arfolyam napi frissitese -- kanban 289432ed.
//
// Korabban az AppContext.tsx bootstrap-effectje, ha a rate >24h stale volt, MINDEN
// usernel (anon is) megprobalta kliens-oldalrol upsert-elni az app_settings-et --
// ez a "Admins can manage app settings" RLS policy miatt mindig 401-re/403-ra bukott
// nem-admin usernel, igy az arfolyam elesben SOHA nem frissult automatikusan. Ez a
// fuggveny service-role-lal, szerver-oldalon vegzi el a frissitest (megkeruli az RLS-t,
// jogosan, mert a service-role kulcs birtoklasa maga a jogosultsag), egy kulso
// host-crontab hivja naponta -- NEM Supabase pg_cron, az nincs telepitve ezen a
// projekten.
//
// Hivo-azonositas: verify_jwt=true (deploy-idoben beallitva), a hivo a projekt
// service_role kulcsat kuldi Authorization: Bearer fejlekent -- ez onmagaban egy
// valid Supabase JWT, a platform elutasit minden mas/hianyzo hivot MEG MIELOTT ez
// a kod lefutna. Nincs egyedi CRON_SECRET (a create_edge_function_secret eszkoz
// szandekosan csak ember altal, dashboardon allithato be, AI-bol nem -- ezert esett
// a valasztas erre a megoldasra, lasd 289432ed kartya-dontes).
//
// Az AdminDashboard-beli admin "frissites most" kezi gomb (updateEurHufRate/
// fetchAndApplyLiveRate, AppContext.tsx) VALTOZATLAN marad -- az mar most is mukodik
// (is_admin() atmegy az RLS-en), ez a fuggveny csak az automatikus utat helyettesiti.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Ugyanaz a 3-fallback mintas, mint a kliens-oldali src/lib/exchangeRate.ts
// fetchLiveEurHufRate()-je -- nem lehet kozvetlenul importalni (az Vite/bongeszo-kod,
// ez Deno), ezert ide portalva, azonos logikaval.
async function fetchLiveEurHufRate(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.HUF && typeof data.rates.HUF === 'number') {
        return Math.round(data.rates.HUF * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate API failed:', err);
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.HUF && typeof data.rates.HUF === 'number') {
        return Math.round(data.rates.HUF * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Secondary exchange rate API failed:', err);
  }

  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
    if (res.ok) {
      const data = await res.json();
      if (data?.eur?.huf && typeof data.eur.huf === 'number') {
        return Math.round(data.eur.huf * 100) / 100;
      }
    }
  } catch (err) {
    console.warn('Tertiary exchange rate API failed:', err);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const rate = await fetchLiveEurHufRate();
  if (!rate || rate <= 0) {
    return new Response(JSON.stringify({ success: false, reason: 'all exchange rate APIs failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nowIso = new Date().toISOString();
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ key: 'eur_huf_rate', value: rate, updated_at: nowIso }),
  });

  if (!upsertRes.ok) {
    const errText = await upsertRes.text();
    console.error('app_settings upsert failed:', upsertRes.status, errText);
    return new Response(JSON.stringify({ success: false, reason: `upsert failed (${upsertRes.status})` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, rate, updated_at: nowIso }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
