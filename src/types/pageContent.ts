// Kanban 71915a0a (4-6. pont): a public.pages tabla content oszlopa jsonb,
// oldalankent eltero alakkal -- ezek a varhato alakok, NEM DB-kenyszeritett
// sema (a komponensek ?? '' fallback-kel olvasnak, hianyzo mezonel ures
// marad, nem dob hibat).
export interface PageRecord {
  slug: string;
  title: string;
  content: Record<string, unknown>;
  updated_at?: string;
}

export interface SimpleTextContent {
  bodyText?: string;
}

export interface SimpleTextImageContent {
  bodyText?: string;
  imageUrl?: string;
}

export interface ContactContent {
  bodyText?: string;
  email?: string;
  phone?: string;
}

export interface HowItWorksContent {
  visitorTitle?: string;
  visitorText?: string;
  visitorImageUrl?: string;
  providerTitle?: string;
  providerText?: string;
  providerImageUrl?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  items?: FaqItem[];
}

export const EMPTY_PAGE: PageRecord = { slug: '', title: '', content: {} };

// Kanban 71915a0a 2. koros kerdes (Zora, msg 3312): a draft-fallback szoveg
// SZANDEKOSAN csak itt, kod-szinten el -- NEM DB-be seedelve -- mert az
// "isDraft" jelzes (lasd SimpleContentPage.tsx) eppen azon mulik, hogy a
// content.bodyText URES-e. Ha a DB-be beirnank ezt a placeholder-szoveget,
// az megegyezne a "Csaba mar megadta a vegleges tartalmat" allapottal, es a
// draft-figyelmeztetes csendben eltunne meg mielott valodi szoveg lenne --
// pont az eredeti keres ("jelezd kulon hogy draft es jovahagyast igenyel")
// ellen hatna. Ugyanezt a szoveget az admin szerkeszto mezok placeholder
// attributumakent (nem value-kent) is megkapjak, hogy Csaba lassa mit ir
// felul, anelkul hogy az ures mezo "kitoltottnek" szamitana.
export const DRAFT_FALLBACKS: Record<string, string> = {
  'about-us': 'Hamarosan itt olvashatod a Velem Gyere történetét -- addig is köszönjük a türelmet!',
  pricing: 'Hamarosan itt olvashatod, hogyan épül fel a foglalási díj és hogyan történik a fizetés.',
  contact: 'Hamarosan itt találod az elérhetőségeinket -- addig is köszönjük a türelmet!',
  terms: '[DRAFT -- PLACEHOLDER SZÖVEG] Az Általános Szerződési Feltételek végleges szövegét Csaba adja meg/hagyja jóvá az admin felületen. Ez a szöveg ideiglenes, nem jogilag kötelező erejű tartalom.',
  privacy: '[DRAFT -- PLACEHOLDER SZÖVEG] Az Adatkezelési Tájékoztató végleges szövegét Csaba adja meg/hagyja jóvá az admin felületen. Ez a szöveg ideiglenes, nem jogilag kötelező erejű tartalom.',
};

export const DRAFT_HOW_IT_WORKS: HowItWorksContent = {
  visitorText: 'Hamarosan itt olvashatod, hogyan találd meg és foglald le a programokat -- addig is köszönjük a türelmet!',
  providerText: 'Hamarosan itt olvashatod, hogyan hirdesd meg a programjaidat szolgáltatóként -- addig is köszönjük a türelmet!',
};

export const DRAFT_FAQ_ITEMS: FaqItem[] = [
  { question: 'Ez egy placeholder kérdés -- az admin tölti majd ki a valódi GYIK-et.', answer: 'Hamarosan itt olvashatod a válaszokat a leggyakoribb kérdésekre.' },
];
