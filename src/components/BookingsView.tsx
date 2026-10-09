import React, { useState } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Ticket, Compass, Eye, Sparkles, ArrowRight, Users } from 'lucide-react';
import { Order, OrderStatus } from '../types/database';
import { BookingDetailModal } from './BookingDetailModal';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Függőben',
  confirmed: 'Megerősítve',
  cancelled: 'Lemondva',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
};

export const BookingsView: React.FC = () => {
  const {
    orders,
    programs,
    isAuthenticated,
    currentUser,
    setCurrentView,
    openLoginModal,
  } = useApp();

  useDocumentMeta('Foglalásaim', 'Korábbi és aktuális helyfoglalásaid egy áttekinthető listában.');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Ticket className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full mb-4 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kizárólag Bejelentkezett Programvadászoknak</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mb-4">
            Foglalásaim
          </h1>

          <p className="text-stone-600 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            A helyfoglalásaid áttekintése, visszaigazolásuk és a szolgáltatói elérhetőségek kizárólag a saját, személyes fiókodban érhetők el.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openLoginModal('A foglalásaid megtekintéséhez kérjük, lépj be a fiókodba!')}
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Bejelentkezés vagy Regisztráció</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full sm:w-auto px-6 py-3.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              Programok böngészése
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Legújabb foglalás felül (kanban 4a2bbf40 point 1) -- a context mar created_at
  // szerint csokkeno sorrendben tolti be/prependeli az orders tombot, ez a sort csak
  // a garancia, nem a fetch/insert sorrendjetol fuggoen.
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) || null : null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pb-8 border-b border-stone-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Ticket className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900">
            Foglalásaim ({orders.length})
          </h1>
          <p className="text-sm text-stone-500">{currentUser?.name || currentUser?.email}</p>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900">
              Még nincs helyfoglalásod
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
              A programok részletes nézetén foglalhatsz helyet magyar nyelvű vezetéssel.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="px-6 py-2.5 bg-stone-900 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm inline-flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Programok felfedezése</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedOrders.map((order) => {
            const prog = order.program || programs.find(p => p.id === order.program_id || p.slug === order.program_id);
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base truncate mb-1.5">
                    {prog?.title || 'Program'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span>{formatDate(order.created_at)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{order.participants_count} fő</span>
                    <span className="font-semibold text-stone-700">{formatPrice(order.total_price)} {order.currency === 'EUR' ? '€' : order.currency}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${ORDER_STATUS_CLASS[order.status]}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className="shrink-0 px-4 py-2.5 bg-stone-900 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Megtekintés</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <BookingDetailModal order={selectedOrder} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};
