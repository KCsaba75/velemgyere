-- Kanban 8d11173e (2.resz): uzenetek+ertekelesek gyuloletbeszed-eloszures.
-- Csaba dontes: edge function Gemini-classifierrel ELOTTE dob el, be sem kerul a DB-be.
-- Ezek a service_role-only RPC-k futtatjak a validaciot + inserts-t, hogy a
-- Deno edge function ne duplikalja a jogosultsagi logikat kulon REST-hivasokban,
-- es atomi maradjon a check+insert.

create or replace function public.submit_booking_message(
  p_order_id uuid,
  p_sender_role text,
  p_sender_id uuid,
  p_content text
) returns public.booking_messages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.booking_messages;
  v_allowed boolean;
begin
  if p_sender_role not in ('customer','provider') then
    raise exception 'Érvénytelen küldő szerepkör.' using errcode = 'P0001';
  end if;

  if not public.booking_message_write_window_open(p_order_id) then
    raise exception 'Ehhez a foglaláshoz már nem küldhető üzenet (az esemény ideje elmúlt).' using errcode = 'P0001';
  end if;

  if p_sender_role = 'customer' then
    select exists(select 1 from public.orders o where o.id = p_order_id and o.user_id = p_sender_id) into v_allowed;
  else
    select exists(
      select 1 from public.orders o
      join public.programs pr on pr.id = o.program_id
      join public.providers p on p.id = pr.provider_id
      where o.id = p_order_id and p.user_id = p_sender_id
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'Nincs jogosultságod üzenetet küldeni ehhez a foglaláshoz.' using errcode = 'P0001';
  end if;

  insert into public.booking_messages (order_id, sender_role, sender_id, content)
  values (p_order_id, p_sender_role, p_sender_id, p_content)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_booking_message(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_booking_message(uuid, text, uuid, text) to service_role;

create or replace function public.submit_review(
  p_user_id uuid,
  p_program_id uuid,
  p_order_id uuid,
  p_rating numeric,
  p_rating_guide numeric,
  p_rating_value numeric,
  p_rating_organization numeric,
  p_rating_safety numeric,
  p_title text,
  p_comment text,
  p_positive_feedback text,
  p_improvement_feedback text,
  p_travel_type text,
  p_photos text[],
  p_status text
) returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.reviews;
  v_order record;
  v_program record;
  v_user_name text;
  v_is_admin boolean;
begin
  select o.user_id, o.status, o.program_id, o.created_at into v_order
  from public.orders o where o.id = p_order_id;

  if v_order.user_id is null then
    raise exception 'A foglalás nem található.' using errcode = 'P0001';
  end if;

  select exists(select 1 from public.profiles where user_id = p_user_id and role = 'admin') into v_is_admin;

  if v_order.user_id <> p_user_id and not v_is_admin then
    raise exception 'Kizárólag igazolt vásárlók értékelhetnek, akik a velemgyere felületén keresztül foglalták le az adott programot.' using errcode = 'P0001';
  end if;
  if v_order.status <> 'confirmed' then
    raise exception 'Kizárólag megtörtént, visszaigazolt foglalás értékelhető.' using errcode = 'P0001';
  end if;
  if v_order.program_id <> p_program_id then
    raise exception 'A foglalás nem ehhez a programhoz tartozik.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.reviews r where r.order_id = p_order_id) then
    raise exception 'Ehhez a foglaláshoz már rögzítettél értékelést.' using errcode = 'P0001';
  end if;

  select title, provider_id into v_program from public.programs where id = p_program_id;

  select coalesce(nullif(trim(name), ''), split_part(email, '@', 1), 'Utazó') into v_user_name
  from public.profiles where user_id = p_user_id;

  insert into public.reviews (
    program_id, order_id, user_id, user_name, rating, rating_guide, rating_value,
    rating_organization, rating_safety, title, comment, positive_feedback,
    improvement_feedback, travel_type, tour_date, is_verified_buyer, photos,
    provider_id, provider_name, status
  ) values (
    p_program_id, p_order_id, p_user_id, coalesce(v_user_name, 'Utazó'),
    least(5, greatest(1, p_rating)), least(5, greatest(1, p_rating_guide)),
    least(5, greatest(1, p_rating_value)), least(5, greatest(1, p_rating_organization)),
    least(5, greatest(1, p_rating_safety)), nullif(p_title, ''), p_comment,
    nullif(p_positive_feedback, ''), nullif(p_improvement_feedback, ''), p_travel_type,
    to_char(coalesce(v_order.created_at, now()), 'YYYY-MM-DD'), true, coalesce(p_photos, '{}'),
    v_program.provider_id,
    (select company_name from public.providers where id = v_program.provider_id),
    p_status
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_review(uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text, text[], text) to service_role;

-- A valodi hatar: a kozvetlen authenticated INSERT policy-k eltavolitasa, hogy
-- az iras kizarolag a fenti RPC-ken (service_role, edge function mogott) keresztul
-- legyen lehetseges -- a Gemini-moderacio innentol nem megkerulheto kozvetlen
-- .insert() hivassal.
drop policy if exists "Booking participants can send messages on their thread" on public.booking_messages;
drop policy if exists "Verified users can insert reviews" on public.reviews;
