import { useEffect, useState } from 'react';

// Kanban 882a92d9 (#9): a "sm" Tailwind breakpointtal egyezo hatar (640px) --
// ez az ELSO JS-oldali eszkoz-eszkeles a kodbazisban, eddig minden reszponziv
// viselkedes tisztan CSS-breakpoint volt. Csak az ALAPERTELMEZETT nezet
// kivalasztasahoz kell (lasd ProviderScheduleDashboardPage), a nezetek kozotti
// valtas tovabbra is a felhasznalo keze alatt marad minden eszkozon.
const MOBILE_QUERY = '(max-width: 640px)';

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}
