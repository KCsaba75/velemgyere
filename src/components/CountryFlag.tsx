import React, { useState } from 'react';

export interface CountryFlagProps {
  emoji?: string | null;
  country?: string | null;
  code?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

// Convert Unicode regional indicator symbols (e.g. 🇲🇹, 🇪🇸, 🇨🇾, 🇮🇹, 🇹🇷, 🇭🇺) to 2-letter ISO country code
export function emojiToCountryCode(emoji?: string | null): string | null {
  if (!emoji) return null;
  const chars = Array.from(emoji.trim());
  if (chars.length < 2) return null;

  const code1 = chars[0].codePointAt(0);
  const code2 = chars[1].codePointAt(0);

  // Regional Indicator Symbol block: U+1F1E6 (127462) to U+1F1FF (127487)
  if (
    code1 && code2 &&
    code1 >= 127462 && code1 <= 127487 &&
    code2 >= 127462 && code2 <= 127487
  ) {
    const c1 = String.fromCharCode(code1 - 127462 + 97); // 'a' = 97
    const c2 = String.fromCharCode(code2 - 127462 + 97);
    return `${c1}${c2}`;
  }

  return null;
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  ciprus: 'cy',
  cyprus: 'cy',
  malta: 'mt',
  málta: 'mt',
  spanyolorszag: 'es',
  spanyolország: 'es',
  spain: 'es',
  olaszorszag: 'it',
  olaszország: 'it',
  italy: 'it',
  torokorszag: 'tr',
  törökország: 'tr',
  turkey: 'tr',
  turkiye: 'tr',
  türkiye: 'tr',
  gorogorszag: 'gr',
  görögország: 'gr',
  greece: 'gr',
  horvatorszag: 'hr',
  horvátország: 'hr',
  croatia: 'hr',
  magyarorszag: 'hu',
  magyarország: 'hu',
  hungary: 'hu',
  ausztria: 'at',
  austria: 'at',
  portugalia: 'pt',
  portugália: 'pt',
  portugal: 'pt',
  egyiptom: 'eg',
  egypt: 'eg',
  franciaorszag: 'fr',
  franciaország: 'fr',
  france: 'fr',
  nemetorszag: 'de',
  németország: 'de',
  germany: 'de',
  egyesultkiralysag: 'gb',
  anglia: 'gb',
  uk: 'gb',
  dubaj: 'ae',
  dubai: 'ae',
  uae: 'ae',
  thaifold: 'th',
  thaiföld: 'th',
  thailand: 'th',
  usa: 'us',
};

export function resolveCountryCode(
  emoji?: string | null,
  country?: string | null,
  code?: string | null
): string | null {
  if (code && code.trim().length === 2) {
    return code.trim().toLowerCase();
  }

  const fromEmoji = emojiToCountryCode(emoji);
  if (fromEmoji) return fromEmoji;

  if (country) {
    const normalized = country
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (COUNTRY_NAME_MAP[normalized]) {
      return COUNTRY_NAME_MAP[normalized];
    }
  }

  return null;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  emoji,
  country,
  code,
  className = '',
  size = 'sm',
  title,
}) => {
  const [loadError, setLoadError] = useState(false);
  const countryCode = resolveCountryCode(emoji, country, code);

  // Fallback to original emoji / text if cannot resolve code or image errored
  if (!countryCode || loadError) {
    return (
      <span className={className} title={title || country || ''} aria-hidden="true">
        {emoji || '📍'}
      </span>
    );
  }

  // Pre-configured proportional sizing classes (aspect ratio ~ 4:3 or 3:2)
  const sizeClasses = {
    xs: 'w-3.5 h-2.5',
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4',
    xl: 'w-8 h-5.5',
  }[size] || 'w-4 h-3';

  return (
    <img
      src={`https://flagcdn.com/${countryCode}.svg`}
      alt={country || title || countryCode.toUpperCase()}
      title={title || country || countryCode.toUpperCase()}
      className={`inline-block object-cover rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.5)] shrink-0 align-middle ${sizeClasses} ${className}`}
      loading="lazy"
      onError={() => setLoadError(true)}
    />
  );
};
