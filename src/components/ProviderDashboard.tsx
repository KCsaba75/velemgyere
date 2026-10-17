import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  AlertCircle,
  MessageSquare,
  UserCog,
  Save,
  Star,
  Banknote,
  Wallet,
  LogOut,
  FileText,
  Ticket,
  ExternalLink
} from 'lucide-react';
import { OnsitePaymentMethod } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { GoogleCalendarSyncCard } from './GoogleCalendarSyncCard';

// Kanban 5a3a8dd8 (Csaba, 10-17 + pontositas 19:30): a Programok es Foglalasok
// kezelese kikerult ebbol a Partner fiok oldalbol, onallo top-level
// menupontok lettek (ProviderProgramsPage / ProviderBookingsPage, elerheto a
// Navbar "Programok"/"Foglalások" elemein providerkent). Itt csak a
// fiokadatok, az Ertekelesek es az Erdeklodesek-placeholder maradt.
//
// ISMERT, KORABBI HIBA (nem ebben a valtozasban keletkezett, lasd git
// 1225be4): az "Ertekelesek" fulnek sosem volt tenyleges render-blokkja a
// komponensben -- a fulre kattintva a tartalom ures volt. Ez a korabbi
// allapot is igy volt, itt szandekosan nem bovitettem/javitottam, csak
// athoztam a mar meglevo (ures) viselkedest, kulon jelzve a reviewban.
export const ProviderDashboard: React.FC = () => {
  const {
    currentUser,
    currentProvider,
    reviews,
    programs,
    orders,
    respondToReview,
    getProviderRatingStats,
    updateProviderProfile,
    setCurrentView,
    logout
  } = useApp();

  useDocumentMeta('Partner fiók -- Szolgáltatói Dashboard', 'Fiókadatok, értékelések és érdeklődések kezelése.');

  const [activeTab, setActiveTab] = useState<'reviews' | 'inquiries' | 'profile'>('profile');

  // Profile tab (kanban cfa4b20a point 1): own-profile editable fields, seeded from
  // currentProvider (hydrated via get_my_provider_profile) whenever it changes.
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    accepted_payment_methods: ['cash'] as OnsitePaymentMethod[],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!currentProvider) return;
    setProfileForm({
      company_name: currentProvider.company_name || '',
      contact_name: currentProvider.contact_name || '',
      phone: currentProvider.phone || '',
      email: currentProvider.email || '',
      website: currentProvider.website || '',
      description: currentProvider.description || '',
      accepted_payment_methods: currentProvider.accepted_payment_methods?.length
        ? currentProvider.accepted_payment_methods
        : ['cash'],
    });
  }, [currentProvider]);

  const toggleProfilePaymentMethod = (method: OnsitePaymentMethod) => {
    setProfileForm(prev => ({
      ...prev,
      accepted_payment_methods: prev.accepted_payment_methods.includes(method)
        ? prev.accepted_payment_methods.filter(m => m !== method)
        : [...prev.accepted_payment_methods, method],
    }));
  };

  const handleProfileSave = async () => {
    if (profileForm.accepted_payment_methods.length === 0) {
      setProfileMessage({ type: 'error', text: 'Legalább egy elfogadott fizetési módot ki kell választanod.' });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateProviderProfile(profileForm);
      setProfileMessage({ type: 'success', text: 'A profilod adatai elmentve.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err instanceof Error ? err.message : 'Ismeretlen hiba történt a mentés során.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;
  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const ownOrders = orders.filter(o => ownProgramIds.has(o.program_id) || ownPrograms.length === 0);

  const ownProgramSlugs = new Set(ownPrograms.map(p => p.slug));
  const providerReviews = reviews.filter(r =>
    ownProgramIds.has(r.program_id) ||
    ownProgramSlugs.has(r.program_id) ||
    (currentProvider && r.provider_id === currentProvider.id)
  );
  const providerStats = getProviderRatingStats(currentProvider?.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <div className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Szolgáltatói Fiók: {currentProvider?.company_name || currentUser.name}</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Üdvozöllek a partner felületen!
          </h1>
          <p className="hidden sm:block text-sm text-stone-500 mt-1">
            Kezeld a fiókadataidat, és kövesd figyelemmel az értékeléseidet.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-white text-stone-700 hover:text-stone-900 border-stone-200 hover:bg-stone-50'
            }`}
            title="Szolgáltatói fiókadatok szerkesztése"
          >
            <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
            <span className="truncate">Fiókadatok</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-500 hover:text-rose-600 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Kijelentkezés</span>
          </button>
        </div>
      </div>

      {/* Provider Status Alert -- pending, suspended vagy banned */}
      {currentProvider?.status === 'pending' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Fiókod adminisztrátori jóváhagyásra vár</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Hamarosan aktívvá válik -- addig a programjaid nem jelennek meg a publikus katalógusban.
            </p>
          </div>
        </div>
      )}
      {(currentProvider?.status === 'suspended' || currentProvider?.status === 'banned') && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              {currentProvider?.status === 'banned' ? 'Fiókod véglegesen letiltva' : 'Fiókod felfüggesztve'}
            </h4>
            <p className="text-xs text-rose-800 mt-0.5">
              Programjaid jelenleg nem jelennek meg a publikus katalógusban, és új programot sem tudsz felvenni.
              A meglévő foglalásaidat (visszaigazolás, lemondás) továbbra is tudod kezelni.
              {currentProvider?.status === 'suspended' ? ' Ez egy ideiglenes, visszavonható állapot.' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Gyorslinkek -- Programjaim es Foglalasaim mar onallo top-level oldalak,
          ide csak athivatkoznak; az Ertekeles marad helyi fulkent. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => setCurrentView('provider-programs')}
          className="bg-white py-2 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-xs sm:shadow-sm bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-300 transition-all text-center sm:text-left min-w-0 cursor-pointer"
          title="Programjaim kezelése (önálló oldal)"
        >
          <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 truncate leading-tight">
            <FileText className="w-3 h-3 shrink-0" /> Programjaim
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-emerald-600 leading-tight my-0.5">
            {ownPrograms.length}
          </div>
          <div className="text-[9px] sm:text-[11px] text-emerald-700/80 truncate leading-tight flex items-center justify-center sm:justify-start gap-0.5">
            Megnyitás <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('provider-bookings')}
          className="bg-white py-2 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs sm:shadow-sm hover:border-emerald-300 transition-all text-center sm:text-left min-w-0 cursor-pointer"
          title="Foglalásaim kezelése (önálló oldal)"
        >
          <span className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1 truncate leading-tight">
            <Ticket className="w-3 h-3 shrink-0" /> Foglalásaim
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-stone-800 leading-tight my-0.5">
            {ownOrders.length}
          </div>
          <div className="text-[9px] sm:text-[11px] text-stone-400 truncate leading-tight flex items-center justify-center sm:justify-start gap-0.5">
            Megnyitás <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`bg-white py-2 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl border transition-all text-center sm:text-left min-w-0 cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-50/50 to-white shadow-xs'
              : 'border-amber-100 shadow-xs sm:shadow-sm bg-gradient-to-br from-white to-amber-50/30 hover:border-amber-300'
          }`}
          title="Értékelések megtekintése"
        >
          <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider block truncate leading-tight">
            Értékelés
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-amber-600 flex items-center justify-center sm:justify-start gap-1 leading-tight my-0.5">
            <span>{providerStats.count > 0 ? providerStats.average.toFixed(1) : '5.0'}</span>
            <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400 shrink-0" />
          </div>
          <div className="text-[9px] sm:text-[11px] text-amber-700/80 truncate leading-tight">
            {providerReviews.length} vélemény
          </div>
        </button>
      </div>

      {/* Tabs navigation -- Ertekelesek + Erdeklodesek (Programok/Foglalasok mar onallo oldalak) */}
      <div className="grid grid-cols-2 sm:flex border-b border-stone-200 mb-6 gap-0.5 sm:gap-6">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Értékelések</span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">({providerReviews.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'inquiries'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Érdeklődések</span>
          </span>
        </button>
      </div>

      {/* Tab: Inquiries -- placeholder only (kanban 5a3a8dd8): a jövőbeli
          üzenőfelület helye, a funkció maga még nincs megépítve. */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-stone-800 font-display mb-1">
              Hamarosan: közvetlen üzenetküldés
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Ezen a fülön fog megjelenni a leendő üzenőfelület, ahol közvetlenül tudsz
              kommunikálni az érdeklődőkkel. Jelenleg fejlesztés alatt.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Own profile edit (kanban cfa4b20a point 1) --
          status/stripe_account_id/payouts_enabled/payment_mode are intentionally not
          editable here, see providers_self_profile_update migration. */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-base font-bold text-stone-800 font-display flex items-center gap-2">
              <UserCog className="w-5 h-5 text-emerald-600" />
              <span>Fiókadatok</span>
            </h3>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            Ezek az adatok jelennek meg a programjaidon, és ezeken ér el téged az admin és a vásárlók.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Cégnév</label>
              <input
                type="text"
                value={profileForm.company_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Kapcsolattartó neve</label>
              <input
                type="text"
                value={profileForm.contact_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, contact_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Telefonszám</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Weboldal (opcionális)</label>
              <input
                type="url"
                value={profileForm.website}
                onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Bemutatkozás</label>
              <textarea
                rows={4}
                value={profileForm.description}
                onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">
                Elfogadott fizetési mód helyszínen
              </label>
              <p className="text-xs text-stone-400 mb-2">
                Ez minden programodra érvényes, nem állítható program-szintenként. A vásárló csak az itt bejelölt módok közül választhat Véglegesítésnél.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleProfilePaymentMethod('cash')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    profileForm.accepted_payment_methods.includes('cash')
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Készpénz
                </button>
                <button
                  type="button"
                  onClick={() => toggleProfilePaymentMethod('revolut')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    profileForm.accepted_payment_methods.includes('revolut')
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Revolut
                </button>
              </div>
            </div>

            {profileMessage && (
              <div className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <button
              onClick={handleProfileSave}
              disabled={profileSaving || profileForm.accepted_payment_methods.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{profileSaving ? 'Mentés...' : 'Adatok mentése'}</span>
            </button>
          </div>

          {/* Google Naptár Szinkronizáció kártya a szolgáltató számára */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <GoogleCalendarSyncCard
              userId={currentProvider?.id || currentUser?.id || 'provider'}
              userType="provider"
              initialEnabled={currentProvider?.google_calendar_sync_enabled}
              onSavePreference={async (enabled) => {
                await updateProviderProfile({ google_calendar_sync_enabled: enabled });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
