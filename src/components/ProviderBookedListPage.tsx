import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Order, OrderBuyerInfo, ProgramOccurrence } from '../types/database';
import {
  ListChecks,
  Users,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
  X,
  Printer,
} from 'lucide-react';
import { BookingDetailModal } from './BookingDetailModal';

// Kanban ca9129b7: biztonsagos also korlat egy mailto URL bcc-reszenek
// hosszara -- bongeszo/OS-fuggoen eltero, de ez alatt mindenhol mukodik.
// Zora dontese C: ha tullepi, TOBB mailto-ra bontjuk (sorban kattinthato
// "Email mindenkinek (1/2)" gombokra), nem csonkitjuk a listat.
const MAILTO_BCC_CHAR_LIMIT = 1800;

function splitEmailsByLength(emails: string[], limit: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;
  for (const email of emails) {
    const addLen = email.length + 1; // +1 a vesszo-elvalasztonak
    if (current.length > 0 && currentLen + addLen > limit) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(email);
    currentLen += addLen;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

const formatOccurrenceLabel = (occ: ProgramOccurrence): string => {
  const d = new Date(`${occ.event_date}T00:00:00`);
  const formatted = isNaN(d.getTime())
    ? occ.event_date
    : d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return occ.start_time ? `${formatted}, ${occ.start_time.slice(0, 5)}` : formatted;
};

function todayStr(): string {
  const t = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

// Kanban foglalt2 (Csaba visszajelzese): a lista alapbol a MAI idopontra
// nyiljon meg, nem a legkorabbira. Ha nincs pontosan mai, a legkozelebbi
// jovobeli idopontot valasztjuk; ha mar minden lezajlott, a legutobbi
// multbelit (a `sorted` tomb datum szerint novekvoen rendezett).
function pickDefaultOccurrenceId(sorted: ProgramOccurrence[]): string {
  if (sorted.length === 0) return '';
  const today = todayStr();
  const exact = sorted.find(o => o.event_date === today);
  if (exact) return exact.id;
  const upcoming = sorted.find(o => o.event_date > today);
  if (upcoming) return upcoming.id;
  return sorted[sorted.length - 1].id;
}

interface BookingRow {
  order: Order;
  name: string;
  email: string;
  phone: string;
}

export const ProviderBookedListPage: React.FC = () => {
  useDocumentMeta(
    'Foglaltlista -- Szolgáltatói Dashboard',
    'Egy időpont összes foglalója egy listában: elérhetőségek, megjelenés-jelölés, nyomtatható.'
  );

  const {
    currentUser,
    currentProvider,
    programs,
    orders,
    getProgramOccurrences,
    getOrderBuyerInfo,
    setOrderAttended,
    sendBulkBookingMessage,
  } = useApp();

  const ownPrograms = useMemo(
    () => programs.filter(p => p.provider_id === currentProvider?.id || currentUser.role === 'admin'),
    [programs, currentProvider, currentUser.role]
  );

  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  useEffect(() => {
    if (ownPrograms.length > 0 && !ownPrograms.some(p => p.id === selectedProgramId)) {
      setSelectedProgramId(ownPrograms[0].id);
    }
  }, [ownPrograms, selectedProgramId]);

  const [occurrences, setOccurrences] = useState<ProgramOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('');

  useEffect(() => {
    if (!selectedProgramId) {
      setOccurrences([]);
      setSelectedOccurrenceId('');
      return;
    }
    let cancelled = false;
    setLoadingOccurrences(true);
    getProgramOccurrences(selectedProgramId).then(rows => {
      if (cancelled) return;
      const sorted = [...rows].sort((a, b) => a.event_date.localeCompare(b.event_date));
      setOccurrences(sorted);
      setSelectedOccurrenceId(prev => (sorted.some(o => o.id === prev) ? prev : pickDefaultOccurrenceId(sorted)));
      setLoadingOccurrences(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId]);

  const selectedProgram = ownPrograms.find(p => p.id === selectedProgramId);
  const selectedOccurrence = occurrences.find(o => o.id === selectedOccurrenceId);

  // Zora dontese A: lemondott rendelesek teljesen kimaradnak -- a lista celja
  // "ki jon", a letszam is csak a pending+confirmed rendelesekbol szamol.
  const bookings = useMemo(() => {
    if (!selectedOccurrenceId) return [];
    return orders.filter(o => o.occurrence_id === selectedOccurrenceId && o.status !== 'cancelled');
  }, [orders, selectedOccurrenceId]);

  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});
  useEffect(() => {
    const toFetch = bookings.filter(b => !b.is_manual && !buyerInfos[b.id]);
    if (toFetch.length === 0) return;
    let cancelled = false;
    Promise.all(toFetch.map(b => getOrderBuyerInfo(b.id))).then(results => {
      if (cancelled) return;
      setBuyerInfos(prev => {
        const next = { ...prev };
        toFetch.forEach((b, i) => {
          const info = results[i];
          if (info) next[b.id] = info;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  // Egysegesitett nev/email/telefon -- manual foglalasnal a manual_customer_*
  // mezokbol, platform-foglalasnal a get_order_buyer_info RPC eredmenyebol.
  const rows: BookingRow[] = useMemo(
    () =>
      bookings.map(order => {
        if (order.is_manual) {
          return {
            order,
            name: order.manual_customer_name || 'Névtelen (külső foglalás)',
            email: order.manual_customer_email || '',
            phone: order.manual_customer_phone || '',
          };
        }
        const info = buyerInfos[order.id];
        return {
          order,
          name: info?.name || 'Betöltés...',
          email: info?.email || '',
          phone: info?.phone || '',
        };
      }),
    [bookings, buyerInfos]
  );

  const totalParticipants = rows.reduce((sum, r) => sum + (r.order.participants_count || 0), 0);

  const [attendedSaving, setAttendedSaving] = useState<Set<string>>(new Set());
  const handleToggleAttended = async (order: Order) => {
    setAttendedSaving(prev => new Set(prev).add(order.id));
    try {
      await setOrderAttended(order.id, !order.attended);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'A megjelenés-jelölés mentése nem sikerült.');
    } finally {
      setAttendedSaving(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const detailOrder = detailOrderId ? orders.find(o => o.id === detailOrderId) || null : null;

  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const handleSendBulkMessage = async () => {
    if (!bulkMessageText.trim()) return;
    setBulkSending(true);
    setBulkResult(null);
    try {
      const messagableOrderIds = rows.filter(r => !r.order.is_manual).map(r => r.order.id);
      const { sentCount, skippedCount } = await sendBulkBookingMessage(
        messagableOrderIds,
        bulkMessageText,
        'provider',
        currentUser.user_id
      );
      setBulkResult(
        skippedCount > 0
          ? `${sentCount} foglalónak elküldve, ${skippedCount} lezárt üzenetfolyam miatt kimaradt.`
          : `${sentCount} foglalónak elküldve.`
      );
      setBulkMessageText('');
    } catch (err) {
      setBulkResult(err instanceof Error ? err.message : 'Az üzenet küldése nem sikerült.');
    } finally {
      setBulkSending(false);
    }
  };

  const emailChunks = useMemo(() => {
    const emails = rows.map(r => r.email).filter(Boolean);
    return splitEmailsByLength(emails, MAILTO_BCC_CHAR_LIMIT);
  }, [rows]);

  return (
    // print-area (src/index.css): a globalis nyomtatasi szabaly MINDENT elrejt
    // (visibility:hidden), kiveve a .print-voucher-t -- ez a lap a masodik
    // ilyen kivetel, hogy a tablazat (a print:hidden gomb-oszlopok levonasaval)
    // egyaltalan megjelenjen nyomtataskor.
    <div className="print-area max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="mb-4 sm:mb-6 print:hidden">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
          <ListChecks className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          <span>Foglaltlista</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Válassz programot és időpontot a foglalók listájához, elérhetőségekkel és megjelenés-jelöléssel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 print:hidden">
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Program</label>
          <select
            value={selectedProgramId}
            onChange={e => setSelectedProgramId(e.target.value)}
            className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {ownPrograms.length === 0 && <option value="">Nincs programod</option>}
            {ownPrograms.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Időpont</label>
          <select
            value={selectedOccurrenceId}
            onChange={e => setSelectedOccurrenceId(e.target.value)}
            disabled={loadingOccurrences || occurrences.length === 0}
            className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
          >
            {occurrences.length === 0 && <option value="">Nincs felvett időpont</option>}
            {occurrences.map(occ => (
              <option key={occ.id} value={occ.id}>{formatOccurrenceLabel(occ)}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingOccurrences ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Betöltés...
        </div>
      ) : !selectedOccurrence ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          Válassz egy programot és időpontot a foglaltlista megtekintéséhez.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Fejsor -- nyomtataskor is marad (csak a gombok tunnek el). */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold text-stone-900">{selectedProgram?.title}</h2>
              <p className="text-sm text-stone-600 capitalize">{formatOccurrenceLabel(selectedOccurrence)}</p>
              <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Összlétszám: {totalParticipants} fő ({rows.length} foglalás)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={rows.length === 0}
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" /> Nyomtatás / Mentés PDF-ként
              </button>
              <button
                type="button"
                onClick={() => { setBulkMessageOpen(true); setBulkResult(null); }}
                disabled={rows.length === 0}
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Üzenet mindenkinek
              </button>
              {emailChunks.length === 0 ? (
                <span className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-400 text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email mindenkinek
                </span>
              ) : (
                emailChunks.map((chunk, idx) => (
                  <a
                    key={idx}
                    href={`mailto:?bcc=${encodeURIComponent(chunk.join(','))}`}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email mindenkinek{emailChunks.length > 1 ? ` (${idx + 1}/${emailChunks.length})` : ''}
                  </a>
                ))
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-stone-400 text-sm">Erre az időpontra még nincs foglalás.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-center">Megjelent</th>
                    <th className="px-4 py-2.5">Név</th>
                    <th className="px-4 py-2.5">Létszám</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Telefon</th>
                    <th className="px-4 py-2.5 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map(row => (
                    <tr key={row.order.id}>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAttended(row.order)}
                          disabled={attendedSaving.has(row.order.id)}
                          aria-label={row.order.attended ? 'Megjelent -- kattints a visszavonáshoz' : 'Jelöld meg, ha megjelent'}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 print:border-stone-900 ${
                            row.order.attended
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-stone-300 text-transparent hover:border-emerald-400'
                          }`}
                        >
                          {attendedSaving.has(row.order.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{row.name}</td>
                      <td className="px-4 py-3 text-stone-700">{row.order.participants_count}</td>
                      <td className="px-4 py-3 text-stone-700">{row.email || '--'}</td>
                      <td className="px-4 py-3 text-stone-700">{row.phone || '--'}</td>
                      <td className="px-4 py-3 print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {!row.order.is_manual && (
                            <button
                              type="button"
                              onClick={() => setDetailOrderId(row.order.id)}
                              title="Üzenet küldése"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                          {row.email && (
                            <a
                              href={`mailto:${row.email}`}
                              title="Email küldése"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {bulkMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setBulkMessageOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-extrabold text-stone-900 mb-1">Üzenet mindenkinek</h3>
            <p className="text-xs text-stone-500 mb-4">
              A szöveg minden foglaló saját üzenetfolyamába bekerül ehhez az időponthoz.
            </p>
            <textarea
              value={bulkMessageText}
              onChange={e => setBulkMessageText(e.target.value)}
              rows={4}
              placeholder="Írd ide az üzenetet..."
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3"
            />
            {bulkResult && (
              <p className="text-xs font-semibold text-emerald-700 mb-3">{bulkResult}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkMessageOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 cursor-pointer"
              >
                Bezárás
              </button>
              <button
                type="button"
                onClick={handleSendBulkMessage}
                disabled={bulkSending || !bulkMessageText.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                <span>{bulkSending ? 'Küldés...' : 'Küldés'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOrder && (
        <BookingDetailModal order={detailOrder} onClose={() => setDetailOrderId(null)} />
      )}
    </div>
  );
};
