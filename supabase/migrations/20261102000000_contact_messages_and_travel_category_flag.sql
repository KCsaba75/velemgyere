-- Kanban 6f9ad755 (Csaba, 2026-11-02): two independent changes bundled in one
-- migration because they ship together with the same feature.
--
-- 1. CONTACT_MESSAGES: backs the new "Kapcsolat / Kérdésem van" section that
--    replaces the dead "Érdeklődéseim" block in MyAccountView.tsx (submitInquiry
--    has zero call sites in src/ -- the old provider-inquiry flow was already
--    retired when the booking/reservation model replaced it, see
--    ProgramDetailView.tsx's "Érdekel a program!" comment). This is a NEW,
--    separate table rather than reusing `inquiries`, because `inquiries.program_id`
--    and `provider_id` are NOT NULL FK columns -- a generic platform-contact
--    message has neither, and reusing the table would make it appear on
--    ProviderInquiriesPage (wrong: this is a user->admin message, not
--    user->provider).
--
-- 2. categories.is_travel_category: the user-facing Programok/Utazások split
--    needs a stable, environment-portable way to identify "the Utazások
--    Magyarországról category" -- its slug differs between dev-sandbox
--    ('utazasok-magyarorszagrol') and PROD ('magyarorszagrol-indulo-kirandulasok'),
--    so the app code must NOT hardcode a slug. This migration only adds the
--    column (default false, safe no-op on existing rows); the one-time
--    `UPDATE public.categories SET is_travel_category = true WHERE slug = '<...>'`
--    for the correct row is a MANUAL per-environment step (the slug differs),
--    run once after this migration in each environment -- see kanban comment
--    for the exact per-environment statement.

create table if not exists public.contact_messages (
  id text primary key default uuid_generate_v4()::text,
  user_id text,
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can create a contact message" on public.contact_messages;
create policy "Anyone can create a contact message" on public.contact_messages
  for insert with check (true);

drop policy if exists "Admin can read contact messages" on public.contact_messages;
create policy "Admin can read contact messages" on public.contact_messages
  for select using (public.is_admin());

drop policy if exists "Admin can update contact messages" on public.contact_messages;
create policy "Admin can update contact messages" on public.contact_messages
  for update using (public.is_admin());

alter table public.categories add column if not exists is_travel_category boolean not null default false;
