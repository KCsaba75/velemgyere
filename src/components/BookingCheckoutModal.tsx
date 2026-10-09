import React, { useState } from 'react';
import { Program, OnsitePaymentMethod, ProgramOccurrence, OccurrenceAvailability } from '../types/database';
import { useApp } from '../context/AppContext';
import { formatPrice, formatPlatformFee } from '../lib/priceUtils';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  Users, 
  Banknote, 
  Wallet, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  User, 
  Mail, 
  MapPin, 
  Ticket,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface BookingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: Program;
  selectedOccurrence?: ProgramOccurrence | OccurrenceAvailability | null;
  selectedOccurrenceId?: string | null;
  participantsCount: number;
  // Savos/csoportos arazasnal (program.pricing_mode === 'tiered') a matching
  // sav teljes ara, nem program.price*participantsCount -- a szulo
  // (ProgramDetailView) mar kiszamolta, ez csak atveszi.
  netTotal: number;
  onsitePaymentMethod: OnsitePaymentMethod;
  dateFormatted: string;
  weekdayFormatted?: string;
  onSuccess: (orderId?: string) => void;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  isOpen,
  onClose,
  program,
  selectedOccurrence,
  selectedOccurrenceId,
  participantsCount,
  netTotal,
  onsitePaymentMethod,
  dateFormatted,
  weekdayFormatted,
  onSuccess,
}) => {
  const { 
    currentUser, 
    computeTotalPrice, 
    createOrder,
    setCurrentView 
  } = useApp();

  const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Generate a realistic stable booking reference ID for this session
  const [bookingRef] = useState(() => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `VG-2026-${randomDigits}`;
  });

  // Simulated card form fields
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
  const [cardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry] = useState('12 / 28');
  const [cardCvc] = useState('888');
  const [cardZip] = useState('1011');

  if (!isOpen) return null;

  // Price calculations -- netTotal a szulotol jon (tiered programnal a sav
  // ara, kulonben program.price*participantsCount), itt nem szamoljuk ujra.
  const total = computeTotalPrice(netTotal);
  const fee = total - netTotal;
  const curr = program.currency === 'EUR' ? '€' : program.currency;
  // Tiered programnal a netTotal nem participantsCount*program.price, ezert a
  // breakdown-ban nem azt a szorzast irjuk ki, hanem a sav-alapu magyarazatot.
  const netTotalLabel = program.pricing_mode === 'tiered'
    ? `${participantsCount} fő (sávos ár)`
    : `${participantsCount} × ${formatPrice(program.price)} ${curr}`;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Simulate Stripe API network request latency
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const result = await createOrder({
        program_id: program.id,
        occurrence_id: selectedOccurrenceId || null,
        participants_count: participantsCount,
        total_price: total,
        currency: program.currency,
        onsite_payment_method: onsitePaymentMethod,
      });

      if (!result.success) {
        setErrorMessage(result.message || 'Nem sikerült a foglalás rögzítése.');
        setIsProcessing(false);
        return;
      }

      setCreatedOrderId(bookingRef);
      setStep('success');
      onSuccess(bookingRef);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Váratlan hiba történt a fizetés során.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToMyAccount = () => {
    onClose();
    setCurrentView('my-account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {step === 'review' && '1. Lépés: Adatok ellenőrzése'}
                  {step === 'payment' && '2. Lépés: Stripe Fizetés (Demo)'}
                  {step === 'success' && '3. Lépés: Sikeres foglalás!'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display leading-tight">
                {step === 'review' && 'Foglalás véglegesítése'}
                {step === 'payment' && 'Platform díj kifizetése'}
                {step === 'success' && 'Foglalás és fizetés megerősítve'}
              </h3>
            </div>
          </div>

          {step !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: REVIEW DETAILS */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Reference ID Banner */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs">
                <span className="text-stone-500 font-medium">Foglalási azonosító:</span>
                <span className="font-mono font-bold text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                  #{bookingRef}
                </span>
              </div>

              {/* Program Card Teaser */}
              <div className="flex gap-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 items-center">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-stone-200 border border-stone-300">
                  <img
                    src={program.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80'}
                    alt={program.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2">
                    {program.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1.5">
                    {program.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {program.location}
                      </span>
                    )}
                    {program.provider?.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        {program.provider.company_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
                  <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                    Kiválasztott időpont
                  </span>
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{dateFormatted}</span>
                  </div>
                  {weekdayFormatted && (
                    <span className="text-stone-500 capitalize block pl-6 text-[11px]">{weekdayFormatted}</span>
                  )}
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
                  <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                    Résztvevők száma
                  </span>
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{participantsCount} fő</span>
                  </div>
                  <span className="text-stone-500 block pl-6 text-[11px]">
                    {netTotalLabel}
                  </span>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
                  <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                    Programvadász (Foglaló)
                  </span>
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{currentUser?.name || 'Bejelentkezett felhasználó'}</span>
                  </div>
                  <span className="text-stone-500 block pl-6 text-[11px] truncate">
                    {currentUser?.email || ''}
                  </span>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
                  <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                    Helyszínen elfogadott fizetés
                  </span>
                  <div className="flex items-center gap-2 font-bold text-stone-900 flex-wrap">
                    {(!program.provider?.accepted_payment_methods || program.provider.accepted_payment_methods.includes('cash')) && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Készpénz
                      </span>
                    )}
                    {(!program.provider?.accepted_payment_methods || program.provider.accepted_payment_methods.includes('revolut')) && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Revolut
                      </span>
                    )}
                  </div>
                  <span className="text-stone-500 block text-[11px]">Közvetlenül a szolgáltatónak a program napján</span>
                </div>
              </div>

              {/* Price Breakdown Calculation */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-xs">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px] block">
                  Kiszámolt pénzügyi részletezés:
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Részvételi alapár ({netTotalLabel}):</span>
                    <strong className="text-stone-900 font-semibold">{formatPrice(netTotal)} {curr}</strong>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Platform használati kényelmi díj (online fizetendő most):
                    </span>
                    <strong className="text-emerald-700 font-extrabold text-sm whitespace-nowrap">
                      {formatPlatformFee(fee)} {curr}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-stone-500" />
                      Helyszínen fizetendő díj (program napján a szolgáltatónak):
                    </span>
                    <strong className="text-stone-900 font-bold whitespace-nowrap">
                      {formatPrice(netTotal)} {curr}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-900 text-sm font-bold">
                    <span>Teljes fizetendő részvételi összeg:</span>
                    <span className="text-emerald-700 font-black text-base whitespace-nowrap">
                      {formatPrice(total)} {curr}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                ℹ️ A <strong>Tovább a fizetéshez</strong> gombra kattintva a Stripe demo felületen rendezheted a <strong>{formatPlatformFee(fee)} {curr}</strong> platform használati kényelmi díjat, a helyszínen fizetendő díjat ({formatPrice(netTotal)} {curr}) pedig a túra napján adod át a szolgáltatónak.
              </div>
            </div>
          )}

          {/* STEP 2: STRIPE DEMO PAYMENT PANEL */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Stripe Header & Badge */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center text-indigo-300">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
                        Biztonságos Fizetés
                      </span>
                      <h4 className="text-sm font-bold text-white">Stripe Checkout Demo</h4>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-indigo-500/20 text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-400/30">
                    256-bit SSL titkosítás
                  </span>
                </div>

                <div className="pt-2 border-t border-indigo-800/60 flex items-center justify-between">
                  <span className="text-xs text-indigo-200">Most fizetendő kényelmi díj:</span>
                  <div className="text-xl sm:text-2xl font-black text-white font-display">
                    {formatPlatformFee(fee)} {curr}
                  </div>
                </div>
              </div>

              {/* Demo Mode Notice */}
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Stripe Demo Környezet:</strong> Valós bankkártya terhelés nem történik. Az alábbi előre kitöltött tesztkártyával szimulálhatod a sikeres fizetés teljes folyamatát.
                </div>
              </div>

              {/* Realistic Stripe Card Form */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Kártyatulajdonos neve
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Teljes név"
                    className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                      Bankkártya száma
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400">
                      <span>VISA</span> · <span>MC</span> · <span>AMEX</span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={cardNumber}
                      className="w-full text-xs sm:text-sm font-mono bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-3.5 py-2.5 text-stone-900 focus:outline-none cursor-default"
                    />
                    <CreditCard className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Lejárat
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={cardExpiry}
                      className="w-full text-xs sm:text-sm font-mono bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-center cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      CVC / CVV
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={cardCvc}
                      className="w-full text-xs sm:text-sm font-mono bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-center cursor-default"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Irányítószám
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={cardZip}
                      className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-center cursor-default"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                  Sikeres tranzakció
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-display text-stone-900">
                  Fizetés és foglalás sikeres!
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto">
                  A platform használati kényelmi díjat ({formatPlatformFee(fee)} {curr}) sikeresen rendezted a Stripe rendszerén keresztül.
                </p>
              </div>

              {/* Order Reference Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-semibold">Foglalási azonosító:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    #{createdOrderId || bookingRef}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-700">
                  <span>Program:</span>
                  <strong className="text-stone-900 truncate max-w-[240px]">{program.title}</strong>
                </div>
                <div className="flex items-center justify-between text-stone-700">
                  <span>Időpont & Létszám:</span>
                  <strong className="text-stone-900">{dateFormatted} · {participantsCount} fő</strong>
                </div>
                <div className="flex items-center justify-between text-stone-700">
                  <span>Helyszínen fizetendő ({onsitePaymentMethod === 'revolut' ? 'Revolut' : 'Készpénz'}):</span>
                  <strong className="text-stone-900">{formatPrice(netTotal)} {curr}</strong>
                </div>
              </div>

              {/* Next Steps Notification */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-left text-xs text-stone-700 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Mi történik ezután?</span>
                </div>
                <ul className="space-y-1.5 text-stone-600 pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>A foglalás már elérhető a <strong>Saját fiókodban</strong> a Foglalásaim menüpont alatt.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>A foglalási kérelem azonnal megjelent a szolgáltató (<strong>{program.provider?.company_name || 'Szolgáltató'}</strong>) fiókjában visszaigazolásra.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Amint a szolgáltató megerősíti a foglalást, azonnal láthatod a közvetlen elérhetőségeit a program lebonyolításához.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 shrink-0 flex items-center justify-end gap-3">
          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Mégsem
              </button>
              <button
                type="button"
                onClick={() => setStep('payment')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Tovább a fizetéshez</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'payment' && (
            <>
              <button
                type="button"
                onClick={() => setStep('review')}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Vissza</span>
              </button>
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fizetés feldolgozása (Stripe)...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Fizetés szimulálása ({formatPlatformFee(fee)} {curr})</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Bezárás
              </button>
              <button
                type="button"
                onClick={handleGoToMyAccount}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Ticket className="w-4 h-4" />
                <span>Megtekintés a Saját fiókomban</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
