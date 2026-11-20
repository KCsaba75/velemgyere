import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Lucide nem tartalmaz TikTok-ikont (nem brand-logo keszlet), ezert sajat,
// a lucide stroke-stilusahoz igazodo inline SVG kell -- lasd kanban 71915a0a.
const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.6 5.82c-1.01-.88-1.6-2.15-1.6-3.57h-3.09v12.4a2.59 2.59 0 1 1-2.6-2.6c.21 0 .42.02.6.06V8.9a5.7 5.7 0 0 0-.6-.03 5.74 5.74 0 0 0-5.74 5.74A5.74 5.74 0 0 0 9.31 20.3a5.74 5.74 0 0 0 5.74-5.74V9.01a7.3 7.3 0 0 0 4.3 1.38V7.3a4.27 4.27 0 0 1-2.75-1.48Z" />
  </svg>
);

const SOCIAL_LINKS: { key: 'facebook' | 'instagram' | 'tiktok'; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
];

export const Footer: React.FC = () => {
  const { setCurrentView, socialLinks } = useApp();
  // Csak a kitoltott (admin altal beallitott) linkekhez jelenik meg ikon --
  // ures URL-nel nincs ertelme egy sehova sem mutato gombot mutatni.
  const activeSocialLinks = SOCIAL_LINKS.filter(({ key }) => socialLinks[key]?.trim());

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="sm:col-span-2 space-y-4">
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
              Kirándulások • Programok • Élmények magyar nyelven, külföldön. Találd meg a következő élményed vagy csatlakozz szervező partnerként!
            </p>

            {activeSocialLinks.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {activeSocialLinks.map(({ key, label, Icon }) => (
                  <a
                    key={key}
                    href={socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-700 text-stone-300 hover:text-emerald-400 hover:border-emerald-400 transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
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
                <button onClick={() => { setCurrentView('travel'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Utazások
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('provider-landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Szolgáltatóknak
                </button>
              </li>
            </ul>
          </div>

          {/* Platform (kanban 71915a0a, 4. pont) */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Platform
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => { setCurrentView('how-it-works'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Hogyan működik?
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('about-us'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Rólunk
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('pricing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Árazás és fizetés
                </button>
              </li>
            </ul>
          </div>

          {/* Ugyfelszolgalat (kanban 71915a0a, 5. pont) */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">
              Ügyfélszolgálat
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => { setCurrentView('faq'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Gyakran ismételt kérdések
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Kapcsolat
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  ÁSZF
                </button>
              </li>
              <li>
                <button onClick={() => { setCurrentView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-emerald-400 cursor-pointer">
                  Adatkezelési tájékoztató
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} VELEM GYERE – Minden jog fenntartva. Magyar nyelvű külföldi élménykatalógus MVP.</p>
          <p className="text-[11px] text-stone-600">
            Tervezve és felépítve későbbi foglalási és fizetési rendszerrel való bővíthetőségre.
          </p>
        </div>
      </div>
    </footer>
  );
};
