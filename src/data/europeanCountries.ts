// Europa (teljes, ENSZ-geoscheme szerinti) orszagai, ISO 3166-1 alpha-2 kodokkal.
// A zaszlo-emoji a kodbol szamitott, nem kezzel beirt -- igy mindig egyezik a
// CountryFlag.tsx emojiToCountryCode() visszafejtesevel (regional indicator pár).
export interface EuropeanCountry {
  code: string; // ISO 3166-1 alpha-2, kisbetus
  nameHu: string;
}

// ISO alpha-2 kod -> regional indicator emoji (pl. 'hu' -> 🇭🇺)
export function countryCodeToFlagEmoji(code: string): string {
  const chars = code.toLowerCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...chars);
}

// Nevsor abc-rendben (magyar orszagnev szerint), Europa osszes szuveren allama
// (ENSZ-geoscheme "Europe" region, plusz a mikroallamok).
export const EUROPEAN_COUNTRIES: EuropeanCountry[] = [
  { code: 'al', nameHu: 'Albánia' },
  { code: 'ad', nameHu: 'Andorra' },
  { code: 'at', nameHu: 'Ausztria' },
  { code: 'by', nameHu: 'Belarusz' },
  { code: 'be', nameHu: 'Belgium' },
  { code: 'ba', nameHu: 'Bosznia-Hercegovina' },
  { code: 'bg', nameHu: 'Bulgária' },
  { code: 'hr', nameHu: 'Horvátország' },
  { code: 'cy', nameHu: 'Ciprus' },
  { code: 'cz', nameHu: 'Csehország' },
  { code: 'dk', nameHu: 'Dánia' },
  { code: 'ee', nameHu: 'Észtország' },
  { code: 'fi', nameHu: 'Finnország' },
  { code: 'fr', nameHu: 'Franciaország' },
  { code: 'de', nameHu: 'Németország' },
  { code: 'gr', nameHu: 'Görögország' },
  { code: 'hu', nameHu: 'Magyarország' },
  { code: 'is', nameHu: 'Izland' },
  { code: 'ie', nameHu: 'Írország' },
  { code: 'it', nameHu: 'Olaszország' },
  { code: 'xk', nameHu: 'Koszovó' },
  { code: 'lv', nameHu: 'Lettország' },
  { code: 'li', nameHu: 'Liechtenstein' },
  { code: 'lt', nameHu: 'Litvánia' },
  { code: 'lu', nameHu: 'Luxemburg' },
  { code: 'mt', nameHu: 'Málta' },
  { code: 'md', nameHu: 'Moldova' },
  { code: 'mc', nameHu: 'Monaco' },
  { code: 'me', nameHu: 'Montenegró' },
  { code: 'nl', nameHu: 'Hollandia' },
  { code: 'mk', nameHu: 'Észak-Macedónia' },
  { code: 'no', nameHu: 'Norvégia' },
  { code: 'pl', nameHu: 'Lengyelország' },
  { code: 'pt', nameHu: 'Portugália' },
  { code: 'ro', nameHu: 'Románia' },
  { code: 'ru', nameHu: 'Oroszország' },
  { code: 'sm', nameHu: 'San Marino' },
  { code: 'rs', nameHu: 'Szerbia' },
  { code: 'sk', nameHu: 'Szlovákia' },
  { code: 'si', nameHu: 'Szlovénia' },
  { code: 'es', nameHu: 'Spanyolország' },
  { code: 'se', nameHu: 'Svédország' },
  { code: 'ch', nameHu: 'Svájc' },
  { code: 'tr', nameHu: 'Törökország' },
  { code: 'ua', nameHu: 'Ukrajna' },
  { code: 'gb', nameHu: 'Egyesült Királyság' },
  { code: 'va', nameHu: 'Vatikán' },
].sort((a, b) => a.nameHu.localeCompare(b.nameHu, 'hu'));
