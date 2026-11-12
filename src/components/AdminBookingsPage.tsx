import React, { useState } from 'react';
import { useApp, formatAmount, formatHuf, formatPlatformFee, getBookingReference } from '../context/AppContext';
import { priceInEur } from '../lib/priceUtils';
import { Ticket, Clock, Wallet, Landmark, Banknote } from 'lucide-react';
import { OnsitePaymentMethod } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { RescheduleOrderModal } from './RescheduleOrderModal';
import { FilterPillBar } from './FilterPillBar';
import { MetricsRow } from './MetricsRow';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
  bank_transfer: 'Előre utalás',
};

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): a Foglalasok
// nyilvantartasa & statuszfigyeles kikerult a kozos Admin Vezerlopult
// fulsorabol a sajat "Foglalasok" targymenuje ala, onallo top-level oldalra.
export const AdminBookingsPage: React.FC = () => {
  const { orders, openProgramDetail, eurHufRate } = useApp();

  useDocumentMeta('Foglalások -- Admin', 'Összes beérkezett foglalás nyilvántartása és státuszfigyelése.');

  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  // NOTE: a kereso-input mezo a korabbi AdminDashboard 'bookings' fulen sem
  // volt soha renderelve (csak a filter-logika hasznalta volna) -- ez a
  // viselkedes szandekosan megmaradt a kivalaskor, nem ennek a kartyanak a
  // scope-ja ujat epiteni ide.
  const [bookingSearch] = useState('');
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (bookingStatusFilter !== 'all' && o.status !== bookingStatusFilter) return false;
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      const matchTitle = (o.program?.title || '').toLowerCase().includes(q);
      const matchId = o.id.toLowerCase().includes(q);
      return matchTitle || matchId;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200 space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Foglalások
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Összes beérkezett foglalás nyilvántartása, fizetési/visszaigazolási státuszfigyelés, áthelyezés.
        </p>
      </div>

      {/* Metrics summary cards */}
      <MetricsRow
        metrics={[
          { label: 'Összes foglalás', value: orders.length },
          { label: 'Szolgáltatóra vár', value: orders.filter(o => o.status === 'pending').length, tone: 'amber' },
          { label: 'Megerősítve', value: orders.filter(o => o.status === 'confirmed').length, tone: 'emerald' },
          {
            label: 'Platform díjbevétel',
            value: (() => {
              // EUR-alapu osszegzes (Csaba dontese, kanban b0ece1bb): minden
              // rendeles booking_fee-jet EUR-ra normalizaljuk osszeadas elott,
              // hogy vegyes EUR/Ft rendelesek ne adodjanak ossze konverzio nelkul.
              const feeEur = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + priceInEur(Number(o.booking_fee) || 0, o.currency, eurHufRate) : sum, 0);
              return (
                <>
                  {formatAmount(feeEur, 'EUR')} €
                  {eurHufRate > 0 && (
                    <span className="text-sm font-medium text-stone-400"> ({formatHuf(feeEur * eurHufRate)} Ft)</span>
                  )}
                </>
              );
            })(),
            tone: 'indigo',
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Header with status filters */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-sm font-display">
              Foglalási Nyilvántartás & Státuszfigyelő ({orders.length})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Nyomon követheted az összes beérkezett foglalást és a fizetési/visszaigazolási státuszokat.
            </p>
          </div>

          {/* Status filter pills */}
          <FilterPillBar
            options={[
              { id: 'all', label: `Mind (${orders.length})` },
              { id: 'pending', label: `Visszaigazolásra vár (${orders.filter(o => o.status === 'pending').length})`, tone: 'amber' },
              { id: 'confirmed', label: `Megerősítve (${orders.filter(o => o.status === 'confirmed').length})`, tone: 'emerald' },
              { id: 'cancelled', label: `Lemondva (${orders.filter(o => o.status === 'cancelled').length})`, tone: 'stone' },
            ]}
            value={bookingStatusFilter}
            onChange={(id) => setBookingStatusFilter(id as any)}
          />
        </div>

        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-600">Nincs a szűrésnek megfelelő foglalás a nyilvántartásban.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-5 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                      #{getBookingReference(order)}
                    </span>
                    <h4
                      onClick={() => order.program_id && openProgramDetail(order.program_id)}
                      className="font-bold text-stone-900 text-sm hover:text-emerald-700 cursor-pointer transition-colors truncate max-w-md"
                    >
                      {order.program?.title || 'Program'}
                    </h4>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {order.status === 'confirmed' ? 'Megerősítve (visszaigazolva)' : order.status === 'pending' ? 'Szolgáltatói visszaigazolásra vár' : 'Lemondva'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span>{order.participants_count} fő</span>
                    <span>·</span>
                    <span>Teljes: <strong className="text-stone-800">{formatAmount(order.total_price, order.currency)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
                    <span>·</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Platform kényelmi díj (Stripe fizetve): {formatPlatformFee(order.booking_fee)} €
                    </span>
                    <span>·</span>
                    <span>Helyszínen: <strong className="text-stone-800">{formatAmount(order.onsite_amount, order.currency)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
                    {order.onsite_payment_method && (
                      <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                        {order.onsite_payment_method === 'revolut' ? (
                          <Wallet className="w-3 h-3" />
                        ) : order.onsite_payment_method === 'bank_transfer' ? (
                          <Landmark className="w-3 h-3" />
                        ) : (
                          <Banknote className="w-3 h-3" />
                        )}
                        {PAYMENT_METHOD_LABEL[order.onsite_payment_method]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {order.status !== 'cancelled' && (
                    <button
                      onClick={() => setRescheduleOrderId(order.id)}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Áthelyezés</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RescheduleOrderModal
        orderId={rescheduleOrderId}
        onClose={() => setRescheduleOrderId(null)}
      />
    </div>
  );
};
