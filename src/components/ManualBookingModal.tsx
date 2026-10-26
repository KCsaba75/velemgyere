import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Users,
  Calendar,
  Clock,
  MapPin,
  Banknote,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  User,
  Mail,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Program, ProgramOccurrence, BookingSource, OnsitePaymentMethod, Order } from '../types/database';
import { useApp, formatPrice, CURRENT_BOOKING_YEAR } from '../context/AppContext';
import {
  buildCalendarEventPayload,
  generateGoogleCalendarUrl,
  getCalendarSyncPreference
} from '../services/googleCalendarService';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProgramId?: string;
  programs?: Program[];
  occurrencesMap?: Record<string, ProgramOccurrence>;
  onCreated?: (order: Order) => void;
}

const SOURCE_OPTIONS: { id: BookingSource; label: string; icon: string; desc: string }[] = [
  { id: 'phone', label: 'Telefonos', icon: '📞', desc: 'Telefonhívás vagy SMS' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', desc: 'WhatsApp vagy Viber' },
  { id: 'onsite', label: 'Személyes', icon: '🤝', desc: 'Helyszínen vagy irodában' },
  { id: 'email', label: 'E-mail', icon: '✉️', desc: 'Közvetlen email megkeresés' },
  { id: 'external', label: 'Egyéb külső', icon: '📝', desc: 'Egyéb partner vagy felület' },
];

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  isOpen,
  onClose,
  initialProgramId,
  programs: propsPrograms,
  occurrencesMap = {},
  onCreated,
}) => {
  const { currentUser, currentProvider, programs: contextPrograms, createOrder, listOpenOccurrences } = useApp();

  const availablePrograms = useMemo(() => {
    const raw = propsPrograms || contextPrograms || [];
    if (!currentProvider && currentUser?.role !== 'admin') return raw;
    const own = raw.filter(p => p.provider_id === currentProvider?.id || currentUser?.role === 'admin');
    return own.length > 0 ? own : raw;
  }, [propsPrograms, contextPrograms, currentProvider, currentUser]);

  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgramId || (availablePrograms?.[0]?.id || ''));
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>('custom');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customTime, setCustomTime] = useState<string>('10:00');
  
  const [participantsCount, setParticipantsCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [source, setSource] = useState<BookingSource>('phone');
  const [sourceNotes, setSourceNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<OnsitePaymentMethod>('cash');
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  // Sync with Google Calendar option
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState<boolean>(() => {
    return getCalendarSyncPreference(currentUser?.id || 'provider');
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active program
  const currentProgram = useMemo(() => {
    return availablePrograms.find(p => p.id === selectedProgramId) || availablePrograms[0];
  }, [availablePrograms, selectedProgramId]);

  // Occurrences for this program
  const programOccurrences = useMemo(() => {
    if (!currentProgram) return [];
    return Object.values(occurrencesMap).filter(occ => occ.program_id === currentProgram.id);
  }, [occurrencesMap, currentProgram]);

  // Initialize selectedProgramId when initialProgramId changes
  useEffect(() => {
    if (initialProgramId) {
      setSelectedProgramId(initialProgramId);
    } else if (availablePrograms.length > 0 && !selectedProgramId) {
      setSelectedProgramId(availablePrograms[0].id);
    }
  }, [initialProgramId, availablePrograms, selectedProgramId]);

  // Calculated default price
  const basePricePerPerson = currentProgram?.price || 0;
  const totalPrice = customPrice !== null ? customPrice : basePricePerPerson * participantsCount;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage('Kérjük, add meg az ügyfél nevét!');
      return;
    }
    if (!currentProgram) {
      setErrorMessage('Kérjük, válassz ki egy programot!');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const bookingRef = `VG-${CURRENT_BOOKING_YEAR}-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const isCustomSlot = selectedOccurrenceId === 'custom';
      const occurrenceId = isCustomSlot ? null : selectedOccurrenceId;
      const selectedOcc = occurrenceId ? occurrencesMap[occurrenceId] : null;
      const targetDate = isCustomSlot ? customDate : (selectedOcc?.event_date || currentProgram.event_date);
      const targetTime = isCustomSlot ? customTime : (selectedOcc?.start_time || currentProgram.start_time);

      const orderData = {
        program_id: currentProgram.id,
        occurrence_id: occurrenceId,
        participants_count: participantsCount,
        total_price: totalPrice,
        currency: currentProgram.currency || 'EUR',
        onsite_payment_method: paymentMethod,
        booking_reference: bookingRef,
        source,
        source_notes: sourceNotes.trim(),
        is_manual: true,
        manual_customer_name: customerName.trim(),
        manual_customer_phone: customerPhone.trim(),
        manual_customer_email: customerEmail.trim(),
        status: 'confirmed' as const,
        event_date: targetDate,
        start_time: targetTime,
      };

      const res = await createOrder(orderData as any);

      if (!res.success) {
        setErrorMessage(res.message || 'Nem sikerült elmenteni a foglalást.');
        setLoading(false);
        return;
      }

      // If Google Calendar sync is checked, prepare and launch Google Calendar event
      if (syncToGoogleCalendar) {
        const payload = buildCalendarEventPayload(
          {
            ...orderData,
            id: bookingRef,
            user_id: currentUser?.id || 'manual',
            booking_fee: 0,
            onsite_amount: totalPrice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Order,
          currentProgram,
          occurrenceId ? occurrencesMap[occurrenceId] : ({
            id: 'custom',
            program_id: currentProgram.id,
            event_date: customDate,
            start_time: customTime,
            capacity: 50,
            status: 'open',
            created_at: new Date().toISOString()
          } as ProgramOccurrence),
          null,
          { name: customerName.trim(), email: customerEmail.trim() },
          { isProvider: true }
        );

        const gcalUrl = generateGoogleCalendarUrl(payload);
        window.open(gcalUrl, '_blank', 'noopener,noreferrer');
      }

      if (onCreated) {
        onCreated({
          ...orderData,
          id: bookingRef,
          user_id: currentUser?.id || 'manual',
          booking_fee: 0,
          onsite_amount: totalPrice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          program: currentProgram,
        } as Order);
      }

      onClose();
    } catch (err: any) {
      console.error('Error recording manual booking:', err);
      setErrorMessage(err.message || 'Váratlan hiba történt a rögzítés során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-stone-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold">
                Új Külső / Telefonos Foglalás
              </h2>
              <p className="text-xs text-stone-300">
                Rögzítsd a közvetlen megkereséseket és szinkronizáld a naptáradba
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Forrás kiválasztása */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Foglalás forrása
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSource(opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    source === opt.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-bold leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Program és Időpont kiválasztása */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Választott program *
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value);
                  setSelectedOccurrenceId('custom');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                required
              >
                {availablePrograms.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.title} ({formatPrice(prog.price)} {prog.currency} / fő)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Program időpontja
              </label>
              <select
                value={selectedOccurrenceId}
                onChange={(e) => setSelectedOccurrenceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
              >
                <option value="custom">📅 Egyedi időpont megadása...</option>
                {programOccurrences.map((occ) => {
                  const dateStr = occ.event_date ? occ.event_date.split('T')[0] : '';
                  const capText = occ.max_participants ? `${occ.max_participants} férőhely` : 'szabad kapacitás';
                  return (
                    <option key={occ.id} value={occ.id}>
                      {dateStr} {occ.start_time || ''} ({capText})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Egyedi dátum és idő (ha custom) */}
          {selectedOccurrenceId === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div>
                <label className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  Egyedi Dátum
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Kezdési időpont
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  required
                />
              </div>
            </div>
          )}

          {/* 3. Résztvevők száma és Pénzügyi részletek */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Létszám (fő) *
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setParticipantsCount(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-l-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 border-y border-stone-200 text-center font-bold text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setParticipantsCount(prev => prev + 1)}
                  className="w-10 h-10 rounded-r-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                Fizetési mód
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as OnsitePaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
              >
                <option value="cash">💵 Helyszínen készpénz</option>
                <option value="revolut">💳 Helyszínen Revolut</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>Végösszeg</span>
                <span className="text-[10px] font-normal text-stone-400">
                  {customPrice !== null ? 'Egyedi ár' : `${basePricePerPerson} € / fő`}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={totalPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-emerald-50/40"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-emerald-700">
                  {currentProgram?.currency || 'EUR'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Ügyfél adatok */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3.5">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Ügyfél adatai (Kapcsolattartás)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Ügyfél / Kapcsolattartó neve *
                </label>
                <input
                  type="text"
                  placeholder="pl. Kis Katalin"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">
                  Telefonszám (visszahíváshoz)
                </label>
                <input
                  type="tel"
                  placeholder="pl. +36 30 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">
                E-mail cím (opcionális visszaigazoláshoz)
              </label>
              <input
                type="email"
                placeholder="pl. katalin@pelda.hu"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                Belső megjegyzés a szolgáltatónak
              </label>
              <textarea
                rows={2}
                placeholder="pl. 'A szállodából érkeznek taxival, 10 perccel előbb ott lesznek', 'Gluténérzékeny', stb."
                value={sourceNotes}
                onChange={(e) => setSourceNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
            </div>
          </div>

          {/* 5. Google Calendar szinkronizáció opció */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold text-stone-900 block">
                  Szinkronizálás a Google Naptárral
                </span>
                <span className="text-[11px] text-stone-600 block">
                  Mentés után azonnal felkerül a naptáradba a vendég nevével és adataival
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={syncToGoogleCalendar}
                onChange={(e) => setSyncToGoogleCalendar(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              Mégse
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Mentés folyamatban...' : 'Foglalás rögzítése'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
