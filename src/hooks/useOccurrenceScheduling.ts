import { useEffect, useRef, useState } from 'react';
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ProgramOccurrence } from '../types/database';

type MoveUpdates = { event_date: string; start_time?: string | null; end_time?: string | null };
type CreateOverrides = { start_time?: string | null; end_time?: string | null; max_participants?: number | null };

const UNDO_TIMEOUT_MS = 8000;
// Kanban 882a92d9 (#8): biztonsagi felso korlat az ismetlodo-generatornak --
// ~2 ev heti ismetlodes, hogy egy elgepelt veg-datum (pl. rossz evszam) ne
// probaljon ezer sort letrehozni.
const MAX_RECURRING_DATES = 104;

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

// Kanban 882a92d9 (#8): hetnap-index hetfo-elso sorrendben (0=Hetfo..6=Vasarnap),
// hogy illeszkedjen a tobbi naptar-komponens WEEKDAYS/WEEKDAY_LABELS tombjehez.
// A szamolas magat sosem tarolja -- csak a belole generalt konkret datum-listat
// adja vissza, amit a hivo elozetesen megmutat, es csak jovahagyas utan hivja
// a mar letezo batch createOccurrences-t (lasd adatmodell-dontes a kartyan).
export function computeWeeklyRecurringDates(fromDateStr: string, weekdayIndexMondayFirst: number, untilDateStr: string): string[] {
  const targetJsWeekday = (weekdayIndexMondayFirst + 1) % 7;
  const fromDate = new Date(`${fromDateStr}T00:00:00`);
  const untilDate = new Date(`${untilDateStr}T00:00:00`);
  if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime()) || untilDate < fromDate) return [];

  const start = new Date(fromDate);
  start.setDate(start.getDate() + 1);
  const diffToTarget = (targetJsWeekday - start.getDay() + 7) % 7;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + diffToTarget);

  const dates: string[] = [];
  while (cursor <= untilDate && dates.length < MAX_RECURRING_DATES) {
    dates.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

// Kanban f1b8d7a3: a ProviderScheduleWeekBoard huzas/masolas/torles allapot-gepe es
// @dnd-kit szenzora egy helyre kiemelve, hogy a ProviderScheduleCalendar (honap-nezet)
// is hasznalhassa ugyanazt a mechanikat masolas/beillesztes nelkul (Zora dontese,
// msg 3380): a masolas TOVABBRA IS az eredeti ikon-gomb + datum-valaszto minta, nincs
// uj Ctrl-drag/long-press egyik nezetben sem.
// Kanban f167e85e (#2): kulon MouseSensor (egerrel marad a rovid-distance aktivalas,
// gyors desktop UX) es TouchSensor (mobilon csak 250ms hosszu nyomasra indul a huzas,
// kis tolerance-szal -- ez ad esanyt a gorgetesnek a drag-indulas elott).
export function useOccurrenceScheduling(
  occurrencesMap: Record<string, ProgramOccurrence>,
  onMoveOccurrence: (occurrenceId: string, updates: MoveUpdates) => Promise<void>,
  onCreateOccurrence: (programId: string, dateStr: string, overrides: CreateOverrides) => Promise<void>,
  onDeleteOccurrence: (occurrenceId: string) => Promise<void>,
  bookedCountByOccurrence: Map<string, number>,
  // Kanban 882a92d9 (#8): batch-verzio az ismetlodo-masolashoz -- a mar letezo
  // AppContext createOccurrences(programId, dates[], overrides) direkt hivasa,
  // nem uj backend-funkcio.
  onCreateOccurrences: (programId: string, dates: string[], overrides: CreateOverrides) => Promise<void>
) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );
  const [dragError, setDragError] = useState<string | null>(null);

  // Kanban f167e85e (#2): mentes utan rovid "Visszavonas" lehetoseg -- a korabbi
  // (event_date/start_time/end_time) allapotot tartja meg, 8 mp utan eltunik.
  const [lastDragMove, setLastDragMove] = useState<{ occurrenceId: string; previous: MoveUpdates } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const [movingOccurrenceId, setMovingOccurrenceId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveStartTime, setMoveStartTime] = useState('');
  const [moveEndTime, setMoveEndTime] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [copyingOccurrenceId, setCopyingOccurrenceId] = useState<string | null>(null);
  const [copyDate, setCopyDate] = useState('');
  const [copySaving, setCopySaving] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Kanban 882a92d9 (#8): "Egy datum" (fent, valtozatlan) mellett "Ismetlodes"
  // ag -- hetnap + veg-datum, a konkret listat a hivo (OccurrenceCard/
  // MonthDayCell) szamolja ki elozetesen computeWeeklyRecurringDates-szel,
  // itt csak a bemenet (allapot) es a vegso mentes van.
  const [copyMode, setCopyMode] = useState<'single' | 'recurring'>('single');
  const [recurringWeekday, setRecurringWeekday] = useState(0);
  const [recurringUntilDate, setRecurringUntilDate] = useState('');
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  const [deletingOccurrenceId, setDeletingOccurrenceId] = useState<string | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const occurrenceId = String(active.id);
    const targetDate = String(over.id);
    const occ = occurrencesMap[occurrenceId];
    if (!occ) return;
    const currentDate = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    if (currentDate === targetDate) return;

    const booked = bookedCountByOccurrence.get(occurrenceId) || 0;
    if (booked > 0) {
      const confirmed = window.confirm(
        `${booked} fő foglalt erre az időpontra. Biztosan áthelyezed ${targetDate}-ra?`
      );
      if (!confirmed) return;
    }

    setDragError(null);
    const previous: MoveUpdates = {
      event_date: currentDate,
      start_time: occ.start_time || null,
      end_time: occ.end_time || null,
    };
    try {
      await onMoveOccurrence(occurrenceId, {
        event_date: targetDate,
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
      });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setLastDragMove({ occurrenceId, previous });
      undoTimerRef.current = setTimeout(() => setLastDragMove(null), UNDO_TIMEOUT_MS);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'Az áthelyezés nem sikerült (húzással).');
    }
  };

  const undoLastDragMove = async () => {
    if (!lastDragMove) return;
    const { occurrenceId, previous } = lastDragMove;
    setLastDragMove(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await onMoveOccurrence(occurrenceId, previous);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'A visszavonás nem sikerült.');
    }
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

  const startCopy = (occ: ProgramOccurrence) => {
    setCopyingOccurrenceId(occ.id);
    setCopyDate('');
    setCopyError(null);
    setCopyMode('single');
    const dateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    const jsWeekday = new Date(`${dateStr}T00:00:00`).getDay();
    setRecurringWeekday((jsWeekday + 6) % 7);
    setRecurringUntilDate('');
    setRecurringError(null);
  };

  const cancelCopy = () => {
    setCopyingOccurrenceId(null);
    setCopyError(null);
    setRecurringError(null);
  };

  const saveCopy = async (occ: ProgramOccurrence, targetDate: string) => {
    if (!targetDate) return;
    setCopySaving(true);
    setCopyError(null);
    try {
      await onCreateOccurrence(occ.program_id, targetDate, {
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
        max_participants: occ.max_participants ?? null,
      });
      setCopyingOccurrenceId(null);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'A másolás nem sikerült.');
    } finally {
      setCopySaving(false);
    }
  };

  // Kanban 882a92d9 (#8): a hivo (UI) mar kiszamolta es elozetesen megmutatta
  // a `dates` listat computeWeeklyRecurringDates-szel -- itt csak a jovahagyott
  // listat kuldjuk egyben a mar letezo batch createOccurrences-nek.
  const saveCopyRecurring = async (occ: ProgramOccurrence, dates: string[]) => {
    if (dates.length === 0) return;
    setRecurringSaving(true);
    setRecurringError(null);
    try {
      await onCreateOccurrences(occ.program_id, dates, {
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
        max_participants: occ.max_participants ?? null,
      });
      setCopyingOccurrenceId(null);
    } catch (err) {
      setRecurringError(err instanceof Error ? err.message : 'Az ismétlődő másolás nem sikerült.');
    } finally {
      setRecurringSaving(false);
    }
  };

  const handleDelete = async (occurrenceId: string) => {
    if (!window.confirm('Biztosan törlöd ezt az időpontot? Ha van hozzá foglalás, a törlés nem fog sikerülni.')) return;
    setDeletingOccurrenceId(occurrenceId);
    try {
      await onDeleteOccurrence(occurrenceId);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'A törlés nem sikerült.');
    } finally {
      setDeletingOccurrenceId(null);
    }
  };

  return {
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
  };
}
