# Velemgyere -- email sablonok

## Fájlok

- `confirm-signup.html` -- Supabase Auth "Confirm signup" sablon, `{{ .ConfirmationURL }}`
  és `{{ .Email }}` Supabase-változókkal. ÉLES (2026-10-19 óta): a Supabase prod
  Auth `mailer_templates_confirmation_content` mezőjébe van betöltve, base64-beágyazott
  logóval (lásd "Éles oldal 404" szekció lent a miértre). Valódi teszt-regisztrációval
  igazolva (kanban 951a129f).
- `foglalas-megtortent.html` -- booking létrejött (`status=pending`) értesítő a
  vásárlónak. Tartalmazza a szolgáltató elérhetőségét is (Csaba korrekciója,
  2026-10-19 08:26 -- lásd lent).
- `foglalas-visszaigazolva.html` -- ugyanaz, `status=confirmed`-re.
- **Mindkét booking-sablon csak design-review, NINCS küldő mechanizmus.** A repóban
  nincs booking-emailt küldő kód (nincs Edge Function, nincs resend/sendgrid
  használat sehol). Ez külön feladat: kanban `97ca24ba`.
- Preview-k (placeholder adattal kitöltve, beágyazott logóval):
  `store/shared-previews/velemgyere-{confirm-signup,foglalas-megtortent,foglalas-visszaigazolva}-preview.html`
  a marveen repóban.

A mezőnevek és magyar címkék a tényleges `Order`/`BookingVoucher` adatmodellből
jönnek (`src/types/database.ts`, `src/components/BookingVoucher.tsx`).

## Szolgáltatói elérhetőség mindkét booking-sablonban (2026-10-19)

Eredetileg csak a `foglalas-visszaigazolva.html` tartalmazta a szolgáltató
elérhetőségét, egy feltételezett RPC-korlát miatt ("csak confirmed rendelésnél
jár"). Csaba kérte, hogy a pending sablonban is szerepeljen -- ellenőrizve a
`get_provider_contact_for_order` RPC tényleges SQL-definícióját (prod DB,
`pg_get_functiondef`): a WHERE-ág `o.status in ('pending', 'confirmed')`, tehát ez
MINDIG is megengedett volt pending állapotban is. A korábbi megszorítás téves
feltételezésen alapuló UI-döntés volt, nem valódi RLS/technikai korlát -- mindkét
sablon most már tartalmazza a blokkot.

## SMTP -- ÉLES: Resend (2026-10-19)

Zoho SMTP-t NEM az automatikus tranzakciós emailekhez használjuk -- azok
**Resend**-en mennek. A Zoho app-jelszó (vault `Zoho_info_velemgyere_SMTP_app_password`)
csak Csaba saját, kétirányú, manuális `info@velemgyere.hu` levelezéséhez kell.

A Supabase prod Auth SMTP (Management API `PATCH /config/auth`) be van állítva:

- Host: `smtp.resend.com`, port `587`
- Sender: `info@velemgyere.hu` / "Velemgyere"
- Username: `resend`, Password: vault `Resend_velemgyere_API_key`

Valódi (nem éles felhasználóra menő) teszt-regisztrációval igazolva: az email
másodperceken belül megérkezett, helyes feladóval/tárggyal/tartalommal.

## SPF/DKIM -- KÉSZ, VERIFIKÁLT (2026-10-19)

A Cloudflare DNS Edit token él (vault `Cloudflare_velemgyere_API_v3`, zóna-id
`59e9e88744f525ee7fe264153372d95c`) -- a korábbi `Cloudfare_api` /
`Cloudflare_velemgyere_API` / `Cloudflare_velemgyere_API_v2` tokenek érvénytelenek.

Felvitt rekordok:
- `TXT velemgyere.hu` -> `v=spf1 include:zohomail.eu ~all` (Csaba vitte fel
  közvetlenül, Zoho admin console authoritatív értékével)
- `CNAME rsend.velemgyere.hu` -> `rsend-euw1.forge.rmta.net` (DNS only)
- `CNAME send.velemgyere.hu` -> `send.forge.rmta.net` (DNS only)
- `TXT resend._domainkey.velemgyere.hu` -> DKIM public key (Resend Domains oldaláról)

A Resend domain-verifikáció **Verified** állapotban (Csaba screenshot-tal
megerősítve).

## Éles oldal 404 -- NEM DNS-probléma (korrigálva 2026-10-19)

Korábbi feltételezés (hogy a Cloudflare-nameserver okozza a static-asset 404-et,
pl. a logó képét) **TÉVES** volt. A valódi ok: a production Vercel-deploy a git
`main` branch-ből épül, ami 2026-10-06 óta nem frissült (a fejlesztés 164
commit-tal előrébb a `dev`-en, de soha nem lett production-be promótálva) -- lásd
urgent kanban kártya `0ba671d7`, 2026-10-19-én még nyitott. Emiatt a
`confirm-signup.html` éles verziója ideiglenesen base64-beágyazott logót használ
az élő URL helyett -- ha `0ba671d7` megoldódik, egy külön PATCH-csel visszaállítható
az élő URL-re (tisztább/kisebb email).
