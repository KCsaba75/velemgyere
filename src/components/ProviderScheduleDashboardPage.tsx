import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Briefcase, CalendarRange, LayoutGrid, Columns3 } from 'lucide-react';
import { Program, ProgramOccurrence } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProviderScheduleCalendar } from './ProviderScheduleCalendar';
import { ProviderScheduleWeekBoard } from './ProviderScheduleWeekBoard';
import { ManualBookingModal } from './ManualBookingModal';
import { ProgramEditorModal } from './ProgramEditorModal';

// Kanban 4230d70e (Csaba, 1-6. pont): uj szolgaltatoi "Iranyitopult" -- havi
// naptarnezet occurrence-centrikusan (nem foglalas-centrikusan, mint a
// ProviderBookingsCalendar), uj idopont felvetele + meglevo idopont athelyezese
// + kulso foglalas hozzaadasa (ManualBookingModal ujrahasznositva) egy helyen.
// C (mobil also-nav elhelyezes): KESZ, lasd Navbar.tsx.
// Athelyezes mechanizmus (Csaba Trello-referenciakepe, kanban 3348/3349/3355):
// het-nezet (ProviderScheduleWeekBoard, @dnd-kit/core, huzassal athelyezes +
// masolo-ikon uj idopont-masolashoz) a honap-nezet (ProviderScheduleCalendar,
// valtozatlan, gomb/form athelyezes) MELLETT, nezet-valtoval -- a honap-nezet
// NEM dragolhato (tul sok/kicsi cella), csak a het-nezet.
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
    setCurrentView,
  } = useApp();

  useDocumentMeta('Irányítópult -- Szolgáltatói Dashboard', 'Program-ütemező havi nézet: időpontok felvétele, áthelyezése és foglalások egy helyen.');

  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBookingProgramId, setManualBookingProgramId] = useState<string | undefined>(undefined);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

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

  const handleOpenManualBooking = (progId?: string) => {
    setManualBookingProgramId(progId);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
            <CalendarRange className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            <span>Irányítópult</span>
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Programjaid havi ütemezése: időpont felvétele, áthelyezése és külső foglalás egy helyen.
          </p>
        </div>
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
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('provider-dashboard')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Vissza a Partner fiókhoz"
          >
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
            <span className="truncate">Partner fiók</span>
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <ProviderScheduleCalendar
          programs={displayPrograms}
          occurrencesMap={occurrencesMap}
          orders={ownOrders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onOpenManualBooking={handleOpenManualBooking}
          onEditProgram={setEditingProgram}
          onCreateOccurrence={handleCreateOccurrence}
          onMoveOccurrence={handleMoveOccurrence}
          onDeleteOccurrence={handleDeleteOccurrence}
        />
      ) : (
        <ProviderScheduleWeekBoard
          programs={displayPrograms}
          occurrencesMap={occurrencesMap}
          orders={ownOrders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onCreateOccurrence={handleCreateOccurrence}
          onMoveOccurrence={handleMoveOccurrence}
          onDeleteOccurrence={handleDeleteOccurrence}
        />
      )}

      <ManualBookingModal
        isOpen={manualBookingModalOpen}
        onClose={() => setManualBookingModalOpen(false)}
        initialProgramId={manualBookingProgramId}
      />

      <ProgramEditorModal
        isOpen={Boolean(editingProgram)}
        programToEdit={editingProgram}
        onClose={() => setEditingProgram(null)}
      />
    </div>
  );
};
