-- ==============================================================================
-- Migráció: profiles/providers sor megbízható, szerver-oldali létrehozása
-- Dátum: 2026-10-16
-- Kanban: b9f12422 (Csaba kérése: "Regisztrációt tegyük robusztussá!", a
--   866cb61a teszt-stratégia audit során talált architektúra-eltérésre válaszul)
--
-- KORÁBBI ÁLLAPOT: a profiles/providers sor létrehozása KLIENS-OLDALON történt,
-- az AppContext.tsx syncFromSession effektjében (auth.onAuthStateChange SIGNED_IN
-- eseményén, a signUp() hívásnál átadott user_metadata alapján). Mivel ÉLESBEN
-- az email-megerősítés KÖTELEZŐ (signUp() nem ad session-t azonnal -- lásd
-- AppContext.tsx registerProvider komment "verified live, signUp returns no
-- session"), az auth.users sor a signUp() pillanatában MÁR létezik, de a
-- profiles/providers sor csak AKKOR jön létre, amikor a user tényleg
-- megerősíti az emailt ÉS be is jelentkezik, és a kliens JS lefut. Ha ez
-- bármiért megszakad (bezárt tab, megszakadt kapcsolat, a user sosem tér
-- vissza), az auth.users sor örökre profiles/providers nélkül marad --
-- felhasználhatatlan, "félig regisztrált" fiók.
--
-- FIX: egy AFTER INSERT trigger az auth.users táblán, ami a signUp() hívás
-- PILLANATÁBAN (a raw_user_meta_data-ból, ami ekkor már rendelkezésre áll,
-- függetlenül az email-megerősítéstől) megbízhatóan létrehozza a profiles sort
-- (és pending_provider metadata esetén a providers sort is). A kliens-oldali
-- létrehozás MARAD (lásd AppContext.tsx) -- a "select majd insert ha nincs"
-- minta már eleve idempotens, a trigger a profiles/providers sort hamarabb
-- létrehozza, a kliens select-je ezt már megtalálja és nem probál duplikáltan
-- beszúrni. Az "on conflict (user_id) do nothing" itt is extra védelem.
-- ==============================================================================

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_pending jsonb := v_meta->'pending_provider';
  v_display_name text;
  v_payment_methods text[];
begin
  if v_pending is not null then
    v_payment_methods := (
      select coalesce(array_agg(value::text), array['cash'])
      from jsonb_array_elements_text(coalesce(v_pending->'accepted_payment_methods', '["cash"]'::jsonb))
    );
    if cardinality(v_payment_methods) = 0 then
      v_payment_methods := array['cash'];
    end if;

    insert into public.providers (
      user_id, company_name, contact_name, email, phone, website, description,
      status, accepted_payment_methods
    )
    values (
      new.id,
      coalesce(v_pending->>'company_name', ''),
      coalesce(v_pending->>'contact_name', ''),
      new.email,
      coalesce(v_pending->>'phone', ''),
      v_pending->>'website',
      coalesce(v_pending->>'description', ''),
      'approved',
      v_payment_methods
    )
    on conflict (user_id) do nothing;

    insert into public.profiles (user_id, name, email, role)
    values (new.id, coalesce(v_pending->>'contact_name', new.email), new.email, 'provider')
    on conflict (user_id) do nothing;
  else
    v_display_name := coalesce(
      v_meta->>'full_name',
      v_meta->>'name',
      split_part(new.email, '@', 1),
      'Látogató'
    );
    insert into public.profiles (user_id, name, email, role)
    values (new.id, v_display_name, new.email, 'visitor')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
