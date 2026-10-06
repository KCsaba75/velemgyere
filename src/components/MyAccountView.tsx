import React from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { User, MessageSquare, Calendar, Compass } from 'lucide-react';

export const MyAccountView: React.FC = () => {
  const { currentUser, inquiries, setCurrentView } = useApp();

  useDocumentMeta('Saját fiókom', 'Korábbi érdeklődéseid és fiókadataid egy helyen.');

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-in fade-in duration-200">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900">
            Saját fiókom
          </h1>
          <p className="text-sm text-stone-500">{currentUser.name} · {currentUser.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="w-5 h-5 text-stone-400" />
        <h2 className="font-display text-lg font-bold text-stone-900">
          Érdeklődéseim ({inquiries.length})
        </h2>
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
          <Compass className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-600 mb-4">
            Még nem érdeklődtél egyetlen programnál sem.
          </p>
          <button
            onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm cursor-pointer"
          >
            Böngéssz a programok között
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inq => (
            <div key={inq.id} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-bold text-stone-900 text-sm">{inq.program_title || 'Program'}</h3>
                <span className="text-[11px] text-stone-400 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(inq.created_at)}
                </span>
              </div>
              <p className="text-xs text-stone-500 mb-2">{inq.provider_name}</p>
              {inq.message && (
                <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3">{inq.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
