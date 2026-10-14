-- ==============================================================================
-- Migráció: Külső / Telefonos Foglaláskezelés és Kétoldalú Google Naptár Szinkronizáció
-- Dátum: 2026-10-14
-- Leírás: Hozzáadja a hiányzó oszlopokat a public.orders, public.profiles és public.providers
--         táblákhoz, valamint frissíti az RLS házirendeket és oszlop-jogosultságokat.
-- ==============================================================================

begin;

-- 1. ORDERS TÁBLA BŐVÍTÉSE
alter table public.orders 
  add column if not exists source text default 'platform',
  add column if not exists source_notes text,
  add column if not exists is_manual boolean default false,
  add column if not exists manual_customer_name text,
  add column if not exists manual_customer_phone text,
  add column if not exists manual_customer_email text,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_synced boolean default false,
  add column if not exists google_calendar_event_url text;

-- Check constraint a foglalás forrására (biztonságos hozzáadás)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_source_check'
  ) then
    alter table public.orders
      add constraint orders_source_check
      check (source in ('platform', 'phone', 'onsite', 'whatsapp', 'email', 'external'));
  end if;
end $$;

-- 2. PROFILES TÁBLA BŐVÍTÉSE (Programvadász / Utazó fiók)
alter table public.profiles
  add column if not exists google_calendar_sync_enabled boolean default false,
  add column if not exists google_calendar_id text default 'primary';

-- 3. PROVIDERS TÁBLA BŐVÍTÉSE (Szolgáltató / Partner fiók)
alter table public.providers
  add column if not exists google_calendar_sync_enabled boolean default false,
  add column if not exists google_calendar_id text default 'primary';

-- 4. OSZLOP-SZINTŰ JOGOSULTSÁGOK (COLUMN-LEVEL GRANTS)
-- Biztosítjuk, hogy az authenticated felhasználók írhassák az új profil és naptár mezőket
grant update (google_calendar_sync_enabled, google_calendar_id)
  on public.profiles to authenticated;

grant update (google_calendar_sync_enabled, google_calendar_id)
  on public.providers to authenticated;

grant select, insert (
  source, 
  source_notes, 
  is_manual, 
  manual_customer_name, 
  manual_customer_phone, 
  manual_customer_email, 
  google_calendar_event_id, 
  google_calendar_synced, 
  google_calendar_event_url
) on public.orders to authenticated;

-- 5. RLS (ROW LEVEL SECURITY) HÁZIRENDEK
-- Engedélyezzük a szolgáltatóknak, hogy manuális rendelést rögzítsenek a saját programjaikhoz
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'orders' and policyname = 'Providers can insert manual orders for their programs'
  ) then
    create policy "Providers can insert manual orders for their programs"
      on public.orders for insert
      with check (
        exists (
          select 1 from public.programs
          join public.providers on providers.id = programs.provider_id
          where programs.id = orders.program_id and providers.user_id = auth.uid()
        )
      );
  end if;
end $$;

commit;
