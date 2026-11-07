-- Kanban 71915a0a (Csaba, 2026-11-07, kozosajandek.hu-elemzes folytatasa,
-- 4-6. pont): uj "Platform" (Hogyan mukodik / Rolunk / Arazas es fizetes) es
-- "Ugyfelszolgalat" (GYIK / Kapcsolat / ASZF / Adatkezelesi tajekoztato)
-- aloldalak. Csaba pontositasa (msg 3306/3310): MIND a 7 aloldalnak admin-
-- feluletrol szerkesztheto szoveg+kep tartalma kell, nem csak a Rolunk-nak.
-- EGY altalanos tabla (nem 7 kulon), rugalmas jsonb content mezovel, mert a
-- 7 oldal tartalom-alakja kulonbozo (pl. FAQ = kerdes/valasz lista, Hogyan
-- mukodik = ket kulon nezopont-szoveg, a tobbi = egyetlen szoveg-blokk).
create table if not exists public.pages (
  slug text primary key,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

alter table public.pages enable row level security;

create policy "Anyone can read pages" on public.pages
  for select using (true);

create policy "Admins can manage pages" on public.pages
  for all using (public.is_admin()) with check (public.is_admin());

-- Sajat, dedikalt publikus bucket a lap-tartalmak kepeihez -- NEM a meglevo
-- 'program-images'-t bovitjuk, mert az szolgaltato-tulajdonu (folder = provider
-- id) tartalomra ertelmezett, ez pedig site-szintu, csak admin altal irhato
-- marketing-tartalom (lasd supabase/migrations/20261016020000_program_images_storage.sql
-- a kontrasztért).
insert into storage.buckets (id, name, public)
values ('site-content-images', 'site-content-images', true)
on conflict (id) do nothing;

create policy "Public read access to site content images"
  on storage.objects for select
  using (bucket_id = 'site-content-images');

create policy "Admins can upload site content images"
  on storage.objects for insert
  with check (bucket_id = 'site-content-images' and public.is_admin());

create policy "Admins can update site content images"
  on storage.objects for update
  using (bucket_id = 'site-content-images' and public.is_admin());

create policy "Admins can delete site content images"
  on storage.objects for delete
  using (bucket_id = 'site-content-images' and public.is_admin());
