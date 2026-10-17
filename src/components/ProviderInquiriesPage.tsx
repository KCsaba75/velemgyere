import React from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Briefcase } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 5a3a8dd8 (Csaba, 10-17 masodik pontositas): az Erdeklodesek fulnek
// csak a strukturaja/navigacioja valtozik -- a tartalom szandekosan marad a
// mar meglevo placeholder (lasd 5a3a8dd8 elso kore), az uzenofelulet maga meg
// nincs megepitve, ez onallo kesobbi munka lesz.
export const ProviderInquiriesPage: React.FC = () => {
  const { setCurrentView } = useApp();

  useDocumentMeta('Érdeklődések -- Szolgáltatói Dashboard', 'A leendő üzenőfelület helye, ahol közvetlenül tudsz kommunikálni az érdeklődőkkel.');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Érdeklődések
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            A leendő üzenőfelület helye.
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

      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-stone-800 font-display mb-1">
          Hamarosan: közvetlen üzenetküldés
        </h4>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Ezen a lapon fog megjelenni a leendő üzenőfelület, ahol közvetlenül tudsz
          kommunikálni az érdeklődőkkel. Jelenleg fejlesztés alatt.
        </p>
      </div>
    </div>
  );
};
