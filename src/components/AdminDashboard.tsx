import React, { useState } from 'react';
import { useApp, formatPrice, formatPlatformFee } from '../context/AppContext';
import { CountryFlag } from './CountryFlag';
import {
  ShieldCheck,
  FileText,
  Building2,
  MessageSquare,
  Check,
  X,
  Sparkles,
  Archive,
  Eye,
  Trash2,
  Clock,
  Globe,
  PlusCircle,
  Layers,
  Edit,
  RotateCcw,
  Ban,
  Tag,
  Ticket,
  Banknote,
  Wallet,
  Star
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { Region, Category, OnsitePaymentMethod, ReviewStatus } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { RescheduleOrderModal } from './RescheduleOrderModal';
import { Settings as SettingsIcon } from 'lucide-react';

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
};

export const AdminDashboard: React.FC = () => {
  const {
    programs,
    providers,
    inquiries,
    orders,
    reviews,
    moderateReview,
    deleteReview,
    regions,
    categories,
    approveProgram,
    rejectProgram,
    archiveProgram,
    toggleFeaturedProgram,
    approveProvider,
    suspendProvider,
    openProgramDetail,
    deleteProgram,
    createRegion,
    updateRegion,
    deleteRegion,
    toggleRegionActive,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    resetToDefaults,
    feePercentage,
    feeMinimumEur,
    updateFeeSettings
  } = useApp();

  useDocumentMeta('Adminisztrátori felület', 'Programok, szolgáltatók, foglalások és katalógus-adatok kezelése.');

  const [activeTab, setActiveTab] = useState<'programs' | 'providers' | 'bookings' | 'reviews' | 'regions' | 'categories' | 'inquiries' | 'settings'>('programs');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'published' | 'flagged' | 'hidden'>('all');
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null);

  // Bookings tab: admin nyilvántartás & státuszfigyelés
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  // Fee settings editor (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF): local
  // draft inputs, only written on save.
  const [feePercentageDraft, setFeePercentageDraft] = useState(String(feePercentage));
  const [feeMinimumEurDraft, setFeeMinimumEurDraft] = useState(String(feeMinimumEur));
  const [feeSettingsSaving, setFeeSettingsSaving] = useState(false);
  const [feeSettingsSaved, setFeeSettingsSaved] = useState(false);

  const handleSaveFeeSettings = async () => {
    const pct = Number(feePercentageDraft);
    const min = Number(feeMinimumEurDraft);
    if (Number.isNaN(pct) || pct < 0 || Number.isNaN(min) || min < 0) return;
    setFeeSettingsSaving(true);
    try {
      await updateFeeSettings({ fee_percentage: pct, fee_minimum_eur: min });
      setFeeSettingsSaved(true);
      setTimeout(() => setFeeSettingsSaved(false), 2500);
    } finally {
      setFeeSettingsSaving(false);
    }
  };
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  // Modal state for adding a new Region
  const [addRegionModalOpen, setAddRegionModalOpen] = useState(false);
  const [newRegionCountry, setNewRegionCountry] = useState('');
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionEmoji, setNewRegionEmoji] = useState('✈️');
  const [newRegionDesc, setNewRegionDesc] = useState('');
  const [newRegionImage, setNewRegionImage] = useState('');

  // Modal state for adding a new Service Type (Category)
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Compass');

  // Metrics
  const totalPrograms = programs.length;
  const activePrograms = programs.filter(p => p.status === 'published').length;
  const pendingPrograms = programs.filter(p => p.status === 'pending_review').length;
  const totalProviders = providers.length;
  const pendingProviders = providers.filter(p => p.status === 'pending').length;
  const totalInquiries = inquiries.length;

  const filteredPrograms = programs.filter(p => {
    if (programFilter === 'all') return true;
    return p.status === programFilter;
  });

  const filteredProviders = providers.filter(p => {
    if (providerFilter === 'all') return true;
    return p.status === providerFilter;
  });

  const handleCreateRegionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionCountry.trim() || !newRegionName.trim()) return;

    await createRegion({
      country: newRegionCountry.trim(),
      name: newRegionName.trim(),
      flag_emoji: newRegionEmoji.trim() || '✈️',
      description: newRegionDesc.trim(),
      image_url: newRegionImage.trim() || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      active: true,
    });

    setNewRegionCountry('');
    setNewRegionName('');
    setNewRegionEmoji('✈️');
    setNewRegionDesc('');
    setNewRegionImage('');
    setAddRegionModalOpen(false);
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    await createCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      active: true,
    });

    setNewCategoryName('');
    setNewCategoryIcon('Compass');
    setAddCategoryModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Központi Adminisztrátori Felület (Velem Gyere Admin)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Külföldi Programok, Úticélok & Szolgáltatások Kezelése
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Úticélok (régiók) és szolgáltatási típusok bővítése, programok jóváhagyása és szolgáltatók adminisztrációja.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Biztosan visszaállítod a katalógust az eredeti tesztadatokra?')) {
              resetToDefaults();
            }
          }}
          className="text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          title="Adatok visszaállítása alaphelyzetbe"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Tesztadatok visszaállítása</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            Összes program
          </span>
          <div className="text-2xl font-extrabold font-display text-stone-900">{totalPrograms}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Aktív programok
          </span>
          <div className="text-2xl font-extrabold font-display text-emerald-600">{activePrograms}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Jóváhagyásra vár
          </span>
          <div className="text-2xl font-extrabold font-display text-amber-600">{pendingPrograms}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
            Úticélok / Régiók
          </span>
          <div className="text-2xl font-extrabold font-display text-stone-900">{regions.length}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm bg-purple-50/30">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">
            Szolgáltatók
          </span>
          <div className="text-2xl font-extrabold font-display text-purple-600">{totalProviders}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-sm bg-teal-50/30">
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
            Érdeklődések
          </span>
          <div className="text-2xl font-extrabold font-display text-teal-600">{totalInquiries}</div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-200 mb-6 gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('programs')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'programs'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Programkezelés ({programs.length})</span>
          {pendingPrograms > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingPrograms} új
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('regions')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'regions'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Úticélok & Régiók ({regions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'categories'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Szolgáltatás Típusok ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'providers'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Szolgáltatók ({providers.length})</span>
          {pendingProviders > 0 && (
            <span className="bg-purple-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingProviders} új
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Foglalások ({orders.length})</span>
          {pendingOrders.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingOrders.length} jóváhagyásra vár
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'reviews'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Értékelések ({reviews.length})</span>
          {reviews.filter(r => r.status === 'flagged').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {reviews.filter(r => r.status === 'flagged').length} ellenőrizendő
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'inquiries'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Érdeklődések ({inquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Beállítások</span>
        </button>
      </div>

      {/* TAB: BEÁLLÍTÁSOK (Csaba 2026-10-07 penzugyi-mukodesi-modell PDF: szazalekos foglalasi dij) */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-lg space-y-4">
          <h3 className="font-display font-bold text-stone-900 text-lg">Foglalási díj</h3>
          <p className="text-sm text-stone-600">
            A foglalási díj = MAX(százalék × program nettó ára, minimum összeg). A programgazda a
            saját kézhez kapandó (nettó) összeget adja meg, erre számolódik rá a díj -- a vevő a
            teljes (nettó+díj) árat látja. Regisztrációkor a mindenkori minimum összeggel egyező
            ajándék-kredit kerül a visitor fiókjába -- a már kiadott kreditek és meglévő foglalások
            nem változnak utólag, ha itt módosítod az értékeket.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="w-40 text-xs font-bold text-stone-700 uppercase tracking-wider">Százalék</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feePercentageDraft}
                onChange={(e) => setFeePercentageDraft(e.target.value)}
                className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-500">%</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-40 text-xs font-bold text-stone-700 uppercase tracking-wider">Minimum összeg</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={feeMinimumEurDraft}
                onChange={(e) => setFeeMinimumEurDraft(e.target.value)}
                className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-stone-500">€</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveFeeSettings}
              disabled={feeSettingsSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60"
            >
              {feeSettingsSaving ? 'Mentés...' : 'Mentés'}
            </button>
            {feeSettingsSaved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mentve
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400">
            Jelenlegi érték élesben: {feePercentage.toFixed(2)}% (min. {feeMinimumEur.toFixed(2)} €)
          </p>
        </div>
      )}

      {/* TAB 1: PROGRAMKEZELÉS */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'all', label: 'Összes külföldi program' },
              { id: 'pending_review', label: 'Jóváhagyásra vár (Pending)' },
              { id: 'published', label: 'Publikált (Aktív)' },
              { id: 'draft', label: 'Piszkozat (Draft)' },
              { id: 'rejected', label: 'Elutasított' },
              { id: 'archived', label: 'Archivált' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setProgramFilter(btn.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
                  programFilter === btn.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-100">
              {filteredPrograms.map((prog) => {
                const cover = prog.images?.find(i => i.is_cover)?.image_url || prog.images?.[0]?.image_url;
                return (
                  <div key={prog.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden bg-stone-900 shrink-0 border border-stone-200">
                        {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            prog.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                            prog.status === 'pending_review' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                            prog.status === 'draft' ? 'bg-stone-100 text-stone-600' :
                            prog.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-stone-200 text-stone-600'
                          }`}>
                            {prog.status === 'published' ? 'Publikálva' :
                             prog.status === 'pending_review' ? 'Jóváhagyásra vár' :
                             prog.status === 'draft' ? 'Piszkozat' :
                             prog.status === 'rejected' ? 'Elutasítva' : 'Archivált'}
                          </span>

                          {prog.region && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 flex items-center gap-1">
                              <CountryFlag emoji={prog.region.flag_emoji} country={prog.region.country || prog.region.name} size="xs" />
                              <span>{prog.region.name}</span>
                            </span>
                          )}

                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
                            <span>{prog.language || 'Magyar nyelvű'}</span>
                          </span>

                          <span className="text-xs text-stone-500 font-medium">
                            🏢 {prog.provider?.company_name || 'Szolgáltató'}
                          </span>
                        </div>

                        <h4 className="font-bold text-base sm:text-lg text-stone-900 truncate font-display">
                          {prog.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                          <span>📍 {prog.location}</span>
                          <span>📅 {prog.event_date}</span>
                          <span className="font-bold text-emerald-800">
                            💰 {formatPrice(prog.price)} {prog.currency === 'EUR' ? '€' : prog.currency}/fő
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        onClick={() => openProgramDetail(prog.id)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Program előnézet"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Megtekint</span>
                      </button>

                      <button
                        onClick={() => toggleFeaturedProgram(prog.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          prog.featured
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{prog.featured ? 'Kiemelt' : 'Kiemelés'}</span>
                      </button>

                      {prog.status !== 'published' && (
                        <button
                          onClick={() => approveProgram(prog.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Jóváhagyás</span>
                        </button>
                      )}

                      {prog.status !== 'rejected' && prog.status !== 'published' && (
                        <button
                          onClick={() => rejectProgram(prog.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Elutasítás</span>
                        </button>
                      )}

                      {prog.status !== 'archived' && (
                        <button
                          onClick={() => archiveProgram(prog.id)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archiválás</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm('Véglegesen törlöd ezt a programot az adatbázisból?')) {
                            deleteProgram(prog.id);
                          }
                        }}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Végleges törlés"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ÚTICÉLOK & RÉGIÓK KEZELÉSE (Admin Extensibility) */}
      {activeTab === 'regions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100">
            <div>
              <h3 className="font-display font-bold text-lg text-emerald-950">
                Úticélok & Régiók Adminisztrációja
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                Itt adhatsz hozzá új országokat, régiókat vagy városokat (pl. Görögország/Kréta, Portugália/Lisszabon), és kapcsolhatod ki/be a meglévőket.
              </p>
            </div>

            <button
              onClick={() => setAddRegionModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Új Régió / Úticél Hozzáadása</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((reg) => {
              const count = programs.filter(p => p.region_id === reg.id || p.region?.slug === reg.slug).length;
              return (
                <div key={reg.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <CountryFlag emoji={reg.flag_emoji} country={reg.country || reg.name} size="lg" className="w-8 h-5.5 rounded shadow" />
                      <button
                        onClick={() => toggleRegionActive(reg.id)}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                          reg.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {reg.active ? 'Aktív' : 'Inaktív'}
                      </button>
                    </div>

                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      {reg.country}
                    </div>

                    <h4 className="font-display font-bold text-xl text-stone-900 mt-0.5">
                      {reg.name}
                    </h4>

                    {reg.description && (
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                        {reg.description}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 font-medium">
                      {count} regisztrált program ebben a régióban
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleRegionActive(reg.id)}
                      className="text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                    >
                      {reg.active ? 'Inaktiválás' : 'Aktiválás'}
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Biztosan törölni szeretnéd a(z) ${reg.name} régiót?`)) {
                          deleteRegion(reg.id);
                        }
                      }}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer"
                      title="Régió törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SZOLGÁLTATÁS TÍPUSOK KEZELÉSE (Admin Extensibility) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100">
            <div>
              <h3 className="font-display font-bold text-lg text-emerald-950">
                Szolgáltatás Típusok Adminisztrációja
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-2xl">
                Kezeld és bővítsd a katalógusban elérhető szolgáltatási kategóriákat (pl. Reptéri Transzfer, Hajókirándulás, Privát túra, Gasztro).
              </p>
            </div>

            <button
              onClick={() => setAddCategoryModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Új Szolgáltatás Típus Hozzáadása</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const count = programs.filter(p => p.category_id === cat.id || p.category?.slug === cat.slug).length;
              return (
                <div key={cat.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <CategoryIcon icon={cat.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-base font-display">
                        {cat.name}
                      </h4>
                      <span className="text-xs text-stone-400">
                        {count} program ebben a típusban
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategoryActive(cat.id)}
                      className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {cat.active ? 'Aktív' : 'Inaktív'}
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Biztosan törölni szeretnéd a(z) ${cat.name} szolgáltatás típust?`)) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg cursor-pointer"
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
      )}

      {/* TAB 4: SZOLGÁLTATÓK KEZELÉSE */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'all', label: 'Összes szolgáltató' },
              { id: 'pending', label: 'Új / Jóváhagyásra vár' },
              { id: 'approved', label: 'Jóváhagyott (Approved)' },
              { id: 'suspended', label: 'Felfüggesztett (Suspended)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setProviderFilter(btn.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
                  providerFilter === btn.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProviders.map((prov) => {
              const provProgramsCount = programs.filter(p => p.provider_id === prov.id).length;
              return (
                <div key={prov.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        prov.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        prov.status === 'pending' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {prov.status === 'approved' ? 'Jóváhagyva' :
                         prov.status === 'pending' ? 'Függőben (Új regisztráció)' : 'Letiltva / Felfüggesztve'}
                      </span>

                      <span className="text-xs text-stone-400">
                        {provProgramsCount} program a katalógusban
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-lg text-stone-900">
                      {prov.company_name}
                    </h4>

                    <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                      {prov.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 text-xs text-stone-600">
                      <div>👤 Kapcsolattartó: <strong className="text-stone-800">{prov.contact_name}</strong></div>
                      <div>📧 E-mail: <strong className="text-stone-800">{prov.email}</strong></div>
                      <div>📞 Telefon: <strong className="text-stone-800">{prov.phone}</strong></div>
                      {prov.website && (
                        <div>🌐 Web: <a href={prov.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{prov.website}</a></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                    {prov.status !== 'approved' && (
                      <button
                        onClick={() => approveProvider(prov.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Szolgáltató Jóváhagyása</span>
                      </button>
                    )}

                    {prov.status !== 'suspended' && (
                      <button
                        onClick={() => suspendProvider(prov.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Letiltás</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: FOGLALÁSOK NYILVÁNTARTÁSA ÉS STÁTUSZFIGYELÉS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Összes foglalás
              </span>
              <div className="text-2xl font-black text-stone-900 font-display mt-1">
                {orders.length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-2xs">
              <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] block">
                Szolgáltatóra vár
              </span>
              <div className="text-2xl font-black text-amber-700 font-display mt-1">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
              <span className="text-emerald-800 font-bold uppercase tracking-wider text-[10px] block">
                Megerősítve
              </span>
              <div className="text-2xl font-black text-emerald-700 font-display mt-1">
                {orders.filter(o => o.status === 'confirmed').length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Platform díjbevétel
              </span>
              <div className="text-2xl font-black text-indigo-700 font-display mt-1">
                {formatPrice(orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + (Number(o.booking_fee) || 0) : sum, 0))} €
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Header with status filters and search */}
            <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-stone-900 text-sm font-display">
                  Foglalási Nyilvántartás & Státuszfigyelő ({orders.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Nyomon követheted az összes beérkezett foglalást és a fizetési/visszaigazolási státuszokat.
                </p>
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    bookingStatusFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Mind ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    bookingStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  Visszaigazolásra vár ({orders.filter(o => o.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter('confirmed')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    bookingStatusFilter === 'confirmed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  Megerősítve ({orders.filter(o => o.status === 'confirmed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter('cancelled')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    bookingStatusFilter === 'cancelled'
                      ? 'bg-stone-600 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Lemondva ({orders.filter(o => o.status === 'cancelled').length})
                </button>
              </div>
            </div>

            {/* Orders list */}
            {(() => {
              const filteredOrders = orders.filter((o) => {
                if (bookingStatusFilter !== 'all' && o.status !== bookingStatusFilter) return false;
                if (bookingSearch.trim()) {
                  const q = bookingSearch.toLowerCase();
                  const matchTitle = (o.program?.title || '').toLowerCase().includes(q);
                  const matchId = o.id.toLowerCase().includes(q);
                  return matchTitle || matchId;
                }
                return true;
              });

              if (filteredOrders.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-600">Nincs a szűrésnek megfelelő foglalás a nyilvántartásban.</p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-stone-100">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-5 hover:bg-stone-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                            #{order.id.slice(0, 10)}
                          </span>
                          <h4 
                            onClick={() => order.program_id && openProgramDetail(order.program_id)}
                            className="font-bold text-stone-900 text-sm hover:text-emerald-700 cursor-pointer transition-colors truncate max-w-md"
                          >
                            {order.program?.title || 'Program'}
                          </h4>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                            'bg-stone-100 text-stone-500'
                          }`}>
                            {order.status === 'confirmed' ? 'Megerősítve (visszaigazolva)' : order.status === 'pending' ? 'Szolgáltatói visszaigazolásra vár' : 'Lemondva'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          <span>{order.participants_count} fő</span>
                          <span>·</span>
                          <span>Teljes: <strong className="text-stone-800">{formatPrice(order.total_price)} {order.currency === 'EUR' ? '€' : order.currency}</strong></span>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Platform kényelmi díj (Stripe fizetve): {formatPlatformFee(order.booking_fee)} €
                          </span>
                          <span>·</span>
                          <span>Helyszínen: <strong className="text-stone-800">{formatPrice(order.onsite_amount)} €</strong></span>
                          {order.onsite_payment_method && (
                            <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                              {order.onsite_payment_method === 'revolut' ? <Wallet className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                              {PAYMENT_METHOD_LABEL[order.onsite_payment_method]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {order.status !== 'cancelled' && (
                          <button
                            onClick={() => setRescheduleOrderId(order.id)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Áthelyezés</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: ÉRTÉKELÉSEK ÉS MODERÁCIÓ */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Moderation Policy Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-display font-bold text-base text-emerald-950">
                  Velem Gyere Értékelési & Moderációs Rendszer
                </h3>
              </div>
              <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
                Kizárólag igazolt vásárlók értékelhetnek a túra lezajlása után. A moderáció biztosítja, hogy személyes adatok, gyűlöletbeszéd vagy alaptalan fenyegetés ne jelenjen meg. A negatív vélemények a szolgáltató kérésére sem törölhetők, ha megfelelnek az irányelveknek.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-emerald-200/60 shadow-xs shrink-0 text-xs">
              <span className="font-bold text-stone-700">Összes vélemény:</span>
              <span className="font-extrabold text-emerald-800 text-sm">{reviews.length} db</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: `Összes (${reviews.length})` },
              { id: 'published', label: `Publikált (${reviews.filter(r => r.status === 'published').length})` },
              { id: 'flagged', label: `Ellenőrizendő (${reviews.filter(r => r.status === 'flagged').length})` },
              { id: 'hidden', label: `Rejtett (${reviews.filter(r => r.status === 'hidden').length})` },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setReviewFilter(btn.id as any)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-colors shrink-0 cursor-pointer ${
                  reviewFilter === btn.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews
              .filter(r => reviewFilter === 'all' || r.status === reviewFilter)
              .map((rev) => {
                const tourDate = rev.tour_date ? new Date(rev.tour_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : rev.tour_date;
                return (
                  <div key={rev.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                    {/* Header: User & Rating & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm sm:text-base">
                            {rev.user_name}
                          </span>
                          {rev.is_verified_buyer && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Igazolt vásárló</span>
                            </span>
                          )}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            rev.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rev.status === 'flagged'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                            {rev.status === 'published' ? '✓ Publikált' : rev.status === 'flagged' ? '⚠️ Ellenőrzésre zászlózva' : 'Rejtett'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1">
                          <span className="font-semibold text-stone-700">{rev.program_title || 'Túra'}</span>
                          <span>•</span>
                          <span>Szolgáltató: <strong className="text-stone-800">{rev.provider_name}</strong></span>
                          <span>•</span>
                          <span>Időpont: {tourDate}</span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-stone-900 font-display">
                          {rev.rating}.0 / 5
                        </span>
                      </div>
                    </div>

                    {/* Sub-ratings */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <span>🧭 Idegenvezető: <strong className="text-stone-800">{rev.rating_guide}/5</strong></span>
                      <span className="text-stone-300">•</span>
                      <span>💰 Ár-érték: <strong className="text-stone-800">{rev.rating_value}/5</strong></span>
                      <span className="text-stone-300">•</span>
                      <span>⏱️ Szervezés: <strong className="text-stone-800">{rev.rating_organization}/5</strong></span>
                      <span className="text-stone-300">•</span>
                      <span>🛡️ Biztonság: <strong className="text-stone-800">{rev.rating_safety}/5</strong></span>
                    </div>

                    {/* Text review */}
                    <div className="space-y-1.5 text-xs sm:text-sm text-stone-700">
                      {rev.title && (
                        <h4 className="font-bold text-stone-900 font-display">
                          „{rev.title}”
                        </h4>
                      )}
                      <p className="leading-relaxed whitespace-pre-line">{rev.comment}</p>
                    </div>

                    {/* Photos if any */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {rev.photos.map((pUrl, pIdx) => (
                          <a key={pIdx} href={pUrl} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 hover:opacity-80 transition-opacity">
                            <img src={pUrl} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Provider response if any */}
                    {rev.provider_response && (
                      <div className="bg-stone-50 border-l-4 border-emerald-600 rounded-r-xl p-3 text-xs space-y-1">
                        <span className="font-bold text-stone-800 block">
                          Túraszervező válasza ({rev.provider_response.responder_name}):
                        </span>
                        <p className="text-stone-600 italic">"{rev.provider_response.response_text}"</p>
                      </div>
                    )}

                    {/* Moderation Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                      <span className="text-[11px] text-stone-400">
                        Foglalási ID: <code className="bg-stone-100 px-1 py-0.5 rounded">{rev.order_id}</code>
                      </span>

                      <div className="flex items-center gap-2">
                        {rev.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => moderateReview(rev.id, 'published')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            ✓ Jóváhagyás & Publikálás
                          </button>
                        )}
                        {rev.status !== 'flagged' && (
                          <button
                            type="button"
                            onClick={() => moderateReview(rev.id, 'flagged')}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ⚠️ Zászlózás ellenőrzésre
                          </button>
                        )}
                        {rev.status !== 'hidden' && (
                          <button
                            type="button"
                            onClick={() => moderateReview(rev.id, 'hidden')}
                            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ✕ Elrejtés (Irányelvsértés)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Véglegesen törlöd ezt az értékelést a Supabase adatbázisból?')) {
                              deleteReview(rev.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Értékelés végleges törlése"
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
      )}

      {/* TAB 5: ÉRDEKLŐDÉSEK */}
      {activeTab === 'inquiries' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
            Összes Beérkezett Érdeklődés ({inquiries.length})
          </div>

          <div className="divide-y divide-stone-100">
            {inquiries.map((inq) => {
              const formattedDate = new Date(inq.created_at).toLocaleString('hu-HU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div key={inq.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {inq.program_title}
                      </span>
                      <span className="text-xs text-stone-500">
                        • Szervező: <strong className="text-stone-700">{inq.provider_name}</strong>
                      </span>
                    </div>

                    <span className="text-xs text-stone-400">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 text-xs space-y-1">
                    <div className="flex flex-wrap gap-4 text-stone-700">
                      <div>👤 Érdeklődő: <strong className="text-stone-900">{inq.name}</strong></div>
                      <div>📧 E-mail: <a href={`mailto:${inq.email}`} className="text-emerald-700 hover:underline font-semibold">{inq.email}</a></div>
                      {inq.phone && <div>📞 Telefon: <strong className="text-stone-900">{inq.phone}</strong></div>}
                    </div>
                    {inq.message && (
                      <div className="text-stone-800 text-sm mt-2 italic pt-2 border-t border-stone-200">
                        "{inq.message}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW REGION */}
      {addRegionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddRegionModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Új Desztináció Rögzítése
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  Új Úticél / Régió Hozzáadása
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateRegionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Ország <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRegionCountry}
                    onChange={(e) => setNewRegionCountry(e.target.value)}
                    placeholder="Pl. Görögország vagy Portugália"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Zászló Emoji
                  </label>
                  <input
                    type="text"
                    value={newRegionEmoji}
                    onChange={(e) => setNewRegionEmoji(e.target.value)}
                    placeholder="Pl. 🇬🇷 vagy 🇵🇹"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Régió / Város neve <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Pl. Kréta vagy Lisszabon"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Rövid leírás / Kiemelt területek
                </label>
                <input
                  type="text"
                  value={newRegionDesc}
                  onChange={(e) => setNewRegionDesc(e.target.value)}
                  placeholder="Pl. Chania, Heraklion, Elafonisi és szurdoktúrák..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Kép URL
                </label>
                <input
                  type="url"
                  value={newRegionImage}
                  onChange={(e) => setNewRegionImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddRegionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Régió Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW SERVICE TYPE / CATEGORY */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddCategoryModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Szolgáltatás Típus
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  Új Szolgáltatás Típus
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Típus megnevezése <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Pl. Helikopteres túra vagy Extrém sport"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Ikon
                </label>
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Compass">🧭 Compass (Iránytű / Kirándulás)</option>
                  <option value="Landmark">🏛️ Landmark (Műemlék / Városnézés)</option>
                  <option value="Car">🚗 Car (Autó / Transzfer)</option>
                  <option value="Ship">🚢 Ship (Hajó / Vízitúra)</option>
                  <option value="Utensils">🍴 Utensils (Gasztro / Étkezés)</option>
                  <option value="Shield">🛡️ Shield (Privát kíséret)</option>
                  <option value="Users">👥 Users (Családi program)</option>
                  <option value="Trees">🌲 Trees (Természet)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Típus Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RescheduleOrderModal
        orderId={rescheduleOrderId}
        onClose={() => setRescheduleOrderId(null)}
      />
    </div>
  );
};
