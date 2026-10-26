-- ==============================================================================
-- Migráció: Külső / Manuális Foglalások (Orders) RLS és Perzisztencia Javítása
-- Dátum: 2026-10-15
-- Leírás: 
--   1. Lehetővé teszi az orders táblában a külső (is_manual = true) foglalások
--      mentését felhasználói fiók (user_id) nélkül is (alter column user_id drop not null).
--   2. Hozzáadja az event_date és start_time oszlopokat a közvetlen dátumtároláshoz.
--   3. Megnyitja az RLS szabályokat a szolgáltatói külső foglalások (is_manual)
--      beszúrására és megtekintésére.
--   4. Létrehoz egy biztonságos create_manual_order() RPC-t, amely bypass-olja
--      az RLS korlátokat és közvetlenül rögzíti a külső foglalást.
-- ==============================================================================

begin;

-- 1. ORDERS TÁBLA MEZŐK BŐVÍTÉSE ÉS MEGENGEDŐVÉ TÉTELE
alter table public.orders alter column user_id drop not null;

alter table public.orders 
  add column if not exists event_date text,
  add column if not exists start_time text,
  add column if not exists source text default 'platform',
  add column if not exists source_notes text,
  add column if not exists is_manual boolean default false,
  add column if not exists manual_customer_name text,
  add column if not exists manual_customer_phone text,
  add column if not exists manual_customer_email text,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_synced boolean default false,
  add column if not exists google_calendar_event_url text;

-- 2. JOGOSULTSÁGOK (GRANTS)
grant select, insert, update on public.orders to anon, authenticated;

-- 3. RLS HÁZIRENDEK FRISSÍTÉSE
-- Engedélyezzük a külső/manuális foglalások beszúrását mindenkinek (szolgáltatóknak anon és auth módban is)
drop policy if exists "Providers can insert manual orders for their programs" on public.orders;
create policy "Providers can insert manual orders for their programs"
  on public.orders for insert
  with check (
    is_manual = true
    or auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id 
        and (providers.user_id = auth.uid() or providers.user_id is null)
    )
    or public.is_admin()
  );

-- Engedélyezzük a rendelések megtekintését a szolgáltatóknak és a manuális foglalásokhoz
drop policy if exists "Providers can view orders for their programs" on public.orders;
create policy "Providers can view orders for their programs"
  on public.orders for select
  using (
    is_manual = true
    or auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
        and (providers.user_id = auth.uid() or providers.user_id is null)
    )
    or public.is_admin()
  );

-- 4. BIZTONSÁGOS RPC KÜLSŐ FOGLALÁSOKHOZ (SECURITY DEFINER)
create or replace function public.create_manual_order(
  p_program_id uuid,
  p_occurrence_id uuid default null,
  p_user_id uuid default null,
  p_participants_count integer default 1,
  p_total_price numeric default 0,
  p_currency text default 'EUR',
  p_status text default 'confirmed',
  p_onsite_payment_method text default 'cash',
  p_booking_reference text default null,
  p_source text default 'phone',
  p_source_notes text default null,
  p_manual_customer_name text default null,
  p_manual_customer_phone text default null,
  p_manual_customer_email text default null,
  p_event_date text default null,
  p_start_time text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_order public.orders;
begin
  v_ref := coalesce(p_booking_reference, 'VG-' || to_char(now(), 'YYYY') || '-' || floor(100000 + random() * 900000)::text);

  insert into public.orders (
    program_id,
    occurrence_id,
    user_id,
    participants_count,
    total_price,
    currency,
    status,
    onsite_payment_method,
    booking_reference,
    source,
    source_notes,
    is_manual,
    manual_customer_name,
    manual_customer_phone,
    manual_customer_email,
    event_date,
    start_time,
    booking_fee,
    onsite_amount
  ) values (
    p_program_id,
    p_occurrence_id,
    p_user_id,
    p_participants_count,
    p_total_price,
    p_currency,
    p_status,
    p_onsite_payment_method,
    v_ref,
    p_source,
    p_source_notes,
    true,
    p_manual_customer_name,
    p_manual_customer_phone,
    p_manual_customer_email,
    p_event_date,
    p_start_time,
    0,
    p_total_price
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_manual_order to anon, authenticated;

commit;
