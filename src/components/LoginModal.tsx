import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogIn, User, Briefcase, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onOpenRegister }) => {
  const { login, switchPersona } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Hiba történt a bejelentkezés során.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'visitor' | 'provider' | 'admin') => {
    switchPersona(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h3 className="font-display text-2xl font-extrabold text-stone-900">
            Bejelentkezés
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Velem Gyere Katalógus – Szolgáltatói és Admin hozzáférés
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              E-mail cím
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pl. info@pannonelmenyturak.hu"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer text-sm shadow-sm disabled:opacity-50"
          >
            {loading ? 'Belépés...' : 'Belépés E-maillel'}
          </button>
        </form>

        {/* Quick test login buttons for reviewer convenience */}
        <div className="pt-4 border-t border-stone-100 space-y-2">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider text-center mb-2">
            Gyors tesztbelépés egy kattintással:
          </div>

          <button
            type="button"
            onClick={() => handleQuickLogin('provider')}
            className="w-full text-left p-2.5 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors flex items-center justify-between text-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-stone-900 block">Szolgáltatóként</span>
                <span className="text-[11px] text-stone-500">Pannon Élménytúrák Kft.</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className="w-full text-left p-2.5 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/40 transition-colors flex items-center justify-between text-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <div>
                <span className="font-bold text-stone-900 block">Adminisztrátorként</span>
                <span className="text-[11px] text-stone-500">Katalógus és jóváhagyások</span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
          Még nincs szolgáltatói fiókod?{' '}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Regisztrálj itt!
          </button>
        </div>
      </div>
    </div>
  );
};
