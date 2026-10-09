import React, { useState, useEffect } from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import { BadgeEuro, Trash2, Loader2, Layers, Users } from 'lucide-react';
import { Program, ProgramPriceTier } from '../types/database';

interface ProgramPricingModalProps {
  program: Program | null;
  onClose: () => void;
}

export const ProgramPricingModal: React.FC<ProgramPricingModalProps> = ({ program, onClose }) => {
  const { updateProgram, getProgramPriceTiers, createPriceTier, deletePriceTier } = useApp();

  const [pricingMode, setPricingMode] = useState<'per_person' | 'tiered'>('per_person');
  const [savingMode, setSavingMode] = useState(false);

  const [tiers, setTiers] = useState<ProgramPriceTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [minParticipants, setMinParticipants] = useState('1');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const reloadTiers = async (programId: string) => {
    setLoadingTiers(true);
    const rows = await getProgramPriceTiers(programId);
    setTiers(rows);
    setLoadingTiers(false);
  };

  useEffect(() => {
    if (!program) return;
    setPricingMode(program.pricing_mode);
    setError(null);
    reloadTiers(program.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  if (!program) return null;

  const curr = program.currency === 'EUR' ? '€' : program.currency;

  const handleModeChange = async (mode: 'per_person' | 'tiered') => {
    if (mode === pricingMode) return;
    // Visszavaltas per_person-re engedett akkor is, ha vannak mar felvett savok --
    // azok csak nem lesznek hasznalva, amig vissza nem valt tiered-re (nincs torolve).
    if (mode === 'tiered' && tiers.length === 0) {
      setError('Mielőtt sávos árazásra váltasz, adj hozzá legalább egy sávot lent.');
      return;
    }
    setSavingMode(true);
    setError(null);
    try {
      await updateProgram(program.id, { pricing_mode: mode });
      setPricingMode(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt az árazási mód módosításakor.');
    } finally {
      setSavingMode(false);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const min = parseInt(minParticipants, 10);
    const max = maxParticipants.trim() === '' ? null : parseInt(maxParticipants, 10);
    const total = parseFloat(totalPrice);

    if (!Number.isFinite(min) || min < 1) {
      setError('A minimum létszám legalább 1 kell legyen.');
      return;
    }
    if (max !== null && (!Number.isFinite(max) || max < min)) {
      setError('A maximum létszám nem lehet kisebb a minimumnál (vagy hagyd üresen, ha nincs felső határ).');
      return;
    }
    if (!Number.isFinite(total) || total < 0) {
      setError('Adj meg egy érvényes, nem negatív összeget a sáv teljes árának.');
      return;
    }

    setAdding(true);
    try {
      await createPriceTier(program.id, { min_participants: min, max_participants: max, total_price: total });
      await reloadTiers(program.id);
      setMinParticipants(String((max ?? min) + 1));
      setMaxParticipants('');
      setTotalPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a sáv mentésekor.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTier = async (tier: ProgramPriceTier) => {
    const rangeLabel = tier.max_participants
      ? `${tier.min_participants}-${tier.max_participants} fő`
      : `${tier.min_participants}+ fő`;
    if (!window.confirm(`Biztosan törlöd a "${rangeLabel}" sávot?`)) return;
    setError(null);
    try {
      await deletePriceTier(tier.id);
      await reloadTiers(program.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a sáv törlésekor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BadgeEuro className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Árazás
            </span>
            <h3 className="font-display text-xl font-extrabold text-stone-900">{program.title}</h3>
          </div>
        </div>

        {/* Pricing mode toggle */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-6">
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
            Árazási mód
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={savingMode}
              onClick={() => handleModeChange('per_person')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors disabled:opacity-50 ${
                pricingMode === 'per_person'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" /> Fejenkénti ár
            </button>
            <button
              type="button"
              disabled={savingMode}
              onClick={() => handleModeChange('tiered')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors disabled:opacity-50 ${
                pricingMode === 'tiered'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Layers className="w-4 h-4" /> Sávos (csoportos) ár
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-2.5">
            {pricingMode === 'per_person'
              ? `Fejenkénti ár: ${formatPrice(program.price)} ${curr} / fő, a végösszeg a résztvevők számával szorzódik.`
              : 'Sávos ár: a csoport létszámától függő, a sávhoz tartozó FIX összeg a teljes csoportra (nem fejenként).'}
          </p>
        </div>

        {error && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl mb-4">
            {error}
          </div>
        )}

        {pricingMode === 'tiered' && (
          <>
            {/* Add new tier */}
            <form onSubmit={handleAddTier} className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-6 space-y-3">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Új sáv hozzáadása
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Min. fő</label>
                  <input
                    type="number"
                    min={1}
                    value={minParticipants}
                    onChange={(e) => setMinParticipants(e.target.value)}
                    className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Max. fő (üres = nincs felső határ)</label>
                  <input
                    type="number"
                    min={1}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
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
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full text-sm bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={adding}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                <span>{adding ? 'Mentés...' : 'Sáv hozzáadása'}</span>
              </button>
            </form>

            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
              Meglévő sávok ({tiers.length})
            </h4>
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
                      <strong className="text-emerald-700 font-bold">
                        {formatPrice(tier.total_price)} {curr}
                      </strong>
                      <button
                        onClick={() => handleDeleteTier(tier)}
                        title="Törlés"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
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
    </div>
  );
};
