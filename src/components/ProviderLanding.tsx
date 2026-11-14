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
  CalendarDays,
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

          {/* Kanban 1705ddb0 (Csaba, 2026-11-14): az ASZF 6.1 pontjabol atvett,
              jogilag mar elfogadott megfogalmazas -- "jelenleg"/"bevezeto
              szakaszban", NEM "orokre ingyenes" (6.5 pont dij-bevezetesi jogot
              tart fenn). Ez a fo szolgaltatoi regisztraciora osztonzo felulet,
              ezert ez a legfontosabb hely a kiemelesnek. */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold mb-8">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>A bevezető (pilot) szakaszban a Platform használata díjmentes</span>
          </div>

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

          {/* Kanban 7db1d065 (Csaba, 2026-11-12): kontakt-email a CTA mellett --
              aki bizonytalan a regisztracio elott, ne kelljen magat regisztralnia
              csak egy kerdeshez. */}
          <p className="mt-6 text-sm text-stone-400 inline-flex items-center gap-1.5">
            <Mail className="w-4 h-4 shrink-0" />
            <span>
              Kérdésed van, mielőtt csatlakoznál?{' '}
              <a
                href="mailto:info@velemgyere.hu"
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
              >
                Írj nekünk: info@velemgyere.hu
              </a>
            </span>
          </p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Nemzetközi, kiránduláskereső közönség
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Nem csak a belföldi programokra: a katalógust olyan magyarul kiránduló látogatók böngészik nap mint nap, akik éppen Cipruson, Máltán, Spanyolországban, Olaszországban, Törökországban vagy szerte a világon keresnek magyar nyelvű idegenvezetést, túrát vagy transzfert.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Egyszerű foglalás-nyomonkövetés
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              A szolgáltatói Irányítópulton havi/heti naptárnézetben látod az összes foglalásod, a Foglaltlistán pedig alkalmanként jelölheted ki, ki jelent meg, és egy kattintással írhatsz vagy emailezhetsz mindenkinek, aki az adott alkalomra foglalt.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Google Naptár-szinkron
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Kapcsold össze a fiókodat a saját Google Naptáraddal, és a foglalásaid automatikusan megjelennek benne -- nem kell külön, kézi nyilvántartást vezetned a határidőkről.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              Azonnali megjelenés, megbízható katalógus
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              A publikált programod rögtön élesben van, nincs admin-várakozás -- a minőséget nem egy belépési sorompó, hanem folyamatos, utólagos moderálás védi, így a látogatók is megbízhatnak a katalógusban.
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

            {/* Kanban 7db1d065 (Csaba, 2026-11-12): a korabbi, kulonallo
                "Admin-ellenorzes" lepes megszunt -- a program publikalaskor
                AZONNAL elesben van (lasd ProgramEditorModal "Nincs szukseg
                kulon admin jovahagyasra!" szovege), a minoseget utolagos
                moderalas vedi, nem egy belepesi sorompo. Ezert ez a lepes a
                korabbi 3-4. lepest egyesiti. */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                3
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  Azonnali megjelenés a katalógusban
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Amint publikálod, a program rögtön élesben van -- nincs admin-jóváhagyásra várás, nincs külön felülvizsgálati kör. A katalógus minőségét folyamatos, utólagos moderálás védi, nem egy belépési sorompó.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: pontosan ekkor találkoznak először a programoddal -- a megadott kép, ár és leírás alapján döntik el, hogy lefoglalják-e.
                </p>
              </div>
            </div>

            {/* Kanban 7db1d065: a korabbi "Erdeklodesek fogadasa" (foglalas
                ELOTTI, kozvetlen uzenetvaltas) megszunt, lasd ProgramDetailView
                "Erdekel a program!" komment -- a helfoglalas ("Helyfoglalas")
                ma az EGYETLEN elsodleges CTA, a kapcsolatfelvetel a foglalas
                UTAN tortenik (Foglaltlista oldal, ca9129b7). */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex gap-4">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base">
                4
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Foglalások és nyomonkövetés
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  A látogatók közvetlenül lefoglalják a helyüket a programodon -- ezeket a szolgáltatói Irányítópulton kezeled: naptárnézetben látod az összes alkalmat, a Foglaltlistán jelölheted ki, ki jelent meg, és onnan üzenetet vagy emailt is küldhetsz a foglalóknak. Ha bekapcsolod a Google Naptár-szinkront, a foglalásaid automatikusan a saját naptáradba is bekerülnek.
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  A látogatók oldalán: ők foglalnak le egy konkrét időpontot -- a visszaigazolás rögtön nálad és náluk is megjelenik, nincs külön üzenetváltás-kör a foglalás előtt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
