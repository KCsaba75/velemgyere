import { Category, Provider, Program, ProgramImage, Inquiry, Profile, Region } from '../types/database';

export const INITIAL_REGIONS: Region[] = [
  {
    id: 'reg-cyprus',
    country: 'Ciprus',
    name: 'Ciprus',
    slug: 'ciprus',
    flag_emoji: '🇨🇾',
    description: 'Ayia Napa, Larnaca, Paphos, Limassol és a festői Troodos-hegység.',
    image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-malta',
    country: 'Málta',
    name: 'Málta & Gozo',
    slug: 'malta',
    flag_emoji: '🇲🇹',
    description: 'Valletta barokk utcái, Mdina a csend városa, Kék Lagúna és Gozo szigete.',
    image_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-barcelona',
    country: 'Spanyolország',
    name: 'Barcelona',
    slug: 'barcelona',
    flag_emoji: '🇪🇸',
    description: 'Gaudí építészete, Sagrada Família, Gótikus negyed, Montserrat és tengerparti élmények.',
    image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-malaga',
    country: 'Spanyolország',
    name: 'Málaga & Costa del Sol',
    slug: 'malaga',
    flag_emoji: '🇪🇸',
    description: 'Andalúzia fehér falvai, Caminito del Rey szurdok, Gibraltár és Ronda.',
    image_url: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-mallorca',
    country: 'Spanyolország',
    name: 'Mallorca',
    slug: 'mallorca',
    flag_emoji: '🇪🇸',
    description: 'Baleár-szigetek gyöngyszeme, Valldemossa, Sóller, Formentor-fok és türkiz öblök.',
    image_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-rome',
    country: 'Olaszország',
    name: 'Róma',
    slug: 'roma',
    flag_emoji: '🇮🇹',
    description: 'Az Örök Város, Colosseum, Vatikáni Múzeumok, Trastevere és Tivoli villái.',
    image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
  {
    id: 'reg-istanbul',
    country: 'Törökország',
    name: 'Isztambul',
    slug: 'isztambul',
    flag_emoji: '🇹🇷',
    description: 'Európa és Ázsia találkozása, Boszporusz hajózás, Kék Mecset, Hagia Sophia és bazárok.',
    image_url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80',
    active: true,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-kirandulas', name: 'Kirándulás & Természet', slug: 'kirandulas', icon: 'Compass', active: true },
  { id: 'cat-varosnezes', name: 'Városnézés & Séta', slug: 'varosnezes', icon: 'Landmark', active: true },
  { id: 'cat-transzfer', name: 'Reptéri & Helyi Transzfer', slug: 'transzfer', icon: 'Car', active: true },
  { id: 'cat-hajos', name: 'Hajókirándulás', slug: 'hajos', icon: 'Ship', active: true },
  { id: 'cat-gasztro', name: 'Gasztrotúra & Kóstoló', slug: 'gasztro', icon: 'Utensils', active: true },
  { id: 'cat-privat', name: 'Privát túra & Sofőrszolgálat', slug: 'privat', icon: 'Shield', active: true },
  { id: 'cat-csaladi', name: 'Családi program', slug: 'csaladi', icon: 'Users', active: true },
];

export const INITIAL_PROVIDERS: Provider[] = [
  {
    id: 'prov-cyprus',
    user_id: 'user-prov-cyprus',
    company_name: 'Ciprus Magyarul Élménytúrák',
    contact_name: 'Németh Zoltán & Dóra',
    email: 'info@ciprusmagyarul.com',
    phone: '+357 99 123 456',
    website: 'https://ciprusmagyarul.com',
    description: 'Több mint 8 éve élünk Cipruson. Magyar nyelvű kiscsoportos kirándulásokat, hegyi túrákat és megbízható reptéri transzfereket biztosítunk Larnaca és Paphos környékén.',
    status: 'approved',
    created_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 'prov-malta',
    user_id: 'user-prov-malta',
    company_name: 'Malta & Gozo Magyar Kísérettel',
    contact_name: 'Varga Gabriella',
    email: 'gabriella@maltamagyarul.hu',
    phone: '+356 79 456 789',
    website: 'https://maltamagyarul.hu',
    description: 'Hivatalos máltai engedéllyel rendelkező helyi magyar idegenvezető. Történelmi séták Vallettában, Mdina titkai és felejthetetlen gozói privát élmények.',
    status: 'approved',
    created_at: '2026-06-12T12:00:00Z',
  },
  {
    id: 'prov-spain',
    user_id: 'user-prov-spain',
    company_name: 'Iberia Kalandok – Spanyolországi Magyar Séták',
    contact_name: 'Szabó Bence & Carmen',
    email: 'hola@iberiakalandok.es',
    phone: '+34 612 345 678',
    website: 'https://iberiakalandok.es',
    description: 'Barcelonában, Málagán és Mallorcán szervezünk autentikus magyar nyelvű városi sétákat, andalúz szurdoktúrákat és reptéri kényelmi transzfereket.',
    status: 'approved',
    created_at: '2026-07-01T09:30:00Z',
  },
  {
    id: 'prov-rome',
    user_id: 'user-prov-rome',
    company_name: 'Római Séták & Transzferek',
    contact_name: 'Dr. Kovács Márton',
    email: 'marton@romaisetak.it',
    phone: '+39 340 987 6543',
    website: 'https://romaisetak.it',
    description: 'Rómában élő magyar művészettörténész és idegenvezető. Soron kívüli bejutás a Vatikánba és Colosseumba, valamint reptéri Fiumicino transzferek magyar sofőrrel.',
    status: 'approved',
    created_at: '2026-07-15T15:20:00Z',
  },
  {
    id: 'prov-istanbul',
    user_id: 'user-prov-istanbul',
    company_name: 'Isztambul Magyar Kísérővel',
    contact_name: 'Demir Emese',
    email: 'emese@isztambulmagyarul.com',
    phone: '+90 532 111 2233',
    website: 'https://isztambulmagyarul.com',
    description: '12 éve Isztambulban élő magyar hölgyként mutatom meg a város ezer arcát: hajózás a Boszporuszon, gasztrotúrák és privát reptéri asszisztencia.',
    status: 'approved',
    created_at: '2026-08-01T11:00:00Z',
  },
];

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'prof-admin',
    user_id: 'user-admin',
    name: 'Velem Gyere Admin',
    email: 'admin@velemgyere.hu',
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prof-prov-cyprus',
    user_id: 'user-prov-cyprus',
    name: 'Németh Zoltán',
    email: 'info@ciprusmagyarul.com',
    role: 'provider',
    created_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 'prof-prov-spain',
    user_id: 'user-prov-spain',
    name: 'Szabó Bence',
    email: 'hola@iberiakalandok.es',
    role: 'provider',
    created_at: '2026-07-01T09:30:00Z',
  },
  {
    id: 'prof-visitor',
    user_id: 'user-visitor',
    name: 'Magyar Utazó',
    email: 'utazo@example.hu',
    role: 'visitor',
    created_at: '2026-09-10T11:00:00Z',
  },
];

export const INITIAL_PROGRAMS: Program[] = [
  // 1. CIPRUS
  {
    id: 'prog-cyp-1',
    provider_id: 'prov-cyprus',
    category_id: 'cat-kirandulas',
    region_id: 'reg-cyprus',
    title: 'Troodos-hegység, Kykkos kolostor & Omodos hegyi falu',
    slug: 'troodos-hegyseg-kykkos-kolostor-omodos-ciprus',
    short_description: 'Magyar nyelvű kisbuszos kirándulás a zöld szívbe: cédruserdők, aranymozaikos kolostor és borkóstoló egy tradicionális hegyi faluban.',
    description: `Fedezd fel Ciprus hűvös, fenyőillatú hegyvidékét magyar vezetéssel! Kirándulásunk során meglátogatjuk az UNESCO világörökségi oltalmú területeket, a gazdagon díszített Kykkos kolostort, és felmegyünk Ciprus legmagasabb pontjának (Olympos) közelébe.

Délután Omodos macskaköves utcáin sétálunk, meglátogatjuk a Szent Kereszt kolostort és egy autentikus helyi borászatban kóstoljuk meg a világhírű Commandaria desszertbort helyi sajtok kíséretében. Utazás kényelmes, klímás Mercedes kisbusszal.`,
    location: 'Troodos & Omodos, Ciprus',
    country: 'Ciprus',
    departure_location: 'Szállodai felvétel: Ayia Napa, Protaras, Larnaca vagy Limassol szállásod előtt',
    event_date: '2026-10-15',
    start_time: '08:00',
    end_time: '17:30',
    duration: 'Egész napos (9 óra)',
    price: 65,
    currency: 'EUR',
    language: 'Magyar nyelvű vezetés',
    included: [
      'Szállodai transzfer oda-vissza kényelmes kisbusszal',
      'Magyar nyelvű helyi túravezetés a teljes nap folyamán',
      'Kykkos kolostor belépő és vezetés',
      'Tradicionális borkóstoló és helyi finomságok Omodosban',
      'Hűsítő ásványvíz a buszon'
    ],
    not_included: [
      'Ebéd tradicionális hegyi tavernban (kb. 15-18 EUR/fő)',
      'Egyéni szuvenírvásárlás'
    ],
    max_participants: 16,
    status: 'published',
    featured: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prog-cyp-2',
    provider_id: 'prov-cyprus',
    category_id: 'cat-transzfer',
    region_id: 'reg-cyprus',
    title: 'Larnaca Reptéri Transzfer (Ayia Napa / Protaras) magyar sofőrrel',
    slug: 'larnaca-repuloteri-privat-transzfer-magyarul',
    short_description: 'Pontos, megbízható reptéri privát transzfer közvetlenül a szállásodig. Magyar sofőr, nincs stressz, hasznos helyi tippek útközben.',
    description: `Érkezz nyugodtan Ciprusra! A járatod érkezésekor a sofőr névtáblával várja a Larnaca (LCA) repülőtér érkezési csarnokában. Kényelmes, tágas, tiszta járművel viszünk közvetlenül a hotel vagy apartman ajtajáig Ayia Napa, Protaras, Larnaca vagy Limassol övezetében.

Útközben a sofőr magyarul osztja meg veled a legfontosabb helyi tanácsokat: hol érdemes enni, mely strandokat érdemes felkeresni, és mire figyelj baloldali közlekedéskor.`,
    location: 'Larnaca Reptér → Ayia Napa / Protaras / Limassol',
    country: 'Ciprus',
    departure_location: 'Larnaca Nemzetközi Repülőtér (LCA) érkezési terminál',
    event_date: '2026-10-10',
    start_time: '00:00',
    end_time: '23:59',
    duration: '45-60 perc',
    price: 55,
    currency: 'EUR',
    language: 'Magyar sofőr és asszisztencia',
    included: [
      'Privát transzfer max. 4 vagy 8 fő részére',
      'Névtáblás találkozás a repülőtéren',
      'Poggyászkezelés és segítségnyújtás',
      'Repülőjárat késésének díjmentes követése',
      'Gyerekülés ingyenesen igényelhető'
    ],
    not_included: [
      'Borravaló (nem kötelező)'
    ],
    max_participants: 8,
    status: 'published',
    featured: false,
    created_at: '2026-09-05T12:00:00Z',
    updated_at: '2026-09-05T12:00:00Z',
  },

  // 2. MÁLTA
  {
    id: 'prog-mlt-1',
    provider_id: 'prov-malta',
    category_id: 'cat-varosnezes',
    region_id: 'reg-malta',
    title: 'Málta esszenciája: Valletta, Mdina és a Három Város magyarul',
    slug: 'malta-esszenciaja-valletta-mdina-magyar-vezetes',
    short_description: 'A Máltai Lovagrend dicsősége: Felső Barrakka kertek, Szent János társkatedrális és a Csendes Város macskaköves titkai.',
    description: `Ismerd meg Málta 7000 éves történelmét egy lenyűgöző magyar nyelvű sétán! Délelőtt bejárjuk Vallettát, a johannita lovagok által épített erődvárost, megcsodáljuk a Grand Harbour kikötői panorámáját és Caravaggio leghíresebb festményét a Katedrálisban.

Délután a sziget ősi fővárosába, Mdinába utazunk, ahol a Trónok Harca forgatási helyszínei és a híres Fontanella cukrászda panorámás terasza vár bennünket.`,
    location: 'Valletta & Mdina, Málta',
    country: 'Málta',
    departure_location: 'Valletta, Tritón-kút (City Gate főlépcső)',
    event_date: '2026-10-18',
    start_time: '09:30',
    end_time: '16:00',
    duration: '6.5 óra',
    price: 49,
    currency: 'EUR',
    language: 'Magyar nyelvű idegenvezetés',
    included: [
      'Hivatalos helyi magyar idegenvezető végig a nap folyamán',
      'Kényelmes légkondicionált buszos transzfer Valletta és Mdina között',
      'Részletes történelmi és kulturális tájékoztató audiorendszerrel',
      'Helyi pasztizzi (máltai leveles ricottás süti) kóstoló'
    ],
    not_included: [
      'Szent János Társkatedrális belépőjegy (15 EUR)',
      'Ebéd Mdinában'
    ],
    max_participants: 20,
    status: 'published',
    featured: true,
    created_at: '2026-09-10T14:00:00Z',
    updated_at: '2026-09-10T14:00:00Z',
  },
  {
    id: 'prog-mlt-2',
    provider_id: 'prov-malta',
    category_id: 'cat-hajos',
    region_id: 'reg-malta',
    title: 'Gozo & Comino Kék Lagúna katamarán túra magyar kísérővel',
    slug: 'gozo-comino-kek-laguna-hajo-tura-magyarul',
    short_description: 'Kristálytiszta türkiz víz, fürdőzés a Kék Lagúnában és Gozo Citadellájának meglátogatása egy felejthetetlen napon.',
    description: `Hajózz velünk a Földközi-tenger legszebb vizű öblébe! Comino szigeténél horgonyzunk le, ahol úszhatsz a Kék Lagúna smaragdzöld vizében. Ezután áthajózunk Gozóra, ahol privát kisbusszal meglátogatjuk Victoria Citadelláját és Xlendi festői halászfaluját.`,
    location: 'Comino & Gozo, Málta',
    country: 'Málta',
    departure_location: 'Sliema Ferries vagy Bugibba kikötő',
    event_date: '2026-10-22',
    start_time: '09:00',
    end_time: '18:00',
    duration: '9 óra',
    price: 58,
    currency: 'EUR',
    language: 'Magyar nyelvű kíséret',
    included: [
      'Hajójegy oda-vissza a modern katamaránon',
      'Fürdési megálló a Comino Kék Lagúnánál',
      'Gozói kisbuszos transzfer és idegenvezetés a Citadellánál',
      'Magyar csoportkísérő'
    ],
    not_included: [
      'Ebéd a gozói kikötőben',
      'Napágy bérlés Cominón'
    ],
    max_participants: 25,
    status: 'published',
    featured: false,
    created_at: '2026-09-12T16:00:00Z',
    updated_at: '2026-09-12T16:00:00Z',
  },

  // 3. BARCELONA
  {
    id: 'prog-bcn-1',
    provider_id: 'prov-spain',
    category_id: 'cat-varosnezes',
    region_id: 'reg-barcelona',
    title: 'Gaudí nyomában: Sagrada Família & Park Güell magyar nyelvű séta',
    slug: 'gaudi-nyomaban-sagrada-familia-park-guell-magyarul',
    short_description: 'Antoni Gaudí zsenialitása: bejutás a Sagrada Famíliába sorban állás nélkül, Park Güell panoráma és a Casa Batlló titkai.',
    description: `Nem kell órákat sorban állnod és audioguide-ot böngészned! Élvezd a Sagrada Família lélegzetelállító fényáradatát és kőbe zárt szimbolikáját magyar művészettörténész tolmácsolásában. 

A délelőtti templomlátogatás után a Park Güell mesebeli mozaikteraszához látogatunk, ahonnan egész Barcelona és a Földközi-tenger elénk tárul.`,
    location: 'Barcelona, Katalónia, Spanyolország',
    country: 'Spanyolország',
    departure_location: 'Barcelona, Sagrada Família metrómegálló, Carrer de Mallorca kijárat',
    event_date: '2026-10-17',
    start_time: '10:00',
    end_time: '14:30',
    duration: '4.5 óra',
    price: 59,
    currency: 'EUR',
    language: 'Magyar nyelvű vezetés',
    included: [
      'Magyar nyelvű akkreditált idegenvezető',
      'Soron kívüli (Fast Track) bejutási szervezés',
      'Részletes építészeti és történelmi magyarázatok',
      'Fülhallgatós audio vevőkészülék a tökéletes hangminőségért'
    ],
    not_included: [
      'Hivatalos Sagrada Família és Park Güell kombinált belépőjegy (a túrához előre lefoglaljuk)',
      'Tömegközlekedési jegy a két helyszín között'
    ],
    max_participants: 14,
    status: 'published',
    featured: true,
    created_at: '2026-09-14T09:00:00Z',
    updated_at: '2026-09-14T09:00:00Z',
  },
  {
    id: 'prog-bcn-2',
    provider_id: 'prov-spain',
    category_id: 'cat-kirandulas',
    region_id: 'reg-barcelona',
    title: 'Montserrat szent hegye & Penedès cavakóstoló kisbusszal',
    slug: 'montserrat-cava-kostolo-barcelona-magyarul',
    short_description: 'Fűrész-fogú sziklahegyek, a Fekete Madonna kolostora, majd látogatás egy 150 éves családi pezsgőpincészetben.',
    description: `Hagyd magad mögött a nagyváros nyüzsgését! Montserrat lélegzetelállító sziklaformációi között megtekintjük az ezeréves bencés kolostort és a Fekete Madonnát. Délután a Penedès borvidék egyik legszebb családi pincészetébe látogatunk, ahol 3 féle prémium cavát kóstolunk katalán tapasokkal.`,
    location: 'Montserrat & Penedès, Katalónia',
    country: 'Spanyolország',
    departure_location: 'Barcelona, Plaça de Catalunya (Hard Rock Cafe előtt)',
    event_date: '2026-10-24',
    start_time: '08:30',
    end_time: '16:30',
    duration: '8 óra',
    price: 79,
    currency: 'EUR',
    language: 'Magyar nyelvű vezetés',
    included: [
      'Utazás kényelmes kisbusszal Barcelonából oda-vissza',
      'Magyar nyelvű túravezető végig a nap során',
      'Montserrat kolostor belépő',
      'Pincelátogatás és 3 tételes cava kóstoló sonkával, sajttal'
    ],
    not_included: [
      'Meleg ebéd (fakultatív étteremben Montserratban)'
    ],
    max_participants: 16,
    status: 'published',
    featured: false,
    created_at: '2026-09-16T11:00:00Z',
    updated_at: '2026-09-16T11:00:00Z',
  },

  // 4. MÁLAGA
  {
    id: 'prog-agp-1',
    provider_id: 'prov-spain',
    category_id: 'cat-kirandulas',
    region_id: 'reg-malaga',
    title: 'Caminito del Rey – A Királyok Ösvénye szurdoktúra magyar kísérővel',
    slug: 'caminito-del-rey-szurdoktura-malaga-magyarul',
    short_description: 'Spanyolország leghíresebb sziklaösvénye 100 méterrel a Gaitanes-szurdok folyója felett. Biztonságos, garantált belépővel!',
    description: `A Caminito del Rey a világ egyik leglátványosabb kanyonösvénye. A függőhidak és sziklafalra rögzített fapallók mentén elképesztő geológiai formációk tárulnak fel. Magyar kísérőnkkel a transzfer zökkenőmentes, a nehezen beszerezhető belépőjegyeket előre biztosítjuk.`,
    location: 'El Chorro & Ardales, Málaga tartomány',
    country: 'Spanyolország',
    departure_location: 'Málaga Maria Zambrano vasútállomás vagy szállodai felvétel Costa del Sol-on',
    event_date: '2026-10-19',
    start_time: '08:00',
    end_time: '15:30',
    duration: '7.5 óra',
    price: 68,
    currency: 'EUR',
    language: 'Magyar kísérő és vezetés',
    included: [
      'Garantált Caminito del Rey belépőjegy és védősisak',
      'Buszos utazás Málagából El Chorro szurdokhoz',
      'Magyar nyelvű túravezető a szurdokban',
      'Helyi tapas megálló a túra után'
    ],
    not_included: [
      'Egyéni fogyasztás'
    ],
    max_participants: 18,
    status: 'published',
    featured: true,
    created_at: '2026-09-18T10:00:00Z',
    updated_at: '2026-09-18T10:00:00Z',
  },

  // 5. MALLORCA
  {
    id: 'prog-pmi-1',
    provider_id: 'prov-spain',
    category_id: 'cat-kirandulas',
    region_id: 'reg-mallorca',
    title: 'Mallorca rejtett kincsei: Valldemossa, Sóller és Formentor-fok',
    slug: 'mallorca-rejtett-kincsei-valldemossa-soller-magyarul',
    short_description: 'Chopin zongorája Valldemossában, narancsligeteken átívelő nosztalgiavasút Sóllerben és Mallorca legszebb sziklás kilátója.',
    description: `Tapasztald meg a valódi Mallorcát a tömegturizmuson túl! Kiscsoportos túránkon bejárjuk a Tramuntana-hegység legbájosabb kőfalvait. Megkóstoljuk a híres helyi coca de patata süteményt, felülünk a patinás sólleri fafülkés villamosra, és megállunk a lélegzetelállító Es Colomer kilátónál.`,
    location: 'Valldemossa & Sóller, Mallorca',
    country: 'Spanyolország',
    departure_location: 'Palma de Mallorca belváros vagy Playa de Palma szállodák',
    event_date: '2026-10-21',
    start_time: '09:00',
    end_time: '17:30',
    duration: '8.5 óra',
    price: 72,
    currency: 'EUR',
    language: 'Magyar nyelvű vezetés',
    included: [
      'Kényelmes kisbuszos utazás Palma környékéről',
      'Magyar nyelvű helyi túravezetés',
      'Sólleri nosztalgia villamosjegy Port de Sóllerig',
      'Sütemény és friss mallorcai narancslé kóstoló'
    ],
    not_included: [
      'Ebéd a kikötőben (fakultatív tengeri halas éttermek)'
    ],
    max_participants: 16,
    status: 'published',
    featured: false,
    created_at: '2026-09-20T12:00:00Z',
    updated_at: '2026-09-20T12:00:00Z',
  },

  // 6. RÓMA
  {
    id: 'prog-rom-1',
    provider_id: 'prov-rome',
    category_id: 'cat-varosnezes',
    region_id: 'reg-rome',
    title: 'Ókori Róma & Vatikán kiemelt séta magyar régész-idegenvezetővel',
    slug: 'okori-roma-vatikan-magyar-regesz-vezetes',
    short_description: 'Colosseum, Forum Romanum, Szent Péter Bazilika és a Sixtus-kápolna titkai soron kívüli bejutással, magyar nyelven.',
    description: `Róma történelme elevenedik meg előtted magyar szakértő idegenvezetéssel. Lépj be a gladiátorok arénájába, hallgasd meg az ókori császárok intrikáit a Forum Romanumon, majd délután fedezd fel a Vatikáni Múzeumok felbecsülhetetlen kincseit és Michelangelo mennyezetfreskóját.`,
    location: 'Róma & Vatikánváros, Olaszország',
    country: 'Olaszország',
    departure_location: 'Róma, Colosseo metrómegálló kijárat (Colosseum előtt)',
    event_date: '2026-10-23',
    start_time: '09:00',
    end_time: '15:30',
    duration: '6.5 óra',
    price: 65,
    currency: 'EUR',
    language: 'Magyar régész-idegenvezető',
    included: [
      'Hivatalos magyar anyanyelvű római idegenvezető',
      'Kiemelt időpontos bejutási ügyintézés (Skip the Line)',
      'Prémium fülhallgatós adóvevő készülék',
      'Római kávé és fagylalt megálló a Navona térnél'
    ],
    not_included: [
      'Colosseum és Vatikán hivatalos belépőjegyek',
      'Ebédidőben egyéni fogyasztás'
    ],
    max_participants: 15,
    status: 'published',
    featured: true,
    created_at: '2026-09-22T08:30:00Z',
    updated_at: '2026-09-22T08:30:00Z',
  },
  {
    id: 'prog-rom-2',
    provider_id: 'prov-rome',
    category_id: 'cat-transzfer',
    region_id: 'reg-rome',
    title: 'Róma Fiumicino (FCO) reptéri privát transzfer magyar asszisztenciával',
    slug: 'roma-fiumicino-repteri-privat-transzfer-magyarul',
    short_description: 'Fix áras, megbízható prémium transzfer a repülőtérről a római belvárosi szállásodig. Nem kell a taxiknál alkudozni!',
    description: `Kényelmes, prémium fekete Mercedes furgonnal vagy limuzinnal várjuk gépét a Fiumicino vagy Ciampino repülőtéren. Magyar nyelvű telefonos vagy személyes asszisztenciával, fix díjszabással, rejtett költségek nélkül.`,
    location: 'Fiumicino Repülőtér (FCO) → Róma Belváros',
    country: 'Olaszország',
    departure_location: 'Róma Fiumicino T3 Nemzetközi Érkezési Csarnok',
    event_date: '2026-10-15',
    start_time: '00:00',
    end_time: '23:59',
    duration: '40 perc',
    price: 60,
    currency: 'EUR',
    language: 'Magyar asszisztencia',
    included: [
      'Privát Mercedes jármű (max 4 vagy 7 fő)',
      '1 óra várakozási idő a gép leszállása után',
      'Autópályadíj és repülőtéri behajtási engedély',
      'Magyar nyelvű diszpécser és segítségnyújtás'
    ],
    not_included: [
      'Éjszakai felár (22:00 - 06:00 között +10 EUR)'
    ],
    max_participants: 7,
    status: 'published',
    featured: false,
    created_at: '2026-09-24T14:00:00Z',
    updated_at: '2026-09-24T14:00:00Z',
  },

  // 7. ISZTAMBUL
  {
    id: 'prog-ist-1',
    provider_id: 'prov-istanbul',
    category_id: 'cat-varosnezes',
    region_id: 'reg-istanbul',
    title: 'Isztambul két kontinensen: Boszporusz hajózás & Hagia Sophia magyarul',
    slug: 'isztambul-ket-kontinensen-boszporusz-hagia-sophia-magyarul',
    short_description: 'Hagia Sophia, Kék Mecset, Elsüllyedt Palota, majd privát hajózás a Boszporuszon Európa és Ázsia partjai mentén.',
    description: `Lépj be az Oszmán Birodalom és Bizánc szívébe magyar idegenvezetéssel! Részletesen bejárjuk Sultanahmet csodáit: a Hagia Sophia arany mozaikjait, a Kék Mecset izniki csempéit és a misztikus Bazilika Ciszternát.

Délután privát hajóra szállunk, és a Boszporusz vizéről csodáljuk meg a Dolmabahce palotát, az erődöket és a vízparti luxus yalı villákat.`,
    location: 'Sultanahmet & Boszporusz, Isztambul',
    country: 'Törökország',
    departure_location: 'Isztambul, Sultanahmet tér (Német kút mellett)',
    event_date: '2026-10-25',
    start_time: '09:30',
    end_time: '16:30',
    duration: '7 óra',
    price: 55,
    currency: 'EUR',
    language: 'Magyar nyelvű vezetés',
    included: [
      'Magyar nyelvű hivatalos helyi idegenvezetés',
      '2 órás hajózás a Boszporuszon privát kishajóval',
      'Török tea és simit (szezámmagos perec) kóstoló a hajón',
      'Mecsetlátogatási kendők biztosítása hölgyeknek'
    ],
    not_included: [
      'Múzeumi belépőjegyek',
      'Tradicionális kebab ebéd (kb. 10-15 EUR)'
    ],
    max_participants: 18,
    status: 'published',
    featured: true,
    created_at: '2026-09-26T10:00:00Z',
    updated_at: '2026-09-26T10:00:00Z',
  },
  {
    id: 'prog-ist-2',
    provider_id: 'prov-istanbul',
    category_id: 'cat-gasztro',
    region_id: 'reg-istanbul',
    title: 'Ázsiai Ízutazás: Kadiköy gasztrotúra & Fűszerbazár magyarul',
    slug: 'azsiai-izutazas-kadikoy-gasztrotura-isztambul-magyarul',
    short_description: 'Kompátkelés Ázsiába, utcai ételek, valódi török kávéfőzés parázson, baklava mesterek és fűszer kavalkád.',
    description: `Ismerd meg Isztambul legízletesebb oldalát! Sárga komppal áthajózunk az ázsiai oldal bohém negyedébe, Kadiköybe. Megkóstoljuk a valódi lahmacunt, a cağ kebabot, a kaymakos mézet, és megismerjük az ezeréves török fűszerek titkait.`,
    location: 'Kadiköy & Eminönü, Isztambul',
    country: 'Törökország',
    departure_location: 'Eminönü kompkikötő bejárat',
    event_date: '2026-11-01',
    start_time: '11:00',
    end_time: '16:00',
    duration: '5 óra',
    price: 45,
    currency: 'EUR',
    language: 'Magyar nyelvű kíséret',
    included: [
      'Magyar gasztro-idegenvezetés',
      '6 féle autentikus utcai ételkóstoló (édes és sós finomságok)',
      'Tradicionális török kávé parázson főzve',
      'Kompjegy oda-vissza a kontinensek között'
    ],
    not_included: [
      'Nagybevásárlás a Fűszerbazárban'
    ],
    max_participants: 12,
    status: 'published',
    featured: false,
    created_at: '2026-09-28T14:00:00Z',
    updated_at: '2026-09-28T14:00:00Z',
  },
];

export const INITIAL_PROGRAM_IMAGES: ProgramImage[] = [
  // 1. Ciprus Troodos
  {
    id: 'img-cyp-1-1',
    program_id: 'prog-cyp-1',
    image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },
  {
    id: 'img-cyp-1-2',
    program_id: 'prog-cyp-1',
    image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    is_cover: false,
    sort_order: 1,
  },

  // 2. Ciprus Transzfer
  {
    id: 'img-cyp-2-1',
    program_id: 'prog-cyp-2',
    image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 3. Málta Valletta
  {
    id: 'img-mlt-1-1',
    program_id: 'prog-mlt-1',
    image_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },
  {
    id: 'img-mlt-1-2',
    program_id: 'prog-mlt-1',
    image_url: 'https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?auto=format&fit=crop&w=800&q=80',
    is_cover: false,
    sort_order: 1,
  },

  // 4. Málta Gozo & Kék Lagúna
  {
    id: 'img-mlt-2-1',
    program_id: 'prog-mlt-2',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 5. Barcelona Sagrada
  {
    id: 'img-bcn-1-1',
    program_id: 'prog-bcn-1',
    image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },
  {
    id: 'img-bcn-1-2',
    program_id: 'prog-bcn-1',
    image_url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80',
    is_cover: false,
    sort_order: 1,
  },

  // 6. Barcelona Montserrat
  {
    id: 'img-bcn-2-1',
    program_id: 'prog-bcn-2',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 7. Málaga Caminito
  {
    id: 'img-agp-1-1',
    program_id: 'prog-agp-1',
    image_url: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 8. Mallorca Valldemossa
  {
    id: 'img-pmi-1-1',
    program_id: 'prog-pmi-1',
    image_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 9. Róma Ókor
  {
    id: 'img-rom-1-1',
    program_id: 'prog-rom-1',
    image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 10. Róma Transzfer
  {
    id: 'img-rom-2-1',
    program_id: 'prog-rom-2',
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 11. Isztambul Boszporusz
  {
    id: 'img-ist-1-1',
    program_id: 'prog-ist-1',
    image_url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },

  // 12. Isztambul Gasztro
  {
    id: 'img-ist-2-1',
    program_id: 'prog-ist-2',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    is_cover: true,
    sort_order: 0,
  },
];

export const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: 'inq-1',
    program_id: 'prog-cyp-1',
    provider_id: 'prov-cyprus',
    name: 'Tóth Katalin',
    email: 'katalin.toth@gmail.com',
    phone: '+36 30 112 3456',
    message: 'Október 15-én érkezünk Ayia Napára 4 fővel. Érdeklődnék, hogy van-e még szabad hely a Troodos kirándulásra és el tudtok-e venni a szállodánktól?',
    created_at: '2026-10-01T14:32:00Z',
    program_title: 'Troodos-hegység, Kykkos kolostor & Omodos hegyi falu',
    provider_name: 'Ciprus Magyarul Élménytúrák',
  },
  {
    id: 'inq-2',
    program_id: 'prog-bcn-1',
    provider_id: 'prov-spain',
    name: 'Kovács Péter',
    email: 'kovacs.peter@freemail.hu',
    phone: '+36 20 987 6543',
    message: 'A Sagrada Família túrára van-e lehetőség privát időpontot kérni 6 fős baráti társaságnak október 20-án?',
    created_at: '2026-10-02T09:15:00Z',
    program_title: 'Gaudí nyomában: Sagrada Família & Park Güell magyar nyelvű séta',
    provider_name: 'Iberia Kalandok – Spanyolországi Magyar Séták',
  },
  {
    id: 'inq-3',
    program_id: 'prog-cyp-2',
    provider_id: 'prov-cyprus',
    name: 'Balogh Mária',
    email: 'maria.balogh@outlook.hu',
    phone: '+36 70 333 4455',
    message: 'Wizz Air járattal érkezünk Larnacára 2 felnőtt + 2 gyerekkel és babakocsival. A reptéri transzferhez tudtok biztosítani 2 db gyerekülést?',
    created_at: '2026-10-02T16:45:00Z',
    program_title: 'Larnaca Reptéri Transzfer (Ayia Napa / Protaras) magyar sofőrrel',
    provider_name: 'Ciprus Magyarul Élménytúrák',
  },
];
