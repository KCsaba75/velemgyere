-- ==============================================================================
-- Migráció: valódi Supabase Storage bucket az értékelés-fotókhoz (kanban 03062f66)
-- Dátum: 2026-11-20
--
-- KORÁBBI ÁLLAPOT: a ReviewModal.tsx (handleAddPhoto) csak tetszőleges külső
-- kép-URL beillesztését engedte -- nem volt saját Storage, nem volt resize/webp.
--
-- FIX: 'review-photos' publikus bucket + storage.objects RLS, ugyanazzal a
-- mintával mint a program-images bucketnél (20261016020000), de az útvonal
-- első szegmense itt NEM a providers.id, hanem a feltöltő SAJÁT auth.uid()-ja
-- -- az értékelést a vásárló (nem a szolgáltató) adja le, és a feltöltés
-- pillanatában még nincs review.id (a review csak a submit-review edge
-- function-ben jön létre).
-- ==============================================================================

begin;

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to review photos" on storage.objects;
create policy "Public read access to review photos"
  on storage.objects for select
  using (bucket_id = 'review-photos');

drop policy if exists "Users can upload own review photos" on storage.objects;
create policy "Users can upload own review photos"
  on storage.objects for insert
  with check (
    bucket_id = 'review-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Users can update own review photos" on storage.objects;
create policy "Users can update own review photos"
  on storage.objects for update
  using (
    bucket_id = 'review-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Users can delete own review photos" on storage.objects;
create policy "Users can delete own review photos"
  on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

commit;
