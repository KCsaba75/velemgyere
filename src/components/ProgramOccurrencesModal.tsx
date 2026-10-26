import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Trash2, Ban, RotateCcw, Loader2 } from 'lucide-react';
import { Program, ProgramOccurrence } from '../types/database';

interface ProgramOccurrencesModalProps {
  program: Program | null;
  onClose: () => void;
}

const WEEKDAYS: { label: string; value: number }[] = [
  { label: 'H', value: 1 },
  { label: 'K', value: 2 },
  { label: 'Sz', value: 3 },
  { label: 'Cs', value: 4 },
  { label: 'P', value: 5 },
  { label: 'Szo', value: 6 },
  { label: 'V', value: 0 },
];

// Kanban c039bfb6 point 5: a szolgáltató ismétlődő mintát (nap(ok) + dátumtartomány)
// állít be, ez kliens-oldalon legenerálja a konkrét dátumokat -- a szerver csak a
// bulk insertet (upsert, duplikátum-biztos) kapja, nincs külön "minta" tábla/fogalom
// a DB-ben, az occurrence sorok a tényleges forrás.
function generateDatesInRange(startDate: string, endDate: string, weekdays: Set<number>): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cursor <= end) {
    if (weekdays.has(cursor.getDay())) {
      dates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export const ProgramOccurrencesModal: React.FC<ProgramOccurrencesModalProps> = ({ program, onClose }) => {
  const { getProgramOccurrences, createOccurrences, updateOccurrence, deleteOccurrence } = useApp();

  const [occurrences, setOccurrences] = useState<ProgramOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState(new Date().toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [generating, setGenerating] = useState(false);

  const reload = async () => {
    if (!program) return;
    setLoading(true);
    const rows = await getProgramOccurrences(program.id);
    setOccurrences(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (program) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  if (!program) return null;

  const toggleWeekday = (value: number) => {
    setSelectedWeekdays(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedWeekdays.size === 0) {
      setError('Válassz legalább egy napot.');
      return;
    }
    const dates = generateDatesInRange(rangeStart, rangeEnd, selectedWeekdays);
    if (dates.length === 0) {
      setError('A megadott tartományban nincs a kiválasztott napokra eső dátum.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await createOccurrences(program.id, dates);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a generálás során.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleStatus = async (occ: ProgramOccurrence) => {
    setError(null);
    try {
      await updateOccurrence(occ.id, { status: occ.status === 'open' ? 'cancelled' : 'open' });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt az állapot módosításakor.');
    }
  };

  const handleDelete = async (occ: ProgramOccurrence) => {
    if (!window.confirm(`Biztosan törölni szeretnéd ezt az időpontot (${occ.event_date})?`)) return;
    setError(null);
    try {
      await deleteOccurrence(occ.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a törlés során.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Időpontok
            </span>
            <h3 className="font-display text-xl font-extrabold text-stone-900">{program.title}</h3>
          </div>
        </div>

        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-6">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
            Ismétlődő minta legenerálása
          </h4>
          <div className="flex gap-1.5 mb-3">
            {WEEKDAYS.map(wd => (
              <button
                key={wd.value}
                type="button"
                onClick={() => toggleWeekday(wd.value)}
                className={`w-9 h-9 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  selectedWeekdays.has(wd.value)
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {wd.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Tól</label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Ig</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <p className="text-xs text-stone-400 mb-3">
            Az időpont, hely és létszám a programból öröklődik, hacsak az adott alkalmat utólag külön nem módosítod.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            <span>{generating ? 'Generálás...' : 'Időpontok legenerálása'}</span>
          </button>
        </div>

        {error && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl mb-4">
            {error}
          </div>
        )}

        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
          Meglévő időpontok ({occurrences.length})
        </h4>
        {loading ? (
          <div className="text-center py-8 text-stone-400 text-sm">Betöltés...</div>
        ) : occurrences.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm">Még nincs egyetlen időpont sem felvéve.</div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            {occurrences.map(occ => (
              <div key={occ.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">
                    {new Date(occ.event_date + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      occ.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {occ.status === 'open' ? 'Nyitott' : 'Lezárva'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(occ)}
                    title={occ.status === 'open' ? 'Lezárás' : 'Megnyitás'}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                  >
                    {occ.status === 'open' ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(occ)}
                    title="Törlés"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
