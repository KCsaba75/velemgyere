import React from 'react';
import { Compass, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DRAFT_HOW_IT_WORKS, HowItWorksContent } from '../../types/pageContent';

// Kanban 71915a0a (4a. pont): a kozosajandek.hu "Nektek"/"A vendegeknek"
// ketfele-nezopont mintajara -- itt "programvadasz" (utazo) vs "szolgaltato".
export const HowItWorksPage: React.FC = () => {
  const { pages } = useApp();
  const page = pages['how-it-works'];
  const content = (page?.content || {}) as HowItWorksContent;
  const title = page?.title?.trim() || 'Hogyan működik?';

  useDocumentMeta(title, 'Hogyan működik a Velem Gyere, programvadászként és szolgáltatóként is.');

  const visitorText = content.visitorText?.trim() || DRAFT_HOW_IT_WORKS.visitorText!;
  const providerText = content.providerText?.trim() || DRAFT_HOW_IT_WORKS.providerText!;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-10 text-center">
        {title}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4">
          {content.visitorImageUrl && (
            <img src={content.visitorImageUrl} alt={content.visitorTitle || 'Programvadászoknak'} className="w-full h-48 object-cover rounded-xl" />
          )}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <Compass className="w-3.5 h-3.5" />
            <span>PROGRAMVADÁSZOKNAK</span>
          </div>
          <h2 className="font-display font-bold text-xl text-stone-900">
            {content.visitorTitle?.trim() || 'Neked, aki élményt keresel'}
          </h2>
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-wrap">{visitorText}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4">
          {content.providerImageUrl && (
            <img src={content.providerImageUrl} alt={content.providerTitle || 'Szolgáltatóknak'} className="w-full h-48 object-cover rounded-xl" />
          )}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-lg">
            <Briefcase className="w-3.5 h-3.5" />
            <span>SZOLGÁLTATÓKÉNT</span>
          </div>
          <h2 className="font-display font-bold text-xl text-stone-900">
            {content.providerTitle?.trim() || 'Neked, aki programot hirdetnél'}
          </h2>
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-wrap">{providerText}</p>
        </div>
      </div>
    </div>
  );
};
