-- pgTAP: orders RLS -- "is_manual = true" bare-OR leak (kanban 866cb61a, kritikus talalat)
--
-- Root cause: 20261015_fix_manual_orders_rls.sql (es a schema.sql-beli tukrozese) az
-- "is_manual = true" felteteltn FELTETEL NELKUL (nem provider/program-scope-olva) OR-olta
-- be MIND a SELECT, MIND az INSERT orders policy-kba. Mivel "grant select, insert on
-- orders to anon, authenticated" is megy, ez barmely bejelentkezes nelkuli vagy idegen
-- authenticated userenek megengedi, hogy BARMELY manualis (telefonos) rendeles sorat
-- elolvassa (manual_customer_name/phone/email PII) VAGY uj, hamis manualis rendelest
-- szurjon be BARMELY programhoz, a sajat szolgaltatoi tulajdonjog-ellenorzes nelkul.
-- Elesben, anon kulccsal, curl-lel igazolva 2026-10-16-an (lasd kanban-komment).
--
-- Ez a teszt a FIX ELOTT szandekosan BUKik (bizonyitja hogy a res valodi, nem csak
-- dokumentacios aggaly), majd a migraciós fix utan mar zoldnek kell lennie.

begin;
select plan(6);

-- Fixture: egy "provider_a" szolgaltato, SAJAT programja, es egy ehhez tartozo manualis
-- (telefonos) rendeles idegen PII-vel. Postgres/superuser kontextusban (RLS bypass).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'provider_a@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'random_visitor@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

insert into public.providers (id, user_id, company_name, contact_name, email, phone, description, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
        'Teszt Utazas Kft', 'Teszt Elek', 'provider_a@test.local', '+36301112222', 'Teszt leiras', 'approved');

insert into public.categories (id, name, slug, icon)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Teszt kategoria', 'teszt-kategoria-rls', 'map');

insert into public.programs (id, provider_id, category_id, title, slug, short_description, description,
                              location, departure_location, event_date, start_time, end_time, duration, price, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Teszt Program', 'teszt-program-rls', 'rovid', 'hosszu', 'Teszt hely', 'Teszt indulohely',
        '2026-12-01', '09:00', '17:00', '8 ora', 100, 'published');

insert into public.orders (id, booking_reference, program_id, user_id, participants_count, total_price, status,
                            is_manual, source, manual_customer_name, manual_customer_phone, manual_customer_email)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'VG-TEST-RLS-1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null,
        2, 150, 'confirmed', true, 'phone', 'Kovacs Piroska', '+36701234567', 'piroska@pii-leak-test.local');

-- 1) ANON nem lathatja a manualis rendeles PII-jet
set local role anon;
select is_empty(
  $$ select 1 from public.orders where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'ANON nem erheti el a manualis rendeles soret (PII-leak guard)'
);

-- 2) ANON ne tudjon hamis manualis rendelest beszurni idegen programhoz
select throws_ok(
  $$ insert into public.orders (program_id, participants_count, total_price, status, is_manual, source,
       manual_customer_name, manual_customer_phone, manual_customer_email)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 1, 'confirmed', true, 'phone', 'Hamis Nev', '+36000000000', 'hamis@test.local') $$,
  '42501'
);
reset role;

-- 3) Idegen, BEJELENTKEZETT (de nem a program tulajdonos szolgaltatoja) user se lathassa
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.orders where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'Idegen authenticated user nem lathatja masik szolgaltato manualis rendeleset'
);
reset role;

-- 4) A TULAJDONOS szolgaltato (provider_a) TOVABBRA IS lassa a sajat programjahoz
--    tartozo manualis rendelest -- a fix nem veheti el a legitim hozzaferest.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.orders where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'A sajat program tulajdonosa (provider_a) tovabbra is latja a sajat manualis rendeleset'
);

-- 5) A tulajdonos szolgaltato be tud szurni uj manualis rendelest a SAJAT programjahoz
select lives_ok(
  $$ insert into public.orders (program_id, participants_count, total_price, status, is_manual, source,
       manual_customer_name, manual_customer_phone, manual_customer_email)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 50, 'confirmed', true, 'phone', 'Valos Ugyfel', '+36701112233', 'ugyfel@test.local') $$,
  'A program tulajdonosa tovabbra is tud sajat programjahoz manualis rendelest rogziteni'
);
reset role;

-- 6) ADMIN tovabbra is lat mindent (regresszio-guard a masik, admin-fuggo aggagra)
-- ON CONFLICT: a b9f12422-es signup-trigger mar letrehozta ezt a profiles sort
-- (visitor default szereppel) a fenti auth.users INSERT-kor.
insert into public.profiles (user_id, name, email, role)
values ('22222222-2222-2222-2222-222222222222', 'Admin Teszt', 'admin_test@test.local', 'admin')
on conflict (user_id) do update set role = excluded.role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.orders where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'Admin szerepkorrel ujra lathato a manualis rendeles (admin-eleres nem a fix altal zarult le)'
);
reset role;

select * from finish();
rollback;
