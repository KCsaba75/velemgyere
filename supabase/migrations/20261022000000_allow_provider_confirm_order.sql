-- Allow providers to confirm orders for their own programs via confirm_order RPC
create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner boolean := false;
begin
  if public.is_admin() then
    v_is_owner := true;
  else
    select exists (
      select 1 from public.orders o
      join public.programs p on p.id = o.program_id
      join public.providers pr on pr.id = p.provider_id
      where o.id = p_order_id and pr.user_id = auth.uid()
    ) into v_is_owner;
  end if;

  if not v_is_owner then
    raise exception 'Nincs jogosultságod ezen foglalás visszaigazolására.';
  end if;

  update public.orders
    set status = 'confirmed', updated_at = timezone('utc'::text, now())
    where id = p_order_id and status = 'pending';
end;
$$;

revoke execute on function public.confirm_order(uuid) from public, anon;
grant execute on function public.confirm_order(uuid) to authenticated;
