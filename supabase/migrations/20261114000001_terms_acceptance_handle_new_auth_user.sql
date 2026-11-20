-- Kanban 32ad8a91: a handle_new_auth_user() trigger (AFTER INSERT ON auth.users)
-- eddig semmit nem tudott terms_accepted_at-rol -- MIVEL EZ A TRIGGER szinkron
-- modon, MAR a signUp()/admin.createUser() hivas soran letrehozza a profiles/
-- providers sort, a kliens-oldali AppContext.tsx syncFromSession "if (!prof)
-- insert..." aga a GYAKORLATBAN csak akkor fut le, ha a trigger NEM hozta letre
-- a sort -- tehat a Google-elso-bejelentkezes elfogado-modaljahoz ITT, a
-- triggerben kell blokkolni a profil letrehozasat, nem a kliens JS-ben.
--
-- - provider-ag: a pending_provider MINDIG egy forma-submitbol jon (checkbox mar
--   kotelezo ott), tehat a metadata-ban mindig van terms_accepted_at -- csak
--   athuzzuk az uj oszlopokra.
-- - visitor-ag: ha a metadata-ban NINCS terms_accepted_at (tipikusan Google
--   OAuth, ahol nincs hagyomanyos form-submit lepes), a trigger NEM hozza letre
--   a profilt -- a felhasznalo egy sessionnel, de profil nelkul marad, amig a
--   TermsConsentModal "Elfogadom" gombja egy auth.updateUser()-rel be nem allitja
--   a metadata-t (ez UPDATE, nem INSERT auth.users-en, tehat ez a trigger nem fut
--   le ra ujra), es a kliens syncFromSession maga insertalja a sort.
--
-- MEGJEGYZES: maga a trigger (handle_new_auth_user + trg_handle_new_auth_user)
-- mar korabban is eles volt dev-sandboxon ES prodon, csak eddig dokumentalatlan
-- volt (nem szerepelt a schema.sql-ben). Ez a migracio a teljes, mar elo
-- definiciot rogziti elsokent, az uj terms_accepted_at tamogatassal kiegeszitve.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_pending jsonb := v_meta->'pending_provider';
  v_display_name text;
  v_payment_methods text[];
  v_terms_accepted_at timestamptz := nullif(v_meta->>'terms_accepted_at', '')::timestamptz;
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
      status, accepted_payment_methods, terms_accepted_at
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
      v_payment_methods,
      v_terms_accepted_at
    )
    on conflict (user_id) do nothing;

    insert into public.profiles (user_id, name, email, role, terms_accepted_at)
    values (new.id, coalesce(v_pending->>'contact_name', new.email), new.email, 'provider', v_terms_accepted_at)
    on conflict (user_id) do nothing;
  else
    if v_terms_accepted_at is null then
      return new;
    end if;

    v_display_name := coalesce(
      v_meta->>'full_name',
      v_meta->>'name',
      split_part(new.email, '@', 1),
      'Látogató'
    );
    insert into public.profiles (user_id, name, email, role, terms_accepted_at)
    values (new.id, v_display_name, new.email, 'visitor', v_terms_accepted_at)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
