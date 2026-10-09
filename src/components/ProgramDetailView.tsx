import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp, formatPrice, formatPlatformFee } from '../context/AppContext';
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
  CreditCard,
  Wallet,
  Star,
  Heart,
  FolderHeart,
  Ticket
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { CountryFlag } from './CountryFlag';
import { ProgramReviewsSection } from './ProgramReviewsSection';
import { BookingCheckoutModal } from './BookingCheckoutModal';
import { ProgramAvailability, OnsitePaymentMethod, OrderProviderContact, OccurrenceAvailability, ProgramPriceTier } from '../types/database';

export const ProgramDetailView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    programs,
    providers,
    setCurrentView,
    currentUser,
    isAuthenticated,
    openLoginModal,
    orders,
    checkProgramAvailability,
    listOpenOccurrences,
    getProgramPriceTiers,
    createOrder,
    getProviderContactForOrder,
    computeBookingFee,
    computeTotalPrice,
    getProgramRatingStats,
    getProviderRatingStats,
    isProgramFavorite,
    toggleFavorite,
    openFolderModal,
    isLoading
  } = useApp();

  const program = programs.find((p) => p.slug === slug || p.id === slug);
  const isFav = program ? isProgramFavorite(program.id) : false;
  const programProvider = providers.find((p) => p.id === program?.provider_id);
  // Payment methods are a provider-level setting, inherited by all their programs
  // (kanban cfa4b20a point 3) -- fall back to cash-only if the provider row hasn't
  // loaded yet or predates the column.
  const acceptedPaymentMethods: OnsitePaymentMethod[] =
    programProvider?.accepted_payment_methods?.length ? programProvider.accepted_payment_methods : ['cash'];

  useDocumentMeta(program?.title, program?.short_description);

  const programStats = program ? getProgramRatingStats(program.id) : null;
  const providerStats = (programProvider?.id || program?.provider_id || program?.provider?.id) 
    ? getProviderRatingStats(programProvider?.id || program?.provider_id || program?.provider?.id) 
    : null;

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
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Occurrence/slot-rendszer (kanban c039bfb6 point 4): ha a programhoz van nyitott,
  // jövőbeli időpont, a vevő EGY konkrétat választ -- az időpont-specifikus kapacitás
  // már a listával együtt megjön (list_program_occurrences), nincs külön "ellenőrzés"
  // lépés mint a régi, occurrence nélküli programoknál. Ha a lista üres (régi program),
  // a lenti teljesen régi, program-szintű flow marad érvényben.
  const [occurrenceOptions, setOccurrenceOptions] = useState<OccurrenceAvailability[]>([]);
  const [occurrencesLoading, setOccurrencesLoading] = useState(true);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);

  useEffect(() => {
    setOccurrenceOptions([]);
    setSelectedOccurrenceId(null);
    if (!program) {
      setOccurrencesLoading(false);
      return;
    }
    setOccurrencesLoading(true);
    let cancelled = false;
    listOpenOccurrences(program.id).then(rows => {
      if (cancelled) return;
      setOccurrenceOptions(rows);
      setOccurrencesLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const selectedOccurrence = occurrenceOptions.find(o => o.id === selectedOccurrenceId) || null;

  // Savos/csoportos arazas (kanban 62e69729): 'tiered' programnal a letszamhoz tartozo
  // SAV OSSZES ara donti el a netTotal-t, nem a price*participantsCount linearis szorzas.
  const [priceTiers, setPriceTiers] = useState<ProgramPriceTier[]>([]);
  useEffect(() => {
    setPriceTiers([]);
    if (!program || program.pricing_mode !== 'tiered') return;
    let cancelled = false;
    getProgramPriceTiers(program.id).then(rows => {
      if (!cancelled) setPriceTiers(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id, program?.pricing_mode]);

  const matchingTier = program?.pricing_mode === 'tiered'
    ? priceTiers.find(t => participantsCount >= t.min_participants && (t.max_participants == null || participantsCount <= t.max_participants)) || null
    : null;
  const lowestTier = priceTiers.length > 0 ? priceTiers[0] : null;
  // null = tiered program, de nincs a jelenlegi letszamhoz illo sav -- a form ezt jelzi,
  // nem enged tovabb (a szerver enfore_order_capacity/set_order_booking_fee ugyanezt
  // utolag is kikenyszeriti, ez csak elore jelzi a vevonek).
  const netTotalForCount = program
    ? (program.pricing_mode === 'tiered' ? (matchingTier ? matchingTier.total_price : null) : program.price * participantsCount)
    : null;

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

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;
    if (!isAuthenticated || !currentUser) {
      openLoginModal('A foglalás véglegesítéséhez és a fizetéshez kérjük jelentkezz be a saját fiókodba!');
      return;
    }
    // Tiered programnal nincs illo sav a jelenlegi letszamhoz -- ugyanezt a
    // szerver (set_order_booking_fee) is FAIL LOUD-dal elutasitana, de ne is
    // probalkozzunk, a gomb is le van tiltva erre az esetre.
    if (netTotalForCount === null) return;
    setIsCheckoutModalOpen(true);
  };

  if (isLoading && !program) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-8">
          <div className="min-w-0 space-y-6">
            <div className="aspect-[16/10] bg-stone-200 rounded-3xl"></div>
            <div className="h-10 bg-stone-200 rounded-xl w-3/4"></div>
            <div className="h-5 bg-stone-200 rounded-lg w-1/2"></div>
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-stone-200 rounded w-full"></div>
              <div className="h-4 bg-stone-200 rounded w-5/6"></div>
              <div className="h-4 bg-stone-200 rounded w-4/6"></div>
            </div>
          </div>
          <div className="lg:w-[440px]">
            <div className="h-96 bg-stone-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

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

  // Format Hungarian date nicely (avoid UTC midnight shifting and long weekday truncation)
  const { dateFormatted, weekdayFormatted, fullDateFormatted } = (() => {
    try {
      if (!program.event_date) {
        return { dateFormatted: 'Egyeztetés szerint', weekdayFormatted: '', fullDateFormatted: 'Egyeztetés szerint' };
      }
      const dateStr = program.event_date.includes('T') ? program.event_date : `${program.event_date}T00:00:00`;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return { dateFormatted: program.event_date, weekdayFormatted: '', fullDateFormatted: program.event_date };
      }
      const dateFormatted = d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const weekdayFormatted = d.toLocaleDateString('hu-HU', {
        weekday: 'long'
      });
      return {
        dateFormatted,
        weekdayFormatted,
        fullDateFormatted: `${dateFormatted} (${weekdayFormatted})`
      };
    } catch {
      return { dateFormatted: program.event_date, weekdayFormatted: '', fullDateFormatted: program.event_date };
    }
  })();
  const formattedDate = fullDateFormatted;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-200">
      {/* Main Image & Gallery */}
      <div className="space-y-3 mb-8">
        {/* Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Destination badge */}
          <span className="bg-white border border-stone-200 text-stone-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
            <CountryFlag emoji={program.region?.flag_emoji} country={program.region?.country || program.country} size="sm" />
            <span>{program.region?.name || program.location}</span>
          </span>

          {/* Date badge */}
          <span className="bg-white border border-stone-200 text-stone-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dateFormatted}</span>
            {weekdayFormatted && (
              <span className="text-stone-500 font-normal text-xs capitalize hidden sm:inline">({weekdayFormatted})</span>
            )}
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
            <CountryFlag emoji="🇭🇺" country="Magyarország" size="sm" />
            <span>{program.language || 'Magyar nyelvű vezetés'}</span>
          </span>

          {program.featured && (
            <span className="bg-amber-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              Kiemelt élmény
            </span>
          )}

          {/* Megosztás gomb közvetlenül a kép felett a többi címkével egy sorban */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer sm:ml-auto"
            title="Link másolása"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-stone-500" />}
            <span>{copiedLink ? 'Megosztva!' : 'Megosztás'}</span>
          </button>
        </div>

        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-lg border border-stone-200 bg-stone-900">
          <img
            src={currentImage}
            alt={program.title}
            className="w-full h-full object-cover transition-opacity duration-300"
          />

          {/* Floating Heart Button in the top right corner of the main photo */}
          <button
            type="button"
            onClick={() => program && toggleFavorite(program.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (program) openFolderModal(program);
            }}
            className={`absolute top-4 right-4 z-10 w-11 h-11 rounded-full backdrop-blur-md shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer ${
              isFav 
                ? 'bg-white text-rose-500 ring-2 ring-rose-400/60 shadow-rose-500/30' 
                : 'bg-stone-900/60 hover:bg-white text-white hover:text-rose-500'
            }`}
            title={
              !isAuthenticated
                ? "Jelentkezz be programvadászként a kedvencek mentéséhez (♡)"
                : isFav 
                  ? "Mentve a kedvencekhez (Kattints az eltávolításhoz / jobb klikk a mappákhoz)" 
                  : "Hozzáadás a kedvencekhez (♡)"
            }
            aria-label={isFav ? "Kedvenc program" : "Mentés a kedvencek közé"}
          >
            <Heart className={`w-5 h-5 transition-transform ${isFav ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'}`} />
          </button>
        </div>

        {/* Alatta: bal oldalon a kisképek (galéria), jobb oldalon az összegcímke - azonos távolságra a nagy képtől */}
        <div className="flex items-center justify-between gap-3">
          {/* Thumbnail gallery if multiple images */}
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar min-w-0">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 sm:w-24 h-14 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-300 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Kép ${idx + 1}`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Price badge (összegcímke) -- savos (tiered) programnal a legalacsonyabb sav
              "-tol, csoportonkent" arat mutatja, mert nincs egyetlen fix fejenkenti ar. */}
          <div className="shrink-0 ml-auto">
            <div className="inline-block bg-emerald-600 text-white font-extrabold text-lg sm:text-2xl px-5 py-2.5 rounded-2xl shadow-xl whitespace-nowrap">
              {program.pricing_mode === 'tiered' ? (
                lowestTier ? (
                  <>
                    {formatPrice(computeTotalPrice(lowestTier.total_price))} {program.currency === 'EUR' ? '€' : program.currency}
                    <span className="text-xs sm:text-sm font-normal text-emerald-100"> -tól / csoport</span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-normal">Ár hamarosan</span>
                )
              ) : (
                <>
                  {formatPrice(computeTotalPrice(program.price))} {program.currency === 'EUR' ? '€' : program.currency}
                  <span className="text-xs sm:text-sm font-normal text-emerald-100"> / fő</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-8 items-start">
        {/* Left Column: Details & Program Description */}
        <div className="min-w-0 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mb-2">
              <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
              <span>Külföldi program magyar nyelvű vezetéssel vagy sofőrrel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-stone-900 mb-2 tracking-tight">
              {program.title}
            </h1>

            {programStats && (
              <div className="mb-4">
                <a
                  href="#reviews-section"
                  className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-emerald-700 bg-stone-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-stone-200/80 transition-all cursor-pointer"
                >
                  <div className="flex text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-stone-900 font-extrabold font-display text-sm">
                    {programStats.average.toFixed(1)}
                  </span>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-600">
                    {programStats.count > 0 ? `${programStats.count} igazolt értékelés` : 'Új program'}
                  </span>
                  {programStats.count > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      ({programStats.recommendPercent}% ajánlja)
                    </span>
                  )}
                </a>
              </div>
            )}
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
              <div className="flex items-start gap-1.5 text-stone-900">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-sm text-stone-900 block leading-tight whitespace-normal break-words">
                    {dateFormatted}
                  </span>
                  {weekdayFormatted && (
                    <span className="text-xs font-semibold text-emerald-700 capitalize block mt-0.5 whitespace-normal">
                      {weekdayFormatted}
                    </span>
                  )}
                </div>
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
            <div>
              <button
                type="button"
                onClick={() => openLoginModal('A részletes információk (mit tartalmaz és mit nem tartalmaz az ár) megtekintéséhez kérjük jelentkezz be!')}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>További információkhoz bejelentkezés szükséges</span>
              </button>
            </div>
          )}

          {/* Reviews & Ratings Section */}
          <ProgramReviewsSection program={program} />
        </div>

        {/* Right Column: Sticky Booking Card & Provider Details */}
        <div className="space-y-6 w-full lg:w-[440px]">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sticky top-28 space-y-6">
            {/* Price Header & Transparent Fee Breakdown */}
            <div className="border-b border-stone-100 pb-5 space-y-3.5">
              <div>
                <span className="text-xs text-stone-500 font-bold block uppercase tracking-wider">
                  Részvételi díj
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  {program.pricing_mode === 'tiered' ? (
                    lowestTier ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-display">
                          {formatPrice(computeTotalPrice(lowestTier.total_price))} {program.currency === 'EUR' ? '€' : program.currency}
                        </span>
                        <span className="text-xs text-stone-500 font-medium"> -tól / csoport</span>
                      </>
                    ) : (
                      <span className="text-sm text-stone-500 font-medium">Ár hamarosan</span>
                    )
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-display">
                        {formatPrice(computeTotalPrice(program.price))} {program.currency === 'EUR' ? '€' : program.currency}
                      </span>
                      <span className="text-xs text-stone-500 font-medium"> / fő</span>
                    </>
                  )}
                </div>
              </div>

              {/* Detailed Payment Breakdown -- tiered programnal nincs egyetlen fix
                  "1 fő esetén" bontas (a vegosszeg a letszamtol fugg, azt a lenti,
                  resztvevo-szam-fuggo bontas mutatja), csak egy rovid utalas. */}
              {program.pricing_mode === 'tiered' ? (
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/90 text-xs text-stone-600">
                  Sávos (csoportos) árazás: a végösszeg a résztvevők számától függ, lásd a foglalási űrlap részletezését lent.
                </div>
              ) : (() => {
                const baseNet = program.price;
                const baseTotal = computeTotalPrice(baseNet);
                const baseFee = baseTotal - baseNet;
                const curr = program.currency === 'EUR' ? '€' : program.currency;
                return (
                  <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/90 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Fizetési részletezés (1 fő esetén):
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-stone-700">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate sm:whitespace-normal">Platform használati kényelmi díj:</span>
                        </span>
                        <strong className="font-bold text-stone-900 whitespace-nowrap shrink-0 ml-auto">
                          {formatPlatformFee(baseFee)} {curr}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-stone-700">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Banknote className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span className="truncate sm:whitespace-normal">Helyszínen fizetendő díj:</span>
                        </span>
                        <strong className="font-bold text-stone-900 whitespace-nowrap shrink-0 ml-auto">
                          {formatPrice(baseNet)} {curr}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Availability + Reservation ("Helyfoglalás") */}
            <div>
              <h3 className="font-display font-bold text-stone-900 text-base flex items-center gap-2 mb-3">
                <BadgeEuro className="w-5 h-5 text-emerald-600" />
                <span>Helyfoglalás</span>
              </h3>

              {!isAuthenticated ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => openLoginModal('A helyfoglaláshoz és a foglalás véglegesítéséhez kérjük jelentkezz be!')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-5 rounded-xl text-sm cursor-pointer shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Érdekel a Program!</span>
                  </button>
                  <p className="text-[11px] text-stone-400 text-center">
                    A helyfoglaláshoz bejelentkezés szükséges
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {occurrencesLoading ? (
                    <p className="text-sm text-stone-400 flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" /> Időpontok betöltése...
                    </p>
                  ) : occurrenceOptions.length > 0 ? (
                    !selectedOccurrenceId ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                          Válassz időpontot
                        </label>
                        <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                          {occurrenceOptions.map(occ => {
                            const full = occ.available !== null && occ.available <= 0;
                            return (
                              <button
                                key={occ.id}
                                type="button"
                                disabled={full}
                                onClick={() => setSelectedOccurrenceId(occ.id)}
                                className="w-full flex items-center justify-between gap-2 p-3 text-left text-sm hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-sm text-emerald-800 font-semibold min-w-0">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span className="whitespace-normal">
                            {selectedOccurrence && new Date(selectedOccurrence.event_date + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          {selectedOccurrence?.available !== null && selectedOccurrence?.available !== undefined && (
                            <span className="text-emerald-700 font-normal text-xs whitespace-nowrap"> · {selectedOccurrence.available} szabad hely</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedOccurrenceId(null)}
                          className="text-xs font-semibold text-stone-500 hover:text-stone-800 hover:underline shrink-0 cursor-pointer"
                        >
                          Másik időpont
                        </button>
                      </div>
                    )
                  ) : !availabilityChecked ? (
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
                  ) : (occurrenceOptions.length === 0 || selectedOccurrenceId) && (
                    <form onSubmit={handleReservationSubmit} className="space-y-3">
                      {occurrenceOptions.length === 0 && (
                        <div className="flex items-center gap-2.5 bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-700">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-stone-900 block leading-tight">{dateFormatted}</span>
                            {weekdayFormatted && (
                              <span className="text-stone-500 capitalize block text-[11px] mt-0.5">{weekdayFormatted}</span>
                            )}
                          </div>
                        </div>
                      )}
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
                        <span className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                          Helyszínen elfogadott fizetés
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {acceptedPaymentMethods.includes('cash') && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 font-semibold border border-stone-200">
                              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Készpénz</span>
                            </span>
                          )}
                          {acceptedPaymentMethods.includes('revolut') && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 font-semibold border border-stone-200">
                              <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Revolut</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {(() => {
                        // Detailed checkout breakdown for chosen number of participants.
                        // Tiered programnal netTotalForCount null, ha nincs a letszamhoz
                        // illo sav -- ilyenkor nincs bontas, csak egy figyelmeztetes,
                        // es a submit gomb (lentebb) is le van tiltva.
                        const curr = program.currency === 'EUR' ? '€' : program.currency;
                        if (netTotalForCount === null) {
                          return (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 font-semibold">
                              Ehhez a létszámhoz ({participantsCount} fő) jelenleg nincs megadva ár ennél a programnál. Próbálj másik létszámot, vagy keresd a szolgáltatót.
                            </div>
                          );
                        }
                        const netTotal = netTotalForCount;
                        const total = computeTotalPrice(netTotal);
                        const fee = total - netTotal;
                        return (
                          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-2.5 text-xs">
                            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                              Fizetési részletezés ({participantsCount} fő):
                            </span>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3 text-stone-700">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate sm:whitespace-normal">Platform használati kényelmi díj:</span>
                                </span>
                                <strong className="text-emerald-700 font-bold text-sm whitespace-nowrap shrink-0 ml-auto">
                                  {formatPlatformFee(fee)} {curr}
                                </strong>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-stone-700">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <Banknote className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                  <span className="truncate sm:whitespace-normal">Helyszínen fizetendő díj:</span>
                                </span>
                                <strong className="text-stone-900 font-bold text-sm whitespace-nowrap shrink-0 ml-auto">
                                  {formatPrice(netTotal)} {curr}
                                </strong>
                              </div>
                              <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-3 text-stone-900 font-bold text-sm">
                                <span className="min-w-0">Teljes fizetendő összeg:</span>
                                <span className="text-emerald-700 font-extrabold text-base whitespace-nowrap shrink-0 ml-auto">
                                  {formatPrice(total)} {curr}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <button
                        type="submit"
                        disabled={reservationSubmitting || netTotalForCount === null}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-5 rounded-xl text-sm cursor-pointer shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>Érdekel a Program!</span>
                      </button>
                      {reservationResult && (
                        <p className={`text-xs font-semibold ${reservationResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {reservationResult.message}
                        </p>
                      )}
                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        A gombra kattintva áttekintheted a foglalás összes adatát, majd a <strong>platform használati kényelmi díjat</strong> bankkártyával (Stripe Demo) rendezheted. A <strong>helyszínen fizetendő díj</strong> ({acceptedPaymentMethods.map(m => m === 'cash' ? 'készpénzben' : 'Revoluton').join(' vagy ')}) a program napján közvetlenül a szolgáltatónak fizetendő.
                      </p>
                    </form>
                  )}
                </div>
              )}

              {/* Quick Favorite Save in Sticky Booking Card */}
              <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => program && toggleFavorite(program.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isFav
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                  <span>{isFav ? 'Mentve a kedvencekhez' : 'Mentés a kedvencekhez (♡)'}</span>
                </button>

                {program && (
                  <button
                    type="button"
                    onClick={() => openFolderModal(program)}
                    className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="Mappa kiválasztása"
                  >
                    <FolderHeart className="w-4 h-4" />
                  </button>
                )}
              </div>
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
                    {providerStats && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs">
                        <div className="flex text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="font-extrabold text-stone-900 font-display">
                          {providerStats.average.toFixed(1)}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-500 font-medium">
                          {providerStats.count > 0 ? `${providerStats.count} túraértékelés alapján` : 'Új helyi partner'}
                        </span>
                      </div>
                    )}
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
                      A szolgáltató elérhetőségeit a foglalás befejezése után a fiókodban találod meg.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Checkout Modal with Stripe Demo Payment */}
      {program && (
        <BookingCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          program={program}
          selectedOccurrence={selectedOccurrence}
          selectedOccurrenceId={selectedOccurrenceId}
          participantsCount={participantsCount}
          // A modal csak akkor nyilhat meg, ha netTotalForCount nem null (lasd
          // handleReservationSubmit + a submit gomb disabled-feltetele) -- a ??0
          // itt csak a TS-nek kell, futasidoben sosem er el 0-t.
          netTotal={netTotalForCount ?? 0}
          onsitePaymentMethod={onsitePaymentMethod}
          dateFormatted={dateFormatted}
          weekdayFormatted={weekdayFormatted}
          onSuccess={() => {
            setReservationResult({
              success: true,
              message: 'Sikeres foglalás és fizetés! A foglalást rögzítettük a saját fiókodban és továbbítottuk a szolgáltatónak visszaigazolásra.'
            });
          }}
        />
      )}
    </div>
  );
};
