import React, { useState } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProgramCard } from './ProgramCard';
import { CountryFlag } from './CountryFlag';
import { 
  Heart, 
  FolderPlus, 
  FolderHeart, 
  Trash2, 
  Edit3, 
  Share2, 
  Check, 
  Compass, 
  Sparkles,
  MapPin,
  Calendar,
  Wallet,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FavoriteFolder } from '../types/database';

export const FavoritesView: React.FC = () => {
  const { 
    favoriteFolders, 
    favorites, 
    allFavoritePrograms, 
    getFolderPrograms, 
    createFavoriteFolder, 
    updateFavoriteFolder, 
    deleteFavoriteFolder,
    clearAllFavorites,
    removeProgramFromFolder,
    openFolderModal,
    setCurrentView,
    isAuthenticated,
    currentUser,
    openLoginModal
  } = useApp();

  useDocumentMeta('Mentett kedvencek & Utazási listák', 'Rendszerezd kedvenc túráidat és programjaidat utazási mappákba.');

  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FavoriteFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FavoriteFolder | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('emerald');

  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Heart className="w-8 h-8 fill-rose-500 text-rose-500" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full mb-4 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kizárólag Bejelentkezett Programvadászoknak</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mb-4">
            Mentett Kedvencek & Mappák
          </h1>

          <p className="text-stone-600 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            A kedvencek mentése és a tematikus utazási mappák (pl. <em>Róma 2026</em>, <em>Gasztrotúrák</em>, <em>Családi programok</em>) kizárólag a saját, személyes fiókodban kerülnek nyilvántartásra.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="font-bold text-stone-900 text-sm mb-1 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Saját fiókban tárolva</span>
              </div>
              <div className="text-xs text-stone-500 leading-relaxed">
                A mentett túrák kizárólag a saját profilodhoz kapcsolódnak, így más eszközről belépve is azonnal elérheted őket.
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="font-bold text-stone-900 text-sm mb-1 flex items-center gap-1.5">
                <FolderHeart className="w-4 h-4 text-emerald-600" />
                <span>Egyéni mappák</span>
              </div>
              <div className="text-xs text-stone-500 leading-relaxed">
                Hozz létre külön listákat célállomás, évszám vagy stílus szerint (pl. Ciprusi tavasz, Gasztro élmények).
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="font-bold text-stone-900 text-sm mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Gyors foglalás</span>
              </div>
              <div className="text-xs text-stone-500 leading-relaxed">
                Lásd az összesített költségbecslést és foglald le a kiválasztott magyar vezetett programokat zökkenőmentesen.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openLoginModal('A kedvencek eléréséhez és kezeléséhez kérjük, lépj be a fiókodba!')}
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Bejelentkezés vagy Regisztráció</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setCurrentView('programs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full sm:w-auto px-6 py-3.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              Programok böngészése
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayedPrograms = getFolderPrograms(activeFolderId);
  const activeFolder = activeFolderId === 'all' 
    ? null 
    : favoriteFolders.find(f => f.id === activeFolderId);

  // Compute total estimated cost
  const totalCost = displayedPrograms.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const created = createFavoriteFolder({
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || undefined,
      color: newFolderColor
    });

    setActiveFolderId(created.id);
    setNewFolderName('');
    setNewFolderDesc('');
    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !editingFolder.name.trim()) return;

    updateFavoriteFolder(editingFolder.id, {
      name: editingFolder.name.trim(),
      description: editingFolder.description?.trim() || undefined,
      color: editingFolder.color
    });

    setEditingFolder(null);
  };

  const handleShareList = () => {
    const title = activeFolder ? activeFolder.name : 'Mentett Velem Gyere Programok';
    const listSummary = displayedPrograms.map((p, i) => `${i + 1}. ${p.title} (${formatPrice(p.price)} €/fő - ${p.country || p.region?.name})`).join('\n');
    const textToCopy = `📌 ${title} - Velem Gyere:\n\n${listSummary}\n\nFedezd fel: ${window.location.origin}/kedvencek`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedMessage('A lista tartalma a vágólapra másolva!');
      setTimeout(() => setCopiedMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-stone-200">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg mb-3 border border-rose-200/60">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Saját Utazási Bakancslista</span>
            <span className="text-stone-400 font-normal">|</span>
            <span className="text-stone-700 font-semibold">{currentUser?.name || currentUser?.email || 'Saját fiók'}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Mentett Kedvencek & Mappák
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-2 max-w-2xl leading-relaxed">
            Kattints bármely program kártyáján vagy adatlapján a szív (♡) ikonra, és mentsd el a kedvenceid közé. 
            Hozhatsz létre mappákat célállomások (pl. Róma 2026), témák (pl. Gasztrotúrák) vagy utazási stílus szerint!
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Új lista létrehozása</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="space-y-8">
        {/* Folders navigation tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs sm:text-sm">
          {/* All tab */}
          <button
            type="button"
            onClick={() => setActiveFolderId('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeFolderId === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Összes mentett</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
              activeFolderId === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              {allFavoritePrograms.length}
            </span>
          </button>

          {/* Folder tabs */}
          {favoriteFolders.map((folder) => {
            const folderCount = favorites.filter(f => f.folder_id === folder.id).length;
            const isActive = activeFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className={`relative shrink-0 inline-flex items-center rounded-xl border transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className="px-3.5 py-2 font-bold flex items-center gap-2 cursor-pointer text-left"
                >
                  <FolderHeart className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{folder.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {folderCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setFolderToDelete(folder);
                  }}
                  className={`p-1.5 mr-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'text-white/70 hover:text-white hover:bg-white/20'
                      : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={`„${folder.name}” lista és programjainak törlése`}
                  aria-label={`„${folder.name}” lista törlése`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Folder Bar details */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-xl text-stone-900">
                {activeFolder ? activeFolder.name : 'Minden mentett program'}
              </h2>
              {activeFolder?.is_default && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Alapértelmezett lista
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {activeFolder?.description || (activeFolderId === 'all' 
                ? 'Az összes mentett élményed és túrád egyetlen áttekinthető gyűjteményben.' 
                : 'Ebben a mappában található túrák.')}
            </p>
          </div>

          {/* Stats & Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
            {displayedPrograms.length > 0 && (
              <div className="flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200/80 text-xs text-stone-700">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Összköltség: <strong className="text-stone-900 font-extrabold font-display text-sm">{formatPrice(totalCost)} €</strong>/fő</span>
              </div>
            )}

            {displayedPrograms.length > 0 && (
              <button
                type="button"
                onClick={handleShareList}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Lista megosztása / Másolása"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Megosztás</span>
              </button>
            )}

            {activeFolder && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingFolder(activeFolder)}
                  className="px-3 py-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  title="Lista átnevezése / szerkesztése"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Szerkesztés</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFolderToDelete(activeFolder)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  title="Lista törlése a benne lévő programokkal együtt"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Lista törlése</span>
                </button>
              </div>
            )}

            {!activeFolder && allFavoritePrograms.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200 hover:border-rose-200"
                title="Minden mentett program törlése a kedvencek közül"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Összes törlése</span>
              </button>
            )}
          </div>
        </div>

        {/* Copy toast feedback */}
        {copiedMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{copiedMessage}</span>
          </div>
        )}

        {/* Programs Grid */}
        {displayedPrograms.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-display font-bold text-lg text-stone-900">
                {activeFolderId === 'all' 
                  ? 'Még nincsenek elmentett kedvenceid' 
                  : `A(z) „${activeFolder?.name}” lista még üres`}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                {activeFolderId === 'all' 
                  ? 'Böngéssz a garantáltan magyar nyelvű túrák és élmények között, és kattints a jobb felső sarokban lévő szív (♡) ikonra a mentéshez!' 
                  : 'Nyisd meg bármelyik túrát, vagy a kártyák szív ikonjával mentsd el ebbe a mappába!'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentView('programs');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-2.5 bg-stone-900 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm inline-flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Programok felfedezése</span>
              </button>

              {activeFolder && (
                <button
                  type="button"
                  onClick={() => setFolderToDelete(activeFolder)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm transition-all cursor-pointer border border-rose-200 inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Üres lista törlése</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedPrograms.map((program) => (
              <div key={program.id} className="relative group/favcard flex flex-col">
                <ProgramCard program={program} />

                {/* Extra management toolbar under card in folder view */}
                <div className="mt-2 bg-white rounded-xl border border-stone-200/90 px-3 py-2 flex items-center justify-between text-xs text-stone-600">
                  <button
                    type="button"
                    onClick={() => openFolderModal(program)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderHeart className="w-3.5 h-3.5" />
                    <span>Mappák módosítása</span>
                  </button>

                  {activeFolder && (
                    <button
                      type="button"
                      onClick={() => removeProgramFromFolder(program.id, activeFolder.id)}
                      className="text-[11px] text-stone-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Eltávolítás ebből a listából"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Kivétel a listából</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW FOLDER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-stone-900">
                    Új Utazási Mappa Létrehozása
                  </h3>
                  <p className="text-xs text-stone-500">
                    pl. Róma 2026, Gasztrotúrák, Családi programok
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Mappa / Lista Neve <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="pl. Róma 2026, Gasztrotúrák, Ciprus őszi szünet..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Rövid Leírás (opcionális)
                </label>
                <input
                  type="text"
                  placeholder="pl. 2026 tavaszi városnéző túrák a barátokkal..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Lista Létrehozása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FOLDER */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Lista szerkesztése
              </h3>
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Lista neve
                </label>
                <input
                  type="text"
                  required
                  value={editingFolder.name}
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Leírás
                </label>
                <input
                  type="text"
                  value={editingFolder.description || ''}
                  onChange={(e) => setEditingFolder({ ...editingFolder, description: e.target.value })}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = editingFolder;
                    setEditingFolder(null);
                    setFolderToDelete(toDel);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Lista törlése</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFolder(null)}
                    className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Módosítás mentése
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE FOLDER & ITS PROGRAMS */}
      {folderToDelete && (() => {
        const folderProgCount = favorites.filter(f => f.folder_id === folderToDelete.id).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg text-stone-900 leading-snug">
                    Lista és programok törlése
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Biztosan törölni szeretnéd ezt a kedvencek listát?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning preview banner */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-900">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <FolderHeart className="w-4 h-4 text-rose-600" />
                    <span>{folderToDelete.name}</span>
                  </span>
                  <span className="bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full text-[11px]">
                    {folderProgCount} db mentett program
                  </span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed pt-1 border-t border-rose-200/60">
                  A lista törlésével <strong>a benne található összes ({folderProgCount} db) program is törlődik a kedvenceid közül</strong>.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Mégsem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteFavoriteFolder(folderToDelete.id, true);
                    if (activeFolderId === folderToDelete.id) {
                      setActiveFolderId('all');
                    }
                    setFolderToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Igen, törlés a programokkal együtt</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: CONFIRM CLEAR ALL FAVORITES */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg text-stone-900 leading-snug">
                  Minden kedvenc program törlése
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ki szeretnéd üríteni az összes kedvencedet?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
              Biztosan törölni szeretnéd az <strong>összes mentett programot ({allFavoritePrograms.length} db)</strong> a kedvenceid közül?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Mégsem
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllFavorites();
                  setIsClearAllConfirmOpen(false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Igen, összes kedvenc törlése</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
