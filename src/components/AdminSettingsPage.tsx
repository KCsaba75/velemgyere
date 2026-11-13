import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, RotateCcw, LogOut, Check, RefreshCw, ChevronDown, Send, AlertCircle, MailCheck } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BookingPushNotificationCard } from './BookingPushNotificationCard';
import { SimpleTextPageEditorCard, ContactPageEditorCard, HowItWorksEditorCard, FaqEditorCard, AboutUsEditorCard } from './AdminPageContentEditors';

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): a korabbi Admin
// Vezerlopult "Beallitasok" (dij+arfolyam) es "Erdeklodesek" fulje, plusz a
// kijelentkezes/tesztadat-reset -- ezeknek nincs sajat targymenuje Csaba
// 6-pontos listajaban, igy egy lecsupaszitott oldalon maradnak. A Navbar egy
// kis fogaskerek-ikonja nyitja, nem foglal helyet az 5 fix targymenu-gomb
// kozott (lasd Navbar.tsx admin "Beallitasok" gombja).
export const AdminSettingsPage: React.FC = () => {
  const {
    currentUser,
    updateMyProfile,
    inquiries,
    contactMessages,
    markContactMessageRead,
    replyToContactMessage,
    resetToDefaults,
    feePercentage,
    feeMinimumEur,
    updateFeeSettings,
    eurHufRate,
    eurHufLastUpdated,
    updateEurHufRate,
    fetchAndApplyLiveRate,
    socialLinks,
    updateSocialLinks,
    logout,
  } = useApp();

  useDocumentMeta('Admin beállítások', 'Foglalási díj, EUR/HUF árfolyam, érdeklődések és rendszer-műveletek.');

  // Fee settings editor (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF): local
  // draft inputs, only written on save.
  const [feePercentageDraft, setFeePercentageDraft] = useState(String(feePercentage));
  const [feeMinimumEurDraft, setFeeMinimumEurDraft] = useState(String(feeMinimumEur));
  const [feeSettingsSaving, setFeeSettingsSaving] = useState(false);
  const [feeSettingsSaved, setFeeSettingsSaved] = useState(false);

  // Kapcsolati üzenetek panel (kanban 6f9ad755 bővítés, Csaba msg 3189): egyszerre
  // csak egy sor van kinyitva, a válasz-draft is csak az éppen kinyitott sorhoz él.
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyResult, setReplyResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleToggleMessage = (id: string) => {
    if (expandedMessageId === id) {
      setExpandedMessageId(null);
      return;
    }
    setExpandedMessageId(id);
    setReplyDraft('');
    setReplyResult(null);
    markContactMessageRead(id);
  };

  const handleSendReply = async (id: string) => {
    setReplySubmitting(true);
    setReplyResult(null);
    const result = await replyToContactMessage(id, replyDraft);
    setReplySubmitting(false);
    setReplyResult(result);
    if (result.success) {
      setReplyDraft('');
    }
  };

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

  // Kanban 71915a0a (1-3. pont): lablec FB/Instagram/TikTok URL-jeinek admin
  // szerkesztese, ugyanaz a draft-input-majd-mentes minta mint a dij/arfolyam
  // kartyaknal fent.
  const [socialLinksDraft, setSocialLinksDraft] = useState(socialLinks);
  const [socialLinksSaving, setSocialLinksSaving] = useState(false);
  const [socialLinksSaved, setSocialLinksSaved] = useState(false);

  React.useEffect(() => {
    setSocialLinksDraft(socialLinks);
  }, [socialLinks]);

  const handleSaveSocialLinks = async () => {
    setSocialLinksSaving(true);
    try {
      await updateSocialLinks({
        facebook: socialLinksDraft.facebook.trim(),
        instagram: socialLinksDraft.instagram.trim(),
        tiktok: socialLinksDraft.tiktok.trim(),
      });
      setSocialLinksSaved(true);
      setTimeout(() => setSocialLinksSaved(false), 2500);
    } finally {
      setSocialLinksSaving(false);
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

      {/* Közösségi média linkek (lábléc, kanban 71915a0a) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <h3 className="font-display font-bold text-stone-900 text-lg">Közösségi média linkek (lábléc)</h3>
        <p className="text-sm text-stone-600">
          A lábléc bal oldalán megjelenő ikonok URL-je. Üresen hagyva az adott platform ikonja nem jelenik meg a láblécben.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Facebook</label>
            <input
              type="url"
              value={socialLinksDraft.facebook}
              onChange={(e) => setSocialLinksDraft({ ...socialLinksDraft, facebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Instagram</label>
            <input
              type="url"
              value={socialLinksDraft.instagram}
              onChange={(e) => setSocialLinksDraft({ ...socialLinksDraft, instagram: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">TikTok</label>
            <input
              type="url"
              value={socialLinksDraft.tiktok}
              onChange={(e) => setSocialLinksDraft({ ...socialLinksDraft, tiktok: e.target.value })}
              placeholder="https://tiktok.com/@..."
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveSocialLinks}
            disabled={socialLinksSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60"
          >
            {socialLinksSaving ? 'Mentés...' : 'Mentés'}
          </button>
          {socialLinksSaved && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Mentve
            </span>
          )}
        </div>
      </div>

      {/* Platform + Ugyfelszolgalat aloldalak tartalma (kanban 71915a0a, 4-6. pont) */}
      <div className="space-y-4">
        <div>
          <h3 className="font-display font-bold text-stone-900 text-lg">Oldalak tartalma (Platform / Ügyfélszolgálat)</h3>
          <p className="text-sm text-stone-600">
            A lábléc Platform és Ügyfélszolgálat oszlopaiban elérhető 7 aloldal szövege és képe itt szerkeszthető.
          </p>
        </div>
        <HowItWorksEditorCard />
        <AboutUsEditorCard />
        <SimpleTextPageEditorCard slug="pricing" cardTitle="Árazás és fizetés" defaultTitle="Árazás és fizetés" />
        <FaqEditorCard />
        <ContactPageEditorCard />
        <SimpleTextPageEditorCard slug="terms" cardTitle="Általános Szerződési Feltételek" defaultTitle="Általános Szerződési Feltételek" legalWarning />
        <SimpleTextPageEditorCard slug="privacy" cardTitle="Adatkezelési Tájékoztató" defaultTitle="Adatkezelési Tájékoztató" legalWarning />
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

      {/* Push-értesítés kapcsolati üzenetekre (kanban 248d2841, Csaba IGEN) --
          ugyanaz a komponens/mechanizmus mint a foglalás-chat push-nál
          (MyAccountView), csak más leíró szöveggel. */}
      {currentUser.user_id && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-stone-900 text-lg">Push-értesítés</h3>
          <BookingPushNotificationCard
            userId={currentUser.user_id}
            initialEnabled={currentUser.push_notifications_enabled ?? true}
            description="Azonnali böngésző-értesítés új kapcsolati üzenetről, akkor is, ha nem az oldalon vagy éppen."
            onSavePreference={async (enabled) => {
              await updateMyProfile({ push_notifications_enabled: enabled });
            }}
          />
        </div>
      )}

      {/* Kapcsolati üzenetek (kanban 6f9ad755, bővítve msg 3189) -- a sajat-fiokom
          lapon megszunt "Erdeklodeseim" blokk uj, "Kapcsolat / Kerdesem van"
          uzenetkuldo formjanak az ADMIN-oldali olvaso+valaszolo nezete.
          Kinyithato sor (olvasashoz, status 'new'->'read'), es egy valasz-urlap
          (send-contact-reply Edge Function -- email a felhasznalonak +
          status->'resolved'). */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-stone-900 text-lg">Kapcsolati üzenetek</h3>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Felhasználóktól beérkezett üzenetek ({contactMessages.length})</span>
            {contactMessages.some(m => m.status === 'new') && (
              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {contactMessages.filter(m => m.status === 'new').length} új
              </span>
            )}
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
                const isExpanded = expandedMessageId === msg.id;
                return (
                  <div key={msg.id} className={isExpanded ? 'bg-emerald-50/30' : ''}>
                    <button
                      type="button"
                      onClick={() => handleToggleMessage(msg.id)}
                      className="w-full text-left p-5 hover:bg-stone-50/50 transition-colors space-y-1.5 cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-stone-700">
                          {msg.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                          <span>👤 <strong className="text-stone-900">{msg.name}</strong></span>
                          <span className="text-stone-400">• {msg.email}</span>
                          {msg.status === 'resolved' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <MailCheck className="w-3 h-3" /> Megválaszolva
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-stone-400">{formattedDate}</span>
                          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <p className="text-sm text-stone-700 truncate">{msg.message}</p>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-3">
                        <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-sm text-stone-800">
                          {msg.message}
                        </div>

                        {msg.admin_reply && (
                          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-sm text-emerald-900">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                              A válaszod ({msg.replied_at ? new Date(msg.replied_at).toLocaleString('hu-HU') : ''}):
                            </span>
                            {msg.admin_reply}
                          </div>
                        )}

                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            placeholder={msg.admin_reply ? 'Újabb válasz küldése...' : 'Válasz írása (emailben kimegy a felhasználónak)...'}
                            className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          />

                          {replyResult && (
                            <div className={`text-xs font-semibold rounded-xl p-2.5 flex items-center gap-2 ${
                              replyResult.success
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {replyResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                              <span>{replyResult.message}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendReply(msg.id)}
                            disabled={replySubmitting || !replyDraft.trim()}
                            className="px-4 py-2 bg-stone-900 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{replySubmitting ? 'Küldés...' : 'Válasz küldése emailben'}</span>
                          </button>
                        </div>
                      </div>
                    )}
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
