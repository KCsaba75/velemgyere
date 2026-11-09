import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  Clock,
  Users,
  Phone,
  ExternalLink,
  Pencil,
  Trash2,
  Ban,
  Loader2,
  CalendarPlus,
  Save,
  X,
} from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { ProgramDayPopup } from './ProgramDayPopup';

interface ProviderScheduleCalendarProps {
  programs: Program[];
  occurrencesMap: Record<string, ProgramOccurrence>;
  orders: Order[];
  getOrderBuyerInfo: (orderId: string) => Promise<OrderBuyerInfo | null>;
  onOpenManualBooking?: (programId?: string) => void;
  onEditProgram?: (program: Program) => void;
  onCreateOccurrence: (
    programId: string,
    dateStr: string,
    overrides: { start_time?: string | null; end_time?: string | null; max_participants?: number | null }
  ) => Promise<void>;
  onMoveOccurrence: (
    occurrenceId: string,
    updates: { event_date: string; start_time?: string | null; end_time?: string | null }
  ) => Promise<void>;
  onDeleteOccurrence: (occurrenceId: string) => Promise<void>;
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
  onMoveOccurrence,
  onDeleteOccurrence,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr());
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [dayPopupOccurrence, setDayPopupOccurrence] = useState<ProgramOccurrence | null>(null);

  const [movingOccurrenceId, setMovingOccurrenceId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveStartTime, setMoveStartTime] = useState('');
  const [moveEndTime, setMoveEndTime] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [addingOccurrence, setAddingOccurrence] = useState(false);
  const [addProgramId, setAddProgramId] = useState<string>('');
  const [addStartTime, setAddStartTime] = useState('10:00');
  const [addEndTime, setAddEndTime] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deletingOccurrenceId, setDeletingOccurrenceId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach(p => map.set(p.id, p));
    return map;
  }, [programs]);

  const bookedCountByOccurrence = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter(o => o.status !== 'cancelled' && o.occurrence_id)
      .forEach(o => {
        map.set(o.occurrence_id!, (map.get(o.occurrence_id!) || 0) + (o.participants_count || 0));
      });
    return map;
  }, [orders]);

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
  };

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

  const openDeepLink = (programId: string | undefined, dateStr: string) => {
    const params = new URLSearchParams();
    if (programId) params.set('program', programId);
    params.set('datum', dateStr);
    window.open(`/szolgaltato/foglalasaim?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const startMove = (occ: ProgramOccurrence) => {
    setMovingOccurrenceId(occ.id);
    const dateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    setMoveDate(dateStr);
    setMoveStartTime(occ.start_time || '');
    setMoveEndTime(occ.end_time || '');
    setMoveError(null);
  };

  const cancelMove = () => {
    setMovingOccurrenceId(null);
    setMoveError(null);
  };

  const saveMove = async () => {
    if (!movingOccurrenceId || !moveDate) return;
    setMoveSaving(true);
    setMoveError(null);
    try {
      await onMoveOccurrence(movingOccurrenceId, {
        event_date: moveDate,
        start_time: moveStartTime || null,
        end_time: moveEndTime || null,
      });
      setMovingOccurrenceId(null);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Az áthelyezés nem sikerült.');
    } finally {
      setMoveSaving(false);
    }
  };

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

  const handleDelete = async (occurrenceId: string) => {
    if (!window.confirm('Biztosan törlöd ezt az időpontot? Ha van hozzá foglalás, a törlés nem fog sikerülni.')) return;
    setDeletingOccurrenceId(occurrenceId);
    setDeleteError(null);
    try {
      await onDeleteOccurrence(occurrenceId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'A törlés nem sikerült.');
    } finally {
      setDeletingOccurrenceId(null);
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

      {/* Calendar + day panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-stone-100 border-b border-stone-200 text-center py-2.5">
            {WEEKDAYS.map((day, idx) => (
              <div key={idx} className="text-xs font-bold text-stone-600">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 border-b border-stone-200">
            {calendarDays.map((dayItem, index) => {
              const dayOccurrences = occurrencesByDate.get(dayItem.dateStr) || [];
              const hasOccurrences = dayOccurrences.length > 0;
              const isSelected = dayItem.dateStr === selectedDateStr;

              return (
                <div
                  key={index}
                  data-testid={`day-cell-${dayItem.dateStr}`}
                  onClick={() => setSelectedDateStr(dayItem.dateStr)}
                  className={`min-h-[72px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    !dayItem.isCurrentMonth
                      ? 'bg-stone-50/60 text-stone-400'
                      : isSelected
                      ? 'bg-emerald-50/40 ring-2 ring-emerald-600 ring-inset z-10'
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
                        {dayOccurrences.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                      {dayOccurrences.slice(0, 3).map((item, bIdx) => (
                        <span
                          key={bIdx}
                          className={`w-2 h-2 rounded-full ${item.occ.status === 'cancelled' ? 'bg-stone-300' : 'bg-emerald-500'}`}
                        />
                      ))}
                    </div>
                    <div className="hidden sm:block space-y-1">
                      {dayOccurrences.slice(0, 2).map((item, bIdx) => (
                        <div
                          key={bIdx}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border leading-tight ${
                            item.occ.status === 'cancelled'
                              ? 'bg-stone-100 border-stone-200 text-stone-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}
                          title={`${item.program?.title || 'Program'}${item.occ.start_time ? ` - ${item.occ.start_time}` : ''}`}
                        >
                          {item.occ.start_time && <span className="font-bold mr-1">{item.occ.start_time}</span>}
                          <span>{item.program?.title || 'Program'}</span>
                        </div>
                      ))}
                      {dayOccurrences.length > 2 && (
                        <div className="text-[9px] font-bold text-stone-500 pl-1">+{dayOccurrences.length - 2} további</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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

        {/* Day panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-medium text-emerald-400 block uppercase tracking-wider">Kiválasztott Nap</span>
                <h4 className="font-display text-base sm:text-lg font-bold capitalize truncate">{formattedSelectedDate}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openDeepLink(selectedProgramId !== 'all' ? selectedProgramId : undefined, selectedDateStr)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold border border-white/10 transition-colors cursor-pointer"
                  title="A kiválasztott program és nap foglalásai új lapon"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Foglalások</span>
                </button>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
                  {selectedDateOccurrences.length} időpont
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {deleteError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">{deleteError}</p>
              )}

              {selectedDateOccurrences.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateOccurrences.map(({ occ, program }) => {
                    const booked = bookedCountByOccurrence.get(occ.id) || 0;
                    const maxCap = occ.max_participants ?? program?.max_participants ?? null;
                    const isFull = maxCap != null && booked >= maxCap;
                    const isMoving = movingOccurrenceId === occ.id;
                    const isDeleting = deletingOccurrenceId === occ.id;

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
                          {program && onEditProgram && (
                            <button
                              type="button"
                              onClick={() => onEditProgram(program)}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                              title="Program szerkesztése"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200/60">
                            <button
                              type="button"
                              onClick={() => startMove(occ)}
                              className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <CalendarDays className="w-3.5 h-3.5 text-stone-500" />
                              <span>Áthelyezés</span>
                            </button>
                            {onOpenManualBooking && (
                              <button
                                type="button"
                                onClick={() => onOpenManualBooking(program?.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Külső foglalás</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(occ.id)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60 ml-auto"
                              title="Időpont törlése"
                            >
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              <span>Törlés</span>
                            </button>
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
      </div>

      {dayPopupOccurrence && (
        <ProgramDayPopup
          occurrence={dayPopupOccurrence}
          program={programMap.get(dayPopupOccurrence.program_id)}
          orders={orders}
          getOrderBuyerInfo={getOrderBuyerInfo}
          onClose={() => setDayPopupOccurrence(null)}
        />
      )}
    </div>
  );
};
