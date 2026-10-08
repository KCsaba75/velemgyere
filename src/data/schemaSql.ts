export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- Velem Gyere – Supabase Database Schema, RLS & Kezdoadatok
-- Külföldi Magyar Nyelvű Programok, Kirándulások & Transzferek Katalógusa
-- Futtasd le ezt a szkriptet a Supabase SQL Editorában (Run gomb)!
-- =========================================================================

-- UUID kiterjesztés
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Felhasználói profilok)
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
  status text default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. FAVORITE FOLDERS (Utazási mappák & Tematikus kedvencek gyűjtemények)
create table if not exists public.favorite_folders (
  id text primary key default uuid_generate_v4()::text,
  user_id text not null,
  name text not null,
  description text,
  color text default 'emerald',
  icon text default 'heart',
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. FAVORITES (Elmentett kedvenc programok a felhasználó mappáiban)
create table if not exists public.favorites (
  id text primary key default uuid_generate_v4()::text,
  user_id text not null,
  program_id text not null references public.programs(id) on delete cascade,
  folder_id text not null references public.favorite_folders(id) on delete cascade,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. REVIEWS (Értékelések & Részletes visszajelzések igazolt vásárlóktól)
create table if not exists public.reviews (
  id text primary key default uuid_generate_v4()::text,
  program_id text not null references public.programs(id) on delete cascade,
  order_id text,
  user_id text not null,
  user_name text not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  rating_guide numeric(2,1) not null default 5,
  rating_value numeric(2,1) not null default 5,
  rating_organization numeric(2,1) not null default 5,
  rating_safety numeric(2,1) not null default 5,
  title text,
  comment text not null,
  positive_feedback text,
  improvement_feedback text,
  travel_type text default 'couple',
  tour_date text not null,
  is_verified_buyer boolean default true,
  photos text[] default '{}'::text[],
  provider_id text references public.providers(id) on delete cascade,
  provider_name text,
  provider_response jsonb,
  status text not null default 'published' check (status in ('pending', 'published', 'flagged', 'hidden')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexek
create index if not exists idx_programs_region on public.programs(region_id);
create index if not exists idx_programs_category on public.programs(category_id);
create index if not exists idx_programs_provider on public.programs(provider_id);
create index if not exists idx_programs_status on public.programs(status);
create index if not exists idx_program_images_program on public.program_images(program_id);
create index if not exists idx_inquiries_provider on public.inquiries(provider_id);
create index if not exists idx_favorite_folders_user on public.favorite_folders(user_id);
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_folder on public.favorites(folder_id);
create index if not exists idx_favorites_program on public.favorites(program_id);
create index if not exists idx_reviews_program on public.reviews(program_id);
create index if not exists idx_reviews_provider on public.reviews(provider_id);

-- RLS (Row Level Security) engedélyezése
alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.regions enable row level security;
alter table public.categories enable row level security;
alter table public.programs enable row level security;
alter table public.program_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.favorite_folders enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

-- Házirendek publikus eléréshez
drop policy if exists "Public read regions" on public.regions;
create policy "Public read regions" on public.regions for select using (true);
drop policy if exists "Public write regions" on public.regions;
create policy "Public write regions" on public.regions for all using (true);

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);
drop policy if exists "Public write categories" on public.categories;
create policy "Public write categories" on public.categories for all using (true);

drop policy if exists "Public read programs" on public.programs;
create policy "Public read programs" on public.programs for select using (true);
drop policy if exists "Public write programs" on public.programs;
create policy "Public write programs" on public.programs for all using (true);

drop policy if exists "Public read providers" on public.providers;
create policy "Public read providers" on public.providers for select using (true);
drop policy if exists "Public write providers" on public.providers;
create policy "Public write providers" on public.providers for all using (true);

drop policy if exists "Public read program_images" on public.program_images;
create policy "Public read program_images" on public.program_images for select using (true);
drop policy if exists "Public write program_images" on public.program_images;
create policy "Public write program_images" on public.program_images for all using (true);

drop policy if exists "Public write inquiries" on public.inquiries;
create policy "Public write inquiries" on public.inquiries for all using (true);

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select using (true);
drop policy if exists "Public write profiles" on public.profiles;
create policy "Public write profiles" on public.profiles for all using (true);

-- Favorite folders & Favorites RLS házirendek (Felhasználó csak a sajátjait kezeli)
drop policy if exists "Users manage own favorite folders" on public.favorite_folders;
create policy "Users manage own favorite folders" on public.favorite_folders for all using (true);

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites" on public.favorites for all using (true);

-- Reviews RLS házirendek
drop policy if exists "Public read published reviews" on public.reviews;
create policy "Public read published reviews" on public.reviews for select using (status = 'published');

drop policy if exists "Public write reviews" on public.reviews;
create policy "Public write reviews" on public.reviews for all using (true);

-- =========================================================================
-- KEZDŐADATOK BETÖLTÉSE (INITIAL SEED DATA)
-- =========================================================================

-- =========================================================================
-- MINTAADATOK BETÖLTÉSE (VALID UUID-K)
-- =========================================================================

-- 1. Kategóriák
insert into public.categories (id, name, slug, icon, active) values
  ('ca000000-0000-4000-8000-000000000001', 'Kirándulás & Természet', 'kirandulas', 'Compass', true),
  ('ca000000-0000-4000-8000-000000000002', 'Városnézés & Séta', 'varosnezes', 'Landmark', true),
  ('ca000000-0000-4000-8000-000000000003', 'Reptéri & Helyi Transzfer', 'transzfer', 'Car', true),
  ('ca000000-0000-4000-8000-000000000004', 'Hajókirándulás', 'hajos', 'Ship', true),
  ('ca000000-0000-4000-8000-000000000005', 'Gasztrotúra & Kóstoló', 'gasztro', 'Utensils', true),
  ('ca000000-0000-4000-8000-000000000006', 'Privát túra & Sofőrszolgálat', 'privat', 'Shield', true),
  ('ca000000-0000-4000-8000-000000000007', 'Családi program', 'csaladi', 'Users', true)
on conflict (id) do nothing;

-- 2. Régiók
insert into public.regions (id, country, name, slug, flag_emoji, description, image_url, active) values
  ('de000000-0000-4000-8000-000000000001', 'Ciprus', 'Ciprus', 'ciprus', '🇨🇾', 'Ayia Napa, Larnaca, Paphos, Limassol és a Troodos-hegység.', 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000002', 'Málta', 'Málta & Gozo', 'malta', '🇲🇹', 'Valletta, Mdina, Kék Lagúna és Gozo szigete.', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000003', 'Spanyolország', 'Barcelona', 'barcelona', '🇪🇸', 'Gaudí építészete, Sagrada Família, Gótikus negyed és Montserrat.', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000004', 'Spanyolország', 'Málaga & Costa del Sol', 'malaga', '🇪🇸', 'Andalúzia fehér falvai, Caminito del Rey és Gibraltár.', 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000005', 'Spanyolország', 'Mallorca', 'mallorca', '🇪🇸', 'Valldemossa, Sóller, Formentor-fok és türkiz öblök.', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000006', 'Olaszország', 'Róma', 'roma', '🇮🇹', 'Colosseum, Vatikáni Múzeumok, Trastevere és Tivoli villái.', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80', true),
  ('de000000-0000-4000-8000-000000000007', 'Törökország', 'Isztambul', 'isztambul', '🇹🇷', 'Boszporusz hajózás, Kék Mecset, Hagia Sophia és fűszerbazárok.', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', true)
on conflict (id) do nothing;

-- 3. Szolgáltatók
insert into public.providers (id, user_id, company_name, contact_name, email, phone, website, description, status) values
  ('ba000000-0000-4000-8000-000000000001', null, 'Ciprus Magyarul Élménytúrák', 'Németh Zoltán & Dóra', 'info@ciprusmagyarul.com', '+357 99 123 456', 'https://ciprusmagyarul.com', 'Több mint 8 éve élünk Cipruson. Magyar nyelvű kiscsoportos kirándulásokat, hegyi túrákat és megbízható reptéri transzfereket biztosítunk.', 'approved'),
  ('ba000000-0000-4000-8000-000000000002', null, 'Malta & Gozo Magyar Kísérettel', 'Varga Gabriella', 'gabriella@maltamagyarul.hu', '+356 79 456 789', 'https://maltamagyarul.hu', 'Hivatalos máltai engedéllyel rendelkező helyi magyar idegenvezető. Történelmi séták Vallettában, Mdina és Gozo privát élmények.', 'approved'),
  ('ba000000-0000-4000-8000-000000000003', null, 'Iberia Kalandok – Spanyolországi Magyar Séták', 'Szabó Bence & Carmen', 'hola@iberiakalandok.es', '+34 612 345 678', 'https://iberiakalandok.es', 'Barcelonában, Málagán és Mallorcán szervezünk autentikus magyar nyelvű városi sétákat, szurdoktúrákat és reptéri transzfereket.', 'approved'),
  ('ba000000-0000-4000-8000-000000000004', null, 'Római Séták & Transzferek', 'Dr. Kovács Márton', 'marton@romaisetak.it', '+39 340 987 6543', 'https://romaisetak.it', 'Rómában élő magyar művészettörténész és idegenvezető. Soron kívüli bejutás a Vatikánba és Colosseumba, Fiumicino transzferek.', 'approved'),
  ('ba000000-0000-4000-8000-000000000005', null, 'Isztambul Magyar Kísérővel', 'Demir Emese', 'emese@isztambulmagyarul.com', '+90 532 111 2233', 'https://isztambulmagyarul.com', '12 éve Isztambulban élő magyar kísérő: hajózás a Boszporuszon, gasztrotúrák és privát reptéri asszisztencia.', 'approved')
on conflict (id) do nothing;

-- 4. Programok
insert into public.programs (id, provider_id, category_id, region_id, title, slug, short_description, description, location, country, departure_location, event_date, start_time, end_time, duration, price, currency, language, included, not_included, max_participants, status, featured) values
  ('ea000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001', 'Troodos-hegység, Kykkos kolostor & Omodos hegyi falu', 'troodos-hegyseg-kykkos-kolostor-omodos-ciprus', 'Magyar nyelvű kisbuszos kirándulás a zöld szívbe: cédruserdők, aranymozaikos kolostor és borkóstoló egy tradicionális hegyi faluban.', 'Fedezd fel Ciprus hűvös, fenyőillatú hegyvidékét magyar vezetéssel! Kirándulásunk során meglátogatjuk az UNESCO világörökségi oltalmú területeket és a Kykkos kolostort.', 'Troodos & Omodos, Ciprus', 'Ciprus', 'Szállodai felvétel: Ayia Napa, Protaras, Larnaca vagy Limassol', '2026-10-15', '08:00', '17:30', 'Egész napos (9 óra)', 65, 'EUR', 'Magyar nyelvű vezetés', array['Szállodai transzfer oda-vissza kisbusszal', 'Magyar nyelvű idegenvezetés', 'Kykkos kolostor belépő', 'Borkóstoló Omodosban'], array['Ebéd hegyi tavernban', 'Egyéni szuvenírek'], 16, 'published', true),
  ('ea000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000001', 'Larnaca Reptéri Transzfer (Ayia Napa / Protaras) magyar sofőrrel', 'larnaca-repuloteri-privat-transzfer-magyarul', 'Pontos, megbízható reptéri privát transzfer közvetlenül a szállásodig. Magyar sofőr, nincs stressz, hasznos helyi tippek útközben.', 'Érkezz nyugodtan Ciprusra! A járatod érkezésekor a sofőr névtáblával vár a Larnaca repülőtéren.', 'Larnaca Reptér → Ayia Napa / Protaras / Limassol', 'Ciprus', 'Larnaca Nemzetközi Repülőtér (LCA) érkezési terminál', '2026-10-10', '00:00', '23:59', '45-60 perc', 55, 'EUR', 'Magyar sofőr és asszisztencia', array['Privát transzfer max 4-8 fő részére', 'Névtáblás találkozó', 'Járatkésés díjmentes követése'], array['Borravaló'], 8, 'published', false),
  ('ea000000-0000-4000-8000-000000000003', 'ba000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000002', 'Málta esszenciája: Valletta, Mdina és a Három Város magyarul', 'malta-esszenciaja-valletta-mdina-magyar-vezetes', 'A Máltai Lovagrend dicsősége: Felső Barrakka kertek, Szent János társkatedrális és a Csendes Város macskaköves titkai.', 'Ismerd meg Málta 7000 éves történelmét egy lenyűgöző magyar nyelvű sétán! Délelőtt Valletta, délután Mdina.', 'Valletta & Mdina, Málta', 'Málta', 'Valletta, Tritón-kút (City Gate főlépcső)', '2026-10-18', '09:30', '16:00', '6.5 óra', 49, 'EUR', 'Magyar nyelvű idegenvezetés', array['Hivatalos máltai magyar idegenvezető', 'Klímás buszos transzfer Valletta és Mdina között', 'Pasztizzi kóstoló'], array['Katedrális belépőjegy (15 EUR)', 'Ebéd'], 20, 'published', true),
  ('ea000000-0000-4000-8000-000000000004', 'ba000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000002', 'Gozo & Comino Kék Lagúna katamarán túra magyar kísérővel', 'gozo-comino-kek-laguna-hajo-tura-magyarul', 'Kristálytiszta türkiz víz, fürdőzés a Kék Lagúnában és Gozo Citadellájának meglátogatása egy felejthetetlen napon.', 'Hajózz velünk a Földközi-tenger legszebb vizű öblébe! Comino szigeténél fürdőzés, majd Gozo Citadella.', 'Comino & Gozo, Málta', 'Málta', 'Sliema Ferries vagy Bugibba kikötő', '2026-10-22', '09:00', '18:00', '9 óra', 58, 'EUR', 'Magyar nyelvű kíséret', array['Hajójegy oda-vissza a katamaránon', 'Fürdési megálló Cominónál', 'Gozói kisbuszos transzfer', 'Magyar csoportkísérő'], array['Ebéd a kikötőben'], 25, 'published', false),
  ('ea000000-0000-4000-8000-000000000005', 'ba000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000003', 'Gaudí nyomában: Sagrada Família & Park Güell magyar nyelvű séta', 'gaudi-nyomaban-sagrada-familia-park-guell-magyarul', 'Antoni Gaudí zsenialitása: bejutás a Sagrada Famíliába sorban állás nélkül, Park Güell panoráma és a Casa Batlló titkai.', 'Nem kell órákat sorban állnod! Sagrada Família és Park Güell magyar művészettörténész tolmácsolásában.', 'Barcelona, Katalónia, Spanyolország', 'Spanyolország', 'Barcelona, Sagrada Família metrómegálló kijárat', '2026-10-17', '10:00', '14:30', '4.5 óra', 59, 'EUR', 'Magyar nyelvű vezetés', array['Magyar nyelvű akkreditált idegenvezető', 'Fast track bejutás szervezése', 'Fülhallgatós adóvevő készülék'], array['Belépőjegyek', 'Metrójegy a két helyszín között'], 14, 'published', true),
  ('ea000000-0000-4000-8000-000000000006', 'ba000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000003', 'Montserrat szent hegye & Penedès cavakóstoló kisbusszal', 'montserrat-cava-kostolo-barcelona-magyarul', 'Fűrész-fogú sziklahegyek, a Fekete Madonna kolostora, majd látogatás egy 150 éves családi pezsgőpincészetben.', 'Hagyd magad mögött a nagyváros nyüzsgését! Montserrat sziklái, Fekete Madonna és 3 tételes prémium cavakóstoló.', 'Montserrat & Penedès, Katalónia', 'Spanyolország', 'Barcelona, Plaça de Catalunya (Hard Rock Cafe előtt)', '2026-10-24', '08:30', '16:30', '8 óra', 79, 'EUR', 'Magyar nyelvű vezetés', array['Kisbuszos utazás oda-vissza', 'Magyar nyelvű túravezető', 'Kolostor belépő', 'Pincelátogatás és cavakóstoló'], array['Ebéd Montserratban'], 16, 'published', false),
  ('ea000000-0000-4000-8000-000000000007', 'ba000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000004', 'Caminito del Rey – A Királyok Ösvénye szurdoktúra magyar kísérővel', 'caminito-del-rey-szurdoktura-malaga-magyarul', 'Spanyolország leghíresebb sziklaösvénye 100 méterrel a Gaitanes-szurdok folyója felett. Biztonságos, garantált belépővel!', 'A világ egyik leglátványosabb kanyonösvénye. Transzfer Málagából, garantált belépővel és magyar kísérővel.', 'El Chorro & Ardales, Málaga tartomány', 'Spanyolország', 'Málaga Maria Zambrano állomás vagy Costa del Sol szállodák', '2026-10-19', '08:00', '15:30', '7.5 óra', 68, 'EUR', 'Magyar kísérő és vezetés', array['Garantált belépőjegy és védősisak', 'Buszos transzfer Málagából', 'Magyar túravezető'], array['Egyéni fogyasztás'], 18, 'published', true),
  ('ea000000-0000-4000-8000-000000000008', 'ba000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000005', 'Mallorca rejtett kincsei: Valldemossa, Sóller és Formentor-fok', 'mallorca-rejtett-kincsei-valldemossa-soller-magyarul', 'Chopin zongorája Valldemossában, narancsligeteken átívelő nosztalgiavasút Sóllerben és Mallorca legszebb sziklás kilátója.', 'Kiscsoportos túra a Tramuntana-hegység falvaiban. Sólleri villamosozás és az Es Colomer kilátó.', 'Valldemossa & Sóller, Mallorca', 'Spanyolország', 'Palma de Mallorca belváros vagy Playa de Palma szállodák', '2026-10-21', '09:00', '17:30', '8.5 óra', 72, 'EUR', 'Magyar nyelvű vezetés', array['Kisbuszos utazás Palmából', 'Magyar nyelvű túravezetés', 'Sólleri nosztalgia villamosjegy', 'Mallorcai narancslé és süti'], array['Ebéd Port de Sóllerben'], 16, 'published', false),
  ('ea000000-0000-4000-8000-000000000009', 'ba000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000006', 'Ókori Róma & Vatikán kiemelt séta magyar régész-idegenvezetővel', 'okori-roma-vatikan-magyar-regesz-vezetes', 'Colosseum, Forum Romanum, Szent Péter Bazilika és a Sixtus-kápolna titkai soron kívüli bejutással, magyar nyelven.', 'Róma történelme elevenedik meg előtted magyar szakértő idegenvezetéssel. Colosseum, Forum és Vatikán.', 'Róma & Vatikánváros, Olaszország', 'Olaszország', 'Róma, Colosseo metrómegálló kijárat', '2026-10-23', '09:00', '15:30', '6.5 óra', 65, 'EUR', 'Magyar régész-idegenvezető', array['Hivatalos magyar anyanyelvű idegenvezető', 'Soron kívüli bejutás ügyintézése', 'Fülhallgatós adóvevő készülék'], array['Hivatalos belépőjegyek', 'Ebéd'], 15, 'published', true),
  ('ea000000-0000-4000-8000-000000000010', 'ba000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000006', 'Róma Fiumicino (FCO) reptéri privát transzfer magyar asszisztenciával', 'roma-fiumicino-repteri-privat-transzfer-magyarul', 'Fix áras, megbízható prémium transzfer a repülőtérről a római belvárosi szállásodig. Nem kell a taxiknál alkudozni!', 'Prémium Mercedes járművel várjuk géped a Fiumicino repülőtéren. Magyar nyelvű telefonos asszisztencia.', 'Fiumicino Repülőtér (FCO) → Róma Belváros', 'Olaszország', 'Róma Fiumicino T3 Nemzetközi Érkezési Csarnok', '2026-10-15', '00:00', '23:59', '40 perc', 60, 'EUR', 'Magyar asszisztencia', array['Privát Mercedes jármű max 4-7 fő', '1 óra várakozási idő', 'Autópályadíj és reptéri engedély', 'Magyar diszpécser'], array['Éjszakai felár (22:00-06:00 között)'], 7, 'published', false),
  ('ea000000-0000-4000-8000-000000000011', 'ba000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000007', 'Isztambul két kontinensen: Boszporusz hajózás & Hagia Sophia magyarul', 'isztambul-ket-kontinensen-boszporusz-hagia-sophia-magyarul', 'Hagia Sophia, Kék Mecset, Elsüllyedt Palota, majd privát hajózás a Boszporuszon Európa és Ázsia partjai mentén.', 'Sultanahmet csodái és privát hajózás a Boszporuszon magyar kísérővel Európa és Ázsia partjai között.', 'Sultanahmet & Boszporusz, Isztambul', 'Törökország', 'Isztambul, Sultanahmet tér (Német kút mellett)', '2026-10-25', '09:30', '16:30', '7 óra', 55, 'EUR', 'Magyar nyelvű vezetés', array['Magyar nyelvű hivatalos helyi idegenvezetés', '2 órás hajózás a Boszporuszon kishajóval', 'Török tea és perec a hajón'], array['Múzeumi belépőjegyek', 'Ebéd'], 18, 'published', true),
  ('ea000000-0000-4000-8000-000000000012', 'ba000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000005', 'de000000-0000-4000-8000-000000000007', 'Ázsiai Ízutazás: Kadiköy gasztrotúra & Fűszerbazár magyarul', 'azsiai-izutazas-kadikoy-gasztrotura-isztambul-magyarul', 'Kompátkelés Ázsiába, utcai ételek, valódi török kávéfőzés parázson, baklava mesterek és fűszer kavalkád.', 'Sárga komppal áthajózunk az ázsiai Kadiköybe. 6 féle autentikus utcai ételkóstoló és valódi török kávé parázson.', 'Kadiköy & Eminönü, Isztambul', 'Törökország', 'Eminönü kompkikötő bejárat', '2026-11-01', '11:00', '16:00', '5 óra', 45, 'EUR', 'Magyar nyelvű kíséret', array['Magyar gasztro-idegenvezetés', '6 féle autentikus utcai ételkóstoló', 'Török kávé parázson', 'Kompjegy oda-vissza'], array['Nagybevásárlás a bazárban'], 12, 'published', false)
on conflict (id) do nothing;

-- 5. Képek
insert into public.program_images (id, program_id, image_url, is_cover, sort_order) values
  ('fa000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80', false, 1),
  ('fa000000-0000-4000-8000-000000000003', 'ea000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000004', 'ea000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000005', 'ea000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?auto=format&fit=crop&w=800&q=80', false, 1),
  ('fa000000-0000-4000-8000-000000000006', 'ea000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000007', 'ea000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000008', 'ea000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80', false, 1),
  ('fa000000-0000-4000-8000-000000000009', 'ea000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000010', 'ea000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000011', 'ea000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000012', 'ea000000-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000013', 'ea000000-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000014', 'ea000000-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80', true, 0),
  ('fa000000-0000-4000-8000-000000000015', 'ea000000-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80', true, 0)
on conflict (id) do nothing;

-- 6. Minta Érdeklődések (Inquiries)
insert into public.inquiries (id, program_id, provider_id, name, email, phone, message, status) values
  ('da000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001', 'Tóth Katalin', 'katalin.toth@gmail.com', '+36 30 112 3456', 'Október 15-én érkezünk Ayia Napára 4 fővel. Érdeklődnék, hogy van-e még szabad hely a Troodos kirándulásra és el tudtok-e venni a szállodánktól?', 'new'),
  ('da000000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000005', 'ba000000-0000-4000-8000-000000000003', 'Kovács Péter', 'kovacs.peter@freemail.hu', '+36 20 987 6543', 'A Sagrada Família túrára van-e lehetőség privát időpontot kérni 6 fős baráti társaságnak október 20-án?', 'new'),
  ('da000000-0000-4000-8000-000000000003', 'ea000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000001', 'Balogh Mária', 'maria.balogh@outlook.hu', '+36 70 333 4455', 'Wizz Air járattal érkezünk Larnacára 2 felnőtt + 2 gyerekkel és babakocsival. A reptéri transzferhez tudtok biztosítani 2 db gyerekülést?', 'new')
on conflict (id) do nothing;

-- 7. Minta Profilok (Profiles)
insert into public.profiles (id, user_id, name, email, role) values
  ('aa000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Velem Gyere Adminisztrátor', 'admin@velemgyere.hu', 'admin'),
  ('aa000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011', 'Ciprus Magyarul Élménytúrák', 'info@ciprusmagyarul.com', 'provider'),
  ('aa000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Teszt Látogató', 'latogato@velemgyere.hu', 'visitor')
on conflict (id) do nothing;
`;
