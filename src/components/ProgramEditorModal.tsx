import React, { useState, useEffect } from 'react';
import { useApp, formatPrice, formatHuf, formatProgramDisplayDate } from '../context/AppContext';
import {
  PlusCircle,
  Edit3,
  Upload,
  Check,
  Trash2,
  Sparkles,
  Star,
  FileText,
  Loader2,
  BadgeEuro,
  Layers,
  Users,
  Calendar,
  Ban,
  RotateCcw,
  FileEdit,
  ArrowRight,
  Eye,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Program, ProgramStatus, ProgramPriceTier, ProgramOccurrence } from '../types/database';
import { supabase } from '../lib/supabase';
import { uploadProgramImage } from '../lib/imageUpload';
import { CategoryIcon } from './CategoryIcon';
import { CountryFlag } from './CountryFlag';

interface ProgramEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  programToEdit?: Program | null;
  initialTab?: EditorTab;
}

const WEEKDAYS: { label: string; value: number }[] = [
  { label: 'H', value: 1 },
  { label: 'K', value: 2 },
  { label: 'Sz', value: 3 },
  { label: 'Cs', value: 4 },
  { label: 'P', value: 5 },
  { label: 'Szo', value: 6 },
  { label: 'V', value: 0 },
];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

// Kanban 70afbb5a: az eredeti ProgramOccurrencesModal-bol atvett fuggveny
// `cursor.toISOString().split('T')[0]`-t hasznalt, ami UTC-re konvertal egy
// LOKALIS ejfeli Date-et -- Europe/Budapest-en (UTC+1/+2) ez mindig EGY NAPPAL
// korabbi datum-stringet adott (pl. hetfo-valasztas vasarnapot generalt),
// elesben igazolva Playwright-teszttel. toLocalDateStr a lokalis naptari
// mezokbol rakja ossze a stringet, nincs UTC-eltolodas.
function generateDatesInRange(startDate: string, endDate: string, weekdays: Set<number>): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cursor <= end) {
    if (weekdays.has(cursor.getDay())) {
      dates.push(toLocalDateStr(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// 6171b71e: a wizard mod ('preview'/'confirm') csak UJ program letrehozasakor
// aktiv (lasd isWizardMode lejjebb) -- meglevo program szerkesztesenel ezek a
// lepesek sosem jelennek meg, az EditorTab-ba valo felvetelük csak annyit tesz,
// hogy a handleSelectTab/ensureWorkingProgram meglevo (valtozatlan) logikaja
// ujrahasznosithato a wizard "Tovabb" gombjahoz is.
type EditorTab = 'basic' | 'pricing' | 'occurrences' | 'preview' | 'confirm';

// Kanban 70afbb5a point 2: a korabban 3 kulon modalra szort "uj program / szerkesztes"
// (NewProgramModal) + "arazas" (ProgramPricingModal) + "idopontok" (ProgramOccurrencesModal)
// folyamat EGY modalba, tab-okkal. A kritikus korlat: az ar-savok es idopontok mindketto
// letezo program.id-t igenyel (FK), ezert UJ program eseten a 2./3. tabra valtaskor
// automatikusan piszkozatkent letrehozzuk a programot (Zora dontese, msg 3361/3) --
// a vegso "Kozzetetel" az Alapadatok tab explicit statusz-valasztasa/mentese marad, nem
// valtozik a tab-valtas automatikus mentese miatt.
export const ProgramEditorModal: React.FC<ProgramEditorModalProps> = ({ isOpen, onClose, programToEdit, initialTab }) => {
  const {
    categories, regions, createProgram, updateProgram, currentUser, currentProvider,
    getProgramPriceTiers, createPriceTier, deletePriceTier,
    getProgramOccurrences, createOccurrences, updateOccurrence, deleteOccurrence,
    computeTotalPrice, eurHufRate,
  } = useApp();

  // 6171b71e: UJ program letrehozasakor iranyitott varazslo-folyam (5 lepes,
  // csak Vissza/Elore navigacio), MEGLEVO program szerkesztesenel a jelenlegi
  // szabadon ugralhato fulos nezet marad valtozatlanul -- lasd kartya-brief.
  const isWizardMode = !programToEdit;

  const [activeTab, setActiveTab] = useState<EditorTab>('basic');
  // A tenyleges mentett/auto-draftelt program -- programToEdit-bol jon, vagy az elso
  // tab-valtaskor auto-mentve. Amig null, az Arazas/Idopontok tab meg nem hasznalhato.
  const [workingProgram, setWorkingProgram] = useState<Program | null>(null);
  const [draftCreating, setDraftCreating] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // --- Alapadatok (volt NewProgramModal) ---
  const [title, setTitle] = useState('');
  const [regionId, setRegionId] = useState(regions[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [duration, setDuration] = useState('Egész napos (7 óra)');

  const [location, setLocation] = useState('');
  const [departureLocation, setDepartureLocation] = useState('');

  const [price, setPrice] = useState<string>('55');
  const [currency, setCurrency] = useState('EUR');
  const [language, setLanguage] = useState('Magyar nyelvű vezetés');
  const [maxParticipants, setMaxParticipants] = useState<string>('16');

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

  const [images, setImages] = useState<{ url: string; isCover: boolean; thumbUrl?: string }[]>([
    {
      url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
      isCover: true
    }
  ]);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [status, setStatus] = useState<ProgramStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Árazás (volt ProgramPricingModal) ---
  const [pricingMode, setPricingMode] = useState<'per_person' | 'tiered'>('per_person');
  const [savingMode, setSavingMode] = useState(false);
  const [tiers, setTiers] = useState<ProgramPriceTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [minParticipants, setMinParticipants] = useState('1');
  const [tierMaxParticipants, setTierMaxParticipants] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [addingTier, setAddingTier] = useState(false);

  // --- Időpontok (volt ProgramOccurrencesModal) ---
  const [occurrences, setOccurrences] = useState<ProgramOccurrence[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [occurrencesError, setOccurrencesError] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState(new Date().toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [generatingOccurrences, setGeneratingOccurrences] = useState(false);

  // Alapadat-mezok + workingProgram szinkronizalasa megnyitaskor / programToEdit valtaskor
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(programToEdit && initialTab ? initialTab : 'basic');
    setDraftError(null);
    if (programToEdit) {
      setWorkingProgram(programToEdit);
      if (initialTab === 'pricing') reloadTiers(programToEdit.id);
      if (initialTab === 'occurrences') reloadOccurrences(programToEdit.id);
      setTitle(programToEdit.title || '');
      setRegionId(programToEdit.region_id || regions[0]?.id || '');
      setCategoryId(programToEdit.category_id || categories[0]?.id || '');
      setShortDescription(programToEdit.short_description || '');
      setDescription(programToEdit.description || '');
      setEventDate(programToEdit.event_date || new Date().toISOString().split('T')[0]);
      setStartTime(programToEdit.start_time || '09:00');
      setEndTime(programToEdit.end_time || '16:00');
      setDuration(programToEdit.duration || 'Egész napos (7 óra)');
      setLocation(programToEdit.location || '');
      setDepartureLocation(programToEdit.departure_location || '');
      setPrice(programToEdit.price != null ? String(programToEdit.price) : '0');
      setCurrency(programToEdit.currency || 'EUR');
      setLanguage(programToEdit.language || 'Magyar nyelvű vezetés');
      setMaxParticipants(programToEdit.max_participants ? String(programToEdit.max_participants) : '');
      setIncludedList(programToEdit.included ? [...programToEdit.included] : []);
      setNotIncludedList(programToEdit.not_included ? [...programToEdit.not_included] : []);
      if (programToEdit.images && programToEdit.images.length > 0) {
        setImages(programToEdit.images.map(img => ({ url: img.image_url, thumbUrl: img.thumb_url || undefined, isCover: Boolean(img.is_cover) })));
      } else {
        setImages([{ url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', isCover: true }]);
      }
      setStatus(programToEdit.status === 'published' ? 'published' : 'draft');
      setPricingMode(programToEdit.pricing_mode);
    } else {
      setWorkingProgram(null);
      setTitle('');
      setRegionId(regions[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setShortDescription('');
      setDescription('');
      setEventDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('16:00');
      setDuration('Egész napos (7 óra)');
      setLocation('');
      setDepartureLocation('');
      setPrice('55');
      setCurrency('EUR');
      setLanguage('Magyar nyelvű vezetés');
      setMaxParticipants('16');
      setIncludedList([
        'Helyi magyar nyelvű idegenvezetés / asszisztencia',
        'Kényelmes, klímás járművel való transzfer'
      ]);
      setNotIncludedList(['Egyéni meleg étkezés', 'Múzeumi belépőjegyek']);
      setImages([{ url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', isCover: true }]);
      setStatus('draft');
      setPricingMode('per_person');
    }
    setTiers([]);
    setOccurrences([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, programToEdit, initialTab, regions, categories]);

  const reloadTiers = async (programId: string) => {
    setLoadingTiers(true);
    const rows = await getProgramPriceTiers(programId);
    setTiers(rows);
    setLoadingTiers(false);
  };

  const reloadOccurrences = async (programId: string) => {
    setLoadingOccurrences(true);
    const rows = await getProgramOccurrences(programId);
    setOccurrences(rows);
    setLoadingOccurrences(false);
  };

  // Uj program eseten az Arazas/Idopontok tabra valtaskor auto-draft-mentes, mert
  // a tiers/occurrences tabla FK-ja letezo program.id-t igenyel (lasd fenti kanban-jegyzet).
  const ensureWorkingProgram = async (): Promise<Program | null> => {
    if (workingProgram) return workingProgram;
    if (!title.trim() || !shortDescription.trim() || !location.trim() || !departureLocation.trim()) {
      setDraftError('Mielőtt árazást/időpontot adnál meg, töltsd ki az Alapadatok kötelező mezőit (cím, rövid leírás, helyszín, találkozási pont).');
      return null;
    }
    setDraftCreating(true);
    setDraftError(null);
    try {
      const selectedReg = regions.find(r => r.id === regionId);
      const payload = {
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
        status: 'draft' as ProgramStatus,
      };
      const newId = await createProgram(payload, images);
      const draft: Program = {
        id: newId,
        provider_id: currentProvider?.id || '',
        category_id: payload.category_id,
        region_id: payload.region_id,
        title: payload.title,
        slug: '',
        short_description: payload.short_description,
        location: payload.location,
        country: payload.country,
        event_date: payload.event_date,
        duration: payload.duration,
        price: payload.price,
        currency: payload.currency,
        pricing_mode: 'per_person',
        language: payload.language,
        status: 'draft',
        featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: payload.description,
        departure_location: payload.departure_location,
        start_time: payload.start_time,
        end_time: payload.end_time,
        included: payload.included,
        not_included: payload.not_included,
        max_participants: payload.max_participants,
      };
      setWorkingProgram(draft);
      setStatus('draft');
      return draft;
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Hiba történt a piszkozat mentésekor.');
      return null;
    } finally {
      setDraftCreating(false);
    }
  };

  const handleSelectTab = async (tab: EditorTab) => {
    if (tab === 'basic') {
      setActiveTab('basic');
      return;
    }
    const wp = await ensureWorkingProgram();
    if (!wp) return;
    setActiveTab(tab);
    if (tab === 'pricing') await reloadTiers(wp.id);
    if (tab === 'occurrences') await reloadOccurrences(wp.id);
  };

  // Wizard mod lepes-sorrendje -- a "Tovabb"/"Vissza" gomb ezen lepked, a
  // meglevo handleSelectTab (ensureWorkingProgram + tiers/occurrences reload)
  // valtozatlan logikajat hasznalva ujra, hogy ne legyen duplikalt mentes-kod.
  const WIZARD_STEP_ORDER: EditorTab[] = ['basic', 'pricing', 'occurrences', 'preview', 'confirm'];

  const handleWizardNext = async () => {
    const next = WIZARD_STEP_ORDER[WIZARD_STEP_ORDER.indexOf(activeTab) + 1];
    if (next) await handleSelectTab(next);
  };

  const handleWizardBack = () => {
    const prev = WIZARD_STEP_ORDER[WIZARD_STEP_ORDER.indexOf(activeTab) - 1];
    if (prev) setActiveTab(prev);
  };

  if (!isOpen) return null;

  // --- Alapadatok handlers ---
  const handleAddIncluded = () => {
    if (newIncludedItem.trim()) {
      setIncludedList([...includedList, newIncludedItem.trim()]);
      setNewIncludedItem('');
    }
  };
  const handleRemoveIncluded = (idx: number) => setIncludedList(includedList.filter((_, i) => i !== idx));
  const handleAddNotIncluded = () => {
    if (newNotIncludedItem.trim()) {
      setNotIncludedList([...notIncludedList, newNotIncludedItem.trim()]);
      setNewNotIncludedItem('');
    }
  };
  const handleRemoveNotIncluded = (idx: number) => setNotIncludedList(notIncludedList.filter((_, i) => i !== idx));

  const handleAddImageUrl = () => {
    if (customImageUrl.trim()) {
      setImages([...images, { url: customImageUrl.trim(), isCover: images.length === 0 }]);
      setCustomImageUrl('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const providerId = currentProvider?.id;
    if (!providerId) {
      setUploadError('Kép feltöltéséhez szolgáltatói fiók szükséges.');
      return;
    }
    setUploadError(null);
    const fileList = Array.from(files);
    setUploadingCount(prev => prev + fileList.length);
    for (const file of fileList) {
      try {
        const { url, thumbUrl } = await uploadProgramImage(supabase, providerId, file);
        setImages(prev => [...prev, { url, thumbUrl, isCover: prev.length === 0 }]);
      } catch (err) {
        console.error('Kép feltöltése sikertelen:', err);
        setUploadError(err instanceof Error ? err.message : 'Kép feltöltése sikertelen, próbáld újra.');
      } finally {
        setUploadingCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleSetCover = (index: number) => {
    setImages(images.map((img, i) => ({ ...img, isCover: i === index })));
  };
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (images[index].isCover && newImages.length > 0) newImages[0].isCover = true;
    setImages(newImages);
  };

  // Kivonva a handleSubmit-bol (6171b71e), hogy a wizard zaro lepesenek ket
  // kulon gombja (piszkozat / kozzetetel) is hivhassa a status-radio UI
  // nelkul, a payload-epites duplikalasa nelkul.
  const saveProgram = async (targetStatus: ProgramStatus) => {
    if (!title.trim() || !shortDescription.trim() || !location.trim() || !departureLocation.trim()) {
      alert('Kérjük töltsd ki az összes kötelező mezőt!');
      return;
    }

    const selectedReg = regions.find(r => r.id === regionId);
    setIsSubmitting(true);
    try {
      const payload = {
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
        status: targetStatus,
      };

      if (workingProgram) {
        // Mar letezik (eredeti szerkesztes VAGY korabbi tab-valtaskor auto-draftelt) -- update.
        await updateProgram(workingProgram.id, payload, images);
      } else {
        await createProgram(payload, images);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Hiba történt a mentés során: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProgram(status === 'draft' ? 'draft' : 'published');
  };

  // --- Árazás handlers ---
  const handlePricingModeChange = async (mode: 'per_person' | 'tiered') => {
    if (!workingProgram || mode === pricingMode) return;
    if (mode === 'tiered' && tiers.length === 0) {
      setPricingError('Mielőtt sávos árazásra váltasz, adj hozzá legalább egy sávot lent.');
      return;
    }
    setSavingMode(true);
    setPricingError(null);
    try {
      await updateProgram(workingProgram.id, { pricing_mode: mode });
      setPricingMode(mode);
      setWorkingProgram({ ...workingProgram, pricing_mode: mode });
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : 'Hiba történt az árazási mód módosításakor.');
    } finally {
      setSavingMode(false);
    }
  };

  const handleAddTier = async () => {
    if (!workingProgram) return;
    setPricingError(null);
    const min = parseInt(minParticipants, 10);
    const max = tierMaxParticipants.trim() === '' ? null : parseInt(tierMaxParticipants, 10);
    const total = parseFloat(totalPrice);
    if (!Number.isFinite(min) || min < 1) {
      setPricingError('A minimum létszám legalább 1 kell legyen.');
      return;
    }
    if (max !== null && (!Number.isFinite(max) || max < min)) {
      setPricingError('A maximum létszám nem lehet kisebb a minimumnál (vagy hagyd üresen, ha nincs felső határ).');
      return;
    }
    if (!Number.isFinite(total) || total < 0) {
      setPricingError('Adj meg egy érvényes, nem negatív összeget a sáv teljes árának.');
      return;
    }
    setAddingTier(true);
    try {
      await createPriceTier(workingProgram.id, { min_participants: min, max_participants: max, total_price: total });
      await reloadTiers(workingProgram.id);
      setMinParticipants(String((max ?? min) + 1));
      setTierMaxParticipants('');
      setTotalPrice('');
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : 'Hiba történt a sáv mentésekor.');
    } finally {
      setAddingTier(false);
    }
  };

  const handleDeleteTier = async (tier: ProgramPriceTier) => {
    if (!workingProgram) return;
    const rangeLabel = tier.max_participants ? `${tier.min_participants}-${tier.max_participants} fő` : `${tier.min_participants}+ fő`;
    if (!window.confirm(`Biztosan törlöd a "${rangeLabel}" sávot?`)) return;
    setPricingError(null);
    try {
      await deletePriceTier(tier.id);
      await reloadTiers(workingProgram.id);
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : 'Hiba történt a sáv törlésekor.');
    }
  };

  // --- Időpontok handlers ---
  const toggleWeekday = (value: number) => {
    setSelectedWeekdays(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleGenerateOccurrences = async () => {
    if (!workingProgram) return;
    if (selectedWeekdays.size === 0) {
      setOccurrencesError('Válassz legalább egy napot.');
      return;
    }
    const dates = generateDatesInRange(rangeStart, rangeEnd, selectedWeekdays);
    if (dates.length === 0) {
      setOccurrencesError('A megadott tartományban nincs a kiválasztott napokra eső dátum.');
      return;
    }
    setGeneratingOccurrences(true);
    setOccurrencesError(null);
    try {
      await createOccurrences(workingProgram.id, dates);
      await reloadOccurrences(workingProgram.id);
    } catch (err) {
      setOccurrencesError(err instanceof Error ? err.message : 'Hiba történt a generálás során.');
    } finally {
      setGeneratingOccurrences(false);
    }
  };

  const handleToggleOccurrenceStatus = async (occ: ProgramOccurrence) => {
    if (!workingProgram) return;
    setOccurrencesError(null);
    try {
      await updateOccurrence(occ.id, { status: occ.status === 'open' ? 'cancelled' : 'open' });
      await reloadOccurrences(workingProgram.id);
    } catch (err) {
      setOccurrencesError(err instanceof Error ? err.message : 'Hiba történt az állapot módosításakor.');
    }
  };

  const handleDeleteOccurrence = async (occ: ProgramOccurrence) => {
    if (!workingProgram) return;
    if (!window.confirm(`Biztosan törölni szeretnéd ezt az időpontot (${occ.event_date})?`)) return;
    setOccurrencesError(null);
    try {
      await deleteOccurrence(occ.id);
      await reloadOccurrences(workingProgram.id);
    } catch (err) {
      setOccurrencesError(err instanceof Error ? err.message : 'Hiba történt a törlés során.');
    }
  };

  const curr = currency === 'EUR' ? '€' : currency;

  const TABS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: 'Alapadatok', icon: <FileEdit className="w-4 h-4" /> },
    { key: 'pricing', label: 'Árazás', icon: <BadgeEuro className="w-4 h-4" /> },
    { key: 'occurrences', label: 'Időpontok', icon: <Calendar className="w-4 h-4" /> },
  ];

  // 6171b71e: uj-program wizard lepes-sora (csak isWizardMode-ban hasznalt,
  // csak-informativ progress-sav, nem kattinthato -- a navigacio a Vissza/
  // Elore gombokkal megy, nem a lepes-fejjel).
  const WIZARD_STEPS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
    ...TABS,
    { key: 'preview', label: 'Előnézet', icon: <Eye className="w-4 h-4" /> },
    { key: 'confirm', label: 'Záró döntés', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];
  const wizardStepIndex = WIZARD_STEPS.findIndex(s => s.key === activeTab);
  const previewCategory = categories.find(c => c.id === categoryId);
  const previewRegion = regions.find(r => r.id === regionId);
  const previewCoverEntry = images.find(img => img.isCover) || images[0];
  const previewCoverUrl = previewCoverEntry?.thumbUrl || previewCoverEntry?.url;
  const previewDisplayPrice = computeTotalPrice(Number(price) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              {programToEdit ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-display text-2xl font-extrabold text-stone-900">
                {programToEdit ? 'Program Szerkesztése' : 'Új Külföldi Program / Transzfer Létrehozása'}
              </h3>
              <p className="text-xs text-stone-500">
                Alapadatok, árazás és időpontok egy helyen • <strong className="text-stone-700">{currentProvider?.company_name || currentUser.name}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tabs -- csak szerkesztes-modban (szabadon ugralhato), uj program eseten a wizard-progress jon helyette */}
        {!isWizardMode && (
          <div className="flex items-center gap-1.5 mb-5 bg-stone-100 p-1 rounded-xl">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                data-testid={`editor-tab-${tab.key}`}
                onClick={() => handleSelectTab(tab.key)}
                disabled={draftCreating}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-colors disabled:opacity-60 ${
                  activeTab === tab.key ? 'bg-white text-emerald-700 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {draftCreating && tab.key !== 'basic' ? <Loader2 className="w-4 h-4 animate-spin" /> : tab.icon}
                <span>{tab.label}</span>
                {tab.key !== 'basic' && !workingProgram && <span className="text-[10px] text-stone-400 font-normal">(mentés után)</span>}
              </button>
            ))}
          </div>
        )}

        {/* Wizard progress -- csak-informativ, nem kattinthato; a navigacio Vissza/Elore gombbal megy (alant) */}
        {isWizardMode && (
          <div className="flex items-center gap-1 mb-5" data-testid="wizard-progress">
            {WIZARD_STEPS.map((step, idx) => {
              const isDone = idx < wizardStepIndex;
              const isCurrent = idx === wizardStepIndex;
              return (
                <React.Fragment key={step.key}>
                  <div
                    data-testid={`wizard-step-${step.key}`}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold ${
                      isCurrent ? 'bg-emerald-50 text-emerald-700' : isDone ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded ${isDone ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {draftError && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl mb-4">
            {draftError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ===== TAB: Alapadatok ===== */}
          <div className={activeTab === 'basic' ? 'space-y-6' : 'hidden'}>
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">1. Alapadatok & Úticél</h4>
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
                      <option key={r.id} value={r.id}>{r.flag_emoji} {r.country} – {r.name}</option>
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
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
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

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">2. Időpont & Helyszínek</h4>
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

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">3. Alapár & Férőhelyek</h4>
              <p className="text-xs text-stone-400">
                Ez a fejenkénti alapár. Sávos (csoportos) árazáshoz lásd az Árazás tabot a mentés után.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Részvételi díj / fő <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                      setPrice(val);
                    }}
                    onFocus={() => setPrice('')}
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
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0')) val = val.replace(/^0+/, '');
                      setMaxParticipants(val);
                    }}
                    onFocus={() => setMaxParticipants('')}
                    placeholder="16"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">4. Tartalom (Mit tartalmaz és mit nem)</h4>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Mit tartalmaz az ár?</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newIncludedItem}
                    onChange={(e) => setNewIncludedItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIncluded(); } }}
                    placeholder="Pl. Magyar idegenvezetés a teljes nap folyamán"
                    className="flex-1 text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="button" onClick={handleAddIncluded} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0">+ Hozzáadás</button>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {includedList.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                      <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" />{item}</span>
                      <button type="button" onClick={() => handleRemoveIncluded(idx)} className="text-stone-400 hover:text-rose-600 cursor-pointer p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-2">Mit NEM tartalmaz az ár?</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newNotIncludedItem}
                    onChange={(e) => setNewNotIncludedItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNotIncluded(); } }}
                    placeholder="Pl. Múzeumi belépő vagy egyéni ebéd"
                    className="flex-1 text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="button" onClick={handleAddNotIncluded} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0">+ Hozzáadás</button>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {notIncludedList.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                      <span className="flex items-center gap-1.5"><span className="text-rose-500 font-bold">✕</span>{item}</span>
                      <button type="button" onClick={() => handleRemoveNotIncluded(idx)} className="text-stone-400 hover:text-rose-600 cursor-pointer p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">5. Program Képek</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center bg-stone-50 hover:bg-emerald-50/20">
                  <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="text-xs font-semibold text-stone-800">Kép feltöltése gépről</span>
                  <span className="text-[10px] text-stone-500">JPG, PNG formátum</span>
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                  {uploadingCount > 0 && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kép feltöltése és optimalizálása ({uploadingCount})...
                    </p>
                  )}
                  {uploadError && <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>}
                  <span className="text-xs font-medium text-stone-600">Vagy kép URL megadása:</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 text-xs bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button type="button" onClick={handleAddImageUrl} className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer">Hozzáadás</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 group bg-stone-100">
                    <img src={img.thumbUrl || img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {img.isCover && (
                      <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-white" /><span>Fő/Borító</span>
                      </div>
                    )}
                    <div className="absolute bottom-1 inset-x-1 flex items-center justify-center gap-1.5">
                      {!img.isCover && (
                        <button type="button" onClick={() => handleSetCover(idx)} className="px-1.5 py-1 bg-white/95 text-stone-900 rounded text-[10px] font-semibold hover:bg-amber-100 cursor-pointer shadow">Borító</button>
                      )}
                      <button type="button" onClick={() => handleRemoveImage(idx)} className="px-1.5 py-1 bg-rose-600/95 text-white rounded text-[10px] font-semibold hover:bg-rose-700 cursor-pointer shadow"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard modban a status-valasztas a zaro (5.) lepesre kerul at (lasd lejjebb) -- itt csak szerkesztes-modban jelenik meg, a mai helyen. */}
            {!isWizardMode && (
              <div className="space-y-4 pt-4 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">6. Státusz és közzététel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${status === 'published' ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="prog_status" checked={status === 'published'} onChange={() => setStatus('published')} className="mt-1 accent-emerald-600" />
                    <div>
                      <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-600" /><span>Publikálás (Azonnal aktív)</span></div>
                      <div className="text-xs text-stone-500 mt-1">A program azonnal aktívvá válik és megjelenik a katalógusban. Nincs szükség külön admin jóváhagyásra!</div>
                    </div>
                  </label>
                  <label className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${status === 'draft' ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="prog_status" checked={status === 'draft'} onChange={() => setStatus('draft')} className="mt-1 accent-emerald-600" />
                    <div>
                      <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><FileText className="w-4 h-4 text-stone-600" /><span>Mentés piszkozatként (draft)</span></div>
                      <div className="text-xs text-stone-500 mt-1">Csak te látod a szolgáltatói felületeden, a katalógusban rejtve marad. Később bármikor közzéteheted.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ===== TAB: Árazás ===== */}
          <div className={activeTab === 'pricing' ? 'space-y-5' : 'hidden'}>
            {!workingProgram ? (
              <div className="text-center py-10 text-stone-400 text-sm">Előbb mentsd az Alapadatokat (lásd fent), onnantól itt is dolgozhatsz.</div>
            ) : (
              <>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">Árazási mód</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingMode}
                      onClick={() => handlePricingModeChange('per_person')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors disabled:opacity-50 ${pricingMode === 'per_person' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'}`}
                    >
                      <Users className="w-4 h-4" /> Fejenkénti ár
                    </button>
                    <button
                      type="button"
                      disabled={savingMode}
                      onClick={() => handlePricingModeChange('tiered')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors disabled:opacity-50 ${pricingMode === 'tiered' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'}`}
                    >
                      <Layers className="w-4 h-4" /> Sávos (csoportos) ár
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-2.5">
                    {pricingMode === 'per_person'
                      ? `Fejenkénti ár: ${formatPrice(Number(price) || 0)} ${curr} / fő, a végösszeg a résztvevők számával szorzódik.`
                      : 'Sávos ár: a csoport létszámától függő, a sávhoz tartozó FIX összeg a teljes csoportra (nem fejenként).'}
                  </p>
                </div>

                {pricingError && (
                  <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">{pricingError}</div>
                )}

                {pricingMode === 'per_person' && (
                  <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5">
                    A lent felvett sávok csak akkor lépnek életbe, ha fent átváltasz Sávos (csoportos) árra.
                  </div>
                )}

                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Új sáv hozzáadása</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Min. fő</label>
                      <input
                        type="number"
                        min={1}
                        data-testid="editor-tier-min"
                        value={minParticipants}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1 && val.startsWith('0')) val = val.replace(/^0+/, '');
                          setMinParticipants(val);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTier(); } }}
                        className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Max. fő (üres = nincs felső határ)</label>
                      <input
                        type="number"
                        min={1}
                        data-testid="editor-tier-max"
                        value={tierMaxParticipants}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1 && val.startsWith('0')) val = val.replace(/^0+/, '');
                          setTierMaxParticipants(val);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTier(); } }}
                        placeholder="∞"
                        className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Teljes ár ({curr}, csoportra)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        data-testid="editor-tier-price"
                        value={totalPrice}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                          setTotalPrice(val);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTier(); } }}
                        placeholder="Pl. 150"
                        className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <button type="button" onClick={handleAddTier} disabled={addingTier} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer">
                    {addingTier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    <span>{addingTier ? 'Mentés...' : 'Sáv hozzáadása'}</span>
                  </button>
                </div>

                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Meglévő sávok ({tiers.length})</h4>
                {loadingTiers ? (
                  <div className="text-center py-8 text-stone-400 text-sm">Betöltés...</div>
                ) : tiers.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">Még nincs egyetlen sáv sem felvéve.</div>
                ) : (
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                    {tiers.map(tier => (
                      <div key={tier.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-stone-800">
                          {tier.max_participants ? `${tier.min_participants}-${tier.max_participants} fő` : `${tier.min_participants}+ fő`}
                        </span>
                        <div className="flex items-center gap-3">
                          <strong className="text-emerald-700 font-bold">{formatPrice(tier.total_price)} {curr}</strong>
                          <button onClick={() => handleDeleteTier(tier)} title="Törlés" className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===== TAB: Időpontok ===== */}
          <div className={activeTab === 'occurrences' ? 'space-y-5' : 'hidden'}>
            {!workingProgram ? (
              <div className="text-center py-10 text-stone-400 text-sm">Előbb mentsd az Alapadatokat (lásd fent), onnantól itt is dolgozhatsz.</div>
            ) : (
              <>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">Ismétlődő minta legenerálása</h4>
                  <div className="flex gap-1.5 mb-3">
                    {WEEKDAYS.map(wd => (
                      <button
                        key={wd.value}
                        type="button"
                        onClick={() => toggleWeekday(wd.value)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${selectedWeekdays.has(wd.value) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'}`}
                      >
                        {wd.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Tól</label>
                      <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Ig</label>
                      <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mb-3">Az időpont, hely és létszám a programból öröklődik, hacsak az adott alkalmat utólag külön nem módosítod.</p>
                  <button
                    type="button"
                    onClick={handleGenerateOccurrences}
                    disabled={generatingOccurrences}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {generatingOccurrences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    <span>{generatingOccurrences ? 'Generálás...' : 'Időpontok legenerálása'}</span>
                  </button>
                </div>

                {occurrencesError && (
                  <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">{occurrencesError}</div>
                )}

                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Meglévő időpontok ({occurrences.length})</h4>
                {loadingOccurrences ? (
                  <div className="text-center py-8 text-stone-400 text-sm">Betöltés...</div>
                ) : occurrences.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">Még nincs egyetlen időpont sem felvéve.</div>
                ) : (
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    {occurrences.map(occ => (
                      <div key={occ.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-800">
                            {new Date(occ.event_date + 'T00:00:00').toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${occ.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                            {occ.status === 'open' ? 'Nyitott' : 'Lezárva'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleOccurrenceStatus(occ)} title={occ.status === 'open' ? 'Lezárás' : 'Megnyitás'} className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer">
                            {occ.status === 'open' ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteOccurrence(occ)} title="Törlés" className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===== TAB (wizard-only): Elonezet ===== */}
          {isWizardMode && (
            <div className={activeTab === 'preview' ? 'space-y-4' : 'hidden'}>
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">4. Előnézet -- így fog kinézni a katalógusban</h4>
              <div className="max-w-sm mx-auto w-full">
                <div className="relative bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-900">
                    <img
                      src={previewCoverUrl || 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80'}
                      alt={title || 'Program'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 max-w-[70%]">
                      <div className="bg-white/95 backdrop-blur-md text-stone-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
                        <CountryFlag emoji={previewRegion?.flag_emoji} country={previewRegion?.country} size="xs" />
                        <span>{previewRegion?.name || 'Úticél'}</span>
                      </div>
                      {previewCategory && (
                        <div className="bg-stone-900/85 backdrop-blur-md text-stone-200 text-xs font-medium px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                          <CategoryIcon icon={previewCategory.icon} className="w-3 h-3 text-emerald-400" />
                          <span>{previewCategory.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 bg-stone-900/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow z-10">ELŐNÉZET</div>
                    <div className="absolute bottom-3 right-3 bg-emerald-600/95 backdrop-blur-sm text-white px-2.5 py-1 rounded-xl shadow-lg font-bold text-xs z-10">
                      {formatPrice(previewDisplayPrice)} {curr}{pricingMode === 'tiered' ? '/túra-tól' : '/fő'}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-semibold text-stone-700 truncate">{currentProvider?.company_name || currentUser.name}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-900 mb-3 line-clamp-2 leading-snug">{title || 'Program neve'}</h3>
                    <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-2"><span className="text-base">📍</span><span className="font-medium text-stone-800 truncate">{location || 'Helyszín'}</span></div>
                      <div className="flex items-center gap-2"><span className="text-base">📅</span><span className="text-stone-700">{formatProgramDisplayDate(eventDate, occurrences.length > 1)}</span></div>
                      <div className="flex items-center gap-2"><span className="text-base">⏱</span><span className="text-stone-700">{duration}</span></div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-stone-200/70">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold">
                          <span className="text-base">💰</span>
                          <span>{formatPrice(previewDisplayPrice)} {curr} {pricingMode === 'tiered' ? '/túra-tól' : '/fő'}</span>
                        </div>
                        {curr === '€' && eurHufRate > 0 && (
                          <span className="text-[11px] font-medium text-stone-500 tracking-tight">({formatHuf(previewDisplayPrice * eurHufRate)} Ft)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="w-full bg-stone-200 text-stone-500 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-default">
                      <span>Részletek & Érdeklődés</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-500 text-center">Ez egy egyszerűsített előnézet a jelenlegi adataidból -- a valós kártyán értékelés és kedvenc-gomb is megjelenik majd, élő adatokkal.</p>
            </div>
          )}

          {/* ===== TAB (wizard-only): Zaro dontes ===== */}
          {isWizardMode && (
            <div className={activeTab === 'confirm' ? 'space-y-4' : 'hidden'}>
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">5. Záró döntés</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border-2 border-stone-200">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-600" /><span>Mentés és közzététel</span></div>
                  <div className="text-xs text-stone-500 mt-1">
                    A program azonnal aktívvá válik és megjelenik a katalógusban.{' '}
                    {occurrences.length === 0 && <strong className="text-rose-600">Legalább egy időpont szükséges ehhez (lásd 3. lépés).</strong>}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border-2 border-stone-200">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><FileText className="w-4 h-4 text-stone-600" /><span>Mentés piszkozatként</span></div>
                  <div className="text-xs text-stone-500 mt-1">Csak te látod a szolgáltatói felületeden, a katalógusban rejtve marad. Később bármikor közzéteheted.</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigacio/Submit -- wizard modban lepesenkenti Vissza/Elore + zaro ket gomb, szerkesztes-modban a mai Megse/Submit valtozatlanul */}
          {isWizardMode ? (
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={activeTab === 'basic' ? onClose : handleWizardBack}
                className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 cursor-pointer"
              >
                {activeTab === 'basic' ? 'Mégse' : 'Vissza'}
              </button>
              {activeTab !== 'confirm' ? (
                <button
                  type="button"
                  disabled={draftCreating}
                  onClick={handleWizardNext}
                  className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {draftCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Tovább</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting || uploadingCount > 0}
                    onClick={() => saveProgram('draft')}
                    className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Mentés...' : 'Mentés piszkozatként'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || uploadingCount > 0 || occurrences.length === 0}
                    title={occurrences.length === 0 ? 'Legalább egy időpont szükséges a közzétételhez' : undefined}
                    onClick={() => saveProgram('published')}
                    className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'Mentés...' : 'Mentés és közzététel'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-50 cursor-pointer">Mégse</button>
              <button
                type="submit"
                disabled={isSubmitting || uploadingCount > 0}
                className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Mentés...'
                    : (programToEdit || workingProgram)
                      ? status === 'published' ? 'Módosítások mentése (Publikált)' : 'Módosítások mentése (Piszkozat)'
                      : status === 'published' ? 'Program publikálása' : 'Mentés piszkozatként'}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
