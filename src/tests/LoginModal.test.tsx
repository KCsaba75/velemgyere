// Kanban 866cb61a (teszt-strategia, 2. kategoria -- frontend unit/component):
// urlap kotelezo-mezo validacio + hibauzenet + loading-allapot a LoginModal-on.
//
// A LoginModal a teljes AppContext helyett csak a sajat hat fuggvenyet/erteket
// hasznalja useApp()-bol -- ezert ITT a useApp() HOOK-ot mockoljuk (nem a teljes
// Supabase klienst), igy a teszt a VALODI komponens-logikat (handleSubmit korai
// return, error/infoMessage renderelese, loading-szoveg) futtatja, anelkul hogy
// a 3000+ soros AppProvider egesz Supabase-adatreteget fel kellene epiteni.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseApp = vi.fn();
vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
}));

import { LoginModal } from '../components/LoginModal';

function baseAppValue(overrides: Partial<ReturnType<typeof mockUseApp>> = {}) {
  return {
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    registerVisitor: vi.fn(),
    setCurrentView: vi.fn(),
    loginModalMessage: null,
    loginRedirectTo: null,
    ...overrides,
  };
}

describe('LoginModal -- required-field validation', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('nem hivja meg a login()-t, ha MINDKET mezo ures', async () => {
    const login = vi.fn();
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    expect(login).not.toHaveBeenCalled();
  });

  // Kulon-kulon, EGY mezot kitoltve. MUTACIOS-TESZT eredmenye (lasd kanban-komment):
  // a komponens ketreteg validaciot hasznal (natv HTML "required" + handleSubmit JS
  // guardja), ezert a KETTO KOZUL BARMELYIK egyedi eltavolitasa NEM buktatja el ezt a
  // tesztet -- ez helyes defense-in-depth, nem teszt-hiba. Csak ha MINDKET reteg egyszerre
  // tunik el, bukik a teszt (igazoltan).
  it('nem hivja meg a login()-t, ha csak a jelszo van kitoltve, az email ures', async () => {
    const login = vi.fn();
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('••••••••'), 'titkosjelszo123');
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    expect(login).not.toHaveBeenCalled();
  });

  it('nem hivja meg a login()-t, ha csak az email van kitoltve, a jelszo ures', async () => {
    const login = vi.fn();
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('pl. anna@pelda.hu'), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    expect(login).not.toHaveBeenCalled();
  });

  it('nem hivja meg a registerVisitor()-t regisztracio modban, ha a nev mezo ures', async () => {
    const registerVisitor = vi.fn();
    mockUseApp.mockReturnValue(baseAppValue({ registerVisitor }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

    await user.type(screen.getByPlaceholderText('pl. anna@pelda.hu'), 'anna@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'titkosjelszo123');
    await user.click(screen.getByRole('button', { name: /Regisztráció E-maillel/i }));

    expect(registerVisitor).not.toHaveBeenCalled();
  });
});

describe('LoginModal -- hibauzenet megjelenitese', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('megjeleniti a login() altal visszaadott hibauzenetet sikertelen bejelentkezesnel', async () => {
    const login = vi.fn().mockResolvedValue({ success: false, message: 'Hibás email vagy jelszó.' });
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('pl. anna@pelda.hu'), 'anna@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'rosszjelszo');
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    expect(await screen.findByText('Hibás email vagy jelszó.')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('anna@example.com', 'rosszjelszo');
  });

  it('a login() dobott kivetelenel a general hiba-szoveget jeleniti meg, nem crashel', async () => {
    const login = vi.fn().mockRejectedValue(new Error('network down'));
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('pl. anna@pelda.hu'), 'anna@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'valamijelszo');
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    expect(await screen.findByText('Hiba történt a bejelentkezés során.')).toBeInTheDocument();
  });
});

describe('LoginModal -- loading allapot', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('a submit gomb "Belépés..."-re valt es letiltodik, amig a login() promise fugg', async () => {
    let resolveLogin: (v: { success: boolean; message?: string }) => void = () => {};
    const login = vi.fn(() => new Promise<{ success: boolean; message?: string }>((resolve) => { resolveLogin = resolve; }));
    mockUseApp.mockReturnValue(baseAppValue({ login }));
    const user = userEvent.setup();

    render(<LoginModal isOpen={true} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('pl. anna@pelda.hu'), 'anna@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'titkosjelszo123');
    await user.click(screen.getByRole('button', { name: /Belépés E-maillel/i }));

    const pendingButton = await screen.findByRole('button', { name: /Belépés\.\.\./i });
    expect(pendingButton).toBeDisabled();

    resolveLogin({ success: true });
    await waitFor(() => expect(screen.queryByRole('button', { name: /Belépés\.\.\./i })).not.toBeInTheDocument());
  });
});
