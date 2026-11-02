-- KANBAN e7f38028 (3-4. pont): advisor-WARN "is_admin() SECURITY DEFINER
-- callable by anon/authenticated via RPC" -- reviewed, NO functional change.
-- See supabase/schema.sql tail comment for the full reasoning: revoking
-- EXECUTE would risk breaking anon-facing RLS policies that OR-combine with
-- is_admin() across ~60 policies, for a WARN that leaks no real information
-- (the function only reports the caller's own admin status).
comment on function public.is_admin() is
  'Reviewed 2026-11-01 (kanban e7f38028): intentionally callable via RPC by anon/authenticated. Only reports the calling user''s own admin status (auth.uid()-scoped, no parameter) -- no cross-user information leak. EXECUTE is NOT revoked because ~60 RLS policies OR-combine with is_admin() on anon-readable tables (regions, categories, programs, program_images, ...) and Postgres does not guarantee left-to-right short-circuit for OR, so a revoke risks "permission denied for function is_admin" on anon reads.';
