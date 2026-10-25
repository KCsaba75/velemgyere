import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

// Kartya af2a6460 (Csaba kerese): elfelejtett jelszo. Ez a cel-URL, amit a
// request-password-reset Edge Function emaile ad (?email=...&token=...) -- SAJAT,
// Supabase natÍv recovery-session-tol FUGGETLEN token (lasd AppContext.requestPasswordReset
// kommentjet -- a natÍv flow megosztott globalis mezoi a signup-confirm emailt is
// erintenek volna). Ezert itt NINCS Supabase auth session a mount pillanataban --
// a token+email a URL QUERY parameterekbol jon, nem hash-fragmentbol.
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkPasswordResetToken, confirmPasswordReset } = useApp();
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired' | 'success'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!email || !token) {
        if (mounted) setStatus('expired');
        return;
      }
      const valid = await checkPasswordResetToken(email, token);
      if (mounted) setStatus(valid ? 'ready' : 'expired');
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 6) {
      setFormError('A jelszónak legalább 6 karakter hosszúnak kell lennie.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('A két jelszó nem egyezik.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await confirmPasswordReset(email, token, password);
      if (res.success) {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 2500);
      } else {
        setFormError(res.message);
      }
    } catch {
      setFormError('Hiba történt a jelszó frissítése során.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-stone-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-stone-200">
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <h2 className="text-xl font-bold text-stone-900 font-display">Link ellenőrzése...</h2>
            <p className="text-sm text-stone-500">Kérjük várj egy pillanatot.</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">Új jelszó beállítása</h2>
            <form onSubmit={handleSubmit} className="w-full space-y-4 text-left mt-2">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Új jelszó
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Új jelszó megerősítése
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer text-sm shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Mentés...' : 'Jelszó mentése'}
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">Jelszó frissítve!</h2>
            <p className="text-sm text-stone-500">Átirányítás a főoldalra -- ott az új jelszavaddal jelentkezhetsz be.</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">A link nem érvényes</h2>
            <p className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-xl border border-rose-200 leading-relaxed">
              A visszaállító link érvénytelen, lejárt, vagy már felhasználtad. Kérj egy új linket a bejelentkezési ablak "Elfelejtett jelszó?" linkjével.
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              Vissza a főoldalra
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
