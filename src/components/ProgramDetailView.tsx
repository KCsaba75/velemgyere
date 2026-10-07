import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  Phone,
  Mail,
  Globe,
  Share2,
  Check,
  Sparkles,
  Lock,
  LogIn,
  Loader2,
  BadgeEuro,
  Banknote,
  Wallet
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { ProgramAvailability, OnsitePaymentMethod, OrderProviderContact } from '../types/database';

// Kanban fbf552b2 point 1: a still-gated detail sections (mit tartalmaz/nem tartalmaz)
// share this one prompt instead of each rolling their own "please log in" box. ctaLabel
// defaults to a plain login CTA, but the still-gated sections use a clearer
// "További információk" wording per Csaba's request.
const LoginToSeeMore: React.FC<{ label: string; setCurrentView: (v: string) => void; ctaLabel?: string }> = ({ label, setCurrentView, ctaLabel }) => (
  <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 flex items-center gap-3 text-sm text-stone-600">
    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
    <span className="flex-1">{label}</span>
    <button
      onClick={() => setCurrentView('home')}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer"
    >
      <LogIn className="w-3.5 h-3.5" />
      {ctaLabel || 'Bejelentkezés'}
    </button>
  </div>
);

export const ProgramDetailView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    programs,
    providers,
    setCurrentView,
    currentUser,
    isAuthenticated,
    orders,
    checkProgramAvailability,
    createOrder,
    getProviderContactForOrder,
    computeBookingFee,
    computeTotalPrice
  } = useApp();

  const program = programs.find((p) => p.slug === slug);
  const programProvider = providers.find((p) => p.id === program?.provider_id);
  // Payment methods are a provider-level setting, inherited by all their programs
  // (kanban cfa4b20a point 3) -- fall back to cash-only if the provider row hasn't
  // loaded yet or predates the column.
  const acceptedPaymentMethods: OnsitePaymentMethod[] =
    programProvider?.accepted_payment_methods?.length ? programProvider.accepted_payment_methods : ['cash'];

  useDocumentMeta(program?.title, program?.short_description);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Availability check (point 6) -- only callable once logged in, see checkProgramAvailability.
  const [availability, setAvailability] = useState<ProgramAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  // Reservation ("Helyfoglalás", kanban fbf552b2 point 2) -- a status-only order record,
  // not a real payment yet. This is now the ONLY primary CTA on the page -- it replaces
  // the old "Érdekel a program!" inquiry modal, which let a buyer message the provider
  // directly (and the provider reply directly) completely outside the order/fee model.
  const [participantsCount, setParticipantsCount] = useState(1);
  const [onsitePaymentMethod, setOnsitePaymentMethod] = useState<OnsitePaymentMethod>('cash');
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationResult, setReservationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Keep the selection valid if the provider doesn't accept the default/previous
  // choice (e.g. a cash-only provider, or switching between programs of different
  // providers without a full remount).
  useEffect(() => {
    if (!acceptedPaymentMethods.includes(onsitePaymentMethod)) {
      setOnsitePaymentMethod(acceptedPaymentMethods[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id, acceptedPaymentMethods.join(',')]);

  // Provider contact reveal (point 3) -- only once THIS user has a CONFIRMED order for
  // THIS program, resolved server-side (get_provider_contact_for_order never returns
  // another user's or a still-pending order's contact details, see schema.sql).
  const [providerContact, setProviderContact] = useState<OrderProviderContact | null>(null);
  const confirmedOrderForProgram = orders.find(o => o.program_id === program?.id && o.status === 'confirmed');

  useEffect(() => {
    setProviderContact(null);
    if (!confirmedOrderForProgram) return;
    let cancelled = false;
    getProviderContactForOrder(confirmedOrderForProgram.id).then(contact => {
      if (!cancelled) setProviderContact(contact);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedOrderForProgram?.id]);

  const handleCheckAvailability = async () => {
    if (!program) return;
    setAvailabilityLoading(true);
    try {
      const result = await checkProgramAvailability(program.id);
      setAvailability(result);
      setAvailabilityChecked(true);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;
    setReservationSubmitting(true);
    try {
      // Display-only estimate -- the server's set_order_booking_fee trigger always
      // recomputes booking_fee/onsite_amount/total_price from the program's own
      // price row, this submitted total_price is never trusted (schema.sql).
      const netTotal = program.price * participantsCount;
      const result = await createOrder({
        program_id: program.id,
        participants_count: participantsCount,
        total_price: netTotal + computeBookingFee(netTotal),
        currency: program.currency,
        onsite_payment_method: onsitePaymentMethod,
      });
      setReservationResult(result);
    } finally {
      setReservationSubmitting(false);
    }
  };

  if (!program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-4 font-display">A keresett program nem található</h2>
        <button
          onClick={() => setCurrentView('programs')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Vissza a programokhoz</span>
        </button>
      </div>
    );
  }

  const images = program.images && program.images.length > 0
    ? program.images
    : [{ id: 'fallback', program_id: program.id, image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', is_cover: true, sort_order: 0 }];

  const currentImage = images[activeImageIndex]?.image_url || images[0].image_url;

  // Format Hungarian date
  const formattedDate = (() => {
    try {
      const d = new Date(program.event_date);
      return d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return program.event_date;
    }
  })();

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => setCurrentView('programs')}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Vissza a katalógushoz</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Link másolása"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Megosztva!' : 'Megosztás'}</span>
          </button>
        </div>
      </div>

      {/* Main Image & Gallery */}
      <div className="space-y-3 mb-8">
        {/* Badges (Csaba 2026-10-07: a kep MELLE/korulle kerulnek, nem rea -- ne
            takarjak ki a kepet) */}
        <div className="flex flex-wrap gap-2">
          {/* Destination badge */}
          <span className="bg-white border border-stone-200 text-stone-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
            <span>{program.region?.flag_emoji || '✈️'}</span>
            <span>{program.region?.name || program.location}</span>
          </span>

          {/* Service type badge */}
          {program.category && (
            <span className="bg-stone-900 text-stone-200 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
              <CategoryIcon icon={program.category.icon} className="w-4 h-4 text-emerald-400" />
              {program.category.name}
            </span>
          )}

          {/* Guaranteed Hungarian badge */}
          <span className="bg-emerald-600 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
            <span>🇭🇺</span>
            <span>{program.language || 'Magyar nyelvű vezetés'}</span>
          </span>

          {program.featured && (
            <span className="bg-amber-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              Kiemelt élmény
            </span>
          )}
        </div>

        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-lg border border-stone-200 bg-stone-900">
          <img
            src={currentImage}
            alt={program.title}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        </div>

        {/* Price (Csaba 2026-10-07: a kep ALA kerul, nem ra) */}
        <div className="flex justify-end">
          <div className="inline-block bg-emerald-600 text-white font-extrabold text-lg sm:text-2xl px-5 py-2.5 rounded-2xl shadow-xl">
            {computeTotalPrice(program.price).toFixed(2)} {program.currency === 'EUR' ? '€' : program.currency}
            <span className="text-xs sm:text-sm font-normal text-emerald-100"> / fő</span>
          </div>
        </div>

        {/* Thumbnail gallery if multiple images */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  activeImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-300 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Program Description */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mb-2">
              <span>🇭🇺</span>
              <span>Külföldi program magyar nyelvű vezetéssel vagy sofőrrel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-stone-900 mb-3 tracking-tight">
              {program.title}
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed font-medium">
              {program.short_description}
            </p>
          </div>

          {/* Key Facts Summary Box */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Dátum
              </span>
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Időtartam
              </span>
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{program.duration}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Idősáv
              </span>
              <div className="font-bold text-stone-900 text-sm">
                {isAuthenticated ? `${program.start_time} - ${program.end_time}` : (
                  <span className="inline-flex items-center gap-1 text-stone-400 font-normal text-xs">
                    <Lock className="w-3 h-3" /> bejelentkezve látható
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                Létszám
              </span>
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{program.max_participants ? `Max. ${program.max_participants} fő` : 'Kiscsoportos'}</span>
              </div>
            </div>
          </div>

          {/* Locations & Meeting point */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <h3 className="font-display font-bold text-stone-900 text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Helyszín és Találkozási Pont</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                <span className="text-xs font-bold text-stone-500 block mb-1">📍 Program helyszíne:</span>
                <span className="font-semibold text-stone-900">{program.location}</span>
              </div>
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                <span className="text-xs font-bold text-stone-500 block mb-1">🚩 Indulás / Találkozó / Felszállás:</span>
                <span className="font-semibold text-stone-900">{program.departure_location}</span>
              </div>
            </div>
          </div>

          {/* Detailed Description (kanban fbf552b2 point 1): public since 2026-10-07,
              no login required -- see schema.sql programs_public/anon grant. */}
          <div className="prose prose-stone max-w-none">
            <h3 className="font-display font-bold text-stone-900 text-xl mb-3">
              Részletes leírás
            </h3>
            <div className="text-stone-700 whitespace-pre-line leading-relaxed text-base space-y-4">
              {program.description}
            </div>
          </div>

          {/* Included / Not Included Sections -- still gated (point 1: only the
              description + meeting point above became public, this stays behind login) */}
          {isAuthenticated ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-stone-200">
              {/* Mit tartalmaz */}
              <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-100">
                <h4 className="font-display font-bold text-emerald-950 text-base mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Mit tartalmaz az ár?</span>
                </h4>
                <ul className="space-y-2 text-sm text-stone-700">
                  {program.included && program.included.length > 0 ? (
                    program.included.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-stone-500 italic">Nincs részletezve</li>
                  )}
                </ul>
              </div>

              {/* Mit nem tartalmaz */}
              <div className="bg-rose-50/60 rounded-2xl p-5 border border-rose-100">
                <h4 className="font-display font-bold text-rose-950 text-base mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-500" />
                  <span>Mit nem tartalmaz?</span>
                </h4>
                <ul className="space-y-2 text-sm text-stone-700">
                  {program.not_included && program.not_included.length > 0 ? (
                    program.not_included.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-stone-500 italic">Minden lényeges költséget tartalmaz</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <LoginToSeeMore
              label="Mit tartalmaz és mit nem tartalmaz az ár -- bejelentkezve látható."
              setCurrentView={setCurrentView}
              ctaLabel="További információk"
            />
          )}
        </div>

        {/* Right Column: Sticky Booking Card & Provider Details (kanban fbf552b2 point 2:
            replaces the old "Érdekel a program!" inquiry CTA + modal, which let a buyer
            and provider negotiate directly and skip the booking fee entirely. The
            availability-check + reservation flow below used to live in the left column
            (point 6, "Szabad helyek ellenőrzése" + "Helyfoglalás") -- consolidated here as
            the page's one primary CTA.) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sticky top-28 space-y-6">
            <div className="flex items-baseline justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs text-stone-500 font-bold block uppercase">Részvételi díj</span>
                <span className="text-3xl font-extrabold text-stone-900 font-display">
                  {computeTotalPrice(program.price).toFixed(2)} {program.currency === 'EUR' ? '€' : program.currency}
                </span>
                <span className="text-xs text-stone-500 font-medium"> / fő</span>
              </div>
            </div>

            {/* Availability + Reservation ("Helyfoglalás") */}
            <div>
              <h3 className="font-display font-bold text-stone-900 text-base flex items-center gap-2 mb-3">
                <BadgeEuro className="w-5 h-5 text-emerald-600" />
                <span>Helyfoglalás</span>
              </h3>

              {!isAuthenticated ? (
                <LoginToSeeMore
                  label="A helyfoglaláshoz és a saját fiókodban való nyilvántartásához bejelentkezés szükséges."
                  setCurrentView={setCurrentView}
                />
              ) : (
                <div className="space-y-4">
                  {!availabilityChecked ? (
                    <button
                      onClick={handleCheckAvailability}
                      disabled={availabilityLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {availabilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      <span>{availabilityLoading ? 'Ellenőrzés...' : 'Van még szabad hely?'}</span>
                    </button>
                  ) : availability === null ? (
                    <p className="text-sm text-stone-500">Nem sikerült lekérni az elérhetőséget, próbáld újra.</p>
                  ) : availability.available === null ? (
                    <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Ehhez a programhoz nincs létszámkorlát.
                    </p>
                  ) : availability.available > 0 ? (
                    <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Még {availability.available} szabad hely van ({availability.booked}/{availability.max_participants} lefoglalva).
                    </p>
                  ) : (
                    <p className="text-sm text-rose-600 font-semibold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Ez a program jelenleg betelt ({availability.booked}/{availability.max_participants}).
                    </p>
                  )}

                  {reservationResult?.success ? (
                    <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {reservationResult.message}
                    </p>
                  ) : (
                    <form onSubmit={handleReservationSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                          Résztvevők száma
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={participantsCount}
                          onChange={(e) => setParticipantsCount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-24 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                          Helyszíni fizetés módja
                        </label>
                        <div className="flex gap-2">
                          {acceptedPaymentMethods.includes('cash') && (
                            <button
                              type="button"
                              onClick={() => setOnsitePaymentMethod('cash')}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                                onsitePaymentMethod === 'cash'
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <Banknote className="w-3.5 h-3.5" /> Készpénz
                            </button>
                          )}
                          {acceptedPaymentMethods.includes('revolut') && (
                            <button
                              type="button"
                              onClick={() => setOnsitePaymentMethod('revolut')}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                                onsitePaymentMethod === 'revolut'
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <Wallet className="w-3.5 h-3.5" /> Revolut
                            </button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        // Checkout breakdown (point 3): the server's set_order_booking_fee
                        // trigger computes the exact same way from the program's own
                        // price row -- this is display-only, mirroring it so the visitor
                        // sees the real split before submitting.
                        const netTotal = program.price * participantsCount;
                        const fee = computeBookingFee(netTotal);
                        const total = netTotal + fee;
                        const curr = program.currency === 'EUR' ? '€' : program.currency;
                        return (
                          <div className="text-sm text-stone-600 space-y-0.5">
                            <p>Teljes ár: <strong className="text-stone-900">{total.toFixed(2)} {curr}</strong></p>
                            <p>Most fizetendő (foglalási díj): <strong className="text-stone-900">{fee.toFixed(2)} {curr}</strong></p>
                            <p>Helyszínen fizetendő: <strong className="text-stone-900">{netTotal.toFixed(2)} {curr}</strong></p>
                          </div>
                        );
                      })()}

                      <button
                        type="submit"
                        disabled={reservationSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl text-sm cursor-pointer disabled:opacity-60"
                      >
                        {reservationSubmitting ? 'Foglalás...' : 'Foglalás véglegesítése'}
                      </button>
                      {reservationResult && !reservationResult.success && (
                        <p className="text-sm text-rose-600">{reservationResult.message}</p>
                      )}
                      <p className="text-[11px] text-stone-400">
                        Ez egy foglalási szándék rögzítése, nem végleges fizetés -- az adminisztrátor
                        hamarosan jóváhagyja. A foglalási díj a jóváhagyás utáni lépésben esedékes, a
                        fennmaradó összeget a helyszínen, a fent választott móddal rendezed a szolgáltatóval.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Provider Info Card (point 3): company_name/description always public
                (already in providers_public) -- contact details (contact_name/phone/
                email/website) ONLY after a confirmed order for THIS program, resolved
                server-side via getProviderContactForOrder, never from program.provider
                directly (that join is teaser-only now, see schema.sql). */}
            {program.provider && (
              <div className="border-t border-stone-100 pt-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold font-display shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                      Helyi Szolgáltató
                    </span>
                    <h5 className="font-bold text-stone-900 text-sm">
                      {program.provider.company_name}
                    </h5>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                  {program.provider.description}
                </p>

                {providerContact ? (
                  <div className="space-y-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Kapcsolattartó: <strong className="text-stone-800">{providerContact.contact_name}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-800 font-semibold">{providerContact.phone}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-800 truncate">{providerContact.email}</span>
                    </div>

                    {providerContact.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <a
                          href={providerContact.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline truncate font-semibold"
                        >
                          {providerContact.website}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-stone-100 bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 flex items-center gap-3 text-xs text-stone-600">
                    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>
                      A szolgáltató elérhetőségei a foglalás jóváhagyása után válnak láthatóvá
                      a Saját fiókomban.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
