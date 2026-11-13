import React, { useState } from 'react';
import { Mail, Phone, Send, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ContactContent, SimpleTextImageContent } from '../../types/pageContent';
import { sanitizeStoredContent } from '../../lib/sanitizeHtml';

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
  const { pages, submitContactMessage, currentUser } = useApp();
  const page = pages[slug];
  const content = (page?.content || {}) as SimpleTextImageContent & ContactContent;
  const title = page?.title?.trim() || heading;
  const bodyText = content.bodyText?.trim() || draftFallback;
  const isDraft = !content.bodyText?.trim();

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactResult, setContactResult] = useState<{ success: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (currentUser?.user_id) {
      setContactName(currentUser.name || '');
      setContactEmail(currentUser.email || '');
    }
  }, [currentUser?.user_id, currentUser?.name, currentUser?.email]);

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contactConsent || contactSending) return;
    setContactSending(true);
    setContactResult(null);
    try {
      const result = await submitContactMessage({
        name: contactName.trim(),
        email: contactEmail.trim(),
        message: contactMessage.trim(),
      });
      setContactResult(result);
      if (result.success) {
        setContactMessage('');
        setContactConsent(false);
      }
    } catch {
      setContactResult({ success: false, message: 'Nem sikerült elküldeni az üzenetet. Kérjük, próbáld újra később.' });
    } finally {
      setContactSending(false);
    }
  };

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

      <div
        className="max-w-none text-stone-700 text-sm sm:text-base leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2"
        dangerouslySetInnerHTML={{ __html: sanitizeStoredContent(bodyText) }}
      />

      {showContactFields && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 items-start">
          <aside className="rounded-3xl bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-5">
              <MessageCircle className="w-6 h-6 text-emerald-300" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300 mb-2">Velemgyere ügyfélszolgálat</p>
            <h2 className="font-display text-2xl font-extrabold leading-tight">Írj nekünk bátran!</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">Kérdésed van egy programmal, szolgáltatói csatlakozással vagy a platform használatával kapcsolatban? Küldj üzenetet, és hamarosan válaszolunk.</p>
            <div className="mt-7 space-y-3 border-t border-white/15 pt-5">
              <a href="mailto:info@velemgyere.hu" className="flex items-center gap-3 text-sm text-white hover:text-emerald-300 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Mail className="w-4 h-4" /></span>
                info@velemgyere.hu
              </a>
              {content.email && content.email !== 'info@velemgyere.hu' && (
                <a href={`mailto:${content.email}`} className="flex items-center gap-3 text-sm text-white hover:text-emerald-300 transition-colors">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Mail className="w-4 h-4" /></span>
                  {content.email}
                </a>
              )}
              {content.phone && (
                <a href={`tel:${content.phone}`} className="flex items-center gap-3 text-sm text-white hover:text-emerald-300 transition-colors">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Phone className="w-4 h-4" /></span>
                  {content.phone}
                </a>
              )}
            </div>
            <p className="mt-8 text-xs text-stone-400">Velemgyere – élmények, amelyek összekötnek.</p>
          </aside>

          <form onSubmit={handleContactSubmit} className="rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-1">Kapcsolatfelvétel</p>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-stone-900">Küldj üzenetet</h2>
              <p className="text-sm text-stone-500 mt-1">A csillaggal jelölt mezők kitöltése kötelező.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-bold uppercase tracking-wider text-stone-700">Neved *</label>
                <input id="contact-name" required maxLength={120} autoComplete="name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Hogy szólíthatunk?" className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-wider text-stone-700">E-mail-címed *</label>
                <input id="contact-email" required type="email" maxLength={254} autoComplete="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="nev@email.hu" className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-bold uppercase tracking-wider text-stone-700">Üzeneted *</label>
              <textarea id="contact-message" required minLength={5} maxLength={5000} rows={6} value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Írd le, miben segíthetünk..." className="w-full resize-y rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <p className="text-right text-[11px] text-stone-400">{contactMessage.length}/5000</p>
            </div>
            <label className="flex items-start gap-3 text-xs leading-relaxed text-stone-600 cursor-pointer">
              <input type="checkbox" required checked={contactConsent} onChange={e => setContactConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-emerald-600" />
              <span>Elolvastam az <a href="/adatkezeles" target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline underline-offset-2">Adatkezelési tájékoztatót</a>, és hozzájárulok ahhoz, hogy a megadott adataimat az üzenetem megválaszolása céljából kezeljék. *</span>
            </label>
            {contactResult && (
              <div role="status" aria-live="polite" className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${contactResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                {contactResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{contactResult.message}</span>
              </div>
            )}
            <button type="submit" disabled={contactSending || !contactConsent} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
              <Send className="w-4 h-4" /> {contactSending ? 'Küldés folyamatban...' : 'Üzenet küldése'}
            </button>
            <p className="text-[11px] text-stone-400">Az üzenetedet a Velemgyere csapata kapja meg.</p>
          </form>
        </div>
      )}
    </div>
  );
};
