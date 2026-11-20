-- Kanban fadb2f0d (Csaba, 2026-11-12): "Alapito" jelzes az elso 20 szolgaltatonak,
-- sorrend = AZ ELSO PUBLIKALT PROGRAM idopontja szerint, orokre megmarad.
--
-- first_published_at: a providers tablan, triggerrel irva, csak EGYSZER (COALESCE),
-- amikor egy program eloszor valik 'published'-de. Ez a megbizhato, elorefele
-- korrekt forras uj publikalasoknal (nem a created_at-bol kovetkeztetunk).
--
-- is_founder: PERMANENS flag. "ORDER BY first_published_at LIMIT 20" futasidoben
-- egy kesobbi szolgaltato-torles visszamenoleg "elorebb sorolna" egy 21.-et a
-- top20-ba, megsertve az "orokre megmarad" kerest -- ezert a rangsort ABBAN A
-- PILLANATBAN fagyasztjuk be, amikor first_published_at beallt.
alter table providers add column if not exists first_published_at timestamptz;
alter table providers add column if not exists is_founder boolean not null default false;

create or replace function set_provider_first_published()
returns trigger as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    update providers
    set first_published_at = coalesce(first_published_at, now())
    where id = new.provider_id;

    update providers
    set is_founder = true
    where id = new.provider_id
      and is_founder = false
      and first_published_at is not null
      and (
        select count(*) from providers p2
        where p2.first_published_at is not null
          and p2.first_published_at <= providers.first_published_at
      ) <= 20;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_set_provider_first_published on programs;
create trigger trg_set_provider_first_published
after insert or update of status on programs
for each row
execute function set_provider_first_published();

-- is_founder a katalogus-kartyan/profilon publikus badge, tehat a teaser-only
-- anon/authenticated column-grant listahoz (schema.sql) hozza kell adni --
-- kulonben a publikus katalogus-lekerdezes mindig null-t kapna ra, fuggetlenul
-- attol hogy a sor maga olvashato. first_published_at NEM publikus (csak
-- admin_list_providers()-en keresztul), nincs kulon grant ra.
grant select (is_founder) on public.providers to anon, authenticated;

-- Egyszeri backfill a MA MAR LETEZO publikalt programokra: nincs tortenelmi
-- idobelyeg a valodi elso-publikalasra, ezert a legkorabbi publikalt program
-- created_at-ja a legjobb elerheto kozelites. Csak 7-8 szolgaltatot erint most,
-- jol bven a 20-as korlat alatt.
update providers p
set first_published_at = sub.earliest
from (
  select provider_id, min(created_at) as earliest
  from programs
  where status = 'published'
  group by provider_id
) sub
where p.id = sub.provider_id
  and p.first_published_at is null;

update providers
set is_founder = true
where first_published_at is not null
  and (
    select count(*) from providers p2
    where p2.first_published_at is not null
      and p2.first_published_at <= providers.first_published_at
  ) <= 20;
