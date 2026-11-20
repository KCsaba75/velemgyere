import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarRange, LayoutGrid, Columns3, List } from 'lucide-react';
import { Program, ProgramOccurrence, OrderBuyerInfo } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { ProviderScheduleCalendar } from './ProviderScheduleCalendar';
import { ProviderScheduleWeekBoard } from './ProviderScheduleWeekBoard';
import { ProviderBookingsListView } from './ProviderBookingsListView';
import { ManualBookingModal } from './ManualBookingModal';
import { ProgramEditorModal } from './ProgramEditorModal';
import { BookingDetailModal } from './BookingDetailModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';

// Kanban fe350dd4: a "Nap nezet" (ProviderScheduleDayListView, kanban 882a92d9)
// torolve -- a Het nezet vegtelen gorgetessel es sticky fejleccel vette at a
// szerepet mobil alapertelmezeskent is (lasd lejjebb).
type ViewMode = 'month' | 'week' | 'list';
const VIEWMODE_STORAGE_KEY = 'vg_provider_schedule_viewmode';
const isValidViewMode = (v: string | null): v is ViewMode =>
  v === 'month' || v === 'week' || v === 'list';

// Kanban 4230d70e (Csaba, 1-6. pont): uj szolgaltatoi "Iranyitopult" -- havi
// naptarnezet occurrence-centrikusan (nem foglalas-centrikusan, mint a
// ProviderBookingsCalendar), uj idopont felvetele + meglevo idopont athelyezese
// + kulso foglalas hozzaadasa (ManualBookingModal ujrahasznositva) egy helyen.
// C (mobil also-nav elhelyezes): KESZ, lasd Navbar.tsx.
// Athelyezes mechanizmus (Csaba Trello-referenciakepe, kanban 3348/3349/3355):
// het-nezet (ProviderScheduleWeekBoard, @dnd-kit/core, huzassal athelyezes +
// masolo-ikon uj idopont-masolashoz) a honap-nezet (ProviderScheduleCalendar)
// MELLETT, nezet-valtoval. FRISSITVE (c2c66884, Csaba korrekcioja, msg 3390):
// a honap-nezet (MonthOccurrenceChip) MAR IS dragolhato, ugyanazzal a
// @dnd-kit mechanikaval, mobilon is -- ez a bekezdes korabban meg az ELOTTI
// (gomb/form-csak) allapotot irta le, az mar nem ervenyes.
export const ProviderScheduleDashboardPage: React.FC = () => {
  const {
    currentUser,
    currentProvider,
    programs,
    orders,
    getProgramOccurrences,
    createOccurrences,
    updateOccurrence,
    deleteOccurrence,
    getOrderBuyerInfo,
    confirmOrder,
  } = useApp();

  useDocumentMeta('Irányítópult -- Szolgáltatói Dashboard', 'Program-ütemező havi nézet: időpontok felvétele, áthelyezése és foglalások egy helyen.');

  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBookingProgramId, setManualBookingProgramId] = useState<string | undefined>(undefined);
  // Kanban c4a1f9e2 kiegeszites: a ProgramDayPopup-bol nyitott kulso foglalasnal
  // az idopont mar ismert, elore ki kell tolteni a ManualBookingModal-ban.
  const [manualBookingOccurrenceId, setManualBookingOccurrenceId] = useState<string | undefined>(undefined);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Kanban 882a92d9 (#9): mobilon az alapertelmezett nezet a napi lista, nem a
  // racs-alapu Havi/Heti -- a valasztast localStorage-ban megjegyezzuk, az
  // felulirja a viewport-heurisztikat minden kesobbi latogataskor (nem csak
  // elsőn). A gombsor mindig mind a 4 opciot mutatja, minden eszkozon -- csak
  // az ALAPERTELMEZES valtozik mobilon.
  const isMobileViewport = useIsMobileViewport();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const stored = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(VIEWMODE_STORAGE_KEY)
        : null;
      if (isValidViewMode(stored)) return stored;
    } catch {}
    // fe350dd4: a torolt 'day' nezet helyett mobilon mostantol a Het nezet az
    // alapertelmezett (a korabban elmentett 'day' erteket az isValidViewMode
    // fent mar ervenytelennek latja, ezert automatikusan ide esik vissza).
    return isMobileViewport ? 'week' : 'month';
  });
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(VIEWMODE_STORAGE_KEY, mode);
      }
    } catch {}
  };

  // 88b27fc8: a regi "Foglalasaim" Lista nezet harmadik nezet-modkent, a
  // ProviderBookingsPage-zel kozos ProviderBookingsListView-t hasznalva --
  // ehhez ugyanaz a confirm/reschedule/reszletek allapot+modal-keszlet kell,
  // mint a Havi/Het nezetnek a kulso foglalas rogzitesehez.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmErrorByOrderId, setConfirmErrorByOrderId] = useState<Record<string, string>>({});
  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;

  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const ownOrders = orders.filter(o => ownProgramIds.has(o.program_id) || displayPrograms.length === 0);

  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, ProgramOccurrence>>({});
  const ownProgramIdsStr = displayPrograms.map(p => p.id).join(',');

  const reloadOccurrences = async () => {
    const programIds = ownProgramIdsStr ? ownProgramIdsStr.split(',') : [];
    if (programIds.length === 0) {
      setOccurrencesMap({});
      return;
    }
    const results = await Promise.all(programIds.map(pid => getProgramOccurrences(pid)));
    const map: Record<string, ProgramOccurrence> = {};
    results.flat().forEach(occ => {
      map[occ.id] = occ;
    });
    setOccurrencesMap(map);
  };

  useEffect(() => {
    reloadOccurrences().catch(err => console.warn('Occurrences load notice:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownProgramIdsStr]);

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

  // Live lookup by id, not a frozen snapshot -- lasd 4a007dc2 (cancel/confirm
  // utan a mar nyitott modal regi statust mutatna, ha pillanatkepet tartana).
  const selectedOrderDetail = selectedOrderId ? orders.find(o => o.id === selectedOrderId) || null : null;

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

  const handleOpenManualBooking = (progId?: string, occurrenceId?: string) => {
    setManualBookingProgramId(progId);
    setManualBookingOccurrenceId(occurrenceId);
    setManualBookingModalOpen(true);
  };

  const handleCreateOccurrence = async (
    programId: string,
    dateStr: string,
    overrides: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => {
    await createOccurrences(programId, [dateStr], overrides);
    await reloadOccurrences();
  };

  // Kanban 882a92d9 (#8): batch-verzio az ismetlodo-masolashoz -- a mar letezo
  // createOccurrences mar tud tomb-datumot, nem kell csomagolni egyesevel.
  const handleCreateOccurrences = async (
    programId: string,
    dates: string[],
    overrides: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => {
    await createOccurrences(programId, dates, overrides);
    await reloadOccurrences();
  };

  const handleMoveOccurrence = async (
    occurrenceId: string,
    updates: { event_date: string; start_time?: string | null; end_time?: string | null }
  ) => {
    await updateOccurrence(occurrenceId, updates);
    await reloadOccurrences();
  };

  const handleDeleteOccurrence = async (occurrenceId: string) => {
    await deleteOccurrence(occurrenceId);
    await reloadOccurrences();
  };

  // Kanban 803361a4 #3: foglalt idopontra a torles mindig elbukott (FK),
  // ez a lemondas-ut (status='cancelled') ugyanazt a mutaciot hasznalja,
  // mint a ProgramEditorModal-beli nyitas/lemondas kapcsolo.
  const handleCancelOccurrence = async (occurrenceId: string) => {
    await updateOccurrence(occurrenceId, { status: 'cancelled' });
    await reloadOccurrences();
  };

  // Kanban fe350dd4: a cim+alcim blokk ketszer kerul kirenderelesre Het nezetben
  // (lasd lejjebb) -- mobilon a sticky zonAN KIVUL (normal gorgetessel eltunik),
  // desktopon a sticky zonaN BELUL (vele egyutt rogzitve marad). Ez a
  // Zora-dontes C ("mobilon huzd ossze, desktopon 1:1 rogzitve") tiszta
  // CSS-megoldasa, scroll-figyelo JS nelkul.
  const titleBlock = (
    <div>
      <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
        <CalendarRange className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
        <span>Irányítópult</span>
      </h1>
      <p className="text-sm text-stone-500 mt-1">
        Programjaid havi ütemezése: időpont felvétele, áthelyezése és külső foglalás egy helyen.
      </p>
    </div>
  );

  const viewSwitcherRow = (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 border border-stone-200/80 shrink-0">
        <button
          type="button"
          onClick={() => setViewMode('month')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'month' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Havi nézet</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('week')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'week' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
          title="Heti nézet: időpontok húzással áthelyezhetők"
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span>Hét nézet</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'list' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
          title="Lista nézet: foglalások aktuális/korábbi/lemondott szűrővel"
        >
          <List className="w-3.5 h-3.5" />
          <span>Lista nézet</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      {viewMode === 'week' ? (
        <>
          {/* Mobil: a cim+alcim a sticky zona FELETT, normal dokumentum-folyasban --
              gorgeteskor termeszetesen eltunik, nincs ra kulon JS. */}
          <div className="sm:hidden mb-3">{titleBlock}</div>

          <div data-testid="week-sticky-header" className="sticky top-16 sm:top-20 z-30 bg-stone-50 pb-3 sm:pb-4">
            <div className="hidden sm:flex sm:items-center justify-between gap-4 mb-6">
              {titleBlock}
              {viewSwitcherRow}
            </div>
            <div className="sm:hidden">{viewSwitcherRow}</div>
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          {titleBlock}
          {viewSwitcherRow}
        </div>
      )}

      {viewMode === 'month' ? (
        <ProviderScheduleCalendar
          programs={displayPrograms}
          occurrencesMap={occurrencesMap}
          orders={ownOrders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onOpenManualBooking={handleOpenManualBooking}
          onEditProgram={setEditingProgram}
          onCreateOccurrence={handleCreateOccurrence}
          onCreateOccurrences={handleCreateOccurrences}
          onMoveOccurrence={handleMoveOccurrence}
          onDeleteOccurrence={handleDeleteOccurrence}
          onCancelOccurrence={handleCancelOccurrence}
        />
      ) : viewMode === 'week' ? (
        <ProviderScheduleWeekBoard
          programs={displayPrograms}
          occurrencesMap={occurrencesMap}
          orders={ownOrders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onCreateOccurrence={handleCreateOccurrence}
          onCreateOccurrences={handleCreateOccurrences}
          onMoveOccurrence={handleMoveOccurrence}
          onDeleteOccurrence={handleDeleteOccurrence}
          onOpenManualBooking={handleOpenManualBooking}
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

      <ManualBookingModal
        isOpen={manualBookingModalOpen}
        onClose={() => setManualBookingModalOpen(false)}
        initialProgramId={manualBookingProgramId}
        initialOccurrenceId={manualBookingOccurrenceId}
        programs={displayPrograms}
        occurrencesMap={occurrencesMap}
      />

      <ProgramEditorModal
        isOpen={Boolean(editingProgram)}
        programToEdit={editingProgram}
        onClose={() => setEditingProgram(null)}
      />

      {selectedOrderDetail && (
        <BookingDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {rescheduleOrderId && (
        <RescheduleOrderModal
          orderId={rescheduleOrderId}
          onClose={() => setRescheduleOrderId(null)}
        />
      )}
    </div>
  );
};
