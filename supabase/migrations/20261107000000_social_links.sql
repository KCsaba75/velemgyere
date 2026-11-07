-- Kanban 71915a0a (Csaba, 2026-11-07, kozosajandek.hu-elemzes folytatasa, 1-3. pont):
-- a lablec bal oldalan megjeleno FB/Instagram/TikTok ikonok URL-jei admin
-- beallitasokban szerkesztheto legyenek, ne hardcode-olt link. Kulon tabla
-- kell (nem app_settings), mert app_settings.value numeric(10,2) -- URL-t nem
-- tud tarolni.
create table if not exists public.social_links (
  platform text primary key,
  url text not null default '',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

alter table public.social_links enable row level security;

create policy "Anyone can read social links" on public.social_links
  for select using (true);

create policy "Admins can manage social links" on public.social_links
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.social_links (platform, url) values
  ('facebook', ''),
  ('instagram', ''),
  ('tiktok', '')
on conflict (platform) do nothing;
