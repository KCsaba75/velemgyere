import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProgramCard } from './ProgramCard';
import { SearchX, RotateCcw, Globe } from 'lucide-react';

export const ProgramList: React.FC = () => {
  const {
    programs,
    regions,
    currentUser,
    searchQuery,
    selectedRegion,
    selectedCategory,
    selectedLocation,
    selectedDate,
    selectedDurationType,
    maxPrice,
    openProgramDetail,
    resetFilters
  } = useApp();

  // Active region details
  const activeRegionObj = regions.find(r => r.slug === selectedRegion);

  // Filter logic
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // Visibility rule: visitors only see published programs; admin sees all; provider sees published + own
      if (currentUser.role === 'visitor' && p.status !== 'published') {
        return false;
      }
      if (currentUser.role === 'provider' && p.status !== 'published') {
        if (p.provider?.user_id !== currentUser.user_id) {
          return false;
        }
      }

      // Region filter
      if (selectedRegion) {
        if (p.region?.slug !== selectedRegion && p.region_id !== selectedRegion) {
          // also allow matching country or city name
          const matchesName = p.location.toLowerCase().includes(selectedRegion.toLowerCase());
          if (!matchesName) return false;
        }
      }

      // Category / Service type filter
      if (selectedCategory) {
        if (p.category?.slug !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesLoc = p.location.toLowerCase().includes(q);
        const matchesCountry = p.country?.toLowerCase().includes(q);
        // p.description is undefined for anonymous visitors (teaser-only fetch, kanban
        // 71215856 point 4) -- short_description still matches, full description just
        // doesn't contribute to the search for a logged-out visitor.
        const matchesDesc = p.short_description.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchesProvider = p.provider?.company_name.toLowerCase().includes(q);
        const matchesRegion = p.region?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesCountry && !matchesDesc && !matchesProvider && !matchesRegion) {
          return false;
        }
      }

      // Location
      if (selectedLocation) {
        if (!p.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Date
      if (selectedDate) {
        if (p.event_date < selectedDate) {
          return false;
        }
      }

      // Duration type
      if (selectedDurationType === 'single') {
        const isMulti = p.duration.includes('2 nap') || p.duration.includes('3 nap') || p.duration.includes('többnapos');
        if (isMulti) return false;
      } else if (selectedDurationType === 'multi') {
        const isMulti = p.duration.includes('2 nap') || p.duration.includes('3 nap') || p.duration.includes('többnapos');
        if (!isMulti) return false;
      }

      // Max price
      if (p.price > maxPrice) {
        return false;
      }

      return true;
    });
  }, [
    programs,
    currentUser,
    searchQuery,
    selectedRegion,
    selectedCategory,
    selectedLocation,
    selectedDate,
    selectedDurationType,
    maxPrice
  ]);

  return (
    <div id="programs-section" className="scroll-mt-24">
      {/* Header with results count & region indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
              Külföldi Magyar Programkatalógus
            </span>
            {activeRegionObj && (
              <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                <span>{activeRegionObj.flag_emoji}</span>
                <span>Szűkítve: {activeRegionObj.name}</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900 tracking-tight">
            Magyar Nyelvű Kirándulások, Élmények & Transzferek
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Közvetlen kapcsolat helyi magyar idegenvezetőkkel és tapasztalt túraszervezőkkel
          </p>
        </div>

        <div className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
          <span>🇭🇺</span>
          <span>{filteredPrograms.length} magyar nyelvű program</span>
        </div>
      </div>

      {/* Program Cards Grid */}
      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onSelect={openProgramDetail}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-4">
            <SearchX className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 font-display mb-2">
            Nincs találat a megadott szűrési feltételekre
          </h3>
          <p className="text-sm text-stone-500 mb-6">
            Próbáld meg másik úticél vagy szolgáltatási típus kiválasztásával, vagy állítsd vissza az alapértelmezett szűrőket!
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Szűrők visszaállítása</span>
          </button>
        </div>
      )}
    </div>
  );
};
