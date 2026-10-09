import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart, FolderHeart, X, ArrowRight } from 'lucide-react';

export const FavoriteToast: React.FC = () => {
  const { 
    favoriteToast, 
    dismissFavoriteToast, 
    openFolderModal, 
    setCurrentView 
  } = useApp();

  if (!favoriteToast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 max-w-sm w-auto sm:w-full bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-stone-800 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {favoriteToast.message}
          </p>
          {favoriteToast.program && (
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {favoriteToast.program.title}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2.5">
            {favoriteToast.program && (
              <button
                type="button"
                onClick={() => {
                  if (favoriteToast.program) {
                    openFolderModal(favoriteToast.program);
                  }
                  dismissFavoriteToast();
                }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>Mappa választása</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCurrentView('favorites');
                dismissFavoriteToast();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-stone-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Listák megtekintése</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissFavoriteToast}
          className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Bezárás"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
