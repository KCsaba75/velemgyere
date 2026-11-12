import React from 'react';
import { useApp, getOrderBucket } from '../context/AppContext';
import {
  LayoutDashboard,
  FileText,
  CalendarRange,
  Star,
  MessageCircle,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Ticket,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 4aac8eda (Csaba, 2026-11-11): az uj sidebar elso ("Attekintes")
// szekcioja -- a kep szerint "Statisztikak, teendok, legutobbi esemenyek".
// Korabban nem volt ilyen osszegzo oldal: a "Iranyitopult" (provider-schedule)
// egy program-utemezo naptar, nem statisztikai hub, ezert ez teljesen uj
// komponens, meglevo adatokbol (orders/programs/reviews/uzenetek) szamolva.
//
// Kiegeszites (Csaba, 2026-11-11 14:38+14:40 Telegram): a mobil also navigacios
// sav csak 5 fix elemet kap (Fooldal/Programok/Foglalasok/Penzugy/Profil), a
// korabbi hamburger+drawer pedig torolve (nem csak elrejtve, lasd
// ProviderSidebarLayout.tsx). Igy a Vendegeim/Uzenetek/Ertekeleseim/
// Erdeklodesek szekcioknak mobilon NEM lenne semmilyen eleresi utjuk -- Csaba
// kifejezetten az Attekintes oldalt jelolte ki ezek helyeként, ezert az alabbi
// "Tovabbi menupontok" blokk adja a navigaciot hozzajuk (desktopon redundans
// a sidebarral, de nem zavaro, es konzisztens mindket nezetben).
function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'most';
  if (diffMin < 60) return `${diffMin} perce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} órája`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} napja`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} hónapja`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} éve`;
}

export const ProviderOverviewPage: React.FC = () => {
  const {
    currentProvider,
    programs,
    orders,
    reviews,
    getProviderRatingStats,
    totalUnreadBookingMessageCount,
    setCurrentView,
  } = useApp();

  useDocumentMeta('Áttekintés -- Szolgáltatói Dashboard', 'Statisztikák, teendők és legutóbbi események egy helyen.');

  const ownPrograms = programs.filter(p => p.provider_id === currentProvider?.id);
  const ownProgramIds = new Set(ownPrograms.map(p => p.id));
  const ownProgramSlugs = new Set(ownPrograms.map(p => p.slug));
  const ownOrders = orders.filter(o => ownProgramIds.has(o.program_id));
  const ownReviews = reviews.filter(
    r => ownProgramIds.has(r.program_id) || ownProgramSlugs.has(r.program_id) || (currentProvider && r.provider_id === currentProvider.id)
  );

  const publishedProgramsCount = ownPrograms.filter(p => p.status === 'published').length;
  const pendingOrdersCount = ownOrders.filter(o => o.status === 'pending').length;
  const upcomingOrdersCount = ownOrders.filter(o => getOrderBucket(o, programs) === 'upcoming').length;
  const ratingStats = getProviderRatingStats(currentProvider?.id);

  const todos: Array<{ key: string; text: string; icon: React.ComponentType<{ className?: string }>; view: string }> = [];
  if (pendingOrdersCount > 0) {
    todos.push({
      key: 'pending-orders',
      text: `${pendingOrdersCount} foglalás visszaigazolásra vár.`,
      icon: AlertCircle,
      view: 'provider-schedule',
    });
  }
  if (totalUnreadBookingMessageCount > 0) {
    todos.push({
      key: 'unread-messages',
      text: `${totalUnreadBookingMessageCount} olvasatlan üzeneted van.`,
      icon: MessageCircle,
      view: 'provider-messages',
    });
  }
  if (publishedProgramsCount === 0) {
    todos.push({
      key: 'no-programs',
      text: 'Még nincs publikált programod. Tölts fel egyet, hogy látszódj a katalógusban!',
      icon: FileText,
      view: 'provider-programs',
    });
  }

  type FeedItem = { key: string; date: string; text: string; icon: React.ComponentType<{ className?: string }>; view: string };
  const orderFeed: FeedItem[] = [...ownOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(o => {
      const program = ownPrograms.find(p => p.id === o.program_id || p.slug === o.program_id);
      return {
        key: `order-${o.id}`,
        date: o.created_at,
        text: `Új foglalás${program ? ` -- ${program.title}` : ''} (${o.participants_count} fő).`,
        icon: Ticket,
        view: 'provider-schedule',
      };
    });
  const reviewFeed: FeedItem[] = [...ownReviews]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(r => ({
      key: `review-${r.id}`,
      date: r.created_at,
      text: `Új ${r.rating}★ értékelés érkezett.`,
      icon: Star,
      view: 'provider-reviews',
    }));
  const recentEvents = [...orderFeed, ...reviewFeed]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          <span>Áttekintés</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Statisztikák, teendők és legutóbbi események egy helyen.
        </p>
      </div>

      {/* Stat tiles -- Csaba kerese (kanban 004455ac): kattinthatok, a relevans lapra
          navigalnak, hover+focus-jelzessel billentyuzet-elerheteosegre is. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setCurrentView('provider-programs')}
          className="text-left bg-white rounded-2xl border border-stone-200 shadow-xs p-4 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            Publikált programok
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{publishedProgramsCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('provider-schedule')}
          className="text-left bg-white rounded-2xl border border-stone-200 shadow-xs p-4 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <CalendarRange className="w-4 h-4 text-emerald-600" />
            Aktív foglalások
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{upcomingOrdersCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('provider-reviews')}
          className="text-left bg-white rounded-2xl border border-stone-200 shadow-xs p-4 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Átlagértékelés
          </div>
          <div className="text-2xl font-extrabold text-stone-900">
            {ratingStats.average ? ratingStats.average.toFixed(1) : '-'}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('provider-messages')}
          className="text-left bg-white rounded-2xl border border-stone-200 shadow-xs p-4 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Olvasatlan üzenet
          </div>
          <div className="text-2xl font-extrabold text-stone-900">{totalUnreadBookingMessageCount}</div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Todos */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6">
          <h3 className="text-base font-bold text-stone-900 font-display mb-3">Teendőid</h3>
          {todos.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
              <PartyPopper className="w-5 h-5 text-emerald-500" />
              <span>Nincs sürgős teendőd.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map(({ key, text, icon: Icon, view }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCurrentView(view)}
                  className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 transition-colors cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-stone-700 flex-1">{text}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6">
          <h3 className="text-base font-bold text-stone-900 font-display mb-3">Legutóbbi események</h3>
          {recentEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
              <CheckCircle2 className="w-5 h-5 text-stone-300" />
              <span>Még nincs esemény.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(({ key, text, icon: Icon, view, date }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCurrentView(view)}
                  className="w-full flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-stone-700 flex-1">{text}</span>
                  <span className="text-[11px] text-stone-400 shrink-0">{formatRelative(date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tovabbi menupontok -- lasd a fenti kiegeszito komment, ezek nincsenek
          a mobil also navigacios savban, ide kerultek helyette. */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6">
        <h3 className="text-base font-bold text-stone-900 font-display mb-3">További menüpontok</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { key: 'guests', label: 'Vendégeim', icon: Users, view: 'provider-guests' },
            { key: 'messages', label: 'Üzenetek', icon: MessageCircle, view: 'provider-messages' },
            { key: 'reviews', label: 'Értékeléseim', icon: Star, view: 'provider-reviews' },
            { key: 'inquiries', label: 'Érdeklődések', icon: MessageSquare, view: 'provider-inquiries' },
          ].map(({ key, label, icon: Icon, view }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCurrentView(view)}
              className="flex flex-col items-center gap-1.5 text-center px-3 py-3.5 rounded-2xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer"
            >
              <Icon className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-stone-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
