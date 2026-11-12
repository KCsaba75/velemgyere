import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Phone,
  CalendarDays,
  List,
  Ticket,
} from 'lucide-react';
import { OrderBuyerInfo, ProgramOccurrence } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProviderBookingsCalendar } from './ProviderBookingsCalendar';
import { ProviderBookingsListView } from './ProviderBookingsListView';
import { BookingDetailModal } from './BookingDetailModal';
import { ManualBookingModal } from './ManualBookingModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';

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
  } = useApp();

  useDocumentMeta('Foglalásaim -- Szolgáltatói Dashboard', 'A programjaidra érkezett foglalások kezelése és visszaigazolása.');

  // Kanban 6209fcae (4. pont): a naptar "Megnyitas uj lapon" gombja ezekkel a
  // query parameterekkel nyit -- a celzott program+nap kombinacio a naptar
  // nezetben ertelmes (a lista nezet nem programra/napra szurt), ezert ha
  // datum erkezik, a naptar nezet a belepesi alapertelmezett, nem a lista.
  const [searchParams] = useSearchParams();
  const deepLinkProgramId = searchParams.get('program') || undefined;
  const deepLinkDateStr = searchParams.get('datum') || undefined;

  // Alapértelmezett nézet: 'list' (Lista nézet), kiveve deep-link eseten
  const [bookingsViewMode, setBookingsViewMode] = useState<'calendar' | 'list'>(
    deepLinkDateStr ? 'calendar' : 'list'
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmErrorByOrderId, setConfirmErrorByOrderId] = useState<Record<string, string>>({});
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBookingProgramId, setManualBookingProgramId] = useState<string | undefined>(undefined);

  const handleOpenManualBooking = (progId?: string) => {
    setManualBookingProgramId(progId);
    setManualBookingModalOpen(true);
  };

  const handleConfirmOrder = async (id: string) => {
    setConfirmingOrderId(id);
    setConfirmErrorByOrderId(prev => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    try {
      await confirmOrder(id);
    } catch (err) {
      setConfirmErrorByOrderId(prev => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'A visszaigazolás nem sikerült, próbáld meg újra.',
      }));
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
  const ownProgramIdsStr = ownPrograms.map(p => p.id).join(',');

  // Kanban 6209fcae: a naptar-nezetnek MINDEN sajat program osszes alkalmara
  // (nyitott es lezart, foglalassal vagy nelkule) szuksege van a "foglalhato
  // nap" jelzeshez -- nem csak a mar meglevo rendelesekhez tartozo occurrence-okra,
  // mint korabban (lasd ProviderProgramsPage azonos mintaja a manual-booking
  // datumvalasztohoz).
  useEffect(() => {
    const programIds = ownProgramIdsStr ? ownProgramIdsStr.split(',') : [];
    if (programIds.length === 0) {
      setOccurrencesMap({});
      return;
    }
    let cancelled = false;

    Promise.all(programIds.map(pid => getProgramOccurrences(pid)))
      .then(results => {
        if (cancelled) return;
        const map: Record<string, ProgramOccurrence> = {};
        results.flat().forEach(occ => {
          map[occ.id] = occ;
        });
        setOccurrencesMap(map);
      })
      .catch(err => {
        console.warn('Occurrences load notice:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [ownProgramIdsStr, getProgramOccurrences]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Foglalásaim
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          A programjaidra érkezett foglalások dátumai, létszámai és visszaigazolása.
        </p>
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
            initialProgramId={deepLinkProgramId}
            initialDateStr={deepLinkDateStr}
          />
        ) : (
          <ProviderBookingsListView
            orders={ownOrders}
            programs={displayPrograms}
            buyerInfos={buyerInfos}
            occurrencesMap={occurrencesMap}
            confirmingOrderId={confirmingOrderId}
            confirmErrorByOrderId={confirmErrorByOrderId}
            onConfirmOrder={handleConfirmOrder}
            onRescheduleOrder={(orderId) => setRescheduleOrderId(orderId)}
            onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
          />
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
