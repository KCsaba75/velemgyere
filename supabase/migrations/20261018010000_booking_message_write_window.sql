-- KANBAN a855ef4a kiegeszites -- lasd 20261018000000_booking_messages.sql
-- fejkommentjet az eredeti elmaradt-migracio hattererol. Ez a fajl az eredeti
-- 2026-10-18-i masodik live-apply lepest allitja vissza (schema.sql commit
-- eff752f), kereszt-ellenorizve a PROD introspekcioval.
--
-- KANBAN 2ffb61fa KIEGESZITES (Csaba, meg az eredeti RLS-tervezes ELOTT kert,
-- de csak utolag eszlelve): az uzenetiras IDOKORLATOS. Uj uzenetet csak a
-- program/foglalas UTOLSO napja utani nap VEGEIG (effektiv datum + 2 nap
-- hataranal, kizarolag) szabad kuldeni, utana a szal READ-ONLY -- DB/RLS-
-- szinten, nem csak UI-n elrejtve (a UI-only tiltas kozvetlen API-hivassal
-- megkerulheto lenne).
--
-- Az "effektiv datum" ugyanazt a precedenciat koveti, mint a tobbi helyen
-- (ProviderBookingsCalendar formatEffectiveDate): order.event_date (kulso/
-- manualis foglalasnak lehet sajat datuma) -> program_occurrences.event_date
-- (ha van occurrence_id) -> programs.event_date (alap, mindig letezik). Ha
-- valamiert semelyik sem allapithato meg, a fuggveny FAIL-OPEN-t ad (true).
create or replace function public.booking_message_write_window_open(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (now() at time zone 'Europe/Budapest')::date
        < (coalesce(o.event_date, occ.event_date::text, pr.event_date::text)::date + interval '2 days')
      from public.orders o
      left join public.program_occurrences occ on occ.id = o.occurrence_id
      left join public.programs pr on pr.id = o.program_id
      where o.id = p_order_id
    ),
    true
  );
$$;

revoke all on function public.booking_message_write_window_open(uuid) from public, anon;
grant execute on function public.booking_message_write_window_open(uuid) to authenticated;

drop policy if exists "Booking participants can send messages on their thread" on public.booking_messages;

create policy "Booking participants can send messages on their thread"
  on public.booking_messages for insert
  with check (
    sender_id = auth.uid()
    and public.booking_message_write_window_open(order_id)
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
