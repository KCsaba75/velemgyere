import React from 'react';
import { useApp, getOrderBucket } from '../context/AppContext';
import {
  Briefcase,
  User,
  PlusCircle,
  Heart,
  Search,
  Ticket,
  Compass,
  LayoutGrid,
  Star,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  X
} from 'lucide-react';

import { NotificationBell } from './NotificationBell';
import { BookingDetailModal } from './BookingDetailModal';
import { Order } from '../types/database';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenNewProgram: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenNewProgram
}) => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    currentProvider,
    isAuthenticated,
    totalFavoritesCount,
    orders,
    programs,
    openLoginModal,
    searchQuery,
    setSearchQuery
  } = useApp();

  const isProvider = currentUser.role === 'provider';
  const isAdmin = currentUser.role === 'admin';
  const [selectedNotificationOrder, setSelectedNotificationOrder] = React.useState<Order | null>(null);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kanban 653c7577 (Csaba, teljes admin-nav atszervezes): adminkent nincs
  // tobbe kozos "Admin Vezerlopult" hub -- minden admin-alfunkcio onallo
  // targymenu. Csaba vegso mobil-nav dontese (2026-11-02, Telegram msg 7924)
  // szerint ez 5 FIX gomb, ugyanaz desktopon es mobilon -- a Kategoriak es a
  // Felhasznalok cel egy-egy HUB oldalra mutat, ami BELSO szegmentvaltoval
  // kulonbozteti meg a ket-ket alreszt (AdminCategoriesPage/AdminUsersPage),
  // nem kulon nav-gombbal. Igy nem kell a 6 eredeti celt egy fix 5-oszlopos
  // mobil sorba zsufolni.
  const ADMIN_NAV_ITEMS: ReadonlyArray<{
    view: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { view: 'admin-programs', label: 'Programok', icon: Compass },
    { view: 'admin-categories', label: 'Kategóriák', icon: LayoutGrid },
    { view: 'admin-users', label: 'Felhasználók', icon: Users },
    { view: 'admin-reviews', label: 'Értékelések', icon: Star },
    { view: 'admin-bookings', label: 'Foglalások', icon: Ticket },
  ];

  // Kanban 5a3a8dd8 (Csaba, 10-17 pontositas): providerkent a globalis
  // "Programok"/"Foglalások" nav-elemek a sajat program-kezelesre / beerkezett
  // foglalasokra mutatnak, nem a publikus katalogusra / a sajat (vasarloi)
  // foglalasaimra.
  const handleProgramsNavClick = () => {
    navigateTo(isProvider ? 'provider-programs' : 'programs');
  };

  const handleBookingsClick = () => {
    if (isProvider) {
      navigateTo('provider-bookings');
    } else if (!isAuthenticated) {
      openLoginModal('A foglalásaid megtekintéséhez kérjük jelentkezz be a saját fiókodba!');
    } else {
      navigateTo('bookings');
    }
  };

  // Provider szamara a beerkezett foglalasok darabszama (nem a vasarloi orders.length).
  // Csaba kerese (kanban 23585044): csak az AKTIV (upcoming) foglalasok szamoljanak,
  // a multbeli/lemondott ne duzzasza fel a menu-badge-et.
  const providerOwnProgramIds = isProvider
    ? new Set(
        programs
          .filter(p => p.provider_id === currentProvider?.id || currentUser.role === 'admin')
          .map(p => p.id)
      )
    : null;
  const activeOrders = orders.filter(o => getOrderBucket(o, programs) === 'upcoming');
  const providerOwnOrdersCount = isProvider
    ? activeOrders.filter(o => providerOwnProgramIds!.has(o.program_id) || providerOwnProgramIds!.size === 0).length
    : activeOrders.length;

  const handleAccountClick = () => {
    if (!isAuthenticated) {
      openLoginModal(undefined, 'programs');
    } else if (currentUser.role === 'admin') {
      navigateTo('admin-programs');
    } else if (currentUser.role === 'provider') {
      navigateTo('provider-dashboard');
    } else {
      navigateTo('my-account');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'programs' && currentView !== 'provider-programs') {
      navigateTo(isProvider ? 'provider-programs' : 'programs');
    }
  };

  const isProgramsNavActive = isProvider ? currentView === 'provider-programs' : currentView === 'programs';
  const isBookingsActive = isProvider ? currentView === 'provider-bookings' : currentView === 'bookings';

  // Kanban 5d6bb3d4 (Csaba, via Zora): szolgaltatokent a globalis
  // "Kategoriak"/"Kedvencek" nav-elemek az ertekeleseim / a
  // uzenet-fulre mutatnak, nem a publikus kategoria-bongezore / kedvenc-listara.
  const isCategoriesOrReviewsActive = isProvider ? currentView === 'provider-reviews' : currentView === 'categories';
  const isFavoritesOrMessagesActive = isProvider ? currentView === 'provider-messages' : currentView === 'favorites';

  // Kanban ce0aeeef (Csaba, via Zora): kiemelve, hogy a Foglalasaim/Uzenet
  // gombok sorrendje szolgaltatokent felcserelt legyen a desktop navban
  const desktopBookingsButton = (
    <button
      key="bookings"
      onClick={handleBookingsClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
        isBookingsActive ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
      }`}
    >
      <Ticket className={`w-4 h-4 ${isAuthenticated && providerOwnOrdersCount > 0 ? 'text-emerald-600' : 'text-stone-400'}`} />
      <span>{isProvider ? 'Foglalások' : 'Foglalásaim'}</span>
      {isAuthenticated && providerOwnOrdersCount > 0 && (
        <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
          {providerOwnOrdersCount}
        </span>
      )}
    </button>
  );

  const desktopFavoritesOrMessagesButton = (
    <button
      key="favorites-or-messages"
      onClick={() => navigateTo(isProvider ? 'provider-messages' : 'favorites')}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
        isFavoritesOrMessagesActive
          ? isProvider
            ? 'text-emerald-700 bg-emerald-50/80 font-bold'
            : 'text-rose-700 bg-rose-50/80 font-bold'
          : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
      }`}
    >
      {isProvider ? (
        <MessageSquare className="w-4 h-4 text-stone-400" />
      ) : (
        <Heart className={`w-4 h-4 ${totalFavoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
      )}
      <span>{isProvider ? 'Üzenet' : 'Kedvencek'}</span>
      {!isProvider && totalFavoritesCount > 0 && (
        <span className="bg-rose-500 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
          {totalFavoritesCount}
        </span>
      )}
    </button>
  );

  const mobileBookingsButton = (
    <button
      key="bookings"
      type="button"
      onClick={handleBookingsClick}
      className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
        isBookingsActive
          ? 'text-emerald-700 font-bold'
          : 'text-stone-500 hover:text-stone-800 font-medium'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <Ticket className={`w-5 h-5 transition-transform ${isBookingsActive ? 'scale-110 stroke-[2.4] text-emerald-700' : 'stroke-[1.8]'}`} />
        {isAuthenticated && providerOwnOrdersCount > 0 && (
          <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 min-w-[15px] h-3.5 rounded-full flex items-center justify-center leading-none shadow-xs">
            {providerOwnOrdersCount > 99 ? '99+' : providerOwnOrdersCount}
          </span>
        )}
      </div>
      <span className="text-[11px] leading-tight mt-1 truncate">{isProvider ? 'Foglalások' : 'Foglalásaim'}</span>
    </button>
  );

  const mobileFavoritesOrMessagesButton = (
    <button
      key="favorites-or-messages"
      type="button"
      onClick={() => navigateTo(isProvider ? 'provider-messages' : 'favorites')}
      className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
        isFavoritesOrMessagesActive
          ? isProvider ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'
          : 'text-stone-500 hover:text-stone-800 font-medium'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {isProvider ? (
          <MessageSquare className={`w-5 h-5 transition-transform ${isFavoritesOrMessagesActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
        ) : (
          <Heart
            className={`w-5 h-5 transition-transform ${
              currentView === 'favorites' || totalFavoritesCount > 0
                ? 'fill-rose-500 text-rose-500 scale-105'
                : 'stroke-[1.8]'
            }`}
          />
        )}
        {!isProvider && totalFavoritesCount > 0 && (
          <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-extrabold px-1.5 min-w-[15px] h-3.5 rounded-full flex items-center justify-center leading-none shadow-xs">
            {totalFavoritesCount > 99 ? '99+' : totalFavoritesCount}
          </span>
        )}
      </div>
      <span className="text-[11px] leading-tight mt-1 truncate">{isProvider ? 'Üzenet' : 'Kedvencek'}</span>
    </button>
  );

  const isAccountActive =
    currentUser.role === 'admin'
      ? currentView === 'admin-programs'
      : currentUser.role === 'provider'
      ? currentView === 'provider-dashboard'
      : currentView === 'my-account';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 w-full max-w-full">
        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            {/* Logo */}
            <button
              onClick={() => navigateTo(isAuthenticated ? (isProvider ? 'provider-programs' : 'programs') : 'home')}
              className="flex items-center text-left group cursor-pointer shrink-0"
            >
              <img
                src="/brand/velemgyere-logo-wide-v2.jpg"
                alt="Velem Gyere -- Külföldi programok magyarul"
                className="h-10 sm:h-14 md:h-16 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </button>

            {/* Search bar */}
            <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-xs lg:max-w-md mx-1 sm:mx-3 min-w-0">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés programok közt…"
                  className="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl bg-stone-100 hover:bg-stone-100/80 focus:bg-white text-stone-900 text-xs sm:text-sm border border-stone-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
                    aria-label="Keresőmező törlése"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2 shrink-0">
              {isAdmin ? (
                ADMIN_NAV_ITEMS.map(({ view, label, icon: Icon }) => (
                  <button
                    key={view}
                    onClick={() => navigateTo(view)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      currentView === view ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={handleProgramsNavClick}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isProgramsNavActive ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {isProvider ? 'Programjaim' : 'Programok'}
                  </button>
                  <button
                    onClick={() => navigateTo(isProvider ? 'provider-reviews' : 'categories')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isCategoriesOrReviewsActive ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {isProvider ? 'Értékeléseim' : 'Kategóriák'}
                  </button>
                  {isProvider && desktopBookingsButton}
                  {desktopFavoritesOrMessagesButton}
                  {!isProvider && desktopBookingsButton}
                </>
              )}
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              {/* Értesítési csengő */}
              <NotificationBell onSelectOrder={setSelectedNotificationOrder} />
              {currentUser.role === 'admin' ? (
                // Kanban 653c7577: a korabbi "Admin Vezerlopult" gomb helyett
                // egy kis fogaskerek-ikon -- a Beallitasok/Erdeklodesek/
                // kijelentkezes/tesztadat-reset nem kap sajat targymenut
                // Csaba 6-pontos listajaban, igy nem foglal helyet az 5 fix
                // targymenu-gomb kozott (ADMIN_NAV_ITEMS, lasd feljebb).
                <button
                  onClick={() => navigateTo('admin-settings')}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    currentView === 'admin-settings'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                  }`}
                  title="Admin beállítások, érdeklődések, kijelentkezés"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              ) : currentUser.role === 'provider' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenNewProgram}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    + Új program
                  </button>
                  <button
                    onClick={() => navigateTo('provider-dashboard')}
                    className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Fiókadatok, értékelések, érdeklődések"
                  >
                    <Briefcase className="w-4 h-4 text-emerald-700" />
                    Partner fiók
                  </button>
                </div>
              ) : isAuthenticated ? (
                <button
                  onClick={() => navigateTo('my-account')}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer max-w-[220px]"
                  title={`Profil: ${currentUser.name || currentUser.email}`}
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{currentUser.name || currentUser.email || 'Fiókom'}</span>
                </button>
              ) : (
                <button
                  onClick={() => openLoginModal(undefined, 'programs')}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Belépés / Regisztráció
                </button>
              )}
            </div>

            {/* Mobile Top Header right-side quick action */}
            <div className="flex items-center md:hidden gap-1.5 shrink-0">
              {currentUser.role === 'provider' && (
                <button
                  onClick={onOpenNewProgram}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                  title="Új program feltöltése"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Új</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => navigateTo('admin-settings')}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    currentView === 'admin-settings'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-100'
                  }`}
                  title="Admin beállítások, érdeklődések, kijelentkezés"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              )}
              <NotificationBell onSelectOrder={setSelectedNotificationOrder} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (only on mobile screens) */}
      <nav
        aria-label="Mobil navigáció"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] transform-gpu will-change-transform select-none w-full max-w-full"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-stretch">
          {isAdmin ? (
            ADMIN_NAV_ITEMS.map(({ view, label, icon: Icon }) => {
              const active = currentView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => navigateTo(view)}
                  className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
                    active ? 'text-emerald-700 font-bold' : 'text-stone-500 hover:text-stone-800 font-medium'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  <span className="text-[11px] leading-tight mt-1 truncate">{label}</span>
                </button>
              );
            })
          ) : (
            <>
              {/* 1. Programok */}
              <button
                type="button"
                onClick={handleProgramsNavClick}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
                  isProgramsNavActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-stone-500 hover:text-stone-800 font-medium'
                }`}
              >
                <Compass className={`w-5 h-5 transition-transform ${isProgramsNavActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[11px] leading-tight mt-1 truncate">{isProvider ? 'Programjaim' : 'Programok'}</span>
              </button>

              {/* 2. Kategóriák (szolgáltatóként: Értékeléseim) */}
              <button
                type="button"
                onClick={() => navigateTo(isProvider ? 'provider-reviews' : 'categories')}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
                  isCategoriesOrReviewsActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-stone-500 hover:text-stone-800 font-medium'
                }`}
              >
                {isProvider ? (
                  <Star className={`w-5 h-5 transition-transform ${isCategoriesOrReviewsActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                ) : (
                  <LayoutGrid className={`w-5 h-5 transition-transform ${isCategoriesOrReviewsActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                )}
                <span className="text-[11px] leading-tight mt-1 truncate">{isProvider ? 'Értékeléseim' : 'Kategóriák'}</span>
              </button>

              {/* 3-4. Kedvencek/Foglalások */}
              {isProvider && mobileBookingsButton}
              {mobileFavoritesOrMessagesButton}
              {!isProvider && mobileBookingsButton}

              {/* 5. fiókom */}
              <button
                type="button"
                onClick={handleAccountClick}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
                  isAccountActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-stone-500 hover:text-stone-800 font-medium'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {currentUser.role === 'provider' ? (
                    <Briefcase className={`w-5 h-5 ${isAccountActive ? 'text-emerald-700 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  ) : isAuthenticated ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                      {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <User className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  )}
                </div>
                <span className="text-[11px] leading-tight mt-1 truncate">
                  {currentUser.role === 'provider' ? 'Partner' : 'Fiókom'}
                </span>
              </button>
            </>
          )}
        </div>
      </nav>

      {selectedNotificationOrder && (
        <BookingDetailModal
          order={selectedNotificationOrder}
          onClose={() => setSelectedNotificationOrder(null)}
        />
      )}
    </>
  );
};
