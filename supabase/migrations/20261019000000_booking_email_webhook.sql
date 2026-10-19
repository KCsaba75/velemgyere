-- Booking email webhook (kanban 97ca24ba): calls the send-booking-email Edge
-- Function on orders INSERT (status=pending) and UPDATE (status -> confirmed).
-- The function itself re-checks the transition and no-ops otherwise, so this
-- trigger can stay simple and just forward every insert/update.
--
-- SECURITY NOTE: the service-role bearer token used to call the Edge Function is
-- NOT stored in this migration file (this repo is public). It lives in Supabase
-- Vault (supabase_vault extension, already installed) under the secret name
-- 'booking_email_service_role_key', inserted separately via
-- `select vault.create_secret(...)` run directly against the project, never
-- committed to git. If that secret is missing, this trigger function raises a
-- warning and skips the HTTP call rather than failing the underlying order
-- insert/update (a missing notification must never block a real booking).

create extension if not exists pg_net;

-- NOTE: v_url is PROJECT-SPECIFIC (contains this project's ref) -- when applying
-- this same migration to a different Supabase project (e.g. prod), update the
-- hostname below to that project's ref first. Not a secret, just not portable
-- as a single literal across environments.
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
begin
  -- Only fire on transitions the Edge Function actually handles; cheap guard to
  -- avoid a network call on every unrelated UPDATE (e.g. google_calendar_synced flips).
  if tg_op = 'INSERT' and new.status <> 'pending' then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (new.status = 'confirmed' and old.status is distinct from 'confirmed') then
    return new;
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
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := v_payload
  );

  return new;
end;
$$;

drop trigger if exists trg_send_booking_email on public.orders;
create trigger trg_send_booking_email
  after insert or update on public.orders
  for each row execute function public.send_booking_email_webhook();
