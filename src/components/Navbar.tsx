import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Briefcase,
  User,
  LogOut,
  PlusCircle,
  Heart,
  Search,
  Ticket,
  Compass,
  LayoutGrid,
  X
} from 'lucide-react';

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
    isAuthenticated,
    totalFavoritesCount,
    orders,
    openLoginModal,
    logout,
    searchQuery,
    setSearchQuery
  } = useApp();

  const navigateTo = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingsClick = () => {
    if (!isAuthenticated) {
      openLoginModal('A foglalásaid megtekintéséhez kérjük jelentkezz be a saját fiókodba!');
    } else {
      navigateTo('my-account');
    }
  };

  const handleAccountClick = () => {
    if (!isAuthenticated) {
      onOpenLogin();
    } else if (currentUser.role === 'admin') {
      navigateTo('admin-dashboard');
    } else if (currentUser.role === 'provider') {
      navigateTo('provider-dashboard');
    } else {
      navigateTo('my-account');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'programs') {
      navigateTo('programs');
    }
  };

  const isBookingsActive = currentView === 'my-account' && (currentUser.role === 'visitor' || !isAuthenticated);
  const isAccountActive =
    currentUser.role === 'admin'
      ? currentView === 'admin-dashboard'
      : currentUser.role === 'provider'
      ? currentView === 'provider-dashboard'
      : currentView === 'my-account';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            {/* Logo */}
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center text-left group cursor-pointer shrink-0"
            >
              <img
                src="/brand/velemgyere-logo-wide-v2.jpg"
                alt="Velem Gyere -- Külföldi programok magyarul"
                className="h-10 sm:h-14 md:h-16 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </button>

            {/* Search bar between Logo and Programok */}
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
              <button
                onClick={() => navigateTo('programs')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'programs' ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Programok
              </button>
              <button
                onClick={() => navigateTo('categories')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'categories' ? 'text-emerald-700 bg-emerald-50/80' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Kategóriák
              </button>
              <button
                onClick={() => navigateTo('favorites')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'favorites' ? 'text-rose-700 bg-rose-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${totalFavoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                <span>Kedvencek</span>
                {totalFavoritesCount > 0 && (
                  <span className="bg-rose-500 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                    {totalFavoritesCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleBookingsClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'my-account' ? 'text-emerald-700 bg-emerald-50/80 font-bold' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Ticket className={`w-4 h-4 ${isAuthenticated && orders.length > 0 ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span>Foglalásaim</span>
                {isAuthenticated && orders.length > 0 && (
                  <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                    {orders.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {currentUser.role === 'admin' ? (
                <button
                  onClick={() => navigateTo('admin-dashboard')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Vezérlőpult
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
                  >
                    <Briefcase className="w-4 h-4 text-emerald-700" />
                    Dashboard
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
                  onClick={onOpenLogin}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Belépés / Regisztráció
                </button>
              )}

              {isAuthenticated && (
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Kijelentkezés"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Top Header right-side quick action (e.g. + Új for provider) */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (only on mobile screens) */}
      <nav
        aria-label="Mobil navigáció"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-stretch">
          {/* 1. Programok */}
          <button
            type="button"
            onClick={() => navigateTo('programs')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
              currentView === 'programs'
                ? 'text-emerald-700 font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Compass className={`w-5 h-5 transition-transform ${currentView === 'programs' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px] leading-tight mt-1 truncate">Programok</span>
          </button>

          {/* 2. Kategóriák */}
          <button
            type="button"
            onClick={() => navigateTo('categories')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
              currentView === 'categories'
                ? 'text-emerald-700 font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <LayoutGrid className={`w-5 h-5 transition-transform ${currentView === 'categories' ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px] leading-tight mt-1 truncate">Kategóriák</span>
          </button>

          {/* 3. Kedvencek */}
          <button
            type="button"
            onClick={() => navigateTo('favorites')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 transition-colors cursor-pointer min-w-0 ${
              currentView === 'favorites'
                ? 'text-rose-700 font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Heart
                className={`w-5 h-5 transition-transform ${
                  currentView === 'favorites' || totalFavoritesCount > 0
                    ? 'fill-rose-500 text-rose-500 scale-105'
                    : 'stroke-[1.8]'
                }`}
              />
              {totalFavoritesCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-extrabold px-1.5 min-w-[15px] h-3.5 rounded-full flex items-center justify-center leading-none shadow-xs">
                  {totalFavoritesCount > 99 ? '99+' : totalFavoritesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight mt-1 truncate">Kedvencek</span>
          </button>

          {/* 4. Foglalások */}
          <button
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
              {isAuthenticated && orders.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 min-w-[15px] h-3.5 rounded-full flex items-center justify-center leading-none shadow-xs">
                  {orders.length > 99 ? '99+' : orders.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight mt-1 truncate">Foglalások</span>
          </button>

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
              {currentUser.role === 'admin' ? (
                <ShieldCheck className={`w-5 h-5 ${isAccountActive ? 'text-amber-600 stroke-[2.4]' : 'stroke-[1.8]'}`} />
              ) : currentUser.role === 'provider' ? (
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
              {currentUser.role === 'admin'
                ? 'Admin'
                : currentUser.role === 'provider'
                ? 'Partner'
                : 'Fiókom'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
