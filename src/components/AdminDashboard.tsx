import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  Tag
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { Region, Category } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Settings as SettingsIcon } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    programs,
    providers,
    inquiries,
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
    currentBookingFee,
    updateBookingFee
  } = useApp();

  useDocumentMeta('Adminisztrátori felület', 'Programok, szolgáltatók és katalógus-adatok kezelése.');

  const [activeTab, setActiveTab] = useState<'programs' | 'providers' | 'regions' | 'categories' | 'inquiries' | 'settings'>('programs');

  // Booking fee editor (Csaba 2026-10-07): local draft input, only written on save.
  const [bookingFeeDraft, setBookingFeeDraft] = useState(String(currentBookingFee));
  const [bookingFeeSaving, setBookingFeeSaving] = useState(false);
  const [bookingFeeSaved, setBookingFeeSaved] = useState(false);

  const handleSaveBookingFee = async () => {
    const value = Number(bookingFeeDraft);
    if (Number.isNaN(value) || value < 0) return;
    setBookingFeeSaving(true);
    try {
      await updateBookingFee(value);
      setBookingFeeSaved(true);
      setTimeout(() => setBookingFeeSaved(false), 2500);
    } finally {
      setBookingFeeSaving(false);
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

      {/* TAB: BEÁLLÍTÁSOK (Csaba 2026-10-07: admin-állítható foglalási díj) */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-lg space-y-4">
          <h3 className="font-display font-bold text-stone-900 text-lg">Foglalási díj</h3>
          <p className="text-sm text-stone-600">
            Elolegszerű összeg, amit egy látogató a helyfoglaláskor fizet, a program teljes árától elkülönülve.
            Regisztrációkor ezzel a mindenkori összeggel egyező ajándék-kredit kerül a visitor fiókjába --
            a már kiadott kreditek és meglévő foglalások nem változnak utólag, ha itt módosítod az értéket.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step="0.01"
              value={bookingFeeDraft}
              onChange={(e) => setBookingFeeDraft(e.target.value)}
              className="w-32 text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-sm text-stone-500">€</span>
            <button
              onClick={handleSaveBookingFee}
              disabled={bookingFeeSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60"
            >
              {bookingFeeSaving ? 'Mentés...' : 'Mentés'}
            </button>
            {bookingFeeSaved && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mentve
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400">
            Jelenlegi érték élesben: {currentBookingFee.toFixed(2)} €
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
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800">
                              {prog.region.flag_emoji} {prog.region.name}
                            </span>
                          )}

                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            🇭🇺 {prog.language || 'Magyar nyelvű'}
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
                            💰 {prog.price} {prog.currency === 'EUR' ? '€' : prog.currency}/fő
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
                      <span className="text-2xl">{reg.flag_emoji || '✈️'}</span>
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
    </div>
  );
};
