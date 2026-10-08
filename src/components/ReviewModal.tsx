import React, { useState } from 'react';
import { Program, Order, TravelType } from '../types/database';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Star, 
  CheckCircle2, 
  Camera, 
  ShieldCheck, 
  Compass, 
  BadgePercent, 
  Clock, 
  Shield, 
  Users, 
  AlertCircle,
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: Program;
  order: Order;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  program,
  order,
  onSuccess
}) => {
  const { addReview, currentUser } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [ratingGuide, setRatingGuide] = useState<number>(5);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingOrg, setRatingOrg] = useState<number>(5);
  const [ratingSafety, setRatingSafety] = useState<number>(5);

  const [travelType, setTravelType] = useState<TravelType>('couple');
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [positiveFeedback, setPositiveFeedback] = useState<string>('');
  const [improvementFeedback, setImprovementFeedback] = useState<string>('');

  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    try {
      new URL(photoUrlInput.trim());
      setPhotos(prev => [...prev, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    } catch {
      setErrorMessage('Kérjük érvényes képhivatkozást (URL-t) adj meg!');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (comment.trim().length < 20) {
      setErrorMessage('Kérjük írj legalább 2-3 mondatos (min. 20 karakter) részletes leírást a személyes tapasztalataidról!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addReview({
        program_id: program.id,
        order_id: order.id,
        rating,
        rating_guide: ratingGuide,
        rating_value: ratingValue,
        rating_organization: ratingOrg,
        rating_safety: ratingSafety,
        title: title.trim() || undefined,
        comment: comment.trim(),
        positive_feedback: positiveFeedback.trim() || undefined,
        improvement_feedback: improvementFeedback.trim() || undefined,
        travel_type: travelType,
        photos: photos.length > 0 ? photos : undefined
      });

      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Hiba történt az értékelés mentésekor.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarPicker = (
    value: number, 
    onChange: (val: number) => void, 
    sizeClass = 'w-6 h-6'
  ) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
          >
            <Star
              className={`${sizeClass} ${
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-stone-300 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const ratingLabel = (val: number) => {
    switch (val) {
      case 5: return 'Fantasztikus élmény (5/5)';
      case 4: return 'Nagyon jó (4/5)';
      case 3: return 'Átlagos, megfelelt (3/5)';
      case 2: return 'Elmaradt az elvárásoktól (2/5)';
      case 1: return 'Csalódás volt (1/5)';
      default: return `${val}/5`;
    }
  };

  const travelTypeOptions: { type: TravelType; label: string; icon: string }[] = [
    { type: 'couple', label: 'Párban', icon: '👫' },
    { type: 'family', label: 'Családdal', icon: '👨‍👩‍👧‍👦' },
    { type: 'friends', label: 'Barátokkal', icon: '👥' },
    { type: 'solo', label: 'Egyedül', icon: '🎒' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Igazolt Vásárlói Értékelés</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-stone-900">
              Hogyan érezted magad a programon?
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5 line-clamp-1">
              {program.title}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification banner */}
        <div className="my-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-stone-700">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            ✓
          </div>
          <div>
            <p className="font-bold text-emerald-900">
              Hiteles, ellenőrzött foglalás
            </p>
            <p className="text-stone-600">
              Résztvevő: <strong>{currentUser?.name || 'Utazó'}</strong> • Rendelés azonosító: <span className="font-mono text-stone-800">{order.id.slice(0, 14)}...</span>
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold font-display text-stone-900">
              Köszönjük a visszajelzésedet!
            </h3>
            <p className="text-stone-600 max-w-md mx-auto text-sm">
              {successMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* 1. Overall Rating */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-center space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Összesített élmény (Fő értékelés) <span className="text-rose-500">*</span>
              </label>
              <div className="flex justify-center">
                {renderStarPicker(rating, setRating, 'w-8 h-8')}
              </div>
              <p className="text-sm font-bold text-emerald-800">
                {ratingLabel(rating)}
              </p>
            </div>

            {/* 2. Sub-criteria breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Részszempontok értékelése (1–5 csillag)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Guide */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Idegenvezető / Túravezető</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Felkészültség, kedvesség, érthetőség</p>
                  </div>
                  <div>{renderStarPicker(ratingGuide, setRatingGuide, 'w-4.5 h-4.5')}</div>
                </div>

                {/* Value for money */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ár-érték arány</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Megérte-e a kifizetett összeget</p>
                  </div>
                  <div>{renderStarPicker(ratingValue, setRatingValue, 'w-4.5 h-4.5')}</div>
                </div>

                {/* Organization */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Szervezés & Menetrend</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Találkozási pont, pontosság, tempó</p>
                  </div>
                  <div>{renderStarPicker(ratingOrg, setRatingOrg, 'w-4.5 h-4.5')}</div>
                </div>

                {/* Safety & Cleanliness */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Biztonság & Minőség</span>
                    </div>
                    <p className="text-[11px] text-stone-500">Jármű tisztasága, biztonságérzet</p>
                  </div>
                  <div>{renderStarPicker(ratingSafety, setRatingSafety, 'w-4.5 h-4.5')}</div>
                </div>
              </div>
            </div>

            {/* 3. Travel Type Picker */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Kivel utaztál ezen a programon? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {travelTypeOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setTravelType(opt.type)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      travelType === opt.type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Review Title & Text */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Véleményed címe (egy rövid összefoglaló mondat)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Csodás nap volt, mindenkinek ajánlom!"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Részletes szöveges vélemény <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Oszd meg személyes benyomásaidat: mi tetszett leginkább a túrán, milyen volt a magyar idegenvezető / sofőr, a hangulat és a programok..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl p-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Legalább 20 karakter ({comment.trim().length}/20)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    👍 Mi tetszett a legjobban? (opcionális)
                  </label>
                  <input
                    type="text"
                    value={positiveFeedback}
                    onChange={(e) => setPositiveFeedback(e.target.value)}
                    placeholder="pl. Kis létszámú csoport, finom ebéd"
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    💡 Fejlesztési javaslat (opcionális)
                  </label>
                  <input
                    type="text"
                    value={improvementFeedback}
                    onChange={(e) => setImprovementFeedback(e.target.value)}
                    placeholder="pl. Kicsit több szabadidő a bazárban"
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. Photos Upload */}
            <div className="space-y-2 border-t border-stone-100 pt-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Saját fotók csatolása a túráról (opcionális)</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/... vagy kép URL"
                  className="flex-1 text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Hozzáadás
                </button>
              </div>

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <span>{submitting ? 'Beküldés...' : 'Értékelés közzététele'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
