import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogIn, Sparkles, Building2, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle, registerVisitor, requestPasswordReset, setCurrentView, loginModalMessage, loginRedirectTo } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setMode('login');
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setInfoMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode !== 'forgot' && !password) return;
    if (mode === 'register' && !name.trim()) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = mode === 'login'
        ? await login(email.trim(), password)
        : mode === 'forgot'
          ? await requestPasswordReset(email.trim())
          : await registerVisitor({ name: name.trim(), email: email.trim(), password });

      if (res.success) {
        if (mode === 'register' || mode === 'forgot') {
          // Signup confirmation / password-reset email: nothing more to do client-side
          // yet (no session), just show the confirmation message instead of closing.
          setInfoMessage(res.message);
        } else {
          if (loginRedirectTo) {
            // Kartya cde7bd96: a 'programs' a Fiok-gomb szerep-ismeret elotti,
            // generikus celpontja -- szolgaltatonal a Foglalasok legyen helyette
            // az alapertelmezett kezdonezet. 'res.role' a login()/loginWithGoogle()
            // valaszaban mar megvan MOST, nincs szukseg a kesobbi, aszinkron
            // session-sync effektre varni (az akkorra mar zarva talalna a modalt).
            const target = ('role' in res && res.role === 'provider' && loginRedirectTo === 'programs')
              ? 'provider-bookings'
              : loginRedirectTo;
            setCurrentView(target);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          resetAndClose();
        }
      } else {
        setError(res.message);
      }
    } catch {
      setError(
        mode === 'login' ? 'Hiba történt a bejelentkezés során.'
          : mode === 'forgot' ? 'Hiba történt a kérés feldolgozása során.'
            : 'Hiba történt a regisztráció során.'
      );
    } finally {
      setLoading(false);
    }
  };

  const goToProviderLanding = () => {
    resetAndClose();
    setCurrentView('provider-landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        if (loginRedirectTo) {
          setCurrentView(loginRedirectTo);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        resetAndClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Hiba történt a Google bejelentkezés során.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={resetAndClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h3 className="font-display text-2xl font-extrabold text-stone-900">
            {mode === 'login' ? 'Bejelentkezés' : mode === 'register' ? 'Regisztráció' : 'Elfelejtett jelszó'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Velem Gyere Katalógus
          </p>
        </div>

        {loginModalMessage && (
          <div className="bg-amber-50 border border-amber-200/80 text-amber-900 text-xs rounded-2xl p-3.5 mb-5 flex items-start gap-2.5 shadow-xs animate-in fade-in duration-150">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">
              {loginModalMessage}
            </div>
          </div>
        )}

        {/* Login / Register tab toggle -- "elfelejtett jelszó" módban elrejtve, oda csak
            a login-form alatti linkkel lehet eljutni, nem a tab-valtoval */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl mb-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfoMessage(null); }}
              className={`py-2 rounded-lg transition-colors cursor-pointer ${mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Belépés
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setInfoMessage(null); }}
              className={`py-2 rounded-lg transition-colors cursor-pointer ${mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Regisztráció
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 mb-4">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 mb-4">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Teljes név
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pl. Kovács Anna"
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              E-mail cím
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pl. anna@pelda.hu"
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Jelszó
              </label>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setPassword(''); setError(null); setInfoMessage(null); }}
                  className="mt-1.5 text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  Elfelejtett jelszó?
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading
              ? (mode === 'login' ? 'Belépés...' : mode === 'forgot' ? 'Küldés...' : 'Regisztráció...')
              : (mode === 'login' ? 'Belépés E-maillel' : mode === 'forgot' ? 'Visszaállító link küldése' : 'Regisztráció E-maillel')}
          </button>
        </form>

        {mode === 'forgot' ? (
          <div className="text-center text-xs text-stone-500">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfoMessage(null); }}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Vissza a bejelentkezéshez
            </button>
          </div>
        ) : (
          <>
            {/* Elválasztó vonal */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-stone-400 font-medium tracking-wider">vagy</span>
              </div>
            </div>

            {/* Aktív Google Bejelentkezés */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-3 transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                  <span>Kapcsolódás a Google-hoz...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Folytatás Google fiókkal</span>
                </>
              )}
            </button>

            <div className="mt-6 text-center text-xs text-stone-500">
              Szolgáltató vagy, és programokat szeretnél kínálni?{' '}
              <button
                type="button"
                onClick={goToProviderLanding}
                className="text-emerald-700 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                Szolgáltatói regisztráció
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
