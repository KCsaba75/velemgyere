import React, { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Copy,
  MoreHorizontal,
  Trash2,
  Clock,
  Users,
  Loader2,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import { Order, OrderBuyerInfo, Program, ProgramOccurrence } from '../types/database';
import { ProgramDayPopup } from './ProgramDayPopup';

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
  onMoveOccurrence: (
    occurrenceId: string,
    updates: { event_date: string; start_time?: string | null; end_time?: string | null }
  ) => Promise<void>;
  onDeleteOccurrence: (occurrenceId: string) => Promise<void>;
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

// Kanban 4230d70e (C pont, Csaba referencia-kepe alapjan): Trello-stilusu
// nap-oszlopos het-nezet, @dnd-kit/core-ral. Huzas = athelyezes (onMoveOccurrence,
// csak a datum valtozik). A masolashoz NEM Ctrl+huzas/long-press van (Zora eredeti
// otlete), hanem egy explicit masolo-ikon a kartyan -- Csaba sajat referenciakepen
// is ezt a mintat mutatta. A "..." gomb a mar meglevo gomb/form pontos-datum
// athelyezest nyitja meg ugyanitt (tavoli/nem lathato heti datumhoz, kanban
// 3349 3. kerdese). A honap-nezet (ProviderScheduleCalendar) valtozatlan marad,
// nem dragolhato.
export const ProviderScheduleWeekBoard: React.FC<ProviderScheduleWeekBoardProps> = ({
  programs,
  occurrencesMap,
  orders,
  getOrderBuyerInfo,
  onCreateOccurrence,
  onMoveOccurrence,
  onDeleteOccurrence,
}) => {
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [dragError, setDragError] = useState<string | null>(null);
  const [dayPopupOccurrence, setDayPopupOccurrence] = useState<ProgramOccurrence | null>(null);

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

  const [deletingOccurrenceId, setDeletingOccurrenceId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const occurrenceId = String(active.id);
    const targetDate = String(over.id);
    const occ = occurrencesMap[occurrenceId];
    if (!occ) return;
    const currentDate = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
    if (currentDate === targetDate) return;

    setDragError(null);
    try {
      await onMoveOccurrence(occurrenceId, {
        event_date: targetDate,
        start_time: occ.start_time || null,
        end_time: occ.end_time || null,
      });
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'Az áthelyezés nem sikerült (húzással).');
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

      {dragError && (
        <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{dragError}</span>
          <button type="button" onClick={() => setDragError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map(day => (
            <DayColumn
              key={day.dateStr}
              dateStr={day.dateStr}
              label={day.label}
              date={day.date}
              items={occurrencesByDate.get(day.dateStr) || []}
              weekDays={weekDays}
              bookedCountByOccurrence={bookedCountByOccurrence}
              movingOccurrenceId={movingOccurrenceId}
              moveDate={moveDate}
              moveStartTime={moveStartTime}
              moveEndTime={moveEndTime}
              moveSaving={moveSaving}
              moveError={moveError}
              onStartMove={startMove}
              onCancelMove={() => { setMovingOccurrenceId(null); setMoveError(null); }}
              onChangeMoveDate={setMoveDate}
              onChangeMoveStartTime={setMoveStartTime}
              onChangeMoveEndTime={setMoveEndTime}
              onSaveMove={saveMove}
              copyingOccurrenceId={copyingOccurrenceId}
              copyDate={copyDate}
              copySaving={copySaving}
              copyError={copyError}
              onStartCopy={startCopy}
              onCancelCopy={() => { setCopyingOccurrenceId(null); setCopyError(null); }}
              onChangeCopyDate={setCopyDate}
              onSaveCopy={saveCopy}
              deletingOccurrenceId={deletingOccurrenceId}
              onDelete={handleDelete}
              onOpenPopup={setDayPopupOccurrence}
            />
          ))}
        </div>
      </DndContext>

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

interface DayColumnProps {
  dateStr: string;
  label: string;
  date: Date;
  items: Array<{ occ: ProgramOccurrence; program: Program | undefined }>;
  weekDays: Array<{ date: Date; dateStr: string; label: string }>;
  bookedCountByOccurrence: Map<string, number>;
  movingOccurrenceId: string | null;
  moveDate: string;
  moveStartTime: string;
  moveEndTime: string;
  moveSaving: boolean;
  moveError: string | null;
  onStartMove: (occ: ProgramOccurrence) => void;
  onCancelMove: () => void;
  onChangeMoveDate: (v: string) => void;
  onChangeMoveStartTime: (v: string) => void;
  onChangeMoveEndTime: (v: string) => void;
  onSaveMove: () => void;
  copyingOccurrenceId: string | null;
  copyDate: string;
  copySaving: boolean;
  copyError: string | null;
  onStartCopy: (occ: ProgramOccurrence) => void;
  onCancelCopy: () => void;
  onChangeCopyDate: (v: string) => void;
  onSaveCopy: (occ: ProgramOccurrence, targetDate: string) => void;
  deletingOccurrenceId: string | null;
  onDelete: (occurrenceId: string) => void;
  onOpenPopup: (occ: ProgramOccurrence) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  dateStr, label, date, items, weekDays, bookedCountByOccurrence,
  movingOccurrenceId, moveDate, moveStartTime, moveEndTime, moveSaving, moveError,
  onStartMove, onCancelMove, onChangeMoveDate, onChangeMoveStartTime, onChangeMoveEndTime, onSaveMove,
  copyingOccurrenceId, copyDate, copySaving, copyError, onStartCopy, onCancelCopy, onChangeCopyDate, onSaveCopy,
  deletingOccurrenceId, onDelete, onOpenPopup,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const isToday = toDateStr(new Date()) === dateStr;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-2.5 space-y-2 min-h-[160px] transition-colors ${
        isOver ? 'border-emerald-400 bg-emerald-50/60' : 'border-stone-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between px-0.5">
        <div className="min-w-0">
          <span className={`text-[11px] font-bold uppercase tracking-wide block ${isToday ? 'text-emerald-700' : 'text-stone-500'}`}>
            {label}
          </span>
          <span className="text-xs font-semibold text-stone-700">
            {date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
          items.length > 0 ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-stone-100 text-stone-400 border border-stone-200'
        }`}>
          {items.length > 0 ? `${items.length} időpont` : 'Üres'}
        </span>
      </div>

      <div className="space-y-2">
        {items.map(({ occ, program }) => (
          <OccurrenceCard
            key={occ.id}
            occ={occ}
            program={program}
            booked={bookedCountByOccurrence.get(occ.id) || 0}
            isMoving={movingOccurrenceId === occ.id}
            moveDate={moveDate}
            moveStartTime={moveStartTime}
            moveEndTime={moveEndTime}
            moveSaving={moveSaving}
            moveError={moveError}
            onStartMove={() => onStartMove(occ)}
            onCancelMove={onCancelMove}
            onChangeMoveDate={onChangeMoveDate}
            onChangeMoveStartTime={onChangeMoveStartTime}
            onChangeMoveEndTime={onChangeMoveEndTime}
            onSaveMove={onSaveMove}
            isCopying={copyingOccurrenceId === occ.id}
            copyDate={copyDate}
            copySaving={copySaving}
            copyError={copyError}
            weekDays={weekDays}
            onStartCopy={() => onStartCopy(occ)}
            onCancelCopy={onCancelCopy}
            onChangeCopyDate={onChangeCopyDate}
            onSaveCopy={(target) => onSaveCopy(occ, target)}
            isDeleting={deletingOccurrenceId === occ.id}
            onDelete={() => onDelete(occ.id)}
            onOpenPopup={() => onOpenPopup(occ)}
          />
        ))}

        {items.length === 0 && (
          <div className="text-center py-4 text-[11px] text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
            Húzd ide az időpontot
          </div>
        )}
      </div>
    </div>
  );
};

interface OccurrenceCardProps {
  occ: ProgramOccurrence;
  program: Program | undefined;
  booked: number;
  isMoving: boolean;
  moveDate: string;
  moveStartTime: string;
  moveEndTime: string;
  moveSaving: boolean;
  moveError: string | null;
  onStartMove: () => void;
  onCancelMove: () => void;
  onChangeMoveDate: (v: string) => void;
  onChangeMoveStartTime: (v: string) => void;
  onChangeMoveEndTime: (v: string) => void;
  onSaveMove: () => void;
  isCopying: boolean;
  copyDate: string;
  copySaving: boolean;
  copyError: string | null;
  weekDays: Array<{ date: Date; dateStr: string; label: string }>;
  onStartCopy: () => void;
  onCancelCopy: () => void;
  onChangeCopyDate: (v: string) => void;
  onSaveCopy: (targetDate: string) => void;
  isDeleting: boolean;
  onDelete: () => void;
  onOpenPopup: () => void;
}

const OccurrenceCard: React.FC<OccurrenceCardProps> = ({
  occ, program, booked, isMoving, moveDate, moveStartTime, moveEndTime, moveSaving, moveError,
  onStartMove, onCancelMove, onChangeMoveDate, onChangeMoveStartTime, onChangeMoveEndTime, onSaveMove,
  isCopying, copyDate, copySaving, copyError, weekDays, onStartCopy, onCancelCopy, onChangeCopyDate, onSaveCopy,
  isDeleting, onDelete, onOpenPopup,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: occ.id });
  const maxCap = occ.max_participants ?? program?.max_participants ?? null;
  const isFull = maxCap != null && booked >= maxCap;
  const currentDateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: isDragging ? 0.85 : 1 }
    : {};

  if (isMoving) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5 space-y-2 text-xs">
        {moveError && <p className="font-semibold text-rose-700">{moveError}</p>}
        <div className="flex flex-wrap gap-1.5">
          <input type="date" value={moveDate} onChange={e => onChangeMoveDate(e.target.value)} className="px-1.5 py-1 rounded-lg border border-stone-300 text-[11px] flex-1 min-w-[110px]" />
          <input type="time" value={moveStartTime} onChange={e => onChangeMoveStartTime(e.target.value)} className="px-1.5 py-1 rounded-lg border border-stone-300 text-[11px] w-20" />
          <input type="time" value={moveEndTime} onChange={e => onChangeMoveEndTime(e.target.value)} className="px-1.5 py-1 rounded-lg border border-stone-300 text-[11px] w-20" />
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onSaveMove} disabled={moveSaving} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
            {moveSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>Mentés</span>
          </button>
          <button type="button" onClick={onCancelMove} className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 font-bold flex items-center gap-1 cursor-pointer">
            <X className="w-3 h-3" />
            <span>Mégse</span>
          </button>
        </div>
      </div>
    );
  }

  if (isCopying) {
    const targetOptions = weekDays.filter(d => d.dateStr !== currentDateStr);
    return (
      <div className="rounded-xl border border-sky-300 bg-sky-50/60 p-2.5 space-y-2 text-xs">
        {copyError && <p className="font-semibold text-rose-700">{copyError}</p>}
        <p className="font-bold text-stone-700">Másolás melyik napra?</p>
        <div className="flex flex-wrap gap-1">
          {targetOptions.map(d => (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => onSaveCopy(d.dateStr)}
              disabled={copySaving}
              className="px-2 py-1 rounded-lg bg-white border border-sky-200 text-sky-800 font-bold text-[11px] hover:bg-sky-100 cursor-pointer disabled:opacity-60"
            >
              {d.date.toLocaleDateString('hu-HU', { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={copyDate} onChange={e => onChangeCopyDate(e.target.value)} className="px-1.5 py-1 rounded-lg border border-stone-300 text-[11px] flex-1" />
          <button type="button" onClick={() => onSaveCopy(copyDate)} disabled={copySaving || !copyDate} className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60 shrink-0">
            {copySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <button type="button" onClick={onCancelCopy} className="text-[11px] font-bold text-stone-500 hover:text-stone-800 cursor-pointer">Mégse</button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-2.5 space-y-1.5 text-xs touch-none ${
        occ.status === 'cancelled' ? 'bg-stone-100 border-stone-200 opacity-70' : 'bg-white border-stone-200 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-0.5 text-stone-300 hover:text-stone-600 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Húzással áthelyezhető másik napra"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenPopup}
            className="font-bold text-stone-900 leading-tight truncate text-left hover:text-emerald-700 hover:underline cursor-pointer block w-full"
            title="Program összefoglaló és a napi foglalások"
          >
            {program?.title || 'Program'}
          </button>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-stone-600">
            {occ.start_time && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-emerald-600" />
                {occ.start_time}
              </span>
            )}
            <span className={`inline-flex items-center gap-0.5 ${isFull ? 'text-amber-700 font-bold' : ''}`}>
              <Users className="w-2.5 h-2.5" />
              {booked}{maxCap != null ? `/${maxCap}` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-1 border-t border-stone-100">
        <button type="button" onClick={onStartCopy} title="Másolás másik napra" className="p-1 rounded-md text-sky-600 hover:bg-sky-50 cursor-pointer">
          <Copy className="w-3 h-3" />
        </button>
        <button type="button" onClick={onStartMove} title="Pontos dátum/idő megadása (áthelyezés)" className="p-1 rounded-md text-stone-500 hover:bg-stone-100 cursor-pointer">
          <MoreHorizontal className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          title="Törlés"
          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-60 ml-auto"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};
