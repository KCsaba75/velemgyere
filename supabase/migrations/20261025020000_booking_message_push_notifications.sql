-- Browser push notifications for new booking-chat messages (kanban d973bfec).
--
-- Mirrors the send_booking_email_webhook pattern (20261019000000_booking_email_webhook.sql):
-- an AFTER INSERT trigger on the source table calls an Edge Function via pg_net,
-- using the same Vault-stored service-role bearer token for trigger->function auth.
--
-- Difference from the email flow: the VAPID private key used to sign Web Push
-- requests can't be set as an Edge Function secret without a human entering it in
-- the Supabase dashboard (create_edge_function_secret has no programmatic value
-- path). So it's stored in vault.secrets like the bearer token, and the trigger
-- forwards it inside the webhook payload to the send-booking-push function --
-- same trust boundary as the bearer token already travelling that path.

-- 1) Per-user Web Push subscriptions (one row per browser/device the user granted
--    notification permission on).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- 2) Opt-out account setting (Csaba, 2026-10-25: default ON, not opt-in).
alter table public.profiles
  add column if not exists push_notifications_enabled boolean not null default true;

-- 3) Trigger: forward every new booking_messages row to the push Edge Function.
-- The function itself (send-booking-push) resolves the actual recipient (the
-- side that did NOT send), checks booking_message_reads to skip if already
-- read, and checks push_notifications_enabled to skip if opted out.
create or replace function public.send_booking_message_push_webhook()
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
begin
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
    raise warning 'send_booking_message_push_webhook: vault secret missing, skipping push for message %', new.id;
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', tg_op,
    'table', 'booking_messages',
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

-- Harden upfront (the booking-email trigger needed a reactive follow-up
-- migration for this -- 20261019010000_booking_email_webhook_hardening.sql --
-- do it in the same migration this time): a SECURITY DEFINER function must
-- not be directly callable as an RPC by anon/authenticated, only by the
-- trigger mechanism itself.
revoke execute on function public.send_booking_message_push_webhook() from public, anon, authenticated;

drop trigger if exists booking_messages_push_webhook on public.booking_messages;
create trigger booking_messages_push_webhook
  after insert on public.booking_messages
  for each row
  execute function public.send_booking_message_push_webhook();
