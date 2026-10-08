import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, Compass, Sparkles, MapPin, Globe, Car, Ship, Landmark } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { CountryFlag } from './CountryFlag';

export const Hero: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    regions,
    selectedRegion,
    setSelectedRegion,
    categories, 
    selectedCategory, 
    setSelectedCategory,
    setCurrentView 
  } = useApp();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentView('programs');
    const el = document.getElementById('programs-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRegionClick = (regSlug: string) => {
    if (selectedRegion === regSlug) {
      setSelectedRegion(null);
    } else {
      setSelectedRegion(regSlug);
    }
    setCurrentView('programs');
    const el = document.getElementById('programs-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryClick = (catSlug: string) => {
    if (selectedCategory === catSlug) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catSlug);
    }
    setCurrentView('programs');
    const el = document.getElementById('programs-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-950 via-emerald-950/90 to-stone-900 text-white pt-10 pb-18 sm:pt-16 sm:pb-24">
      {/* Background aesthetic decorative elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold mb-6 backdrop-blur-md">
          <CountryFlag emoji="🇭🇺" country="Magyarország" size="sm" />
          <span>100% Magyar Nyelvű Programok & Helyi Szolgáltatók Külföldön</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display mb-4 text-white">
          VELEM GYERE
        </h1>

        {/* Subtitle / Secondary slogan */}
        <p className="text-xl sm:text-2xl lg:text-3xl text-stone-200 font-medium mb-3 max-w-3xl mx-auto font-display">
          Fedezd fel a világot anyanyelveden!
        </p>

        <p className="text-stone-300 text-sm sm:text-base max-w-3xl mx-auto mb-8 leading-relaxed">
          Külföldi magyar idegenvezetők, kirándulásszervezők és megbízható reptéri transzferek egyetlen közös platformon. 
          Kiemelt desztinációk:{' '}
          <strong className="text-white font-semibold">Ciprus • Málta • Spanyolország (Barcelona, Málaga, Mallorca) • Róma • Isztambul</strong>
        </p>

        {/* Large Search Box ("Mit keresel?") */}
        <div className="max-w-3xl mx-auto mb-8">
          <form 
            onSubmit={handleSearchSubmit}
            className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-2xl shadow-black/50 flex flex-col sm:flex-row items-stretch gap-2 border border-stone-200"
          >
            <div className="flex-1 flex items-center px-3 gap-3 min-w-0">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 text-left">
                <label htmlFor="search-input" className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Mit keresel?
                </label>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keress úticélt, várost, kirándulást vagy reptéri transzfert…"
                  className="w-full text-stone-900 placeholder:text-stone-400 text-sm sm:text-base font-medium focus:outline-none bg-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer"
            >
              <span>Keresés</span>
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick Regions / Destinations Bar */}
        <div className="mb-6">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Kiemelt Úticélok</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar sm:flex-wrap sm:justify-center">
            {regions.filter(r => r.active).map((reg) => {
              const isActive = selectedRegion === reg.slug;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleRegionClick(reg.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300'
                      : 'bg-white/10 hover:bg-white/20 text-stone-100 border border-white/10 backdrop-blur-sm'
                  }`}
                >
                  <CountryFlag emoji={reg.flag_emoji} country={reg.country || reg.name} size="sm" />
                  <span>{reg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Service Type Buttons */}
        <div>
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Szolgáltatás Típusa
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar sm:flex-wrap sm:justify-center">
            {categories.filter(c => c.active).map((cat) => {
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white ring-1 ring-emerald-400 font-bold'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  <CategoryIcon icon={cat.icon} className="w-3 h-3 text-emerald-400" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
