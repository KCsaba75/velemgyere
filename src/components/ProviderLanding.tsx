import React from 'react';
import { useApp } from '../context/AppContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  Compass, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  CalendarCheck,
  Building2,
  Mail
} from 'lucide-react';

interface ProviderLandingProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const ProviderLanding: React.FC<ProviderLandingProps> = ({ 
  onOpenRegister, 
  onOpenLogin 
}) => {
  const { currentUser, setCurrentView } = useApp();

  useDocumentMeta(
    'Szolgáltatóknak',
    'Tedd közzé programjaidat a Velem Gyere katalógusában -- csatlakozz szolgáltatói partnerként.'
  );

  return (
    <div className="animate-in fade-in duration-200">
      {/* Hero section */}
      <section className="bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 text-white py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium mb-6">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Szolgáltatói partnerprogram</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-white mb-6">
            Tedd közzé programjaidat a Velem Gyere katalógusában!
          </h1>

          <p className="text-base sm:text-xl text-stone-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Külföldön élsz, magyar idegenvezetést, kirándulásokat vagy reptéri transzfereket szolgáltatsz? Csatlakozz a Velem Gyere platformhoz Cipruson, Máltán, Spanyolországban, Olaszországban, Törökországban és szerte a világon!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {currentUser.role === 'provider' ? (
              <button
                onClick={() => setCurrentView('provider-overview')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
              >
                <span>Ugrás a Szolgáltatói Dashboardra</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenRegister}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Regisztráció</span>
                </button>
                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto bg-stone-700/80 hover:bg-stone-700 text-stone-100 font-semibold px-8 py-4 rounded-2xl border border-stone-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  <span>Belépés</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900 mb-3">
            Miért érdemes csatlakoznod a Velem Gyere platformhoz?
          </h2>
          <p className="text-stone-500 text-sm sm:text-base">
            Minden eszközt biztosítunk, hogy a szervezéssel foglalkozhass, mi pedig elhozzuk a közönségedet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Célzott magyar közönség
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Kifejezetten belföldi kirándulásokat, túrákat és minőségi hétvégi programokat kereső látogatók böngészik a katalógust nap mint nap.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Közvetlen érdeklődések
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Az érdeklődők közvetlenül a te adataidhoz küldik a megkeresést névvel, telefonszámmal és egyedi üzenettel, közvetítői díjak nélkül az MVP-ben.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Minőség és hitelesség
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Minden szolgáltatót és programot adminisztrátori ellenőrzés után publikálunk, így a látogatók a megbízhatóság garanciáját látják a márkában.
            </p>
          </div>
        </div>

        {/* Step-by-step workflow (kanban 8d5443ca: kozosajandek.hu dual-perspective minta --
            minden lepesnel a szolgaltato konkret feladata ES a latogato-oldali hatas is latszik) */}
        <div className="mt-16 bg-stone-100 rounded-3xl p-8 sm:p-12 border border-stone-200">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-xl sm:text-2xl font-bold font-display text-stone-900 mb-2">
              Hogyan működik a folyamat?
            </h3>
            <p className="text-sm text-stone-500">
              Lépésről lépésre, pontosan mi a feladatod -- és mi történik emiatt a látogatók oldalán.
            </p>
          </div>

          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                1
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base">Regisztráció és fiók aktiválása</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Add meg céged/vállalkozásod nevét, egy kapcsolattartót, e-mail-címet és telefonszámot, rövid bemutatkozást a tevékenységedről, és jelöld ki, milyen fizetési módokat fogadsz el helyszínen. A regisztráció elküldése után egy megerősítő linket kapsz e-mailben -- ennek megnyitásával a fiókod rögtön aktívvá válik, nincs külön admin-várakozás a belépéshez.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: még semmi -- ez a lépés a háttérben zajlik, rólad még nem látnak semmit a katalógusban.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                2
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base">Program feltöltése</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  A szolgáltatói dashboardon tölts fel annyi programot, amennyit szeretnél: cím, kategória, ország/régió, nyelv, időtartam, pontos dátum és időpont, indulási hely és helyszín, rövid és részletes leírás, ár, maximális létszám, mit tartalmaz / mi nem tartalmaz lista, és legalább egy fénykép (ebből egyet borítóképnek kijelölve).
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: még semmi -- az új program ebben a lépésben csak vázlat (draft), kizárólag te látod a saját dashboardodon.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base">Admin-ellenőrzés</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Minden új (vagy módosított) programot a katalógus adminisztrátora átnéz -- a leírást, az árat és a képeket -- mielőtt az nyilvánosan megjelenne. Ha valamit pontosítani kell, jelezzük feléd, mielőtt jóváhagyjuk.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: még semmi -- ez a minőségbiztosítási lépés, ezért nem a te fiókod, hanem minden egyes program egyedileg kerül jóváhagyásra.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base">Megjelenés a katalógusban</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  A jóváhagyott program azonnal megjelenik a nyilvános Velem Gyere katalógusban, kereshetővé és böngészhetővé válik mindenki számára.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: pontosan ekkor találkoznak először a programoddal -- a megadott kép, ár és leírás alapján döntik el, hogy érdeklődnek-e.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                5
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base">Érdeklődések fogadása</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Az érdeklődők közvetlenül a nálad megadott elérhetőségre küldik a megkeresésüket, névvel, telefonszámmal és egyedi üzenettel -- ezeket a szolgáltatói dashboardodon is nyomon követed.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: ők küldik az első üzenetet -- közvetítői díj nélkül, közvetlenül veled veszik fel a kapcsolatot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
