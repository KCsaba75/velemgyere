-- Eleni #244 audit (dev homokozo) alapjan, Zora/Devon 1-2. koros review utan.
--
-- 1) [HIGH, aktiv res] programs.status onkiadas-bypass: a "Providers can update own
-- programs" policynak nem volt WITH CHECK-je, az UPDATE-grant pedig tablaszintu
-- (minden oszlopra, status-ra is). A szolgaltato sajat draft/published/archived
-- allapotai kozott valo onkiszolgalo valtasa SZANDEKOLT funkcio (lasd ProviderDashboard
-- "Kozzetetel"/"Piszkozatba"/"Archivalas" gombok, kanban b73c3ee2 dontes szerint uj
-- program admin-jovahagyas nelkul publikus) -- ezert a status oszlop GRANT-ja NEM
-- vehetot el teljesen (ellenteteben a providers.status mintaval), mert az eltorne ezt
-- a mukodo onkiszolgalo folyamatot. A tenyleges res csak a admin-donteshez kotott
-- allapotoknal (rejected, es a jelenleg hasznalatlan pending_review) all fenn: egy
-- szolgaltato kozvetlen REST hivassal visszaallithatta/atirhatta volna egy admin altal
-- MAR elutasitott programjat 'published'-re. Fix: USING blokkolja a modositast ha a
-- SOR JELENLEGI statusa rejected/pending_review (csak admin nyulhat hozza), WITH CHECK
-- pedig a szolgaltato altal beirhato UJ statust draft/published/archived-ra korlatozza
-- (rejected/pending_review csak admin-nak irhato be). A draft<->published<->archived
-- onkiszolgalas valtozatlanul mukodik.
drop policy if exists "Providers can update own programs" on public.programs;
create policy "Providers can update own programs"
  on public.programs
  for update
  using (
    (
      exists (
        select 1 from providers
        where providers.id = programs.provider_id and providers.user_id = auth.uid()
      )
      and status not in ('rejected', 'pending_review')
    )
    or is_admin()
  )
  with check (
    (
      exists (
        select 1 from providers
        where providers.id = programs.provider_id and providers.user_id = auth.uid()
      )
      and status in ('draft', 'published', 'archived')
    )
    or is_admin()
  );

-- 2) [MEDIUM, defense-in-depth] profiles.role: a "Users can update own profile"
-- policynak nincs WITH CHECK-je, bar jelenleg a role oszlopon NINCS UPDATE-grant az
-- authenticated szerepnek (information_schema.column_privileges-szel igazolva,
-- 2026-10-16, Eleni+Devon fuggetlen ellenorzessel), tehat ez MA nem aktivan
-- kihasznalhato. Jovobiztonsagkent (ha valaki egyszer tablaszintu/oszlop-GRANT-ot
-- futtatna a role-ra) a WITH CHECK most explicit lezarja: a sajat-profil UPDATE uj
-- sorban a role csak a JELENLEGI (mentett) ertekevel egyezhet, kiveve ha admin vegzi.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id or is_admin())
  with check (
    (
      auth.uid() = user_id
      and role = (select p.role from public.profiles p where p.user_id = auth.uid())
    )
    or is_admin()
  );
