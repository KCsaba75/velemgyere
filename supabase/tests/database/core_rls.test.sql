-- pgTAP: core RLS/column-grant tesztek -- profiles, providers (PII-oszlopok), app_settings.
-- Kanban 866cb61a (teszt-strategia, 1. kategoria folytatas) -- a system-test.ts RLS
-- "tesztjei" tobbszor strukturalisan sosem-bukhatok voltak (pl. `!error || error.code
-- === '42501'` ami akkor is PASS-t ad ha az anon kliens egyszeruen MINDENT elolvasott
-- hiba nelkul). Ezek a tesztek szigoruan POZITIV (lathato-e aminek lathatonak kell
-- lennie) ES NEGATIV (nem lathato-e aminek nem szabad) allitast tesznek egyszerre,
-- nem csak "nem dobott vaartlan hibat".

begin;
select plan(12);

-- Fixture-ok: postgres/superuser kontextus (RLS bypass).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('33333333-3333-3333-3333-333333333333', 'self@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'other@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'admin@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'approved_provider@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

insert into public.profiles (user_id, name, email, role)
values
  ('33333333-3333-3333-3333-333333333333', 'Sajat Felhasznalo', 'self@test.local', 'visitor'),
  ('44444444-4444-4444-4444-444444444444', 'Masik Felhasznalo', 'other@test.local', 'visitor'),
  ('55555555-5555-5555-5555-555555555555', 'Admin Teszt', 'admin@test.local', 'admin');

insert into public.providers (id, user_id, company_name, contact_name, email, phone, description, status)
values ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666',
        'Jovahagyott Utazas Kft', 'Teszt Kontakt', 'provider_contact@test.local', '+36301234567',
        'Jovahagyott szolgaltato leirasa', 'approved');

-- ============================================================================
-- PROFILES
-- ============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select isnt_empty(
  $$ select 1 from public.profiles where user_id = '33333333-3333-3333-3333-333333333333' $$,
  'Sajat profil lathato (POZITIV)'
);

select is_empty(
  $$ select 1 from public.profiles where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'Masik felhasznalo profilja NEM lathato (NEGATIV)'
);

-- Privilegium-eszkalacio guard: a sajat update NEM irhatja at a role oszlopot
-- (column-level grant nem tartalmazza a role-t -- lasd schema.sql "revoke update
-- on public.profiles from authenticated / grant update (name, email, ...)").
select throws_ok(
  $$ update public.profiles set role = 'admin' where user_id = '33333333-3333-3333-3333-333333333333' $$,
  '42501'
);

-- A megengedett oszlopok (pl. name) viszont irhatok a sajat soron.
select lives_ok(
  $$ update public.profiles set name = 'Sajat Felhasznalo Atnevezve' where user_id = '33333333-3333-3333-3333-333333333333' $$,
  'Sajat profil megengedett oszlopa (name) irhato'
);

reset role;

-- ============================================================================
-- PROVIDERS -- PII oszlopok (phone/email/contact_name) column-grant guard
-- ============================================================================

set local role anon;

select isnt_empty(
  $$ select company_name, description, status from public.providers where id = '77777777-7777-7777-7777-777777777777' $$,
  'ANON latja a jovahagyott szolgaltato PUBLIKUS mezoit (company_name/description/status)'
);

select throws_ok(
  $$ select phone from public.providers where id = '77777777-7777-7777-7777-777777777777' $$,
  '42501'
);

select throws_ok(
  $$ select email from public.providers where id = '77777777-7777-7777-7777-777777777777' $$,
  '42501'
);

select throws_ok(
  $$ select contact_name from public.providers where id = '77777777-7777-7777-7777-777777777777' $$,
  '42501'
);

reset role;

-- ============================================================================
-- APP_SETTINGS -- publikus olvasas megengedett, iras admin-only
--
-- FONTOS pgTAP-buktato: egy UPDATE-nel az RLS "using"-ja NEM dob 42501-et ha a
-- sor nem lathato a hivo szamara -- csendben 0 sort frissit ("UPDATE 0"), a
-- kliens semmilyen hibat nem lat. Ezert itt NEM throws_ok-kal, hanem a tenyleges
-- erteket visszaolvasva (results_eq) ellenorzunk: a nem-admin UPDATE UTAN az
-- ertek VALTOZATLAN kell maradjon. (Az orders INSERT policy-knal a throws_ok
-- helyes volt, mert ott a "with check" sikertelen volateje MINDIG dob -- ez a
-- kulonbseg UPDATE "using" es INSERT "with check" kozott.)
-- ============================================================================

-- Baseline ismert ertek, postgres/superuser kontextusban.
update public.app_settings set value = 0 where key = 'current_booking_fee';

set local role anon;

select isnt_empty(
  $$ select 1 from public.app_settings where key = 'current_booking_fee' $$,
  'ANON olvashatja az app_settings-et (szandekosan publikus, lasd "Anyone can read app settings")'
);

update public.app_settings set value = 999 where key = 'current_booking_fee';

reset role;

select results_eq(
  $$ select value from public.app_settings where key = 'current_booking_fee' $$,
  $$ values (0::numeric) $$,
  'ANON UPDATE-je nem valtoztatta meg az app_settings erteket (RLS csendben 0 sort frissitett)'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

update public.app_settings set value = 888 where key = 'current_booking_fee';

reset role;

select results_eq(
  $$ select value from public.app_settings where key = 'current_booking_fee' $$,
  $$ values (0::numeric) $$,
  'Sima authenticated (nem admin) UPDATE-je sem valtoztatta meg az erteket'
);

-- Admin szerepkorrel viszont modosithato.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

update public.app_settings set value = 5 where key = 'current_booking_fee';

reset role;

select results_eq(
  $$ select value from public.app_settings where key = 'current_booking_fee' $$,
  $$ values (5::numeric) $$,
  'Admin szerepkorrel tenylegesen modosult az app_settings erteke'
);

select * from finish();
rollback;
