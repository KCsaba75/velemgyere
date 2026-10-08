import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu,
  X,
  ShieldCheck,
  Briefcase,
  User,
  LogOut,
  PlusCircle,
  Heart,
  Search
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
    currentProvider,
    isAuthenticated,
    totalFavoritesCount,
    logout,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showFavorites = currentView !== 'home' && currentView !== 'programs';
  const showProviderLanding = currentView !== 'programs';

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'programs') {
      navigateTo('programs');
    }
  };

  return (
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
            {showFavorites && (
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
            )}
            {showProviderLanding && (
              <button
                onClick={() => navigateTo('provider-landing')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'provider-landing' ? 'text-emerald-700 bg-emerald-50/80' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Szolgáltatóknak
              </button>
            )}
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

          {/* Mobile hamburger menu button */}
          <div className="flex items-center md:hidden gap-2">
            {currentUser.role === 'provider' && (
              <button
                onClick={onOpenNewProgram}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Új
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Menü megnyitása"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            <button
              onClick={() => navigateTo('programs')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                currentView === 'programs' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Programok
            </button>
            <button
              onClick={() => navigateTo('categories')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                currentView === 'categories' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Kategóriák
            </button>
            {showFavorites && (
              <button
                onClick={() => navigateTo('favorites')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
                  currentView === 'favorites' ? 'bg-rose-50 text-rose-800 font-bold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${totalFavoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                  <span>Kedvencek</span>
                </span>
                {totalFavoritesCount > 0 && (
                  <span className="bg-rose-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {totalFavoritesCount}
                  </span>
                )}
              </button>
            )}
            {showProviderLanding && (
              <button
                onClick={() => navigateTo('provider-landing')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                  currentView === 'provider-landing' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                Szolgáltatóknak
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2">
            {currentUser.role === 'admin' ? (
              <button
                onClick={() => navigateTo('admin-dashboard')}
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Adminisztrátori felület
              </button>
            ) : currentUser.role === 'provider' ? (
              <>
                <button
                  onClick={() => { navigateTo('provider-dashboard'); }}
                  className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Szolgáltatói Dashboard
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenNewProgram(); }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  + Új program feltöltése
                </button>
              </>
            ) : isAuthenticated ? (
              <button
                onClick={() => navigateTo('my-account')}
                className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-800 font-medium text-sm flex items-center justify-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span>{currentUser.name || currentUser.email || 'Fiókom'}</span>
              </button>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm text-center"
              >
                Belépés / Regisztráció
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full py-2 text-stone-500 hover:text-rose-600 text-xs font-medium text-center"
              >
                Kijelentkezés ({currentUser.name})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
