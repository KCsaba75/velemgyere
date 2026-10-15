import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleAuth() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const errorDesc = searchParams.get('error_description') || searchParams.get('error');

        if (errorDesc) {
          if (mounted) {
            setStatus('error');
            setErrorMessage(errorDesc);
          }
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            if (mounted) {
              setStatus('error');
              setErrorMessage(exchangeError.message);
            }
            return;
          }
        } else {
          // Implicit flow returns hash fragments (#access_token=...&refresh_token=...)
          const { data: sessData, error: sessError } = await supabase.auth.getSession();
          if (sessError) {
            console.error('Error getting session from callback:', sessError);
            if (mounted) {
              setStatus('error');
              setErrorMessage(sessError.message);
            }
            return;
          }
          if (!sessData.session && !window.location.hash.includes('access_token')) {
            // Wait slightly for supabase auth listener to complete hash extraction
            await new Promise((r) => setTimeout(r, 800));
          }
        }

        if (mounted) {
          setStatus('success');
        }

        // Send message to parent window if opened in a popup window
        if (window.opener && window.opener !== window) {
          try {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          } catch (e) {
            console.warn('Could not postMessage to opener:', e);
          }
          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          // Top-level navigation: redirect to programs catalog
          setTimeout(() => {
            navigate('/programok', { replace: true });
          }, 800);
        }
      } catch (err: any) {
        console.error('OAuth callback failed:', err);
        if (mounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'Hiba történt a Google azonosítás feldolgozása során.');
        }
      }
    }

    handleAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 bg-stone-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-stone-200">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <h2 className="text-xl font-bold text-stone-900 font-display">Google bejelentkezés folyamatban...</h2>
            <p className="text-sm text-stone-500">Kérjük várj egy pillanatot, amíg feldolgozzuk a belépést.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">Sikeres bejelentkezés!</h2>
            <p className="text-sm text-stone-500">
              {window.opener ? 'Az ablak automatikusan bezáródik...' : 'Átirányítás a programokhoz...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-display">Bejelentkezési hiba</h2>
            <p className="text-xs text-rose-700 bg-rose-50 p-3.5 rounded-xl border border-rose-200 leading-relaxed text-left">
              {errorMessage || 'Nem sikerült azonosítani a Google fiókot. Kérjük próbáld újra!'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  navigate('/', { replace: true });
                }
              }}
              className="mt-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              {window.opener ? 'Ablak bezárása' : 'Vissza a főoldalra'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
