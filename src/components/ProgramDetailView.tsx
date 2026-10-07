import React, { useState } from 'react';
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
  Send,
  Check,
  Sparkles,
  ShieldCheck,
  Lock,
  LogIn,
  Loader2,
  BadgeEuro
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { ProgramAvailability } from '../types/database';

// Kanban 71215856 point 4: a login-gated detail sections share this one prompt
// instead of each rolling their own "please log in" box.
const LoginToSeeMore: React.FC<{ label: string; setCurrentView: (v: string) => void }> = ({ label, setCurrentView }) => (
  <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 flex items-center gap-3 text-sm text-stone-600">
    <Lock className="w-4 h-4 text-stone-400 shrink-0" />
    <span className="flex-1">{label}</span>
    <button
      onClick={() => setCurrentView('home')}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer"
    >
      <LogIn className="w-3.5 h-3.5" />
      Bejelentkezés
    </button>
  </div>
);

export const ProgramDetailView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    programs,
    setCurrentView,
    submitInquiry,
    currentUser,
    isAuthenticated,
    checkProgramAvailability,
    createOrder
  } = useApp();

  const program = programs.find((p) => p.slug === slug);

  useDocumentMeta(program?.title, program?.short_description);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Inquiry Modal state
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [name, setName] = useState(currentUser.role === 'visitor' ? '' : currentUser.name);
  const [email, setEmail] = useState(currentUser.role === 'visitor' ? '' : currentUser.email);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Availability check (point 6) -- only callable once logged in, see checkProgramAvailability.
  const [availability, setAvailability] = useState<ProgramAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  // Reservation ("Helyfoglalás", point 2) -- a status-only order record, not a real
  // payment. Kept separate from the inquiry CTA above (that one stays a no-login lead
  // form going straight to the provider; this one is the logged-in-only account record).
  const [participantsCount, setParticipantsCount] = useState(1);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationResult, setReservationResult] = useState<{ success: boolean; message: string } | null>(null);

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
      const result = await createOrder({
        program_id: program.id,
        participants_count: participantsCount,
        total_price: program.price * participantsCount,
        currency: program.currency,
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

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await submitInquiry({
        program_id: program.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      });
      setSubmitSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-lg border border-stone-200 bg-stone-900">
          <img
            src={currentImage}
            alt={program.title}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none"></div>

          {/* Badges on image */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {/* Destination badge */}
            <span className="bg-white/95 backdrop-blur-md text-stone-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5">
              <span>{program.region?.flag_emoji || '✈️'}</span>
              <span>{program.region?.name || program.location}</span>
            </span>

            {/* Service type badge */}
            {program.category && (
              <span className="bg-stone-900/90 backdrop-blur-md text-stone-200 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5">
                <CategoryIcon icon={program.category.icon} className="w-4 h-4 text-emerald-400" />
                {program.category.name}
              </span>
            )}

            {/* Guaranteed Hungarian badge */}
            <span className="bg-emerald-600/95 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5">
              <span>🇭🇺</span>
              <span>{program.language || 'Magyar nyelvű vezetés'}</span>
            </span>

            {program.featured && (
              <span className="bg-amber-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                Kiemelt élmény
              </span>
            )}
          </div>

          <div className="absolute bottom-4 right-4 bg-emerald-600 text-white font-extrabold text-lg sm:text-2xl px-5 py-2.5 rounded-2xl shadow-xl">
            {program.price} {program.currency === 'EUR' ? '€' : program.currency}
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
                {isAuthenticated ? (
                  <span className="font-semibold text-stone-900">{program.departure_location}</span>
                ) : (
                  <span className="text-stone-400 text-xs italic">bejelentkezve látható</span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Description -- gated, point 4 */}
          <div className="prose prose-stone max-w-none">
            <h3 className="font-display font-bold text-stone-900 text-xl mb-3">
              Részletes leírás
            </h3>
            {isAuthenticated ? (
              <div className="text-stone-700 whitespace-pre-line leading-relaxed text-base space-y-4">
                {program.description}
              </div>
            ) : (
              <LoginToSeeMore
                label="A program teljes, részletes leírása bejelentkezett látogatóknak látható."
                setCurrentView={setCurrentView}
              />
            )}
          </div>

          {/* Included / Not Included Sections -- gated, point 4 */}
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
            />
          )}

          {/* Capacity check (point 6) -- authenticated only, matches the detail gate above */}
          {isAuthenticated && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <h3 className="font-display font-bold text-stone-900 text-lg flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Szabad helyek ellenőrzése</span>
              </h3>
              {!availabilityChecked ? (
                <button
                  onClick={handleCheckAvailability}
                  disabled={availabilityLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
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
            </div>
          )}

          {/* Reservation ("Helyfoglalás", point 2) -- logged-in-only status-only order */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-display font-bold text-stone-900 text-lg flex items-center gap-2 mb-3">
              <BadgeEuro className="w-5 h-5 text-emerald-600" />
              <span>Helyfoglalás</span>
            </h3>
            {!isAuthenticated ? (
              <LoginToSeeMore
                label="A helyfoglaláshoz és a saját fiókodban való nyilvántartásához bejelentkezés szükséges."
                setCurrentView={setCurrentView}
              />
            ) : reservationResult?.success ? (
              <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {reservationResult.message}
              </p>
            ) : (
              <form onSubmit={handleReservationSubmit} className="flex flex-wrap items-end gap-3">
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
                <p className="text-sm text-stone-600">
                  Összesen: <strong className="text-stone-900">{(program.price * participantsCount).toFixed(2)} {program.currency === 'EUR' ? '€' : program.currency}</strong>
                </p>
                <button
                  type="submit"
                  disabled={reservationSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm cursor-pointer disabled:opacity-60"
                >
                  {reservationSubmitting ? 'Foglalás...' : 'Foglalás véglegesítése'}
                </button>
                {reservationResult && !reservationResult.success && (
                  <p className="text-sm text-rose-600 w-full">{reservationResult.message}</p>
                )}
                <p className="text-[11px] text-stone-400 w-full">
                  Ez egy foglalási szándék rögzítése, nem végleges fizetés -- a szolgáltató hamarosan megerősíti.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Action Card & Provider Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sticky top-28 space-y-6">
            <div className="flex items-baseline justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs text-stone-500 font-bold block uppercase">Részvételi díj</span>
                <span className="text-3xl font-extrabold text-stone-900 font-display">
                  {program.price} {program.currency === 'EUR' ? '€' : program.currency}
                </span>
                <span className="text-xs text-stone-500 font-medium"> / fő</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Közvetlen kapcsolat
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <div>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setInquiryModalOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                <span className="tracking-wide">ÉRDEKEL A PROGRAM</span>
              </button>
              <p className="text-[11px] text-stone-400 text-center mt-2.5">
                Kérj kötelezettségmentes tájékoztatást közvetlenül a helyi magyar szolgáltatótól!
              </p>
            </div>

            {/* Provider Info Card */}
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

                {/* Provider contact details -- gated, point 4 */}
                {isAuthenticated ? (
                  <div className="space-y-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Kapcsolattartó: <strong className="text-stone-800">{program.provider.contact_name}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-800 font-semibold">{program.provider.phone}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-800 truncate">{program.provider.email}</span>
                    </div>

                    {program.provider.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <a
                          href={program.provider.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline truncate font-semibold"
                        >
                          {program.provider.website}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-stone-100">
                    <LoginToSeeMore
                      label="A szolgáltató elérhetőségei bejelentkezve láthatók."
                      setCurrentView={setCurrentView}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setInquiryModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ✕
            </button>

            {!submitSuccess ? (
              <>
                <div className="mb-6">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                    Közvetlen Kapcsolatfelvétel Magyar Nyelven
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-stone-900">
                    Érdekel a program!
                  </h3>
                  <p className="text-sm text-stone-600 mt-1">
                    Küldj üzenetet közvetlenül a kinti szervezőnek (<strong>{program.provider?.company_name}</strong>). A válasz e-mailben vagy telefonon érkezik magyarul.
                  </p>
                </div>

                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Név <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Pl. Kovács Anna"
                      className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      E-mail cím <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kovacs.anna@pelda.hu"
                      className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Telefonszám <span className="text-stone-400 font-normal">(opcionális)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+36 30 123 4567"
                      className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Üzenet vagy kérdés <span className="text-stone-400 font-normal">(opcionális)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Pl. Hány fővel érkeztek, milyen szállodában laktok, melyik nap lenne ideális..."
                      className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Küldés folyamatban...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Érdeklődés elküldése</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="font-display text-2xl font-extrabold text-stone-900 mb-2">
                  Köszönjük érdeklődésedet!
                </h3>
                <p className="text-sm text-stone-600 mb-6 max-w-sm mx-auto">
                  Üzeneted sikeresen továbbítottuk a kinti magyar szolgáltatónak (<strong>{program.provider?.company_name}</strong>). Hamarosan keresni fognak e-mailben vagy telefonon!
                </p>
                <button
                  onClick={() => setInquiryModalOpen(false)}
                  className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer"
                >
                  Rendben, bezárás
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
