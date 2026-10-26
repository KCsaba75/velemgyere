// Kanban 866cb61a (teszt-strategia, 2. kategoria): "Hookok -- Supabase client
// hivasok mockolasa, auth allapotvaltas SIGNED_IN/SIGNED_OUT". Ez az AppProvider
// sajat syncFromSession logikajat teszteli -- a teljes Supabase klienst mockoljuk
// (lib/supabase modul hatarnal), es a generikus createMockSupabaseClient auto-
// feloldja az osszes nem-releváns .from(tabla) hivast ures eredmennyel, csak a
// "profiles" tablat kell a teszt szamara explicit beallitani.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMockSupabaseClient } from './mockSupabaseClient';

let mockClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock('../lib/supabase', () => ({
  get supabase() { return mockClient; },
  isSupabaseConfigured: true,
}));

import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';

function renderWithProviders(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppProvider>{children}</AppProvider>
    </MemoryRouter>
  );
}

function TestConsumer() {
  const { isAuthenticated, currentUser } = useApp();
  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT'}</div>
      <div data-testid="user-name">{currentUser?.name}</div>
      <div data-testid="user-role">{currentUser?.role}</div>
    </div>
  );
}

describe('AppContext -- auth allapotvaltas (SIGNED_IN / SIGNED_OUT) mockolt Supabase klienssel', () => {
  beforeEach(() => {
    mockClient = createMockSupabaseClient({ initialSession: null });
  });

  it('inditaskor (nincs session) anonim visitor allapotban indul', async () => {
    renderWithProviders(<TestConsumer />);

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_OUT'));
    expect(screen.getByTestId('user-role')).toHaveTextContent('visitor');
  });

  it('SIGNED_IN esemenyre, meglevo profiles sorral, isAuthenticated=true-ra valt es a valodi profilt tolti be', async () => {
    const fakeSession = { user: { id: 'user-123', email: 'teszt@test.local', user_metadata: {} } };
    mockClient = createMockSupabaseClient({
      initialSession: null,
      tables: {
        profiles: () => ({
          data: [{ id: 'profile-1', user_id: 'user-123', name: 'Bejelentkezett Teszt', email: 'teszt@test.local', role: 'visitor' }],
          error: null,
        }),
      },
    });

    renderWithProviders(<TestConsumer />);

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_OUT'));

    mockClient.__triggerAuthStateChange('SIGNED_IN', fakeSession);

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_IN'));
    expect(screen.getByTestId('user-name')).toHaveTextContent('Bejelentkezett Teszt');
  });

  it('SIGNED_OUT esemenyre (session=null) visszaall anonim visitor-ra', async () => {
    const fakeSession = { user: { id: 'user-123', email: 'teszt@test.local', user_metadata: {} } };
    mockClient = createMockSupabaseClient({
      initialSession: null,
      tables: {
        profiles: () => ({
          data: [{ id: 'profile-1', user_id: 'user-123', name: 'Bejelentkezett Teszt', email: 'teszt@test.local', role: 'visitor' }],
          error: null,
        }),
      },
    });

    renderWithProviders(<TestConsumer />);

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_OUT'));
    mockClient.__triggerAuthStateChange('SIGNED_IN', fakeSession);
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_IN'));

    mockClient.__triggerAuthStateChange('SIGNED_OUT', null);

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('SIGNED_OUT'));
    expect(screen.getByTestId('user-role')).toHaveTextContent('visitor');
  });
});
