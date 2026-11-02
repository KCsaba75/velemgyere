import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Star, Trash2 } from 'lucide-react';
import { FilterPillBar } from './FilterPillBar';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): az Ertekelesek
// moderacios rendszere kikerult a kozos Admin Vezerlopult fulsorabol a
// sajat "Ertekelesek" targymenuje ala, onallo top-level oldalra.
export const AdminReviewsPage: React.FC = () => {
  const { reviews, moderateReview, deleteReview } = useApp();

  useDocumentMeta('Értékelések -- Admin', 'Beérkezett vásárlói értékelések moderálása (publikálás, zászlózás, elrejtés).');

  const [reviewFilter, setReviewFilter] = useState<'all' | 'published' | 'flagged' | 'hidden'>('all');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200 space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Értékelések
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Vásárlói értékelések moderálása: jóváhagyás & publikálás, zászlózás, elrejtés, végleges törlés.
        </p>
      </div>

      {/* Moderation Policy Notice */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-display font-bold text-base text-emerald-950">
              Velem Gyere Értékelési & Moderációs Rendszer
            </h3>
          </div>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            Kizárólag igazolt vásárlók értékelhetnek a túra lezajlása után. A moderáció biztosítja, hogy személyes adatok, gyűlöletbeszéd vagy alaptalan fenyegetés ne jelenjen meg. A negatív vélemények a szolgáltató kérésére sem törölhetők, ha megfelelnek az irányelveknek.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-emerald-200/60 shadow-xs shrink-0 text-xs">
          <span className="font-bold text-stone-700">Összes vélemény:</span>
          <span className="font-extrabold text-emerald-800 text-sm">{reviews.length} db</span>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterPillBar
        options={[
          { id: 'all', label: `Összes (${reviews.length})` },
          { id: 'published', label: `Publikált (${reviews.filter(r => r.status === 'published').length})` },
          { id: 'flagged', label: `Ellenőrizendő (${reviews.filter(r => r.status === 'flagged').length})` },
          { id: 'hidden', label: `Rejtett (${reviews.filter(r => r.status === 'hidden').length})` },
        ]}
        value={reviewFilter}
        onChange={(id) => setReviewFilter(id as any)}
      />

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews
          .filter(r => reviewFilter === 'all' || r.status === reviewFilter)
          .map((rev) => {
            const tourDate = rev.tour_date ? new Date(rev.tour_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : rev.tour_date;
            return (
              <div key={rev.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                {/* Header: User & Rating & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm sm:text-base">
                        {rev.user_name}
                      </span>
                      {rev.is_verified_buyer && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Igazolt vásárló</span>
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        rev.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rev.status === 'flagged'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {rev.status === 'published' ? '✓ Publikált' : rev.status === 'flagged' ? '⚠️ Ellenőrzésre zászlózva' : 'Rejtett'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1">
                      <span className="font-semibold text-stone-700">{rev.program_title || 'Túra'}</span>
                      <span>•</span>
                      <span>Szolgáltató: <strong className="text-stone-800">{rev.provider_name}</strong></span>
                      <span>•</span>
                      <span>Időpont: {tourDate}</span>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-900 font-display">
                      {rev.rating}.0 / 5
                    </span>
                  </div>
                </div>

                {/* Sub-ratings */}
                <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span>🧭 Idegenvezető: <strong className="text-stone-800">{rev.rating_guide}/5</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>💰 Ár-érték: <strong className="text-stone-800">{rev.rating_value}/5</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>⏱️ Szervezés: <strong className="text-stone-800">{rev.rating_organization}/5</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>🛡️ Biztonság: <strong className="text-stone-800">{rev.rating_safety}/5</strong></span>
                </div>

                {/* Text review */}
                <div className="space-y-1.5 text-xs sm:text-sm text-stone-700">
                  {rev.title && (
                    <h4 className="font-bold text-stone-900 font-display">
                      „{rev.title}”
                    </h4>
                  )}
                  <p className="leading-relaxed whitespace-pre-line">{rev.comment}</p>
                </div>

                {/* Photos if any */}
                {rev.photos && rev.photos.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {rev.photos.map((pUrl, pIdx) => (
                      <a key={pIdx} href={pUrl} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 hover:opacity-80 transition-opacity">
                        <img src={pUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Provider response if any */}
                {rev.provider_response && (
                  <div className="bg-stone-50 border-l-4 border-emerald-600 rounded-r-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-stone-800 block">
                      Túraszervező válasza ({rev.provider_response.responder_name}):
                    </span>
                    <p className="text-stone-600 italic">"{rev.provider_response.response_text}"</p>
                  </div>
                )}

                {/* Moderation Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                  <span className="text-[11px] text-stone-400">
                    Foglalási ID: <code className="bg-stone-100 px-1 py-0.5 rounded">{rev.order_id}</code>
                  </span>

                  <div className="flex items-center gap-2">
                    {rev.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => moderateReview(rev.id, 'published')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✓ Jóváhagyás & Publikálás
                      </button>
                    )}
                    {rev.status !== 'flagged' && (
                      <button
                        type="button"
                        onClick={() => moderateReview(rev.id, 'flagged')}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        ⚠️ Zászlózás ellenőrzésre
                      </button>
                    )}
                    {rev.status !== 'hidden' && (
                      <button
                        type="button"
                        onClick={() => moderateReview(rev.id, 'hidden')}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        ✕ Elrejtés (Irányelvsértés)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Véglegesen törlöd ezt az értékelést a Supabase adatbázisból?')) {
                          deleteReview(rev.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Értékelés végleges törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
