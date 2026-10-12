import React from 'react';

export interface MetricCardData {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'amber' | 'emerald' | 'indigo';
}

interface MetricsRowProps {
  metrics: MetricCardData[];
  columns?: string;
}

const CARD_TONE: Record<string, { border: string; label: string; value: string }> = {
  neutral: { border: 'border-stone-200', label: 'text-stone-400', value: 'text-stone-900' },
  amber: { border: 'border-amber-200/80 bg-amber-50/30', label: 'text-amber-800', value: 'text-amber-700' },
  emerald: { border: 'border-emerald-200/80 bg-emerald-50/30', label: 'text-emerald-800', value: 'text-emerald-700' },
  indigo: { border: 'border-stone-200', label: 'text-stone-400', value: 'text-indigo-700' },
};

/**
 * Shared small metrics-card row for admin tabs (kanban 0f06b97f, 3. pont) --
 * one consistent component instead of each tab hand-rolling its own metric
 * cards in a slightly different style.
 */
export const MetricsRow: React.FC<MetricsRowProps> = ({ metrics, columns = 'grid-cols-2 sm:grid-cols-4' }) => (
  <div className={`grid ${columns} gap-4`}>
    {metrics.map((m, i) => {
      const tone = CARD_TONE[m.tone || 'neutral'];
      return (
        <div key={i} className={`bg-white p-4 rounded-2xl border shadow-2xs ${tone.border}`}>
          <span className={`font-bold uppercase tracking-wider text-[10px] block ${tone.label}`}>
            {m.label}
          </span>
          <div className={`text-2xl font-black font-display mt-1 ${tone.value}`}>
            {m.value}
          </div>
        </div>
      );
    })}
  </div>
);
