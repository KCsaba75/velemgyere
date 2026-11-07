import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { FaqContent } from '../../types/pageContent';

const DRAFT_FAQ_ITEMS = [
  { question: 'Ez egy placeholder kérdés -- az admin tölti majd ki a valódi GYIK-et.', answer: 'Hamarosan itt olvashatod a válaszokat a leggyakoribb kérdésekre.' },
];

export const FaqPage: React.FC = () => {
  const { pages } = useApp();
  const page = pages['faq'];
  const content = (page?.content || {}) as FaqContent;
  const title = page?.title?.trim() || 'Gyakran Ismételt Kérdések';
  const items = content.items && content.items.length > 0 ? content.items : DRAFT_FAQ_ITEMS;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useDocumentMeta(title, 'A Velem Gyere platformmal kapcsolatos leggyakoribb kérdések és válaszok.');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-8">
        {title}
      </h1>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 cursor-pointer"
              >
                <span className="font-semibold text-stone-900 text-sm sm:text-base">{item.question}</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
