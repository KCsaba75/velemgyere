-- ==============================================================================
-- Migráció: orders tábla -- "is_manual = true" feltétlen RLS-bypass lezárása
-- Dátum: 2026-10-16
-- Talált kanban: 866cb61a (teszt-stratégia audit közben, pgTAP mutációs teszttel
--   igazolva: supabase/tests/database/orders_manual_rls.test.sql)
--
-- A 20261015_fix_manual_orders_rls.sql (és ennek schema.sql-beli tükrözése, plusz
-- a baseline "Visitors can view/create own orders" policy-k) az "is_manual = true"
-- feltételt FELTÉTEL NÉLKÜL (provider/program-tulajdonjog-ellenőrzés nélkül) OR-olta
-- be a SELECT és INSERT policy-kba -- mivel "grant select, insert on orders to
-- anon, authenticated" is él, ez ÉLESBEN, ANON kulccsal (bejelentkezés nélkül)
-- igazoltan lehetővé tette:
--   1. BÁRMELY manuális (telefonos) rendelés sorának elolvasását, a benne lévő
--      manual_customer_name/phone/email PII-vel együtt (lásd kanban-komment, curl-lel
--      igazolt élő PII-leak).
--   2. Hamis manuális rendelés beszúrását BÁRMELY programhoz, tulajdonjog-ellenőrzés
--      nélkül.
-- A create_manual_order() SECURITY DEFINER RPC pedig MAGÁT az RLS-t kerüli meg, és
-- belső caller-identitás-ellenőrzés nélkül volt anon-nak is meghívható -- a frontend
-- egyáltalán nem hívja (grep 0 találat src/-ben), tehát biztonságosan szigorítható.
-- ==============================================================================

begin;

-- 1. "Visitors can view own orders" -- a sima vizitor-sajat-rendeles policy-nak nincs
--    szüksége az is_manual branch-re: egy online vizitor sajátja auth.uid()=user_id-vel
--    már fedett, a manuális/telefonos rendelések láthatósága a provider-policy dolga.
drop policy if exists "Visitors can view own orders" on public.orders;
create policy "Visitors can view own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

-- 2. "Visitors can create own orders" -- ugyanígy, a manuális beszúrás a provider-oldali
--    policy (lásd lejjebb) vagy a RPC dolga, nem a sima vizitoré.
drop policy if exists "Visitors can create own orders" on public.orders;
create policy "Visitors can create own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- 3. "Providers can insert manual orders for their programs" -- megtartva a legitim
--    tulajdonjog-ellenőrzést (exists(...)), csak a feltétlen "is_manual = true"
--    bypass-ot távolítja el.
drop policy if exists "Providers can insert manual orders for their programs" on public.orders;
create policy "Providers can insert manual orders for their programs"
  on public.orders for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
        and (providers.user_id = auth.uid() or providers.user_id is null)
    )
    or public.is_admin()
  );

-- 4. "Providers can view orders for their programs" -- ugyanaz a szűkítés SELECT-re.
drop policy if exists "Providers can view orders for their programs" on public.orders;
create policy "Providers can view orders for their programs"
  on public.orders for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
        and (providers.user_id = auth.uid() or providers.user_id is null)
    )
    or public.is_admin()
  );

-- 5. create_manual_order() RPC -- SECURITY DEFINER, tehát önmagában kerüli meg az RLS-t.
--    A frontend nem hívja (direkt .from('orders').insert()-et használ, lásd AppContext.tsx
--    createOrder), így biztonságosan szigorítható: belső tulajdonjog-ellenőrzés + az anon
--    grant visszavonása (csak authenticated hívhatja, és csak a saját programjához, vagy
--    admin bármelyikhez).
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
  v_is_owner boolean;
begin
  select exists (
    select 1 from public.programs
    join public.providers on providers.id = programs.provider_id
    where programs.id = p_program_id and providers.user_id = auth.uid()
  ) into v_is_owner;

  if not (v_is_owner or public.is_admin()) then
    raise exception 'Nincs jogosultsag manualis rendeles rogzitesere ehhez a programhoz';
  end if;

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

revoke execute on function public.create_manual_order from public, anon;
grant execute on function public.create_manual_order to authenticated;

commit;
