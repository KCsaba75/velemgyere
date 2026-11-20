import { toLocalDateStr } from '../lib/dateUtils';

// Kanban 8d11173e: a szolgaltato ne tudjon elerhetoseget (telefon, email, URL,
// messenger/social link) irni a program cimebe/leirasaba -- a platform
// megkerulesenek klasszikus formaja. A valodi hatar a programs tabla
// BEFORE INSERT/UPDATE triggere (text_has_contact_info), ez csak az azonnali,
// mentes-elotti UX-visszajelzes -- ugyanazt a logikat tukrozi.
function clientTextHasPhoneNumber(txt: string): boolean {
  const matches = txt.match(/\d[\d .()-]{5,}\d/g) || [];
  return matches.some(m => m.replace(/\D/g, '').length >= 9);
}

function clientTextHasContactInfo(txt: string | null | undefined): boolean {
  if (!txt) return false;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(txt)) return true;
  if (/(https?:\/\/|www\.)\S+/i.test(txt)) return true;
  if (/(instagram\.com|facebook\.com|\bfb\.com\b|\bm\.me\b|\bwa\.me\b|\bt\.me\b|telegram\.me|\bviber\b|\bwhatsapp\b|\bmessenger\b)/i.test(txt)) return true;
  if (clientTextHasPhoneNumber(txt)) return true;
  return false;
}

const CONTACT_INFO_ERROR_MAIN = 'A program címében vagy leírásában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.';
const CONTACT_INFO_ERROR_INCLUDED = 'A "Mit tartalmaz az ár?" listában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.';
const CONTACT_INFO_ERROR_NOT_INCLUDED = 'A "Mit NEM tartalmaz az ár?" listában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.';

export function findProgramContactInfoError(fields: {
  title: string;
  shortDescription: string;
  description: string;
  included: string[];
  notIncluded: string[];
}): string | null {
  if (
    clientTextHasContactInfo(fields.title) ||
    clientTextHasContactInfo(fields.shortDescription) ||
    clientTextHasContactInfo(fields.description)
  ) {
    return CONTACT_INFO_ERROR_MAIN;
  }
  if (fields.included.some(clientTextHasContactInfo)) return CONTACT_INFO_ERROR_INCLUDED;
  if (fields.notIncluded.some(clientTextHasContactInfo)) return CONTACT_INFO_ERROR_NOT_INCLUDED;
  return null;
}

// Kanban 70afbb5a: az eredeti ProgramOccurrencesModal-bol atvett fuggveny
// `cursor.toISOString().split('T')[0]`-t hasznalt, ami UTC-re konvertal egy
// LOKALIS ejfeli Date-et -- Europe/Budapest-en (UTC+1/+2) ez mindig EGY NAPPAL
// korabbi datum-stringet adott (pl. hetfo-valasztas vasarnapot generalt),
// elesben igazolva Playwright-teszttel. toLocalDateStr a lokalis naptari
// mezokbol rakja ossze a stringet, nincs UTC-eltolodas.
export function generateDatesInRange(startDate: string, endDate: string, weekdays: Set<number>): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cursor <= end) {
    if (weekdays.has(cursor.getDay())) {
      dates.push(toLocalDateStr(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
