import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  Camera,
  Compass,
  MapPin,
  Mountain,
  Utensils,
  Languages,
  Heart,
  Sparkles,
} from 'lucide-react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=2000&q=85';
const STORY_IMAGE =
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85';
const GUIDE_IMAGE =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85';

const experienceTypes = [
  { icon: Compass, title: 'Városnézés és idegenvezetés', text: 'Fedezd fel a városok történeteit magyar nyelvű vezetéssel.' },
  { icon: Mountain, title: 'Kirándulások és túrák', text: 'Ismerd meg a környék természeti kincseit és különleges helyeit.' },
  { icon: Bus, title: 'Transzferek és közlekedés', text: 'Találj segítséget a reptéri érkezéshez és a helyi utazáshoz.' },
  { icon: Camera, title: 'Különleges élmények', text: 'Hajókirándulások, helyi programok és egyedi felfedeznivalók.' },
  { icon: Utensils, title: 'Helyi ízek és kultúra', text: 'Kerülj közelebb az úti célhoz a gasztronómián és a helyi történeteken keresztül.' },
];

export const AboutUsPage: React.FC = () => {
  useDocumentMeta(
    'Rólunk – Velemgyere',
    'Ismerd meg, hogyan született a Velemgyere ötlete: magyar nyelvű programok, kirándulások és helyi élmények egy helyen.'
  );

  return (
    <div className="bg-stone-50 text-stone-800">
      <section className="relative isolate min-h-[520px] sm:min-h-[600px] flex items-center overflow-hidden">
        <img src={HERO_IMAGE} alt="Mediterrán tengerparti város, amely felfedezésre vár" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950/80 via-stone-900/55 to-stone-900/10" />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" /> Egy személyes ötletből született
            </span>
            <h1 className="mt-7 font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.06] tracking-tight text-white">
              A világot felfedezni
              <span className="block text-amber-200">magyarul is lehet.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-xl leading-relaxed text-white/90">
              Programok, kirándulások és helyi élmények magyar nyelven – hogy ne csak megérkezz, hanem igazán meg is ismerd az úti célodat.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/programok" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-700">
                Programok felfedezése <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/szolgaltatoknak" className="inline-flex items-center justify-center rounded-xl border border-white/60 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
                Szolgáltató vagyok
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Hogyan kezdődött?</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">Egy utazó kérdéseiből lett egy közös ötlet.</h2>
            <div className="mt-7 space-y-5 text-base leading-relaxed text-stone-600">
              <p>Kiss Csaba Lajos vagyok, a Velemgyere ötletgazdája és fejlesztője. A mindennapi munkámban ipari automatizálási szervizfeladatok szervezésével és alkalmazásfejlesztéssel foglalkozom. Szabadidőmben pedig – párommal és családommal – szeretek útra kelni, új helyeket felfedezni.</p>
              <p>Közel állnak hozzám a természet kincsei, a történelmi helyszínek, az építészet, a városok hangulata és az adott országok gasztronómiája. Utazásainkat hol önállóan szervezzük, hol utazási irodára bízzuk.</p>
              <p>Amikor magunk tervezzük az utat, a repülőjegy és a szállás lefoglalása ma már gyorsan megy online. Utána jönnek az igazán fontos kérdések: hogyan jutunk el a hotelbe, mit érdemes megnézni, milyen programokat válasszunk, és hol találunk helyi idegenvezetőt?</p>
            </div>
            <div className="mt-8 border-l-4 border-amber-400 bg-amber-50 rounded-r-2xl px-5 py-4">
              <p className="font-display text-lg sm:text-xl font-bold leading-relaxed text-stone-800">„Egy idegen város történetei egészen másképp elevenednek meg, ha az anyanyelvünkön hallhatjuk őket.”</p>
            </div>
          </div>
          <div className="relative">
            <img src={STORY_IMAGE} alt="Színes mediterrán település a tengerparton" className="w-full aspect-[4/5] max-h-[620px] object-cover rounded-[2rem] shadow-xl" />
            <div className="absolute -bottom-5 -left-3 sm:-left-8 rounded-2xl bg-white p-5 sm:p-6 shadow-xl max-w-[230px]">
              <div className="flex items-center gap-2 text-emerald-700"><MapPin className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-wider">A kíváncsiság visz tovább</span></div>
              <p className="mt-2 font-display text-lg font-bold text-stone-900">Több, mint eljutni A-ból B-be.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3eadc] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-800">A felismerés</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">A jó programok ott vannak – csak nem mindig könnyű megtalálni őket.</h2>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-stone-650">Elkezdtem magyarul beszélő helyi szolgáltatókat keresni. Facebook-csoportokban, Instagramon, egyéni weboldalakon és programajánló oldalakon kutattam. Az ajánlatok és információk sok helyen, szétszórva voltak. Minden szolgáltatót külön kellett felkutatni, összehasonlítani, majd egyeztetni vele.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { n: '01', title: 'Keresgélés', text: 'Különböző csoportok, oldalak és közösségi felületek böngészése.' },
              { n: '02', title: 'Összehasonlítás', text: 'Programok, nyelvek, időpontok és szolgáltatások áttekintése.' },
              { n: '03', title: 'Egyeztetés', text: 'Kapcsolatfelvétel és a részletek külön-külön történő megbeszélése.' },
            ].map((item) => (
              <div key={item.n} className="rounded-2xl border border-white/80 bg-white/80 p-6 sm:p-8">
                <span className="font-display text-3xl font-extrabold text-amber-600">{item.n}</span>
                <h3 className="mt-4 text-xl font-bold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900">Mi lenne, ha mindezt egyetlen helyen lehetne megtalálni?</p>
            <p className="mt-3 text-emerald-800 font-bold">Így született meg a Velemgyere ötlete.</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <img src={GUIDE_IMAGE} alt="Utazók közös élményt szereznek egy kiránduláson" className="w-full aspect-[5/4] object-cover rounded-[2rem] shadow-lg" />
          </div>
          <div className="order-1 lg:order-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">A küldetésünk</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">Összekötni azokat, akik felfedeznének, azokkal, akik megmutatnák a világot.</h2>
            <p className="mt-6 text-base leading-relaxed text-stone-600">A Velemgyere célja, hogy egy helyen tegye könnyebben felfedezhetővé a külföldön élő, magyarul beszélő szolgáltatók programjait. Így az utazók könnyebben rátalálhatnak a számukra érdekes városnézésekre, kirándulásokra, transzferekre és helyi élményekre.</p>
            <p className="mt-4 text-base leading-relaxed text-stone-600">A platform a szolgáltatókat is segíti: lehetőséget ad arra, hogy bemutassák programjaikat azoknak a magyar utazóknak, akik éppen az adott úti célt fedeznék fel.</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
              <Languages className="h-6 w-6 shrink-0 text-emerald-700" />
              <p className="text-sm leading-relaxed text-emerald-950">Mert egy helyi történet, egy városi séta vagy egy kirándulás sokszor még emlékezetesebb, ha magyarul élhetjük át.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Mit találsz nálunk?</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">Ötletek a következő élményedhez.</h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">Böngéssz a különböző szolgáltatások és programok között, és találd meg azt, ami illik az utazásodhoz.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {experienceTypes.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-stone-200 bg-stone-50 p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 transition group-hover:bg-emerald-600 group-hover:text-white"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 font-bold leading-snug text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-900 py-16 sm:py-20 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-amber-300" />
          <h2 className="mt-5 font-display text-3xl sm:text-4xl font-extrabold tracking-tight">A legjobb utazási emlékek gyakran egy találkozással kezdődnek.</h2>
          <p className="mt-5 max-w-2xl mx-auto text-base leading-relaxed text-stone-300">Lehet, hogy csak egy transzfert keresel. Lehet, hogy egy egész napos kirándulást. Vagy egy helyi idegenvezetőt, aki magyarul mesél a városról. Indulj el, és találd meg a következő élményed!</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/programok" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500">Programokat keresek <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/szolgaltatoknak" className="inline-flex items-center justify-center rounded-xl border border-stone-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Szolgáltatóként csatlakozom</Link>
          </div>
          <p className="mt-10 text-sm text-stone-400">Köszönöm, hogy itt vagy! <span className="text-white font-semibold">Kiss Csaba Lajos</span> · a Velemgyere ötletgazdája</p>
          <p className="mt-5 font-display text-xl sm:text-2xl font-extrabold text-amber-200">Velemgyere – mert a világot együtt még jobb felfedezni!</p>
        </div>
      </section>
    </div>
  );
};
