import React from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { User, MessageSquare, Calendar, Compass, BadgeEuro, Ticket, Heart } from 'lucide-react';

export const MyAccountView: React.FC = () => {
  const {
    currentUser,
    inquiries,
    orders,
    creditTransactions,
    creditBalance,
    totalFavoritesCount,
    setCurrentView
  } = useApp();

  useDocumentMeta('Saját fiókom', 'Korábbi érdeklődéseid, kredit-egyenleged és fiókadataid egy helyen.');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  };

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

      {/* Stats Cards: Credit balance, Favorites & Bookings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BadgeEuro className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Kredit-egyenleg</span>
              <span className="text-2xl font-extrabold text-stone-900 font-display">
                {creditBalance.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Kedvencek</span>
              <span className="text-2xl font-extrabold text-stone-900 font-display">
                {totalFavoritesCount}
              </span>
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
              <span className="text-2xl font-extrabold text-stone-900 font-display">
                {orders.length}
              </span>
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

      {creditTransactions.length > 0 && (
        <div className="mb-10 space-y-2">
          {creditTransactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs text-stone-600 bg-white border border-stone-100 rounded-xl px-4 py-2.5">
              <span>{t.note || t.type}</span>
              <span className={`font-bold ${Number(t.amount) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
};
