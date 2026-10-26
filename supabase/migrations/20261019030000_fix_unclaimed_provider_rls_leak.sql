-- 5156830b (KRITIKUS adatvedelmi incidens, 2026-10-19): a 'Providers can view/insert
-- orders for their programs' policy-k 'OR providers.user_id IS NULL' aga lehetove
-- tette, hogy BARMELY bejelentkezett user lassa/beszurjon rendelest barmely olyan
-- program alatt, aminek szolgaltatoja meg nincs claimelve (providers.user_id IS NULL).
--
-- Ez a 20261016000000_fix_manual_orders_pii_leak.sql (kanban 9ba2deac) altal
-- bevezetett "tulajdonjog-ellenorzes" nem vette eszre, hogy a NULL-ag maga is egy
-- nyitott bypass egy masik, nem-szandekolt modon: a providers.user_id = auth.uid()
-- feltetel NULL user_id eseten soha nem igaz EGY userre sem, de az "OR ... IS NULL"
-- miatt a teljes exists(...) BARMELY auth.uid()-re igazzá valt.
--
-- Zora/Csaba surgossegi jovahagyasaval (szukito biztonsagi javitas, hozzaferes
-- megvonasa, nem uj jogadas) -- az 'OR providers.user_id IS NULL' resz eltavolitva
-- mindket policy-bol. Dev-en (ygdvpnxtxdnueoizltzk) ES prodon (ovzhrecxshroinnfqkxl)
-- egyarant alkalmazva, mindket helyen fuggetlen SELECT-tel igazolva egy friss
-- teszt-fiokkal (korabban latta a mas-vasarlo foglalasat, a javitas utan mar nem).

drop policy if exists "Providers can view orders for their programs" on public.orders;
create policy "Providers can view orders for their programs"
  on public.orders for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
        and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "Providers can insert manual orders for their programs" on public.orders;
create policy "Providers can insert manual orders for their programs"
  on public.orders for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
        and providers.user_id = auth.uid()
    )
    or public.is_admin()
  );
