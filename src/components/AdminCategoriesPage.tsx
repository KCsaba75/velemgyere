import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Layers, PlusCircle, Edit, Trash2, Globe } from 'lucide-react';
import { CategoryIcon, AVAILABLE_SERVICE_ICONS } from './CategoryIcon';
import { CountryFlag } from './CountryFlag';
import { Category } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { EUROPEAN_COUNTRIES, countryCodeToFlagEmoji } from '../data/europeanCountries';

// Kanban fb32ec4b (Csaba korrekcioja a daa1ed70/a8676c22 deep-linkre): a
// Szolgaltatas Tipusok kezeles kikerult az admin Fiok (AdminDashboard tab-sor)
// alol onallo top-level oldalra, a 5a3a8dd8-as mintazat szerint
// (ProviderProgramsPage a szolgaltatoi oldalon).
//
// Kanban 653c7577 (Csaba, teljes admin-nav atszervezes, 2026-11-02 vegso
// mobil-nav dontes): ez a "Kategoriak" targymenu mostantol HUB -- belso
// szegmentvaltoval a Desztinaciok/Regiok (korabban AdminDashboard 'regions'
// fulje) ES a Szolgaltatas Tipusok (ez a fajl eredeti tartalma) kozott, NEM
// kulon route a ket alreszhez (Zora 3154: "tab-sor vagy segmented control a
// gomb alatt, nem egy teljesen uj oldal"). A sorrend (Desztinaciok elobb)
// Csaba sajat felsorolasat kovetei.
type CategoriesSegment = 'destinations' | 'types';

export const AdminCategoriesPage: React.FC = () => {
  const {
    categories,
    programs,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    regions,
    createRegion,
    deleteRegion,
    toggleRegionActive,
  } = useApp();

  useDocumentMeta('Kategóriák -- Admin', 'Úticélok & régiók, valamint a katalógus szolgáltatás típusainak kezelése.');

  const [segment, setSegment] = useState<CategoriesSegment>('destinations');

  // -- Szolgáltatás Típusok (eredeti tartalom) --
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Luggage');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('Luggage');

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    await createCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      active: true,
    });

    setNewCategoryName('');
    setNewCategoryIcon('Luggage');
    setAddCategoryModalOpen(false);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryIcon(cat.icon || 'Luggage');
  };

  const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;

    await updateCategory(editingCategory.id, {
      name: editCategoryName.trim(),
      icon: editCategoryIcon,
    });

    setEditingCategory(null);
  };

  // -- Desztinációk / Régiók (korábban AdminDashboard 'regions' füle) --
  const [addRegionModalOpen, setAddRegionModalOpen] = useState(false);
  const [newRegionCountry, setNewRegionCountry] = useState('');
  const [newRegionFlagCode, setNewRegionFlagCode] = useState('');
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionEmoji, setNewRegionEmoji] = useState('✈️');
  const [newRegionDesc, setNewRegionDesc] = useState('');
  const [newRegionImage, setNewRegionImage] = useState('');

  // Kanban 3337748c: a zaszlo-mezo korabban szabad szoveges emoji-beiras volt
  // (hiba-forras: elgepelt/hianyos regional-indicator par -> nem jelenik meg
  // flag kent). Most Europa osszes orszagabol legordulo valasztas, a zaszlo
  // emoji a kodbol szamitva, igy mindig ervenyes.
  const handleFlagCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setNewRegionFlagCode(code);
    if (!code) return;

    const country = EUROPEAN_COUNTRIES.find((c) => c.code === code);
    setNewRegionEmoji(countryCodeToFlagEmoji(code));
    if (country && !newRegionCountry.trim()) {
      setNewRegionCountry(country.nameHu);
    }
  };

  const handleCreateRegionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionCountry.trim() || !newRegionName.trim()) return;

    await createRegion({
      country: newRegionCountry.trim(),
      name: newRegionName.trim(),
      flag_emoji: newRegionEmoji.trim() || '✈️',
      description: newRegionDesc.trim(),
      image_url: newRegionImage.trim() || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      active: true,
    });

    setNewRegionCountry('');
    setNewRegionFlagCode('');
    setNewRegionName('');
    setNewRegionEmoji('✈️');
    setNewRegionDesc('');
    setNewRegionImage('');
    setAddRegionModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
          Kategóriák
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Úticélok & régiók bővítése, valamint a katalógusban elérhető szolgáltatási típusok kezelése.
        </p>
      </div>

      {/* Szegmens-valto + a szegmensnek megfelelo "+ Uj" gomb egy sorban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1 bg-stone-100 rounded-xl p-1 self-start">
          <button
            type="button"
            onClick={() => setSegment('destinations')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              segment === 'destinations' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Desztinációk / Régiók ({regions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSegment('types')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              segment === 'types' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Szolgáltatás Típusok ({categories.length})</span>
          </button>
        </div>

        {segment === 'destinations' ? (
          <button
            onClick={() => setAddRegionModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">+ Új Régió / Úticél</span>
          </button>
        ) : (
          <button
            onClick={() => setAddCategoryModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">+ Új típus</span>
          </button>
        )}
      </div>

      {/* SZEGMENS: DESZTINÁCIÓK / RÉGIÓK */}
      {segment === 'destinations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map((reg) => {
            const count = programs.filter(p => p.region_id === reg.id || p.region?.slug === reg.slug).length;
            return (
              <div key={reg.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <CountryFlag emoji={reg.flag_emoji} country={reg.country || reg.name} size="lg" className="w-8 h-5.5 rounded shadow" />
                    <button
                      onClick={() => toggleRegionActive(reg.id)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                        reg.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {reg.active ? 'Aktív' : 'Inaktív'}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {reg.country}
                  </div>

                  <h4 className="font-display font-bold text-xl text-stone-900 mt-0.5">
                    {reg.name}
                  </h4>

                  {reg.description && (
                    <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                      {reg.description}
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 font-medium">
                    {count} regisztrált program ebben a régióban
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleRegionActive(reg.id)}
                    className="text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                  >
                    {reg.active ? 'Inaktiválás' : 'Aktiválás'}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Biztosan törölni szeretnéd a(z) ${reg.name} régiót?`)) {
                        deleteRegion(reg.id);
                      }
                    }}
                    className="text-stone-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer"
                    title="Régió törlése"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SZEGMENS: SZOLGÁLTATÁS TÍPUSOK */}
      {segment === 'types' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = programs.filter(p => p.category_id === cat.id || p.category?.slug === cat.slug).length;
            return (
              <div key={cat.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CategoryIcon icon={cat.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-base font-display">
                      {cat.name}
                    </h4>
                    <span className="text-xs text-stone-400">
                      {count} program ebben a típusban
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    className="text-stone-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Szerkesztés & Ikon módosítása"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleCategoryActive(cat.id)}
                    className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {cat.active ? 'Aktív' : 'Inaktív'}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Biztosan törölni szeretnéd a(z) ${cat.name} szolgáltatás típust?`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg cursor-pointer"
                    title="Törlés"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD NEW REGION */}
      {addRegionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddRegionModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Új Desztináció Rögzítése
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  Új Úticél / Régió Hozzáadása
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateRegionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Ország <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRegionCountry}
                    onChange={(e) => setNewRegionCountry(e.target.value)}
                    placeholder="Pl. Görögország vagy Portugália"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Zászló
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={newRegionFlagCode}
                      onChange={handleFlagCountrySelect}
                      className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">Válassz országot...</option>
                      {EUROPEAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {countryCodeToFlagEmoji(c.code)} {c.nameHu}
                        </option>
                      ))}
                    </select>
                    {newRegionFlagCode && (
                      <CountryFlag code={newRegionFlagCode} size="lg" className="w-8 h-5.5 rounded shadow shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Régió / Város neve <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Pl. Kréta vagy Lisszabon"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Rövid leírás / Kiemelt területek
                </label>
                <input
                  type="text"
                  value={newRegionDesc}
                  onChange={(e) => setNewRegionDesc(e.target.value)}
                  placeholder="Pl. Chania, Heraklion, Elafonisi és szurdoktúrák..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Kép URL
                </label>
                <input
                  type="url"
                  value={newRegionImage}
                  onChange={(e) => setNewRegionImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddRegionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Régió Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW SERVICE TYPE / CATEGORY */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddCategoryModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Szolgáltatás Típus
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  Új Szolgáltatás Típus
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Típus megnevezése <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Pl. Helikopteres túra vagy Extrém sport"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Ikon</span>
                  <span className="text-[11px] font-normal text-stone-400">Kattints a kívánt ikonra vagy válassz alább</span>
                </label>

                {/* Visual Icon Grid with Luggage, Bus, Walking Person and more */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2.5 p-2 bg-stone-100/80 rounded-xl border border-stone-200">
                  {AVAILABLE_SERVICE_ICONS.map((opt) => {
                    const isSelected = newCategoryIcon === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewCategoryIcon(opt.value)}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-sm scale-105'
                            : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/80'
                        }`}
                        title={`${opt.label} - ${opt.description}`}
                      >
                        <CategoryIcon icon={opt.value} className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full leading-none">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {AVAILABLE_SERVICE_ICONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.value} ({opt.label} / {opt.description})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Típus Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SZOLGÁLTATÁS TÍPUS SZERKESZTÉSE & IKON MÓDOSÍTÁSA */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CategoryIcon icon={editCategoryIcon} className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Szolgáltatás Típus Szerkesztése
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  {editingCategory.name}
                </h3>
              </div>
            </div>

            <form onSubmit={handleUpdateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Típus megnevezése <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder="Pl. Városnézés & Séta"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Ikon kiválasztása</span>
                  <span className="text-[11px] font-normal text-stone-400">Kattints a kívánt ikonra vagy válassz alább</span>
                </label>

                {/* Visual Icon Grid with Luggage, Bus, Walking Person and more */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2.5 p-2 bg-stone-100/80 rounded-xl border border-stone-200">
                  {AVAILABLE_SERVICE_ICONS.map((opt) => {
                    const isSelected = editCategoryIcon === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditCategoryIcon(opt.value)}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-sm scale-105'
                            : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/80'
                        }`}
                        title={`${opt.label} - ${opt.description}`}
                      >
                        <CategoryIcon icon={opt.value} className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full leading-none">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <select
                  value={editCategoryIcon}
                  onChange={(e) => setEditCategoryIcon(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {AVAILABLE_SERVICE_ICONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.value} ({opt.label} / {opt.description})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Módosítások Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
