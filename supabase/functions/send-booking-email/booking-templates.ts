// Velemgyere booking email templates -- DEPLOYED COPY, lives alongside
// send-booking-email/index.ts (Edge Functions only bundle their own directory).
//
// Source of truth for the HTML/visual design is docs/email-templates/foglalas-megtortent.html
// and foglalas-visszaigazolva.html (design-reviewed by Zora/Csaba, kanban 951a129f).
// If you change the design in docs/email-templates/, copy the change here too and
// redeploy -- these two copies are not auto-synced.

export const LOGO_DATA_PLACEHOLDER = 'https://velemgyere.hu/brand/velemgyere-logo-wide-v2.jpg';

const PENDING_TEMPLATE = `<!DOCTYPE html>
<html lang="hu" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Foglalásod megérkezett -- Velemgyere</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    {{BOOKING_REFERENCE}} -- {{PROGRAM_TITLE}}, {{DATE_FORMATTED}}. A szolgáltató hamarosan visszaigazolja.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_DATA_PLACEHOLDER}" alt="Velemgyere -- Külföldi programok magyarul" width="240" style="display:block; width:240px; max-width:80%; height:auto; border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-radius:16px; padding:40px 32px; box-shadow:0 1px 3px rgba(16,24,20,0.08);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;">
                    <span style="font-size:13px; font-weight:700; color:#92400e;">Függőben -- szolgáltatói visszaigazolásra vár</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 16px 0; font-family:'Outfit','Plus Jakarta Sans',Arial,sans-serif; font-size:22px; line-height:1.3; color:#0f2a4a;">
                Szia {{CUSTOMER_NAME}}!
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#374151;">
                Megkaptuk a foglalásodat (azonosító: <strong>{{BOOKING_REFERENCE}}</strong>). A szolgáltató hamarosan visszaigazolja -- erről külön e-mailt küldünk.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; border-collapse:collapse;">
                <tr>
                  <td colspan="2" style="padding:0 0 12px 0; font-size:16px; font-weight:700; color:#0f2a4a; border-bottom:2px solid #d1fae5;">
                    {{PROGRAM_TITLE}}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; width:140px; border-bottom:1px solid #f3f4f6;">Helyszín</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{PROGRAM_LOCATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Időpont</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DATE_FORMATTED}}, {{START_TIME}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Időtartam</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DURATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Indulás / találkozó</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DEPARTURE_LOCATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280;">Résztvevők</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827;">{{PARTICIPANTS_COUNT}} fő</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#f0fdf4; border:1px solid #d1fae5; border-radius:10px; padding:16px;">
                <tr>
                  <td colspan="2" style="padding:0 0 8px 0; font-size:13px; font-weight:700; color:#065f46;">Szolgáltató elérhetősége</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280; width:110px;">Cég</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_COMPANY_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Kapcsolattartó</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_CONTACT_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Telefon</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_PHONE}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Email</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_EMAIL}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Weboldal</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_WEBSITE}}</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#f9fafb; border-radius:10px; padding:16px;">
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Helyszínen fizetendő</td>
                  <td align="right" style="padding:4px 0; font-size:14px; font-weight:700; color:#111827;">{{ONSITE_AMOUNT}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Fizetési mód</td>
                  <td align="right" style="padding:4px 0; font-size:14px; color:#111827;">{{ONSITE_PAYMENT_METHOD}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Online kényelmi díj (fizetve)</td>
                  <td align="right" style="padding:4px 0; font-size:14px; color:#111827;">{{BOOKING_FEE}}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0 0; font-size:13px; font-weight:700; color:#374151; border-top:1px solid #e5e7eb;">Összesen</td>
                  <td align="right" style="padding:8px 0 0 0; font-size:15px; font-weight:800; color:#059669; border-top:1px solid #e5e7eb;">{{TOTAL_PRICE}}</td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#6b7280;">
                <strong>Tartalmazza:</strong> {{INCLUDED_LIST}}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px auto;">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#059669;">
                    <a href="{{BOOKING_DETAIL_URL}}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px; font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                      Foglalás megtekintése
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0 0 4px 0; font-size:12px; color:#9ca3af;">Velemgyere -- Külföldi programok magyarul</p>
              <p style="margin:0; font-size:12px; color:#9ca3af;"><a href="https://velemgyere.hu" style="color:#9ca3af; text-decoration:underline;">velemgyere.hu</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const CONFIRMED_TEMPLATE = `<!DOCTYPE html>
<html lang="hu" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Foglalásod visszaigazolva -- Velemgyere</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    {{BOOKING_REFERENCE}} -- {{PROGRAM_TITLE}} visszaigazolva! {{DATE_FORMATTED}}, {{START_TIME}}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_DATA_PLACEHOLDER}" alt="Velemgyere -- Külföldi programok magyarul" width="240" style="display:block; width:240px; max-width:80%; height:auto; border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-radius:16px; padding:40px 32px; box-shadow:0 1px 3px rgba(16,24,20,0.08);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:12px 16px;">
                    <span style="font-size:13px; font-weight:700; color:#065f46;">Megerősítve -- a szolgáltató visszaigazolta a foglalásod</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 16px 0; font-family:'Outfit','Plus Jakarta Sans',Arial,sans-serif; font-size:22px; line-height:1.3; color:#0f2a4a;">
                Jó hír, {{CUSTOMER_NAME}}!
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#374151;">
                A(z) <strong>{{PROGRAM_TITLE}}</strong> foglalásodat (azonosító: <strong>{{BOOKING_REFERENCE}}</strong>) a szolgáltató visszaigazolta. Lent találod a részleteket és a szolgáltató elérhetőségét.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; border-collapse:collapse;">
                <tr>
                  <td colspan="2" style="padding:0 0 12px 0; font-size:16px; font-weight:700; color:#0f2a4a; border-bottom:2px solid #d1fae5;">
                    {{PROGRAM_TITLE}}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; width:140px; border-bottom:1px solid #f3f4f6;">Helyszín</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{PROGRAM_LOCATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Időpont</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DATE_FORMATTED}}, {{START_TIME}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Időtartam</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DURATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Indulás / találkozó</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DEPARTURE_LOCATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280;">Résztvevők</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827;">{{PARTICIPANTS_COUNT}} fő</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#f0fdf4; border:1px solid #d1fae5; border-radius:10px; padding:16px;">
                <tr>
                  <td colspan="2" style="padding:0 0 8px 0; font-size:13px; font-weight:700; color:#065f46;">Szolgáltató elérhetősége</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280; width:110px;">Cég</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_COMPANY_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Kapcsolattartó</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_CONTACT_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Telefon</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_PHONE}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Email</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_EMAIL}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Weboldal</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_WEBSITE}}</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#f9fafb; border-radius:10px; padding:16px;">
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Helyszínen fizetendő</td>
                  <td align="right" style="padding:4px 0; font-size:14px; font-weight:700; color:#111827;">{{ONSITE_AMOUNT}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Fizetési mód</td>
                  <td align="right" style="padding:4px 0; font-size:14px; color:#111827;">{{ONSITE_PAYMENT_METHOD}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#6b7280;">Online kényelmi díj (fizetve)</td>
                  <td align="right" style="padding:4px 0; font-size:14px; color:#111827;">{{BOOKING_FEE}}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0 0; font-size:13px; font-weight:700; color:#374151; border-top:1px solid #e5e7eb;">Összesen</td>
                  <td align="right" style="padding:8px 0 0 0; font-size:15px; font-weight:800; color:#059669; border-top:1px solid #e5e7eb;">{{TOTAL_PRICE}}</td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#6b7280;">
                <strong>Tartalmazza:</strong> {{INCLUDED_LIST}}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px auto;">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#059669;">
                    <a href="{{BOOKING_DETAIL_URL}}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px; font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                      Foglalás / utalvány megtekintése
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0 0 4px 0; font-size:12px; color:#9ca3af;">Velemgyere -- Külföldi programok magyarul</p>
              <p style="margin:0; font-size:12px; color:#9ca3af;"><a href="https://velemgyere.hu" style="color:#9ca3af; text-decoration:underline;">velemgyere.hu</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const CANCELLED_TEMPLATE = `<!DOCTYPE html>
<html lang="hu" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Foglalásod lemondva -- Velemgyere</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f5; font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    {{BOOKING_REFERENCE}} -- {{PROGRAM_TITLE}} lemondva a szolgáltató által.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_DATA_PLACEHOLDER}" alt="Velemgyere -- Külföldi programok magyarul" width="240" style="display:block; width:240px; max-width:80%; height:auto; border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border-radius:16px; padding:40px 32px; box-shadow:0 1px 3px rgba(16,24,20,0.08);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:12px 16px;">
                    <span style="font-size:13px; font-weight:700; color:#9f1239;">Lemondva -- a szolgáltató lemondta a foglalásod</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 16px 0; font-family:'Outfit','Plus Jakarta Sans',Arial,sans-serif; font-size:22px; line-height:1.3; color:#0f2a4a;">
                Szia {{CUSTOMER_NAME}}!
              </h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#374151;">
                Sajnos a szolgáltató lemondta a(z) <strong>{{PROGRAM_TITLE}}</strong> foglalásodat (azonosító: <strong>{{BOOKING_REFERENCE}}</strong>). Az alábbiakban a lemondott foglalás adatait találod -- ha kérdésed van, keresd a szolgáltatót az alábbi elérhetőségeken.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; border-collapse:collapse;">
                <tr>
                  <td colspan="2" style="padding:0 0 12px 0; font-size:16px; font-weight:700; color:#0f2a4a; border-bottom:2px solid #fecdd3;">
                    {{PROGRAM_TITLE}}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; width:140px; border-bottom:1px solid #f3f4f6;">Helyszín</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{PROGRAM_LOCATION}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280; border-bottom:1px solid #f3f4f6;">Időpont (lemondva)</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">{{DATE_FORMATTED}}, {{START_TIME}}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; font-size:13px; color:#6b7280;">Résztvevők</td>
                  <td style="padding:10px 0; font-size:14px; color:#111827;">{{PARTICIPANTS_COUNT}} fő</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0; background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:16px;">
                <tr>
                  <td colspan="2" style="padding:0 0 8px 0; font-size:13px; font-weight:700; color:#374151;">Szolgáltató elérhetősége</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280; width:110px;">Cég</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_COMPANY_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Kapcsolattartó</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_CONTACT_NAME}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Telefon</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_PHONE}}</td>
                </tr>
                <tr>
                  <td style="padding:3px 0; font-size:13px; color:#6b7280;">Email</td>
                  <td style="padding:3px 0; font-size:14px; color:#111827;">{{PROVIDER_EMAIL}}</td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#6b7280;">
                Ha online fizettél kényelmi díjat vagy foglalási díjat, a szolgáltatóval vagy a Velemgyere ügyfélszolgálatával tudod rendezni a visszatérítést.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px auto;">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#0f2a4a;">
                    <a href="{{BOOKING_DETAIL_URL}}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px; font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                      Foglalás megtekintése
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0 0 4px 0; font-size:12px; color:#9ca3af;">Velemgyere -- Külföldi programok magyarul</p>
              <p style="margin:0; font-size:12px; color:#9ca3af;"><a href="https://velemgyere.hu" style="color:#9ca3af; text-decoration:underline;">velemgyere.hu</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export interface BookingEmailData {
  bookingReference: string;
  customerName: string;
  programTitle: string;
  programLocation: string;
  dateFormatted: string;
  startTime: string;
  duration: string;
  departureLocation: string;
  participantsCount: number;
  includedList: string;
  totalPrice: string;
  onsiteAmount: string;
  onsitePaymentMethod: string;
  bookingFee: string;
  bookingDetailUrl: string;
  providerCompanyName: string;
  providerContactName: string;
  providerPhone: string;
  providerEmail: string;
  providerWebsite: string;
}

function fill(template: string, data: BookingEmailData): string {
  const map: Record<string, string> = {
    '{{BOOKING_REFERENCE}}': data.bookingReference,
    '{{CUSTOMER_NAME}}': data.customerName,
    '{{PROGRAM_TITLE}}': data.programTitle,
    '{{PROGRAM_LOCATION}}': data.programLocation,
    '{{DATE_FORMATTED}}': data.dateFormatted,
    '{{START_TIME}}': data.startTime,
    '{{DURATION}}': data.duration,
    '{{DEPARTURE_LOCATION}}': data.departureLocation,
    '{{PARTICIPANTS_COUNT}}': String(data.participantsCount),
    '{{INCLUDED_LIST}}': data.includedList,
    '{{TOTAL_PRICE}}': data.totalPrice,
    '{{ONSITE_AMOUNT}}': data.onsiteAmount,
    '{{ONSITE_PAYMENT_METHOD}}': data.onsitePaymentMethod,
    '{{BOOKING_FEE}}': data.bookingFee,
    '{{BOOKING_DETAIL_URL}}': data.bookingDetailUrl,
    '{{PROVIDER_COMPANY_NAME}}': data.providerCompanyName,
    '{{PROVIDER_CONTACT_NAME}}': data.providerContactName,
    '{{PROVIDER_PHONE}}': data.providerPhone,
    '{{PROVIDER_EMAIL}}': data.providerEmail,
    '{{PROVIDER_WEBSITE}}': data.providerWebsite,
  };
  let out = template;
  for (const [token, value] of Object.entries(map)) {
    out = out.split(token).join(escapeHtml(value));
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderPendingEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Foglalásod megérkezett -- ${data.programTitle}`,
    html: fill(PENDING_TEMPLATE, data),
  };
}

export function renderConfirmedEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Foglalásod visszaigazolva -- ${data.programTitle}`,
    html: fill(CONFIRMED_TEMPLATE, data),
  };
}

export function renderCancelledEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Foglalásod lemondva -- ${data.programTitle}`,
    html: fill(CANCELLED_TEMPLATE, data),
  };
}
