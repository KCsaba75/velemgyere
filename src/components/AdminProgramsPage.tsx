import React, { useState } from 'react';
import { useApp, formatAmount } from '../context/AppContext';
import { Check, X, Sparkles, Archive, Eye, Trash2 } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import { FilterPillBar } from './FilterPillBar';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): a Programkezeles
// (jovahagyas/elutasitas/archivalas/torles/kiemeles) kikerult a kozos Admin
// Vezerlopult fulsorabol a sajat "Programok" targymenuje ala, onallo
// top-level oldalra -- ugyanaz a mintazat, mint korabban az
// AdminCategoriesPage/AdminProvidersPage kivalasa (fb32ec4b, 5a3a8dd8).
export const AdminProgramsPage: React.FC = () => {
  const {
    programs,
    approveProgram,
    rejectProgram,
    archiveProgram,
    toggleFeaturedProgram,
    openProgramDetail,
    deleteProgram,
  } = useApp();

  useDocumentMeta('Programkezelés -- Admin', 'Beküldött külföldi programok jóváhagyása, elutasítása, archiválása és kiemelése.');

  const [programFilter, setProgramFilter] = useState<string>('all');

  const totalPrograms = programs.length;
  const activePrograms = programs.filter(p => p.status === 'published').length;
  const pendingPrograms = programs.filter(p => p.status === 'pending_review').length;

  const filteredPrograms = programs.filter(p => {
    if (programFilter === 'all') return true;
    return p.status === programFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Programok
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Beküldött külföldi programok jóváhagyása, elutasítása, archiválása, kiemelése és törlése.
        </p>
      </div>

      {/* KPI summary -- a korabbi admin-hub osszesito karti sorabol a programokra
          vonatkozo harom szam, mert operativ kontextust ad ennek a listanak. */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
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
      </div>

      <div className="space-y-4">
        <FilterPillBar
          options={[
            { id: 'all', label: 'Összes külföldi program' },
            { id: 'pending_review', label: 'Jóváhagyásra vár (Pending)' },
            { id: 'published', label: 'Publikált (Aktív)' },
            { id: 'draft', label: 'Piszkozat (Draft)' },
            { id: 'rejected', label: 'Elutasított' },
            { id: 'archived', label: 'Archivált' },
          ]}
          value={programFilter}
          onChange={setProgramFilter}
        />

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-stone-100">
            {filteredPrograms.map((prog) => {
              const cover = prog.images?.find(i => i.is_cover)?.image_url || prog.images?.[0]?.image_url;
              return (
                <div key={prog.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden bg-stone-900 shrink-0 border border-stone-200">
                      {cover && <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />}
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
                          💰 {formatAmount(prog.price, prog.currency)} {prog.currency === 'EUR' ? '€' : prog.currency}{prog.pricing_mode === 'tiered' ? '/túra-tól' : '/fő'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-0 border-stone-100 flex flex-wrap items-center gap-2">
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
    </div>
  );
};
