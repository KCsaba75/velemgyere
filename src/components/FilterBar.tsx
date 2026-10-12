import React from 'react';
import { useApp } from '../context/AppContext';
import { CountryFlag } from './CountryFlag';
import {
  Filter,
  RotateCcw,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  Globe,
  X
} from 'lucide-react';

interface FilterBarProps {
  // Mobile-only filter drawer (kanban e0ee8b7e): the trigger button lives next
  // to the page's own h2 in ProgramList, a sibling component, so the open
  // state is owned by the shared parent page (HomePage/ProgramsPage) and
  // handed down here. Desktop keeps the always-visible inline card below,
  // unaffected by this state.
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    regions,
    selectedRegion,
    setSelectedRegion,
    categories,
    selectedCategory,
    setSelectedCategory,
    selectedDateFrom,
    setSelectedDateFrom,
    selectedDateTo,
    setSelectedDateTo,
    selectedDurationType,
    setSelectedDurationType,
    maxPrice,
    setMaxPrice,
    currencyFilter,
    setCurrencyFilter,
    resetFilters,
  } = useApp();

  const hasActiveFilters = Boolean(
    selectedRegion ||
    selectedCategory ||
    selectedDateFrom ||
    selectedDateTo ||
    selectedDurationType !== 'all' ||
    maxPrice < 150 ||
    currencyFilter !== 'ALL'
  );

  // Same control set rendered both in the desktop inline card and in the
  // mobile drawer (kanban e0ee8b7e) -- one definition, two places it mounts.
  const filterControls = (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Úticél / Régió */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Úticél / Régió</span>
          </label>
          <select
            value={selectedRegion || ''}
            onChange={(e) => setSelectedRegion(e.target.value || null)}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">Összes desztináció</option>
            {regions.filter(r => r.active).map((reg) => (
              <option key={reg.id} value={reg.slug}>
                {reg.flag_emoji ? `${reg.flag_emoji} ` : ''}{reg.country ? `${reg.country} – ` : ''}{reg.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Szolgáltatás típusa */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Szolgáltatás Típusa</span>
          </label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">Összes típus (Kirándulás, Transzfer...)</option>
            {categories.filter(c => c.active).map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Dátumtól */}
        <div className="col-span-1">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dátumtól</span>
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
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        {/* 4. Dátumig */}
        <div className="col-span-1">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dátumig</span>
          </label>
          <input
            type="date"
            value={selectedDateTo}
            min={selectedDateFrom || undefined}
            onChange={(e) => setSelectedDateTo(e.target.value)}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        {/* 5. Időtartam jellege */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Időtartam jellege</span>
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setSelectedDurationType('all')}
              className={`text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedDurationType === 'all'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mind
            </button>
            <button
              onClick={() => setSelectedDurationType('single')}
              className={`text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedDurationType === 'single'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Egynapos
            </button>
            <button
              onClick={() => setSelectedDurationType('multi')}
              className={`text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedDurationType === 'multi'
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Többnapos
            </button>
          </div>
        </div>

        {/* 6. Ár & Pénznem szűrő */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-5 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-sm">
            <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
              <span className="font-bold">Maximális részvételi díj:</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                {maxPrice} EUR / fő
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold text-stone-500">Kiemelt garancia:</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
              <span>Garantált magyar nyelvű vezetés vagy asszisztencia</span>
            </span>
          </div>
        </div>
    </div>
  );

  return (
    <>
      {/* Desktop: full inline card, unchanged. Mobile keeps only the funnel-icon
          trigger next to the page title (in ProgramList) -- kanban e0ee8b7e. */}
      <div className="hidden sm:block bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold font-display text-base sm:text-lg">
            <Filter className="w-5 h-5 text-emerald-600" />
            <span>Szűrés: Külföldi Programok & Transzferek</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Szűrők törlése</span>
            </button>
          )}
        </div>

        {filterControls}
      </div>

      {/* Mobile: filter drawer, opened by the funnel icon next to the page h2. */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onCloseMobile}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-bold font-display text-base">
                <Filter className="w-5 h-5 text-emerald-600" />
                <span>További szűrési lehetőségek</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
                aria-label="Szűrők bezárása"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {filterControls}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Szűrők törlése</span>
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={onCloseMobile}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                Szűrők alkalmazása
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
