-- Fix (kanban 97ca24ba, reopened): orders inserted DIRECTLY with status='confirmed'
-- (is_manual=true via ManualBookingModal, and at least one is_manual=false/source=platform
-- case Csaba hit in his own dev-sandbox test, order VG-2026-113711) never triggered any
-- notification. The original guard only forwarded INSERT when new.status='pending', so a
-- confirmed-at-creation order fell through silently on both the trigger and the Edge
-- Function side -- no log, no error, just nothing sent.
--
-- Regardless of which exact caller produces an INSERT-as-confirmed row (a currently
-- unidentified third path, a future admin/integration feature, or the existing manual-
-- booking path), the right behavior is the same: a confirmed order must always produce a
-- "visszaigazolva" email, whether it arrived there via INSERT or via UPDATE. Widen the
-- trigger guard to forward INSERT for both 'pending' and 'confirmed'; the Edge Function
-- change (separate deploy, see send-booking-email/index.ts) decides the actual email kind.

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
  -- INSERT: 'pending' (normal self-checkout) or 'confirmed' (manual booking, or any other
  -- instant-confirm path) both need a notification; anything else (e.g. a hypothetical
  -- INSERT straight into 'cancelled') does not.
  if tg_op = 'INSERT' and new.status not in ('pending', 'confirmed') then
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
