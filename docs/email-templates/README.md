# Velemgyere -- email sablonok

## Fájlok

- `confirm-signup.html` -- Supabase Auth "Confirm signup" sablon, `{{ .ConfirmationURL }}`
  és `{{ .Email }}` Supabase-változókkal. Csaba jóváhagyta 2026-10-19 07:26-kor
  (preview: `store/shared-previews/velemgyere-confirm-signup-preview.html` a marveen
  repóban). Authentication -> Email Templates a Supabase dashboardon, nem kódból megy.
- `foglalas-megtortent.html` -- booking létrejött (`status=pending`) értesítő a
  vásárlónak. NEM Supabase Auth sablon -- a repóban nincs booking-emailt küldő
  mechanizmus (nincs Edge Function / Resend-hívás), ez egyelőre csak a
  vizuális/tartalmi tervezet, token-placeholderekkel (`{{BOOKING_REFERENCE}}` stb.,
  lásd a fájl fejléc-kommentjét). Szándékosan NEM tartalmaz szolgáltatói
  elérhetőséget -- az app RPC-modellje szerint (`get_provider_contact_for_order`)
  az csak confirmed rendelésnél jár.
- `foglalas-visszaigazolva.html` -- ugyanaz, `status=confirmed`-re, PLUSZ a
  szolgáltató elérhetőségi blokkja (cég, kapcsolattartó, telefon, email, weboldal).
- Preview-k (placeholder adattal kitöltve, beágyazott logóval, review-ra):
  `store/shared-previews/velemgyere-foglalas-megtortent-preview.html` és
  `velemgyere-foglalas-visszaigazolva-preview.html` a marveen repóban.

A mezőnevek és magyar címkék a tényleges `Order`/`BookingVoucher` adatmodellből
jönnek (`src/types/database.ts`, `src/components/BookingVoucher.tsx`) -- lásd
kanban 951a129f kutatás, 2026-10-19.

## SMTP bekötés -- VÉGLEGES IRÁNY: Resend (Csaba döntése, 2026-10-19 07:06)

Zoho SMTP-t NEM az automatikus tranzakciós emailekhez (regisztráció-megerősítés,
foglalás-követés) használjuk -- azok **Resend**-en mennek. A Zoho app-jelszó (vault
`Zoho_info_velemgyere_SMTP_app_password`) csak Csaba saját, kétirányú, manuális
`info@velemgyere.hu` levelezéséhez kell, NEM ezekhez a sablonokhoz.

A sablon önmagában NEM aktiválja az egyedi feladót -- ahhoz a Supabase prod projekten
(ref a vault `Supabase_velemgyere_API` címkéjében) be kell állítani az
Authentication -> SMTP Settings alatt:

- Host: `smtp.resend.com`, port `587` (STARTTLS)
- Sender email: `info@velemgyere.hu` (vagy Resend-ben verifikált alias)
- Sender name: `Velemgyere`
- Username: `resend` (szó szerint ez, nem email-cím)
- Password: Resend **API-kulcs** -- megvan (vault `Resend_velemgyere_API_key`), DE
  csak küldési jogú ("restricted to only send emails"), domain-kezelésre nem
  használható.

**SZÁNDÉKOSAN MÉG NINCS BEKÖTVE** (2026-10-19 állapot): a Resend hivatalos
dokumentációja szerint (resend.com/docs/knowledge-base/403-error-domain-mismatch)
egy nem-verifikált domainről induló küldés 403 `validation_error`-t ad -- ha most
kötnénk be, minden éles regisztráció csendben elveszítené a megerősítő emailt
(rosszabb, mint a jelenlegi default Supabase mailer). Előfeltétel: Csaba hozzáadja
a velemgyere.hu domaint a Resend dashboardon (Domains -> Add Domain), ami kiadja a
pontos SPF/DKIM TXT értékeket -- utána a Cloudflare DNS-be felvihetők (lásd lent),
DNS-propagáció + Resend-verifikáció ~15 perc - 72 óra, és csak a "Verified" állapot
után biztonságos a Supabase SMTP-t Resendre állítani.

## SPF/DKIM

A Cloudflare DNS Edit token él és működik (vault `Cloudflare_velemgyere_API_v3`,
zóna-id `59e9e88744f525ee7fe264153372d95c`) -- a korábbi `Cloudfare_api` /
`Cloudflare_velemgyere_API` / `Cloudflare_velemgyere_API_v2` tokenek érvénytelenek,
ne használd őket.

Jelenlegi DNS-állapot (2026-10-19, olvasva): A `velemgyere.hu -> 76.76.21.21`
(proxied=false, DNS-only), 3x MX (zoho.eu), 1x TXT zoho-verification. **Nincs SPF
rekord.** Két forrásból kell az authoritatív érték, találgatva NEM írható be (lásd
kanban 951a129f komment, 2026-10-19):

- **Resend SPF+DKIM**: a Resend Domains oldaláról, miután Csaba hozzáadta a domaint.
- **Zoho SPF**: a Zoho Mail admin console Email Authentication/SPF füléről --
  többféle, egymásnak ellentmondó `include:` érték kering a neten
  (zoho.eu / spf.zoho.eu / one.zoho.eu), csak a saját fiók admin-konzolja
  authoritatív. Egy domainhez csak EGY SPF-rekord lehet, rossz érték esetén az
  egész SPF érvénytelenné válik.

## Éles oldal 404 -- NEM DNS-probléma (korrigálva 2026-10-19)

Korábbi feltételezés (hogy a Cloudflare-nameserver okozza a static-asset 404-et,
pl. a logó képét) **TÉVES** volt és vissza lett vonva. A valódi ok: a production
Vercel-deploy a git `main` branch-ből épül, ami 2026-10-06 óta nem frissült (a
fejlesztés 164 commit-tal előrébb a `dev`-en, de soha nem lett production-be
promótálva) -- lásd urgent kanban kártya `0ba671d7`. A DNS maga rendben van.
