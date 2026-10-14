import React, { useState, useEffect } from 'react';
import { useApp, formatPrice, getBookingReference } from '../context/AppContext';
import { CountryFlag } from './CountryFlag';
import {
  Building2,
  PlusCircle,
  Calendar,
  Clock,
  Users,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Clock3,
  FileText,
  AlertCircle,
  Archive,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Ticket,
  Banknote,
  Wallet,
  UserCog,
  Save,
  Star,
  Send,
  CornerDownRight,
  BadgeEuro,
  LogOut,
  Edit3,
  FileEdit,
  CalendarDays,
  List
} from 'lucide-react';
import { Program, ProgramStatus, OrderBuyerInfo, OnsitePaymentMethod, ProgramOccurrence, Order } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProgramOccurrencesModal } from './ProgramOccurrencesModal';
import { ProgramPricingModal } from './ProgramPricingModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';
import { NewProgramModal } from './NewProgramModal';
import { ProviderBookingsCalendar } from './ProviderBookingsCalendar';
import { BookingDetailModal } from './BookingDetailModal';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
};

interface ProviderDashboardProps {
  onOpenNewProgram: () => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ onOpenNewProgram }) => {
  const {
    currentUser,
    currentProvider,
    programs,
    inquiries,
    orders,
    reviews,
    respondToReview,
    getProviderRatingStats,
    getOrderBuyerInfo,
    openProgramDetail,
    deleteProgram,
    updateProgram,
    archiveProgram,
    updateProviderProfile,
    confirmOrder,
    getProgramOccurrences,
    logout
  } = useApp();

  useDocumentMeta('Szolgáltatói Dashboard', 'Saját programok, foglalások és érdeklődések kezelése.');

  const [activeTab, setActiveTab] = useState<'programs' | 'bookings' | 'inquiries' | 'reviews' | 'profile'>('programs');
  const [bookingsViewMode, setBookingsViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('published');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const isMobileCompactTab = activeTab === 'bookings' || activeTab === 'reviews' || activeTab === 'inquiries';
  const [occurrencesModalProgram, setOccurrencesModalProgram] = useState<Program | null>(null);
  const [pricingModalProgram, setPricingModalProgram] = useState<Program | null>(null);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const handleConfirmOrder = async (id: string) => {
    setConfirmingOrderId(id);
    try {
      await confirmOrder(id);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Review reply state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replySubmitting, setReplySubmitting] = useState<boolean>(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState<string | null>(null);

  // Profile tab (kanban cfa4b20a point 1): own-profile editable fields, seeded from
  // currentProvider (hydrated via get_my_provider_profile) whenever it changes.
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    accepted_payment_methods: ['cash'] as OnsitePaymentMethod[],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!currentProvider) return;
    setProfileForm({
      company_name: currentProvider.company_name || '',
      contact_name: currentProvider.contact_name || '',
      phone: currentProvider.phone || '',
      email: currentProvider.email || '',
      website: currentProvider.website || '',
      description: currentProvider.description || '',
      accepted_payment_methods: currentProvider.accepted_payment_methods?.length
        ? currentProvider.accepted_payment_methods
        : ['cash'],
    });
  }, [currentProvider]);

  const toggleProfilePaymentMethod = (method: OnsitePaymentMethod) => {
    setProfileForm(prev => ({
      ...prev,
      accepted_payment_methods: prev.accepted_payment_methods.includes(method)
        ? prev.accepted_payment_methods.filter(m => m !== method)
        : [...prev.accepted_payment_methods, method],
    }));
  };

  const handleProfileSave = async () => {
    if (profileForm.accepted_payment_methods.length === 0) {
      setProfileMessage({ type: 'error', text: 'Legalább egy elfogadott fizetési módot ki kell választanod.' });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateProviderProfile(profileForm);
      setProfileMessage({ type: 'success', text: 'A profilod adatai elmentve.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err instanceof Error ? err.message : 'Ismeretlen hiba történt a mentés során.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Filter programs for this provider
  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );

  // Bookings tab (kanban fbf552b2 point 5b, NEW): orders already arrive RLS-scoped to
  // this provider's own programs (or all, for admin) -- see "Providers can view orders
  // for their programs" in schema.sql, no client-side provider_id filter needed beyond
  // matching against ownPrograms for display grouping.
  const ownProgramIds = new Set(ownPrograms.map(p => p.id));
  const ownOrders = orders.filter(o => ownProgramIds.has(o.program_id));
  const confirmedOwnOrders = ownOrders.filter(o => o.status === 'confirmed');

  const [buyerInfos, setBuyerInfos] = useState<Record<string, OrderBuyerInfo>>({});
  const ownOrderIds = ownOrders.map(o => o.id).join(',');

  useEffect(() => {
    const ids = ownOrderIds ? ownOrderIds.split(',') : [];
    let cancelled = false;
    ids.forEach(id => {
      getOrderBuyerInfo(id).then(info => {
        if (cancelled || !info) return;
        setBuyerInfos(prev => ({ ...prev, [id]: info }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownOrderIds]);

  // Booked program occurrence dates
  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, ProgramOccurrence>>({});

  useEffect(() => {
    const ordersWithOcc = ownOrders.filter(o => o.occurrence_id);
    if (ordersWithOcc.length === 0) return;

    const programIds = Array.from(new Set(ordersWithOcc.map(o => o.program_id)));
    let cancelled = false;

    Promise.all(programIds.map(pid => getProgramOccurrences(pid)))
      .then(results => {
        if (cancelled) return;
        const map: Record<string, ProgramOccurrence> = {};
        results.flat().forEach(occ => {
          map[occ.id] = occ;
        });
        setOccurrencesMap(prev => ({ ...prev, ...map }));
      })
      .catch(err => {
        console.warn('Occurrences load notice:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [ownOrderIds, getProgramOccurrences]);

  const formatProgramDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const raw = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatOrderCreatedDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Status counts (Section 11)
  const totalProgramsCount = ownPrograms.length;
  const activeProgramsCount = ownPrograms.filter((p) => p.status === 'published').length;
  const draftProgramsCount = ownPrograms.filter((p) => p.status === 'draft' || p.status === 'pending_review' || p.status === 'rejected').length;
  const archivedProgramsCount = ownPrograms.filter((p) => p.status === 'archived').length;
  const pendingProgramsCount = ownPrograms.filter((p) => p.status === 'pending_review').length;

  // Filter inquiries for this provider
  const ownInquiries = inquiries.filter(
    (inq) => inq.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );

  // Reviews for this provider's programs
  const ownProgramSlugs = new Set(ownPrograms.map(p => p.slug));
  const providerReviews = reviews.filter(r => 
    ownProgramIds.has(r.program_id) || 
    ownProgramSlugs.has(r.program_id) || 
    (currentProvider && r.provider_id === currentProvider.id)
  );
  const providerStats = getProviderRatingStats(currentProvider?.id);

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    setReplySuccessMsg(null);
    try {
      const res = await respondToReview(reviewId, replyText);
      if (res.success) {
        setReplySuccessMsg('Válaszod sikeresen közzétéve a program oldalán!');
        setReplyingReviewId(null);
        setReplyText('');
        setTimeout(() => setReplySuccessMsg(null), 3500);
      }
    } finally {
      setReplySubmitting(false);
    }
  };

  // Filtered program list for display (Aktív, Piszkozat, Archivált)
  const displayedPrograms = ownPrograms.filter((p) => {
    if (statusFilter === 'published') return p.status === 'published';
    if (statusFilter === 'archived') return p.status === 'archived';
    if (statusFilter === 'draft') return p.status === 'draft' || p.status === 'pending_review' || p.status === 'rejected';
    return p.status === statusFilter;
  });

  const getStatusBadge = (status: ProgramStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Aktív / Publikált</span>
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            <Clock3 className="w-3.5 h-3.5" />
            <span>Függőben (Jóváhagyásra vár)</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
            <FileText className="w-3.5 h-3.5" />
            <span>Piszkozat</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Elutasítva</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-stone-200 text-stone-600">
            <Archive className="w-3.5 h-3.5" />
            <span>Archivált</span>
          </span>
        );
    }
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobileCompactTab ? 'pt-1 sm:pt-8' : 'pt-2.5 sm:pt-8'} pb-6 sm:pb-8 animate-in fade-in duration-200`}>
      {/* Welcome Header */}
      <div className={`${isMobileCompactTab ? 'hidden sm:flex' : 'flex'} flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8`}>
        <div>
          <div className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Szolgáltatói Fiók: {currentProvider?.company_name || currentUser.name}</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            <span className="sm:hidden">Üdvozöllek a partner felületen!</span>
            <span className="hidden sm:inline">Üdvozöllek a partner felületen!</span>
          </h1>
          <p className="hidden sm:block text-sm text-stone-500 mt-1">
            Kezeld egyszerűen saját túráidat, kövesd figyelemmel a jóváhagyásokat és a foglalásokat.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-white text-stone-700 hover:text-stone-900 border-stone-200 hover:bg-stone-50'
            }`}
            title="Szolgáltatói fiókadatok szerkesztése"
          >
            <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
            <span className="truncate">Fiókadatok</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-500 hover:text-rose-600 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Kijelentkezés</span>
          </button>

          <button
            onClick={onOpenNewProgram}
            disabled={currentProvider?.status === 'suspended' || currentProvider?.status === 'banned'}
            title={
              currentProvider?.status === 'suspended' || currentProvider?.status === 'banned'
                ? 'Felfüggesztett/letiltott fiókkal nem hozható létre új program'
                : undefined
            }
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">+ Új program</span>
          </button>
        </div>
      </div>

      {/* Provider Status Alert -- pending, suspended vagy banned */}
      {currentProvider?.status === 'pending' && (
        <div className={`${isMobileCompactTab ? 'hidden sm:block' : 'block'} mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3`}>
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Fiókod adminisztrátori jóváhagyásra vár</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Hamarosan aktívvá válik -- addig a programjaid nem jelennek meg a publikus katalógusban.
            </p>
          </div>
        </div>
      )}
      {(currentProvider?.status === 'suspended' || currentProvider?.status === 'banned') && (
        <div className={`${isMobileCompactTab ? 'hidden sm:block' : 'block'} mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3`}>
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              {currentProvider?.status === 'banned' ? 'Fiókod véglegesen letiltva' : 'Fiókod felfüggesztve'}
            </h4>
            <p className="text-xs text-rose-800 mt-0.5">
              Programjaid jelenleg nem jelennek meg a publikus katalógusban, és új programot sem tudsz felvenni.
              A meglévő foglalásaidat (visszaigazolás, lemondás) továbbra is tudod kezelni.
              {currentProvider?.status === 'suspended' ? ' Ez egy ideiglenes, visszavonható állapot.' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Metric Stat Cards - Pontosan 3 blokk 1 sorban: Aktív, Piszkozat, Értékelés (fele olyan mély, kompakt magasság) */}
      <div className={`${isMobileCompactTab ? 'hidden sm:grid' : 'grid'} grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6`}>
        {/* 1. Aktív programok */}
        <button
          type="button"
          onClick={() => { setActiveTab('programs'); setStatusFilter('published'); }}
          className={`bg-white py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl border transition-all text-center sm:text-left min-w-0 cursor-pointer ${
            activeTab === 'programs' && statusFilter === 'published'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-white shadow-xs'
              : 'border-emerald-100 shadow-xs sm:shadow-sm bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-300'
          }`}
          title="Aktív (publikált) programok megtekintése"
        >
          <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider block truncate leading-tight">
            Aktív
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-emerald-600 leading-tight my-0.5">
            {activeProgramsCount}
          </div>
          <div className="text-[9px] sm:text-[11px] text-emerald-700/80 truncate leading-tight">
            Publikált
          </div>
        </button>

        {/* 2. Piszkozatok */}
        <button
          type="button"
          onClick={() => { setActiveTab('programs'); setStatusFilter('draft'); }}
          className={`bg-white py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl border transition-all text-center sm:text-left min-w-0 cursor-pointer ${
            activeTab === 'programs' && statusFilter === 'draft'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-50/50 to-white shadow-xs'
              : 'border-stone-200 shadow-xs sm:shadow-sm hover:border-amber-300'
          }`}
          title="Piszkozat programok megtekintése"
        >
          <span className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider block truncate leading-tight">
            Piszkozat
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-amber-600 leading-tight my-0.5">
            {draftProgramsCount}
          </div>
          <div className="text-[9px] sm:text-[11px] text-stone-400 truncate leading-tight">
            Vázlat
          </div>
        </button>

        {/* 3. Értékelések */}
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`bg-white py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl border transition-all text-center sm:text-left min-w-0 cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-50/50 to-white shadow-xs'
              : 'border-amber-100 shadow-xs sm:shadow-sm bg-gradient-to-br from-white to-amber-50/30 hover:border-amber-300'
          }`}
          title="Értékelések megtekintése"
        >
          <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider block truncate leading-tight">
            Értékelés
          </span>
          <div className="text-base sm:text-2xl font-extrabold font-display text-amber-600 flex items-center justify-center sm:justify-start gap-1 leading-tight my-0.5">
            <span>{providerStats.count > 0 ? providerStats.average.toFixed(1) : '5.0'}</span>
            <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400 shrink-0" />
          </div>
          <div className="text-[9px] sm:text-[11px] text-amber-700/80 truncate leading-tight">
            {providerReviews.length} vélemény
          </div>
        </button>
      </div>

      {/* Tabs navigation - 4 fül (Programok, Foglalások, Értékelések, Érdeklődések) egymás mellett mobilon is */}
      <div className={`grid grid-cols-4 sm:flex border-b border-stone-200 ${isMobileCompactTab ? 'mt-1 mb-4' : 'mb-6'} gap-0.5 sm:gap-6`}>
        <button
          onClick={() => setActiveTab('programs')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'programs'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Programok</span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">({ownPrograms.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Foglalások</span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">({ownOrders.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Értékelések</span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">({providerReviews.length})</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-0.5 sm:px-0 text-center sm:text-left min-w-0 ${
            activeTab === 'inquiries'
              ? 'border-emerald-600 text-emerald-700 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="text-[11px] sm:text-sm leading-tight flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-1 min-w-0">
            <span className="truncate">Érdeklődések</span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">({ownInquiries.length})</span>
          </span>
        </button>
      </div>

      {/* Tab 1: Programs list */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {/* Status filter bar - csak Aktív, Piszkozat és Archivált */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'published', label: `Aktív (${activeProgramsCount})` },
              { id: 'draft', label: `Piszkozat (${draftProgramsCount})` },
              { id: 'archived', label: `Archivált (${archivedProgramsCount})` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-colors shrink-0 cursor-pointer ${
                  statusFilter === btn.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Table / Card list of programs */}
          {displayedPrograms.length > 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-stone-100">
                {displayedPrograms.map((prog) => {
                  const cover = prog.images?.find(i => i.is_cover)?.image_url || prog.images?.[0]?.image_url;
                  return (
                    <div key={prog.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-20 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          {cover ? (
                            <img src={cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">🖼️</div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {getStatusBadge(prog.status)}
                            {prog.region && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 flex items-center gap-1">
                                <CountryFlag emoji={prog.region.flag_emoji} country={prog.region.country || prog.region.name} size="xs" />
                                <span>{prog.region.name}</span>
                              </span>
                            )}
                            {prog.category && (
                              <span className="text-[11px] text-stone-500 font-medium">
                                • {prog.category.name}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
                              <span>{prog.language || 'Magyar nyelvű'}</span>
                            </span>
                          </div>
                          <h4 className="font-bold text-base text-stone-900 truncate font-display">
                            {prog.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                            <span className="flex items-center gap-1">📍 {prog.location}</span>
                            <span className="flex items-center gap-1">📅 {prog.event_date}</span>
                            <span className="flex items-center gap-1 font-bold text-emerald-800">
                              💰 {prog.pricing_mode === 'tiered'
                                ? 'Sávos (csoportos) árazás'
                                : `${formatPrice(prog.price)} ${prog.currency === 'EUR' ? '€' : prog.currency}/fő`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - mobilon átlátható 2 oszlopos grid és teljes szélességű gombok, asztalin egysoros flex */}
                      <div className="w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-stone-100 flex flex-col sm:flex-row sm:items-center sm:flex-wrap lg:flex-nowrap gap-2">
                        {/* 4 fő gomb: mobilon kényelmes 2x2 grid, sm felett rugalmas sor */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => openProgramDetail(prog.id)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Megtekintés"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-500" />
                            <span>Előnézet</span>
                          </button>

                          <button
                            onClick={() => setEditingProgram(prog)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Összes adat szerkesztése (publikált és piszkozat állapotban is)"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Szerkesztés</span>
                          </button>

                          <button
                            onClick={() => setOccurrencesModalProgram(prog)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Időpontok kezelése"
                          >
                            <Calendar className="w-3.5 h-3.5 text-stone-500" />
                            <span>Időpontok</span>
                          </button>

                          <button
                            onClick={() => setPricingModalProgram(prog)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Árazás kezelése"
                          >
                            <BadgeEuro className="w-3.5 h-3.5 text-stone-500" />
                            <span>Árazás</span>
                          </button>
                        </div>

                        {/* Státuszváltás, Archiválás és Törlés */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {/* Gyors státuszváltás: közvetlen közzététel vagy piszkozatba visszavonás */}
                          {prog.status === 'draft' ? (
                            <button
                              onClick={() => updateProgram(prog.id, { status: 'published' })}
                              className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title="Azonnali közzététel a katalógusban"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Közzététel</span>
                            </button>
                          ) : prog.status === 'published' ? (
                            <button
                              onClick={() => updateProgram(prog.id, { status: 'draft' })}
                              className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="Visszavonás piszkozatba (elrejtés a katalógusból)"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>Piszkozatba</span>
                            </button>
                          ) : prog.status === 'archived' ? (
                            <button
                              onClick={() => updateProgram(prog.id, { status: 'draft' })}
                              className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="Visszaállítás a piszkozatok közé"
                            >
                              <FileEdit className="w-3.5 h-3.5 text-amber-700" />
                              <span>Visszaállítás</span>
                            </button>
                          ) : null}

                          {/* Archiválás opció a kártyán */}
                          {prog.status !== 'archived' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Biztosan archiválni szeretnéd ezt a programot? Elrejtődik a katalógusból, de az adatai és korábbi foglalásai megmaradnak.')) {
                                  await archiveProgram(prog.id);
                                }
                              }}
                              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="Archiválás (program leállítása és elrejtése)"
                            >
                              <Archive className="w-3.5 h-3.5 text-stone-500" />
                              <span>Archiválás</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm('Biztosan törölni szeretnéd ezt a programot?')) {
                                deleteProgram(prog.id).catch((err) => {
                                  alert(err instanceof Error ? err.message : 'Ismeretlen hiba történt a törlés során.');
                                });
                              }
                            }}
                            className="p-2 sm:p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 sm:border-transparent transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                            title="Törlés"
                            aria-label="Program törlése"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-display mb-1">
                {statusFilter === 'published' && 'Jelenleg nincs aktív (publikált) programod'}
                {statusFilter === 'draft' && 'Jelenleg nincs piszkozat programod'}
                {statusFilter === 'archived' && 'Jelenleg nincs archivált programod'}
              </h4>
              <p className="text-xs text-stone-500 mb-4">
                Kattints az Új program gombra és hozd létre a következő túrádat!
              </p>
              <button
                onClick={onOpenNewProgram}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Új program rögzítése
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* View mode toggle header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-stone-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-600" />
                <span>Foglalások ({ownOrders.length})</span>
              </h3>
              <p className="text-xs text-stone-500">
                A programjaidra érkezett foglalások dátumai, létszámai és visszaigazolása.
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 border border-stone-200/80 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBookingsViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  bookingsViewMode === 'calendar'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Naptár nézet</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingsViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  bookingsViewMode === 'list'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5 text-stone-600" />
                <span>Lista nézet</span>
              </button>
            </div>
          </div>

          {bookingsViewMode === 'calendar' ? (
            <ProviderBookingsCalendar
              orders={ownOrders}
              programs={ownPrograms}
              occurrencesMap={occurrencesMap}
              buyerInfos={buyerInfos}
              onConfirmOrder={handleConfirmOrder}
              confirmingOrderId={confirmingOrderId}
              onRescheduleOrder={(orderId) => setRescheduleOrderId(orderId)}
              onOpenProgramDetail={openProgramDetail}
              onSelectOrder={(order) => setSelectedOrderDetail(order)}
            />
          ) : ownOrders.length > 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                <span>Foglalások listája ({ownOrders.length})</span>
                <span className="text-[11px] font-normal text-stone-400">Kattints a kártyára a részletekért</span>
              </div>
              <div className="divide-y divide-stone-100">
                {ownOrders.map((order) => {
                  const program = programs.find(p => p.id === order.program_id);
                  const buyer = buyerInfos[order.id];
                  const occ = order.occurrence_id ? occurrencesMap[order.occurrence_id] : null;
                  const rawProgramDate = occ?.event_date || program?.event_date;
                  const bookedDateFormatted = formatProgramDate(rawProgramDate);
                  const bookedTime = occ?.start_time || program?.start_time;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderDetail(order)}
                      className="p-5 hover:bg-stone-50/80 transition-all space-y-3 cursor-pointer group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                            #{getBookingReference(order)}
                          </span>
                          <h4 className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">{program?.title || 'Program'}</h4>
                        </div>
                        <span className={`self-start sm:self-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {order.status === 'confirmed' ? 'Megerősítve (visszaigazolva)' : order.status === 'pending' ? 'Visszaigazolásra vár' : 'Lemondva'}
                        </span>
                      </div>

                      {/* Lefoglalt program dátuma */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Program dátuma: <strong className="font-bold text-emerald-950">{bookedDateFormatted || 'Egyeztetés alatt'}</strong></span>
                          {bookedTime && (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-normal ml-0.5">
                              <Clock className="w-3 h-3 text-emerald-600 inline" />
                              {bookedTime}
                            </span>
                          )}
                        </div>
                        {order.created_at && (
                          <span className="text-[11px] text-stone-400">
                            (Foglalás leadva: {formatOrderCreatedDate(order.created_at)})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span>{order.participants_count} fő · helyszínen fizetendő: <strong className="text-stone-800">{formatPrice(order.onsite_amount)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
                        {order.onsite_payment_method && (
                          <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            {order.onsite_payment_method === 'revolut' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                            {PAYMENT_METHOD_LABEL[order.onsite_payment_method]}
                          </span>
                        )}
                        {order.booking_fee > 0 && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            ✓ Kényelmi díj kifizetve (Stripe)
                          </span>
                        )}
                      </div>

                      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          {buyer ? (
                            <span>👤 Vevő (Programvadász): <strong className="text-stone-900">{buyer.name}</strong> ({buyer.email})</span>
                          ) : (
                            <span className="text-stone-500">👤 Vevő: Programvadász</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {order.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmOrder(order.id);
                              }}
                              disabled={confirmingOrderId === order.id}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{confirmingOrderId === order.id ? 'Visszaigazolás...' : 'Foglalás visszaigazolása'}</span>
                            </button>
                          )}
                          {order.status !== 'cancelled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRescheduleOrderId(order.id);
                              }}
                              className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Áthelyezés
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderDetail(order);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Megtekintés</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-display mb-1">
                Még nem érkezett foglalás
              </h4>
              <p className="text-xs text-stone-500">
                Amint egy látogató lefoglal egy programot és rendezi a platform kényelmi díjat, itt megjelenik visszaigazolásra.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Inquiries list */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          {ownInquiries.length > 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
                Beérkezett Érdeklődések ({ownInquiries.length})
              </div>
              <div className="divide-y divide-stone-100">
                {ownInquiries.map((inq) => {
                  const formattedInqDate = new Date(inq.created_at).toLocaleString('hu-HU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={inq.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg mr-2">
                            {inq.program_title}
                          </span>
                          <span className="text-xs text-stone-400">
                            {formattedInqDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <a
                            href={`mailto:${inq.email}?subject=Velem Gyere – Válasz a(z) ${encodeURIComponent(inq.program_title || 'program')} érdeklődésre`}
                            className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Válasz e-mailben</span>
                          </a>

                          {inq.phone && (
                            <a
                              href={`tel:${inq.phone}`}
                              className="text-stone-700 hover:underline font-semibold flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{inq.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                        <div className="text-xs text-stone-500 mb-1">
                          Érdeklődő neve: <strong className="text-stone-900">{inq.name}</strong> ({inq.email})
                        </div>
                        <p className="text-sm text-stone-800 italic">
                          "{inq.message || 'Nem adott meg egyedi üzenetet, általános érdeklődés.'}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-800 font-display mb-1">
                Még nem érkezett érdeklődés
              </h4>
              <p className="text-xs text-stone-500">
                Amint egy látogató megnyomja az "Érdekel a program" gombot a publikus oldalon, itt azonnal megjelennek az adatai.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Own profile edit (kanban cfa4b20a point 1) --
          status/stripe_account_id/payouts_enabled/payment_mode are intentionally not
          editable here, see providers_self_profile_update migration. */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-base font-bold text-stone-800 font-display flex items-center gap-2">
              <UserCog className="w-5 h-5 text-emerald-600" />
              <span>Fiókadatok</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('programs')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              ← Vissza a programokhoz
            </button>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            Ezek az adatok jelennek meg a programjaidon, és ezeken ér el téged az admin és a vásárlók.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Cégnév</label>
              <input
                type="text"
                value={profileForm.company_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Kapcsolattartó neve</label>
              <input
                type="text"
                value={profileForm.contact_name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, contact_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Telefonszám</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Weboldal (opcionális)</label>
              <input
                type="url"
                value={profileForm.website}
                onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Bemutatkozás</label>
              <textarea
                rows={4}
                value={profileForm.description}
                onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">
                Elfogadott fizetési mód helyszínen
              </label>
              <p className="text-xs text-stone-400 mb-2">
                Ez minden programodra érvényes, nem állítható program-szintenként. A vásárló csak az itt bejelölt módok közül választhat Véglegesítésnél.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleProfilePaymentMethod('cash')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    profileForm.accepted_payment_methods.includes('cash')
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Készpénz
                </button>
                <button
                  type="button"
                  onClick={() => toggleProfilePaymentMethod('revolut')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    profileForm.accepted_payment_methods.includes('revolut')
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Revolut
                </button>
              </div>
            </div>

            {profileMessage && (
              <div className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <button
              onClick={handleProfileSave}
              disabled={profileSaving || profileForm.accepted_payment_methods.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{profileSaving ? 'Mentés...' : 'Adatok mentése'}</span>
            </button>
          </div>
        </div>
      )}

      <ProgramOccurrencesModal
        program={occurrencesModalProgram}
        onClose={() => setOccurrencesModalProgram(null)}
      />
      <ProgramPricingModal
        program={pricingModalProgram}
        onClose={() => setPricingModalProgram(null)}
      />
      <RescheduleOrderModal
        orderId={rescheduleOrderId}
        onClose={() => setRescheduleOrderId(null)}
      />
      <NewProgramModal
        isOpen={Boolean(editingProgram)}
        programToEdit={editingProgram}
        onClose={() => setEditingProgram(null)}
      />
      {selectedOrderDetail && (
        <BookingDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
        />
      )}
    </div>
  );
};
