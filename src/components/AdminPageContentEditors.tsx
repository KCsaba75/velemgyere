import React, { useState, useRef } from 'react';
import { Check, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { uploadSiteContentImage } from '../lib/imageUpload';
import { DRAFT_FAQ_ITEMS, DRAFT_FALLBACKS, DRAFT_HOW_IT_WORKS, DRAFT_HOW_IT_WORKS_PROVIDER_STEPS, FaqItem, HowItWorksContent, HowItWorksStepContent } from '../types/pageContent';

// Kanban 71915a0a (4-6. pont): admin-szerkeszto kartyak a 7 uj publikus
// aloldalhoz (Platform + Ugyfelszolgalat). Minden kartya ugyanazt a
// draft-input-majd-mentes mintat koveti mint az AdminSettingsPage.tsx tobbi
// szekcioja (fee/eur/social), hogy egyseges maradjon az admin UX.

const SaveButton: React.FC<{ saving: boolean; saved: boolean; onClick: () => void }> = ({ saving, saved, onClick }) => (
  <div className="flex items-center gap-3">
    <button
      onClick={onClick}
      disabled={saving}
      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60"
    >
      {saving ? 'Mentés...' : 'Mentés'}
    </button>
    {saved && (
      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
        <Check className="w-3.5 h-3.5" /> Mentve
      </span>
    )}
  </div>
);

const ImageUploadField: React.FC<{
  slug: string;
  label: string;
  imageUrl: string;
  onChange: (url: string) => void;
}> = ({ slug, label, imageUrl, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadSiteContentImage(supabase, slug, file);
      onChange(url);
    } catch (err) {
      console.error('Kép feltöltése sikertelen:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">{label}</label>
      {imageUrl && (
        <img src={imageUrl} alt="" className="h-28 w-auto object-cover rounded-xl border border-stone-200" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{uploading ? 'Feltöltés...' : 'Kép feltöltése'}</span>
        </button>
        <span className="text-xs text-stone-400">vagy kép URL megadása:</span>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 min-w-[200px] text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};

// ---- 1. Egyszeru szoveg (+opc. kep) -- Rolunk / Arazas es fizetes / ASZF / Adatkezeles ----
export const SimpleTextPageEditorCard: React.FC<{
  slug: string;
  cardTitle: string;
  defaultTitle: string;
  withImage?: boolean;
  legalWarning?: boolean;
}> = ({ slug, cardTitle, defaultTitle, withImage, legalWarning }) => {
  const { pages, updatePageContent } = useApp();
  const page = pages[slug];
  const [titleDraft, setTitleDraft] = useState(page?.title || defaultTitle);
  const [bodyDraft, setBodyDraft] = useState((page?.content?.bodyText as string) || '');
  const [imageDraft, setImageDraft] = useState((page?.content?.imageUrl as string) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setTitleDraft(page?.title || defaultTitle);
    setBodyDraft((page?.content?.bodyText as string) || '');
    setImageDraft((page?.content?.imageUrl as string) || '');
  }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePageContent(slug, {
        title: titleDraft.trim() || defaultTitle,
        content: withImage ? { bodyText: bodyDraft, imageUrl: imageDraft } : { bodyText: bodyDraft },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <h4 className="font-display font-bold text-stone-900 text-base">{cardTitle}</h4>
      {legalWarning && (
        <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
          Jogi szöveg -- ne találj ki végleges ÁSZF/adatkezelési tartalmat, csak Csaba által megadott/jóváhagyott szöveget tölts ide.
        </p>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Oldal címe</label>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Szöveg</label>
        <textarea
          rows={6}
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          placeholder={DRAFT_FALLBACKS[slug] || ''}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />
        {!bodyDraft.trim() && (
          <p className="text-[11px] text-stone-400">Üresen a szürke minta-szöveg jelenik meg a nyilvános oldalon (draft-jelzéssel), amíg ide nem írsz tartalmat.</p>
        )}
      </div>
      {withImage && (
        <ImageUploadField slug={slug} label="Kép" imageUrl={imageDraft} onChange={setImageDraft} />
      )}
      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
};

// ---- 2. Kapcsolat: szoveg + email + telefon ----
export const ContactPageEditorCard: React.FC = () => {
  const { pages, updatePageContent } = useApp();
  const page = pages['contact'];
  const [titleDraft, setTitleDraft] = useState(page?.title || 'Kapcsolat');
  const [bodyDraft, setBodyDraft] = useState((page?.content?.bodyText as string) || '');
  const [emailDraft, setEmailDraft] = useState((page?.content?.email as string) || '');
  const [phoneDraft, setPhoneDraft] = useState((page?.content?.phone as string) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setTitleDraft(page?.title || 'Kapcsolat');
    setBodyDraft((page?.content?.bodyText as string) || '');
    setEmailDraft((page?.content?.email as string) || '');
    setPhoneDraft((page?.content?.phone as string) || '');
  }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePageContent('contact', {
        title: titleDraft.trim() || 'Kapcsolat',
        content: { bodyText: bodyDraft, email: emailDraft, phone: phoneDraft },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <h4 className="font-display font-bold text-stone-900 text-base">Kapcsolat</h4>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Oldal címe</label>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Szöveg</label>
        <textarea
          rows={4}
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          placeholder={DRAFT_FALLBACKS.contact}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">E-mail</label>
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="info@velemgyere.hu"
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Telefon</label>
          <input
            type="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="+36 ..."
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
};

// ---- 3. Hogyan mukodik: ketfele nezopont ----
export const HowItWorksEditorCard: React.FC = () => {
  const { pages, updatePageContent } = useApp();
  const page = pages['how-it-works'];
  const existing = (page?.content || {}) as HowItWorksContent;
  const [titleDraft, setTitleDraft] = useState(page?.title || 'Hogyan működik?');
  const [draft, setDraft] = useState<HowItWorksContent>(existing);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setTitleDraft(page?.title || 'Hogyan működik?');
    setDraft((page?.content || {}) as HowItWorksContent);
  }, [page]);

  const set = (field: keyof HowItWorksContent, value: string) => setDraft(prev => ({ ...prev, [field]: value }));

  const steps = draft.providerSteps || [];
  const updateStep = (idx: number, field: keyof HowItWorksStepContent, value: string) => {
    setDraft(prev => ({
      ...prev,
      providerSteps: (prev.providerSteps || []).map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };
  const addStep = () => setDraft(prev => ({
    ...prev,
    providerSteps: [...(prev.providerSteps || []), { title: '', body: '', leftLabel: 'Szolgáltatóként', leftText: '', rightLabel: 'A programvadásznak', rightText: '' }],
  }));
  const removeStep = (idx: number) => setDraft(prev => ({
    ...prev,
    providerSteps: (prev.providerSteps || []).filter((_, i) => i !== idx),
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedSteps = (draft.providerSteps || []).filter(s => s.title.trim() || s.body.trim());
      await updatePageContent('how-it-works', {
        title: titleDraft.trim() || 'Hogyan működik?',
        content: { ...draft, providerSteps: cleanedSteps } as Record<string, unknown>,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <h4 className="font-display font-bold text-stone-900 text-base">Hogyan működik? (kétféle nézőpont)</h4>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Oldal címe</label>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 border border-stone-100 rounded-xl p-4">
          <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Programvadászoknak</h5>
          <input
            type="text"
            value={draft.visitorTitle || ''}
            onChange={(e) => set('visitorTitle', e.target.value)}
            placeholder="Alcím"
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <textarea
            rows={5}
            value={draft.visitorText || ''}
            onChange={(e) => set('visitorText', e.target.value)}
            placeholder={DRAFT_HOW_IT_WORKS.visitorText}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          />
          <ImageUploadField slug="how-it-works" label="Kép" imageUrl={draft.visitorImageUrl || ''} onChange={(url) => set('visitorImageUrl', url)} />
        </div>
        <div className="space-y-3 border border-stone-100 rounded-xl p-4">
          <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Szolgáltatóként</h5>
          <input
            type="text"
            value={draft.providerTitle || ''}
            onChange={(e) => set('providerTitle', e.target.value)}
            placeholder="Alcím"
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <textarea
            rows={5}
            value={draft.providerText || ''}
            onChange={(e) => set('providerText', e.target.value)}
            placeholder={DRAFT_HOW_IT_WORKS.providerText}
            className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          />
          <ImageUploadField slug="how-it-works" label="Kép" imageUrl={draft.providerImageUrl || ''} onChange={(url) => set('providerImageUrl', url)} />
        </div>
      </div>

      <div className="border-t border-stone-200 pt-5 space-y-3">
        <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          Szolgáltatói lépések (részletes idővonal, lent az oldalon)
        </h5>
        {steps.length === 0 && (
          <p className="text-[11px] text-stone-400">
            Jelenleg nincs felvett lépés -- a nyilvános oldalon az alapértelmezett {DRAFT_HOW_IT_WORKS_PROVIDER_STEPS.length} lépéses minta jelenik meg, draft-jelzéssel, amíg legalább egyet nem adsz hozzá.
          </p>
        )}
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="border border-stone-100 rounded-xl p-4 space-y-2 relative">
              <button
                type="button"
                onClick={() => removeStep(idx)}
                className="absolute top-3 right-3 text-stone-400 hover:text-rose-600 cursor-pointer"
                title="Törlés"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(idx, 'title', e.target.value)}
                placeholder={`${idx + 1}. lépés címe`}
                className="w-full text-sm font-semibold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 pr-8 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <textarea
                rows={3}
                value={step.body}
                onChange={(e) => updateStep(idx, 'body', e.target.value)}
                placeholder="Részletes leírás: mit kell kitöltenie/feltöltenie/megadnia a szolgáltatónak, és mi történik utána."
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={step.leftText || ''}
                  onChange={(e) => updateStep(idx, 'leftText', e.target.value)}
                  placeholder="Rövid payoff: szolgáltatóként"
                  className="w-full text-xs bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={step.rightText || ''}
                  onChange={(e) => updateStep(idx, 'rightText', e.target.value)}
                  placeholder="Rövid payoff: a programvadásznak"
                  className="w-full text-xs bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Lépés hozzáadása
        </button>
      </div>

      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
};

// ---- 4. GYIK: ket celkozonseg (Utazoknak / Szolgaltatoknak) kulon listaval ----
// Kanban faqsplit1: egyetlen kozos `items` tomb marad a mentes alapja (egy
// updatePageContent hivas menti mindket szekciot egyszerre), csak a
// megjelenites es a hozzaadas-gomb van szekcionkent szetvalasztva. Az
// `audience` hianya ('traveler'-kent kezelve) garantalja, hogy a meglevo,
// migracio elotti kerdesek valtozatlanul az elso szekcioban maradnak.
const faqAudienceOf = (item: FaqItem): 'traveler' | 'provider' => (item.audience === 'provider' ? 'provider' : 'traveler');

const FaqSection: React.FC<{
  heading: string;
  audience: 'traveler' | 'provider';
  items: FaqItem[];
  onUpdate: (globalIdx: number, field: 'question' | 'answer', value: string) => void;
  onRemove: (globalIdx: number) => void;
  onAdd: () => void;
}> = ({ heading, audience, items, onUpdate, onRemove, onAdd }) => {
  const entries = items
    .map((item, globalIdx) => ({ item, globalIdx }))
    .filter(({ item }) => faqAudienceOf(item) === audience);

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-bold text-stone-800">{heading}</h5>

      {entries.length === 0 && (
        <p className="text-[11px] text-stone-400">Nincs még felvett kérdés ebben a szekcióban.</p>
      )}

      <div className="space-y-3">
        {entries.map(({ item, globalIdx }) => (
          <div key={globalIdx} className="border border-stone-100 rounded-xl p-4 space-y-2 relative">
            <button
              type="button"
              onClick={() => onRemove(globalIdx)}
              className="absolute top-3 right-3 text-stone-400 hover:text-rose-600 cursor-pointer"
              title="Törlés"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={item.question}
              onChange={(e) => onUpdate(globalIdx, 'question', e.target.value)}
              placeholder="Kérdés"
              className="w-full text-sm font-semibold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 pr-8 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
              rows={3}
              value={item.answer}
              onChange={(e) => onUpdate(globalIdx, 'answer', e.target.value)}
              placeholder="Válasz"
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Kérdés hozzáadása
      </button>
    </div>
  );
};

export const FaqEditorCard: React.FC = () => {
  const { pages, updatePageContent } = useApp();
  const page = pages['faq'];
  const [titleDraft, setTitleDraft] = useState(page?.title || 'Gyakran Ismételt Kérdések');
  const [items, setItems] = useState<FaqItem[]>((page?.content?.items as FaqItem[]) || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setTitleDraft(page?.title || 'Gyakran Ismételt Kérdések');
    setItems((page?.content?.items as FaqItem[]) || []);
  }, [page]);

  const updateItem = (idx: number, field: 'question' | 'answer', value: string) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = (audience: 'traveler' | 'provider') =>
    setItems(prev => [...prev, { question: '', answer: '', audience }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = items.filter(it => it.question.trim() || it.answer.trim());
      await updatePageContent('faq', { title: titleDraft.trim() || 'Gyakran Ismételt Kérdések', content: { items: cleaned } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
      <h4 className="font-display font-bold text-stone-900 text-base">Gyakran Ismételt Kérdések</h4>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Oldal címe</label>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {items.length === 0 && (
        <p className="text-[11px] text-stone-400">
          Jelenleg nincs felvett kérdés -- a nyilvános oldalon egy minta-kérdés jelenik meg ("{DRAFT_FAQ_ITEMS[0].question}"), amíg legalább egyet nem adsz hozzá.
        </p>
      )}

      <div className="pt-2 border-t border-stone-100">
        <FaqSection
          heading="Utazóknak, Programvadászoknak"
          audience="traveler"
          items={items}
          onUpdate={updateItem}
          onRemove={removeItem}
          onAdd={() => addItem('traveler')}
        />
      </div>

      <div className="pt-2 border-t border-stone-100">
        <FaqSection
          heading="Szolgáltatóknak"
          audience="provider"
          items={items}
          onUpdate={updateItem}
          onRemove={removeItem}
          onAdd={() => addItem('provider')}
        />
      </div>

      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
};


// ---- Rólunk: teljes, szekciónként szerkeszthető bemutatkozó oldal ----
const ABOUT_DEFAULTS: Record<string, string> = {
  "heroEyebrow": "Egy személyes ötletből született",
  "heroTitle": "A világot felfedezni",
  "heroHighlight": "magyarul is lehet.",
  "heroText": "Programok, kirándulások és helyi élmények magyar nyelven – hogy ne csak megérkezz, hanem igazán meg is ismerd az úti célodat.",
  "storyEyebrow": "Hogyan kezdődött?",
  "storyTitle": "Egy utazó kérdéseiből lett egy közös ötlet.",
  "storyParagraph1": "Kiss Csaba Lajos vagyok, a Velemgyere ötletgazdája és fejlesztője. A mindennapi munkámban ipari automatizálási szervizfeladatok szervezésével és alkalmazásfejlesztéssel foglalkozom. Szabadidőmben pedig – párommal és családommal – szeretek útra kelni, új helyeket felfedezni.",
  "storyParagraph2": "Közel állnak hozzám a természet kincsei, a történelmi helyszínek, az építészet, a városok hangulata és az adott országok gasztronómiája. Utazásainkat hol önállóan szervezzük, hol utazási irodára bízzuk.",
  "storyParagraph3": "Amikor magunk tervezzük az utat, a repülőjegy és a szállás lefoglalása ma már gyorsan megy online. Utána jönnek az igazán fontos kérdések: hogyan jutunk el a hotelbe, mit érdemes megnézni, milyen programokat válasszunk, és hol találunk helyi idegenvezetőt?",
  "storyQuote": "„Egy idegen város történetei egészen másképp elevenednek meg, ha az anyanyelvünkön hallhatjuk őket.”",
  "storyImageCaption": "Több, mint eljutni A-ból B-be.",
  "discoveryEyebrow": "A felismerés",
  "discoveryTitle": "A jó programok ott vannak – csak nem mindig könnyű megtalálni őket.",
  "discoveryText": "Elkezdtem magyarul beszélő helyi szolgáltatókat keresni. Facebook-csoportokban, Instagramon, egyéni weboldalakon és programajánló oldalakon kutattam. Az ajánlatok és információk sok helyen, szétszórva voltak. Minden szolgáltatót külön kellett felkutatni, összehasonlítani, majd egyeztetni vele.",
  "discoveryStep1Title": "Keresgélés",
  "discoveryStep1Text": "Különböző csoportok, oldalak és közösségi felületek böngészése.",
  "discoveryStep2Title": "Összehasonlítás",
  "discoveryStep2Text": "Programok, nyelvek, időpontok és szolgáltatások áttekintése.",
  "discoveryStep3Title": "Egyeztetés",
  "discoveryStep3Text": "Kapcsolatfelvétel és a részletek külön-külön történő megbeszélése.",
  "discoveryQuestion": "Mi lenne, ha mindezt egyetlen helyen lehetne megtalálni?",
  "discoveryAnswer": "Így született meg a Velemgyere ötlete.",
  "missionEyebrow": "A küldetésünk",
  "missionTitle": "Összekötni azokat, akik felfedeznének, azokkal, akik megmutatnák a világot.",
  "missionText1": "A Velemgyere célja, hogy egy helyen tegye könnyebben felfedezhetővé a külföldön élő, magyarul beszélő szolgáltatók programjait. Így az utazók könnyebben rátalálhatnak a számukra érdekes városnézésekre, kirándulásokra, transzferekre és helyi élményekre.",
  "missionText2": "A platform a szolgáltatókat is segíti: lehetőséget ad arra, hogy bemutassák programjaikat azoknak a magyar utazóknak, akik éppen az adott úti célt fedeznék fel.",
  "missionCallout": "Mert egy helyi történet, egy városi séta vagy egy kirándulás sokszor még emlékezetesebb, ha magyarul élhetjük át.",
  "experiencesEyebrow": "Mit találsz nálunk?",
  "experiencesTitle": "Ötletek a következő élményedhez.",
  "experiencesText": "Böngéssz a különböző szolgáltatások és programok között, és találd meg azt, ami illik az utazásodhoz.",
  "ctaTitle": "A legjobb utazási emlékek gyakran egy találkozással kezdődnek.",
  "ctaText": "Lehet, hogy csak egy transzfert keresel. Lehet, hogy egy egész napos kirándulást. Vagy egy helyi idegenvezetőt, aki magyarul mesél a városról. Indulj el, és találd meg a következő élményed!",
  "ctaSignoff": "Köszönöm, hogy itt vagy!",
  "ctaSignature": "Kiss Csaba Lajos",
  "ctaTagline": "Velemgyere – mert a világot együtt még jobb felfedezni!",
  "experience1Title": "Városnézés és idegenvezetés",
  "experience1Text": "Fedezd fel a városok történeteit magyar nyelvű vezetéssel.",
  "experience2Title": "Kirándulások és túrák",
  "experience2Text": "Ismerd meg a környék természeti kincseit és különleges helyeit.",
  "experience3Title": "Transzferek és közlekedés",
  "experience3Text": "Találj segítséget a reptéri érkezéshez és a helyi utazáshoz.",
  "experience4Title": "Különleges élmények",
  "experience4Text": "Hajókirándulások, helyi programok és egyedi felfedeznivalók.",
  "experience5Title": "Helyi ízek és kultúra",
  "experience5Text": "Kerülj közelebb az úti célhoz a gasztronómián és a helyi történeteken keresztül."
};

const ABOUT_FIELDS: Array<{ key: string; label: string; multiline?: boolean }> = [
  { key: 'heroEyebrow', label: 'Nyitókép – kis felső cím' },
  { key: 'heroTitle', label: 'Nyitókép – főcím első sora' },
  { key: 'heroHighlight', label: 'Nyitókép – kiemelt főcím' },
  { key: 'heroText', label: 'Nyitókép – bevezető szöveg', multiline: true },
  { key: 'storyEyebrow', label: 'Történet – felső cím' },
  { key: 'storyTitle', label: 'Történet – főcím' },
  { key: 'storyParagraph1', label: 'Bemutatkozás – 1. bekezdés', multiline: true },
  { key: 'storyParagraph2', label: 'Bemutatkozás – 2. bekezdés', multiline: true },
  { key: 'storyParagraph3', label: 'Bemutatkozás – 3. bekezdés', multiline: true },
  { key: 'storyQuote', label: 'Kiemelt idézet', multiline: true },
  { key: 'storyImageCaption', label: 'Történet képének kísérőszövege' },
  { key: 'discoveryEyebrow', label: 'Felismerés – felső cím' },
  { key: 'discoveryTitle', label: 'Felismerés – főcím' },
  { key: 'discoveryText', label: 'Felismerés – leírás', multiline: true },
  { key: 'discoveryStep1Title', label: '1. lépés címe' },
  { key: 'discoveryStep1Text', label: '1. lépés leírása', multiline: true },
  { key: 'discoveryStep2Title', label: '2. lépés címe' },
  { key: 'discoveryStep2Text', label: '2. lépés leírása', multiline: true },
  { key: 'discoveryStep3Title', label: '3. lépés címe' },
  { key: 'discoveryStep3Text', label: '3. lépés leírása', multiline: true },
  { key: 'discoveryQuestion', label: 'Felismerés – záró kérdés', multiline: true },
  { key: 'discoveryAnswer', label: 'Felismerés – záró válasz' },
  { key: 'missionEyebrow', label: 'Küldetés – felső cím' },
  { key: 'missionTitle', label: 'Küldetés – főcím' },
  { key: 'missionText1', label: 'Küldetés – 1. bekezdés', multiline: true },
  { key: 'missionText2', label: 'Küldetés – 2. bekezdés', multiline: true },
  { key: 'missionCallout', label: 'Küldetés – kiemelt szöveg', multiline: true },
  { key: 'experiencesEyebrow', label: 'Programtípusok – felső cím' },
  { key: 'experiencesTitle', label: 'Programtípusok – főcím' },
  { key: 'experiencesText', label: 'Programtípusok – leírás', multiline: true },
  { key: 'experience1Title', label: '1. programtípus – cím' },
  { key: 'experience1Text', label: '1. programtípus – leírás', multiline: true },
  { key: 'experience2Title', label: '2. programtípus – cím' },
  { key: 'experience2Text', label: '2. programtípus – leírás', multiline: true },
  { key: 'experience3Title', label: '3. programtípus – cím' },
  { key: 'experience3Text', label: '3. programtípus – leírás', multiline: true },
  { key: 'experience4Title', label: '4. programtípus – cím' },
  { key: 'experience4Text', label: '4. programtípus – leírás', multiline: true },
  { key: 'experience5Title', label: '5. programtípus – cím' },
  { key: 'experience5Text', label: '5. programtípus – leírás', multiline: true },
  { key: 'ctaTitle', label: 'Záró rész – főcím' },
  { key: 'ctaText', label: 'Záró rész – leírás', multiline: true },
  { key: 'ctaSignoff', label: 'Záró rész – elköszönés' },
  { key: 'ctaSignature', label: 'Záró rész – aláírás' },
  { key: 'ctaTagline', label: 'Záró rész – szlogen' },
];


export const HomeHeroImageEditorCard: React.FC = () => {
  const { pages, updatePageContent } = useApp();
  const page = pages['home-hero'];
  const [imageDraft, setImageDraft] = useState(String(page?.content?.imageUrl || ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setImageDraft(String(page?.content?.imageUrl || ''));
  }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePageContent('home-hero', {
        title: 'Főoldal kiemelt háttérképe',
        content: { imageUrl: imageDraft.trim() },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="group bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h4 className="font-display font-bold text-stone-900 text-base">Főoldal – fekete/zöld átmenetes fejléc képe</h4>
          <p className="mt-1 text-sm text-stone-500">A bejelentkezés nélküli főoldal háttérképe</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600 group-open:bg-emerald-50 group-open:text-emerald-700">Megnyitás <span className="inline-block transition-transform group-open:rotate-180">⌄</span></span>
      </summary>
      <div className="border-t border-stone-100 p-5 space-y-4">
        <p className="text-sm text-stone-500">A kép a kereső-fejléc hátterében jelenik meg. A fekete–zöld átmenet és a sötét réteg megmarad, hogy a feliratok jól olvashatók legyenek.</p>
      <ImageUploadField slug="home-hero" label="Főoldali háttérkép" imageUrl={imageDraft} onChange={setImageDraft} />
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-sm cursor-pointer disabled:opacity-60">
          {saving ? 'Mentés...' : 'Háttérkép mentése'}
        </button>
        {saved && <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Mentve</span>}
      </div>
      </div>
    </details>
  );
};

export const AboutUsEditorCard: React.FC = () => {
  const { pages, updatePageContent } = useApp();
  const page = pages['about-us'];
  const content = page?.content || {};
  const [title, setTitle] = useState(page?.title || 'Rólunk – Velemgyere');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setTitle(page?.title || 'Rólunk – Velemgyere');
    const entries: Array<[string, string]> = ABOUT_FIELDS.map(({ key }) => [key, String(content[key] ?? ABOUT_DEFAULTS[key] ?? '')]);
    entries.push(
      ['heroImageUrl', String(content.heroImageUrl || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=2000&q=85')],
      ['storyImageUrl', String(content.storyImageUrl || 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85')],
      ['missionImageUrl', String(content.missionImageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85')],
    );
    setDraft(Object.fromEntries(entries));
  }, [page]);

  const setField = (key: string, value: string) => setDraft(prev => ({ ...prev, [key]: value }));
  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePageContent('about-us', {
        title: title.trim() || 'Rólunk – Velemgyere',
        content: { ...content, ...draft },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="group bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h4 className="font-display font-bold text-stone-900 text-base">Rólunk – teljes oldal szerkesztése</h4>
          <p className="mt-1 text-sm text-stone-500">Szövegek és három kép szerkesztése</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600 group-open:bg-emerald-50 group-open:text-emerald-700">Megnyitás <span className="inline-block transition-transform group-open:rotate-180">⌄</span></span>
      </summary>
      <div className="border-t border-stone-100 p-5 space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Oldal / SEO címe</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <ImageUploadField slug="about-us" label="Nyitókép" imageUrl={draft.heroImageUrl || ''} onChange={url => setField('heroImageUrl', url)} />
        <ImageUploadField slug="about-us" label="Történet képe" imageUrl={draft.storyImageUrl || ''} onChange={url => setField('storyImageUrl', url)} />
        <ImageUploadField slug="about-us" label="Küldetés képe" imageUrl={draft.missionImageUrl || ''} onChange={url => setField('missionImageUrl', url)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {ABOUT_FIELDS.map(field => (
          <div key={field.key} className={field.multiline ? 'space-y-1.5 md:col-span-2' : 'space-y-1.5'}>
            <label className="text-xs font-bold text-stone-700">{field.label}</label>
            {field.multiline ? (
              <textarea rows={3} value={draft[field.key] || ''} onChange={e => setField(field.key, e.target.value)} className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 resize-y" />
            ) : (
              <input value={draft[field.key] || ''} onChange={e => setField(field.key, e.target.value)} className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2" />
            )}
          </div>
        ))}
      </div>
      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </details>
  );
};
