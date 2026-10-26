import React from 'react';

export interface FilterPillOption {
  id: string;
  label: string;
  tone?: 'neutral' | 'amber' | 'emerald' | 'stone';
}

interface FilterPillBarProps {
  options: FilterPillOption[];
  value: string;
  onChange: (id: string) => void;
}

const ACTIVE_CLASSES: Record<string, string> = {
  neutral: 'bg-stone-900 text-white shadow-sm',
  amber: 'bg-amber-600 text-white shadow-sm',
  emerald: 'bg-emerald-600 text-white shadow-sm',
  stone: 'bg-stone-600 text-white shadow-sm',
};

const INACTIVE_CLASSES: Record<string, string> = {
  neutral: 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50',
  amber: 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50',
  emerald: 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50',
  stone: 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100',
};

/**
 * Shared status/category filter-pill row for the admin tabs (kanban 0f06b97f,
 * 2-3. pont). Replaces each tab's own copy-pasted pill markup -- three of them
 * (Programkezelés, Szolgáltatók, Értékelések) used overflow-x-auto no-scrollbar,
 * the same pattern already proven to silently clip content off-screen on the
 * main tab bar (51fadf1). flex-wrap here too: a pill can never become
 * unreachable, it just wraps to the next line.
 */
export const FilterPillBar: React.FC<FilterPillBarProps> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    {options.map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        className={`text-xs px-3.5 py-2 rounded-xl font-semibold transition-colors shrink-0 cursor-pointer ${
          value === opt.id ? ACTIVE_CLASSES[opt.tone || 'neutral'] : INACTIVE_CLASSES[opt.tone || 'neutral']
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
