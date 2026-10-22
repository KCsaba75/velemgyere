import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  MessageSquare,
  UserCog,
  Save,
  Star,
  Banknote,
  Wallet,
  LogOut,
  FileText,
  Ticket,
  ExternalLink,
  Landmark
} from 'lucide-react';
import { OnsitePaymentMethod } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { GoogleCalendarSyncCard } from './GoogleCalendarSyncCard';

// Kanban 5a3a8dd8 (Csaba, 10-17 + pontositas 19:30 + masodik pontositas): a
// Programok, Foglalasok, Ertekelesek es Erdeklodesek kezelese is kikerult
// ebbol a Partner fiok oldalbol, mind onallo top-level menupont lett
// (ProviderProgramsPage / ProviderBookingsPage / ProviderReviewsPage /
// ProviderInquiriesPage, elerheto a lenti gyorslink-kartyakrol). Itt csak a
// fiokadatok (Fiokadatok) maradt, nincs tobb belso fules navigacio.

export const ProviderDashboard: React.FC = () => {
  const {
    currentUser,
    currentProvider,
    reviews,
    programs,
    orders,
    getProviderRatingStats,
    updateProviderProfile,
    setCurrentView,
    logout
  } = useApp();

  useDocumentMeta('Partner fiók -- Szolgáltatói Dashboard', 'Fiókadatok kezelése.');

  // Profile tab: own-profile editable fields, seeded from currentProvider
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

  const ratingStats = getProviderRatingStats(currentProvider?.id || '');
  const publishedProgramsCount = programs.filter(p => p.provider_id === currentProvider?.id && p.status === 'published').length;
  const pendingOrdersCount = orders.filter(o => {
    const prog = programs.find(p => p.id === o.program_id);
    return prog?.provider_id === currentProvider?.id && o.status === 'pending';
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header welcome banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 backdrop-blur-xs flex items-center gap-1.5 w-max">
              <Building2 className="w-3.5 h-3.5" />
              Verifikált Partner
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
            Üdvözöljük, {currentProvider?.company_name || currentUser.name || 'Partnerünk'}!
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-xl">
            A Partner fiókodban tudod szerkeszteni a cégadataidat és kapcsolattartói elérhetőségeidet. A programjaidat és foglalásaidat az alábbi gyorsgombokkal vagy a fejléc menüjéből érheted el.
          </p>
        </div>

        <button
          onClick={logout}
          className="self-start md:self-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 backdrop-blur-xs transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Kijelentkezés</span>
        </button>
      </div>

      {/* Quick navigation cards (top-level pages extracted from former tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setCurrentView('provider-programs')}
          className="bg-white py-3 px-4 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left min-w-0 cursor-pointer group"
          title="Programjaim (önálló oldal)"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              Programjaim
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
              {publishedProgramsCount}
            </span>
          </div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1 mt-1 group-hover:text-emerald-700">
            <span>Kezelés</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('provider-bookings')}
          className="bg-white py-3 px-4 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left min-w-0 cursor-pointer group"
          title="Foglalásaim (önálló oldal)"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Ticket className="w-4 h-4 text-emerald-600 shrink-0" />
              Foglalásaim
            </span>
            {pendingOrdersCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                {pendingOrdersCount} új
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1 mt-1 group-hover:text-emerald-700">
            <span>Megnyitás</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('provider-reviews')}
          className="bg-white py-3 px-4 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left min-w-0 cursor-pointer group"
          title="Értékeléseim (önálló oldal)"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              Értékelések
            </span>
            <span className="text-xs font-bold text-stone-700 shrink-0">
              ★ {ratingStats.average ? ratingStats.average.toFixed(1) : '-'}
            </span>
          </div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1 mt-1 group-hover:text-emerald-700">
            <span>Megtekintés ({reviews.length})</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('provider-inquiries')}
          className="bg-white py-3 px-4 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left min-w-0 cursor-pointer group"
          title="Érdeklődések (önálló oldal)"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              Érdeklődések
            </span>
          </div>
          <div className="text-xs text-stone-400 truncate flex items-center gap-1 mt-1 group-hover:text-emerald-700">
            <span>Megnyitás</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* Own profile edit form */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-lg font-bold text-stone-900 font-display flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" />
            <span>Fiókadatok</span>
          </h3>
        </div>
        <p className="text-xs text-stone-500 mb-6">
          Ezek az adatok jelennek meg a felületen a vásárlók és az adminisztrátorok számára.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1">Cégnév / Vállalkozás neve</label>
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
              <label className="text-xs font-bold text-stone-600 block mb-1">E-mail cím</label>
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
              Elfogadott fizetési módok
            </label>
            <p className="text-xs text-stone-400 mb-2">
              Ez minden programodra érvényes, nem állítható program-szintenként. A vásárló a véglegesítésnél ezek közül választhat.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleProfilePaymentMethod('cash')}
                className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
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
                className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                  profileForm.accepted_payment_methods.includes('revolut')
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" /> Revolut
              </button>
              <button
                type="button"
                onClick={() => toggleProfilePaymentMethod('bank_transfer')}
                className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                  profileForm.accepted_payment_methods.includes('bank_transfer')
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" /> Előre utalás
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
    </div>
  );
};
