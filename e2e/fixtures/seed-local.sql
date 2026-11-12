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

-- instance_id kotelezo GoTrue-nak (NULL eseten a jelszo egyebkent helyes
-- bejelentkezes is "Hibas e-mail cim vagy jelszo" 400-at ad -- lasd kanban
-- 6171b71e verifikacios korben felfedezve, a sajat regisztracios folyammal
-- letrehozott sorok mind '00000000-0000-0000-0000-000000000000'-t kapnak).
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values ('e2e00000-0000-4000-8000-0000000000aa', '00000000-0000-0000-0000-000000000000', 'e2e-provider@test.local', crypt('e2e-test-pw-123', gen_salt('bf')), now(), '{}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- A robust_signup_trigger a profiles sort 'visitor' default-dal hozza letre --
-- ezt a seed-provider fiokot explicit providerre kell allitani, kulonben a
-- ProtectedRoute (allow=['provider','admin']) kizarja a /szolgaltato/* utakrol.
update public.profiles set role = 'provider' where user_id = 'e2e00000-0000-4000-8000-0000000000aa';

-- GoTrue (ujabb verzioban) az auth.identities tablat is lekerdezi a
-- bejelentkezesnel -- email/jelszo provider eseten is kell egy sor, kulonben
-- "Database error querying schema" 500-at ad, a jelszotol fuggetlenul (ezt is
-- a 6171b71e verifikacios korben derult ki -- egy UI-regisztracioval letrehozott
-- sor automatikusan kapja ezt, a direkt SQL insert nem).
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'e2e00000-0000-4000-8000-0000000000aa',
  'e2e00000-0000-4000-8000-0000000000aa',
  jsonb_build_object('sub', 'e2e00000-0000-4000-8000-0000000000aa', 'email', 'e2e-provider@test.local', 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

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
