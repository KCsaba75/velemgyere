/**
 * Segédfüggvények annak eldöntésére, hogy egy programnak van-e foglalható
 * (mai vagy jövőbeli) időpontja, és hogy egy régiónak van-e legalább egy
 * ilyen, az adott nézőnek látható programja.
 *
 * Kanban cfd30b63: a Málta & Gozo "Kiemelt Úticélok" gomb a főoldalon olyan
 * régióra mutatott, amelynek mindkét publikált programja occurrence (és
 * event_date fallback) nélkül állt -- a katalógus-szűrő (lásd ProgramList)
 * ezeket ki is zárja, így a gombra kattintó látogató üres oldalra futott.
 * A root cause a hiányzó jövőbeli dátum-adat (szolgáltatói/Csaba döntés,
 * nem kódhiba), a kód-oldali javítás pedig: ne ajánljunk fel olyan
 * desztinációt gombként, ami jelenleg biztosan üres eredményt adna.
 */
import type { Program, Region, Profile } from '../types/database';

export const getCandidateOccurrenceDates = (
  program: Pick<Program, 'id' | 'event_date'>,
  programOccurrencesDates: Record<string, string[]>
): string[] => {
  const occDates = programOccurrencesDates?.[program.id];
  const candidateDates: string[] = occDates ? [...occDates] : [];
  if (program.event_date && !candidateDates.includes(program.event_date)) {
    candidateDates.push(program.event_date);
  }
  return candidateDates;
};

export const hasUpcomingOccurrence = (
  candidateDates: string[],
  referenceDateStr: string = new Date().toISOString().split('T')[0]
): boolean => {
  return candidateDates.some((d) => d >= referenceDateStr);
};

// Ugyanaz a régió-egyezés, mint a ProgramList "Region filter" blokkja: slug,
// region_id vagy location-szöveg egyezés.
const programMatchesRegion = (program: Program, regionSlug: string): boolean => {
  if (program.region?.slug === regionSlug || program.region_id === regionSlug) {
    return true;
  }
  return program.location.toLowerCase().includes(regionSlug.toLowerCase());
};

// Ugyanaz a lathatosagi szabaly, mint a ProgramList "Visibility rule" blokkja.
const isVisibleToUser = (program: Program, currentUser: Profile): boolean => {
  if (currentUser.role === 'visitor' && program.status !== 'published') return false;
  if (currentUser.role === 'provider' && program.status !== 'published') {
    if (program.provider?.user_id !== currentUser.user_id) return false;
  }
  return true;
};

/**
 * Régió-lista szűrése csak azokra, amiknek jelenleg van foglalható programjuk
 * (lásd fentebb). A `regions`/`programs` paraméterrel hívva minden olyan
 * helyen újrafelhasználható, ahol a "Kiemelt Úticélok" gombsor vagy a
 * régió-választó dropdown épül (Hero.tsx, FilterBar.tsx).
 */
export const filterRegionsWithAvailablePrograms = (
  regions: Region[],
  programs: Program[],
  currentUser: Profile,
  programOccurrencesDates: Record<string, string[]>
): Region[] => {
  return regions.filter((reg) =>
    programs.some(
      (p) =>
        isVisibleToUser(p, currentUser) &&
        programMatchesRegion(p, reg.slug) &&
        hasUpcomingOccurrence(getCandidateOccurrenceDates(p, programOccurrencesDates))
    )
  );
};
