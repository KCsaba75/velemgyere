import React from 'react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { SimpleTextContent } from '../../types/pageContent';
import { DRAFT_FALLBACKS } from '../../types/pageContent';
import { sanitizeStoredContent } from '../../lib/sanitizeHtml';

export const TermsPage: React.FC = () => {
  const { pages } = useApp();
  const page = pages.terms;
  const content = (page?.content || {}) as SimpleTextContent;
  const title = page?.title?.trim() || 'Általános Szerződési Feltételek';
  const bodyText = content.bodyText?.trim() || DRAFT_FALLBACKS.terms;
  const isDraft = !content.bodyText?.trim();

  useDocumentMeta(title, 'A Velem Gyere platform Általános Szerződési Feltételei.');

  return (
    <div className="bg-stone-50 text-stone-800">
      <section className="relative isolate min-h-[280px] sm:min-h-[340px] flex items-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950 via-stone-900/90 to-emerald-950" />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-4xl">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-emerald-300 mb-5">
              Velem Gyere · Jogi dokumentum
            </p>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-white/80">
              A platform használatának feltételei és a szolgáltatás igénybevételének fontos tudnivalói.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {isDraft && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Ez egy ideiglenes minta. A végleges ÁSZF szövegét az admin felületen kell megadni és jóváhagyni.
          </div>
        )}
        <article className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm">
          <div
            className="break-words text-sm sm:text-base leading-8 text-stone-700 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2"
            dangerouslySetInnerHTML={{ __html: sanitizeStoredContent(bodyText) }}
          />
        </article>
      </section>
    </div>
  );
};
