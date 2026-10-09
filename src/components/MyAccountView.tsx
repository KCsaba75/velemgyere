import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  User,
  MessageSquare,
  Calendar,
  Compass,
  BadgeEuro,
  Ticket,
  Heart,
  Phone,
  Mail,
  Save,
  Check,
  AlertCircle,
  Wallet,
  CreditCard,
  Receipt,
  Plus,
  Bell,
  Newspaper,
  Megaphone,
  Trash2,
  AlertTriangle,
  X,
  ShieldAlert
} from 'lucide-react';

export const MyAccountView: React.FC = () => {
  const {
    currentUser,
    inquiries,
    orders,
    creditTransactions,
    creditBalance,
    totalFavoritesCount,
    updateMyProfile,
    deleteMyAccount,
    setCurrentView
  } = useApp();

  useDocumentMeta('Saját fiókom', 'Személyes adataid, fizetési és kommunikációs beállításaid egy helyen.');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  // --- Block 1: személyes adatok ---
  const [formName, setFormName] = useState(currentUser.name || '');
  const [formEmail, setFormEmail] = useState(currentUser.email || '');
  const [formPhone, setFormPhone] = useState(currentUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    const result = await updateMyProfile({ name: formName.trim(), email: formEmail.trim(), phone: formPhone.trim() });
    setSavingProfile(false);
    setProfileMessage({ type: result.success ? 'success' : 'error', text: result.message });
  };

  // --- Block 3: kommunikáció ---
  const [notifyBooking, setNotifyBooking] = useState(currentUser.notify_booking_reminders ?? true);
  const [notifyNewsletter, setNotifyNewsletter] = useState(currentUser.notify_newsletter ?? true);
  const [notifyPromo, setNotifyPromo] = useState(currentUser.notify_promo ?? false);
  const [savingNotify, setSavingNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  const handleNotifySave = async () => {
    setSavingNotify(true);
    setNotifyMessage(null);
    const result = await updateMyProfile({
      notify_booking_reminders: notifyBooking,
      notify_newsletter: notifyNewsletter,
      notify_promo: notifyPromo,
    });
    setSavingNotify(false);
    setNotifyMessage(result.message);
  };

  // --- Block 4: fiók végleges törlése ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const deleteConfirmReady = deleteConfirmText.trim().toUpperCase() === 'TÖRLÉS';

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteMessage(null);
    const result = await deleteMyAccount();
    setDeleteSubmitting(false);
    setDeleteMessage({ type: result.success ? 'success' : 'error', text: result.message });
  };

  // Foglalási díjak, amiket ténylegesen kifizettél (Stripe demo) -- meglévő orders
  // adatból, új tranzakció-/számla-tár nélkül (kanban e3d1d669 point 4).
  const paidBookingFees = orders.filter(o => o.booking_fee > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-in fade-in duration-200">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900">
            Saját fiókom
          </h1>
          <p className="text-sm text-stone-500">{currentUser.name} · {currentUser.email}</p>
        </div>
      </div>

      {/* Quick-link chips: Kedvencek & Foglalásaim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Kedvencek</span>
              <span className="text-2xl font-extrabold text-stone-900 font-display">{totalFavoritesCount}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setCurrentView('favorites'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-white px-3 py-2 rounded-xl border border-rose-200 shadow-xs hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
          >
            Mappák &rarr;
          </button>
        </div>

        <div className="bg-stone-100/80 border border-stone-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-stone-200/80 text-stone-700 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">Foglalásaim</span>
              <span className="text-2xl font-extrabold text-stone-900 font-display">{orders.length}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setCurrentView('bookings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-white px-3 py-2 rounded-xl border border-stone-300 shadow-xs hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
          >
            Megnyitás &rarr;
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {/* BLOCK 1: Személyes adatok */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-stone-400" />
            <h2 className="font-display text-lg font-bold text-stone-900">Személyes adatok</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Név</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Emailcím
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefonszám
                </label>
                <input
                  type="tel"
                  placeholder="pl. +36 30 123 4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {profileMessage && (
              <div className={`text-xs font-semibold rounded-xl p-3 flex items-center gap-2 ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {profileMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-stone-900 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Mentés...' : 'Adatok mentése'}</span>
            </button>
          </form>
        </section>

        {/* BLOCK 2: Fizetés */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-stone-400" />
            <h2 className="font-display text-lg font-bold text-stone-900">Fizetés</h2>
          </div>

          {/* 2a. Kredit pénztárca */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Kredit pénztárca</h3>
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <BadgeEuro className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Egyenleg</span>
                <span className="text-2xl font-extrabold text-stone-900 font-display">{creditBalance.toFixed(2)} €</span>
              </div>
            </div>
            {creditTransactions.length > 0 && (
              <div className="space-y-1.5">
                {creditTransactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5">
                    <span>{t.note || t.type}</span>
                    <span className={`font-bold ${Number(t.amount) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2b. Fizetési mód -- kártya hozzáadása: EGYEZTETÉS ALATT, lásd kanban-komment */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Fizetési mód</h3>
            <div className="border border-dashed border-stone-300 rounded-2xl p-5 flex items-center justify-between gap-4 bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-stone-200/80 text-stone-500 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-stone-700 block">Mentett bankkártya hozzáadása</span>
                  <span className="text-xs text-stone-500">Ehhez valódi fizetési szolgáltató (Stripe) integráció és kártyaadat-tárolás kell -- Csaba jóváhagyására vár.</span>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 px-4 py-2 bg-stone-200 text-stone-500 font-bold rounded-xl text-xs cursor-not-allowed inline-flex items-center gap-1.5"
                title="Egyeztetés alatt Csabával -- lásd kanban e3d1d669"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Hamarosan</span>
              </button>
            </div>
          </div>

          {/* 2c. Tranzakciók -- meglévő orders.booking_fee adatból */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tranzakciók</h3>
            {paidBookingFees.length === 0 ? (
              <p className="text-xs text-stone-500 bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                Még nincs online rendezett kényelmi díj befizetésed.
              </p>
            ) : (
              <div className="space-y-1.5">
                {paidBookingFees.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 gap-3">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{o.program?.title || 'Program'} · {formatDate(o.created_at)}</span>
                    </span>
                    <span className="font-bold text-stone-900 shrink-0">{Number(o.booking_fee).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-stone-400">
              A fenti lista a foglalásaidhoz tartozó, online rendezett kényelmi díjakat mutatja. Letölthető számla egyelőre nem generálódik -- ez is egyeztetés alatt.
            </p>
          </div>
        </section>

        {/* BLOCK 3: Kommunikáció */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-stone-400" />
            <h2 className="font-display text-lg font-bold text-stone-900">Kommunikáció</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-stone-700">
                <Bell className="w-4 h-4 text-stone-400" />
                Foglalási emlékeztetők és visszaigazolások
              </span>
              <input
                type="checkbox"
                checked={notifyBooking}
                onChange={(e) => setNotifyBooking(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-stone-700">
                <Newspaper className="w-4 h-4 text-stone-400" />
                Hírlevél (új programok, úti célok)
              </span>
              <input
                type="checkbox"
                checked={notifyNewsletter}
                onChange={(e) => setNotifyNewsletter(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-stone-700">
                <Megaphone className="w-4 h-4 text-stone-400" />
                Akciók és kedvezmények
              </span>
              <input
                type="checkbox"
                checked={notifyPromo}
                onChange={(e) => setNotifyPromo(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </label>
          </div>

          {notifyMessage && (
            <div className="text-xs font-semibold rounded-xl p-3 flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Check className="w-4 h-4" />
              <span>{notifyMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleNotifySave}
            disabled={savingNotify}
            className="px-5 py-2.5 bg-stone-900 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{savingNotify ? 'Mentés...' : 'Beállítások mentése'}</span>
          </button>
        </section>

        {/* BLOCK 4: Fiók végleges törlése */}
        <section className="bg-rose-50/40 rounded-2xl border border-rose-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="font-display text-lg font-bold text-rose-900">Fiók végleges törlése</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            A fiókod és a hozzá kapcsolódó adataid (kedvencek, mappák, kredit-egyenleg) véglegesen törlődnek. A művelet nem vonható vissza.
          </p>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Fiók törlése</span>
          </button>
        </section>

        {/* BLOCK: Érdeklődéseim (meglévő funkció, változatlan) */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-stone-400" />
            <h2 className="font-display text-lg font-bold text-stone-900">
              Érdeklődéseim ({inquiries.length})
            </h2>
          </div>

          {inquiries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
              <Compass className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-600 mb-4">
                Még nem érdeklődtél egyetlen programnál sem.
              </p>
              <button
                onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer"
              >
                Böngéssz a programok között
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map(inq => (
                <div key={inq.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-stone-900 text-sm">{inq.program_title || 'Program'}</h3>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(inq.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-2">{inq.provider_name}</p>
                  {inq.message && (
                    <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3">{inq.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL: Fiók törlés megerősítése */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDeleteDialogOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg text-stone-900 leading-snug">
                  Biztosan törlöd a fiókodat?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ez a művelet végleges és nem vonható vissza.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Írd be: TÖRLÉS
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="TÖRLÉS"
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {deleteMessage && (
              <div className={`text-xs font-semibold rounded-xl p-3 flex items-start gap-2 ${
                deleteMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {deleteMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{deleteMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Mégsem
              </button>
              <button
                type="button"
                disabled={!deleteConfirmReady || deleteSubmitting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 disabled:bg-stone-300 disabled:cursor-not-allowed hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteSubmitting ? 'Törlés...' : 'Igen, végleges törlés'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
