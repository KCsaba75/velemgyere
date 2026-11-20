import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Copy, X } from 'lucide-react';
import { ProgramOccurrence } from '../types/database';
import { computeWeeklyRecurringDates } from '../hooks/useOccurrenceScheduling';

const WEEKDAY_OPTIONS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

function formatDateStr(dateStr: string): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return dateStr;
  }
}

interface RecurringCopyPanelProps {
  occ: ProgramOccurrence;
  weekday: number;
  onChangeWeekday: (weekday: number) => void;
  untilDate: string;
  onChangeUntilDate: (dateStr: string) => void;
  saving: boolean;
  error: string | null;
  onSave: (dates: string[]) => void;
  onCancel: () => void;
}

// Kanban 882a92d9 (#8): megosztott "Ismetlodes" masolas-panel a Havi (nap-reszlet
// popup) es a Heti (OccurrenceCard) nezet kozott -- a hetnap+veg-datum szabaly
// SOHA nem tarolodik, csak a belole szamolt konkret datum-lista, amit a provider
// elozetesen lat es sorokat kivehet belole, mielott a mar letezo batch
// createOccurrences-t egyszerre hivja a jovahagyott listaval.
export const RecurringCopyPanel: React.FC<RecurringCopyPanelProps> = ({
  occ, weekday, onChangeWeekday, untilDate, onChangeUntilDate, saving, error, onSave, onCancel,
}) => {
  const occDateStr = occ.event_date.includes('T') ? occ.event_date.split('T')[0] : occ.event_date;
  const generatedDates = useMemo(
    () => (untilDate ? computeWeeklyRecurringDates(occDateStr, weekday, untilDate) : []),
    [occDateStr, weekday, untilDate]
  );
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExcluded(new Set());
  }, [occDateStr, weekday, untilDate]);

  const finalDates = generatedDates.filter(d => !excluded.has(d));

  return (
    <div className="space-y-2">
      {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={weekday}
          onChange={e => onChangeWeekday(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs flex-1 min-w-[110px]"
        >
          {WEEKDAY_OPTIONS.map((label, idx) => (
            <option key={idx} value={idx}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-stone-500 shrink-0">eddig:</span>
        <input
          type="date"
          value={untilDate}
          min={occDateStr}
          onChange={e => onChangeUntilDate(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-stone-300 text-xs flex-1 min-w-[120px]"
        />
      </div>

      {untilDate && (
        generatedDates.length === 0 ? (
          <p className="text-xs text-stone-500">Nincs ilyen hétnapú dátum az időpont és a megadott végdátum között.</p>
        ) : (
          <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-36 overflow-y-auto">
            {generatedDates.map(d => {
              const isExcluded = excluded.has(d);
              return (
                <div
                  key={d}
                  className={`flex items-center justify-between gap-2 px-2 py-1 text-xs ${isExcluded ? 'text-stone-400 line-through bg-stone-50' : 'text-stone-700'}`}
                >
                  <span>{formatDateStr(d)}</span>
                  <button
                    type="button"
                    onClick={() => setExcluded(prev => {
                      const next = new Set(prev);
                      if (isExcluded) next.delete(d); else next.add(d);
                      return next;
                    })}
                    className="text-stone-400 hover:text-rose-600 cursor-pointer"
                    title={isExcluded ? 'Visszavétel' : 'Kihagyás ebből a körből'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(finalDates)}
          disabled={saving || finalDates.length === 0}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Mentés ({finalDates.length} alkalom)</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
