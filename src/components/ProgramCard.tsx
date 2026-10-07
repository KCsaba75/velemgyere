import React from 'react';
import { Program } from '../types/database';
import { MapPin, Calendar, Clock, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { useApp } from '../context/AppContext';

interface ProgramCardProps {
  program: Program;
  onSelect: (id: string) => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, onSelect }) => {
  // program.price is the NET amount the provider receives -- the catalog shows
  // the buyer-facing TOTAL (net+fee), see kanban 71215856 penzugyi-mukodesi-modell.
  const { computeTotalPrice } = useApp();
  const displayPrice = computeTotalPrice(program.price);

  const coverImage = program.images?.find(img => img.is_cover)?.image_url
    || program.images?.[0]?.image_url 
    || 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80';

  // Format Hungarian date
  const formattedDate = (() => {
    try {
      const d = new Date(program.event_date);
      return d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return program.event_date;
    }
  })();

  const flagEmoji = program.region?.flag_emoji || '✈️';
  const regionName = program.region?.name || program.country || 'Külföld';

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-stone-900">
        <img
          src={coverImage}
          alt={program.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {/* Region / Destination Badge */}
          <div className="bg-white/95 backdrop-blur-md text-stone-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
            <span>{flagEmoji}</span>
            <span>{regionName}</span>
          </div>

          {/* Service Type badge */}
          {program.category && (
            <div className="bg-stone-900/85 backdrop-blur-md text-stone-200 text-xs font-medium px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
              <CategoryIcon icon={program.category.icon} className="w-3 h-3 text-emerald-400" />
              <span>{program.category.name}</span>
            </div>
          )}
        </div>

        {/* Featured badge */}
        {program.featured && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-white" />
            <span>Kiemelt</span>
          </div>
        )}

        {/* Guaranteed Hungarian badge */}
        <div className="absolute bottom-3 left-3 bg-stone-900/90 backdrop-blur-sm text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
          <span>🇭🇺</span>
          <span>{program.language || 'Magyar nyelvű vezetés'}</span>
        </div>

        {/* Price Tag overlay on image */}
        <div className="absolute bottom-3 right-3 bg-emerald-600/95 backdrop-blur-sm text-white px-3 py-1 rounded-xl shadow-lg font-extrabold text-sm sm:text-base">
          {displayPrice.toFixed(2)} {program.currency === 'EUR' ? '€' : program.currency}/fő
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Provider name */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-700 truncate">{program.provider?.company_name || 'Helyi magyar szolgáltató'}</span>
          </div>

          {/* Program Title */}
          <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900 mb-3 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
            {program.title}
          </h3>

          {/* Meta details list */}
          <div className="space-y-1.5 text-xs sm:text-sm text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span className="font-medium text-stone-800 truncate">{program.location}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span className="text-stone-700">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base">⏱</span>
              <span className="text-stone-700">{program.duration}</span>
            </div>

            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <span className="text-base">💰</span>
              <span>{displayPrice.toFixed(2)} {program.currency === 'EUR' ? '€' : program.currency} / fő</span>
            </div>
          </div>
        </div>

        {/* Card CTA button */}
        <button
          onClick={() => onSelect(program.id)}
          className="w-full mt-2 bg-stone-900 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer group-hover:bg-emerald-600"
        >
          <span>Részletek & Érdeklődés</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
