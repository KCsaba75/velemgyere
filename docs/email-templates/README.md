# Velemgyere -- Auth email templates

Brand HTML sablonok a Supabase Auth email-jeihez (Authentication -> Email Templates
a Supabase dashboardon, nem kódból megy). Jelenleg:

- `confirm-signup.html` -- "Confirm signup" sablon, `{{ .ConfirmationURL }}` és
  `{{ .Email }}` Supabase-változókkal. Logó a live site-ról (`velemgyere.hu/brand/...`)
  töltve, emerald CTA (`#059669`, az app elsődleges brand-színe), navy szöveg a logó
  tipográfiájához igazítva.

## SMTP bekötés -- VÉGLEGES IRÁNY: Resend (Csaba döntése, 2026-10-19 07:06)

Zoho SMTP-t NEM az automatikus tranzakciós emailekhez (regisztráció-megerősítés,
később foglalás-követés) használjuk -- azok **Resend**-en mennek. A Zoho app-jelszó
(vault `Zoho_info_velemgyere_SMTP_app_password`) csak Csaba saját, kétirányú,
manuális `info@velemgyere.hu` levelezéséhez kell (napi 4-5 platform-szintű email),
NEM ehhez a sablonhoz.

A sablon önmagában NEM aktiválja az egyedi feladót -- ahhoz a Supabase prod projekten
(ref a vault `Supabase_velemgyere_API` címkéjében) be kell állítani az
Authentication -> SMTP Settings alatt:

- Host: `smtp.resend.com`, port `587` (STARTTLS)
- Sender email: `info@velemgyere.hu` (vagy Resend-ben verifikált alias)
- Sender name: `Velemgyere`
- Username: `resend` (szó szerint ez, nem email-cím)
- Password: Resend **API-kulcs** -- Csaba még regisztrál egy ingyenes Resend fiókot,
  kártya 951a129f.

Amíg nincs API-kulcs, ez a lépés nem végezhető el. Ha megjön, a sablon változatlanul
copy-paste-elhető a dashboardra (a sablon maga küldő-szolgáltatástól független),
külön kód-deploy nélkül.

## SPF/DKIM

A megbízható kézbesítéshez a Resend domain-verifikációs SPF/DKIM DNS rekordoknak
fenn kell lenniük a velemgyere.hu Cloudflare-zónán. Ellenőrzés 2026-10-19-én
**blokkolva**: mind a 3 vault-beli Cloudflare-token (`Cloudfare_api`,
`Cloudflare_velemgyere_API`, `Cloudflare_velemgyere_API_v2`) "Authentication
error"-t (code 10000, érvénytelen token) ad a DNS records végponton -- lásd kanban
951a129f komment. Ugyanez a token blokkolja az élő oldal statikus-asset
kiszolgálásának javítását is (a domain Cloudflare nameservereket használ, nem
Vercelét -- lásd kanban komment, 2026-10-19).
