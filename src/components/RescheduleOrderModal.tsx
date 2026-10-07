import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { OccurrenceAvailability } from '../types/database';

interface RescheduleOrderModalProps {
  orderId: string | null;
  onClose: () => void;
}

// Kanban c039bfb6 point 6: szolgáltató (vagy admin) áthelyez egy MEGLÉVŐ rendelést egy
// másik, ugyanahhoz a programhoz tartozó időponthoz -- a kapacitás-ellenőrzést a
// reschedule_order() RPC-n belüli UPDATE automatikusan kiváltja (lásd schema.sql).
export const RescheduleOrderModal: React.FC<RescheduleOrderModalProps> = ({ orderId, onClose }) => {
  const { orders, listOpenOccurrences, rescheduleOrder } = useApp();
  const order = orders.find(o => o.id === orderId);

  const [occurrences, setOccurrences] = useState<OccurrenceAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setOccurrences([]);
    setError(null);
    setSuccess(false);
    if (!order) return;
    setLoading(true);
    listOpenOccurrences(order.program_id).then(rows => {
      setOccurrences(rows.filter(o => o.id !== order.occurrence_id));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  if (!orderId || !order) return null;

  const handlePick = async (occurrenceId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await rescheduleOrder(order.id, occurrenceId);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt az áthelyezés során.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200">
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
              Áthelyezés
            </span>
            <h3 className="font-display text-xl font-extrabold text-stone-900">Új időpont választása</h3>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm text-stone-700 mb-5">A rendelés sikeresen áthelyezve az új időpontra.</p>
            <button
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer"
            >
              Bezárás
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl mb-4">
                {error}
              </div>
            )}
            {loading ? (
              <div className="text-center py-8 text-stone-400 text-sm">Betöltés...</div>
            ) : occurrences.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                Nincs másik nyitott, jövőbeli időpont ehhez a programhoz.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                {occurrences.map(occ => {
                  const full = occ.available !== null && occ.available <= 0;
                  return (
                    <button
                      key={occ.id}
                      disabled={full || submitting}
                      onClick={() => handlePick(occ.id)}
                      className="w-full flex items-center justify-between gap-3 p-3.5 text-left text-sm hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-stone-800">
                        {new Date(occ.event_date + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {occ.start_time && <span className="text-stone-400 font-normal"> · {occ.start_time}</span>}
                      </span>
                      <span className="text-xs text-stone-500">
                        {full ? 'Betelt' : occ.available !== null ? `${occ.available} szabad hely` : 'Nincs létszámkorlát'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {submitting && (
              <div className="flex items-center justify-center gap-2 text-xs text-stone-400 mt-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Áthelyezés...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
