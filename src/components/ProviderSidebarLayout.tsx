import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  FileText,
  CalendarRange,
  Users,
  Banknote,
  MessageCircle,
  Settings as SettingsIcon,
  Star,
  MessageSquare,
} from 'lucide-react';

// Kanban 4aac8eda (Csaba, 2026-11-11, kep mellekelve): a korabbi tab-soros/
// gyorslink-kartyas szolgaltatoi navigaciot (Navbar provider-agak +
// ProviderDashboard gyorslink-kartyak) egy allando, bal oldali, sotet temaju
// sidebar valtja fel -- a kep pontosan 7 szekciot mutat ikonnal+alcimmel. A
// Navbar.tsx provider-specifikus nav-elemei es a ProviderDashboard
// gyorslink-kartyai ezert itt kerultek ki (lasd azok kommentjeit).
//
// A kep CSAK a sidebar-t mutatja, nem a teljes oldalt -- a sotet tema itt a
// navigacios sav SAJAT akcense marad, a tartalom-terulet (jobb oldal) a
// meglevo vilagos design-rendszert hasznalja tovabbra is. Ha Csaba a TELJES
// provider-teruletet sotetre akarta volna valtani, az mas/nagyobb feladat
// lenne -- ezt a dontest itt jeleztem a review-ban, nem talalgattam tovabb.
//
// Kiegeszites (Csaba, 2026-11-11 14:38+14:40, Telegram): mobilon a korabbi
// hamburger+drawer-t teljesen lecsereli egy fix also navigacios sav (lasd
// Navbar.tsx PROVIDER_NAV_ITEMS, 5 elem: Fooldal/Programok/Foglalasok/
// Penzugy/Profil) -- a drawer-kod itt torolve, nem csak elrejtve. A sidebar
// 7+2 szekciojabol a Vendegeim/Uzenetek/Ertekeleseim/Erdeklodesek NINCS az
// also savban; ezek eleresenek Csaba szerint az Attekintes oldalon kell
// mennie a drawer helyett -- ezert a ProviderOverviewPage kapott egy
// "Tovabbi menupontok" gyorslink-blokkot ezekre (lasd ott).
export interface ProviderNavItem {
  key: string;
  view: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: ProviderNavItem[] = [
  {
    key: 'overview',
    view: 'provider-overview',
    label: 'Áttekintés',
    subtitle: 'Statisztikák, teendők, legutóbbi események',
    icon: LayoutDashboard,
  },
  {
    key: 'programs',
    view: 'provider-programs',
    label: 'Programjaim',
    subtitle: 'Új program, szerkesztés, árak, képek, elérhetőség',
    icon: FileText,
  },
  {
    key: 'bookings',
    view: 'provider-schedule',
    label: 'Foglalások',
    subtitle: 'Új, visszaigazolt, teljesített, lemondott',
    icon: CalendarRange,
  },
  {
    key: 'guests',
    view: 'provider-guests',
    label: 'Vendégeim',
    subtitle: 'Foglalók, létszám, kapcsolattartási adatok',
    icon: Users,
  },
  {
    key: 'finances',
    view: 'provider-finances',
    label: 'Pénzügyek',
    subtitle: 'Forgalom, jutalék, kifizetések, elszámolások',
    icon: Banknote,
  },
  {
    key: 'messages',
    view: 'provider-messages',
    label: 'Üzenetek',
    subtitle: 'Kapcsolattartás a programvadászokkal',
    icon: MessageCircle,
  },
  {
    key: 'profile',
    view: 'provider-dashboard',
    label: 'Profil és beállítások',
    subtitle: 'Szolgáltatói adatok, nyelv, értesítések, fizetés',
    icon: SettingsIcon,
  },
];

// Nincsenek benne a kep 7 celpontja kozt, de mar kiszervezett, mukodo oldalak
// (kartya 5a3a8dd8) -- a delegalasi brief kifejezetten kerte hogy maradjanak
// elerhetoek a sidebar-bol, csak a kep nem soroltafel oket kulon fo-szekciokent.
// Ezert egy masodlagos, kisebb sulyu blokkban jelennek meg a 7 fo elem alatt.
const SECONDARY_NAV_ITEMS: ReadonlyArray<{
  key: string;
  view: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'reviews', view: 'provider-reviews', label: 'Értékeléseim', icon: Star },
  { key: 'inquiries', view: 'provider-inquiries', label: 'Érdeklődések', icon: MessageSquare },
];

interface SidebarContentProps {
  currentView: string;
  badges: Record<string, number>;
  onNavigate: (view: string) => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ currentView, badges, onNavigate }) => (
  <div className="flex flex-col h-full">
    <div className="px-5 pt-5 pb-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
        Partner felület
      </span>
    </div>

    <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
      {PRIMARY_NAV_ITEMS.map(({ key, view, label, subtitle, icon: Icon }) => {
        const active = currentView === view;
        const badge = badges[key] || 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(view)}
            className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer border ${
              active
                ? 'bg-white/10 border-emerald-400/50 text-white'
                : 'border-transparent text-stone-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-emerald-300' : 'text-stone-300'}`} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={`text-sm font-bold ${active ? 'text-white' : 'text-stone-200'}`}>{label}</span>
                {badge > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shrink-0">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="block text-[11px] text-stone-300 mt-0.5 leading-snug truncate">
                {subtitle}
              </span>
            </span>
          </button>
        );
      })}

      <div className="pt-3 mt-2 border-t border-white/10 space-y-0.5">
        <span className="block px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-300">
          Egyéb
        </span>
        {SECONDARY_NAV_ITEMS.map(({ key, view, label, icon: Icon }) => {
          const active = currentView === view;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(view)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                active ? 'text-emerald-300 font-bold' : 'text-stone-300 hover:text-stone-100 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  </div>
);

export const ProviderSidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentView,
    setCurrentView,
    currentProvider,
    orders,
    programs,
    totalUnreadBookingMessageCount,
  } = useApp();

  const ownProgramIds = new Set(
    programs.filter(p => p.provider_id === currentProvider?.id).map(p => p.id)
  );
  const pendingBookingsCount = orders.filter(
    o => ownProgramIds.has(o.program_id) && o.status === 'pending'
  ).length;

  const badges: Record<string, number> = {
    bookings: pendingBookingsCount,
    messages: totalUnreadBookingMessageCount,
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-0 sm:px-4 lg:px-6">
      <div className="flex flex-col md:flex-row md:gap-6">
        {/* Desktop fixed sidebar -- mobilon a navigaciot a Navbar.tsx fix also
            sava adja (kanban 4aac8eda, 2026-11-11 kiegeszites: a korabbi sajat
            hamburger+drawer torolve, nem csak elrejtve). */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-20 h-[calc(100vh-6rem)] bg-gradient-to-b from-emerald-900 to-stone-900 rounded-3xl border border-emerald-950/60 overflow-hidden shadow-xl">
            <SidebarContent currentView={currentView} badges={badges} onNavigate={handleNavigate} />
          </div>
        </aside>

        {/* Page content */}
        <div className="flex-1 min-w-0 py-4 sm:py-6">{children}</div>
      </div>
    </div>
  );
};
