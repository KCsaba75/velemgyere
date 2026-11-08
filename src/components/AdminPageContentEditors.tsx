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

// ---- 4. GYIK: dinamikus kerdes-valasz lista ----
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

  const updateItem = (idx: number, field: keyof FaqItem, value: string) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems(prev => [...prev, { question: '', answer: '' }]);
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
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
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

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="border border-stone-100 rounded-xl p-4 space-y-2 relative">
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="absolute top-3 right-3 text-stone-400 hover:text-rose-600 cursor-pointer"
              title="Törlés"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={item.question}
              onChange={(e) => updateItem(idx, 'question', e.target.value)}
              placeholder="Kérdés"
              className="w-full text-sm font-semibold bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 pr-8 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
              rows={3}
              value={item.answer}
              onChange={(e) => updateItem(idx, 'answer', e.target.value)}
              placeholder="Válasz"
              className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Kérdés hozzáadása
      </button>

      <SaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  );
};
