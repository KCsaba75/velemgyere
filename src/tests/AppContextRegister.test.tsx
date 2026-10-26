// Kartya 458a9cca: a signUp() meglevo+megerositett emailre nem ad hibat es nem
// csinal sessiont (Supabase security-by-design, nem szivargathatja ki hogy
// letezik-e a fiok), csak signUpData.user.identities ures tombjeben jelzi ezt.
// A regi kod ezt felismeretlenul hagyta, es felrevezetoen "majdnem kesz, erositsd
// meg az emailt" sikeres-uzenetet adott egy mar regen bejelentkezett usernek.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function RegisterVisitorProbe() {
  const { registerVisitor } = useApp();
  const [result, setResult] = React.useState<string>('');
  return (
    <div>
      <button
        onClick={async () => {
          const r = await registerVisitor({ name: 'Kiss Csaba', email: 'kiss.csaba@scada.hu', password: 'x' });
          setResult(`${r.success ? 'success' : 'fail'}:${r.message}`);
        }}
      >
        register
      </button>
      <div data-testid="result">{result}</div>
    </div>
  );
}

describe('AppContext -- registerVisitor duplikalt-regisztracio felismerese (458a9cca)', () => {
  beforeEach(() => {
    mockClient = createMockSupabaseClient({ initialSession: null });
  });

  it('mar letezo+megerositett emailre (session=null, identities=[]) bejelentkezesre iranyito hibat ad, NEM sikeres-regisztraciot', async () => {
    mockClient.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-existing', identities: [] }, session: null },
      error: null,
    } as any);

    renderWithProviders(<RegisterVisitorProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('fail:'));
    expect(screen.getByTestId('result')).toHaveTextContent('Ezzel az e-mail címmel már van fiók. Kérjük jelentkezzen be.');
  });

  it('valodi uj emailre (session=null, identities nem ures) a szokasos "erositsd meg az emailed" uzenetet adja', async () => {
    mockClient.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-new', identities: [{ id: 'ident-1' }] }, session: null },
      error: null,
    } as any);

    renderWithProviders(<RegisterVisitorProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('success:'));
    expect(screen.getByTestId('result')).toHaveTextContent('Erősítsd meg az e-mail címed');
  });
});
