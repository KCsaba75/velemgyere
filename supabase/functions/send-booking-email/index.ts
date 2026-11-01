// Velemgyere booking email sender -- kanban 97ca24ba.
//
// Triggered by a Postgres trigger (pg_net's net.http_post, see the
// 20261019000000_booking_email_webhook.sql migration, widened by
// 20261025000000_booking_email_insert_confirmed.sql) on public.orders INSERT and UPDATE.
// - INSERT with status='pending' -> "foglalás megtörtént" email to the buyer.
// - INSERT with status='confirmed' (manual booking, or any other instant-confirm path
//   that creates the row already confirmed) -> "visszaigazolva" email directly, skipping
//   the pointless "we received your request" step (kanban 97ca24ba reopen, 2026-10-25:
//   order VG-2026-113711 was created INSERT-confirmed and got silently no email at all).
// - UPDATE where status changes from something else TO 'confirmed' -> "visszaigazolva" email.
// - UPDATE where status changes from something else TO 'cancelled', AND the trigger
//   resolved the cancelling session as the provider (cancelled_by_provider=true, see
//   20261028000000_order_cancellation_notifications.sql) -> "lemondva" email. A customer
//   cancelling their own booking does NOT get this (kanban c9cd13f6, Csaba's decision).
// Any other transition (e.g. a no-op update) is ignored.
//
// Sends via the Resend HTTP API (not the SMTP relay used for Supabase Auth emails --
// this is an application-level send, separate infra, same verified domain).

import { renderPendingEmail, renderConfirmedEmail, renderCancelledEmail, type BookingEmailData } from './booking-templates.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://velemgyere.hu';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
  cancelled_by_provider?: boolean;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
  bank_transfer: 'Előre utalás',
};

function formatPrice(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return '0 €';
  const rounded = Math.ceil(Math.round(num * 10000) / 10000 * 2) / 2;
  const str = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${str} €`;
}

function formatDateHu(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Egyeztetés alatt';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

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

async function buildEmailData(order: Record<string, any>): Promise<{ toEmail: string; data: BookingEmailData } | null> {
  const programs = await dbQuery<any[]>(
    `programs?id=eq.${order.program_id}&select=title,location,departure_location,duration,event_date,start_time,end_time,included,provider_id,currency`,
  );
  const program = programs[0];
  if (!program) return null;

  const providers = await dbQuery<any[]>(
    `providers?id=eq.${program.provider_id}&select=company_name,contact_name,email,phone,website`,
  );
  const provider = providers[0];

  // occurrence (specific date/time slot) takes priority over the program's own
  // legacy single-date fields; order.event_date/start_time (manual/external
  // bookings) take priority over the program defaults.
  let eventDate = order.event_date ?? program.event_date;
  let startTime = order.start_time ?? program.start_time;
  if (order.occurrence_id) {
    const occs = await dbQuery<any[]>(`program_occurrences?id=eq.${order.occurrence_id}&select=event_date,start_time`);
    if (occs[0]) {
      eventDate = occs[0].event_date;
      startTime = occs[0].start_time ?? startTime;
    }
  }

  let toEmail: string | null = null;
  let customerName = 'Utazó';
  if (order.is_manual) {
    toEmail = order.manual_customer_email;
    customerName = order.manual_customer_name ?? customerName;
  } else if (order.user_id) {
    const profiles = await dbQuery<any[]>(`profiles?user_id=eq.${order.user_id}&select=name,email`);
    if (profiles[0]) {
      toEmail = profiles[0].email;
      customerName = profiles[0].name ?? customerName;
    }
  }
  if (!toEmail) return null;

  const data: BookingEmailData = {
    bookingReference: order.booking_reference ?? order.id,
    customerName,
    programTitle: program.title ?? 'Program',
    programLocation: program.location ?? '',
    dateFormatted: formatDateHu(eventDate),
    startTime: startTime ?? '',
    duration: program.duration ?? '',
    departureLocation: program.departure_location ?? 'Egyeztetés alatt',
    participantsCount: order.participants_count ?? 1,
    includedList: Array.isArray(program.included) && program.included.length > 0 ? program.included.join(', ') : '-',
    totalPrice: formatPrice(order.total_price),
    onsiteAmount: formatPrice(order.onsite_amount),
    onsitePaymentMethod: order.onsite_payment_method ? (PAYMENT_METHOD_LABELS[order.onsite_payment_method] ?? order.onsite_payment_method) : 'Egyeztetés alatt',
    bookingFee: formatPrice(order.booking_fee),
    bookingDetailUrl: `${SITE_URL}/foglalasaim/${order.booking_reference ?? order.id}`,
    providerCompanyName: provider?.company_name ?? '',
    providerContactName: provider?.contact_name ?? '',
    providerPhone: provider?.phone ?? '',
    providerEmail: provider?.email ?? '',
    providerWebsite: provider?.website ?? '',
  };

  return { toEmail, data };
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Velemgyere <info@velemgyere.hu>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
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

  if (payload.table !== 'orders' || !payload.record) {
    return new Response(JSON.stringify({ skipped: 'not an orders event' }), { status: 200 });
  }

  const order = payload.record;
  const oldOrder = payload.old_record;

  let kind: 'pending' | 'confirmed' | 'cancelled' | null = null;
  if (payload.type === 'INSERT' && order.status === 'pending') {
    kind = 'pending';
  } else if (payload.type === 'INSERT' && order.status === 'confirmed') {
    kind = 'confirmed';
  } else if (payload.type === 'UPDATE' && order.status === 'confirmed' && oldOrder?.status !== 'confirmed') {
    kind = 'confirmed';
  } else if (payload.type === 'UPDATE' && order.status === 'cancelled' && oldOrder?.status !== 'cancelled') {
    // Only the provider cancelling someone else's booking gets this email --
    // a customer cancelling their own booking does not (kanban c9cd13f6,
    // Csaba's explicit decision). cancelled_by_provider is resolved by the
    // trigger via auth.uid(), not stored on the row itself.
    if (!payload.cancelled_by_provider) {
      return new Response(JSON.stringify({ skipped: 'cancelled by the customer themselves' }), { status: 200 });
    }
    kind = 'cancelled';
  }

  if (!kind) {
    return new Response(JSON.stringify({ skipped: 'no matching transition' }), { status: 200 });
  }

  try {
    const built = await buildEmailData(order);
    if (!built) {
      return new Response(JSON.stringify({ skipped: 'no recipient email resolved' }), { status: 200 });
    }
    const { toEmail, data } = built;
    const { subject, html } =
      kind === 'pending' ? renderPendingEmail(data) : kind === 'confirmed' ? renderConfirmedEmail(data) : renderCancelledEmail(data);
    await sendViaResend(toEmail, subject, html);
    return new Response(JSON.stringify({ sent: true, kind, to: toEmail }), { status: 200 });
  } catch (err) {
    console.error('send-booking-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
