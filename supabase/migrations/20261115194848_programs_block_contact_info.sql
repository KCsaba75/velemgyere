-- Kanban 8d11173e: a programs tabla free-text mezoiben (title, short_description,
-- description, included[], not_included[]) ne lehessen elerhetoseget (telefon,
-- email, URL, ismert messenger/social domain) megadni -- disintermediation ellen.
-- Ez a valodi biztonsagi hatar (BEFORE INSERT/UPDATE trigger), fuggetlenul attol,
-- hogy a kliens-oldali validacio fut-e.

create or replace function public.text_has_phone_number(txt text)
returns boolean
language plpgsql
immutable
as $$
declare
  m text[];
  digits text;
begin
  if txt is null then
    return false;
  end if;
  -- Jelolt szakaszok: szam, utana szamjegy/szokoz/pont/kotojel/zarojel/plusz
  -- ismetlodes, majd szamjeggyel zarva. A tenyleges "telefonszam-e" dontest
  -- a kinyert szamjegyek SZAMA donti el (>=9), hogy datumokkal (max 8 szamjegy,
  -- pl. 2026-12-24) ne legyen hamis talalat.
  for m in
    select regexp_matches(txt, '[0-9][0-9 .\-()]{5,}[0-9]', 'g')
  loop
    digits := regexp_replace(m[1], '[^0-9]', '', 'g');
    if length(digits) >= 9 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.text_has_contact_info(txt text)
returns boolean
language sql
immutable
as $$
  select
    txt is not null and (
      -- email
      txt ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      -- URL / www
      or txt ~* '(https?://|www\.)[^\s]+'
      -- ismert messenger/social domain vagy app-nev, scheme nelkul is
      or txt ~* '(instagram\.com|facebook\.com|\bfb\.com\b|\bm\.me\b|\bwa\.me\b|\bt\.me\b|telegram\.me|\bviber\b|\bwhatsapp\b|\bmessenger\b)'
      -- telefonszam (kulon fuggveny, a szamjegy-szamlalas miatt)
      or public.text_has_phone_number(txt)
    );
$$;

create or replace function public.programs_block_contact_info()
returns trigger
language plpgsql
as $$
declare
  item text;
begin
  if public.text_has_contact_info(new.title)
     or public.text_has_contact_info(new.short_description)
     or public.text_has_contact_info(new.description)
  then
    raise exception 'A program címében vagy leírásában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.'
      using errcode = 'P0001';
  end if;

  if new.included is not null then
    foreach item in array new.included loop
      if public.text_has_contact_info(item) then
        raise exception 'A "Mit tartalmaz az ár?" listában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.'
          using errcode = 'P0001';
      end if;
    end loop;
  end if;

  if new.not_included is not null then
    foreach item in array new.not_included loop
      if public.text_has_contact_info(item) then
        raise exception 'A "Mit NEM tartalmaz az ár?" listában nem adható meg elérhetőség (telefonszám, email, weboldal vagy social/messenger link). Kérjük távolítsa el, a foglalás a platformon keresztül történik.'
          using errcode = 'P0001';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_programs_block_contact_info on public.programs;
create trigger trg_programs_block_contact_info
  before insert or update on public.programs
  for each row
  execute function public.programs_block_contact_info();

alter function public.text_has_phone_number(text) set search_path = public, pg_temp;
alter function public.text_has_contact_info(text) set search_path = public, pg_temp;
alter function public.programs_block_contact_info() set search_path = public, pg_temp;
