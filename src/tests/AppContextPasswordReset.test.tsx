// Kartya af2a6460 (Csaba kerese): elfelejtett jelszo. A natÍv Supabase recovery-flow
// helyett sajat Edge Function (request-password-reset) + SQL RPC-k
// (check_password_reset_token, confirm_password_reset) -- ld. AppContext.tsx kommentjet
// a dontes indoklasaval. Ez a teszt a VALODI AppContext logikat futtatja mockolt
// supabase.functions.invoke()/rpc() valaszokkal.
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

function RequestResetProbe() {
  const { requestPasswordReset } = useApp();
  const [result, setResult] = React.useState('');
  return (
    <div>
      <button onClick={async () => {
        const r = await requestPasswordReset('teszt@pelda.hu');
        setResult(`${r.success ? 'success' : 'fail'}:${r.message}`);
      }}>request</button>
      <div data-testid="result">{result}</div>
    </div>
  );
}

function ConfirmResetProbe() {
  const { confirmPasswordReset, checkPasswordResetToken } = useApp();
  const [result, setResult] = React.useState('');
  return (
    <div>
      <button onClick={async () => {
        const r = await confirmPasswordReset('teszt@pelda.hu', 'sometoken', 'ujjelszo123');
        setResult(`${r.success ? 'success' : 'fail'}:${r.message}`);
      }}>confirm</button>
      <button onClick={async () => {
        const valid = await checkPasswordResetToken('teszt@pelda.hu', 'sometoken');
        setResult(`valid:${valid}`);
      }}>check</button>
      <div data-testid="result">{result}</div>
    </div>
  );
}

describe('AppContext -- jelszo-reset (af2a6460)', () => {
  beforeEach(() => {
    mockClient = createMockSupabaseClient({ initialSession: null });
  });

  it('requestPasswordReset a request-password-reset Edge Function-t hivja a megadott emaillel, es az o valaszat adja vissza', async () => {
    mockClient.functions.invoke.mockResolvedValueOnce({
      data: { success: true, message: 'Ha létezik fiók ezzel az e-mail címmel, néhány percen belül kapsz egy e-mailt.' },
      error: null,
    });

    renderWithProviders(<RequestResetProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'request' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('success:'));
    expect(mockClient.functions.invoke).toHaveBeenCalledWith('request-password-reset', { body: { email: 'teszt@pelda.hu' } });
  });

  it('requestPasswordReset halo/function hiba eseten biztonsagos, generikus hibauzenetet ad', async () => {
    mockClient.functions.invoke.mockResolvedValueOnce({ data: null, error: new Error('network down') } as any);

    renderWithProviders(<RequestResetProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'request' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('fail:'));
  });

  it('confirmPasswordReset ervenyes tokennel (RPC true) sikert jelez', async () => {
    mockClient.rpc.mockResolvedValueOnce({ data: true, error: null } as any);

    renderWithProviders(<ConfirmResetProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('success:'));
    expect(mockClient.rpc).toHaveBeenCalledWith('confirm_password_reset', {
      p_email: 'teszt@pelda.hu',
      p_token: 'sometoken',
      p_new_password: 'ujjelszo123',
    });
  });

  it('confirmPasswordReset lejart/hasznalt tokennel (RPC false) a "lejart link" uzenetet adja', async () => {
    mockClient.rpc.mockResolvedValueOnce({ data: false, error: null } as any);

    renderWithProviders(<ConfirmResetProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'confirm' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('fail:'));
    expect(screen.getByTestId('result')).toHaveTextContent('lejárt');
  });

  it('checkPasswordResetToken a check_password_reset_token RPC eredmenyet adja vissza boolean-kent', async () => {
    mockClient.rpc.mockResolvedValueOnce({ data: true, error: null } as any);

    renderWithProviders(<ConfirmResetProbe />);
    await userEvent.click(screen.getByRole('button', { name: 'check' }));

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('valid:true'));
    expect(mockClient.rpc).toHaveBeenCalledWith('check_password_reset_token', {
      p_email: 'teszt@pelda.hu',
      p_token: 'sometoken',
    });
  });
});
