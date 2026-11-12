-- Kanban d0005ffe (Csaba, 2026-11-12): bizalmi jelzo a katalogus-kartyan az
-- Alapito-jelzes (fadb2f0d) mellett -- "Uj szolgaltato" amig a sikeres
-- (confirmed) foglalasok szama < 10, utana a tenyleges, folyton nov szam.
--
-- "Sikeres foglalas" = status='confirmed' (orders.status csak pending/confirmed/
-- cancelled lehet, nincs kulon 'completed' allapot -- ugyanez a definicio mint
-- a ProviderFinancesPage/AdminBookingsPage mar meglevo confirmed-szamolasa).
--
-- A nyers orders tabla NEM olvashato anon/katalogus-latogatokent (RLS csak a
-- sajat vevonek/sajat szolgaltatonak/adminnak enged SELECT-et), ezert egy
-- publikus SZAMLALO oszlopot tartunk karban a providers tablan, triggerrel,
-- nem futasidoben szamolt aggregacioval.
alter table public.providers add column if not exists confirmed_bookings_count integer not null default 0;

create or replace function public.sync_provider_confirmed_bookings_count()
returns trigger as $$
declare
  v_provider_id uuid;
  v_was_confirmed boolean;
  v_is_confirmed boolean;
begin
  select provider_id into v_provider_id
  from public.programs
  where id = coalesce(new.program_id, old.program_id);

  if v_provider_id is null then
    return coalesce(new, old);
  end if;

  v_was_confirmed := (tg_op <> 'INSERT') and old.status = 'confirmed';
  v_is_confirmed := (tg_op <> 'DELETE') and new.status = 'confirmed';

  if v_is_confirmed and not v_was_confirmed then
    update public.providers
    set confirmed_bookings_count = confirmed_bookings_count + 1
    where id = v_provider_id;
  elsif v_was_confirmed and not v_is_confirmed then
    update public.providers
    set confirmed_bookings_count = greatest(confirmed_bookings_count - 1, 0)
    where id = v_provider_id;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_provider_confirmed_bookings on public.orders;
create trigger trg_sync_provider_confirmed_bookings
after insert or update of status or delete on public.orders
for each row
execute function public.sync_provider_confirmed_bookings_count();

-- Egyszeri backfill a ma mar letezo confirmed rendelesekre.
update public.providers p
set confirmed_bookings_count = sub.cnt
from (
  select pr.provider_id, count(*) as cnt
  from public.orders o
  join public.programs pr on pr.id = o.program_id
  where o.status = 'confirmed'
  group by pr.provider_id
) sub
where p.id = sub.provider_id;

-- Publikus (katalogus-kartya), tehat a teaser-only column-grant listahoz kell
-- + a providers_public VIEW-hoz (a katalogus ezt olvassa, nem a nyers tablat).
grant select (confirmed_bookings_count) on public.providers to anon, authenticated;

create or replace view public.providers_public as
select id, company_name, description, status, accepted_payment_methods, is_founder, confirmed_bookings_count
from public.providers
where status = 'approved';

alter view public.providers_public set (security_invoker = true);
