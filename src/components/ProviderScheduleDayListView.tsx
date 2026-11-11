import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, X, Filter } from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { ProgramDayPopup } from './ProgramDayPopup';
import { OccurrenceCard } from './OccurrenceCard';
import { useOccurrenceScheduling } from '../hooks/useOccurrenceScheduling';

interface ProviderScheduleDayListViewProps {
  programs: Program[];
  occurrencesMap: Record<string, ProgramOccurrence>;
  orders: Order[];
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;
  onCreateOccurrence: (
    programId: string,
    dateStr: string,
    overrides: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => Promise<void>;
  onCreateOccurrences: (
    programId: string,
    dates: string[],
    overrides: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => Promise<void>;
  onMoveOccurrence: (
    occurrenceId: string,
    updates: { event_date: string; start_time?: string | null; end_time?: string | null }
  ) => Promise<void>;
  onDeleteOccurrence: (occurrenceId: string) => Promise<void>;
  onOpenManualBooking?: (programId?: string, occurrenceId?: string) => void;
}

const WEEKDAY_LABELS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Kanban 882a92d9 (#9): mobilon alapertelmezett negyedik nezet -- a Heti/Havi
// racs helyett egyszeru, gorgethetö napi lista (Ma/Holnap/hetnapok), nincs
// drag-and-drop (OccurrenceCard draggable=false, nincs DndContext korul),
// az athelyezes/masolas/ismetlodo-masolas/torles tovabbra is elerheto a
// kartyan levo gombokkal -- ugyanaz a kozos logika (useOccurrenceScheduling,
// OccurrenceCard, ProgramDayPopup), mint a Heti nezetben, csak linearis
// listaba renderelve, nem oszlop-racsba.
export const ProviderScheduleDayListView: React.FC<ProviderScheduleDayListViewProps> = ({
  programs,
  occurrencesMap,
  orders,
  getOrderBuyerInfo,
  onCreateOccurrence,
  onCreateOccurrences,
  onMoveOccurrence,
  onDeleteOccurrence,
  onOpenManualBooking,
}) => {
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [dayPopupOccurrence, setDayPopupOccurrence] = useState<ProgramOccurrence | null>(null);

  const bookedCountByOccurrence = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter(o => o.status !== 'cancelled' && o.occurrence_id)
      .forEach(o => {
        map.set(o.occurrence_id!, (map.get(o.occurrence_id!) || 0) + (o.participants_count || 0));
      });
    return map;
  }, [orders]);

  const pendingOccurrenceIds = useMemo(() => {
    const set = new Set<string>();
    orders
      .filter(o => o.status === 'pending' && o.occurrence_id)
      .forEach(o => set.add(o.occurrence_id!));
    return set;
  }, [orders]);

  const pendingOrdersCount = useMemo(
    () => orders.filter(o => o.status === 'pending').length,
    [orders]
  );

  const {
    dragError,
    setDragError,
    movingOccurrenceId,
    moveDate,
    moveStartTime,
    moveEndTime,
    moveSaving,
    moveError,
    startMove,
    cancelMove: onCancelMove,
    saveMove,
    setMoveDate,
    setMoveStartTime,
    setMoveEndTime,
    copyingOccurrenceId,
    copyDate,
    copySaving,
    copyError,
    startCopy,
    cancelCopy: onCancelCopy,
    saveCopy,
    setCopyDate,
    copyMode,
    setCopyMode,
    recurringWeekday,
    setRecurringWeekday,
    recurringUntilDate,
    setRecurringUntilDate,
    recurringSaving,
    recurringError,
    saveCopyRecurring,
    deletingOccurrenceId,
    handleDelete,
  } = useOccurrenceScheduling(occurrencesMap, onMoveOccurrence, onCreateOccurrence, onDeleteOccurrence, bookedCountByOccurrence, onCreateOccurrences);

  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach(p => map.set(p.id, p));
    return map;
  }, [programs]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { date: d, dateStr: toDateStr(d), label: WEEKDAY_LABELS[i] };
    });
  }, [weekStart]);

  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, Array<{ occ: ProgramOccurrence; program: Program | undefined }>>();
    Object.values(occurrencesMap).forEach(occ => {
      if (selectedProgramId !== 'all' && occ.program_id !== selectedProgramId) return;
      const dateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
      const list = map.get(dateStr) || [];
      list.push({ occ, program: programMap.get(occ.program_id) });
      map.set(dateStr, list);
    });
    map.forEach(list => list.sort((a, b) => (a.occ.start_time || '').localeCompare(b.occ.start_time || '')));
    return map;
  }, [occurrencesMap, selectedProgramId, programMap]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
    return `${fmt(weekStart)} -- ${fmt(end)}`;
  }, [weekStart]);

  const handlePrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const handleNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const handleThisWeek = () => setWeekStart(mondayOf(new Date()));

  const todayStr = toDateStr(new Date());
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }, []);

  const dayLabel = (day: { date: Date; dateStr: string; label: string }) => {
    if (day.dateStr === todayStr) return 'Ma';
    if (day.dateStr === tomorrowStr) return 'Holnap';
    return day.label;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button type="button" onClick={handlePrevWeek} aria-label="Előző hét" className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={handleThisWeek} className="px-3 py-1 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer">
                Ez a hét
              </button>
              <button type="button" onClick={handleNextWeek} aria-label="Következő hét" className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <span className="text-xs sm:text-sm font-bold text-stone-700">{weekLabel}</span>
          </div>

          {programs.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-xl self-start sm:self-auto">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedProgramId}
                onChange={e => setSelectedProgramId(e.target.value)}
                className="bg-transparent text-xs font-medium text-stone-800 outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="all">Minden program</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {pendingOrdersCount > 0 && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="flex-1">
            {pendingOrdersCount} foglalás vár visszaigazolásra.
          </span>
        </div>
      )}

      {dragError && (
        <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{dragError}</span>
          <button type="button" onClick={() => setDragError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {weekDays.map(day => {
          const items = occurrencesByDate.get(day.dateStr) || [];
          const isToday = day.dateStr === todayStr;
          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl border p-3 space-y-2 ${isToday ? 'border-emerald-300 bg-emerald-50/30' : 'border-stone-200 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isToday ? 'text-emerald-800' : 'text-stone-800'}`}>
                  {dayLabel(day)}
                  <span className="font-normal text-stone-500 ml-1.5">
                    {day.date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                  </span>
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  items.length > 0 ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}>
                  {items.length > 0 ? `${items.length} időpont` : 'Üres'}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-stone-400">Nincs időpont ezen a napon.</p>
              ) : (
                <div className="space-y-2">
                  {items.map(({ occ, program }) => (
                    <OccurrenceCard
                      key={occ.id}
                      occ={occ}
                      program={program}
                      booked={bookedCountByOccurrence.get(occ.id) || 0}
                      hasPending={pendingOccurrenceIds.has(occ.id)}
                      draggable={false}
                      isMoving={movingOccurrenceId === occ.id}
                      moveDate={moveDate}
                      moveStartTime={moveStartTime}
                      moveEndTime={moveEndTime}
                      moveSaving={moveSaving}
                      moveError={moveError}
                      onStartMove={() => startMove(occ)}
                      onCancelMove={onCancelMove}
                      onChangeMoveDate={setMoveDate}
                      onChangeMoveStartTime={setMoveStartTime}
                      onChangeMoveEndTime={setMoveEndTime}
                      onSaveMove={saveMove}
                      isCopying={copyingOccurrenceId === occ.id}
                      copyDate={copyDate}
                      copySaving={copySaving}
                      copyError={copyError}
                      weekDays={weekDays}
                      onStartCopy={() => startCopy(occ)}
                      onCancelCopy={onCancelCopy}
                      onChangeCopyDate={setCopyDate}
                      onSaveCopy={(target) => saveCopy(occ, target)}
                      copyMode={copyMode}
                      onChangeCopyMode={setCopyMode}
                      recurringWeekday={recurringWeekday}
                      onChangeRecurringWeekday={setRecurringWeekday}
                      recurringUntilDate={recurringUntilDate}
                      onChangeRecurringUntilDate={setRecurringUntilDate}
                      recurringSaving={recurringSaving}
                      recurringError={recurringError}
                      onSaveCopyRecurring={(dates) => saveCopyRecurring(occ, dates)}
                      isDeleting={deletingOccurrenceId === occ.id}
                      onDelete={() => handleDelete(occ.id)}
                      onOpenPopup={() => setDayPopupOccurrence(occ)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dayPopupOccurrence && (
        <ProgramDayPopup
          occurrence={dayPopupOccurrence}
          program={programMap.get(dayPopupOccurrence.program_id)}
          orders={orders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onClose={() => setDayPopupOccurrence(null)}
          onOpenManualBooking={onOpenManualBooking}
        />
      )}
    </div>
  );
};
