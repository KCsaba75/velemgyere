import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Compass, Database, CheckCircle, Code, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView, switchPersona, isSupabaseLive } = useApp();
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white font-display">
                VELEM GYERE
              </span>
            </div>

            <p className="text-stone-400 text-xs sm:text-sm max-w-sm leading-relaxed">
              Kirándulások • Programok • Élmények Magyarország legszebb tájain. Találd meg a következő élményed vagy csatlakozz szervező partnerként!
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs">
              <span className={`w-2 h-2 rounded-full ${isSupabaseLive ? 'bg-emerald-400' : 'bg-emerald-500'}`}></span>
              <span className="text-stone-300">
                {isSupabaseLive ? 'Supabase Cloud Adatbázis' : 'Supabase Adatmodell & RLS Aktív'}
              </span>
              <button
                onClick={() => setSchemaModalOpen(true)}
                className="ml-2 text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
              >
                SQL séma megtekintése
              </button>
            </div>
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

          {/* Partner & Admin access */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Hozzáférés & Tesztelés
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => switchPersona('visitor')} className="hover:text-emerald-400 cursor-pointer text-left">
                  👤 Programvadász nézet
                </button>
              </li>
              <li>
                <button onClick={() => switchPersona('provider')} className="hover:text-emerald-400 cursor-pointer text-left">
                  🏢 Szolgáltatói Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => switchPersona('admin')} className="hover:text-emerald-400 cursor-pointer text-left">
                  🛡️ Adminisztrátori felület
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

      {/* SQL Schema modal */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full p-6 text-stone-200 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h4 className="font-display font-bold text-lg text-white">
                  Supabase Adatmodell & RLS Házirendek
                </h4>
              </div>
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4 text-xs text-stone-400 space-y-2 overflow-y-auto flex-1 font-mono bg-stone-950 p-4 rounded-2xl border border-stone-800 text-[11px] leading-relaxed">
              <p className="text-emerald-400 font-sans font-semibold mb-2">
                A projekt tartalmazza a teljes /supabase/schema.sql fájlt a következő táblákkal és RLS szabályokkal:
              </p>
              <div>• profiles (id, user_id, name, email, role: 'admin'|'provider'|'visitor')</div>
              <div>• providers (id, user_id, company_name, contact_name, email, phone, website, description, status: 'pending'|'approved'|'suspended')</div>
              <div>• categories (id, name, slug, icon, active)</div>
              <div>• programs (id, provider_id, category_id, title, slug, descriptions, date, times, duration, price, included, not_included, status, featured)</div>
              <div>• program_images (id, program_id, image_url, is_cover, sort_order)</div>
              <div>• inquiries (id, program_id, provider_id, name, email, phone, message)</div>
              <div className="text-amber-400 pt-2 font-sans">
                🔒 RLS: Látogatók csak publikált programokat látnak; Szolgáltatók csak saját programjaikat és érdeklődéseiket kezelik; Adminisztrátor teljes hozzáféréssel bír.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
