import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  Clock,
  Users,
  Phone,
  Pencil,
  Trash2,
  Ban,
  Loader2,
  CalendarPlus,
  Save,
  X,
  Copy,
  GripVertical,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { ProgramDayPopup } from './ProgramDayPopup';
import { RecurringCopyPanel } from './RecurringCopyPanel';
import { useOccurrenceScheduling } from '../hooks/useOccurrenceScheduling';

interface ProviderScheduleCalendarProps {
  programs: Program[];
  occurrencesMap: Record<string, ProgramOccurrence>;
  orders: Order[];
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;
  onOpenManualBooking?: (programId?: string, occurrenceId?: string) => void;
  onEditProgram?: (program: Program) => void;
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
  onCancelOccurrence?: (occurrenceId: string) => Promise<void>;
}

const WEEKDAYS = [
  { short: 'H', label: 'Hétfő' },
  { short: 'K', label: 'Kedd' },
  { short: 'Sze', label: 'Szerda' },
  { short: 'Cs', label: 'Csütörtök' },
  { short: 'P', label: 'Péntek' },
  { short: 'Szo', label: 'Szombat' },
  { short: 'V', label: 'Vasárnap' },
];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${padZero(t.getMonth() + 1)}-${padZero(t.getDate())}`;
}

export const ProviderScheduleCalendar: React.FC<ProviderScheduleCalendarProps> = ({
  programs,
  occurrencesMap,
  orders,
  getOrderBuyerInfo,
  onOpenManualBooking,
  onEditProgram,
  onCreateOccurrence,
  onCreateOccurrences,
  onMoveOccurrence,
  onDeleteOccurrence,
  onCancelOccurrence,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr());
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [dayPopupOccurrence, setDayPopupOccurrence] = useState<ProgramOccurrence | null>(null);
  // Kanban c2c66884: a korabbi, mindig lathato "Kivalasztott Nap" oldalpanel
  // most popup-ra valt (desktopon ES mobilon is), ugyanazzal a modal-UI
  // stilussal mint a ProgramDayPopup -- Zora/Csaba dontese (msg 3390), hogy a
  // meglevo lista+muveletek logikat nem kell ujrairni, csak a megjelenitest
  // kell popup-ositani.
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const bookedCountByOccurrence = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter(o => o.status !== 'cancelled' && o.occurrence_id)
      .forEach(o => {
        map.set(o.occurrence_id!, (map.get(o.occurrence_id!) || 0) + (o.participants_count || 0));
      });
    return map;
  }, [orders]);

  // Kanban 5d9187b1 (#5): occurrence-ok, amelyekre van visszaigazolasra varo
  // (pending) rendeles -- a honap-cella es a nap-reszlet narancs jelzesehez.
  const pendingOccurrenceIds = useMemo(() => {
    const set = new Set<string>();
    orders
      .filter(o => o.status === 'pending' && o.occurrence_id)
      .forEach(o => set.add(o.occurrence_id!));
    return set;
  }, [orders]);

  // Kanban 5d9187b1 (#5): osszefoglalo sav a naptar tetejen -- a TELJES
  // rendeles-keszletre szamolva, nem csak a lathato honapra.
  const pendingOrdersCount = useMemo(
    () => orders.filter(o => o.status === 'pending').length,
    [orders]
  );

  const {
    sensors,
    dragError,
    setDragError,
    handleDragEnd,
    lastDragMove,
    undoLastDragMove,
    movingOccurrenceId,
    moveDate,
    moveStartTime,
    moveEndTime,
    moveSaving,
    moveError,
    startMove,
    cancelMove,
    saveMove,
    setMoveDate,
    setMoveStartTime,
    setMoveEndTime,
    copyingOccurrenceId,
    copyDate,
    copySaving,
    copyError,
    startCopy,
    cancelCopy,
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

  // Kanban 803361a4 #3: a Torles FK miatt mindig elbukik, ha van foglalas --
  // ilyenkor a lemondas (status='cancelled') az ut, kulon allapot/hiba-kezelessel.
  const [cancellingOccurrenceId, setCancellingOccurrenceId] = useState<string | null>(null);
  const handleCancelOccurrence = async (occurrenceId: string) => {
    if (!window.confirm('Biztosan lemondod ezt az időpontot? A foglalások lemondottként megmaradnak, nem törlődnek.')) return;
    setCancellingOccurrenceId(occurrenceId);
    try {
      await onCancelOccurrence?.(occurrenceId);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'A lemondás nem sikerült.');
    } finally {
      setCancellingOccurrenceId(null);
    }
  };

  // Kanban 803361a4 #7: Szerkesztes/Athelyezes/Masolas/Torles(Lemondas) a
  // Kulso foglalas melletti "..." menube kerul, ugyanaz a nyitott-menu-id +
  // click-outside minta mint a FavoritesView mappa-muveletek menujeben.
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openActionsMenuId) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setOpenActionsMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openActionsMenuId]);

  const [addingOccurrence, setAddingOccurrence] = useState(false);
  const [addProgramId, setAddProgramId] = useState<string>('');
  const [addStartTime, setAddStartTime] = useState('10:00');
  const [addEndTime, setAddEndTime] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach(p => map.set(p.id, p));
    return map;
  }, [programs]);

  // Occurrence-centrikus csoportositas nap szerint -- a meglevo ProviderBookingsCalendar
  // foglalas-centrikus (ordersByDate), ez itt program-idopont-centrikus: minden
  // occurrence megjelenik, akkor is ha meg nincs hozza foglalas.
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

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const todayS = todayStr();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${padZero(prevM + 1)}-${padZero(d)}`;
      days.push({ dateStr: dStr, dayNumber: d, isCurrentMonth: false, isToday: dStr === todayS });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(d)}`;
      days.push({ dateStr: dStr, dayNumber: d, isCurrentMonth: true, isToday: dStr === todayS });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${padZero(nextM + 1)}-${padZero(d)}`;
      days.push({ dateStr: dStr, dayNumber: d, isCurrentMonth: false, isToday: dStr === todayS });
    }
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };
  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr());
    setDayDetailOpen(true);
  };

  // Kanban 28432797: honap-valtas oldalra-swipe-pal mobilon (Google Naptar
  // minta), a mar meglevo nyil-gombok MELLETT, nem helyette. Natuv
  // touchstart/touchmove/touchend a honap-racs konteinerere, NEM a React
  // szintetikus onTouch* propok -- azok a touchmove-ot passzivkent kotik be,
  // es egy preventDefault() benne csak figyelmeztetest ad, nem allitja meg a
  // bongeszo sajat gorgeteset (ismert React-csapda).
  // Harom gesztus EGYUTTELESET kell szetvalasztani (lasd kartya):
  //  a) fuggoleges lap-gorgetes (629ebf36 ota magasabb cellak miatt van mit
  //     gorgetni) -- ha a mozdulat fuggoleges-dominans, azonnal 'active=false'-ra
  //     allunk es SOHA nem hivunk preventDefault-ot, a natuv scroll valtozatlan.
  //  b) MonthOccurrenceChip sajat drag-athelyezese a grip-fogantyun (dnd-kit
  //     TouchSensor, lasd 53ea4b7e) -- ha a touchstart a grip-gombon
  //     kezdodott, a swipe-detektalas teljesen kimarad, a gesztus 100%-ban a
  //     dnd-kit-e.
  //  c) az uj honap-lapozo swipe -- csak akkor aktivalodik, ha a mozdulat
  //     TISZTAN horizontalis (|dx| > |dy| * 1.5) ES egy minimum 60px-et
  //     mozdult, hogy veletlen remegesre ne valtson honapot.
  // A racs vizualisan koveti az ujjat (transform: translateX) a jobb erzet
  // kedveert, de a teljes Google Naptar-szeru "lapozo" ki-be csuszo animacio
  // (elozo/kovetkezo honap egyszerre lathato athuzas kozben) szandekosan nincs
  // megvalositva -- a kartya csak a lapozas-gesztust es az utkozes-kezelest
  // kerte, a teljes vizualis parity kulon, nagyobb scope lenne.
  const monthGridRef = useRef<HTMLDivElement>(null);
  const monthSwipeHandlersRef = useRef({ prev: handlePrevMonth, next: handleNextMonth });
  useEffect(() => {
    monthSwipeHandlersRef.current = { prev: handlePrevMonth, next: handleNextMonth };
  });

  useEffect(() => {
    const el = monthGridRef.current;
    if (!el) return;

    const MIN_SWIPE_PX = 60;
    const DIRECTION_LOCK_PX = 10;
    const HORIZONTAL_RATIO = 1.5;
    const GRIP_SELECTOR = 'button[title="Húzással áthelyezhető másik napra"]';

    const state: { active: boolean; startX: number; startY: number; direction: 'horizontal' | 'vertical' | null } = {
      active: false,
      startX: 0,
      startY: 0,
      direction: null,
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        state.active = false;
        return;
      }
      const target = e.target;
      if (target instanceof Element && target.closest(GRIP_SELECTOR)) {
        state.active = false;
        return;
      }
      state.active = true;
      state.direction = null;
      state.startX = e.touches[0].clientX;
      state.startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!state.active || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - state.startX;
      const dy = e.touches[0].clientY - state.startY;

      if (state.direction === null) {
        if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
        state.direction = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO ? 'horizontal' : 'vertical';
        if (state.direction === 'vertical') {
          state.active = false;
          return;
        }
      }

      e.preventDefault();
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!state.active || state.direction !== 'horizontal') {
        state.active = false;
        return;
      }
      const endX = e.changedTouches[0]?.clientX ?? state.startX;
      const dx = endX - state.startX;
      el.style.transition = 'transform 150ms ease-out';
      el.style.transform = '';
      if (dx <= -MIN_SWIPE_PX) {
        monthSwipeHandlersRef.current.next();
      } else if (dx >= MIN_SWIPE_PX) {
        monthSwipeHandlersRef.current.prev();
      }
      state.active = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const monthName = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    const month = date.toLocaleDateString('hu-HU', { month: 'long' });
    return `${currentYear}. ${month.charAt(0).toUpperCase() + month.slice(1)}`;
  }, [currentYear, currentMonth]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  const selectedDateOccurrences = occurrencesByDate.get(selectedDateStr) || [];

  const openAddOccurrence = () => {
    setAddingOccurrence(true);
    setAddProgramId(selectedProgramId !== 'all' ? selectedProgramId : (programs[0]?.id || ''));
    setAddStartTime('10:00');
    setAddEndTime('');
    setAddError(null);
  };

  const saveAddOccurrence = async () => {
    if (!addProgramId) {
      setAddError('Válassz programot.');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      await onCreateOccurrence(addProgramId, selectedDateStr, {
        start_time: addStartTime || null,
        end_time: addEndTime || null,
      });
      setAddingOccurrence(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Az időpont felvétele nem sikerült.');
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top filter + navigation */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button type="button" onClick={handlePrevMonth} aria-label="Előző hónap" className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={handleToday} className="px-3 py-1 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer">
                Ma
              </button>
              <button type="button" onClick={handleNextMonth} aria-label="Következő hónap" className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0 hidden sm:block" />
              <h3 className="font-display text-lg sm:text-xl font-extrabold text-stone-900">{monthName}</h3>
            </div>
          </div>

          {programs.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-xl self-start lg:self-auto">
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

      {lastDragMove && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <span className="flex-1">Áthelyezve.</span>
          <button
            type="button"
            onClick={undoLastDragMove}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shrink-0"
          >
            Visszavonás
          </button>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-stone-100 border-b border-stone-200 text-center py-2.5">
          {WEEKDAYS.map((day, idx) => (
            <div key={idx} className="text-xs font-bold text-stone-600">
              <span className="sm:hidden">{day.short}</span>
              <span className="hidden sm:inline">{day.label}</span>
            </div>
          ))}
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div ref={monthGridRef} className="grid grid-cols-7 divide-x divide-y divide-stone-100 border-b border-stone-200">
            {calendarDays.map((dayItem, index) => (
              <MonthDayCell
                key={index}
                dayItem={dayItem}
                isSelected={dayDetailOpen && dayItem.dateStr === selectedDateStr}
                items={occurrencesByDate.get(dayItem.dateStr) || []}
                bookedCountByOccurrence={bookedCountByOccurrence}
                pendingOccurrenceIds={pendingOccurrenceIds}
                onSelect={() => { setSelectedDateStr(dayItem.dateStr); setDayDetailOpen(true); }}
                onOpenPopup={setDayPopupOccurrence}
              />
            ))}
          </div>
        </DndContext>

        <div className="p-3 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center gap-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Nyitott időpont</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            <span>Lemondva</span>
          </span>
        </div>
      </div>

      {/* Kanban c2c66884: nap-reszlet popup (ugyanaz a modal-UI stilus mint a
          ProgramDayPopup -- fix backdrop, kozepre igazitott kartya, X bezaras),
          a korabbi mindig-lathato oldalpanel helyett. */}
      {dayDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between gap-2 rounded-t-3xl">
              <div className="min-w-0">
                <span className="text-xs font-medium text-emerald-400 block uppercase tracking-wider">Kiválasztott Nap</span>
                <h4 className="font-display text-base sm:text-lg font-bold capitalize truncate">{formattedSelectedDate}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
                  {selectedDateOccurrences.length} időpont
                </span>
                <button
                  type="button"
                  onClick={() => setDayDetailOpen(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Bezárás"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">

              {selectedDateOccurrences.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateOccurrences.map(({ occ, program }) => {
                    const booked = bookedCountByOccurrence.get(occ.id) || 0;
                    const maxCap = occ.max_participants ?? program?.max_participants ?? null;
                    const isFull = maxCap != null && booked >= maxCap;
                    const isMoving = movingOccurrenceId === occ.id;
                    const isCopying = copyingOccurrenceId === occ.id;
                    const isDeleting = deletingOccurrenceId === occ.id;
                    const isCancelling = cancellingOccurrenceId === occ.id;

                    return (
                      <div
                        key={occ.id}
                        className={`rounded-2xl border p-4 space-y-3 ${
                          occ.status === 'cancelled' ? 'bg-stone-100/50 border-stone-200 opacity-70' : 'bg-stone-50/50 border-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => setDayPopupOccurrence(occ)}
                              className="font-bold text-stone-900 text-sm sm:text-base text-left hover:text-emerald-700 hover:underline cursor-pointer"
                              title="Program összefoglaló és a napi foglalások"
                            >
                              {program?.title || 'Program'}
                            </button>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 mt-1">
                              {occ.start_time && (
                                <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="font-bold text-stone-800">
                                    {occ.start_time}{occ.end_time ? `–${occ.end_time}` : ''}
                                  </span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200">
                                <Users className="w-3.5 h-3.5 text-stone-500" />
                                <span className={`font-bold ${isFull ? 'text-amber-700' : 'text-stone-800'}`}>
                                  {booked}{maxCap != null ? ` / ${maxCap}` : ''} fő
                                </span>
                              </span>
                              {occ.status === 'cancelled' && (
                                <span className="inline-flex items-center gap-1 text-stone-500 text-[11px]">
                                  <Ban className="w-3 h-3" /> Lemondva
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isMoving ? (
                          <div className="bg-white rounded-xl p-3 border border-stone-200 space-y-2">
                            {moveError && <p className="text-xs font-semibold text-rose-700">{moveError}</p>}
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="date"
                                value={moveDate}
                                onChange={e => setMoveDate(e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                              />
                              <input
                                type="time"
                                value={moveStartTime}
                                onChange={e => setMoveStartTime(e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                              />
                              <input
                                type="time"
                                value={moveEndTime}
                                onChange={e => setMoveEndTime(e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={saveMove}
                                disabled={moveSaving}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                              >
                                {moveSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>Mentés</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelMove}
                                className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Mégse</span>
                              </button>
                            </div>
                          </div>
                        ) : isCopying ? (
                          <div className="bg-white rounded-xl p-3 border border-sky-200 space-y-2">
                            <div className="inline-flex items-center p-0.5 bg-stone-100 rounded-lg text-[11px] font-bold text-stone-600">
                              <button
                                type="button"
                                onClick={() => setCopyMode('single')}
                                className={`px-2 py-1 rounded-md cursor-pointer ${copyMode === 'single' ? 'bg-white text-stone-900 shadow-xs' : ''}`}
                              >
                                Egy dátum
                              </button>
                              <button
                                type="button"
                                onClick={() => setCopyMode('recurring')}
                                className={`px-2 py-1 rounded-md cursor-pointer ${copyMode === 'recurring' ? 'bg-white text-stone-900 shadow-xs' : ''}`}
                              >
                                Ismétlődés
                              </button>
                            </div>
                            {copyMode === 'single' ? (
                              <>
                                {copyError && <p className="text-xs font-semibold text-rose-700">{copyError}</p>}
                                <p className="text-xs font-bold text-stone-700">Másolás melyik napra?</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={copyDate}
                                    onChange={e => setCopyDate(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs flex-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => saveCopy(occ, copyDate)}
                                    disabled={copySaving || !copyDate}
                                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                                  >
                                    {copySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>Másolás</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelCopy}
                                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <RecurringCopyPanel
                                occ={occ}
                                weekday={recurringWeekday}
                                onChangeWeekday={setRecurringWeekday}
                                untilDate={recurringUntilDate}
                                onChangeUntilDate={setRecurringUntilDate}
                                saving={recurringSaving}
                                error={recurringError}
                                onSave={(dates) => saveCopyRecurring(occ, dates)}
                                onCancel={cancelCopy}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200/60">
                            {onOpenManualBooking && (
                              <button
                                type="button"
                                onClick={() => onOpenManualBooking(program?.id, occ.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Külső foglalás</span>
                              </button>
                            )}
                            <div
                              className="relative ml-auto"
                              ref={openActionsMenuId === occ.id ? actionsMenuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenActionsMenuId(prev => (prev === occ.id ? null : occ.id))}
                                className="p-1.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="További műveletek"
                                aria-haspopup="menu"
                                aria-expanded={openActionsMenuId === occ.id}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {openActionsMenuId === occ.id && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-stone-200 shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150"
                                >
                                  {program && onEditProgram && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => { onEditProgram(program); setOpenActionsMenuId(null); }}
                                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-stone-500" />
                                      <span>Szerkesztés</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => { startMove(occ); setOpenActionsMenuId(null); }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CalendarDays className="w-3.5 h-3.5 text-stone-500" />
                                    <span>Áthelyezés</span>
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => { startCopy(occ); setOpenActionsMenuId(null); }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-sky-700 hover:bg-sky-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Másolás</span>
                                  </button>
                                  {booked > 0 ? (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={isCancelling || occ.status === 'cancelled'}
                                      onClick={() => { setOpenActionsMenuId(null); handleCancelOccurrence(occ.id); }}
                                      title="Foglalás miatt törlés nem lehetséges -- az alkalom lemondható"
                                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-stone-100 disabled:opacity-60"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>Alkalom lemondása</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={isDeleting}
                                      onClick={() => { setOpenActionsMenuId(null); handleDelete(occ.id); }}
                                      title="Időpont törlése"
                                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-stone-100 disabled:opacity-60"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Törlés</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 px-4 space-y-1">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-stone-800 text-sm">Nincs időpont erre a napra</h5>
                  <p className="text-xs text-stone-500">Vedd fel egy program új időpontját lent.</p>
                </div>
              )}

              {/* Quick-add new occurrence */}
              {addingOccurrence ? (
                <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200 space-y-2">
                  {addError && <p className="text-xs font-semibold text-rose-700">{addError}</p>}
                  <select
                    value={addProgramId}
                    onChange={e => setAddProgramId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                  >
                    <option value="">Válassz programot…</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="time"
                      value={addStartTime}
                      onChange={e => setAddStartTime(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                    />
                    <input
                      type="time"
                      value={addEndTime}
                      onChange={e => setAddEndTime(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveAddOccurrence}
                      disabled={addSaving}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Felvétel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingOccurrence(false)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Mégse</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAddOccurrence}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>+ Új időpont ezen a napon</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

interface MonthDayCellProps {
  dayItem: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean };
  isSelected: boolean;
  items: Array<{ occ: ProgramOccurrence; program: Program | undefined }>;
  bookedCountByOccurrence: Map<string, number>;
  pendingOccurrenceIds: Set<string>;
  onSelect: () => void;
  onOpenPopup: (occ: ProgramOccurrence) => void;
}

// Kanban f1b8d7a3: a honap-cella droppable (@dnd-kit), hogy a
// MonthOccurrenceChip-ek huzassal athelyezhetok legyenek ide, ugyanazzal a
// mechanikaval mint a ProviderScheduleWeekBoard DayColumn-ja.
// Kanban c2c66884 (Csaba korrekcioja, Zora/Csaba dontese msg 3390): mobilon
// MAR NEM szines pontok -- ugyanaz a kompakt kartya-komponens (MonthOccurrenceChip)
// jelenik meg, mint desktopon, igy a korabbi (msg 3380, 3. pont) "nincs mobil
// drag" dontes felulirva: a grip-fogantyu mobilon is aktiv marad, mert ez pontosan
// a mar bevalt desktop kartya-komponens ujrahasznositasa, nem uj mobil-dizajn.
// Kanban dyn001: a cella magassaga mar korabban is min-height (nem fix height),
// tehat a 629ebf36 ota termeszetesen novekszik ha tobb chip fer bele -- a
// korabbi 2-es cap volt az, ami ezt megakadalyozta ("+N tovabbi" csonkitas
// mar 3. programnal is). A cap most 6-ra nott, csak ennel tobb program eseten
// jelenik meg az overflow-szoveg.
const DAY_CELL_VISIBLE_CAP = 6;

const MonthDayCell: React.FC<MonthDayCellProps> = ({ dayItem, isSelected, items, bookedCountByOccurrence, pendingOccurrenceIds, onSelect, onOpenPopup }) => {
  const { setNodeRef, isOver } = useDroppable({ id: dayItem.dateStr });
  const hasOccurrences = items.length > 0;
  const visibleItems = items.slice(0, DAY_CELL_VISIBLE_CAP);
  const overflowCount = items.length - visibleItems.length;

  return (
    <div
      ref={setNodeRef}
      data-testid={`day-cell-${dayItem.dateStr}`}
      onClick={onSelect}
      className={`min-h-[150px] sm:min-h-[105px] p-2 transition-all cursor-pointer relative flex flex-col justify-between ${
        isOver
          ? 'bg-emerald-50/70 ring-2 ring-emerald-400 ring-inset z-10'
          : !dayItem.isCurrentMonth
          ? 'bg-stone-50/60 text-stone-400'
          : isSelected
          ? 'bg-emerald-50/40 ring-2 ring-emerald-600 ring-inset z-10'
          : dayItem.isToday
          ? 'bg-emerald-50/50 ring-1 ring-emerald-300 ring-inset hover:bg-emerald-50/70'
          : 'bg-white hover:bg-stone-50/80 text-stone-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
            dayItem.isToday
              ? 'bg-stone-900 text-white font-extrabold shadow-xs'
              : isSelected && dayItem.isCurrentMonth
              ? 'text-emerald-700 font-extrabold'
              : !dayItem.isCurrentMonth
              ? 'text-stone-400'
              : 'text-stone-700'
          }`}
        >
          {dayItem.dayNumber}
        </span>
        {hasOccurrences && (
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
            {items.length}
          </span>
        )}
      </div>

      <div className="mt-1 space-y-1">
        {visibleItems.map((item) => (
          <MonthOccurrenceChip
            key={item.occ.id}
            occ={item.occ}
            program={item.program}
            booked={bookedCountByOccurrence.get(item.occ.id) || 0}
            hasPending={pendingOccurrenceIds.has(item.occ.id)}
            onOpenPopup={() => onOpenPopup(item.occ)}
          />
        ))}
        {overflowCount > 0 && (
          <div className="text-[11px] sm:text-[9px] font-bold text-stone-500 pl-1">+{overflowCount} további</div>
        )}
      </div>
    </div>
  );
};

interface MonthOccurrenceChipProps {
  occ: ProgramOccurrence;
  program: Program | undefined;
  booked: number;
  hasPending: boolean;
  onOpenPopup: () => void;
}

// Kompakt, huzhato varians a ProviderScheduleWeekBoard OccurrenceCard-jahoz kepest --
// a honap-cella (~150px szeles) nem fer el a teljes kartyat, csak egy sor: kis
// drag-handle + ido+cim. Masolas/pontos-datum-athelyezes/torles a kivalasztott-nap
// popupon marad (ott mar megvan, nem duplikalt itt).
// Kanban 629ebf36: mobilon a cella magassaga 96px->150px-re nott es a chip
// betumeret/padding/grip-ikon is nagyobb (sm: felett valtozatlan), mivel a 7
// oszlopos racs szelessege fix -- a tobb magassag termeszetesen lefele
// gorgethetove teszi a Havi nezetet, nincs kulon scroll-konteiner korulotte.
// Kanban 5d9187b1 (#5): letszam (booked/maxCap) + narancs keret ha van
// visszaigazolasra varo (pending) rendeles az occurrence-hez -- ugyanaz a
// jelzes-logika, mint a heti OccurrenceCard-nal, csak kompaktabb formaban.
// Kanban 53ea4b7e: a kulso chip-div touch-none-ja eltavolitva -- ugyanaz a
// hiba volt mint az OccurrenceCard-nal (lasd ott), a grip-gomb sajat
// touch-none-ja eleg a drag aktivalasahoz, a kulsoe csak a Havi nezet
// gorgeteset blokkolta mobilon.
const MonthOccurrenceChip: React.FC<MonthOccurrenceChipProps> = ({ occ, program, booked, hasPending, onOpenPopup }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: occ.id });
  const maxCap = occ.max_participants ?? program?.max_participants ?? null;

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: isDragging ? 0.85 : 1 }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 sm:gap-1 text-xs sm:text-[10px] font-semibold rounded px-1.5 py-1 sm:px-1 sm:py-0.5 border leading-tight ${
        occ.status === 'cancelled'
          ? 'bg-stone-100 border-stone-200 text-stone-400'
          : hasPending
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-0 text-emerald-700/50 hover:text-emerald-900 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        title="Húzással áthelyezhető másik napra"
      >
        <GripVertical className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenPopup(); }}
        className="truncate text-left flex-1 min-w-0 cursor-pointer hover:underline"
        title={`${program?.title || 'Program'}${occ.start_time ? ` - ${occ.start_time}` : ''}${hasPending ? ' -- visszaigazolasra var' : ''}`}
      >
        {occ.start_time && <span className="font-bold mr-1">{occ.start_time}</span>}
        <span>{program?.title || 'Program'}</span>
      </button>
      {occ.status !== 'cancelled' && (
        <span className="shrink-0 tabular-nums">
          {booked}{maxCap != null ? `/${maxCap}` : ''}
        </span>
      )}
    </div>
  );
};
