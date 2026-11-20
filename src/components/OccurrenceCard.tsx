import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Copy, MoreHorizontal, Trash2, Clock, Users, Loader2, Save, X } from 'lucide-react';
import { Program, ProgramOccurrence } from '../types/database';
import { RecurringCopyPanel } from './RecurringCopyPanel';

export interface OccurrenceCardProps {
  occ: ProgramOccurrence;
  program: Program | undefined;
  booked: number;
  hasPending: boolean;
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
  copyMode: 'single' | 'recurring';
  onChangeCopyMode: (mode: 'single' | 'recurring') => void;
  recurringWeekday: number;
  onChangeRecurringWeekday: (weekday: number) => void;
  recurringUntilDate: string;
  onChangeRecurringUntilDate: (v: string) => void;
  recurringSaving: boolean;
  recurringError: string | null;
  onSaveCopyRecurring: (dates: string[]) => void;
  isDeleting: boolean;
  onDelete: () => void;
  onOpenPopup: () => void;
  // Kanban 882a92d9 (#9): a napi-lista nezetben (mobil alapertelmezett) nincs
  // DndContext/drop-zone korulotte, ezert a huzas-fogantyu ott felesleges es
  // felrevezeto lenne -- ott draggable=false, es a "touch-none" CSS (ami a
  // bongeszo sajat erintes-gorgeteset tiltja le drag kozben) sem kerul rá,
  // kulonben a mobil lista nem lenne gorgethetö.
  draggable?: boolean;
}

// Kanban f1b8d7a3 / 882a92d9: kiemelve ProviderScheduleWeekBoard-bol onallo
// fajlba, hogy a Heti nezet ES az uj Napi-lista nezet (#9) is ugyanazt a
// kartya-komponenst hasznalja (mozgatas/masolas/ismetlodo-masolas/torles),
// nem duplikalva a logikat ket helyen.
export const OccurrenceCard: React.FC<OccurrenceCardProps> = ({
  occ, program, booked, hasPending, isMoving, moveDate, moveStartTime, moveEndTime, moveSaving, moveError,
  onStartMove, onCancelMove, onChangeMoveDate, onChangeMoveStartTime, onChangeMoveEndTime, onSaveMove,
  isCopying, copyDate, copySaving, copyError, weekDays, onStartCopy, onCancelCopy, onChangeCopyDate, onSaveCopy,
  copyMode, onChangeCopyMode, recurringWeekday, onChangeRecurringWeekday, recurringUntilDate,
  onChangeRecurringUntilDate, recurringSaving, recurringError, onSaveCopyRecurring,
  isDeleting, onDelete, onOpenPopup, draggable = true,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: occ.id, disabled: !draggable });
  const maxCap = occ.max_participants ?? program?.max_participants ?? null;
  const isFull = maxCap != null && booked >= maxCap;
  const currentDateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;

  const style: React.CSSProperties = draggable && transform
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
        <div className="inline-flex items-center p-0.5 bg-white/70 rounded-lg text-[11px] font-bold text-stone-600">
          <button
            type="button"
            onClick={() => onChangeCopyMode('single')}
            className={`px-2 py-1 rounded-md cursor-pointer ${copyMode === 'single' ? 'bg-white text-stone-900 shadow-xs' : ''}`}
          >
            Egy dátum
          </button>
          <button
            type="button"
            onClick={() => onChangeCopyMode('recurring')}
            className={`px-2 py-1 rounded-md cursor-pointer ${copyMode === 'recurring' ? 'bg-white text-stone-900 shadow-xs' : ''}`}
          >
            Ismétlődés
          </button>
        </div>
        {copyMode === 'single' ? (
          <>
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
          </>
        ) : (
          <RecurringCopyPanel
            occ={occ}
            weekday={recurringWeekday}
            onChangeWeekday={onChangeRecurringWeekday}
            untilDate={recurringUntilDate}
            onChangeUntilDate={onChangeRecurringUntilDate}
            saving={recurringSaving}
            error={recurringError}
            onSave={onSaveCopyRecurring}
            onCancel={onCancelCopy}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={style}
      // Kanban 53ea4b7e: a kulso kartya-div korabban is megkapta a touch-none-t
      // draggable=true ag eseten, pedig a dnd-kit attributes/listeners csak a
      // grip-gombra (lent) van felrakva, nem a kulso div-re -- a touch-none a
      // kartya BARMELY pontjan elkezdett erintest letiltotta a bongeszo sajat
      // gorgeteserol, ezert nem lehetett a kartyak FOLOTT gorgetni mobilon. A
      // grip-gomb sajat touch-none-ja eleg a drag aktivalasahoz.
      className={`rounded-xl border p-2.5 space-y-1.5 text-xs ${
        occ.status === 'cancelled'
          ? 'bg-stone-100 border-stone-200 opacity-70'
          : hasPending
          ? 'bg-amber-50/70 border-amber-300 shadow-xs'
          : 'bg-white border-stone-200 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-1.5">
        {draggable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-0.5 text-stone-300 hover:text-stone-600 cursor-grab active:cursor-grabbing shrink-0 touch-none"
            title="Húzással áthelyezhető másik napra"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
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
