-- e494046c: self-service "delete my account" RPC. Csaba's decision (2026-10-19
-- 08:42 Telegram, relayed via kanban e494046c): full cascade delete, no
-- anonymized retention. orders/reviews/favorites/credit_transactions/profiles/
-- providers already have ON DELETE CASCADE to auth.users(id) (see schema.sql),
-- so deleting the caller's own auth.users row is sufficient -- everything else
-- cascades automatically.
--
-- SECURITY: reads the id from auth.uid(), NEVER from a parameter -- so a caller
-- can only ever delete their own account, not anyone else's.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
