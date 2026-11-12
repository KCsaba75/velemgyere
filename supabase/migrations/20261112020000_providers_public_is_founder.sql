-- Kanban fadb2f0d folytatasa: a katalogus (nem-admin) providers-listazas a
-- providers_public VIEW-n megy (nem a nyers tablan), igy az is_founder mezot
-- IDE is fel kell venni, kulonben a ProgramCard badge mindig undefined-et kapna.
-- security_invoker=true -> a sajat (anon/authenticated) column-grantot nezi,
-- amit az elozo migracio (20261112010000_provider_founder_badge.sql) mar
-- beallitott az is_founder-re.
create or replace view public.providers_public as
select id, company_name, description, status, accepted_payment_methods, is_founder
from public.providers
where status = 'approved';

alter view public.providers_public set (security_invoker = true);
