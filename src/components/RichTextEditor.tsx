import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { sanitizeHtml } from '../lib/sanitizeHtml';

// Kanban richtext1: konnyusulyu, konyvtar-mentes rich-text szerkeszto admin
// hasznalatra (contentEditable + document.execCommand -- deprecated API, de a
// bold/italic/underline/lista parancsok minden evergreen bongeszoben mukodnek,
// es egy admin-only belso eszkoznel nem eri meg emiatt egy teljes editor
// konyvtarat (TipTap/Quill) behuzni a bundle-be). A HTML-t a SZULO menti,
// EZ a komponens nem ment semmit sajat maga.
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

const TOOLBAR_BUTTONS: Array<{ command: string; icon: React.ElementType; title: string }> = [
  { command: 'bold', icon: Bold, title: 'Félkövér (Ctrl+B)' },
  { command: 'italic', icon: Italic, title: 'Dőlt (Ctrl+I)' },
  { command: 'underline', icon: Underline, title: 'Aláhúzott (Ctrl+U)' },
  { command: 'insertUnorderedList', icon: List, title: 'Felsorolás' },
  { command: 'insertOrderedList', icon: ListOrdered, title: 'Számozott lista' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeightClassName = 'min-h-[120px]' }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Null-lal indul (nem value-val), hogy az ELSO useEffect-futas is
  // beallitsa az innerHTML-t -- kulonben a kezdeti tartalom sosem jelenne meg.
  const lastValue = useRef<string | null>(null);

  // Csak akkor irjuk felul az innerHTML-t, ha a valtozas KIVULROL jott (pl.
  // a page adat kesobb erkezett be async-bol) -- SOHA sajat begepeles utan,
  // mert az resetelne a kurzor-pozicot minden lenyomott billentyunel.
  useEffect(() => {
    if (ref.current && value !== lastValue.current) {
      ref.current.innerHTML = value || '';
      lastValue.current = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValue.current = html;
    onChange(html);
  }, [onChange]);

  const exec = (command: string) => {
    ref.current?.focus();
    document.execCommand(command);
    emitChange();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    // Word/Google Docs HTML-jet AZONNAL az engedelyezett-tag-keszletre
    // szukitjuk beillesztesnel, igy a felkover/dolt/lista megmarad, de a
    // Word-specifikus stilus-bozot (mso-* inline style, span-lancok) nem
    // latja sem a szerkeszto, sem a nyilvanos oldal kesobb.
    const clean = html ? sanitizeHtml(html) : text.replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, clean);
    emitChange();
  };

  const isEmpty = !value || value === '<br>' || value.trim() === '';

  return (
    <div className="border border-stone-300 rounded-xl overflow-hidden bg-stone-50 focus-within:ring-2 focus-within:ring-emerald-500">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white border-b border-stone-200">
        {TOOLBAR_BUTTONS.map(({ command, icon: Icon, title }) => (
          <button
            key={command}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(command)}
            title={title}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-700 cursor-pointer"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute top-2.5 left-3.5 text-sm text-stone-400">{placeholder}</div>
        )}
        <div
          ref={ref}
          contentEditable
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
          suppressContentEditableWarning
          className={`max-w-none px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none ${minHeightClassName} [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic`}
        />
      </div>
    </div>
  );
};
