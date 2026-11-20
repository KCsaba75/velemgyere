-- Kartya af2a6460 (Csaba kerese): elfelejtett jelszo, brandelt email, 15 perces link,
-- max 3 probalkozas/ora. Sajat, Supabase natÍv recovery-flow-tol FUGGETLEN
-- token-rendszer, mert a natÍv GoTrue mailer_otp_exp / rate_limit_email_sent mezok
-- MINDEN mailer-flow-ra (signup-confirm IS) egyetlen kozos erteket vonatkoznak --
-- ezeket a kart kerese szerint (900s/3-ora) allitani csendben regresszalna a mar
-- eles 951a129f regisztracio-megerosito email-folyamatot.

create table public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index password_reset_tokens_email_created_idx on public.password_reset_tokens (email, created_at desc);
create unique index password_reset_tokens_token_hash_idx on public.password_reset_tokens (token_hash);

alter table public.password_reset_tokens enable row level security;
-- Szandekosan NINCS policy: anon/authenticated szamara teljesen zart, kizarolag a
-- lenti SECURITY DEFINER fuggvenyeken (es a service_role REST hivason, lasd az
-- Edge Function) keresztul erheto el.

-- 1) Rate-limit (max 3/ora emailenkent) + user-lookup + token-generalas. Csak a
-- request-password-reset Edge Function hivja (service_role) -- a visszaadott NULL
-- jelenti "ne kuldj emailt" (rate-limit VAGY nincs ilyen fiok, a hivo nem
-- kulonbozteti meg, hogy ne legyen fiok-letezes-oracle).
create or replace function public.create_password_reset_token(p_email text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_recent_count int;
  v_raw_token text;
  v_token_hash text;
begin
  select count(*) into v_recent_count
  from public.password_reset_tokens
  where email = v_email and created_at > now() - interval '1 hour';

  if v_recent_count >= 3 then
    return null;
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null then
    return null;
  end if;

  v_raw_token := encode(gen_random_bytes(32), 'base64');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  insert into public.password_reset_tokens (email, user_id, token_hash, expires_at)
  values (v_email, v_user_id, v_token_hash, now() + interval '15 minutes');

  return v_raw_token;
end;
$$;

revoke all on function public.create_password_reset_token(text) from public, anon, authenticated;
grant execute on function public.create_password_reset_token(text) to service_role;

-- 2) Token ellenorzese MELLOZESE nelkul (a ResetPasswordPage mountkor ezzel dönti el,
-- mutassa-e az uj-jelszo urlapot, vagy "lejart link" allapotot -- nem fogyasztja el
-- a tokent, csak megnezi).
create or replace function public.check_password_reset_token(p_email text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_token_hash text := encode(digest(p_token, 'sha256'), 'hex');
begin
  return exists (
    select 1 from public.password_reset_tokens
    where email = v_email and token_hash = v_token_hash
      and used_at is null and expires_at > now()
  );
end;
$$;

revoke all on function public.check_password_reset_token(text, text) from public;
grant execute on function public.check_password_reset_token(text, text) to anon, authenticated;

-- 3) Tenyleges jelszo-csere. A token-tudas MAGA az authorizacio (mint minden
-- email-linkes reset-flow-ban), ezert anon is hivhatja -- csak ervenyes,
-- fel-nem-hasznalt, le-nem-jart tokennel sikeres, es minden hibaeset UGYANAZT
-- a "false"-t adja vissza (nincs invalid-vs-expired-vs-used oracle).
create or replace function public.confirm_password_reset(p_email text, p_token text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_token_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_row record;
begin
  if p_new_password is null or length(p_new_password) < 6 then
    return false;
  end if;

  select * into v_row
  from public.password_reset_tokens
  where email = v_email and token_hash = v_token_hash
    and used_at is null and expires_at > now()
  limit 1;

  if v_row is null then
    return false;
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where id = v_row.user_id;

  update public.password_reset_tokens set used_at = now() where id = v_row.id;

  return true;
end;
$$;

revoke all on function public.confirm_password_reset(text, text, text) from public;
grant execute on function public.confirm_password_reset(text, text, text) to anon, authenticated;
