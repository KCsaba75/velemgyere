-- pgTAP: auth.users -> profiles/providers megbizhato trigger (kanban b9f12422).
-- Mutacios bizonyitek: trigger NELKUL (lasd kommentben a drop-parancsot, amit
-- kezzel futtattam a verifikacio soran) ez a teszt BUKIK -- egy auth.users
-- sor profiles nelkul marad, pontosan reprodukalva a kartyan leirt "felbehagyott
-- regisztracio" hibat (email-megerositesre varo user, aki sosem ter vissza).

begin;
select plan(7);

-- 1) Sima visitor signup (name metadata, nincs pending_provider) -- profiles
--    sor AZONNAL letrejon, meg mielott bármilyen kliens-oldali kod futna.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  'f1111111-1111-1111-1111-111111111111', 'visitor_signup@test.local', 'x', null, '{}',
  '{"name": "Teszt Latogato"}', 'authenticated', 'authenticated'
);

select isnt_empty(
  $$ select 1 from public.profiles where user_id = 'f1111111-1111-1111-1111-111111111111' $$,
  'Visitor signup utan AZONNAL (email-megerosites ELOTT) letezik a profiles sor'
);

select results_eq(
  $$ select name, role from public.profiles where user_id = 'f1111111-1111-1111-1111-111111111111' $$,
  $$ values ('Teszt Latogato'::text, 'visitor'::text) $$,
  'A profiles sor a signUp metadata name mezojet es visitor szerepkort kapja'
);

-- 2) Provider signup (pending_provider metadata) -- MIND a providers, MIND a
--    profiles sor letrejon, provider szerepkorrel.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  'f2222222-2222-2222-2222-222222222222', 'provider_signup@test.local', 'x', null, '{}',
  '{"pending_provider": {"company_name": "Teszt Utazas Kft", "contact_name": "Teszt Kontakt", "phone": "+36301234567", "description": "Teszt leiras", "accepted_payment_methods": ["cash", "revolut"]}}',
  'authenticated', 'authenticated'
);

select isnt_empty(
  $$ select 1 from public.providers where user_id = 'f2222222-2222-2222-2222-222222222222' $$,
  'Provider signup utan AZONNAL letezik a providers sor'
);

select results_eq(
  $$ select company_name, contact_name, status, accepted_payment_methods from public.providers where user_id = 'f2222222-2222-2222-2222-222222222222' $$,
  $$ values ('Teszt Utazas Kft'::text, 'Teszt Kontakt'::text, 'approved'::text, array['cash','revolut']::text[]) $$,
  'A providers sor a pending_provider metadata mezoit kapja, status=approved'
);

select results_eq(
  $$ select role from public.profiles where user_id = 'f2222222-2222-2222-2222-222222222222' $$,
  $$ values ('provider'::text) $$,
  'A profiles sor provider szerepkort kap pending_provider eseten'
);

-- 3) Google OAuth-szeru signup (full_name metadata, nincs name/pending_provider)
--    -- a full_name elsobbseget kap (ugyanaz a prioritas mint a kliens-oldali
--    fallback-ban, lasd AppContext.tsx syncFromSession).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  'f3333333-3333-3333-3333-333333333333', 'google_signup@test.local', 'x', now(), '{}',
  '{"full_name": "Google Teszt Felhasznalo", "avatar_url": "https://example.com/a.png"}',
  'authenticated', 'authenticated'
);

select results_eq(
  $$ select name from public.profiles where user_id = 'f3333333-3333-3333-3333-333333333333' $$,
  $$ values ('Google Teszt Felhasznalo'::text) $$,
  'OAuth (full_name metadata) eseten is azonnal letrejon a profiles sor, a full_name-et hasznalva'
);

-- 4) Metadata nelkuli signup (pl. admin altal kezzel letrehozott auth user)
--    -- NEM hibazik, email-prefix fallback nevvel letrehozza a profiles sort.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  'f4444444-4444-4444-4444-444444444444', 'nometadatafallback@test.local', 'x', now(), '{}',
  '{}', 'authenticated', 'authenticated'
);

select isnt_empty(
  $$ select 1 from public.profiles where user_id = 'f4444444-4444-4444-4444-444444444444' $$,
  'Metadata nelkuli signup sem hibazik, profiles sor fallback nevvel letrejon'
);

select * from finish();
rollback;
