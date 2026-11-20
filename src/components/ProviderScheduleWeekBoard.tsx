import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { ProgramDayPopup } from './ProgramDayPopup';
import { OccurrenceCard } from './OccurrenceCard';
import { useOccurrenceScheduling } from '../hooks/useOccurrenceScheduling';

interface ProviderScheduleWeekBoardProps {
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
  // Kanban c4a1f9e2 kiegeszites: lasd ProviderScheduleCalendar azonos propja.
  onOpenManualBooking?: (programId?: string, occurrenceId?: string) => void;
}

const WEEKDAY_LABELS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
const WEEKDAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

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

function addWeeks(d: Date, weeks: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + weeks * 7);
  return r;
}

// Kanban fe350dd4 (Zora dontese B): kezdetben ~1 honapnyi (4 het) toltodik be,
// utana a also sentinel 2-esevel bovit, max ~3 honapig (12 het) -- onnantol a
// sentinel tovabbra is latszik, de a bovites nema no-op (nincs kulon UI-jelzes,
// nincs igazi windowing/regi-het-eltavolitas v1-ben, csak novekvo lista).
const INITIAL_WEEKS = 4;
const LOAD_MORE_WEEKS = 2;
const MAX_WEEKS = 12;

// Kanban wk001 (Csaba referencia-kepe alapjan, 2026-11-13): a korabbi
// Trello-stilusu 7-oszlopos het-racs (4230d70e) helyett nap-ful sor + a
// kivalasztott nap kartyalistaja. A huzas-athelyezes (@dnd-kit) EZEN a
// nezeten MEGSZUNT -- egyoszlopos kartyalistaban nincs 7 egymas-melletti
// drop-target, ezert nincs ertelme. Helyette draggable={false} az
// OccurrenceCard-okon, athelyezes a MAR MEGLEVO "..." (Pontos datum/ido
// megadasa) gombbal -- ugyanaz a minta, ami korabban mar megepult es Zora
// altal PASS-olva lett a kanban 882a92d9 "Nap nezet"-eben (ProviderScheduleDayListView,
// fe350dd4-ben eltavolitva, de NEM hiba miatt). A honap-nezet
// (ProviderScheduleCalendar, MonthOccurrenceChip) tovabbra is drag-es marad,
// azt ez a valtozas nem erinti. A het-szintu infinite-scroll (fe350dd4, Zora
// dontese B) valtozatlan marad -- csak az, hogy EGY het-szekcion BELUL mi
// jelenik meg, valtozott 7 oszlopos grid helyett nap-fulekre.
export const ProviderScheduleWeekBoard: React.FC<ProviderScheduleWeekBoardProps> = ({
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
  // Kanban fe350dd4: tobb het egymas alatt, vegtelen-gorgetes-szeruen (lasd
  // lejjebb a sentinel+IntersectionObserver-t). weekStarts[0] MINDIG a valodi
  // aktualis het (sosem bovitunk visszafele, Zora dontese A) -- a kiemeles
  // ezert egyszeruen idx===0.
  const [weekStarts, setWeekStarts] = useState<Date[]>(() => {
    const base = mondayOf(new Date());
    return Array.from({ length: INITIAL_WEEKS }, (_, i) => addWeeks(base, i));
  });
  // Melyik het-szekciora mutat a Vissza/Elore/"Ez a het" -- csak ezt a gombsavot
  // es a fejlec-labelt vezerli, a tenyleges gorgetest scrollIntoView vegzi.
  const [focusedWeekIndex, setFocusedWeekIndex] = useState(0);
  const weekSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [dayPopupOccurrence, setDayPopupOccurrence] = useState<ProgramOccurrence | null>(null);

  const loadMoreWeeks = () => {
    setWeekStarts(prev => {
      if (prev.length >= MAX_WEEKS) return prev;
      const extra = Array.from({ length: LOAD_MORE_WEEKS }, (_, i) => addWeeks(prev[prev.length - 1], i + 1));
      return [...prev, ...extra].slice(0, MAX_WEEKS);
    });
  };

  // Also sentinel: amint a nezetbe er (rootMargin-nal korabban, hogy ne legyen
  // "villanas" uresseggel), tobb hetet tolt be. A MAX_WEEKS-sapka utan is
  // futhat, de a loadMoreWeeks onnantol no-op.
  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreWeeks(); },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = toDateStr(weekStarts[focusedWeekIndex]);
    const el = weekSectionRefs.current[key];
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedWeekIndex]);

  const bookedCountByOccurrence = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter(o => o.status !== 'cancelled' && o.occurrence_id)
      .forEach(o => {
        map.set(o.occurrence_id!, (map.get(o.occurrence_id!) || 0) + (o.participants_count || 0));
      });
    return map;
  }, [orders]);

  // Kanban 5d9187b1 (#5): lasd ProviderScheduleCalendar azonos logikaja.
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

  // Minden betoltott hetnek megvan a sajat 7 napja.
  const weeksWithDays = useMemo(() => {
    return weekStarts.map(ws => ({
      weekStart: ws,
      weekKey: toDateStr(ws),
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        return { date: d, dateStr: toDateStr(d), label: WEEKDAY_LABELS[i], shortLabel: WEEKDAY_SHORT[i] };
      }),
    }));
  }, [weekStarts]);

  // Kanban wk001: minden het-szekcionak sajat kivalasztott napja van (nap-ful
  // sor). Az aktualis heten alapertelmezesben a MAI nap van kivalasztva, a
  // tobbi (meg be nem toltott jovobeli) heten a hetfo (index 0).
  const [selectedDayByWeek, setSelectedDayByWeek] = useState<Record<string, number>>({});
  const defaultDayIndex = (isCurrentWeek: boolean): number => {
    if (!isCurrentWeek) return 0;
    const jsDay = new Date().getDay();
    return (jsDay + 6) % 7;
  };

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

  const fmtWeekLabel = (ws: Date) => {
    const end = new Date(ws);
    end.setDate(ws.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
    return `${fmt(ws)} -- ${fmt(end)}`;
  };
  const weekLabel = useMemo(
    () => fmtWeekLabel(weekStarts[focusedWeekIndex]),
    [weekStarts, focusedWeekIndex]
  );

  // Kanban fe350dd4: a gombok mar nem cserelik le a tartalmat, hanem a megfelelo
  // mar betoltott (vagy szukseg eseten most betoltott) het-szekciora scrollolnak
  // -- lasd a focusedWeekIndex-re figyelo scrollIntoView-t feljebb. Csak ELORE
  // bovitunk (Zora dontese A), ezert "Elozo het" a 0. indexnel le van tiltva.
  const handlePrevWeek = () => setFocusedWeekIndex(i => Math.max(0, i - 1));
  const handleNextWeek = () => setFocusedWeekIndex(i => {
    const next = i + 1;
    if (next >= weekStarts.length - 1) loadMoreWeeks();
    return next;
  });
  const handleThisWeek = () => setFocusedWeekIndex(0);

  return (
    <div className="space-y-4">
      {/* Kanban fe350dd4: a het-valaszto+program-szuro sav a dashboard SAJAT
          sticky fejlece ALA illeszkedik (Navbar + dashboard-fejlec magassaga),
          ezert a top-ertek a ket felso sticky reteg osszegzett magassaganak
          felel meg -- lasd ProviderScheduleDashboardPage.tsx sticky wrapperjet. */}
      <div data-testid="week-sticky-navbar" className="sticky top-[114px] sm:top-[204px] z-20 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={handlePrevWeek}
                disabled={focusedWeekIndex === 0}
                aria-label="Előző hét"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={handleThisWeek} className="px-3 py-1 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer">
                Ez a hét
              </button>
              <button type="button" onClick={handleNextWeek} aria-label="Következő hét" className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <span className="font-display text-base sm:text-lg font-extrabold text-stone-900 capitalize">{weekLabel}</span>
          </div>

          {programs.length > 1 && (
            <select
              value={selectedProgramId}
              onChange={e => setSelectedProgramId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 outline-none cursor-pointer max-w-[240px] truncate self-start lg:self-auto"
            >
              <option value="all">Minden program</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
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

      <div className="space-y-5">
        {weeksWithDays.map((week, idx) => {
          const isCurrentWeek = idx === 0;
          const selectedDayIdx = selectedDayByWeek[week.weekKey] ?? defaultDayIndex(isCurrentWeek);
          const selectedDay = week.days[selectedDayIdx];
          const selectedDayItems = occurrencesByDate.get(selectedDay.dateStr) || [];
          return (
            <div
              key={week.weekKey}
              ref={(el) => { weekSectionRefs.current[week.weekKey] = el; }}
              // scroll-mt: amikor a Vissza/Elore gomb ide scrollol, ennyivel
              // tolodik lejjebb a celpont, hogy ne csusszon a Navbar + a ket
              // sticky sav (dashboard-fejlec + ez a het-nav sav) ala.
              className={`rounded-2xl p-2.5 sm:p-3 scroll-mt-[236px] sm:scroll-mt-[292px] transition-colors ${
                isCurrentWeek ? 'bg-emerald-50/50 ring-2 ring-emerald-200/80' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`text-xs font-extrabold uppercase tracking-wide ${isCurrentWeek ? 'text-emerald-700' : 'text-stone-400'}`}>
                  {fmtWeekLabel(week.weekStart)}
                </span>
                {isCurrentWeek && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">Ez a hét</span>
                )}
              </div>

              {/* Kanban wk001: nap-ful sor -- a kivalasztott nap alatt csak
                  AZ O kartyalistaja jelenik meg, nem mind a 7 nap egymas alatt/mellett. */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid={`week-day-tabs-${week.weekKey}`}>
                {week.days.map((day, dayIdx) => {
                  const isToday = toDateStr(new Date()) === day.dateStr;
                  const isSelected = dayIdx === selectedDayIdx;
                  const count = (occurrencesByDate.get(day.dateStr) || []).length;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDayByWeek(prev => ({ ...prev, [week.weekKey]: dayIdx }))}
                      className={`flex flex-col items-center gap-0.5 min-w-[46px] px-2 py-1.5 rounded-xl border shrink-0 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                        {day.shortLabel}
                      </span>
                      <span className="text-sm font-extrabold inline-flex items-center gap-1">
                        {day.date.getDate()}
                        {isToday && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 ${isSelected ? 'ring-1 ring-white' : ''}`}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-emerald-50' : count > 0 ? 'text-emerald-700' : 'text-stone-300'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between px-0.5 mb-2">
                <h4 className="font-display text-sm font-extrabold text-stone-900 capitalize">
                  {selectedDay.label}, {selectedDay.date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                </h4>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  selectedDayItems.length > 0 ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}>
                  {selectedDayItems.length > 0 ? `${selectedDayItems.length} időpont` : 'Üres'}
                </span>
              </div>

              <div className="space-y-2">
                {selectedDayItems.map(({ occ, program }) => (
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
                    weekDays={week.days}
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

                {selectedDayItems.length === 0 && (
                  <div className="text-center py-6 text-xs text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                    Nincs időpont erre a napra.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Also sentinel -- lasd a feljebbi IntersectionObserver-t (loadMoreWeeks) */}
      <div ref={bottomSentinelRef} aria-hidden="true" className="h-px" />

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


