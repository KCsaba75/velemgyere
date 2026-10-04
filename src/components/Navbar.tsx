import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Compass, 
  Menu, 
  X, 
  ShieldCheck, 
  Briefcase, 
  User, 
  LogOut, 
  PlusCircle, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenNewProgram: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenLogin, 
  onOpenRegister,
  onOpenNewProgram 
}) => {
  const { 
    currentView, 
    setCurrentView, 
    currentUser, 
    currentProvider, 
    switchPersona, 
    logout 
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top micro test-bar for switching roles easily */}
      <div className="bg-stone-900 text-stone-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] whitespace-nowrap">
            Aktív szerepkör:
          </span>
          <span className="px-2 py-0.5 rounded bg-stone-800 text-white font-medium whitespace-nowrap border border-stone-700">
            {currentUser.role === 'admin' ? '🛡️ Rendszer Admin' : currentUser.role === 'provider' ? `🏢 Szolgáltató (${currentProvider?.company_name || currentUser.name})` : '👤 Látogató (Programvadász)'}
          </span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-1.5 text-stone-300 hover:text-white px-2 py-0.5 rounded hover:bg-stone-800 transition-colors cursor-pointer text-xs"
            title="Gyors szerepkörváltás a teszteléshez"
          >
            <span>Szerepkör váltása</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white text-stone-900 rounded-xl shadow-2xl border border-stone-200 p-2 z-50 text-xs">
              <div className="text-[11px] font-semibold text-stone-500 uppercase px-2 py-1">
                Gyors szerepkörváltás (MVP Teszt)
              </div>
              <button 
                onClick={() => { switchPersona('visitor'); setRoleSwitcherOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${currentUser.role === 'visitor' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}`}
              >
                <User className="w-4 h-4 text-stone-600" />
                <div>
                  <div className="font-medium">Látogató (Programvadász)</div>
                  <div className="text-[11px] text-stone-500">Keresés, szűrés, érdeklődés</div>
                </div>
              </button>

              <button 
                onClick={() => { switchPersona('provider'); setRoleSwitcherOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${currentUser.role === 'provider' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}`}
              >
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-medium">Szolgáltató (Pannon Élménytúrák)</div>
                  <div className="text-[11px] text-stone-500">Saját programok, érdeklődések</div>
                </div>
              </button>

              <button 
                onClick={() => { switchPersona('admin'); setRoleSwitcherOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${currentUser.role === 'admin' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="font-medium">Adminisztrátor</div>
                  <div className="text-[11px] text-stone-500">Jóváhagyás, katalógus vezérlés</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Slogan */}
          <button 
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight font-display text-stone-900 flex items-center gap-1">
                VELEM GYERE
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              </span>
              <span className="hidden sm:block text-[11px] font-semibold text-emerald-800/80 tracking-wide uppercase">
                Kirándulások • Programok • Élmények
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => navigateTo('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                currentView === 'home' ? 'text-emerald-700 bg-emerald-50/80' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Főoldal
            </button>
            <button
              onClick={() => navigateTo('programs')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                currentView === 'programs' ? 'text-emerald-700 bg-emerald-50/80' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
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
              onClick={() => navigateTo('provider-landing')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                currentView === 'provider-landing' ? 'text-emerald-700 bg-emerald-50/80' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Szolgáltatóknak
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
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="px-4 py-2 rounded-xl text-stone-700 hover:text-stone-900 font-medium text-sm transition-colors cursor-pointer"
                >
                  Belépés
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Szolgáltatói regisztráció
                </button>
              </div>
            )}

            {currentUser.role !== 'visitor' && (
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
              onClick={() => navigateTo('home')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                currentView === 'home' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Főoldal
            </button>
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
            <button
              onClick={() => navigateTo('provider-landing')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                currentView === 'provider-landing' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              Szolgáltatóknak
            </button>
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
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                  className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-800 font-medium text-sm text-center"
                >
                  Belépés
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                  className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm text-center"
                >
                  Regisztráció
                </button>
              </div>
            )}

            {currentUser.role !== 'visitor' && (
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
