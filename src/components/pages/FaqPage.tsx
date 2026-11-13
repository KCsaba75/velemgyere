import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DRAFT_FAQ_ITEMS, FaqContent, FaqItem } from '../../types/pageContent';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

// Kanban faqsplit1: hianyzo audience = 'traveler', hogy a migracio elotti
// (meglevo) kerdesek valtozatlanul az elso szekcioban jelenjenek meg.
const faqAudienceOf = (item: FaqItem): 'traveler' | 'provider' => (item.audience === 'provider' ? 'provider' : 'traveler');

const FaqAccordionGroup: React.FC<{
  heading?: string;
  items: FaqItem[];
  openKey: string | null;
  onToggle: (key: string) => void;
}> = ({ heading, items, openKey, onToggle }) => {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {heading && (
        <h2 className="text-lg sm:text-xl font-bold font-display text-stone-900 pt-2">{heading}</h2>
      )}
      {items.map((item, idx) => {
        const key = `${heading || 'traveler'}-${idx}`;
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
                className="px-5 pb-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }}
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

      <div className="space-y-6">
        <FaqAccordionGroup
          heading={showHeadings ? 'Utazóknak, Programvadászoknak' : undefined}
          items={travelerItems}
          openKey={openKey}
          onToggle={(key) => setOpenKey(prev => (prev === key ? null : key))}
        />
        <FaqAccordionGroup
          heading={showHeadings ? 'Szolgáltatóknak' : undefined}
          items={providerItems}
          openKey={openKey}
          onToggle={(key) => setOpenKey(prev => (prev === key ? null : key))}
        />
      </div>
    </div>
  );
};
