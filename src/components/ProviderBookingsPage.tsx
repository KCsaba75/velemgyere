import React, { useState, useEffect, useMemo } from 'react';
import { useApp, formatPrice, getBookingReference, getOrderBucket, OrderBucket } from '../context/AppContext';
import {
  Calendar,
  Clock,
  Phone,
  Eye,
  CheckCircle2,
  Ticket,
  Banknote,
  Wallet,
  CalendarDays,
  List,
  Briefcase,
  Landmark,
  History,
  XCircle
} from 'lucide-react';
import { OrderBuyerInfo, OnsitePaymentMethod, ProgramOccurrence, Order } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProviderBookingsCalendar } from './ProviderBookingsCalendar';
import { BookingDetailModal } from './BookingDetailModal';
import { ManualBookingModal } from './ManualBookingModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
  bank_transfer: 'Előre utalás',
};

// Kanban 5a3a8dd8 + User Request:
// 1. Alapértelmezett a Lista nézet
// 2. Külön fül a korábbi foglalásoknak (az aktuális dátum előtti foglalt időpontok automatikusan ide kerülnek)
export const ProviderBookingsPage: React.FC = () => {
  const {
    currentUser,
    currentProvider,
    programs,
    orders,
    getOrderBuyerInfo,
    openProgramDetail,
    getProgramOccurrences,
    confirmOrder,
    setCurrentView,
  } = useApp();

  useDocumentMeta('Foglalásaim -- Szolgáltatói Dashboard', 'A programjaidra érkezett foglalások kezelése és visszaigazolása.');

  // Alapértelmezett nézet: 'list' (Lista nézet)
  const [bookingsViewMode, setBookingsViewMode] = useState<'calendar' | 'list'>('list');
  const [providerListTab, setProviderListTab] = useState<OrderBucket>('upcoming');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBookingProgramId, setManualBookingProgramId] = useState<string | undefined>(undefined);

  const handleOpenManualBooking = (progId?: string) => {
    setManualBookingProgramId(progId);
    setManualBookingModalOpen(true);
  };

  const handleConfirmOrder = async (id: string) => {
    setConfirmingOrderId(id);
    try {
      await confirmOrder(id);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;

  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const ownOrders = orders.filter(o => ownProgramIds.has(o.program_id) || ownPrograms.length === 0);

  // Live lookup by id (not a frozen snapshot captured at open-time) -- otherwise the
  // open modal keeps showing the pre-cancel/pre-confirm status after cancelOrder()/
  // confirmOrder() updates `orders`, even though the list behind it is already correct
  // (kanban 4a007dc2 dev-regression: looks like cancelling "did nothing").
  const selectedOrderDetail = selectedOrderId ? orders.find(o => o.id === selectedOrderId) || null : null;

  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});
  const ownOrderIds = ownOrders.map(o => o.id).join(',');

  useEffect(() => {
    const ids = ownOrderIds ? ownOrderIds.split(',') : [];
    let cancelled = false;
    ids.forEach(id => {
      getOrderBuyerInfo(id).then(info => {
        if (cancelled || !info) return;
        setBuyerInfos(prev => ({ ...prev, [id]: info }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownOrderIds]);

  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, ProgramOccurrence>>({});

  useEffect(() => {
    const ordersWithOcc = ownOrders.filter(o => o.occurrence_id);
    if (ordersWithOcc.length === 0) return;

    const programIds = Array.from(new Set(ordersWithOcc.map(o => o.program_id)));
    let cancelled = false;

    Promise.all(programIds.map(pid => getProgramOccurrences(pid)))
      .then(results => {
        if (cancelled) return;
        const map: Record<string, ProgramOccurrence> = {};
        results.flat().forEach(occ => {
          map[occ.id] = occ;
        });
        setOccurrencesMap(prev => ({ ...prev, ...map }));
      })
      .catch(err => {
        console.warn('Occurrences load notice:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [ownOrderIds, getProgramOccurrences]);

  // Categorize orders into upcoming, past, and cancelled buckets
  const bucketCounts = useMemo(() => {
    const counts: Record<OrderBucket, number> = { upcoming: 0, past: 0, cancelled: 0 };
    ownOrders.forEach(o => {
      counts[getOrderBucket(o, displayPrograms)]++;
    });
    return counts;
  }, [ownOrders, displayPrograms]);

  const currentTabOrders = useMemo(() => {
    return ownOrders
      .filter(o => getOrderBucket(o, displayPrograms) === providerListTab)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [ownOrders, displayPrograms, providerListTab]);

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Foglalásaim
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            A programjaidra érkezett foglalások dátumai, létszámai és visszaigazolása.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView('provider-dashboard')}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer w-full sm:w-auto"
          title="Vissza a Partner fiókhoz"
        >
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
          <span className="truncate">Partner fiók</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Header bar: Title, manual booking, view mode switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-stone-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-600" />
              <span>Foglalások ({ownOrders.length})</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleOpenManualBooking()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
              title="Új telefonos, személyes vagy egyéb külső foglalás rögzítése"
            >
              <Phone className="w-4 h-4" />
              <span>+ Új külső foglalás</span>
            </button>

            <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setBookingsViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  bookingsViewMode === 'list'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5 text-stone-600" />
                <span>Lista nézet</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingsViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  bookingsViewMode === 'calendar'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Naptár nézet</span>
              </button>
            </div>
          </div>
        </div>

        {bookingsViewMode === 'calendar' ? (
          <ProviderBookingsCalendar
            orders={ownOrders}
            programs={ownPrograms}
            occurrencesMap={occurrencesMap}
            buyerInfos={buyerInfos}
            onConfirmOrder={handleConfirmOrder}
            confirmingOrderId={confirmingOrderId}
            onRescheduleOrder={(orderId) => setRescheduleOrderId(orderId)}
            onOpenProgramDetail={openProgramDetail}
            onSelectOrder={(order) => setSelectedOrderId(order.id)}
            onOpenManualBooking={handleOpenManualBooking}
          />
        ) : (
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
                      onClick={() => setSelectedOrderId(order.id)}
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
                        <span>{order.participants_count} fő · helyszínen fizetendő: <strong className="text-stone-800">{formatPrice(order.onsite_amount)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
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
                                handleConfirmOrder(order.id);
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
                                setRescheduleOrderId(order.id);
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
                              setSelectedOrderId(order.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Megtekintés</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrderDetail && (
        <BookingDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      <ManualBookingModal
        isOpen={manualBookingModalOpen}
        onClose={() => setManualBookingModalOpen(false)}
        initialProgramId={manualBookingProgramId}
      />

      {rescheduleOrderId && (
        <RescheduleOrderModal
          orderId={rescheduleOrderId}
          onClose={() => setRescheduleOrderId(null)}
        />
      )}
    </div>
  );
};
