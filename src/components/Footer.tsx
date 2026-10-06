import React from 'react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            {/* The logo file has a white background (not transparent) -- a plain white
                badge behind it is a deliberate, legible way to place it on the dark
                footer instead of a jarring un-intentional-looking white box. */}
            <div className="inline-flex bg-white rounded-xl px-3 py-2">
              <img
                src="/brand/velemgyere-logo-wide-v2.jpg"
                alt="Velem Gyere"
                className="h-8 w-auto object-contain"
              />
            </div>

            <p className="text-stone-400 text-xs sm:text-sm max-w-sm leading-relaxed">
              Kirándulások • Programok • Élmények Magyarország legszebb tájain. Találd meg a következő élményed vagy csatlakozz szervező partnerként!
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Katalógus
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Főoldal
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Összes program
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('categories'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Kategóriák
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('provider-landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Szolgáltatóknak
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} VELEM GYERE – Minden jog fenntartva. Magyarországi Élménykatalógus MVP.</p>
          <p className="text-[11px] text-stone-600">
            Tervezve és felépítve későbbi foglalási és fizetési rendszerrel való bővíthetőségre.
          </p>
        </div>
      </div>
    </footer>
  );
};
