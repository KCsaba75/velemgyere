import React, { useState, useEffect } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
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
  CornerDownRight
} from 'lucide-react';
import { Program, ProgramStatus, OrderBuyerInfo, OnsitePaymentMethod } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProgramOccurrencesModal } from './ProgramOccurrencesModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';

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
    updateProviderProfile
  } = useApp();

  useDocumentMeta('Szolgáltatói Dashboard', 'Saját programok, foglalások és érdeklődések kezelése.');

  const [activeTab, setActiveTab] = useState<'programs' | 'bookings' | 'inquiries' | 'reviews' | 'profile'>('programs');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [occurrencesModalProgram, setOccurrencesModalProgram] = useState<Program | null>(null);
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);

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
  const confirmedOwnOrderIds = confirmedOwnOrders.map(o => o.id).join(',');

  useEffect(() => {
    const ids = confirmedOwnOrderIds ? confirmedOwnOrderIds.split(',') : [];
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
  }, [confirmedOwnOrderIds]);

  // Status counts (Section 11)
  const totalProgramsCount = ownPrograms.length;
  const activeProgramsCount = ownPrograms.filter((p) => p.status === 'published').length;
  const draftProgramsCount = ownPrograms.filter((p) => p.status === 'draft').length;
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

  // Filtered program list for display
  const displayedPrograms = ownPrograms.filter((p) => {
    if (statusFilter === 'all') return true;
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Welcome Header (Section 11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Szolgáltatói Fiók: {currentProvider?.company_name || currentUser.name}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Üdvözlünk a Velem Gyere szolgáltatói felületén!
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Kezeld egyszerűen saját túráidat, kövesd figyelemmel a jóváhagyásokat és válaszolj a beérkező érdeklődésekre.
          </p>
        </div>

        <button
          onClick={onOpenNewProgram}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Új program</span>
        </button>
      </div>

      {/* Provider Status Alert if pending */}
      {currentProvider?.status === 'pending' && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Fiókod még adminisztrátori ellenőrzés alatt áll</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Új programokat felvihetsz és elküldhetsz felülvizsgálatra, de a publikus katalógusban a jóváhagyás után jelennek majd meg.
            </p>
          </div>
        </div>
      )}

      {/* Metric Stat Cards (Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {/* Saját programok */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Saját programok
          </span>
          <div className="text-3xl font-extrabold font-display text-stone-900">
            {totalProgramsCount}
          </div>
          <div className="text-xs text-stone-400 mt-1">Összes rögzített tétel</div>
        </div>

        {/* Aktív programok */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Aktív programok
          </span>
          <div className="text-3xl font-extrabold font-display text-emerald-600">
            {activeProgramsCount}
          </div>
          <div className="text-xs text-emerald-700/80 mt-1">Publikusan böngészhető</div>
        </div>

        {/* Értékelések */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Értékelési átlag
          </span>
          <div className="text-3xl font-extrabold font-display text-amber-600 flex items-center gap-1">
            <span>{providerStats.count > 0 ? providerStats.average.toFixed(1) : '5.0'}</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
          </div>
          <div className="text-xs text-amber-700/80 mt-1">
            {providerReviews.length} igazolt utazói vélemény
          </div>
        </div>

        {/* Piszkozatok & függőben */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
            Piszkozatok / Függőben
          </span>
          <div className="text-3xl font-extrabold font-display text-amber-600">
            {draftProgramsCount + pendingProgramsCount}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {draftProgramsCount} piszkozat, {pendingProgramsCount} ellenőrzésre
          </div>
        </div>

        {/* Érdeklődések */}
        <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm bg-gradient-to-br from-white to-teal-50/40 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block mb-1">
            Érdeklődések
          </span>
          <div className="text-3xl font-extrabold font-display text-teal-600">
            {ownInquiries.length}
          </div>
          <div className="text-xs text-teal-700/80 mt-1">Beérkezett megkeresés</div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-200 mb-6 gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('programs')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'programs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Saját Programok ({ownPrograms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Foglalások ({ownOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Értékelések ({providerReviews.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'inquiries'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Érdeklődések ({ownInquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>Fiók adatok</span>
        </button>
      </div>

      {/* Tab 1: Programs list */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'all', label: 'Összes' },
              { id: 'published', label: 'Aktív (Publikált)' },
              { id: 'pending_review', label: 'Jóváhagyásra vár' },
              { id: 'draft', label: 'Piszkozat' },
              { id: 'rejected', label: 'Elutasítva' },
              { id: 'archived', label: 'Archivált' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
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
                              💰 {formatPrice(prog.price)} {prog.currency === 'EUR' ? '€' : prog.currency}/fő
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => openProgramDetail(prog.id)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Megtekintés"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Előnézet</span>
                        </button>

                        <button
                          onClick={() => setOccurrencesModalProgram(prog)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Időpontok kezelése"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Időpontok</span>
                        </button>

                        {/* Submit draft for review button */}
                        {prog.status === 'draft' && (
                          <button
                            onClick={() => updateProgram(prog.id, { status: 'pending_review' })}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Jóváhagyásra küld</span>
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
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Törlés"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                Ebben a kategóriában jelenleg nincs programod
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

      {/* Tab: Bookings (kanban fbf552b2 point 5b, NEW) */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {ownOrders.length > 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
                Foglalások ({ownOrders.length})
              </div>
              <div className="divide-y divide-stone-100">
                {ownOrders.map((order) => {
                  const program = programs.find(p => p.id === order.program_id);
                  const buyer = buyerInfos[order.id];
                  return (
                    <div key={order.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-sm">{program?.title || 'Program'}</h4>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {order.status === 'confirmed' ? 'Megerősítve' : order.status === 'pending' ? 'Függőben (jóváhagyásra vár)' : 'Lemondva'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {order.participants_count} fő · helyszínen fizetendő: {formatPrice(order.onsite_amount)} {order.currency === 'EUR' ? '€' : order.currency}
                        {order.onsite_payment_method && (
                          <span className="inline-flex items-center gap-1 ml-1">
                            ({order.onsite_payment_method === 'revolut' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />} {PAYMENT_METHOD_LABEL[order.onsite_payment_method]})
                          </span>
                        )}
                      </p>
                      {order.status === 'confirmed' && (
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-stone-700">
                          {buyer ? (
                            <span>👤 Vevő: <strong className="text-stone-900">{buyer.name}</strong> ({buyer.email})</span>
                          ) : (
                            <span className="text-stone-400">Vevő adatainak betöltése...</span>
                          )}
                        </div>
                      )}
                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => setRescheduleOrderId(order.id)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Áthelyezés másik időpontra
                        </button>
                      )}
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
                Amint egy látogató lefoglal egy helyet, és az adminisztrátor jóváhagyja, itt megjelenik a vevő adataival.
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
          <h3 className="text-base font-bold text-stone-800 font-display mb-1">Fiók adatok</h3>
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
      <RescheduleOrderModal
        orderId={rescheduleOrderId}
        onClose={() => setRescheduleOrderId(null)}
      />
    </div>
  );
};
