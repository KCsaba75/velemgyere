-- Kanban ca9129b7: uj Foglaltlista oldal a szolgaltatonak.
-- 1) orders.attended -- a "ki jelent meg" perzisztens jeloles, rendeles-szinten
--    (1 rendeles = 1 occurrence = 1 sor a listaban, Zora dontese D). A meglevo
--    "Providers can update orders for their programs" UPDATE RLS-policy mar
--    fedi, nincs kulon jogosultsag-valtozas.
alter table public.orders add column if not exists attended boolean not null default false;

-- 2) get_order_buyer_info RPC bovitese telefonszammal -- a platform-vevo a
--    Fiokadatok oldalon tudja kitolteni a profiles.phone mezot, eddig csak
--    name+email jott vissza. Ugyanaz a jogosultsag-ellenorzes (security
--    definer, csak a program sajat szolgaltatoja vagy admin). A visszateresi
--    tipus (OUT parameterek) valtozik, ezert elobb DROP kell, a
--    "create or replace" ezt nem engedi meg.
drop function if exists public.get_order_buyer_info(uuid);

create function public.get_order_buyer_info(p_order_id uuid)
returns table (name text, email text, phone text)
language sql
security definer
set search_path = public
stable
as $$
  select pr.name, pr.email, pr.phone
  from public.orders o
  join public.programs pg on pg.id = o.program_id
  join public.providers pv on pv.id = pg.provider_id
  join public.profiles pr on pr.user_id = o.user_id
  where o.id = p_order_id
    and (pv.user_id = auth.uid() or public.is_admin());
$$;

revoke execute on function public.get_order_buyer_info(uuid) from public, anon;
grant execute on function public.get_order_buyer_info(uuid) to authenticated;
