-- E2E fixture seed -- LOKALIS Supabase CLI stack-re valo, SOHA ne futtasd remote/
-- production projekt ellen. Postgres szuperuserkent (docker exec psql) megy, igy
-- NEM kell es NEM szabad RLS-t gyengiteni hozza -- ellentetben a legacy
-- supabase/seed_data.sql-lel, ami "allow_all" policy-kkal csendben felulirta
-- volna a valodi RLS-t, ha valaha production ellen futtatva lett volna (lasd
-- kanban 866cb61a komment -- elesben verifikaltan NEM futott le, de local/staging
-- setuphoz veszelyes minta, kerulendo).
insert into public.categories (id, name, slug, icon, active)
values ('e2e00000-0000-4000-8000-000000000001', 'E2E Kategoria', 'e2e-kategoria', 'Compass', true)
on conflict (id) do nothing;

insert into public.regions (id, country, name, slug, flag_emoji, active)
values ('e2e00000-0000-4000-8000-000000000002', 'Ciprus', 'E2E Régió', 'e2e-regio', '🇨🇾', true)
on conflict (id) do nothing;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('e2e00000-0000-4000-8000-0000000000aa', 'e2e-provider@test.local', crypt('e2e-test-pw-123', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.providers (id, user_id, company_name, contact_name, email, phone, description, status)
values ('e2e00000-0000-4000-8000-000000000003', 'e2e00000-0000-4000-8000-0000000000aa',
        'E2E Teszt Utazas Kft', 'E2E Kontakt', 'e2e-provider@test.local', '+36301112222',
        'E2E teszt szolgaltato leirasa', 'approved')
on conflict (id) do nothing;

insert into public.programs (id, provider_id, category_id, region_id, title, slug, short_description, description,
                              location, country, departure_location, event_date, start_time, end_time, duration,
                              price, currency, status, max_participants)
values ('e2e00000-0000-4000-8000-000000000004', 'e2e00000-0000-4000-8000-000000000003',
        'e2e00000-0000-4000-8000-000000000001', 'e2e00000-0000-4000-8000-000000000002',
        'E2E Teszt Program - Troodos Tura', 'e2e-teszt-program-troodos', 'E2E rovid leiras',
        'E2E hosszu leiras a teszt programrol.', 'Troodos, Ciprus', 'Ciprus', 'Larnaca szalloda elott',
        '2027-06-15', '09:00', '17:00', '8 óra', 65, 'EUR', 'published', 16)
on conflict (id) do nothing;
