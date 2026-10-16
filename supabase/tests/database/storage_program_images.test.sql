-- pgTAP: program-images Storage bucket RLS (kanban f2d93218).
-- Publikus olvasas, de csak a sajat program tulajdonos providere (vagy admin)
-- tolthet fel -- az utvonal 1. szegmense (providers.id) alapjan.
--
-- BUKTATO: a storage.objects tablan Supabase sajat "protect_delete()" trigger-je
-- MINDEN direkt SQL DELETE-et letilt ("Direct deletion from storage tables is
-- not allowed. Use the Storage API instead.") -- ez FUGGETLEN az RLS-tol, a
-- trigger magat a parancsot allitja meg, meg postgres superuserkent is. Egy
-- pgTAP throws_ok/lives_ok ezt "died"-kent jelzi (nem elkapott kivetel), es ha
-- ez az ELSO halalos hiba egy tranzakcioban, a kovetkezo allitasok hamis
-- "nincs kivetel" eredmenyt adhatnak (a tranzakcio mar abortalt allapotban van).
-- Ezert a torles/update-jogosultsagot ITT NEM teszteljuk raw SQL-lel -- az
-- csak a Storage API-n (vagy Playwright-tal a tenyleges feltoltes-folyamaton)
-- verifikalhato ertelmesen.

begin;
select plan(4);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a1111111-1111-1111-1111-111111111111', 'storage_owner@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated'),
  ('a2222222-2222-2222-2222-222222222222', 'storage_other@test.local', 'x', now(), '{}', '{}', 'authenticated', 'authenticated');

insert into public.providers (id, user_id, company_name, contact_name, email, phone, description, status)
values ('a3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111',
        'Storage Teszt Kft', 'Teszt Kontakt', 'storage_owner@test.local', '+36301112222', 'leiras', 'approved');

-- Mar letezo "feltoltott" objektum a tulajdonos provider mappajaban (postgres
-- superuserkent szimulalva, mintha mar sikeresen feltoltottek volna).
insert into storage.objects (bucket_id, name, owner)
values ('program-images', 'a3333333-3333-3333-3333-333333333333/kep1.webp', 'a1111111-1111-1111-1111-111111111111');

-- 1) ANON is olvashatja (publikus katalogus-kep).
set local role anon;
select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'program-images' and name = 'a3333333-3333-3333-3333-333333333333/kep1.webp' $$,
  'ANON olvashatja a program-images bucket tartalmat (publikus katalogus-kep)'
);

-- 2) ANON NEM tud feltolteni (sem auth.uid(), sem is_admin() nem igaz neki).
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('program-images', 'a3333333-3333-3333-3333-333333333333/anon-probal.webp') $$,
  '42501'
);
reset role;

-- 3) A tulajdonos provider fel tud tolteni a SAJAT mappajaba.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('program-images', 'a3333333-3333-3333-3333-333333333333/kep2.webp', 'a1111111-1111-1111-1111-111111111111') $$,
  'A tulajdonos provider fel tud tolteni a sajat mappajaba'
);
reset role;

-- 4) Idegen (nem tulajdonos) provider NEM tud mas provider mappajaba feltolteni.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('program-images', 'a3333333-3333-3333-3333-333333333333/hamis.webp', 'a2222222-2222-2222-2222-222222222222') $$,
  '42501'
);
reset role;

select * from finish();
rollback;
