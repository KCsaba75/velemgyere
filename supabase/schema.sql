-- =========================================================================
-- Velem Gyere – Supabase Database Schema, RLS & Kezdőadatok
-- Külföldi Magyar Nyelvű Programok, Kirándulások & Transzferek Katalógusa
-- Futtasd le ezt a szkriptet a Supabase SQL Editorában (Run gomb)!
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id text primary key default uuid_generate_v4()::text,
  user_id text unique,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'provider', 'visitor')) default 'visitor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROVIDERS (Külföldi magyar szolgáltatók)
create table if not exists public.providers (
  id text primary key default uuid_generate_v4()::text,
  user_id text unique,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  website text,
  description text not null,
  status text not null check (status in ('pending', 'approved', 'suspended')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. REGIONS (Úticélok / Régiók – Ciprus, Málta, Barcelona, Málaga, Mallorca, Róma, Isztambul...)
create table if not exists public.regions (
  id text primary key default uuid_generate_v4()::text,
  country text not null,
  name text not null,
  slug text not null unique,
  flag_emoji text default '✈️',
  description text,
  image_url text,
  active boolean default true not null
);

-- 4. CATEGORIES (Szolgáltatás Típusok – Kirándulás, Városnézés, Reptéri Transzfer, Hajós élmények...)
create table if not exists public.categories (
  id text primary key default uuid_generate_v4()::text,
  name text not null,
  slug text not null unique,
  icon text not null,
  active boolean default true not null
);

-- 5. PROGRAMS (Külföldi magyar programok és transzferek)
create table if not exists public.programs (
  id text primary key default uuid_generate_v4()::text,
  provider_id text references public.providers(id) on delete cascade not null,
  category_id text references public.categories(id) on delete restrict not null,
  region_id text references public.regions(id) on delete set null,
  title text not null,
  slug text not null,
  short_description text not null,
  description text not null,
  location text not null,
  country text,
  departure_location text not null,
  event_date date not null,
  start_time text not null,
  end_time text not null,
  duration text not null,
  price numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  language text not null default 'Magyar nyelvű vezetés',
  included text[] default '{}'::text[] not null,
  not_included text[] default '{}'::text[] not null,
  max_participants integer,
  status text not null check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')) default 'draft',
  featured boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PROGRAM IMAGES
create table if not exists public.program_images (
  id text primary key default uuid_generate_v4()::text,
  program_id text references public.programs(id) on delete cascade not null,
  image_url text not null,
  is_cover boolean default false not null,
  sort_order integer default 0 not null
);

-- 7. INQUIRIES (Érdeklődések)
create table if not exists public.inquiries (
  id text primary key default uuid_generate_v4()::text,
  program_id text references public.programs(id) on delete cascade not null,
  provider_id text references public.providers(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index if not exists idx_programs_provider on public.programs(provider_id);
create index if not exists idx_programs_category on public.programs(category_id);
create index if not exists idx_programs_region on public.programs(region_id);
create index if not exists idx_programs_status on public.programs(status);
create index if not exists idx_inquiries_provider on public.inquiries(provider_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.regions enable row level security;
alter table public.categories enable row level security;
alter table public.programs enable row level security;
alter table public.program_images enable row level security;
alter table public.inquiries enable row level security;

-- Policies (Permissive development policies for public anon key usage in MVP)
drop policy if exists "Public read regions" on public.regions;
create policy "Public read regions" on public.regions for select using (true);
drop policy if exists "Public insert regions" on public.regions;
create policy "Public insert regions" on public.regions for insert with check (true);
drop policy if exists "Public update regions" on public.regions for update using (true);
drop policy if exists "Public delete regions" on public.regions for delete using (true);

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);
drop policy if exists "Public insert categories" on public.categories;
create policy "Public insert categories" on public.categories for insert with check (true);
drop policy if exists "Public update categories" on public.categories for update using (true);
drop policy if exists "Public delete categories" on public.categories for delete using (true);

drop policy if exists "Public read providers" on public.providers;
create policy "Public read providers" on public.providers for select using (true);
drop policy if exists "Public insert providers" on public.providers;
create policy "Public insert providers" on public.providers for insert with check (true);
drop policy if exists "Public update providers" on public.providers for update using (true);

drop policy if exists "Public read programs" on public.programs;
create policy "Public read programs" on public.programs for select using (true);
drop policy if exists "Public insert programs" on public.programs;
create policy "Public insert programs" on public.programs for insert with check (true);
drop policy if exists "Public update programs" on public.programs for update using (true);
drop policy if exists "Public delete programs" on public.programs for delete using (true);

drop policy if exists "Public read program_images" on public.program_images;
create policy "Public read program_images" on public.program_images for select using (true);
drop policy if exists "Public insert program_images" on public.program_images;
create policy "Public insert program_images" on public.program_images for insert with check (true);
drop policy if exists "Public delete program_images" on public.program_images;
create policy "Public delete program_images" on public.program_images for delete using (true);

drop policy if exists "Public insert inquiries" on public.inquiries;
create policy "Public insert inquiries" on public.inquiries for insert with check (true);
drop policy if exists "Public read inquiries" on public.inquiries;
create policy "Public read inquiries" on public.inquiries for select using (true);

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select using (true);
drop policy if exists "Public insert profiles" on public.profiles;
create policy "Public insert profiles" on public.profiles for insert with check (true);

-- =========================================================================
-- KEZDŐADATOK BETÖLTÉSE (INITIAL SEED DATA)
-- =========================================================================

-- 1. Kategóriák
insert into public.categories (id, name, slug, icon, active) values
  ('cat-kirandulas', 'Kirándulás & Természet', 'kirandulas', 'Compass', true),
  ('cat-varosnezes', 'Városnézés & Séta', 'varosnezes', 'Landmark', true),
  ('cat-transzfer', 'Reptéri & Helyi Transzfer', 'transzfer', 'Car', true),
  ('cat-hajos', 'Hajókirándulás', 'hajos', 'Ship', true),
  ('cat-gasztro', 'Gasztrotúra & Kóstoló', 'gasztro', 'Utensils', true),
  ('cat-privat', 'Privát túra & Sofőrszolgálat', 'privat', 'Shield', true),
  ('cat-csaladi', 'Családi program', 'csaladi', 'Users', true)
on conflict (id) do nothing;

-- 2. Régiók
insert into public.regions (id, country, name, slug, flag_emoji, description, image_url, active) values
  ('reg-cyprus', 'Ciprus', 'Ciprus', 'ciprus', '🇨🇾', 'Ayia Napa, Larnaca, Paphos, Limassol és a Troodos-hegység.', 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80', true),
  ('reg-malta', 'Málta', 'Málta & Gozo', 'malta', '🇲🇹', 'Valletta, Mdina, Kék Lagúna és Gozo szigete.', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', true),
  ('reg-barcelona', 'Spanyolország', 'Barcelona', 'barcelona', '🇪🇸', 'Gaudí építészete, Sagrada Família, Gótikus negyed és Montserrat.', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', true),
  ('reg-malaga', 'Spanyolország', 'Málaga & Costa del Sol', 'malaga', '🇪🇸', 'Andalúzia fehér falvai, Caminito del Rey és Gibraltár.', 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=800&q=80', true),
  ('reg-mallorca', 'Spanyolország', 'Mallorca', 'mallorca', '🇪🇸', 'Valldemossa, Sóller, Formentor-fok és türkiz öblök.', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80', true),
  ('reg-rome', 'Olaszország', 'Róma', 'roma', '🇮🇹', 'Colosseum, Vatikáni Múzeumok, Trastevere és Tivoli villái.', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80', true),
  ('reg-istanbul', 'Törökország', 'Isztambul', 'isztambul', '🇹🇷', 'Boszporusz hajózás, Kék Mecset, Hagia Sophia és fűszerbazárok.', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', true)
on conflict (id) do nothing;

-- 3. Szolgáltatók
insert into public.providers (id, user_id, company_name, contact_name, email, phone, website, description, status) values
  ('prov-cyprus', 'user-prov-cyprus', 'Ciprus Magyarul Élménytúrák', 'Németh Zoltán & Dóra', 'info@ciprusmagyarul.com', '+357 99 123 456', 'https://ciprusmagyarul.com', 'Több mint 8 éve élünk Cipruson. Magyar nyelvű kiscsoportos kirándulásokat, hegyi túrákat és megbízható reptéri transzfereket biztosítunk.', 'approved'),
  ('prov-malta', 'user-prov-malta', 'Malta & Gozo Magyar Kísérettel', 'Varga Gabriella', 'gabriella@maltamagyarul.hu', '+356 79 456 789', 'https://maltamagyarul.hu', 'Hivatalos máltai engedéllyel rendelkező helyi magyar idegenvezető. Történelmi séták Vallettában, Mdina és Gozo privát élmények.', 'approved'),
  ('prov-spain', 'user-prov-spain', 'Iberia Kalandok – Spanyolországi Magyar Séták', 'Szabó Bence & Carmen', 'hola@iberiakalandok.es', '+34 612 345 678', 'https://iberiakalandok.es', 'Barcelonában, Málagán és Mallorcán szervezünk autentikus magyar nyelvű városi sétákat, szurdoktúrákat és reptéri transzfereket.', 'approved'),
  ('prov-rome', 'user-prov-rome', 'Római Séták & Transzferek', 'Dr. Kovács Márton', 'marton@romaisetak.it', '+39 340 987 6543', 'https://romaisetak.it', 'Rómában élő magyar művészettörténész és idegenvezető. Soron kívüli bejutás a Vatikánba és Colosseumba, Fiumicino transzferek.', 'approved'),
  ('prov-istanbul', 'user-prov-istanbul', 'Isztambul Magyar Kísérővel', 'Demir Emese', 'emese@isztambulmagyarul.com', '+90 532 111 2233', 'https://isztambulmagyarul.com', '12 éve Isztambulban élő magyar kísérő: hajózás a Boszporuszon, gasztrotúrák és privát reptéri asszisztencia.', 'approved')
on conflict (id) do nothing;

-- 4. Programok
insert into public.programs (id, provider_id, category_id, region_id, title, slug, short_description, description, location, country, departure_location, event_date, start_time, end_time, duration, price, currency, language, included, not_included, max_participants, status, featured) values
  ('prog-cyp-1', 'prov-cyprus', 'cat-kirandulas', 'reg-cyprus', 'Troodos-hegység, Kykkos kolostor & Omodos hegyi falu', 'troodos-hegyseg-kykkos-kolostor-omodos-ciprus', 'Magyar nyelvű kisbuszos kirándulás a zöld szívbe: cédruserdők, aranymozaikos kolostor és borkóstoló egy tradicionális hegyi faluban.', 'Fedezd fel Ciprus hűvös, fenyőillatú hegyvidékét magyar vezetéssel! Kirándulásunk során meglátogatjuk az UNESCO világörökségi oltalmú területeket és a Kykkos kolostort.', 'Troodos & Omodos, Ciprus', 'Ciprus', 'Szállodai felvétel: Ayia Napa, Protaras, Larnaca vagy Limassol', '2026-10-15', '08:00', '17:30', 'Egész napos (9 óra)', 65, 'EUR', 'Magyar nyelvű vezetés', array['Szállodai transzfer oda-vissza kisbusszal', 'Magyar nyelvű idegenvezetés', 'Kykkos kolostor belépő', 'Borkóstoló Omodosban'], array['Ebéd hegyi tavernban', 'Egyéni szuvenírek'], 16, 'published', true),
  ('prog-cyp-2', 'prov-cyprus', 'cat-transzfer', 'reg-cyprus', 'Larnaca Reptéri Transzfer (Ayia Napa / Protaras) magyar sofőrrel', 'larnaca-repuloteri-privat-transzfer-magyarul', 'Pontos, megbízható reptéri privát transzfer közvetlenül a szállásodig. Magyar sofőr, nincs stressz, hasznos helyi tippek útközben.', 'Érkezz nyugodtan Ciprusra! A járatod érkezésekor a sofőr névtáblával vár a Larnaca repülőtéren.', 'Larnaca Reptér → Ayia Napa / Protaras / Limassol', 'Ciprus', 'Larnaca Nemzetközi Repülőtér (LCA) érkezési terminál', '2026-10-10', '00:00', '23:59', '45-60 perc', 55, 'EUR', 'Magyar sofőr és asszisztencia', array['Privát transzfer max 4-8 fő részére', 'Névtáblás találkozó', 'Járatkésés díjmentes követése'], array['Borravaló'], 8, 'published', false),
  ('prog-mlt-1', 'prov-malta', 'cat-varosnezes', 'reg-malta', 'Málta esszenciája: Valletta, Mdina és a Három Város magyarul', 'malta-esszenciaja-valletta-mdina-magyar-vezetes', 'A Máltai Lovagrend dicsősége: Felső Barrakka kertek, Szent János társkatedrális és a Csendes Város macskaköves titkai.', 'Ismerd meg Málta 7000 éves történelmét egy lenyűgöző magyar nyelvű sétán! Délelőtt Valletta, délután Mdina.', 'Valletta & Mdina, Málta', 'Málta', 'Valletta, Tritón-kút (City Gate főlépcső)', '2026-10-18', '09:30', '16:00', '6.5 óra', 49, 'EUR', 'Magyar nyelvű idegenvezetés', array['Hivatalos máltai magyar idegenvezető', 'Klímás buszos transzfer Valletta és Mdina között', 'Pasztizzi kóstoló'], array['Katedrális belépőjegy (15 EUR)', 'Ebéd'], 20, 'published', true),
  ('prog-mlt-2', 'prov-malta', 'cat-hajos', 'reg-malta', 'Gozo & Comino Kék Lagúna katamarán túra magyar kísérővel', 'gozo-comino-kek-laguna-hajo-tura-magyarul', 'Kristálytiszta türkiz víz, fürdőzés a Kék Lagúnában és Gozo Citadellájának meglátogatása egy felejthetetlen napon.', 'Hajózz velünk a Földközi-tenger legszebb vizű öblébe! Comino szigeténél fürdőzés, majd Gozo Citadella.', 'Comino & Gozo, Málta', 'Málta', 'Sliema Ferries vagy Bugibba kikötő', '2026-10-22', '09:00', '18:00', '9 óra', 58, 'EUR', 'Magyar nyelvű kíséret', array['Hajójegy oda-vissza a katamaránon', 'Fürdési megálló Cominónál', 'Gozói kisbuszos transzfer', 'Magyar csoportkísérő'], array['Ebéd a kikötőben'], 25, 'published', false),
  ('prog-bcn-1', 'prov-spain', 'cat-varosnezes', 'reg-barcelona', 'Gaudí nyomában: Sagrada Família & Park Güell magyar nyelvű séta', 'gaudi-nyomaban-sagrada-familia-park-guell-magyarul', 'Antoni Gaudí zsenialitása: bejutás a Sagrada Famíliába sorban állás nélkül, Park Güell panoráma és a Casa Batlló titkai.', 'Nem kell órákat sorban állnod! Sagrada Família és Park Güell magyar művészettörténész tolmácsolásában.', 'Barcelona, Katalónia, Spanyolország', 'Spanyolország', 'Barcelona, Sagrada Família metrómegálló kijárat', '2026-10-17', '10:00', '14:30', '4.5 óra', 59, 'EUR', 'Magyar nyelvű vezetés', array['Magyar nyelvű akkreditált idegenvezető', 'Fast track bejutás szervezése', 'Fülhallgatós adóvevő készülék'], array['Belépőjegyek', 'Metrójegy a két helyszín között'], 14, 'published', true),
  ('prog-bcn-2', 'prov-spain', 'cat-kirandulas', 'reg-barcelona', 'Montserrat szent hegye & Penedès cavakóstoló kisbusszal', 'montserrat-cava-kostolo-barcelona-magyarul', 'Fűrész-fogú sziklahegyek, a Fekete Madonna kolostora, majd látogatás egy 150 éves családi pezsgőpincészetben.', 'Hagyd magad mögött a nagyváros nyüzsgését! Montserrat sziklái, Fekete Madonna és 3 tételes prémium cavakóstoló.', 'Montserrat & Penedès, Katalónia', 'Spanyolország', 'Barcelona, Plaça de Catalunya (Hard Rock Cafe előtt)', '2026-10-24', '08:30', '16:30', '8 óra', 79, 'EUR', 'Magyar nyelvű vezetés', array['Kisbuszos utazás oda-vissza', 'Magyar nyelvű túravezető', 'Kolostor belépő', 'Pincelátogatás és cavakóstoló'], array['Ebéd Montserratban'], 16, 'published', false),
  ('prog-agp-1', 'prov-spain', 'cat-kirandulas', 'reg-malaga', 'Caminito del Rey – A Királyok Ösvénye szurdoktúra magyar kísérővel', 'caminito-del-rey-szurdoktura-malaga-magyarul', 'Spanyolország leghíresebb sziklaösvénye 100 méterrel a Gaitanes-szurdok folyója felett. Biztonságos, garantált belépővel!', 'A világ egyik leglátványosabb kanyonösvénye. Transzfer Málagából, garantált belépővel és magyar kísérővel.', 'El Chorro & Ardales, Málaga tartomány', 'Spanyolország', 'Málaga Maria Zambrano állomás vagy Costa del Sol szállodák', '2026-10-19', '08:00', '15:30', '7.5 óra', 68, 'EUR', 'Magyar kísérő és vezetés', array['Garantált belépőjegy és védősisak', 'Buszos transzfer Málagából', 'Magyar túravezető'], array['Egyéni fogyasztás'], 18, 'published', true),
  ('prog-pmi-1', 'prov-spain', 'cat-kirandulas', 'reg-mallorca', 'Mallorca rejtett kincsei: Valldemossa, Sóller és Formentor-fok', 'mallorca-rejtett-kincsei-valldemossa-soller-magyarul', 'Chopin zongorája Valldemossában, narancsligeteken átívelő nosztalgiavasút Sóllerben és Mallorca legszebb sziklás kilátója.', 'Kiscsoportos túra a Tramuntana-hegység falvaiban. Sólleri villamosozás és az Es Colomer kilátó.', 'Valldemossa & Sóller, Mallorca', 'Spanyolország', 'Palma de Mallorca belváros vagy Playa de Palma szállodák', '2026-10-21', '09:00', '17:30', '8.5 óra', 72, 'EUR', 'Magyar nyelvű vezetés', array['Kisbuszos utazás Palmából', 'Magyar nyelvű túravezetés', 'Sólleri nosztalgia villamosjegy', 'Mallorcai narancslé és süti'], array['Ebéd Port de Sóllerben'], 16, 'published', false),
  ('prog-rom-1', 'prov-rome', 'cat-varosnezes', 'reg-rome', 'Ókori Róma & Vatikán kiemelt séta magyar régész-idegenvezetővel', 'okori-roma-vatikan-magyar-regesz-vezetes', 'Colosseum, Forum Romanum, Szent Péter Bazilika és a Sixtus-kápolna titkai soron kívüli bejutással, magyar nyelven.', 'Róma történelme elevenedik meg előtted magyar szakértő idegenvezetéssel. Colosseum, Forum és Vatikán.', 'Róma & Vatikánváros, Olaszország', 'Olaszország', 'Róma, Colosseo metrómegálló kijárat', '2026-10-23', '09:00', '15:30', '6.5 óra', 65, 'EUR', 'Magyar régész-idegenvezető', array['Hivatalos magyar anyanyelvű idegenvezető', 'Soron kívüli bejutás ügyintézése', 'Fülhallgatós adóvevő készülék'], array['Hivatalos belépőjegyek', 'Ebéd'], 15, 'published', true),
  ('prog-rom-2', 'prov-rome', 'cat-transzfer', 'reg-rome', 'Róma Fiumicino (FCO) reptéri privát transzfer magyar asszisztenciával', 'roma-fiumicino-repteri-privat-transzfer-magyarul', 'Fix áras, megbízható prémium transzfer a repülőtérről a római belvárosi szállásodig. Nem kell a taxiknál alkudozni!', 'Prémium Mercedes járművel várjuk géped a Fiumicino repülőtéren. Magyar nyelvű telefonos asszisztencia.', 'Fiumicino Repülőtér (FCO) → Róma Belváros', 'Olaszország', 'Róma Fiumicino T3 Nemzetközi Érkezési Csarnok', '2026-10-15', '00:00', '23:59', '40 perc', 60, 'EUR', 'Magyar asszisztencia', array['Privát Mercedes jármű max 4-7 fő', '1 óra várakozási idő', 'Autópályadíj és reptéri engedély', 'Magyar diszpécser'], array['Éjszakai felár (22:00-06:00 között)'], 7, 'published', false),
  ('prog-ist-1', 'prov-istanbul', 'cat-varosnezes', 'reg-istanbul', 'Isztambul két kontinensen: Boszporusz hajózás & Hagia Sophia magyarul', 'isztambul-ket-kontinensen-boszporusz-hagia-sophia-magyarul', 'Hagia Sophia, Kék Mecset, Elsüllyedt Palota, majd privát hajózás a Boszporuszon Európa és Ázsia partjai mentén.', 'Sultanahmet csodái és privát hajózás a Boszporuszon magyar kísérővel Európa és Ázsia partjai között.', 'Sultanahmet & Boszporusz, Isztambul', 'Törökország', 'Isztambul, Sultanahmet tér (Német kút mellett)', '2026-10-25', '09:30', '16:30', '7 óra', 55, 'EUR', 'Magyar nyelvű vezetés', array['Magyar nyelvű hivatalos helyi idegenvezetés', '2 órás hajózás a Boszporuszon kishajóval', 'Török tea és perec a hajón'], array['Múzeumi belépőjegyek', 'Ebéd'], 18, 'published', true),
  ('prog-ist-2', 'prov-istanbul', 'cat-gasztro', 'reg-istanbul', 'Ázsiai Ízutazás: Kadiköy gasztrotúra & Fűszerbazár magyarul', 'azsiai-izutazas-kadikoy-gasztrotura-isztambul-magyarul', 'Kompátkelés Ázsiába, utcai ételek, valódi török kávéfőzés parázson, baklava mesterek és fűszer kavalkád.', 'Sárga komppal áthajózunk az ázsiai Kadiköybe. 6 féle autentikus utcai ételkóstoló és valódi török kávé parázson.', 'Kadiköy & Eminönü, Isztambul', 'Törökország', 'Eminönü kompkikötő bejárat', '2026-11-01', '11:00', '16:00', '5 óra', 45, 'EUR', 'Magyar nyelvű kíséret', array['Magyar gasztro-idegenvezetés', '6 féle autentikus utcai ételkóstoló', 'Török kávé parázson', 'Kompjegy oda-vissza'], array['Nagybevásárlás a bazárban'], 12, 'published', false)
on conflict (id) do nothing;

-- 5. Képek
insert into public.program_images (id, program_id, image_url, is_cover, sort_order) values
  ('img-cyp-1-1', 'prog-cyp-1', 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-cyp-1-2', 'prog-cyp-1', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80', false, 1),
  ('img-cyp-2-1', 'prog-cyp-2', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-mlt-1-1', 'prog-mlt-1', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-mlt-1-2', 'prog-mlt-1', 'https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?auto=format&fit=crop&w=800&q=80', false, 1),
  ('img-mlt-2-1', 'prog-mlt-2', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-bcn-1-1', 'prog-bcn-1', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-bcn-1-2', 'prog-bcn-1', 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80', false, 1),
  ('img-bcn-2-1', 'prog-bcn-2', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-agp-1-1', 'prog-agp-1', 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-pmi-1-1', 'prog-pmi-1', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-rom-1-1', 'prog-rom-1', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-rom-2-1', 'prog-rom-2', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-ist-1-1', 'prog-ist-1', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('img-ist-2-1', 'prog-ist-2', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80', true, 0)
on conflict (id) do nothing;
