import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CategoryIcon } from './CategoryIcon';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ArrowRight, Compass, Globe, Layers } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const { categories, regions, programs } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'regions' | 'services'>('regions');

  useDocumentMeta(
    'Úticélok és szolgáltatás-típusok',
    'Böngéssz régió vagy programtípus szerint a külföldi magyar nyelvű programkatalógusban.'
  );

  const handleSelectRegion = (slug: string) => {
    navigate(`/regiok/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (slug: string) => {
    navigate(`/kategoriak/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-200">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-3">
          <Compass className="w-3.5 h-3.5 text-emerald-600" />
          <span>Böngéssz Úticél vagy Szolgáltatás Típusa szerint</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-3">
          Külföldi Desztinációk & Élménytípusok
        </h1>
        <p className="text-stone-500 text-sm sm:text-base">
          Válaszd ki a tervezett utazásod célállomását vagy a keresett programformátumot!
        </p>
      </div>

      {/* Switcher Tab */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <button
          onClick={() => setTab('regions')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            tab === 'regions'
              ? 'bg-stone-900 text-white shadow-md'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Úticélok / Régiók ({regions.length})</span>
        </button>

        <button
          onClick={() => setTab('services')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            tab === 'services'
              ? 'bg-stone-900 text-white shadow-md'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Szolgáltatás Típusok ({categories.length})</span>
        </button>
      </div>

      {/* REGIONS GRID */}
      {tab === 'regions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.filter(r => r.active).map((reg) => {
            const count = programs.filter(p => (p.region_id === reg.id || p.region?.slug === reg.slug) && p.status === 'published').length;
            return (
              <button
                key={reg.id}
                onClick={() => handleSelectRegion(reg.slug)}
                className="group bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 text-left overflow-hidden cursor-pointer hover:border-emerald-500 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-900">
                  {reg.image_url ? (
                    <img src={reg.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">{reg.flag_emoji || '✈️'}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                    <span className="text-2xl">{reg.flag_emoji}</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                        {reg.country}
                      </span>
                      <h3 className="font-display font-extrabold text-xl text-white">
                        {reg.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
                    {reg.description || 'Magyar nyelvű kirándulások, séták és transzferek.'}
                  </p>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">
                      {count} magyar program
                    </span>
                    <span className="text-stone-400 group-hover:text-emerald-600 flex items-center gap-1 font-semibold">
                      <span>Böngészés</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* SERVICES GRID */}
      {tab === 'services' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.filter(c => c.active).map((cat) => {
            const count = programs.filter(p => p.category?.slug === cat.slug && p.status === 'published').length;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.slug)}
                className="group bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 text-left flex items-start justify-between gap-4 cursor-pointer hover:border-emerald-500 hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white transition-colors flex items-center justify-center shadow-sm">
                    <CategoryIcon icon={cat.icon} className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-xl text-stone-900 group-hover:text-emerald-700 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {count > 0 ? `${count} elérhető program külföldön` : 'Hamarosan elérhető'}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-emerald-50 text-stone-400 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
