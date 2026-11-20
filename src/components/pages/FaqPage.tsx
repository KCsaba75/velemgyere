import React, { useState } from 'react';
import { ChevronDown, Compass, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DRAFT_FAQ_ITEMS, FaqContent, FaqItem } from '../../types/pageContent';
import { sanitizeStoredContent } from '../../lib/sanitizeHtml';

// Kanban faqsplit1: hianyzo audience = 'traveler', hogy a migracio elotti
// (meglevo) kerdesek valtozatlanul az elso szekcioban jelenjenek meg.
const faqAudienceOf = (item: FaqItem): 'traveler' | 'provider' => (item.audience === 'provider' ? 'provider' : 'traveler');

// Kanban faqcolumns1: a ket szekcio fejleces, a HowItWorksPage ket-oszlopos
// badge+cim+leiras kartyajanak mintajara (Csaba minta-kepe ugyanezt a
// meglevo stilust mutatta referenciakent, nem szo szerinti szoveget).
const FaqSectionHeaderCard: React.FC<{
  badge: string;
  badgeIcon: React.ElementType;
  badgeClassName: string;
  title: string;
  description: string;
}> = ({ badge, badgeIcon: Icon, badgeClassName, title, description }) => (
  <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
    <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-lg mb-3 ${badgeClassName}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{badge}</span>
    </div>
    <h2 className="font-display font-bold text-lg sm:text-xl text-stone-900">{title}</h2>
    <p className="mt-1 text-sm text-stone-500">{description}</p>
  </div>
);

const FaqAccordionGroup: React.FC<{
  groupKey: string;
  items: FaqItem[];
  openKey: string | null;
  onToggle: (key: string) => void;
  className?: string;
}> = ({ groupKey, items, openKey, onToggle, className = '' }) => {
  if (items.length === 0) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => {
        const key = `${groupKey}-${idx}`;
        const isOpen = openKey === key;
        return (
          <div key={key} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 cursor-pointer"
            >
              <span className="font-semibold text-stone-900 text-sm sm:text-base">{item.question}</span>
              <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div
                className="px-5 pb-4 text-sm text-stone-700 leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeStoredContent(item.answer) }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const FaqPage: React.FC = () => {
  const { pages } = useApp();
  const page = pages['faq'];
  const content = (page?.content || {}) as FaqContent;
  const title = page?.title?.trim() || 'Gyakran Ismételt Kérdések';
  const items = content.items && content.items.length > 0 ? content.items : DRAFT_FAQ_ITEMS;
  const travelerItems = items.filter(it => faqAudienceOf(it) === 'traveler');
  const providerItems = items.filter(it => faqAudienceOf(it) === 'provider');
  const showHeadings = providerItems.length > 0;
  const [openKey, setOpenKey] = useState<string | null>('traveler-0');

  useDocumentMeta(title, 'A Velem Gyere platformmal kapcsolatos leggyakoribb kérdések és válaszok.');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-8">
        {title}
      </h1>

      {showHeadings ? (
        // Kanban 74716cca: mobilon (grid-cols-1) a DOM-sorrend adja a vizualis
        // sorrendet, ezert fejlec+sajat-kerdesei egy blokkban kovetik egymast.
        // md-tol az order/col-span visszaallitja a ket fejlec-egy-sorban
        // elrendezest, a teljes-szeles kerdeslistakkal alatta.
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-4 md:gap-y-6">
          <div className="md:order-1">
            <FaqSectionHeaderCard
              badge="PROGRAMVADÁSZOKNAK"
              badgeIcon={Compass}
              badgeClassName="text-emerald-800 bg-emerald-50 border border-emerald-200"
              title="Utazóknak, Programvadászoknak"
              description="Amit érdemes tudnod foglalás előtt és közben."
            />
          </div>
          <FaqAccordionGroup
            groupKey="traveler"
            items={travelerItems}
            openKey={openKey}
            onToggle={(key) => setOpenKey(prev => (prev === key ? null : key))}
            className="md:order-3 md:col-span-2"
          />
          <div className="md:order-2">
            <FaqSectionHeaderCard
              badge="SZOLGÁLTATÓKÉNT"
              badgeIcon={Briefcase}
              badgeClassName="text-stone-700 bg-stone-100 border border-stone-200"
              title="Szolgáltatóknak"
              description="Amit a programjaid meghirdetéséről és kezeléséről tudnod kell."
            />
          </div>
          <FaqAccordionGroup
            groupKey="provider"
            items={providerItems}
            openKey={openKey}
            onToggle={(key) => setOpenKey(prev => (prev === key ? null : key))}
            className="md:order-4 md:col-span-2"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <FaqAccordionGroup
            groupKey="traveler"
            items={travelerItems}
            openKey={openKey}
            onToggle={(key) => setOpenKey(prev => (prev === key ? null : key))}
          />
        </div>
      )}
    </div>
  );
};
