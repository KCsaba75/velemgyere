import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ContactContent, SimpleTextImageContent } from '../../types/pageContent';

interface SimpleContentPageProps {
  slug: string;
  heading: string;
  metaDescription: string;
  // Kontakt-adat (email/telefon) csak a 'contact' oldalnal jelenik meg,
  // a tobbinel (pricing/terms/privacy) nincs ertelme -- lasd ContactContent.
  showContactFields?: boolean;
  showImage?: boolean;
  draftFallback: string;
}

// Kanban 71915a0a (4-6. pont): egyseges komponens az "egyetlen szoveg-blokk
// (+ opcionalisan kep/kapcsolat-adat)" alaku aloldalakhoz -- Rolunk, Arazas
// es fizetes, Kapcsolat, ASZF, Adatkezelesi tajekoztato. A "Hogyan mukodik"
// (ket nezopont) es a GYIK (kerdes-valasz lista) alakja eltero, azok kulon
// komponenst kapnak.
export const SimpleContentPage: React.FC<SimpleContentPageProps> = ({
  slug,
  heading,
  metaDescription,
  showContactFields,
  showImage,
  draftFallback,
}) => {
  const { pages } = useApp();
  const page = pages[slug];
  const content = (page?.content || {}) as SimpleTextImageContent & ContactContent;
  const title = page?.title?.trim() || heading;
  const bodyText = content.bodyText?.trim() || draftFallback;
  const isDraft = !content.bodyText?.trim();

  useDocumentMeta(title, metaDescription);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-6">
        {title}
      </h1>

      {isDraft && (
        <div className="mb-6 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl inline-block">
          Ez a tartalom még nincs véglegesítve -- admin tölti majd ki.
        </div>
      )}

      {showImage && content.imageUrl && (
        <img
          src={content.imageUrl}
          alt={title}
          className="w-full max-h-96 object-cover rounded-2xl mb-8 border border-stone-200"
        />
      )}

      <div className="prose prose-stone max-w-none text-stone-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
        {bodyText}
      </div>

      {showContactFields && (content.email || content.phone) && (
        <div className="mt-8 flex flex-col gap-3">
          {content.email && (
            <a href={`mailto:${content.email}`} className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:underline">
              <Mail className="w-4 h-4" /> {content.email}
            </a>
          )}
          {content.phone && (
            <a href={`tel:${content.phone}`} className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:underline">
              <Phone className="w-4 h-4" /> {content.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
};
