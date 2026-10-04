import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Filter, 
  RotateCcw, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  Layers,
  ChevronDown,
  Globe
} from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    regions,
    selectedRegion,
    setSelectedRegion,
    categories,
    selectedCategory,
    setSelectedCategory,
    selectedDate,
    setSelectedDate,
    selectedDurationType,
    setSelectedDurationType,
    maxPrice,
    setMaxPrice,
    currencyFilter,
    setCurrencyFilter,
    resetFilters,
  } = useApp();

  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = Boolean(
    selectedRegion ||
    selectedCategory ||
    selectedDate ||
    selectedDurationType !== 'all' ||
    maxPrice < 150 ||
    currencyFilter !== 'ALL'
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-stone-900 font-bold font-display text-base sm:text-lg">
          <Filter className="w-5 h-5 text-emerald-600" />
          <span>Szűrés: Külföldi Programok & Transzferek</span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Szűrők törlése</span>
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="sm:hidden text-xs text-stone-600 font-medium px-2 py-1 bg-stone-100 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <span>{expanded ? 'Kevesebb szűrő' : 'Részletes szűrők'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${expanded ? 'block' : 'hidden sm:grid'}`}>
        {/* 1. Úticél / Régió */}
        <div>
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
        <div>
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

        {/* 3. Dátum */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dátumtól</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        {/* 4. Időtartam jellege */}
        <div>
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

        {/* 5. Ár & Pénznem szűrő */}
        <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <span>🇭🇺</span>
              <span>Garantált magyar nyelvű vezetés vagy asszisztencia</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
