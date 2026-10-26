-- ==============================================================================
-- Migráció: valódi Supabase Storage bucket a program-képekhez (kanban f2d93218)
-- Dátum: 2026-10-16
--
-- KORÁBBI ÁLLAPOT: a program/szolgáltató képek base64 data-URL-ként voltak
-- beégetve a program_images.image_url mezőbe (NewProgramModal.tsx
-- handleFileUpload, FileReader.readAsDataURL) -- 0 Storage bucket létezett.
--
-- FIX: 'program-images' publikus bucket + storage.objects RLS: bárki
-- olvashatja (publikus katalógus), de csak a program tulajdonos szolgáltatója
-- (vagy admin) tölthet fel/módosíthat/törölhet -- az útvonal ELSŐ szegmense a
-- feltöltő providers.id-ja (pl. "<provider_id>/<fajlnev>.webp"), ez alapján
-- ellenőrizzük a jogosultságot, NEM program_id alapján (egy MÉG LÉTRE NEM
-- HOZOTT új programnál nincs program_id, de a provider.id már a feltöltés
-- pillanatában ismert).
--
-- thumb_url oszlop: a reszponzív méretezéshez (lista-nézet kis thumbnail,
-- részletező nagy kép) -- ha a feltöltés csak egy méretet generál, ez NULL
-- marad és a kliens image_url-re esik vissza.
-- ==============================================================================

begin;

insert into storage.buckets (id, name, public)
values ('program-images', 'program-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to program images" on storage.objects;
create policy "Public read access to program images"
  on storage.objects for select
  using (bucket_id = 'program-images');

drop policy if exists "Providers can upload own program images" on storage.objects;
create policy "Providers can upload own program images"
  on storage.objects for insert
  with check (
    bucket_id = 'program-images'
    and (
      (storage.foldername(name))[1] in (
        select providers.id::text from public.providers where providers.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop policy if exists "Providers can update own program images" on storage.objects;
create policy "Providers can update own program images"
  on storage.objects for update
  using (
    bucket_id = 'program-images'
    and (
      (storage.foldername(name))[1] in (
        select providers.id::text from public.providers where providers.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop policy if exists "Providers can delete own program images" on storage.objects;
create policy "Providers can delete own program images"
  on storage.objects for delete
  using (
    bucket_id = 'program-images'
    and (
      (storage.foldername(name))[1] in (
        select providers.id::text from public.providers where providers.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

alter table public.program_images add column if not exists thumb_url text;

commit;
