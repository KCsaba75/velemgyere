// Kanban 866cb61a (teszt-strategia, 4. kategoria: biztonsag/teljesitmeny):
// "Duplakattintas-dedup". A korabbi system-test.ts "tesztje" csak azt neze,
// hogy a disabled={loading} vagy setLoading(true) SZOVEG valahol megjelenik-e
// a ManualBookingModal.tsx forraskodjaban -- nem futtatta le a komponenst,
// nem bizonyitotta hogy a guard tenylegesen MUKODIK. Ez a teszt a VALODI
// BookingCheckoutModal-t renderelo, ket gyors, egymast koveto kattintast
// szimulal (fireEvent, nem userEvent -- szandekosan nincs koztuk varakozas,
// ez a "legrosszabb eset" egy duplakattintasra), es azt igazolja hogy a
// createOrder() csak EGYSZER hivodik meg.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Program } from '../types/database';

const mockUseApp = vi.fn();
vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
  CURRENT_BOOKING_YEAR: 2027,
}));

import { BookingCheckoutModal } from '../components/BookingCheckoutModal';

function makeProgram(): Program {
  return {
    id: 'prog-1',
    provider_id: 'prov-1',
    category_id: 'cat-1',
    region_id: 'reg-1',
    title: 'E2E Teszt Program',
    slug: 'e2e-teszt-program',
    short_description: 'Rövid leírás',
    description: 'Hosszú leírás',
    location: 'Ciprus',
    country: 'Ciprus',
    departure_location: 'Larnaca',
    event_date: '2027-06-15',
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
  } as Program;
}

describe('BookingCheckoutModal -- duplakattintas elleni vedelem (dedup)', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('ket gyors, egymast koveto kattintasra a createOrder() CSAK EGYSZER hivodik meg', async () => {
    let resolveCreateOrder: (v: { success: boolean; message: string }) => void = () => {};
    const createOrder = vi.fn(
      () => new Promise<{ success: boolean; message: string }>((resolve) => { resolveCreateOrder = resolve; })
    );
    mockUseApp.mockReturnValue({
      currentUser: { name: 'Teszt Felhasználó', email: 'teszt@test.local' },
      computeTotalPrice: (net: number) => net + 5,
      createOrder,
      setCurrentView: vi.fn(),
    });

    render(
      <BookingCheckoutModal
        isOpen={true}
        onClose={() => {}}
        program={makeProgram()}
        selectedOccurrence={null}
        selectedOccurrenceId={null}
        participantsCount={2}
        netTotal={130}
        onsitePaymentMethod="cash"
        dateFormatted="2027. június 15."
        onSuccess={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Tovább a megerősítéshez/i });

    // Szandekosan fireEvent (nem userEvent): nincs koztuk varakozas, ez a
    // "ket gyors kattintas egymas utan" legrosszabb esete.
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    resolveCreateOrder({ success: true, message: 'Sikeres foglalás!' });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Foglalás és fizetés megerősítve' })).toBeInTheDocument());

    expect(createOrder).toHaveBeenCalledTimes(1);
  });
});
