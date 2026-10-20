// Kanban 866cb61a (teszt-strategia, 2. kategoria): isLoading / ures-lista allapotok
// + szerepkor-fuggo lathatosagi szures a ProgramList-en. Ugyanaz a hook-mock minta
// mint a LoginModal teszteknel -- ProgramCard (amit a "van eredmeny" eset renderel)
// IS useApp()-ot hasznal, ezert annak fuggosegei is a kozos mock-ban vannak.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { Program, Profile } from '../types/database';

const mockUseApp = vi.fn();
vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
  // ProgramCard (amit a nepesitett-lista eset renderel) a formatPrice-t es formatProgramDisplayDate-et kozvetlen
  // named importkent hasznalja az AppContext modulbol, nem a hook-on at.
  formatPrice: (n: number) => String(n),
  formatProgramDisplayDate: (d: string) => d,
  getHungarianDateSuffix: () => '-tól',
}));

import { ProgramList } from '../components/ProgramList';

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog-1',
    provider_id: 'prov-1',
    category_id: 'cat-1',
    region_id: 'reg-1',
    title: 'Troodos-hegység túra',
    slug: 'troodos-tura',
    short_description: 'Magyar nyelvű hegyi túra.',
    description: 'Hosszabb leírás a túráról.',
    location: 'Troodos, Ciprus',
    country: 'Ciprus',
    departure_location: 'Larnaca szálloda előtt',
    event_date: '2026-11-25',
    start_time: '09:00',
    end_time: '17:00',
    duration: '8 óra',
    price: 65,
    currency: 'EUR',
    pricing_mode: 'per_person',
    language: 'Magyar',
    included: [],
    not_included: [],
    max_participants: 16,
    status: 'published',
    featured: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...overrides,
  } as Program;
}

function visitorProfile(): Profile {
  return {
    id: 'self-profile',
    user_id: 'self-user',
    name: 'Teszt Látogató',
    email: 'latogato@test.local',
    role: 'visitor',
    created_at: '2026-10-01T00:00:00Z',
  } as Profile;
}

function baseAppValue(overrides: Record<string, unknown> = {}) {
  return {
    programs: [] as Program[],
    regions: [],
    currentUser: visitorProfile(),
    searchQuery: '',
    selectedRegion: null,
    setSelectedRegion: vi.fn(),
    selectedCategory: null,
    selectedLocation: null,
    selectedDateFrom: '',
    setSelectedDateFrom: vi.fn(),
    selectedDateTo: '',
    setSelectedDateTo: vi.fn(),
    selectedDurationType: 'all',
    maxPrice: 150,
    currencyFilter: 'ALL',
    openProgramDetail: vi.fn(),
    resetFilters: vi.fn(),
    isLoading: false,
    // ProgramCard sajat useApp()-fuggosegei (ugyanaz a mockolt modul).
    computeTotalPrice: (net: number) => net,
    isProgramFavorite: () => false,
    toggleFavorite: vi.fn(),
    openFolderModal: vi.fn(),
    isAuthenticated: false,
    programOccurrencesCounts: {},
    eurHufRate: 400,
    getProgramRatingStats: () => ({ average: 0, count: 0, recommendPercent: 0, breakdown: { guide: 0, value: 0, organization: 0, safety: 0 }, distribution: {} }),
    ...overrides,
  };
}

describe('ProgramList -- isLoading / ures-lista / nepesitett allapotok', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('isLoading=true es meg nincs program eseten a betolto-skeleton-t mutatja, nem az ures-allapotot', () => {
    mockUseApp.mockReturnValue(baseAppValue({ isLoading: true, programs: [] }));
    render(<ProgramList onOpenMobileFilters={() => {}} />);

    expect(screen.queryByText('Nincs találat a megadott szűrési feltételekre')).not.toBeInTheDocument();
    expect(screen.queryByText('Troodos-hegység túra')).not.toBeInTheDocument();
  });

  it('nem-toltodo, ures eredmenynel az "ures lista" allapotot mutatja, Szűrők visszaállítása gombbal', async () => {
    const resetFilters = vi.fn();
    mockUseApp.mockReturnValue(baseAppValue({ isLoading: false, programs: [], resetFilters }));
    const user = userEvent.setup();

    render(<ProgramList onOpenMobileFilters={() => {}} />);
    expect(screen.getByText('Nincs találat a megadott szűrési feltételekre')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Szűrők visszaállítása/i })[0]);
    expect(resetFilters).toHaveBeenCalledTimes(1);
  });

  it('nepesitett listanal a publikus programot megjeleniti a visitor-nek', () => {
    const published = makeProgram({ id: 'prog-published', title: 'Publikalt Program', status: 'published' });
    mockUseApp.mockReturnValue(baseAppValue({ isLoading: false, programs: [published] }));

    render(<ProgramList onOpenMobileFilters={() => {}} />);
    expect(screen.getByText('Publikalt Program')).toBeInTheDocument();
    expect(screen.queryByText('Nincs találat a megadott szűrési feltételekre')).not.toBeInTheDocument();
  });

  it('visitor-nek NEM jelenik meg egy draft (nem publikalt) program -- szerepkor-fuggo lathatosagi szures', () => {
    const draft = makeProgram({ id: 'prog-draft', title: 'Rejtett Draft Program', status: 'draft' });
    mockUseApp.mockReturnValue(baseAppValue({ isLoading: false, programs: [draft] }));

    render(<ProgramList onOpenMobileFilters={() => {}} />);
    expect(screen.queryByText('Rejtett Draft Program')).not.toBeInTheDocument();
    // A kliens-oldali szures miatt ez az RLS-sel egyutt ketreteg vedelem --
    // a szerver (RLS) amugy sem kuldene el ezt a sort egy visitor-nek, de a
    // UI-szures regresszioja (pl. ha valaki admin-only adatot is lekerne)
    // itt is elkaphato.
    expect(screen.getByText('Nincs találat a megadott szűrési feltételekre')).toBeInTheDocument();
  });
});
