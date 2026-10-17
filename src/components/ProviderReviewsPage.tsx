import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Star,
  ShieldCheck,
  MessageSquare,
  Building2,
  Calendar,
  Briefcase,
  Send,
  AlertTriangle
} from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 5a3a8dd8 (Csaba, 10-17 masodik pontositas): az Ertekelesek fulnek
// sosem volt tenyleges render-blokkja a ProviderDashboard-ban (lasd git
// 1225be4, 01ad43b) -- most onallo top-level oldalkent, nem bujhat tovabb
// egy tobbfules oldal mogott, ezert itt a tenyleges listat + a context-ben
// mar meglevo, de eddig sehonnan nem hivott respondToReview-t is bekotjuk.
export const ProviderReviewsPage: React.FC = () => {
  const {
    currentUser,
    currentProvider,
    reviews,
    programs,
    respondToReview,
    getProviderRatingStats,
    setCurrentView,
  } = useApp();

  useDocumentMeta('Értékeléseim -- Szolgáltatói Dashboard', 'A programjaidra érkezett vásárlói értékelések és válaszaid.');

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorByReview, setErrorByReview] = useState<Record<string, string>>({});

  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;
  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const ownProgramSlugs = new Set(displayPrograms.map(p => p.slug));

  const providerReviews = [...reviews]
    .filter(r =>
      ownProgramIds.has(r.program_id) ||
      ownProgramSlugs.has(r.program_id) ||
      (currentProvider && r.provider_id === currentProvider.id)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = getProviderRatingStats(currentProvider?.id);

  const programTitleFor = (programId: string) =>
    displayPrograms.find(p => p.id === programId || p.slug === programId)?.title || 'Program';

  const startResponding = (reviewId: string) => {
    setRespondingId(reviewId);
    setResponseText('');
    setErrorByReview(prev => ({ ...prev, [reviewId]: '' }));
  };

  const cancelResponding = () => {
    setRespondingId(null);
    setResponseText('');
  };

  const submitResponse = async (reviewId: string) => {
    setSubmittingId(reviewId);
    try {
      const result = await respondToReview(reviewId, responseText);
      if (result.success) {
        setRespondingId(null);
        setResponseText('');
        setErrorByReview(prev => ({ ...prev, [reviewId]: '' }));
      } else {
        setErrorByReview(prev => ({ ...prev, [reviewId]: result.message }));
      }
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Értékeléseim
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Nézd át a vásárlói visszajelzéseket, és válaszolj rájuk nyilvánosan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('provider-dashboard')}
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
          title="Vissza a Partner fiókhoz"
        >
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
          <span className="truncate">Partner fiók</span>
        </button>
      </div>

      {/* Rating Overview */}
      <div className="bg-stone-50 rounded-3xl border border-stone-200 p-5 sm:p-6 mb-6 flex items-center gap-3.5">
        <span className="text-3xl sm:text-4xl font-black font-display text-stone-900 leading-none">
          {stats.count > 0 ? stats.average.toFixed(1) : '5.0'}
        </span>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= Math.round(stats.average) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-stone-500 mt-0.5">
            {stats.count} publikus, ellenőrzött értékelés alapján
          </span>
        </div>
      </div>

      {providerReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Star className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-800 font-display mb-1">
            Még nincs értékelésed
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Amint egy vásárlód lezárt programod után értékelést ír, itt fog megjelenni, és
            válaszolni is tudsz majd rá.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {providerReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3.5"
            >
              {rev.status !== 'published' && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg w-fit">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {rev.status === 'flagged' ? 'Moderálás alatt -- publikusan még nem látható' : 'Admin elrejtette -- publikusan nem látható'}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                    {rev.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-900 text-sm">{rev.user_name}</h4>
                      {rev.is_verified_buyer && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Igazolt résztvevő</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span className="truncate">{programTitleFor(rev.program_id)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {rev.tour_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 self-start sm:self-auto">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                    />
                  ))}
                  <span className="text-xs font-bold text-stone-800 font-display ml-0.5">{rev.rating}.0</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {rev.title && (
                  <h5 className="font-bold text-sm text-stone-900 font-display">„{rev.title}”</h5>
                )}
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{rev.comment}</p>
              </div>

              {rev.provider_response ? (
                <div className="bg-stone-50 border-l-4 border-emerald-600 rounded-r-2xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span>A válaszod{rev.provider_response.responder_name ? ` (${rev.provider_response.responder_name})` : ''}:</span>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {rev.provider_response.responded_at ? rev.provider_response.responded_at.split('T')[0] : ''}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic">
                    "{rev.provider_response.response_text}"
                  </p>
                </div>
              ) : respondingId === rev.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Köszönd meg a visszajelzést, vagy reagálj röviden, nyilvánosan látható lesz a program alatt..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-none"
                  />
                  {errorByReview[rev.id] && (
                    <p className="text-xs font-semibold text-rose-600">{errorByReview[rev.id]}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => submitResponse(rev.id)}
                      disabled={submittingId === rev.id || !responseText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingId === rev.id ? 'Küldés...' : 'Válasz közzététele'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelResponding}
                      disabled={submittingId === rev.id}
                      className="text-stone-500 hover:text-stone-800 font-semibold px-3 py-2 rounded-xl text-xs cursor-pointer"
                    >
                      Mégsem
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startResponding(rev.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Válasz írása</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
