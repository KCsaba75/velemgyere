import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  PlusCircle, 
  Upload, 
  Check, 
  Trash2, 
  Sparkles, 
  Star,
  Globe
} from 'lucide-react';
import { ProgramStatus } from '../types/database';

interface NewProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProgramModal: React.FC<NewProgramModalProps> = ({ isOpen, onClose }) => {
  const { categories, regions, createProgram, currentUser, currentProvider } = useApp();

  // Basic info
  const [title, setTitle] = useState('');
  const [regionId, setRegionId] = useState(regions[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  // Dates & times
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [duration, setDuration] = useState('Egész napos (7 óra)');

  // Location & meeting point
  const [location, setLocation] = useState('');
  const [departureLocation, setDepartureLocation] = useState('');

  // Pricing & Language
  const [price, setPrice] = useState<number>(55);
  const [currency, setCurrency] = useState('EUR');
  const [language, setLanguage] = useState('Magyar nyelvű vezetés');
  const [maxParticipants, setMaxParticipants] = useState<string>('16');

  // Included & Not Included lists
  const [includedList, setIncludedList] = useState<string[]>([
    'Helyi magyar nyelvű idegenvezetés / asszisztencia',
    'Kényelmes, klímás járművel való transzfer'
  ]);
  const [newIncludedItem, setNewIncludedItem] = useState('');

  const [notIncludedList, setNotIncludedList] = useState<string[]>([
    'Egyéni meleg étkezés',
    'Múzeumi belépőjegyek'
  ]);
  const [newNotIncludedItem, setNewNotIncludedItem] = useState('');

  // Images state
  const [images, setImages] = useState<{ url: string; isCover: boolean }[]>([
    {
      url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
      isCover: true
    }
  ]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Status choice
  const [status, setStatus] = useState<ProgramStatus>('pending_review');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddIncluded = () => {
    if (newIncludedItem.trim()) {
      setIncludedList([...includedList, newIncludedItem.trim()]);
      setNewIncludedItem('');
    }
  };

  const handleRemoveIncluded = (idx: number) => {
    setIncludedList(includedList.filter((_, i) => i !== idx));
  };

  const handleAddNotIncluded = () => {
    if (newNotIncludedItem.trim()) {
      setNotIncludedList([...notIncludedList, newNotIncludedItem.trim()]);
      setNewNotIncludedItem('');
    }
  };

  const handleRemoveNotIncluded = (idx: number) => {
    setNotIncludedList(notIncludedList.filter((_, i) => i !== idx));
  };

  const handleAddImageUrl = () => {
    if (customImageUrl.trim()) {
      setImages([...images, { url: customImageUrl.trim(), isCover: images.length === 0 }]);
      setCustomImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setImages(prev => [...prev, { url: dataUrl, isCover: prev.length === 0 }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSetCover = (index: number) => {
    setImages(images.map((img, i) => ({
      ...img,
      isCover: i === index
    })));
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (images[index].isCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !shortDescription.trim() || !location.trim() || !departureLocation.trim()) {
      alert('Kérjük töltsd ki az összes kötelező mezőt!');
      return;
    }

    const selectedReg = regions.find(r => r.id === regionId);

    setIsSubmitting(true);
    try {
      await createProgram({
        title: title.trim(),
        region_id: regionId,
        country: selectedReg?.country || 'Külföld',
        category_id: categoryId,
        short_description: shortDescription.trim(),
        description: description.trim() || shortDescription.trim(),
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        duration: duration.trim(),
        location: location.trim(),
        departure_location: departureLocation.trim(),
        price: Number(price) || 0,
        currency,
        language: language.trim() || 'Magyar nyelvű vezetés',
        max_participants: maxParticipants ? Number(maxParticipants) : undefined,
        included: includedList,
        not_included: notIncludedList,
        status: status,
      }, images);

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-extrabold text-stone-900">
                Új Külföldi Program / Transzfer Létrehozása
              </h3>
              <p className="text-xs text-stone-500">
                Szolgáltató: <strong className="text-stone-700">{currentProvider?.company_name || currentUser.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Alapadatok & Régió */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Alapadatok & Úticél</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Program / Transzfer neve <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pl. Troodos-hegység & Kykkos kolostor kirándulás magyarul"
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Úticél / Régió <span className="text-rose-500">*</span>
                </label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.flag_emoji} {r.country} – {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Szolgáltatás Típusa <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nyelvgarancia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Pl. Magyar nyelvű vezetés vagy Magyar sofőr"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Időtartam megnevezése <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Pl. Egész napos (8 óra) vagy 50 perc"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Rövid leírás (összefoglaló a kártyára) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="1-2 mondatos kedvcsináló a külföldi élményről..."
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Részletes leírás <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Írd le a teljes útitervet, megállókat, praktikus tudnivalókat..."
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              ></textarea>
            </div>
          </div>

          {/* Section 2: Időpont & Helyszín */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              2. Időpont & Helyszínek
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Dátum <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Kezdési idő <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Befejezési idő <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Helyszín / Város <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Pl. Barcelona, Spanyolország vagy Ayia Napa, Ciprus"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Felszállási / Találkozási pont <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={departureLocation}
                  onChange={(e) => setDepartureLocation(e.target.value)}
                  placeholder="Pl. Szállodai felvétel vagy Sagrada Família bejárat"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ár & Férőhely */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              3. Ár & Férőhelyek
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Részvételi díj / fő <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="55"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Pénznem <span className="text-rose-500">*</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="Ft">Ft (HUF)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Maximális létszám <span className="text-stone-400 font-normal">(fő)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="16"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Mit tartalmaz & nem tartalmaz */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              4. Tartalom (Mit tartalmaz és mit nem)
            </h4>

            {/* Included */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                Mit tartalmaz az ár?
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newIncludedItem}
                  onChange={(e) => setNewIncludedItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIncluded(); } }}
                  placeholder="Pl. Magyar idegenvezetés a teljes nap folyamán"
                  className="flex-1 text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddIncluded}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  + Hozzáadás
                </button>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {includedList.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIncluded(idx)}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Not included */}
            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
              <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-2">
                Mit NEM tartalmaz az ár?
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newNotIncludedItem}
                  onChange={(e) => setNewNotIncludedItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNotIncluded(); } }}
                  placeholder="Pl. Múzeumi belépő vagy egyéni ebéd"
                  className="flex-1 text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddNotIncluded}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  + Hozzáadás
                </button>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {notIncludedList.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-500 font-bold">✕</span>
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNotIncluded(idx)}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 5: Képek */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              5. Program Képek
            </h4>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center bg-stone-50 hover:bg-emerald-50/20">
                <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs font-semibold text-stone-800">Kép feltöltése gépről</span>
                <span className="text-[10px] text-stone-500">JPG, PNG formátum</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 flex flex-col justify-center gap-1.5">
                <span className="text-xs font-medium text-stone-600">Vagy kép URL megadása:</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Hozzáadás
                  </button>
                </div>
              </div>
            </div>

            {/* Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 group bg-stone-100">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.isCover && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span>Fő/Borító</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                    {!img.isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(idx)}
                        className="p-1 bg-white text-stone-900 rounded text-[10px] font-semibold hover:bg-amber-100 cursor-pointer"
                      >
                        Borító
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 bg-rose-600 text-white rounded text-[10px] font-semibold hover:bg-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Státusz */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              6. Státusz
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label 
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  status === 'pending_review' 
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200' 
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="prog_status"
                  checked={status === 'pending_review'}
                  onChange={() => setStatus('pending_review')}
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <div className="font-bold text-stone-900 text-sm">Beküldés jóváhagyásra (pending_review)</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Az adminisztrátor ellenőrzi a programot a publikálás előtt.
                  </div>
                </div>
              </label>

              <label 
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  status === 'draft' 
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200' 
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="prog_status"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <div className="font-bold text-stone-900 text-sm">Mentés piszkozatként (draft)</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Később bármikor visszatérhetsz és folytathatod a szerkesztést.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Mentés...' : status === 'pending_review' ? 'Beküldés Admin Jóváhagyásra' : 'Mentés Piszkozatként'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
