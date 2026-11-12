import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Eye,
  CheckCircle2,
  Ticket,
  Banknote,
  Wallet,
  Landmark,
  History,
  XCircle,
} from 'lucide-react';
import { getBookingReference, formatAmount, getOrderBucket, OrderBucket } from '../context/AppContext';
import { Order, Program, OrderBuyerInfo, OnsitePaymentMethod, ProgramOccurrence } from '../types/database';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
  bank_transfer: 'Előre utalás',
};

const formatProgramDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const raw = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatOrderCreatedDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

interface ProviderBookingsListViewProps {
  orders: Order[];
  programs: Program[];
  buyerInfos: Record<string, OrderBuyerInfo>;
  occurrencesMap: Record<string, ProgramOccurrence>;
  confirmingOrderId: string | null;
  confirmErrorByOrderId: Record<string, string>;
  onConfirmOrder: (orderId: string) => void;
  onRescheduleOrder: (orderId: string) => void;
  onSelectOrder: (orderId: string) => void;
}

// Kanban 5a3a8dd8 + 88b27fc8: a regi "Foglalasaim" Lista nezet (szuro-fulekkel
// + rendeles-kartyakkal) kiemelve kozos komponenskent, hogy a ProviderBookingsPage
// ES a ProviderScheduleDashboardPage (harmadik, "Lista" nezet-mod) is hasznalhassa
// -- a szuro-allapot (providerListTab) szandekosan belso state, mert nezetenkent
// fuggetlenul nyithato ujra.
export const ProviderBookingsListView: React.FC<ProviderBookingsListViewProps> = ({
  orders,
  programs,
  buyerInfos,
  occurrencesMap,
  confirmingOrderId,
  confirmErrorByOrderId,
  onConfirmOrder,
  onRescheduleOrder,
  onSelectOrder,
}) => {
  const [providerListTab, setProviderListTab] = useState<OrderBucket>('upcoming');

  const bucketCounts = useMemo(() => {
    const counts: Record<OrderBucket, number> = { upcoming: 0, past: 0, cancelled: 0 };
    orders.forEach(o => {
      counts[getOrderBucket(o, programs)]++;
    });
    return counts;
  }, [orders, programs]);

  const currentTabOrders = useMemo(() => {
    return orders
      .filter(o => getOrderBucket(o, programs) === providerListTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, programs, providerListTab]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Tabs for List View: Aktuális, Korábbi (múltbeli), Lemondott */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setProviderListTab('upcoming')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              providerListTab === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <span>Aktuális foglalások</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              providerListTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {bucketCounts.upcoming}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProviderListTab('past')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              providerListTab === 'past'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Korábbi foglalások</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              providerListTab === 'past' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {bucketCounts.past}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProviderListTab('cancelled')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              providerListTab === 'cancelled'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Lemondott foglalások</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              providerListTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {bucketCounts.cancelled}
            </span>
          </button>
        </div>

        <span className="text-[11px] font-normal text-stone-400 hidden md:inline">
          Kattints egy kártyára a részletek megtekintéséhez
        </span>
      </div>

      {currentTabOrders.length === 0 ? (
        <div className="p-12 text-center">
          <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-display mb-1">
            {providerListTab === 'upcoming'
              ? 'Nincs aktuális foglalásod'
              : providerListTab === 'past'
              ? 'Nincs korábbi (múltbeli) foglalásod'
              : 'Nincs lemondott foglalásod'}
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {providerListTab === 'upcoming'
              ? 'Az elkövetkező időpontokra érkező foglalások fognak itt megjelenni.'
              : providerListTab === 'past'
              ? 'Az aktuális dátum előtti, lefutott foglalások automatikusan ide kerülnek.'
              : 'A lemondott foglalások története látható ezen a fülön.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {currentTabOrders.map((order) => {
            const program = programs.find(p => p.id === order.program_id);
            const buyer = buyerInfos[order.id];
            const occ = order.occurrence_id ? occurrencesMap[order.occurrence_id] : null;
            const rawProgramDate = occ?.event_date || program?.event_date;
            const bookedDateFormatted = formatProgramDate(rawProgramDate);
            const bookedTime = occ?.start_time || program?.start_time;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="p-5 hover:bg-stone-50/80 transition-all space-y-3 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                      #{getBookingReference(order)}
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">{program?.title || 'Program'}</h4>
                    {order.source && order.source !== 'platform' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {order.source === 'phone' && '📞 Telefon'}
                        {order.source === 'whatsapp' && '💬 WhatsApp'}
                        {order.source === 'onsite' && '🤝 Személyes'}
                        {order.source === 'email' && '✉️ Email'}
                        {order.source === 'external' && '📝 Külső'}
                      </span>
                    )}
                  </div>
                  <span className={`self-start sm:self-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {order.status === 'confirmed' ? 'Megerősítve (visszaigazolva)' : order.status === 'pending' ? 'Visszaigazolásra vár' : 'Lemondva'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Program dátuma: <strong className="font-bold text-emerald-950">{bookedDateFormatted || 'Egyeztetés alatt'}</strong></span>
                    {bookedTime && (
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-normal ml-0.5">
                        <Clock className="w-3 h-3 text-emerald-600 inline" />
                        {bookedTime}
                      </span>
                    )}
                  </div>
                  {order.created_at && (
                    <span className="text-[11px] text-stone-400">
                      (Foglalás leadva: {formatOrderCreatedDate(order.created_at)})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <span>{order.participants_count} fő · helyszínen fizetendő: <strong className="text-stone-800">{formatAmount(order.onsite_amount, order.currency)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
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
                  {order.booking_fee > 0 && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ✓ Kényelmi díj kifizetve (Stripe)
                    </span>
                  )}
                </div>

                <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {order.is_manual ? (
                      <div className="space-y-1">
                        <span className="font-semibold text-stone-900">
                          👤 Vendég: <strong>{order.manual_customer_name || 'Vendég'}</strong>
                        </span>
                        {order.manual_customer_phone && (
                          <span className="ml-2 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            📞 {order.manual_customer_phone}
                          </span>
                        )}
                        {order.manual_customer_email && (
                          <span className="ml-2 text-stone-500">({order.manual_customer_email})</span>
                        )}
                        {order.source_notes && (
                          <p className="text-[11px] text-amber-900 bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200/60 mt-1">
                            <strong>Megjegyzés:</strong> {order.source_notes}
                          </p>
                        )}
                      </div>
                    ) : buyer ? (
                      <span>👤 Vevő (Programvadász): <strong className="text-stone-900">{buyer.name}</strong> ({buyer.email})</span>
                    ) : (
                      <span className="text-stone-500">👤 Vevő: Programvadász</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {order.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmOrder(order.id);
                        }}
                        disabled={confirmingOrderId === order.id}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{confirmingOrderId === order.id ? 'Visszaigazolás...' : 'Foglalás visszaigazolása'}</span>
                      </button>
                    )}
                    {order.status !== 'cancelled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRescheduleOrder(order.id);
                        }}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Áthelyezés
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Megtekintés</span>
                    </button>
                  </div>
                  {confirmErrorByOrderId[order.id] && (
                    <p className="w-full text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mt-2">
                      {confirmErrorByOrderId[order.id]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
