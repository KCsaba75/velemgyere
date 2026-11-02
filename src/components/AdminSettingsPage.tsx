import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, RotateCcw, LogOut, Check, RefreshCw } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): a korabbi Admin
// Vezerlopult "Beallitasok" (dij+arfolyam) es "Erdeklodesek" fulje, plusz a
// kijelentkezes/tesztadat-reset -- ezeknek nincs sajat targymenuje Csaba
// 6-pontos listajaban, igy egy lecsupaszitott oldalon maradnak. A Navbar egy
// kis fogaskerek-ikonja nyitja, nem foglal helyet az 5 fix targymenu-gomb
// kozott (lasd Navbar.tsx admin "Beallitasok" gombja).
export const AdminSettingsPage: React.FC = () => {
  const {
    inquiries,
    contactMessages,
    resetToDefaults,
    feePercentage,
    feeMinimumEur,
    updateFeeSettings,
    eurHufRate,
    eurHufLastUpdated,
    updateEurHufRate,
    fetchAndApplyLiveRate,
    logout,
  } = useApp();

  useDocumentMeta('Admin beállítások', 'Foglalási díj, EUR/HUF árfolyam, érdeklődések és rendszer-műveletek.');

  // Fee settings editor (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF): local
  // draft inputs, only written on save.
  const [feePercentageDraft, setFeePercentageDraft] = useState(String(feePercentage));
  const [feeMinimumEurDraft, setFeeMinimumEurDraft] = useState(String(feeMinimumEur));
  const [feeSettingsSaving, setFeeSettingsSaving] = useState(false);
  const [feeSettingsSaved, setFeeSettingsSaved] = useState(false);

  const handleSaveFeeSettings = async () => {
    // Kanban 84b90320 2. kor (Zora talalata): a mezok most focus-kor ureskent-tartasra
    // valtottak (lasd lejjebb onFocus) -- Number('') === 0, ami ATMENNE ezen a guardon
    // ha csak NaN-ra/negativra szurnenk, es egy koppints-majd-elvesz-gepeles-nelkul
    // interakcio csendben 0-ra irna at egy eles, minden jovobeli foglalast erinto
    // penzugyi beallitast. Explicit ures-string elutasitas kell a Number.isNaN mellett.
    if (feePercentageDraft.trim() === '' || feeMinimumEurDraft.trim() === '') return;
    const pct = Number(feePercentageDraft);
    const min = Number(feeMinimumEurDraft);
    if (Number.isNaN(pct) || pct < 0 || Number.isNaN(min) || min < 0) return;
    setFeeSettingsSaving(true);
    try {
      await updateFeeSettings({ fee_percentage: pct, fee_minimum_eur: min });
      setFeeSettingsSaved(true);
      setTimeout(() => setFeeSettingsSaved(false), 2500);
    } finally {
      setFeeSettingsSaving(false);
    }
  };

  // EUR/HUF Exchange Rate settings state & handlers
  const [eurRateDraft, setEurRateDraft] = useState<string>(String(eurHufRate));
  const [eurRateSaving, setEurRateSaving] = useState(false);
  const [eurRateSaved, setEurRateSaved] = useState(false);
  const [liveFetchLoading, setLiveFetchLoading] = useState(false);
  const [liveFetchMessage, setLiveFetchMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setEurRateDraft(String(eurHufRate));
  }, [eurHufRate]);

  const handleSaveEurRate = async () => {
    if (eurRateDraft.trim() === '') return;
    const parsed = Number(eurRateDraft);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    setEurRateSaving(true);
    try {
      await updateEurHufRate(parsed);
      setEurRateSaved(true);
      setTimeout(() => setEurRateSaved(false), 2500);
    } finally {
      setEurRateSaving(false);
    }
  };

  const handleFetchLiveRate = async () => {
    setLiveFetchLoading(true);
    setLiveFetchMessage(null);
    try {
      const rate = await fetchAndApplyLiveRate();
      if (rate && rate > 0) {
        setEurRateDraft(String(rate));
        setLiveFetchMessage(`Sikeresen frissítve az élő API-ból: 1 EUR = ${rate} HUF`);
      } else {
        setLiveFetchMessage('Nem sikerült az árfolyam lekérése az API-ból. Kérjük próbáld újra!');
      }
    } catch {
      setLiveFetchMessage('Hiba történt az árfolyam API hívása közben.');
    } finally {
      setLiveFetchLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin -- Rendszer Beállítások</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Beállítások & Érdeklődések
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (window.confirm('Biztosan visszaállítod a katalógust az eredeti tesztadatokra?')) {
                resetToDefaults();
              }
            }}
            className="text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Adatok visszaállítása alaphelyzetbe"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tesztadatok visszaállítása</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-xs font-bold text-stone-500 hover:text-rose-600 bg-white border border-stone-300 hover:border-rose-200 hover:bg-rose-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </div>

      {/* Fee + exchange rate settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Foglalási díj card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-display font-bold text-stone-900 text-lg">Foglalási díj</h3>
          <p className="text-sm text-stone-600">
            A foglalási díj = MAX(százalék × program nettó ára, minimum összeg). A programgazda a
            saját kézhez kapandó (nettó) összeget adja meg, erre számolódik rá a díj -- a vevő a
            teljes (nettó+díj) árat látja. Regisztrációkor a mindenkori minimum összeggel egyező
            ajándék-kredit kerül a visitor fiókjába -- a már kiadott kreditek és meglévő foglalások
            nem változnak utólag, ha itt módosítod az értékeket.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-40 text-xs font-bold text-stone-700 uppercase tracking-wider">Százalék</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feePercentageDraft}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                    val = val.replace(/^0+/, '');
                  }
                  setFeePercentageDraft(val);
                }}
                onFocus={() => setFeePercentageDraft('')}
                onBlur={() => { if (feePercentageDraft.trim() === '') setFeePercentageDraft(String(feePercentage)); }}
                className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-500">%</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-40 text-xs font-bold text-stone-700 uppercase tracking-wider">Minimum összeg</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feeMinimumEurDraft}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                    val = val.replace(/^0+/, '');
                  }
                  setFeeMinimumEurDraft(val);
                }}
                onFocus={() => setFeeMinimumEurDraft('')}
                onBlur={() => { if (feeMinimumEurDraft.trim() === '') setFeeMinimumEurDraft(String(feeMinimumEur)); }}
                className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-500">€</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveFeeSettings}
              disabled={feeSettingsSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60"
            >
              {feeSettingsSaving ? 'Mentés...' : 'Mentés'}
            </button>
            {feeSettingsSaved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mentve
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400">
            Jelenlegi érték élesben: {feePercentage.toFixed(2)}% (min. {feeMinimumEur.toFixed(2)} €)
          </p>
        </div>

        {/* EUR / HUF Árfolyam API & Beállítások card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-stone-900 text-lg">Napi Euro - Forint Árfolyam (API)</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              1 EUR = {eurHufRate} Ft
            </span>
          </div>
          <p className="text-sm text-stone-600">
            Az EUR összegű programkártyák törzsén a rendszer automatikusan megjeleníti a forintösszeget is zárójelben. A napi hivatalos középárfolyam lekérhető az API-ból, vagy kézzel is megadható.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-40 text-xs font-bold text-stone-700 uppercase tracking-wider">1 EUR Árfolyam (HUF)</label>
              <input
                type="number"
                min={1}
                step="0.01"
                value={eurRateDraft}
                onChange={(e) => setEurRateDraft(e.target.value)}
                className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
              <span className="text-sm text-stone-500">Ft</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleFetchLiveRate}
              disabled={liveFetchLoading}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60 transition-colors"
              title="Legfrissebb napi árfolyam lekérése"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveFetchLoading ? 'animate-spin' : ''}`} />
              <span>Napi árfolyam frissítése (API)</span>
            </button>

            <button
              onClick={handleSaveEurRate}
              disabled={eurRateSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer disabled:opacity-60 transition-colors"
            >
              {eurRateSaving ? 'Mentés...' : 'Árfolyam mentése'}
            </button>

            {eurRateSaved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mentve
              </span>
            )}
          </div>

          {liveFetchMessage && (
            <p className={`text-xs font-semibold p-2.5 rounded-xl border ${
              liveFetchMessage.includes('Sikeresen')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {liveFetchMessage}
            </p>
          )}

          <div className="pt-2 border-t border-stone-100 flex flex-col gap-1 text-xs text-stone-500">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Automata napi frissítés: AKTÍV (24 óránként automatikusan frissül)</span>
            </div>
            <p className="text-stone-400">
              Jelenlegi aktív árfolyam a rendszerben: 1 EUR = <strong>{eurHufRate} Ft</strong>
              {eurHufLastUpdated && (
                <span className="block text-[11px] mt-0.5 text-stone-400">
                  Legutóbbi frissítés: {new Date(eurHufLastUpdated).toLocaleString('hu-HU')}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Érdeklődések */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-stone-900 text-lg">Érdeklődések</h3>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
            Összes Beérkezett Érdeklődés ({inquiries.length})
          </div>

          <div className="divide-y divide-stone-100">
            {inquiries.map((inq) => {
              const formattedDate = new Date(inq.created_at).toLocaleString('hu-HU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div key={inq.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {inq.program_title}
                      </span>
                      <span className="text-xs text-stone-500">
                        • Szervező: <strong className="text-stone-700">{inq.provider_name}</strong>
                      </span>
                    </div>

                    <span className="text-xs text-stone-400">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 text-xs space-y-1">
                    <div className="flex flex-wrap gap-4 text-stone-700">
                      <div>👤 Érdeklődő: <strong className="text-stone-900">{inq.name}</strong></div>
                      <div>📧 E-mail: <a href={`mailto:${inq.email}`} className="text-emerald-700 hover:underline font-semibold">{inq.email}</a></div>
                      {inq.phone && <div>📞 Telefon: <strong className="text-stone-900">{inq.phone}</strong></div>}
                    </div>
                    {inq.message && (
                      <div className="text-stone-800 text-sm mt-2 italic pt-2 border-t border-stone-200">
                        "{inq.message}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kapcsolati üzenetek (kanban 6f9ad755) -- a sajat-fiokom lapon megszunt
          "Erdeklodeseim" blokk uj, "Kapcsolat / Kerdesem van" uzenetkuldo
          formjanak az ADMIN-oldali olvaso nezete. */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-stone-900 text-lg">Kapcsolati üzenetek</h3>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
            Felhasználóktól beérkezett üzenetek ({contactMessages.length})
          </div>

          {contactMessages.length === 0 ? (
            <div className="p-5 text-sm text-stone-500">Még nem érkezett kapcsolati üzenet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {contactMessages.map((msg) => {
                const formattedDate = new Date(msg.created_at).toLocaleString('hu-HU', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={msg.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-stone-700">
                        <span>👤 <strong className="text-stone-900">{msg.name}</strong></span>
                        <span>• <a href={`mailto:${msg.email}`} className="text-emerald-700 hover:underline font-semibold">{msg.email}</a></span>
                      </div>
                      <span className="text-xs text-stone-400">{formattedDate}</span>
                    </div>
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 text-sm text-stone-800">
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
