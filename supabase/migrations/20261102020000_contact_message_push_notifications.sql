-- Kanban 248d2841 (Csaba IGEN, Telegram 12:51 "push mehet" -- felvazolva a
-- 6f9ad755 kartyan, inter-agent 3193). Admin push-ertesites uj kapcsolati
-- uzenetre, ugyanazzal a mar meglevo Web Push infraval mint a booking-chat
-- push (20261025020000_booking_message_push_notifications.sql) -- ugyanaz a
-- vault-secret harom bejegyzese (service-role bearer + VAPID private
-- key/subject), ugyanaz a send-booking-push Edge Function (uj elagazassal a
-- 'contact_messages' tablara, lasd index.ts), csak a trigger-forras tabla uj.
--
-- Elteres a booking-chat esettol: ott PONTOSAN EGY cimzett van (a masik fel),
-- itt db MINDEN admin-role profilhoz kuldunk -- a tenyleges cimzett-feloldast
-- (ki admin, kinek van feliratkozasa/van-e push_notifications_enabled) a
-- send-booking-push fuggveny vegzi, a trigger csak a nyers uzenetet tovabbitja.

create or replace function public.send_contact_message_push_webhook()
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
    raise warning 'send_contact_message_push_webhook: vault secret missing, skipping push for message %', new.id;
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', tg_op,
    'table', 'contact_messages',
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

revoke execute on function public.send_contact_message_push_webhook() from public, anon, authenticated;

drop trigger if exists contact_messages_push_webhook on public.contact_messages;
create trigger contact_messages_push_webhook
  after insert on public.contact_messages
  for each row
  execute function public.send_contact_message_push_webhook();
