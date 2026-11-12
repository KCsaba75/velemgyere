-- KANBAN a855ef4a: a booking_messages tabla eles/dev-sandbox Supabase-projekteken
-- mar letezik (2026-10-18-an LIVE applikalva, lasd schema.sql commit 9a4ac5d),
-- de a migracio-fajl soha nem lett a repohoz commitolva -- ezert a lokalis
-- Supabase CLI stack (Playwright e2e) nem kapta meg automatikusan. Ez a fajl
-- az eredeti, elesen is lefutott SQL-t allitja vissza szo szerint (schema.sql
-- commit 9a4ac5d, kereszt-ellenorizve a PROD introspekcioval -- oszlopok,
-- policy-k, fuggveny-torzs egyezik), `if not exists`/`create or replace`
-- idempotens formaban, igy a mar elo projekteken no-op, uj (lokalis) stacken
-- pedig letrehozza.
--
-- KANBAN 2ffb61fa (Csaba+Zora egyeztetes, eredeti, 2026-10-18): foglalasonkenti
-- (order_id-hez kotott) uzenetszal igenybevevo es szolgaltato kozott,
-- Supabase Realtime-mal. V1 = csak szoveg, nincs fajlcsatolas/read-receipt/
-- typing-indicator/push-ertesites (szandekosan, lasd eredeti kartya scope).
--
-- RLS: csak a ket valodi fel (az adott order.user_id, VAGY a program->provider
-- lanc szerinti sajat szolgaltato) lassa/irhassa a sajat szalat.
create table if not exists public.booking_messages (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'provider')),
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0 and char_length(content) <= 4000),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists booking_messages_order_id_created_at_idx
  on public.booking_messages (order_id, created_at);

alter table public.booking_messages enable row level security;

-- Nincs delete/update grant -- v1-ben az uzenetek vegleges, nem szerkesztheto/
-- torolheto, ez szandekosan egyszerusiti a konfliktus-/audit-kerdest.
grant select, insert on public.booking_messages to authenticated;

create or replace function public.can_access_booking_messages(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        o.user_id = auth.uid()
        or exists (
          select 1 from public.programs pr
          join public.providers p on p.id = pr.provider_id
          where pr.id = o.program_id and p.user_id = auth.uid()
        )
        or public.is_admin()
      )
  );
$$;

revoke all on function public.can_access_booking_messages(uuid) from public, anon;
grant execute on function public.can_access_booking_messages(uuid) to authenticated;

drop policy if exists "Booking participants can view their message thread" on public.booking_messages;
create policy "Booking participants can view their message thread"
  on public.booking_messages for select
  using (public.can_access_booking_messages(order_id));

-- Az INSERT with-check KULON ellenorzi, hogy a sender_id a sajat auth.uid(),
-- ES hogy a sender_role tenylegesen egyezik azzal, melyik fel ir -- igy sem a
-- customer nem allithatja be magat 'provider'-nek, sem fordítva, meg akkor sem,
-- ha egyebkent (admin-kent) latna a szalat a fenti SELECT policy-n keresztul.
-- (Ezt a 20261018010000 migracio azonnal felulirja a write-window feltettel --
-- itt az eredeti, write-window NELKULI verzio, a tortenelmi huseg kedveert.)
drop policy if exists "Booking participants can send messages on their thread" on public.booking_messages;
create policy "Booking participants can send messages on their thread"
  on public.booking_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      (
        sender_role = 'customer'
        and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
      )
      or
      (
        sender_role = 'provider'
        and exists (
          select 1 from public.orders o
          join public.programs pr on pr.id = o.program_id
          join public.providers p on p.id = pr.provider_id
          where o.id = order_id and p.user_id = auth.uid()
        )
      )
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_messages'
  ) then
    alter publication supabase_realtime add table public.booking_messages;
  end if;
end $$;
