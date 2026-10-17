import React, { useState, useEffect } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import { CountryFlag } from './CountryFlag';
import {
  PlusCircle,
  Calendar,
  Phone,
  Eye,
  Trash2,
  CheckCircle,
  Clock3,
  FileText,
  AlertCircle,
  Archive,
  Sparkles,
  BadgeEuro,
  Edit3,
  FileEdit,
  Briefcase
} from 'lucide-react';
import { Program, ProgramStatus, ProgramOccurrence } from '../types/database';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProgramOccurrencesModal } from './ProgramOccurrencesModal';
import { ProgramPricingModal } from './ProgramPricingModal';
import { NewProgramModal } from './NewProgramModal';
import { ManualBookingModal } from './ManualBookingModal';

// Kanban 5a3a8dd8 (Csaba, 10-17): a szolgaltato sajat programjainak kezelese
// kikerult a Partner fiok oldalbol, onallo top-level menupont (navigacio:
// Navbar "Programok" providerkent).
interface ProviderProgramsPageProps {
  onOpenNewProgram: () => void;
}

export const ProviderProgramsPage: React.FC<ProviderProgramsPageProps> = ({ onOpenNewProgram }) => {
  const {
    currentUser,
    currentProvider,
    programs,
    openProgramDetail,
    deleteProgram,
    updateProgram,
    archiveProgram,
    setCurrentView,
    getProgramOccurrences,
  } = useApp();

  useDocumentMeta('Programjaim -- Szolgáltatói Dashboard', 'Saját programjaid kezelése, árazás, időpontok és archiválás.');

  const [statusFilter, setStatusFilter] = useState<string>('published');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [occurrencesModalProgram, setOccurrencesModalProgram] = useState<Program | null>(null);
  const [pricingModalProgram, setPricingModalProgram] = useState<Program | null>(null);
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [manualBookingProgramId, setManualBookingProgramId] = useState<string | undefined>(undefined);

  const handleOpenManualBooking = (progId?: string) => {
    setManualBookingProgramId(progId);
    setManualBookingModalOpen(true);
  };

  // Filter programs for this provider (with graceful fallback to all programs if no provider is linked)
  const ownPrograms = programs.filter(
    (p) => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;
  const displayProgramIds = displayPrograms.map(p => p.id).join(',');

  // Occurrences for every own program, so the manual-booking modal's date
  // picker (occurrencesMap, kanban 5a3a8dd8) has options to offer -- not just
  // the ones already tied to an existing order, unlike the Bookings page.
  const [occurrencesMap, setOccurrencesMap] = useState<Record<string, ProgramOccurrence>>({});

  useEffect(() => {
    const ids = displayProgramIds ? displayProgramIds.split(',') : [];
    if (ids.length === 0) return;
    let cancelled = false;

    Promise.all(ids.map(pid => getProgramOccurrences(pid)))
      .then(results => {
        if (cancelled) return;
        const map: Record<string, ProgramOccurrence> = {};
        results.flat().forEach(occ => {
          map[occ.id] = occ;
        });
        setOccurrencesMap(map);
      })
      .catch(err => {
        console.warn('Occurrences load notice:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [displayProgramIds, getProgramOccurrences]);

  const activeProgramsCount = ownPrograms.filter((p) => p.status === 'published').length;
  const draftProgramsCount = ownPrograms.filter((p) => p.status === 'draft' || p.status === 'pending_review' || p.status === 'rejected').length;
  const archivedProgramsCount = ownPrograms.filter((p) => p.status === 'archived').length;

  const displayedPrograms = ownPrograms.filter((p) => {
    if (statusFilter === 'published') return p.status === 'published';
    if (statusFilter === 'archived') return p.status === 'archived';
    if (statusFilter === 'draft') return p.status === 'draft' || p.status === 'pending_review' || p.status === 'rejected';
    return p.status === statusFilter;
  });

  const getStatusBadge = (status: ProgramStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Aktív / Publikált</span>
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            <Clock3 className="w-3.5 h-3.5" />
            <span>Függőben (Jóváhagyásra vár)</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
            <FileText className="w-3.5 h-3.5" />
            <span>Piszkozat</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Elutasítva</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-stone-200 text-stone-600">
            <Archive className="w-3.5 h-3.5" />
            <span>Archivált</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-6 sm:pb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight">
            Programjaim
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Kezeld a saját túráidat, árazásukat és időpontjaikat.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCurrentView('provider-dashboard')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-900 bg-white px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Vissza a Partner fiókhoz"
          >
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />
            <span className="truncate">Partner fiók</span>
          </button>

          <button
            onClick={onOpenNewProgram}
            disabled={currentProvider?.status === 'suspended' || currentProvider?.status === 'banned'}
            title={
              currentProvider?.status === 'suspended' || currentProvider?.status === 'banned'
                ? 'Felfüggesztett/letiltott fiókkal nem hozható létre új program'
                : undefined
            }
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">+ Új program</span>
          </button>
        </div>
      </div>

      {currentProvider?.status === 'pending' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Fiókod adminisztrátori jóváhagyásra vár</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Hamarosan aktívvá válik -- addig a programjaid nem jelennek meg a publikus katalógusban.
            </p>
          </div>
        </div>
      )}
      {(currentProvider?.status === 'suspended' || currentProvider?.status === 'banned') && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              {currentProvider?.status === 'banned' ? 'Fiókod véglegesen letiltva' : 'Fiókod felfüggesztve'}
            </h4>
            <p className="text-xs text-rose-800 mt-0.5">
              Programjaid jelenleg nem jelennek meg a publikus katalógusban, és új programot sem tudsz felvenni.
              A meglévő foglalásaidat (visszaigazolás, lemondás) továbbra is tudod kezelni.
              {currentProvider?.status === 'suspended' ? ' Ez egy ideiglenes, visszavonható állapot.' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'published', label: `Aktív (${activeProgramsCount})` },
            { id: 'draft', label: `Piszkozat (${draftProgramsCount})` },
            { id: 'archived', label: `Archivált (${archivedProgramsCount})` },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-colors shrink-0 cursor-pointer ${
                statusFilter === btn.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {displayedPrograms.length > 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-100">
              {displayedPrograms.map((prog) => {
                const cover = prog.images?.find(i => i.is_cover)?.image_url || prog.images?.[0]?.image_url;
                return (
                  <div key={prog.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-20 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                        {cover ? (
                          <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">🖼️</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {getStatusBadge(prog.status)}
                          {prog.region && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 flex items-center gap-1">
                              <CountryFlag emoji={prog.region.flag_emoji} country={prog.region.country || prog.region.name} size="xs" />
                              <span>{prog.region.name}</span>
                            </span>
                          )}
                          {prog.category && (
                            <span className="text-[11px] text-stone-500 font-medium">
                              • {prog.category.name}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CountryFlag emoji="🇭🇺" country="Magyarország" size="xs" />
                            <span>{prog.language || 'Magyar nyelvű'}</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-stone-900 truncate font-display">
                          {prog.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                          <span className="flex items-center gap-1">📍 {prog.location}</span>
                          <span className="flex items-center gap-1">📅 {prog.event_date}</span>
                          <span className="flex items-center gap-1 font-bold text-emerald-800">
                            💰 {prog.pricing_mode === 'tiered'
                              ? 'Sávos (csoportos) árazás'
                              : `${formatPrice(prog.price)} ${prog.currency === 'EUR' ? '€' : prog.currency}/fő`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-stone-100 flex flex-col sm:flex-row sm:items-center sm:flex-wrap lg:flex-nowrap gap-2">
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => openProgramDetail(prog.id)}
                          className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Megtekintés"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <span>Előnézet</span>
                        </button>

                        <button
                          onClick={() => setEditingProgram(prog)}
                          className="px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Összes adat szerkesztése (publikált és piszkozat állapotban is)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Szerkesztés</span>
                        </button>

                        <button
                          onClick={() => setOccurrencesModalProgram(prog)}
                          className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Időpontok kezelése"
                        >
                          <Calendar className="w-3.5 h-3.5 text-stone-500" />
                          <span>Időpontok</span>
                        </button>

                        <button
                          onClick={() => handleOpenManualBooking(prog.id)}
                          className="px-3 py-2 sm:py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Új külső (telefonos/whatsapp/helyszíni) foglalás rögzítése erre a programra"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-700" />
                          <span>+ Foglalás</span>
                        </button>

                        <button
                          onClick={() => setPricingModalProgram(prog)}
                          className="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Árazás kezelése"
                        >
                          <BadgeEuro className="w-3.5 h-3.5 text-stone-500" />
                          <span>Árazás</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {prog.status === 'draft' ? (
                          <button
                            onClick={() => updateProgram(prog.id, { status: 'published' })}
                            className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title="Azonnali közzététel a katalógusban"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Közzététel</span>
                          </button>
                        ) : prog.status === 'published' ? (
                          <button
                            onClick={() => updateProgram(prog.id, { status: 'draft' })}
                            className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Visszavonás piszkozatba (elrejtés a katalógusból)"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Piszkozatba</span>
                          </button>
                        ) : prog.status === 'archived' ? (
                          <button
                            onClick={() => updateProgram(prog.id, { status: 'draft' })}
                            className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Visszaállítás a piszkozatok közé"
                          >
                            <FileEdit className="w-3.5 h-3.5 text-amber-700" />
                            <span>Visszaállítás</span>
                          </button>
                        ) : null}

                        {prog.status !== 'archived' && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Biztosan archiválni szeretnéd ezt a programot? Elrejtődik a katalógusból, de az adatai és korábbi foglalásai megmaradnak.')) {
                                await archiveProgram(prog.id);
                              }
                            }}
                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Archiválás (program leállítása és elrejtése)"
                          >
                            <Archive className="w-3.5 h-3.5 text-stone-500" />
                            <span>Archiválás</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm('Biztosan törölni szeretnéd ezt a programot?')) {
                              deleteProgram(prog.id).catch((err) => {
                                alert(err instanceof Error ? err.message : 'Ismeretlen hiba történt a törlés során.');
                              });
                            }
                          }}
                          className="p-2 sm:p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 sm:border-transparent transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                          title="Törlés"
                          aria-label="Program törlése"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-stone-800 font-display mb-1">
              {statusFilter === 'published' && 'Jelenleg nincs aktív (publikált) programod'}
              {statusFilter === 'draft' && 'Jelenleg nincs piszkozat programod'}
              {statusFilter === 'archived' && 'Jelenleg nincs archivált programod'}
            </h4>
            <p className="text-xs text-stone-500 mb-4">
              Kattints az Új program gombra és hozd létre a következő túrádat!
            </p>
            <button
              onClick={onOpenNewProgram}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              + Új program rögzítése
            </button>
          </div>
        )}
      </div>

      <ProgramOccurrencesModal
        program={occurrencesModalProgram}
        onClose={() => setOccurrencesModalProgram(null)}
      />
      <ProgramPricingModal
        program={pricingModalProgram}
        onClose={() => setPricingModalProgram(null)}
      />
      <NewProgramModal
        isOpen={Boolean(editingProgram)}
        programToEdit={editingProgram}
        onClose={() => setEditingProgram(null)}
      />
      <ManualBookingModal
        isOpen={manualBookingModalOpen}
        onClose={() => setManualBookingModalOpen(false)}
        initialProgramId={manualBookingProgramId}
        programs={displayPrograms}
        occurrencesMap={occurrencesMap}
      />
    </div>
  );
};
