-- Provider-initiated cancellation notifications (kanban c9cd13f6).
--
-- Csaba's decision (2026-10-28): the branded email + push notification only
-- fire when the PROVIDER cancels a customer's booking. A customer cancelling
-- their own booking (cancelOrder() in AppContext.tsx, RLS policy "Visitors
-- can cancel own orders") must NOT get this notification from this feature.
--
-- The orders row itself doesn't record who performed the cancellation, so the
-- trigger resolves it in real time via auth.uid() -- the same identity RLS
-- already uses to decide whether the UPDATE is even allowed. This mirrors the
-- existing "Providers can cancel/update orders for their programs" policy's
-- own ownership check (programs -> providers -> providers.user_id = auth.uid()).
-- NOT currently counted as provider-initiated: admin-performed cancellations
-- (is_admin()) -- out of scope per the literal request ("ha a szolgaltato
-- mondja le"), revisit if Csaba wants admin cancels to notify too.

-- 1) Widen the existing booking-email trigger to also fire on ->cancelled,
--    carrying whether a provider (not the customer) performed it.
create or replace function public.send_booking_email_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_url text := 'https://ygdvpnxtxdnueoizltzk.supabase.co/functions/v1/send-booking-email';
  v_payload jsonb;
  v_cancelled_by_provider boolean := false;
begin
  if tg_op = 'INSERT' and new.status not in ('pending', 'confirmed') then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (
    (new.status = 'confirmed' and old.status is distinct from 'confirmed')
    or (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status = 'cancelled' then
    select exists (
      select 1 from public.programs
      join public.providers on providers.id = programs.provider_id
      where programs.id = new.program_id and providers.user_id = auth.uid()
    ) into v_cancelled_by_provider;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'booking_email_service_role_key'
  limit 1;

  if v_key is null then
    raise warning 'send_booking_email_webhook: vault secret booking_email_service_role_key missing, skipping notification for order %', new.id;
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', tg_op,
    'table', 'orders',
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    'cancelled_by_provider', v_cancelled_by_provider
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := v_payload
  );

  return new;
end;
$$;

revoke execute on function public.send_booking_email_webhook() from public, anon, authenticated;

-- 2) New, separate trigger for the push notification -- deliberately NOT
--    touching send_booking_message_push_webhook() (booking_messages-scoped,
--    unrelated concern). Same vault-secret pattern as the chat-push trigger.
create or replace function public.send_order_cancelled_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_vapid_private text;
  v_vapid_subject text;
  v_url text := 'https://ygdvpnxtxdnueoizltzk.supabase.co/functions/v1/send-booking-push';
  v_payload jsonb;
  v_cancelled_by_provider boolean := false;
begin
  if not (new.status = 'cancelled' and old.status is distinct from 'cancelled') then
    return new;
  end if;

  select exists (
    select 1 from public.programs
    join public.providers on providers.id = programs.provider_id
    where programs.id = new.program_id and providers.user_id = auth.uid()
  ) into v_cancelled_by_provider;

  if not v_cancelled_by_provider then
    return new;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'booking_email_service_role_key'
  limit 1;

  select decrypted_secret into v_vapid_private
  from vault.decrypted_secrets
  where name = 'booking_push_vapid_private_key'
  limit 1;

  select decrypted_secret into v_vapid_subject
  from vault.decrypted_secrets
  where name = 'booking_push_vapid_subject'
  limit 1;

  if v_key is null or v_vapid_private is null then
    raise warning 'send_order_cancelled_push_webhook: vault secret missing, skipping push for order %', new.id;
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', 'cancelled',
    'table', 'orders',
    'record', to_jsonb(new),
    'vapid_private_key', v_vapid_private,
    'vapid_subject', coalesce(v_vapid_subject, 'mailto:info@velemgyere.hu')
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := v_payload
  );

  return new;
end;
$$;

revoke execute on function public.send_order_cancelled_push_webhook() from public, anon, authenticated;

drop trigger if exists orders_cancelled_push_webhook on public.orders;
create trigger orders_cancelled_push_webhook
  after update on public.orders
  for each row
  execute function public.send_order_cancelled_push_webhook();
