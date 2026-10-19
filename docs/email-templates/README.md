# Velemgyere -- Auth email templates

Brand HTML sablonok a Supabase Auth email-jeihez (Authentication -> Email Templates
a Supabase dashboardon, nem kódból megy). Jelenleg:

- `confirm-signup.html` -- "Confirm signup" sablon, `{{ .ConfirmationURL }}` és
  `{{ .Email }}` Supabase-változókkal. Logó a live site-ról (`velemgyere.hu/brand/...`)
  töltve, emerald CTA (`#059669`, az app elsődleges brand-színe), navy szöveg a logó
  tipográfiájához igazítva.

## SMTP bekötés (feltételhez kötve)

A sablon önmagában NEM aktiválja az egyedi feladót -- ahhoz a Supabase prod projekten
(ref a vault `Supabase_velemgyere_API` címkéjében) be kell állítani az
Authentication -> SMTP Settings alatt:

- Host: `smtp.zoho.eu`, port `587` (STARTTLS)
- Sender email: `info@velemgyere.hu`
- Sender name: `Velemgyere`
- Username: `info@velemgyere.hu`
- Password: Zoho Mail **app-jelszó** (nem a fiók jelszava) -- Csaba-tól kérve, 2026-10-19,
  kártya 951a129f.

Amíg nincs app-jelszó, ez a lépés nem végezhető el. Ha megjön, a sablon ekkor
copy-paste-elhető a dashboardra, külön kód-deploy nélkül.

## SPF/DKIM

A megbízható kézbesítéshez a Zoho-verifikációs SPF/DKIM DNS rekordoknak fenn kell
lenniük a velemgyere.hu Cloudflare-zónán. Ellenőrzés 2026-10-19-én **blokkolva**: mind
a 3 vault-beli Cloudflare-token (`Cloudfare_api`, `Cloudflare_velemgyere_API`,
`Cloudflare_velemgyere_API_v2`) "Authentication error"-t (code 10000, érvénytelen
token) ad a DNS records végponton -- lásd kanban 951a129f komment.
