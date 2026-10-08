import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogIn, Sparkles, Building2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, registerVisitor, setCurrentView, loginModalMessage } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setInfoMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (mode === 'register' && !name.trim()) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const res = mode === 'login'
        ? await login(email.trim(), password)
        : await registerVisitor({ name: name.trim(), email: email.trim(), password });

      if (res.success) {
        if (mode === 'register') {
          // Signup succeeded but may still be waiting on email confirmation --
          // show the message instead of silently closing (there may be no session yet).
          setInfoMessage(res.message);
        } else {
          resetAndClose();
        }
      } else {
        setError(res.message);
      }
    } catch {
      setError(mode === 'login' ? 'Hiba történt a bejelentkezés során.' : 'Hiba történt a regisztráció során.');
    } finally {
      setLoading(false);
    }
  };

  const goToProviderLanding = () => {
    resetAndClose();
    setCurrentView('provider-landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {mode === 'login' ? 'Bejelentkezés' : 'Regisztráció'}
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

        {/* Login / Register tab toggle */}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? (mode === 'login' ? 'Belépés...' : 'Regisztráció...') : (mode === 'login' ? 'Belépés E-maillel' : 'Regisztráció E-maillel')}
          </button>
        </form>

        {/* Google placeholder -- not wired yet, separate dependency (Google Cloud OAuth setup) */}
        <button
          type="button"
          disabled
          title="Hamarosan -- külön lépésben kerül bekötésre"
          className="w-full border border-stone-200 text-stone-400 font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg>
          Google-lal (hamarosan)
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
      </div>
    </div>
  );
};
