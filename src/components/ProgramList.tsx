import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProgramCard } from './ProgramCard';
import { CountryFlag } from './CountryFlag';
import { SearchX, RotateCcw, Globe, Filter, MapPin, Calendar, ChevronDown } from 'lucide-react';

interface ProgramListProps {
  // Mobile filter-drawer trigger (kanban e0ee8b7e) -- the open/close state
  // itself lives in the shared parent page (HomePage/ProgramsPage), since
  // FilterBar (the drawer's owner) is a sibling of this component, not a
  // parent.
  onOpenMobileFilters: () => void;
}

export const ProgramList: React.FC<ProgramListProps> = ({ onOpenMobileFilters }) => {
  const {
    programs,
    regions,
    currentUser,
    searchQuery,
    selectedRegion,
    setSelectedRegion,
    selectedCategory,
    selectedLocation,
    selectedDateFrom,
    setSelectedDateFrom,
    selectedDateTo,
    setSelectedDateTo,
    selectedDurationType,
    maxPrice,
    currencyFilter,
    openProgramDetail,
    resetFilters,
    isLoading
  } = useApp();

  // Mirrors FilterBar's own hasActiveFilters -- shows a dot on the mobile
  // funnel icon so a filtered view is visible even with the drawer closed.
  const hasActiveFilters = Boolean(
    selectedRegion ||
    selectedCategory ||
    selectedDateFrom ||
    selectedDateTo ||
    selectedDurationType !== 'all' ||
    maxPrice < 150 ||
    currencyFilter !== 'ALL'
  );

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

      // Date from & to
      if (selectedDateFrom) {
        if (p.event_date < selectedDateFrom) {
          return false;
        }
      }
      if (selectedDateTo) {
        if (p.event_date > selectedDateTo) {
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
    selectedDateFrom,
    selectedDateTo,
    selectedDurationType,
    maxPrice
  ]);

  return (
    <div id="programs-section" className="scroll-mt-24">
      {/* Header with results count & region indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
              Külföldi <span className="hidden sm:inline">Magyar </span>Programkatalógus
            </span>
            {activeRegionObj && (
              <span className="text-[11px] sm:text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <CountryFlag emoji={activeRegionObj.flag_emoji} country={activeRegionObj.country || activeRegionObj.name} size="xs" />
                <span>Szűkítve: {activeRegionObj.name}</span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-3xl font-extrabold font-display text-stone-900 tracking-tight">
              <span className="hidden sm:inline">Magyar Nyelvű </span>Kirándulások, Élmények & Transzferek
            </h2>
          </div>
          <p className="hidden sm:block text-sm text-stone-500 mt-1">
            Közvetlen kapcsolat helyi magyar idegenvezetőkkel és tapasztalt túraszervezőkkel
          </p>
        </div>

        <div className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
          <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
          <span>
            {filteredPrograms.length} <span className="hidden sm:inline">magyar nyelvű </span>program
          </span>
        </div>
      </div>

      {/* Mobile Quick Filter Bar: Hová utazol, Indulás, Érkezés + Tölcsér (további szűrők) */}
      <div className="sm:hidden bg-white p-3 rounded-2xl border border-stone-200 shadow-sm mb-5 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Hová utazol? */}
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedRegion || ''}
              onChange={(e) => setSelectedRegion(e.target.value || null)}
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none truncate"
            >
              <option value="">Hová utazol? (Összes úticél)</option>
              {regions.filter(r => r.active).map((reg) => (
                <option key={reg.id} value={reg.slug}>
                  {reg.flag_emoji ? `${reg.flag_emoji} ` : ''}{reg.country ? `${reg.country} – ` : ''}{reg.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-stone-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Tölcsér gomb (További szűrési lehetőségek) */}
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className={`relative shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              hasActiveFilters
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
            aria-label="További szűrési lehetőségek"
            title="További szűrési lehetőségek"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[11px]">Szűrők</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Indulás & Érkezés */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>Indulás</span>
            </label>
            <input
              type="date"
              value={selectedDateFrom}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDateFrom(val);
                if (selectedDateTo && val && val > selectedDateTo) {
                  setSelectedDateTo('');
                }
              }}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>Érkezés</span>
            </label>
            <input
              type="date"
              value={selectedDateTo}
              min={selectedDateFrom || undefined}
              onChange={(e) => setSelectedDateTo(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Program Cards Grid */}
      {isLoading && programs.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col">
              <div className="aspect-[16/10] bg-stone-200 w-full"></div>
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                  <div className="h-6 bg-stone-200 rounded w-3/4"></div>
                  <div className="h-4 bg-stone-200 rounded w-full"></div>
                </div>
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="h-6 bg-stone-200 rounded w-20"></div>
                  <div className="h-8 bg-stone-200 rounded-xl w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPrograms.length > 0 ? (
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
