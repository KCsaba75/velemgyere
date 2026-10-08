import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  FolderPlus, 
  Check, 
  Heart, 
  FolderHeart, 
  Plus, 
  MapPin, 
  Sparkles 
} from 'lucide-react';
import { CountryFlag } from './CountryFlag';

const FOLDER_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'amber', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'rose', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'sky', bg: 'bg-sky-100 text-sky-800 border-sky-300' },
  { id: 'purple', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export const FavoriteFolderModal: React.FC = () => {
  const { 
    folderModalProgram, 
    closeFolderModal, 
    favoriteFolders, 
    getProgramFolderIds, 
    addProgramToFolder, 
    removeProgramFromFolder, 
    createFavoriteFolder,
    favorites,
    setCurrentView,
    isAuthenticated
  } = useApp();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('emerald');

  if (!folderModalProgram || !isAuthenticated) return null;

  const currentFolderIds = getProgramFolderIds(folderModalProgram.id);

  const handleToggleFolder = (folderId: string) => {
    if (currentFolderIds.includes(folderId)) {
      removeProgramFromFolder(folderModalProgram.id, folderId);
    } else {
      addProgramToFolder(folderModalProgram.id, folderId);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder = createFavoriteFolder({
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || undefined,
      color: newFolderColor
    });

    // Immediately add this program to the newly created folder
    addProgramToFolder(folderModalProgram.id, newFolder.id);

    setNewFolderName('');
    setNewFolderDesc('');
    setIsCreatingNew(false);
  };

  const coverImage = folderModalProgram.images?.find(img => img.is_cover)?.image_url 
    || folderModalProgram.images?.[0]?.image_url 
    || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FolderHeart className="w-5 h-5 fill-rose-100 text-rose-600" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900 leading-tight">
                Mentés listába
              </h3>
              <p className="text-xs text-stone-500">
                Rendszerezd utazásaidat és kedvenc programjaidat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeFolderModal}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Program Preview */}
        <div className="p-4 mx-5 my-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3">
          <img 
            src={coverImage} 
            alt="" 
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <CountryFlag 
                emoji={folderModalProgram.region?.flag_emoji} 
                country={folderModalProgram.region?.country || folderModalProgram.country} 
                size="xs" 
              />
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                {folderModalProgram.region?.name || folderModalProgram.country || 'Külföld'}
              </span>
            </div>
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1">
              {folderModalProgram.title}
            </h4>
            <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
              {folderModalProgram.price} {folderModalProgram.currency === 'EUR' ? '€' : folderModalProgram.currency}/fő
            </p>
          </div>
        </div>

        {/* Folder List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
            Válassz mappát:
          </label>

          {favoriteFolders.map((folder) => {
            const isSelected = currentFolderIds.includes(folder.id);
            const folderCount = favorites.filter(f => f.folder_id === folder.id).length;

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => handleToggleFolder(folder.id)}
                className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}>
                    {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Heart className="w-4 h-4 text-stone-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm truncate">
                        {folder.name}
                      </span>
                      {folder.is_default && (
                        <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                          Alapértelmezett
                        </span>
                      )}
                    </div>
                    {folder.description && (
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-semibold text-stone-400 shrink-0 ml-2">
                  {folderCount} tétel
                </span>
              </button>
            );
          })}

          {/* Create New Folder Inline Section */}
          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full mt-2 py-3 px-4 rounded-2xl border border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 text-stone-700 hover:text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Új lista létrehozása (pl. Róma 2026, Gasztrotúrák)</span>
            </button>
          ) : (
            <form onSubmit={handleCreateFolder} className="mt-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-emerald-600" />
                  Új mappa létrehozása
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  Mégse
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Lista neve (pl. Róma 2026, Gasztrotúrák)..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Rövid leírás (opcionális)..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${c.bg} ${
                        newFolderColor === c.id ? 'scale-110 ring-2 ring-emerald-500' : 'opacity-70'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Létrehozás & Mentés
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              closeFolderModal();
              setCurrentView('favorites');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-stone-600 hover:text-emerald-700 underline cursor-pointer"
          >
            Összes mentett lista megnyitása &rarr;
          </button>

          <button
            type="button"
            onClick={closeFolderModal}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            Kész
          </button>
        </div>
      </div>
    </div>
  );
};
