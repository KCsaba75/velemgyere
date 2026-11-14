-- Kanban 32ad8a91 (Csaba, 2026-11-14): regisztracios ASZF-elfogadas nyoma.
-- NULL = meg nem fogadta el (mar letezo, migracio elotti fiokok maradnak
-- NULL-on szandekosan -- nem kerul ujra elfogadasra, lasd AppContext.tsx
-- syncFromSession kommentjet: a checkbox/konszenzus-modal CSAK uj-profil/
-- uj-provider letrehozaskor fut le, meglevo sor eseten nem).
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.providers add column if not exists terms_accepted_at timestamptz;

-- providers INSERT oszlop-szintu grant (kanban fbf552b2 mintaja) -- enelkul a
-- kliens-oldali insert 42501 permission denied-et dobna erre az egy oszlopra.
grant insert (terms_accepted_at) on public.providers to authenticated;
