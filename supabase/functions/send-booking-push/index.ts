// Velemgyere booking-chat push notification sender -- kanban d973bfec.
//
// Triggered by a Postgres trigger (pg_net's net.http_post, see the
// 20261025020000_booking_message_push_notifications.sql migration) on
// public.booking_messages INSERT.
//
// Resolves the actual recipient (the side that did NOT send the message --
// customer via orders.user_id, provider via programs->providers.user_id),
// skips if the recipient already read the thread past this message's
// created_at (booking_message_reads.last_read_at), skips if the recipient
// turned off push (profiles.push_notifications_enabled = false), then sends
// a Web Push notification to every subscription row the recipient has.
// Expired/invalid subscriptions (404/410 from the push service) are deleted.
//
// ALSO handles a second, unrelated event shape (kanban c9cd13f6): a separate
// trigger (send_order_cancelled_push_webhook, see
// 20261028000000_order_cancellation_notifications.sql) posts here with
// table='orders', type='cancelled' when a PROVIDER cancels a customer's
// booking -- the trigger itself only fires when it resolved the cancelling
// session as the provider, so no cancelled_by_provider check is needed here.
//
// The VAPID private key arrives in the webhook payload rather than as an
// Edge Function secret -- create_edge_function_secret requires a human to
// enter the value in the Supabase dashboard, so the trigger instead reads it
// from vault.secrets (same as the service-role bearer token already used for
// trigger->function auth in send_booking_email_webhook) and forwards it here.

import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Public by design -- this is the same value shipped to the browser as
// VITE_VAPID_PUBLIC_KEY, safe to hardcode here.
const VAPID_PUBLIC_KEY = 'BPWXKIXGoTmdomENupeFF7l0wNN8k-qavs4FZv1fYCoJeuPYNTBSoC-MhYt_SUIzUL0afK_qa3ZXo3BMhjjfc5g';

type WebhookPayload = {
  type: 'INSERT' | 'cancelled';
  table: string;
  record:
    | {
        id: string;
        order_id: string;
        sender_role: 'customer' | 'provider';
        sender_id: string;
        content: string;
        created_at: string;
      }
    | {
        id: string;
        user_id: string | null;
        program_id: string;
        booking_reference: string | null;
        status: string;
      }
    | null;
  vapid_private_key: string;
  vapid_subject: string;
};

async function dbQuery<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`DB query failed (${res.status}) for ${path}: ${await res.text()}`);
  }
  return res.json();
}

async function dbDelete(path: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  let recipientUserId: string | null = null;
  let notificationPayload: string;

  if (payload.table === 'booking_messages' && payload.record) {
    const message = payload.record as {
      order_id: string;
      sender_role: 'customer' | 'provider';
      sender_id: string;
      content: string;
      created_at: string;
    };

    const orders = await dbQuery<any[]>(
      `orders?id=eq.${message.order_id}&select=id,user_id,program_id,booking_reference`,
    );
    const order = orders[0];
    if (!order) {
      return new Response(JSON.stringify({ skipped: 'order not found' }), { status: 200 });
    }

    if (message.sender_role === 'customer') {
      const programs = await dbQuery<any[]>(`programs?id=eq.${order.program_id}&select=provider_id`);
      const providerId = programs[0]?.provider_id;
      if (providerId) {
        const providers = await dbQuery<any[]>(`providers?id=eq.${providerId}&select=user_id`);
        recipientUserId = providers[0]?.user_id ?? null;
      }
    } else {
      recipientUserId = order.user_id;
    }

    if (!recipientUserId || recipientUserId === message.sender_id) {
      return new Response(JSON.stringify({ skipped: 'no distinct recipient user_id resolved' }), { status: 200 });
    }

    const reads = await dbQuery<any[]>(
      `booking_message_reads?order_id=eq.${message.order_id}&user_id=eq.${recipientUserId}&select=last_read_at`,
    );
    const lastReadAt = reads[0]?.last_read_at;
    if (lastReadAt && new Date(lastReadAt) >= new Date(message.created_at)) {
      return new Response(JSON.stringify({ skipped: 'recipient already read the thread' }), { status: 200 });
    }

    const title = message.sender_role === 'provider' ? 'Üzenet a szolgáltatótól' : 'Üzenet az utazótól';
    const body = message.content.length > 140 ? `${message.content.slice(0, 137)}...` : message.content;
    notificationPayload = JSON.stringify({
      title,
      body,
      url: `/foglalasaim/${order.booking_reference ?? order.id}`,
    });
  } else if (payload.table === 'orders' && payload.type === 'cancelled' && payload.record) {
    // Trigger-side already resolved this as provider-initiated -- see
    // send_order_cancelled_push_webhook() -- so no cancelled_by_provider
    // check needed here. A manual booking (no auth user) has nothing to
    // push to.
    const order = payload.record as { user_id: string | null; booking_reference: string | null; id: string };
    recipientUserId = order.user_id;
    if (!recipientUserId) {
      return new Response(JSON.stringify({ skipped: 'manual booking, no user_id to notify' }), { status: 200 });
    }
    notificationPayload = JSON.stringify({
      title: 'Foglalás lemondva',
      body: 'A szolgáltató lemondta a foglalásod. Nyisd meg a részletekért.',
      url: `/foglalasaim/${order.booking_reference ?? order.id}`,
    });
  } else {
    return new Response(JSON.stringify({ skipped: 'not a recognized event' }), { status: 200 });
  }

  const profiles = await dbQuery<any[]>(
    `profiles?user_id=eq.${recipientUserId}&select=push_notifications_enabled`,
  );
  if (profiles[0]?.push_notifications_enabled === false) {
    return new Response(JSON.stringify({ skipped: 'recipient disabled push' }), { status: 200 });
  }

  const subs = await dbQuery<any[]>(
    `push_subscriptions?user_id=eq.${recipientUserId}&select=id,endpoint,p256dh,auth_key`,
  );
  if (subs.length === 0) {
    return new Response(JSON.stringify({ skipped: 'no push subscriptions for recipient' }), { status: 200 });
  }

  webpush.setVapidDetails(payload.vapid_subject, VAPID_PUBLIC_KEY, payload.vapid_private_key);

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        notificationPayload,
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await dbDelete(`push_subscriptions?id=eq.${sub.id}`);
      } else {
        console.error('send-booking-push: webpush error', err);
      }
    }
  }

  return new Response(JSON.stringify({ sent, recipientUserId }), { status: 200 });
});
