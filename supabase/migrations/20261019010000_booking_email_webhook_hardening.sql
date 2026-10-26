-- Hardening follow-up to 20261019000000_booking_email_webhook.sql, per
-- get_advisors(security) findings right after that migration (kanban 97ca24ba).
--
-- send_booking_email_webhook() is a trigger-only function, but being SECURITY
-- DEFINER in the public schema makes PostgREST expose it at
-- /rest/v1/rpc/send_booking_email_webhook to anon/authenticated. Calling it
-- outside trigger context would already fail (no NEW/OLD/TG_OP available), but
-- there's no reason to leave it reachable at all -- revoke EXECUTE from the API
-- roles.
--
-- NOT fixed here: the advisor also flagged "pg_net extension in public schema".
-- Moving an already-in-use extension to another schema needs DROP EXTENSION,
-- which apply_migration treats as destructive and refuses to run unattended --
-- and this project's net.http_post call sites are schema-qualified regardless
-- of where the extension catalog entry lives, so this is a catalog-tidiness
-- warning, not a functional or security issue. Left as a known, accepted
-- advisor item; revisit only with an interactive session if it needs clearing.

revoke execute on function public.send_booking_email_webhook() from public, anon, authenticated;
