-- KANBAN a855ef4a kiegeszites -- lasd 20261018000000_booking_messages.sql
-- fejkommentjet az eredeti elmaradt-migracio hattererol. Ez a fajl az eredeti
-- 2026-10-18-i harmadik live-apply lepest allitja vissza (schema.sql commit
-- 0b8c73d), kereszt-ellenorizve a PROD introspekcioval.
--
-- KANBAN 4fe242f2 (Csaba, via Zora): olvasatlan-uzenet badge a szolgaltatoi
-- menuben + az Uzenetek lista kartyain. A booking_messages-nek SZANDEKOSAN
-- nincs update/delete grant-ja (v1 -- lasd 20261018000000), igy az "olvasva"
-- allapotot NEM az uzenet-soron taroljuk, hanem egy kulon, per-(order,user)
-- olvasasi kurzor-tablaban -- igy a booking_messages immutabilitasa nem serul.
create table if not exists public.booking_message_reads (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (order_id, user_id)
);

alter table public.booking_message_reads enable row level security;

grant select, insert, update on public.booking_message_reads to authenticated;

drop policy if exists "Users can view their own booking message read cursor" on public.booking_message_reads;
create policy "Users can view their own booking message read cursor"
  on public.booking_message_reads for select
  using (user_id = auth.uid());

drop policy if exists "Participants can set their own booking message read cursor" on public.booking_message_reads;
create policy "Participants can set their own booking message read cursor"
  on public.booking_message_reads for insert
  with check (user_id = auth.uid() and public.can_access_booking_messages(order_id));

drop policy if exists "Participants can advance their own booking message read cursor" on public.booking_message_reads;
create policy "Participants can advance their own booking message read cursor"
  on public.booking_message_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access_booking_messages(order_id));

-- SECURITY INVOKER (nem DEFINER): a booking_messages fenti SELECT policy-ja
-- (can_access_booking_messages) igy a sajat jogan ervenyesul erre a lekerdezesre
-- is, tehat a fuggveny CSAK a hivo fel sajat szalait adja vissza -- nincs
-- szukseg kulon jogosultsag-ismetlesre a fuggveny torzsében.
create or replace function public.get_unread_booking_message_counts()
returns table (order_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select bm.order_id, count(*)::bigint as unread_count
  from public.booking_messages bm
  left join public.booking_message_reads r
    on r.order_id = bm.order_id and r.user_id = auth.uid()
  where bm.sender_id <> auth.uid()
    and bm.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  group by bm.order_id;
$$;

revoke all on function public.get_unread_booking_message_counts() from public, anon;
grant execute on function public.get_unread_booking_message_counts() to authenticated;
