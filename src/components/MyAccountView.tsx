import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { User, MessageSquare, Calendar, Compass, BadgeEuro, Ticket, X, Building2, Phone, Mail, Globe, Banknote, Wallet } from 'lucide-react';
import { OrderStatus, OrderProviderContact, OnsitePaymentMethod } from '../types/database';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Függőben (adminisztrátori jóváhagyásra vár)',
  confirmed: 'Megerősítve',
  cancelled: 'Lemondva',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
};

export const MyAccountView: React.FC = () => {
  const { currentUser, inquiries, orders, creditTransactions, creditBalance, cancelOrder, getProviderContactForOrder, setCurrentView } = useApp();

  useDocumentMeta('Saját fiókom', 'Korábbi érdeklődéseid, foglalásaid, kredit-egyenleged és fiókadataid egy helyen.');

  // Provider contact per confirmed order (kanban fbf552b2 point 5a) -- resolved
  // server-side, only for the buyer's own confirmed order, see schema.sql.
  const [providerContacts, setProviderContacts] = useState<Record<string, OrderProviderContact>>({});
  const confirmedOrderIds = orders.filter(o => o.status === 'confirmed').map(o => o.id).join(',');

  useEffect(() => {
    const confirmedIds = confirmedOrderIds ? confirmedOrderIds.split(',') : [];
    let cancelled = false;
    confirmedIds.forEach(id => {
      getProviderContactForOrder(id).then(contact => {
        if (cancelled || !contact) return;
        setProviderContacts(prev => ({ ...prev, [id]: contact }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedOrderIds]);

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

      {/* Credit balance (kanban 71215856 point 5) */}
      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 mb-10 flex items-center justify-between gap-4">
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
        <p className="text-xs text-stone-500 max-w-xs text-right">
          Regisztrációs ajándék és meghiúsult programok visszatérítése itt gyűlik -- kifizetését az ügyfélszolgálat intézi.
        </p>
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

      {/* Orders / reservations (point 2) */}
      <div className="flex items-center gap-2 mb-5">
        <Ticket className="w-5 h-5 text-stone-400" />
        <h2 className="font-display text-lg font-bold text-stone-900">
          Foglalásaim ({orders.length})
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center mb-10">
          <Ticket className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600">
            Még nincs helyfoglalásod. A programok részletes nézetén foglalhatsz helyet.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {orders.map(order => {
            const contact = providerContacts[order.id];
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm mb-1">
                      {order.program?.title || 'Program'}
                    </h3>
                    <p className="text-xs text-stone-500 mb-2">
                      {order.participants_count} fő · {order.total_price} {order.currency === 'EUR' ? '€' : order.currency}
                      {order.booking_fee > 0 && ` (fizetve online: ${order.booking_fee} € · helyszínen: ${order.onsite_amount} €)`} · {formatDate(order.created_at)}
                    </p>
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg border ${ORDER_STATUS_CLASS[order.status]}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  {order.status !== 'cancelled' && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-rose-600 font-semibold shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Lemondás
                    </button>
                  )}
                </div>

                {/* Full booking confirmation (kanban fbf552b2 point 5a): buyer's own data
                    (above), program details (above), provider's data + payment details
                    (below) -- only once confirmed, contact resolved via the RPC. */}
                {order.status === 'confirmed' && (
                  <div className="mt-4 pt-4 border-t border-stone-100 bg-emerald-50/40 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl space-y-3">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Foglalás visszaigazolása
                    </h4>
                    <div className="text-xs text-stone-600 space-y-1">
                      <div>👤 Foglaló: <strong className="text-stone-800">{currentUser.name}</strong> ({currentUser.email})</div>
                      <div className="flex items-center gap-1.5">
                        {order.onsite_payment_method === 'revolut' ? <Wallet className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                        Helyszíni fizetés módja: <strong className="text-stone-800">
                          {order.onsite_payment_method ? PAYMENT_METHOD_LABEL[order.onsite_payment_method] : 'nincs megadva'}
                        </strong>
                      </div>
                    </div>
                    {contact ? (
                      <div className="text-xs text-stone-600 space-y-1 pt-2 border-t border-emerald-100">
                        <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Kapcsolattartó: <strong className="text-stone-800">{contact.contact_name}</strong></div>
                        <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <strong className="text-stone-800">{contact.phone}</strong></div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> <strong className="text-stone-800">{contact.email}</strong></div>
                        {contact.website && (
                          <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> <a href={contact.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-semibold">{contact.website}</a></div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 pt-2 border-t border-emerald-100">Szolgáltató adatainak betöltése...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
