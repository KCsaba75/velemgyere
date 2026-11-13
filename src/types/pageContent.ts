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

export interface HowItWorksStepContent {
  title: string;
  body: string;
  leftLabel?: string;
  leftText?: string;
  rightLabel?: string;
  rightText?: string;
}

export interface HowItWorksContent {
  visitorTitle?: string;
  visitorText?: string;
  visitorImageUrl?: string;
  providerTitle?: string;
  providerText?: string;
  providerImageUrl?: string;
  // Kanban fd1a3d2c: a szolgaltato-nezet reszletes, lepesenkenti kifejtese
  // (fuggoleges idovonal + ket-oszlopos "Szolgaltatokent / A programvadasznak"
  // kiemelo doboz minden lepesnel). A felso providerTitle/providerText marad
  // a rovid teaser, ez a tomb a lentebbi reszletes bontas.
  providerSteps?: HowItWorksStepContent[];
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
  providerText: 'Öt egyszerű lépésben juthatsz el a regisztrációtól az első érdeklődésig -- az alábbiakban lépésről lépésre, részletesen bemutatjuk.',
};

// Kanban fd1a3d2c: ugyanaz a draft-fallback minta mint a DRAFT_HOW_IT_WORKS-nel --
// amig az admin nem tolt fel sajat lepeseket a content.providerSteps-be, ez a
// (verifikalt, tenyszeru) szoveg jelenik meg draft-jelzessel a nyilvanos oldalon.
export const DRAFT_HOW_IT_WORKS_PROVIDER_STEPS: HowItWorksStepContent[] = [
  {
    title: 'Regisztráció és fiók aktiválása',
    body: 'A "Szolgáltatóknak" oldalon kattints a Regisztráció gombra, és töltsd ki az űrlapot: céged vagy vállalkozásod neve, egy kapcsolattartó neve, e-mail-címed és telefonszámod, egy rövid bemutatkozás arról, milyen kirándulásokat, túrákat vagy élményeket szervezel, valamint hogy milyen fizetési módokat fogadsz el helyszínen (készpénz és/vagy Revolut). A regisztráció elküldése után egy megerősítő linket kapsz e-mailben -- amint rákattintasz, a szolgáltatói fiókod azonnal aktívvá válik, nincs külön admin-várakozás a belépéshez.',
    leftLabel: 'SZOLGÁLTATÓKÉNT',
    leftText: 'Öt perc alatt kész a fiókod -- email-megerősítés után azonnal beléphetsz a szolgáltatói dashboardra.',
    rightLabel: 'A PROGRAMVADÁSZNAK',
    rightText: 'Ebből a lépésből még semmit nem lát -- a katalógusban egyelőre nem jelensz meg.',
  },
  {
    title: 'Program feltöltése',
    body: 'A szolgáltatói dashboardon az "Új program" gombbal annyi programot tölthetsz fel, amennyit szeretnél: cím, kategória, ország/régió, nyelv (pl. magyar nyelvű vezetés), időtartam, pontos dátum és időpont, indulási hely és helyszín, egy rövid és egy részletes leírás, ár és pénznem, maximális létszám, valamint hogy mi van benne az árban és mi nincs. Tölts fel legalább egy fényképet, és jelöld ki, melyik legyen a borítókép.',
    leftLabel: 'SZOLGÁLTATÓKÉNT',
    leftText: 'Amíg nem küldöd véglegesítésre, a programod vázlat (draft) marad -- bármikor szabadon szerkesztheted.',
    rightLabel: 'A PROGRAMVADÁSZNAK',
    rightText: 'Még mindig nem látja -- a vázlat kizárólag a te dashboardodon jelenik meg.',
  },
  {
    title: 'Admin-ellenőrzés',
    body: 'Minden új vagy módosított programot a katalógus adminisztrátora átnéz: ellenőrzi a leírást, az árat, a képeket és az adatok hitelességét, mielőtt a program nyilvánosan megjelenne. Ha valamit pontosítani kell, előtte jelezzük feléd. Ez a lépés nem a fiókodat érinti -- minden egyes programot egyedileg véd, hogy a katalógusban csak megbízható, pontos ajánlatok szerepeljenek.',
    leftLabel: 'SZOLGÁLTATÓKÉNT',
    leftText: 'Ha minden rendben, nincs teendőd -- csak várod, hogy a program átváltson élesre.',
    rightLabel: 'A PROGRAMVADÁSZNAK',
    rightText: 'Ő profitál ebből a lépésből: csak ellenőrzött, valós programokat lát majd a katalógusban.',
  },
  {
    title: 'Megjelenés a katalógusban',
    body: 'A jóváhagyott program azonnal megjelenik a nyilvános Velem Gyere katalógusban: kereshetővé és böngészhetővé válik mindenki számára, a te beállított borítóképeddel, áraddal és leírásoddal.',
    leftLabel: 'SZOLGÁLTATÓKÉNT',
    leftText: 'A dashboardodon innentől "Élő" állapotban látod a programot.',
    rightLabel: 'A PROGRAMVADÁSZNAK',
    rightText: 'Pontosan ekkor találkozik először a programoddal -- ez alapján dönti el, hogy érdeklődik-e.',
  },
  {
    title: 'Érdeklődések fogadása',
    body: 'Amint a programod él, az érdeklődők közvetlenül a nálad megadott elérhetőségre küldik a megkeresésüket -- névvel, telefonszámmal és egy egyedi üzenettel. Ezeket a szolgáltatói dashboardodon is nyomon követheted, közvetítői díj nélkül az MVP-ben.',
    leftLabel: 'SZOLGÁLTATÓKÉNT',
    leftText: 'Te veszed fel velük a kapcsolatot, a saját tempódban és módodon.',
    rightLabel: 'A PROGRAMVADÁSZNAK',
    rightText: 'Ő küldi az első üzenetet, közvetlenül hozzád, köztes díj nélkül.',
  },
];

export const DRAFT_FAQ_ITEMS: FaqItem[] = [
  { question: 'Ez egy placeholder kérdés -- az admin tölti majd ki a valódi GYIK-et.', answer: 'Hamarosan itt olvashatod a válaszokat a leggyakoribb kérdésekre.' },
];

/** Admin-editable copy and imagery for the story-led About page. */
export interface AboutUsContent {
  heroEyebrow: string; heroTitle: string; heroHighlight: string; heroText: string;
  heroImageUrl: string;
  storyEyebrow: string; storyTitle: string; storyParagraph1: string; storyParagraph2: string; storyParagraph3: string; storyQuote: string;
  storyImageUrl: string; storyImageCaption: string;
  discoveryEyebrow: string; discoveryTitle: string; discoveryText: string;
  discoveryStep1Title: string; discoveryStep1Text: string;
  discoveryStep2Title: string; discoveryStep2Text: string;
  discoveryStep3Title: string; discoveryStep3Text: string;
  discoveryQuestion: string; discoveryAnswer: string;
  missionEyebrow: string; missionTitle: string; missionText1: string; missionText2: string; missionCallout: string; missionImageUrl: string;
  experiencesEyebrow: string; experiencesTitle: string; experiencesText: string;
  experience1Title: string; experience1Text: string; experience2Title: string; experience2Text: string;
  experience3Title: string; experience3Text: string; experience4Title: string; experience4Text: string;
  experience5Title: string; experience5Text: string;
  ctaTitle: string; ctaText: string; ctaSignoff: string; ctaSignature: string; ctaTagline: string;
}
