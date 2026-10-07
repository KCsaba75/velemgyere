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

-- Added live 2026-10-06: the table had no INSERT policy at all, which silently
-- blocked the deferred profile-creation step for both visitor self-registration
-- (registerVisitor) and provider self-registration (registerProvider) -- a freshly
-- confirmed+signed-in user's own profiles insert had no policy to satisfy.
-- Reproduced live (a real confirmed+signed-in auth.users row with zero matching
-- profiles row) before this was added.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

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

-- ==========================================
-- Added live 2026-10-07 (kanban 71215856): rendeles-nyilvantartas, kredit-talca,
-- kapacitas-limit, es a "bovebb info csak bejelentkezve" oszlop-felosztas.
-- ==========================================

-- 8. ORDERS (lefoglalas-szeru statusz-bejegyzes, meg NEM valodi fizetes/payment-integracio)
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participants_count integer not null default 1 check (participants_count > 0),
  total_price numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  status text not null check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Visitors can view own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Visitors can create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Visitors can cancel own orders"
  on public.orders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "Providers can view orders for their programs"
  on public.orders for select
  using (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id and providers.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "Providers can update orders for their programs"
  on public.orders for update
  using (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id and providers.user_id = auth.uid()
    ) or public.is_admin()
  );

-- Kapacitas-limit kikenyszeritese (6. pont: kiscsoportos tura letszam-korlatja).
-- Csak trigger-kent hivando, NINCS execute-grant anon/authenticated-nek.
create or replace function public.enforce_order_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_booked integer;
begin
  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;
  select max_participants into v_max from public.programs where id = new.program_id;
  if v_max is null then
    return new;
  end if;
  select coalesce(sum(participants_count), 0) into v_booked
    from public.orders
    where program_id = new.program_id
      and status in ('pending', 'confirmed')
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_booked + new.participants_count > v_max then
    raise exception 'Nincs eleg szabad hely ehhez a programhoz (foglalt: %, limit: %)', v_booked, v_max;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_order_capacity
  before insert or update on public.orders
  for each row execute function public.enforce_order_capacity();

-- Kapacitas-lekerdezes a "bovebb info" nezethez. Csak authenticated hivhatja (anon nincs grant-olva).
create or replace function public.check_program_availability(p_program_id uuid)
returns table (max_participants integer, booked integer, available integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.max_participants,
    coalesce(sum(o.participants_count) filter (where o.status in ('pending', 'confirmed')), 0)::integer as booked,
    case when p.max_participants is null then null
         else p.max_participants - coalesce(sum(o.participants_count) filter (where o.status in ('pending', 'confirmed')), 0)::integer
    end as available
  from public.programs p
  left join public.orders o on o.program_id = p.id
  where p.id = p_program_id
  group by p.id, p.max_participants;
$$;

revoke execute on function public.check_program_availability(uuid) from public, anon;
grant execute on function public.check_program_availability(uuid) to authenticated;

-- 9. CREDIT_TRANSACTIONS (kredit-talca ledger: regisztracios ajandek, meghiusult program
-- visszaterites, kezi/adminisztrativ kifizetes -- Csaba dontese szerint MEG NEM automata payout)
create table if not exists public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'EUR',
  type text not null check (type in ('signup_bonus', 'refund', 'usage', 'manual_payout')),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Added live 2026-10-07 (kanban 71215856, Csaba kiegesztese): a programok ara ES a
-- kredit-nyilvantartas is EUR-alapu legyen. programs.currency/orders.currency mar
-- 'EUR' default volt, a credit_transactions-bol hianyzott az explicit currency oszlop.

alter table public.credit_transactions enable row level security;

create policy "Users can view own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins can manage credit transactions"
  on public.credit_transactions for all
  using (public.is_admin())
  with check (public.is_admin());

-- 10. "BOVEBB INFO CSAK BEJELENTKEZVE" oszlop-felosztas (4. pont, Csaba altal jovahagyott
-- teaser/reszletes oszloplista). Az anon mar NEM olvashatja a teljes programs/providers
-- tablat -- csak a teaser oszlopokat (oszlop-szintu GRANT), a reszletes oszlopok
-- (description, included/not_included, departure_location, pontos ido, provider kontakt)
-- csak authenticated-nek latszanak a tabla kozvetlen leker(es)ekor.
revoke select on public.programs from anon;
revoke select on public.providers from anon;

grant select (
  id, provider_id, category_id, region_id,
  title, slug, short_description,
  country, price, currency, event_date,
  featured, status, created_at, updated_at
) on public.programs to anon;

grant select (id, company_name, description, status) on public.providers to anon;

-- Added live 2026-10-07: a katalogus-lista kartyak (ProgramCard) es a szures/kereses
-- MAR MA is hasznalja a location/duration/language oszlopokat anon-kent, bejelentkezes
-- nelkul -- ezek nem "bovebb info" (4. pont), hanem a MEGLEVO publikus bongezes resze
-- (3. pont). A szukebb teaser-lista eltorte volna a katalogust anon-nak.
grant select (location, duration, language) on public.programs to anon;

-- security_invoker=true: a nezet tenyleg az anon RLS-et erteli ki (nem csak egy
-- kodba sult WHERE-t), igy a frontend egyszeruen select('*')-ozhat rajta.
-- Uj oszlop csak a vegere veheto fel (create or replace view nem valthatja meg
-- a meglevo oszlopok pozicioit).
create or replace view public.programs_public with (security_invoker = true) as
  select
    id, provider_id, category_id, region_id,
    title, slug, short_description,
    country, price, currency, event_date,
    featured, status, created_at, updated_at,
    location, duration, language
  from public.programs
  where status = 'published';

create or replace view public.providers_public with (security_invoker = true) as
  select id, company_name, description, status
  from public.providers
  where status = 'approved';

grant select on public.programs_public to anon, authenticated;
grant select on public.providers_public to anon, authenticated;

-- ==========================================
-- Added live 2026-10-07 (kanban 71215856, Csaba refinement): "foglalási díj" --
-- an admin-adjustable, deposit-like amount separate from a program's total price.
-- The registration signup-bonus credit always equals whatever this was worth AT
-- REGISTRATION time, not a separately configured number -- one settings row
-- serves both purposes.
-- ==========================================

create table if not exists public.app_settings (
  key text primary key,
  value numeric(10, 2) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

create policy "Anyone can read app settings"
  on public.app_settings for select
  using (true);

create policy "Admins can manage app settings"
  on public.app_settings for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value)
values ('current_booking_fee', 0)
on conflict (key) do nothing;

alter table public.orders
  add column if not exists booking_fee numeric(10, 2) not null default 0;

-- booking_fee is ALWAYS server-set from the live app_settings value at insert time --
-- the client's input is ignored, same trust boundary as enforce_order_capacity.
-- Trigger-only: no EXECUTE grant to anon/authenticated.
create or replace function public.set_order_booking_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select value into new.booking_fee from public.app_settings where key = 'current_booking_fee';
  if new.booking_fee is null then
    new.booking_fee := 0;
  end if;
  return new;
end;
$$;

create trigger trg_set_order_booking_fee
  before insert on public.orders
  for each row execute function public.set_order_booking_fee();

-- Signup bonus: a new visitor profile gets a credit_transactions row matching
-- whatever current_booking_fee was worth at that moment -- captured, not referenced,
-- so a later fee change never retroactively changes an already-granted bonus.
-- Trigger-only: no EXECUTE grant to anon/authenticated.
create or replace function public.grant_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee numeric(10, 2);
begin
  if new.user_id is null or new.role <> 'visitor' then
    return new;
  end if;

  select value into v_fee from public.app_settings where key = 'current_booking_fee';

  if v_fee is not null and v_fee > 0 then
    insert into public.credit_transactions (user_id, amount, currency, type, note)
    values (new.user_id, v_fee, 'EUR', 'signup_bonus', 'Regisztrációs ajándék-kredit (a mindenkori foglalási díjjal egyező összeg)');
  end if;

  return new;
end;
$$;

create trigger trg_grant_signup_bonus
  after insert on public.profiles
  for each row execute function public.grant_signup_bonus();

-- ==========================================
-- Added live 2026-10-07 (kanban 71215856, Csaba penzugyi-mukodesi-modell PDF --
-- "Kozvetitoi Piacter & Zero Penzkezelesi Modell"): percentage-based booking fee
-- replacing the fixed admin amount, checkout breakdown (onsite_amount), and
-- Stripe Connect field prep (columns only, no Stripe logic yet).
-- ==========================================

-- Stripe Connect prep (point 5): columns only, NO Stripe API calls/logic yet.
-- Lives on providers (one Stripe Connect account per business), not per program.
alter table public.providers
  add column if not exists stripe_account_id text,
  add column if not exists payouts_enabled boolean not null default false,
  add column if not exists payment_mode text not null default 'onsite_only'
    check (payment_mode in ('onsite_only', 'online_stripe'));

-- Zora 2. koros review finding (2026-10-07): the "Anyone authenticated can
-- register as provider" INSERT policy only checks auth.uid()=user_id -- nothing
-- stopped a self-registering user from ALSO setting payouts_enabled=true/
-- stripe_account_id/payment_mode='online_stripe' in the same insert, with no real
-- Stripe verification behind it. Converts the table-wide INSERT/UPDATE grants to
-- column-level grants matching the actual registration/admin-approve flows (see
-- AppContext.tsx) -- the 3 Stripe-prep columns are excluded entirely, only
-- service_role can write them. Verified live: a plain registration insert (no
-- Stripe columns) still succeeds with safe defaults; an insert that explicitly
-- includes payouts_enabled/payment_mode now fails with 42501 permission denied;
-- admin status update (approve/suspend) still works; non-admin status update
-- still silently blocked by RLS as before.
revoke insert on public.providers from anon, authenticated;
grant insert (user_id, company_name, contact_name, email, phone, website, description, status)
  on public.providers to authenticated;

revoke update on public.providers from anon, authenticated;
grant update (status) on public.providers to authenticated;

-- Percentage-based fee settings (point 1): replaces the fixed current_booking_fee
-- (that row is left in place, orphaned -- no code references it anymore).
-- fee_percentage is stored as a percentage NUMBER (e.g. 3.00 means 3%), not a
-- fraction -- matches the admin's mental model and app_settings.value's existing
-- numeric(10,2) precision. fee_minimum_eur is a plain EUR amount, same column type
-- as before. Both default to 0 (unconfigured) -- same "must be explicitly set in
-- admin Settings before going live" convention as the old current_booking_fee.
insert into public.app_settings (key, value)
values ('fee_percentage', 0), ('fee_minimum_eur', 0)
on conflict (key) do nothing;

-- Shared fee formula (point 1): dij = MAX(fee_percentage% * net_amount, fee_minimum_eur).
-- STABLE, read-only -- safe to grant to anon/authenticated for catalog price display
-- (the two settings rows are already public-readable via the existing
-- "Anyone can read app settings" policy).
-- security invoker (not definer): app_settings already has a public "Anyone can
-- read app settings" RLS policy, so the caller's own privileges are sufficient --
-- avoids tripping the anon/authenticated_security_definer_function_executable
-- advisor WARN for no reason.
create or replace function public.compute_booking_fee(p_net_amount numeric)
returns numeric
language sql
security invoker
set search_path = public
stable
as $$
  select greatest(
    p_net_amount * coalesce((select value from public.app_settings where key = 'fee_percentage'), 0) / 100,
    coalesce((select value from public.app_settings where key = 'fee_minimum_eur'), 0)
  );
$$;

grant execute on function public.compute_booking_fee(numeric) to anon, authenticated;

-- Checkout breakdown (point 3): what's due at the in-person meeting, separate from
-- booking_fee (what's due online now). Server-set alongside booking_fee/total_price,
-- same trust boundary as booking_fee.
alter table public.orders
  add column if not exists onsite_amount numeric(10, 2) not null default 0;

-- set_order_booking_fee REPLACED (point 1+3): the net amount now comes from the
-- program's OWN price row (server-side lookup, never the client), multiplied by
-- participants_count -- the client's total_price input is no longer trusted at all
-- (closes a pre-existing gap where the client supplied total_price directly).
-- Verified live with a mutation test (BEGIN/ROLLBACK): a 65 EUR/fo program, 2 fo,
-- 10%/min-5 fee settings -> booking_fee 13.00, onsite_amount 130.00, total_price
-- 143.00, REGARDLESS of a bogus client-supplied total_price (999999) on the insert.
create or replace function public.set_order_booking_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net_unit numeric(10, 2);
  v_net_total numeric(10, 2);
begin
  select price into v_net_unit from public.programs where id = new.program_id;
  if v_net_unit is null then
    v_net_unit := 0;
  end if;
  v_net_total := v_net_unit * new.participants_count;

  new.onsite_amount := v_net_total;
  new.booking_fee := public.compute_booking_fee(v_net_total);
  new.total_price := v_net_total + new.booking_fee;
  return new;
end;
$$;

-- Signup bonus (point 4): now reads fee_minimum_eur directly (a "mindenkori
-- foglalasi dij" fogalma a minimum-dijjal egyezik meg -- nincs "program ar"
-- regisztraciokor, amire szazalekot szamolhatnank). Capture-on-insert semantics
-- unchanged: a later fee_minimum_eur change never retroactively touches an
-- already-granted bonus. Verified live (mutation test): fee_minimum_eur=7 ->
-- uj visitor profil beszurasa pontosan 7.00 EUR signup_bonus sort hozott letre.
create or replace function public.grant_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee numeric(10, 2);
begin
  if new.user_id is null or new.role <> 'visitor' then
    return new;
  end if;

  select value into v_fee from public.app_settings where key = 'fee_minimum_eur';

  if v_fee is not null and v_fee > 0 then
    insert into public.credit_transactions (user_id, amount, currency, type, note)
    values (new.user_id, v_fee, 'EUR', 'signup_bonus', 'Regisztrációs ajándék-kredit (a mindenkori minimum foglalási díjjal egyező összeg)');
  end if;

  return new;
end;
$$;

-- ==========================================
-- Added live 2026-10-07 (kanban fbf552b2, Csaba kerese): booking-flow v2 -- publikus
-- reszletek, provider-privacy, admin-jovahagyas. Mutacios tesztekkel verifikalt elesben
-- (SET LOCAL ROLE + request.jwt.claims), lasd a kanban-kartya 1. koros kommentjet.
-- ==========================================

-- POINT 1: description + departure_location lesz anon-nak is lathato (teaser bovites).
-- Uj oszlop csak a vegere veheto fel a view-ban (meglevo pozicio nem valtozhat).
grant select (description, departure_location) on public.programs to anon;

create or replace view public.programs_public with (security_invoker = true) as
  select
    id, provider_id, category_id, region_id,
    title, slug, short_description,
    country, price, currency, event_date,
    featured, status, created_at, updated_at,
    location, duration, language,
    description, departure_location
  from public.programs
  where status = 'published';

-- POINT 3+6: a providers tablan az authenticated eddig TELJES oszlop-SELECT-et kapott
-- (csak az anon volt oszlop-korlatozva) -- ezert barmely bejelentkezett latogato kliens-
-- oldalon megkapta BARMELYIK jovahagyott szolgaltato contact_name/phone/email/website-jet,
-- fuggetlenul attol van-e nekik megerositett (confirmed) rendelesük. Ez pontosan az a
-- "vevo es szolgaltato fizetes nelkul egyezkedhet" rés, amit a kartya 3. pontja zar.
-- Az authenticated ugyanazt a teaser-oszlop-keszletet kapja mint az anon; a tenyleges
-- contact-adatokhoz uj, celzott RPC-k kellenek (lasd lejjebb). user_id is kell mindket
-- szerepnek: tobb MAR MEGLEVO RLS policy (programs/orders/inquiries) providers.user_id-ra
-- JOIN-ol a jogosultsag-ellenorzeshez, es ez a column-level SELECT grant alol NEM mentes
-- (parse-time oszlop-privilegium check, fuggetlenul a futasidejű rovidzarlattol) -- ezt
-- egy sikertelen elso migracio-probalkozas mutacios tesztje derítette ki (lasd lejjebb a
-- kulon grantot), user_id maga nem erzekeny (random UUID, nem kontakt-adat).
revoke select on public.providers from authenticated;
grant select (id, company_name, description, status, user_id) on public.providers to anon, authenticated;

-- Sajat szolgaltatoi profil (teljes sorral, kontakt-mezokkel egyutt) -- csak a sajat
-- sornak, auth.uid()-bol/az auth.users sajat email-ebol szarmaztatva. Ez a kliens korabbi
-- "rawProviders.find(p => p.email === currentUser.email)" fallback-matcheset valtja fel
-- biztonsagosan (nem igenyel tablaszintu SELECT-et a kontakt-oszlopokra).
create or replace function public.get_my_provider_profile()
returns public.providers
language sql
security definer
set search_path = public
stable
as $$
  select p.*
  from public.providers p
  left join auth.users u on u.id = auth.uid()
  where p.user_id = auth.uid()
     or (u.email is not null and lower(p.email) = lower(u.email))
  limit 1;
$$;

revoke execute on function public.get_my_provider_profile() from public, anon;
grant execute on function public.get_my_provider_profile() to authenticated;

-- Admin-only teljes szolgaltato-lista (kontakt-mezokkel) -- az AdminDashboard
-- Szolgáltatók tabja ezt hivja a sima tablaolvasas helyett. is_admin() a fuggvenyen
-- BELUL ellenorizve (service_role/is_admin() mogott, nem anon/authenticated ir-ut).
create or replace function public.admin_list_providers()
returns setof public.providers
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Csak adminisztrator hivhatja az admin_list_providers()-t.';
  end if;
  return query select * from public.providers order by created_at desc;
end;
$$;

revoke execute on function public.admin_list_providers() from public, anon;
grant execute on function public.admin_list_providers() to authenticated;

-- A vevonek a szolgaltato kontakt-adatai (contact_name/email/phone/website) CSAK akkor,
-- ha a sajat (auth.uid()) megerositett (confirmed) rendelese van az adott programhoz.
-- Ures eredmeny minden mas esetben (nincs ilyen rendeles, vagy nem a sajat rendelese).
create or replace function public.get_provider_contact_for_order(p_order_id uuid)
returns table (contact_name text, email text, phone text, website text)
language sql
security definer
set search_path = public
stable
as $$
  select pv.contact_name, pv.email, pv.phone, pv.website
  from public.orders o
  join public.programs pg on pg.id = o.program_id
  join public.providers pv on pv.id = pg.provider_id
  where o.id = p_order_id
    and o.user_id = auth.uid()
    and o.status = 'confirmed';
$$;

revoke execute on function public.get_provider_contact_for_order(uuid) from public, anon;
grant execute on function public.get_provider_contact_for_order(uuid) to authenticated;

-- A szolgaltatonak (vagy adminnak) a vevo neve/email-je egy SAJAT programjahoz tartozo
-- rendeleshez -- a ProviderDashboard "Foglalasok" tabjahoz (5b pont). Ures eredmeny, ha a
-- hivo nem a program szolgaltatoja es nem admin.
create or replace function public.get_order_buyer_info(p_order_id uuid)
returns table (name text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select pr.name, pr.email
  from public.orders o
  join public.programs pg on pg.id = o.program_id
  join public.providers pv on pv.id = pg.provider_id
  join public.profiles pr on pr.user_id = o.user_id
  where o.id = p_order_id
    and (pv.user_id = auth.uid() or public.is_admin());
$$;

revoke execute on function public.get_order_buyer_info(uuid) from public, anon;
grant execute on function public.get_order_buyer_info(uuid) to authenticated;

-- POINT 4+6: a rendeles jovahagyasa (szimulalt fizetes-teljesules) KIZAROLAG ezen az
-- RPC-n keresztul -- a kesobbi Stripe-webhook ugyanezt a fuggvenyt fogja hivni (akkor
-- mar service_role-kent, nem authenticated-kent, igy az is_admin()-ellenorzes uton lesz
-- majd bovitve, MOST meg nem -- lasd a kartya 4. pontjat, a fizetesi lepcsot most kihagyjuk).
create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Csak adminisztrator hagyhatja jova a rendelest.';
  end if;
  update public.orders
    set status = 'confirmed', updated_at = timezone('utc'::text, now())
    where id = p_order_id and status = 'pending';
end;
$$;

revoke execute on function public.confirm_order(uuid) from public, anon;
grant execute on function public.confirm_order(uuid) to authenticated;

-- A szolgaltato eddig korlatozas nelkul atirhatta a sajat programjaihoz tartozo rendeles
-- statuszat (nem volt with_check), tehat elvben 'confirmed'-re is allithatta volna --
-- pontosan az admin-jovahagyasi modellt megkerulve. Szukitve: a szolgaltato csak
-- 'cancelled'-re allithatja (pl. a program lemondasa), 'confirmed'-re csak a confirm_order()
-- RPC (admin) allithatja at. Az admin kozvetlen tablairasat kulon, explicit policy adja,
-- ugyanazt a mintat kovetve mint a regions/categories/credit_transactions/app_settings
-- tablakon ("Admins can manage X").
drop policy if exists "Providers can update orders for their programs" on public.orders;

create policy "Providers can cancel orders for their programs"
  on public.orders for update
  using (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id and providers.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id and providers.user_id = auth.uid()
    )
    and status = 'cancelled'
  );

create policy "Admins can manage orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- POINT 5a: a vevo valasztott helyszini fizetesi modja (keszpenz vagy revolut) --
-- a kliens adja meg a Veglegesites lepesnel, nem erzekeny osszeg-mezo (csak preferencia),
-- ezert nincs trigger-felulbiralas mint booking_fee/onsite_amount eseteben.
alter table public.orders
  add column if not exists onsite_payment_method text
    check (onsite_payment_method is null or onsite_payment_method in ('cash', 'revolut'));

-- ============================================================================
-- KANBAN cfa4b20a: szolgaltato sajat-profil szerkesztes + program torles (biztonsagos)
-- + elfogadott fizetesi mod. Ket regota nyitott hianyossag + egy uj kerés.
-- ============================================================================

-- Mellekesen talalt advisor-warning: is_admin() search_path nem volt pinnelve
-- (function_search_path_mutable). A fuggveny mar eleve teljesen schema-qualifiolt
-- (public.profiles), ezert a pinneles viselkedest nem valtoztat, csak zarja a lintet.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return exists (
    select 1 from profiles
    where profiles.user_id = auth.uid() and profiles.role = 'admin'
  );
end;
$$;

-- POINT 1: a providers tablan eddig csak admin-UPDATE policy volt ("Admins can manage
-- providers", is_admin() mogott), semmilyen "sajat sor" self-update policy nem volt --
-- ez a regisztracios funkcio bevezetese ota igy volt. A status oszlopon viszont MAR
-- VOLT egy stray UPDATE column-grant authenticated-nek egy regi migraciobol, row-policy
-- nelkul eddig vedte csak a hianya -- ha csak egy altalanos self-update policy-t adunk
-- hozza, azzal a status-ra IS lehetoseget adnank a szolgaltatonak hogy sajat magat
-- 'approved'-ra allitsa. Ezert: a safe profil-mezokre UPDATE-grant, a status-ra REVOKE,
-- admin statuszvaltas at a admin_set_provider_status() RPC-re.
grant update (company_name, contact_name, email, phone, website, description)
  on public.providers to authenticated;

revoke update (status) on public.providers from authenticated;

create policy "Providers can update own profile"
  on public.providers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.admin_set_provider_status(p_provider_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('pending', 'approved', 'suspended') then
    raise exception 'invalid status: %', p_status;
  end if;
  update providers set status = p_status where id = p_provider_id;
end;
$$;

revoke all on function public.admin_set_provider_status(uuid, text) from public, anon;
grant execute on function public.admin_set_provider_status(uuid, text) to authenticated;

-- A regisztracios INSERT policy eddig csak auth.uid()=user_id-t nezte, a status erteket
-- nem -- egy self-registering felhasznalo elvben mar regisztracioskor is 'approved'-ra
-- allithatta volna sajat magat (ugyanaz a res, csak INSERT-oldalon). Innentol a
-- regisztracio csak 'pending' statusszal fogadott el.
drop policy "Anyone authenticated can register as provider" on public.providers;
create policy "Anyone authenticated can register as provider"
  on public.providers
  for insert
  with check (auth.uid() = user_id and status = 'pending');

-- POINT 2: torlesre NINCS semmilyen DELETE policy a programs tablan -- jelenleg senki
-- (meg admin sem RLS-en at) nem tud programot torolni, a UI "Torles" gombja csendben
-- nem csinal semmit. orders.program_id FK ON DELETE CASCADE-del mutat programs-ra --
-- egy naiv DELETE policy csendben torolne a hozza tartozo (akar mar confirmed) rendeleseket
-- is. Ezert: DELETE csak owner VAGY admin, ES csak ha a programhoz NINCS egyetlen
-- orders-sor sem (meg pending sem).
--
-- BUKTATO: a direkt "not exists (select 1 from orders where ...)" a DELETE policy
-- USING-clause-aban 42P17 infinite recursion-t dob -- az orders SELECT policy-i
-- ("Providers can view orders for their programs") visszanyulnak programs-ra, es ez a
-- ket tabla kozotti RLS-ciklus Postgres recursion-detectort trigereli, akkor is ha
-- logikailag nem vegtelen. A megoldas ugyanaz a trukk mint is_admin()-nal: SECURITY
-- DEFINER wrapper fuggveny, ami megkerulei a sajat RLS-expanziot.
create or replace function public.program_has_orders(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from orders where orders.program_id = p_program_id);
$$;

revoke all on function public.program_has_orders(uuid) from public, anon;
grant execute on function public.program_has_orders(uuid) to authenticated;

create policy "Owners and admins can delete orders-free programs"
  on public.programs
  for delete
  using (
    (
      exists (
        select 1 from providers
        where providers.id = programs.provider_id
          and providers.user_id = auth.uid()
      )
      or is_admin()
    )
    and not program_has_orders(programs.id)
  );

-- POINT 3: a szolgaltato bepipalhatja melyik fizetesi modokat fogadja el helyszinen --
-- ez MINDEN programjara orokodjon (provider-szintu mezo, nem program-szintu). Legalabb
-- egy kotelezo.
--
-- BUKTATO: a "array_length(accepted_payment_methods, 1) >= 1" forma NULL-t ad vissza
-- ures tombre (nem 0-t), es egy CHECK constraint NULL eredmenyt PASS-nak vesz -- igy az
-- ures tomb csendben athaladt volna. A helyes forma cardinality(), ami 0-t ad ures
-- tombre.
alter table public.providers
  add column accepted_payment_methods text[] not null default array['cash'];

alter table public.providers
  add constraint providers_accepted_payment_methods_check
  check (
    accepted_payment_methods <@ array['cash','revolut']::text[]
    and cardinality(accepted_payment_methods) >= 1
  );

grant select (accepted_payment_methods) on public.providers to anon, authenticated;
grant update (accepted_payment_methods) on public.providers to authenticated;
grant insert (accepted_payment_methods) on public.providers to authenticated;

-- A publikus (nem-admin) providers-listazas a providers_public view-n megy, nem a
-- nyers tablan -- ennek is bovitve kell lennie, kulonben a vevo-oldali checkout nem
-- latja mas szolgaltatok elfogadott modjait. FIGYELEM: a view security_invoker=true
-- volt (a caller sajat, szukitett column-grantjeit ervenyesiti, nem a view owner-eet) --
-- egy CREATE OR REPLACE VIEW nullazza ezt a beallitast, ujra be kell lonie utana.
create or replace view public.providers_public as
select id, company_name, description, status, accepted_payment_methods
from public.providers
where status = 'approved';

alter view public.providers_public set (security_invoker = true);

-- A vevo Veglegesitesnel valasztott onsite_payment_method-jat a szolgaltato altal
-- TENYLEGESEN elfogadott modokra kell korlatozni -- UI-szinten mar megvan, de API-n
-- keresztul (direkt insert/update) is ki kell kenyszeriteni, kulonben megkerulheto.
create or replace function public.check_order_payment_method()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_accepted text[];
begin
  if new.onsite_payment_method is null then
    return new;
  end if;

  select pr.accepted_payment_methods into v_accepted
  from programs pg
  join providers pr on pr.id = pg.provider_id
  where pg.id = new.program_id;

  if v_accepted is null or not (new.onsite_payment_method = any(v_accepted)) then
    raise exception 'A szolgaltato nem fogadja el ezt a fizetesi modot helyszinen: %', new.onsite_payment_method;
  end if;

  return new;
end;
$$;

revoke all on function public.check_order_payment_method() from public, anon, authenticated;

create trigger orders_payment_method_check
  before insert or update on public.orders
  for each row
  execute function public.check_order_payment_method();
