-- ==========================================
-- Velem Gyere – Supabase Database Schema & RLS
-- Külföldi Magyar Nyelvű Programok & Transzferek Katalógusa
-- ==========================================

create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'provider', 'visitor')) default 'visitor',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROVIDERS (Helyi magyar szolgáltatók külföldön)
create table if not exists public.providers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  website text,
  description text not null,
  status text not null check (status in ('pending', 'approved', 'suspended')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. REGIONS (Úticélok / Régiók – pl. Ciprus, Málta, Barcelona, Málaga, Mallorca, Róma, Isztambul)
create table if not exists public.regions (
  id uuid primary key default uuid_generate_v4(),
  country text not null,
  name text not null,
  slug text not null unique,
  flag_emoji text default '✈️',
  description text,
  image_url text,
  active boolean default true not null
);

-- 4. CATEGORIES (Szolgáltatás típusok – Kirándulás, Városnézés, Reptéri Transzfer, Hajós élmények...)
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  icon text not null,
  active boolean default true not null
);

-- 5. PROGRAMS (Külföldi magyar programok és transzferek)
create table if not exists public.programs (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references public.providers(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete restrict not null,
  region_id uuid references public.regions(id) on delete set null,
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
  id uuid primary key default uuid_generate_v4(),
  program_id uuid references public.programs(id) on delete cascade not null,
  image_url text not null,
  is_cover boolean default false not null,
  sort_order integer default 0 not null
);

-- 7. INQUIRIES (Látogatói érdeklődések)
create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid references public.programs(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  message text,
  -- Nullable: an anonymous (not logged in) inquiry is still allowed, see the
  -- "Anyone can create inquiry" policy below.
  visitor_user_id uuid references auth.users(id) on delete set null,
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

-- Admin helper function
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- RLS: REGIONS
create policy "Anyone can view active regions"
  on public.regions for select
  using (active = true or public.is_admin());

create policy "Admins can manage regions"
  on public.regions for all
  using (public.is_admin());

-- RLS: CATEGORIES
create policy "Anyone can view active categories"
  on public.categories for select
  using (active = true or public.is_admin());

create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin());

-- RLS: PROFILES
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id or public.is_admin());

-- RLS: PROVIDERS
create policy "Anyone can read approved providers"
  on public.providers for select
  using (status = 'approved' or auth.uid() = user_id or public.is_admin());

create policy "Anyone authenticated can register as provider"
  on public.providers for insert
  with check (auth.uid() = user_id);

-- Added live 2026-10-06 (kanban 318cedd7): the table had no UPDATE policy at all,
-- so approveProvider/suspendProvider silently wrote 0 rows under RLS even for admins.
create policy "Admins can manage providers"
  on public.providers for update
  using (public.is_admin())
  with check (public.is_admin());

-- RLS: PROGRAMS
create policy "Visitors can view published programs"
  on public.programs for select
  using (
    status = 'published'
    or exists (
      select 1 from public.providers
      where providers.id = programs.provider_id and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "Providers can insert programs"
  on public.programs for insert
  with check (
    exists (
      select 1 from public.providers
      where providers.id = programs.provider_id and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "Providers can update own programs"
  on public.programs for update
  using (
    exists (
      select 1 from public.providers
      where providers.id = programs.provider_id and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- RLS: PROGRAM_IMAGES
-- Added live 2026-10-06 (kanban 318cedd7 / e7f38028): the table had RLS enabled but
-- no policy at all, which blocked even published-program image reads from the client.
create policy "Anyone can view images for published programs"
  on public.program_images for select
  using (
    exists (
      select 1 from public.programs
      where programs.id = program_images.program_id
        and (
          programs.status = 'published'
          or exists (
            select 1 from public.providers
            where providers.id = programs.provider_id and providers.user_id = auth.uid()
          )
          or public.is_admin()
        )
    )
  );

-- RLS: INQUIRIES
create policy "Anyone can create inquiry"
  on public.inquiries for insert
  with check (true);

create policy "Providers can view inquiries for their programs"
  on public.inquiries for select
  using (
    exists (
      select 1 from public.providers
      where providers.id = inquiries.provider_id and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- Added 2026-10-06 (kanban f92f4cb1): a logged-in visitor's own "Saját fiókom" view.
create policy "Visitors can view own inquiries"
  on public.inquiries for select
  using (auth.uid() = visitor_user_id);
