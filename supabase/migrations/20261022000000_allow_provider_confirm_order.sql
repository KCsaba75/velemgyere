-- Security definer functions for confirming and cancelling orders as text or uuid
create or replace function public.confirm_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
    set status = 'confirmed', updated_at = timezone('utc'::text, now())
    where (id::text = p_order_id or booking_reference = p_order_id or id::text = replace(p_order_id, '#', ''))
      and status = 'pending';
end;
$$;

create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.confirm_order(p_order_id::text);
end;
$$;

create or replace function public.cancel_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
    set status = 'cancelled', updated_at = timezone('utc'::text, now())
    where (id::text = p_order_id or booking_reference = p_order_id or id::text = replace(p_order_id, '#', ''));
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cancel_order(p_order_id::text);
end;
$$;

revoke execute on function public.confirm_order(text) from public, anon;
revoke execute on function public.confirm_order(uuid) from public, anon;
grant execute on function public.confirm_order(text) to authenticated;
grant execute on function public.confirm_order(uuid) to authenticated;

revoke execute on function public.cancel_order(text) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Allow providers to update orders for their own programs directly via RLS
drop policy if exists "Providers can cancel orders for their programs" on public.orders;
drop policy if exists "Providers can update orders for their programs" on public.orders;

create policy "Providers can update orders for their programs"
  on public.orders for update
  using (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = orders.program_id
    )
    or public.is_admin()
  );
