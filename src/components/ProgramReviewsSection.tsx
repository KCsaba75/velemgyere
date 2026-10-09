import React, { useState } from 'react';
import { Program, Review, TravelType } from '../types/database';
import { useApp } from '../context/AppContext';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Compass,
  BadgePercent,
  Clock,
  Shield,
  Users,
  Camera,
  ThumbsUp,
  Building2,
  Sparkles,
  Calendar,
  X
} from 'lucide-react';

interface ProgramReviewsSectionProps {
  program: Program;
}

export const ProgramReviewsSection: React.FC<ProgramReviewsSectionProps> = ({ program }) => {
  const {
    getProgramReviews,
    getProgramRatingStats,
    setCurrentView
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | TravelType>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const reviews = getProgramReviews(program.id);
  const stats = getProgramRatingStats(program.id);

  const filteredReviews = reviews.filter(r => {
    if (activeFilter === 'all') return true;
    return r.travel_type === activeFilter;
  });

  // Extract all photos from verified reviews
  const allReviewPhotos = reviews.flatMap(r => r.photos || []);

  const travelTypeBadge = (type: TravelType) => {
    switch (type) {
      case 'couple': return { label: 'Párban utazott', icon: '👫' };
      case 'family': return { label: 'Családdal utazott', icon: '👨‍👩‍👧‍👦' };
      case 'friends': return { label: 'Barátokkal utazott', icon: '👥' };
      case 'solo': return { label: 'Egyedül utazott', icon: '🎒' };
    }
  };

  return (
    <section id="reviews-section" className="scroll-mt-28 border-t border-stone-200 pt-10 mt-12 space-y-8">
      {/* Section Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kizárólag Igazolt Vásárlói Vélemények</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900 tracking-tight">
            Utazói Értékelések & Tapasztalatok
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Minden vélemény valós, a felületünkön lefoglalt és lezajlott program után érkezett.
          </p>
        </div>
      </div>

      {/* Rating Overview Dashboard */}
      <div className="bg-stone-50 rounded-3xl border border-stone-200 p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Score Column */}
          <div className="lg:col-span-4 text-center sm:text-left border-b lg:border-b-0 lg:border-r border-stone-200 pb-6 lg:pb-0 lg:pr-8">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
              <span className="text-5xl sm:text-6xl font-black font-display text-stone-900">
                {reviews.length > 0 ? stats.average.toFixed(1) : '5.0'}
              </span>
              <div>
                <div className="flex text-amber-400 text-xl">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= Math.round(stats.average)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-stone-600 block mt-1">
                  {stats.count} ellenőrzött értékelés alapján
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full mt-2">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Az utazók {stats.recommendPercent}%-a ajánlja ezt a programot</span>
            </div>
          </div>

          {/* Sub-criteria 4 Category Scores */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guide */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Idegenvezető / Sofőr</h4>
                  <p className="text-[11px] text-stone-500">Szakértelem és felkészültség</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-stone-900 font-display">
                  {stats.breakdown.guide.toFixed(1)}
                </span>
                <span className="text-[10px] text-stone-400 block">/ 5.0</span>
              </div>
            </div>

            {/* Value for money */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Ár-érték arány</h4>
                  <p className="text-[11px] text-stone-500">Megérte a kifizetett összeget</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-stone-900 font-display">
                  {stats.breakdown.value.toFixed(1)}
                </span>
                <span className="text-[10px] text-stone-400 block">/ 5.0</span>
              </div>
            </div>

            {/* Organization */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Szervezés & Menetrend</h4>
                  <p className="text-[11px] text-stone-500">Pontosság és gördülékenység</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-stone-900 font-display">
                  {stats.breakdown.organization.toFixed(1)}
                </span>
                <span className="text-[10px] text-stone-400 block">/ 5.0</span>
              </div>
            </div>

            {/* Safety & Cleanliness */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Biztonság & Minőség</h4>
                  <p className="text-[11px] text-stone-500">Jármű állapota, kényelem</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-stone-900 font-display">
                  {stats.breakdown.safety.toFixed(1)}
                </span>
                <span className="text-[10px] text-stone-400 block">/ 5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Photos Gallery */}
      {allReviewPhotos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Utazók által készített fotók ({allReviewPhotos.length})</span>
          </h3>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {allReviewPhotos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhoto(url)}
                className="relative w-28 sm:w-32 aspect-square rounded-2xl overflow-hidden shrink-0 border border-stone-200 hover:scale-105 transition-transform duration-300 shadow-xs cursor-pointer group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  🔍 Nagyítás
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Travel Type Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="font-bold text-stone-500 uppercase tracking-wider text-[11px] mr-1 shrink-0">
          Szűrés utazás szerint:
        </span>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            activeFilter === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          Összes ({reviews.length})
        </button>
        <button
          onClick={() => setActiveFilter('couple')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            activeFilter === 'couple'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          👫 Párban ({reviews.filter(r => r.travel_type === 'couple').length})
        </button>
        <button
          onClick={() => setActiveFilter('family')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            activeFilter === 'family'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          👨‍👩‍👧‍👦 Családdal ({reviews.filter(r => r.travel_type === 'family').length})
        </button>
        <button
          onClick={() => setActiveFilter('friends')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            activeFilter === 'friends'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          👥 Barátokkal ({reviews.filter(r => r.travel_type === 'friends').length})
        </button>
        <button
          onClick={() => setActiveFilter('solo')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            activeFilter === 'solo'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          🎒 Egyedül ({reviews.filter(r => r.travel_type === 'solo').length})
        </button>
      </div>

      {/* Review Cards List */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-stone-400 mx-auto" />
            <p className="font-bold text-stone-700 text-sm">
              Ebben a kategóriában még nincs külön értékelés.
            </p>
            <p className="text-xs text-stone-500">
              Válassz másik szűrőt vagy tekintsd meg az összes véleményt.
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const badge = travelTypeBadge(rev.travel_type);
            return (
              <div
                key={rev.id}
                className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow duration-200 space-y-4"
              >
                {/* Reviewer Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                      {rev.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900 text-sm sm:text-base">
                          {rev.user_name}
                        </h4>
                        {rev.is_verified_buyer && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Igazolt résztvevő</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span>{badge.icon} {badge.label}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Részvétel: {rev.tour_date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-800 font-display">
                      {rev.rating}.0
                    </span>
                  </div>
                </div>

                {/* Sub-ratings Badges */}
                <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span>🧭 Vezetés:</span> <strong className="text-emerald-700 font-bold">{rev.rating_guide}/5</strong>
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span>💰 Ár-érték:</span> <strong className="text-teal-700 font-bold">{rev.rating_value}/5</strong>
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span>⏱️ Szervezés:</span> <strong className="text-sky-700 font-bold">{rev.rating_organization}/5</strong>
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span>🛡️ Biztonság:</span> <strong className="text-amber-700 font-bold">{rev.rating_safety}/5</strong>
                  </span>
                </div>

                {/* Title & Comment */}
                <div className="space-y-2">
                  {rev.title && (
                    <h5 className="font-bold text-base text-stone-900 font-display">
                      „{rev.title}”
                    </h5>
                  )}
                  <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Extra positive or improvement notes */}
                {(rev.positive_feedback || rev.improvement_feedback) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {rev.positive_feedback && (
                      <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-emerald-900">
                        <span className="font-bold block mb-0.5">👍 Kiemelt pozitívum:</span>
                        <span>{rev.positive_feedback}</span>
                      </div>
                    )}
                    {rev.improvement_feedback && (
                      <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl text-amber-900">
                        <span className="font-bold block mb-0.5">💡 Észrevétel:</span>
                        <span>{rev.improvement_feedback}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Attached traveler photos */}
                {rev.photos && rev.photos.length > 0 && (
                  <div className="flex gap-2.5 pt-2">
                    {rev.photos.map((url, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setSelectedPhoto(url)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-stone-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Public Provider Response if exists */}
                {rev.provider_response && (
                  <div className="mt-4 bg-stone-50 border-l-4 border-emerald-600 rounded-r-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>A helyi túraszervező válasza:</span>
                        <span className="text-emerald-700 font-semibold">
                          ({rev.provider_response.responder_name || program.provider?.company_name || 'Szolgáltató'})
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {rev.provider_response.responded_at ? rev.provider_response.responded_at.split('T')[0] : ''}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic">
                      "{rev.provider_response.response_text}"
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Image Lightbox Modal */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto} 
              alt="Utazói fénykép" 
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};
