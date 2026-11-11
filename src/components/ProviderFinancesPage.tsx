import React from 'react';
import { useApp, formatPrice } from '../context/AppContext';
import { Banknote, TrendingUp, Landmark, FileSpreadsheet, Info } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Kanban 4aac8eda (Csaba, 2026-11-11): az uj sidebar "Penzugyek" szekcioja --
// "Forgalom, jutalek, kifizetesek, elszamolasok". FONTOS, GENUINE KORLAT:
// a Provider tipus szerint a fizetesi mod jelenleg KIZAROLAG 'onsite_only'
// (lasd types/database.ts Provider.payment_mode kommentje: "Stripe Connect
// prep -- columns only, no Stripe logic wired up yet"), vagyis a vendeg
// KOZVETLENUL a szolgaltatonak fizet a helyszinen (onsite_amount) -- a
// platform ebbol semmit nem von le es semmit nem fizet ki a szolgaltatonak.
// A booking_fee a VASARLOTOL beszedett kenyelmi dij, ami a platforme, nem a
// szolgaltatoe. Emiatt jutalek/kifizetes/elszamolas FOGALMILAG MEG NEM
// LETEZIK ebben a modellben -- ezt a lapot NEM kitalalt szamokkal toltottem
// fel, hanem (a) a valos adatokbol szamithato forgalom-becslessel, (b) orult
// placeholder magyarazattal a tobbire. Ha Csaba valodi jutalek/kifizetes
// funkciot akar, az a Stripe Connect bekotese -- kulon backend-feladat.
export const ProviderFinancesPage: React.FC = () => {
  const { currentUser, currentProvider, programs, orders } = useApp();

  useDocumentMeta('Pénzügyek -- Szolgáltatói Dashboard', 'Forgalom-becslés a foglalásaid alapján.');

  const ownPrograms = programs.filter(
    p => p.provider_id === currentProvider?.id || (currentUser.role === 'admin' ? true : false)
  );
  const displayPrograms = ownPrograms.length > 0 ? ownPrograms : programs;
  const ownProgramIds = new Set(displayPrograms.map(p => p.id));
  const confirmedOrders = orders.filter(o => ownProgramIds.has(o.program_id) && o.status === 'confirmed');

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const totalTurnover = confirmedOrders.reduce((sum, o) => sum + (o.onsite_amount || 0), 0);
  const monthTurnover = confirmedOrders
    .filter(o => isThisMonth(o.created_at))
    .reduce((sum, o) => sum + (o.onsite_amount || 0), 0);
  const currency = confirmedOrders[0]?.currency === 'EUR' || !confirmedOrders[0]?.currency ? '€' : confirmedOrders[0].currency;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2">
          <Banknote className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          <span>Pénzügyek</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Forgalom, jutalék, kifizetések, elszámolások.
        </p>
      </div>

      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed">
          A Velem Gyere jelenleg <strong>helyszíni fizetést</strong> használ: a vendég közvetlenül neked fizet
          (készpénz, Revolut vagy utalás), a platform ebbe nem száll be, és nem is fizet ki számodra semmit.
          Az alábbi forgalom-becslés a visszaigazolt foglalásaid alapján számolt, tájékoztató jellegű összeg --
          nem egy platform általi kifizetés nyilvántartása.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Becsült forgalom (e havi)
          </div>
          <div className="text-2xl font-extrabold text-stone-900">
            {formatPrice(monthTurnover)} {currency}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Becsült forgalom (összesen)
          </div>
          <div className="text-2xl font-extrabold text-stone-900">
            {formatPrice(totalTurnover)} {currency}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <Landmark className="w-9 h-9 text-stone-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-800 font-display mb-1">Jutalék és kifizetések</h4>
          <p className="text-xs text-stone-500">
            Nem értelmezhető a jelenlegi helyszíni fizetős modellben -- a platform nem von le jutalékot, és nem
            utal ki. Ha ez megváltozik (online fizetés/Stripe Connect), itt fog megjelenni.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <FileSpreadsheet className="w-9 h-9 text-stone-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-800 font-display mb-1">Elszámolások</h4>
          <p className="text-xs text-stone-500">
            Havi/éves elszámoló bizonylat egyelőre nincs -- a visszaigazolt foglalásaidat egyenként a
            Foglalások lapon tudod megtekinteni.
          </p>
        </div>
      </div>
    </div>
  );
};
