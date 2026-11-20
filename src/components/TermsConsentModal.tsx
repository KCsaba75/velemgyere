import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Kanban 32ad8a91: Google-regisztracional nincs hagyomanyos form-submit lepes,
// ahol egy checkbox mar elfogadtathatta volna az ASZF-et belepes elott -- ez a
// modal az elso OAuth-bejelentkezes utan, MIELOTT a profiles-sor (es ezzel a
// fiok) letrejon, keri be ugyanazt az elfogadast. Mar regisztralt fiokoknal
// (syncFromSession mar talal profilt) sosem jelenik meg ujra, lasd AppContext.
export const TermsConsentModal: React.FC = () => {
  const { pendingTermsConsent, acceptTermsAndActivateAccount, declineTermsAndSignOut } = useApp();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decliningLoading, setDecliningLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pendingTermsConsent) return null;

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    setError(null);
    const res = await acceptTermsAndActivateAccount();
    if (!res.success) {
      setError(res.message);
      setLoading(false);
    }
    // Sikeres eseten a syncFromSession (USER_UPDATED esemeny) maga zarja a modalt,
    // amint a profiles-sor letrejott -- nincs mit itt helyben lezarni.
  };

  const handleDecline = async () => {
    setDecliningLoading(true);
    await declineTermsAndSignOut();
    setDecliningLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-display text-2xl font-extrabold text-stone-900">Még egy lépés</h3>
          <p className="text-xs text-stone-500 mt-1">
            {pendingTermsConsent.displayName}, a fiókod aktiválásához el kell fogadnod az ÁSZF-et.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <label className="flex items-start gap-2.5 text-sm text-stone-700 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span>
            Elfogadom az{' '}
            <a
              href="/aszf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-semibold hover:underline"
            >
              Általános Szerződési Feltételeket
            </a>
            .
          </span>
        </label>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || loading || decliningLoading}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Aktiválás...' : 'Elfogadom és folytatom'}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={loading || decliningLoading}
            className="w-full text-stone-500 hover:text-stone-700 font-semibold py-2 rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50"
          >
            {decliningLoading ? 'Kijelentkezés...' : 'Mégsem, kijelentkezés'}
          </button>
        </div>
      </div>
    </div>
  );
};
