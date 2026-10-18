import { Order, Program, ProgramOccurrence, OrderProviderContact, OrderBuyerInfo } from '../types/database';
import { getBookingReference } from '../context/AppContext';

export interface CalendarEventPayload {
  title: string;
  details: string;
  location: string;
  startDateStr: string; // YYYY-MM-DD
  startTimeStr?: string | null; // HH:mm
  durationHours?: number; // defaults to 2
  bookingRef: string;
}

/**
 * Normalizes date and time strings into Google Calendar URL format (YYYYMMDDTHHmmss)
 */
function formatGoogleCalendarDates(dateStr: string, timeStr?: string | null, durationHours: number = 2): string {
  try {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanDate.split('-').map(Number);

    let startHour = 10;
    let startMin = 0;
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      startHour = parseInt(parts[0], 10) || 10;
      startMin = parseInt(parts[1], 10) || 0;
    }

    const startDate = new Date(year, month - 1, day, startHour, startMin, 0);
    const endDate = new Date(startDate.getTime() + (durationHours || 2) * 60 * 60 * 1000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const formatPart = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    return `${formatPart(startDate)}/${formatPart(endDate)}`;
  } catch {
    const compact = dateStr.replace(/[^0-9]/g, '').slice(0, 8);
    return `${compact}T100000/${compact}T120000`;
  }
}

/**
 * Builds the CalendarEventPayload from Order and related entities
 */
export function buildCalendarEventPayload(
  order: Order,
  program?: Program,
  occurrence?: ProgramOccurrence,
  contact?: OrderProviderContact | null,
  buyerInfo?: OrderBuyerInfo | null,
  options?: { isProvider?: boolean }
): CalendarEventPayload {
  const bookingRef = getBookingReference(order);
  const progTitle = program?.title || order.program?.title || 'Velem Gyere Program';
  const location = program?.departure_location || program?.location || program?.region?.name || 'Helyszín megegyezés szerint';
  
  const rawDate = occurrence?.event_date || program?.event_date || order.created_at;
  const dateStr = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : new Date().toISOString().split('T')[0];
  const timeStr = occurrence?.start_time || program?.start_time || '10:00';
  
  let duration = 2.5;
  if (program?.duration) {
    const match = program.duration.match(/([\d.]+)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) duration = parsed;
    }
  }

  let title = '';
  const detailLines: string[] = [];

  if (options?.isProvider) {
    // Provider view
    const customerName = order.manual_customer_name || buyerInfo?.name || 'Vendég';
    const customerPhone = order.manual_customer_phone || '';
    const customerEmail = order.manual_customer_email || buyerInfo?.email || '';

    title = `[Foglalás] ${progTitle} - ${customerName} (${order.participants_count} fő)`;
    
    detailLines.push(`🛎️ PROGRAM FOGLALÁS - VELEM GYERE`);
    detailLines.push(`Azonosító: #${bookingRef}`);
    detailLines.push(`Program: ${progTitle}`);
    detailLines.push(`Résztvevők száma: ${order.participants_count} fő`);
    detailLines.push(`Vendég: ${customerName}`);
    if (customerPhone) detailLines.push(`Telefonszám: ${customerPhone}`);
    if (customerEmail) detailLines.push(`E-mail: ${customerEmail}`);
    if (order.source && order.source !== 'platform') {
      const srcMap: Record<string, string> = {
        phone: 'Telefonos',
        whatsapp: 'WhatsApp',
        onsite: 'Személyes',
        email: 'Email',
        external: 'Egyéb külső'
      };
      detailLines.push(`Forrás: ${srcMap[order.source] || order.source}`);
    }
    if (order.source_notes) {
      detailLines.push(`Megjegyzés: ${order.source_notes}`);
    }
    detailLines.push(`Fizetési mód helyszínen: ${order.onsite_payment_method === 'revolut' ? 'Revolut' : order.onsite_payment_method === 'bank_transfer' ? 'Előre utalás' : 'Készpénz'}`);
    detailLines.push(`Összeg: ${order.total_price} ${order.currency || 'EUR'}`);
    detailLines.push(`Találkozási pont: ${location}`);
  } else {
    // Traveler view
    title = `Velem Gyere: ${progTitle} (#${bookingRef})`;

    detailLines.push(`✨ VELEM GYERE PROGRAM ÉLMÉNY`);
    detailLines.push(`Foglalási azonosító: #${bookingRef}`);
    detailLines.push(`Program: ${progTitle}`);
    detailLines.push(`Időpont: ${dateStr} ${timeStr}`);
    detailLines.push(`Találkozási pont: ${location}`);
    detailLines.push(`Résztvevők száma: ${order.participants_count} fő`);
    if (contact?.contact_name) {
      detailLines.push(`Túravezető / Szolgáltató: ${contact.contact_name}`);
      if (contact.phone) detailLines.push(`Telefonszám: ${contact.phone}`);
      if (contact.email) detailLines.push(`E-mail: ${contact.email}`);
    }
    if (order.onsite_amount && order.onsite_amount > 0) {
      detailLines.push(`Helyszínen fizetendő: ${order.onsite_amount} ${order.currency || 'EUR'} (${order.onsite_payment_method === 'revolut' ? 'Revolut' : order.onsite_payment_method === 'bank_transfer' ? 'Előre utalás' : 'Készpénz'})`);
    }
    detailLines.push(`\nJó szórakozást és felejthetetlen élményeket kíván a Velem Gyere csapata!`);
  }

  return {
    title,
    details: detailLines.join('\n'),
    location,
    startDateStr: dateStr,
    startTimeStr: timeStr,
    durationHours: duration,
    bookingRef,
  };
}

/**
 * Creates an instantaneous Google Calendar Web link pre-filled with all booking details
 */
export function generateGoogleCalendarUrl(payload: CalendarEventPayload): string {
  const datesParam = formatGoogleCalendarDates(payload.startDateStr, payload.startTimeStr, payload.durationHours);
  
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: payload.title,
    dates: datesParam,
    details: payload.details,
    location: payload.location,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates an RFC 5545 iCalendar (.ics) string for cross-platform calendar import (Apple, Outlook, Google)
 */
export function generateIcsContent(payload: CalendarEventPayload): string {
  const cleanDate = payload.startDateStr.includes('T') ? payload.startDateStr.split('T')[0] : payload.startDateStr;
  const [year, month, day] = cleanDate.split('-').map(Number);

  let startHour = 10;
  let startMin = 0;
  if (payload.startTimeStr && payload.startTimeStr.includes(':')) {
    const parts = payload.startTimeStr.split(':');
    startHour = parseInt(parts[0], 10) || 10;
    startMin = parseInt(parts[1], 10) || 0;
  }

  const startDate = new Date(year, month - 1, day, startHour, startMin, 0);
  const endDate = new Date(startDate.getTime() + (payload.durationHours || 2) * 60 * 60 * 1000);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const now = new Date();
  const dtStamp = formatIcsDate(now);
  const dtStart = formatIcsDate(startDate);
  const dtEnd = formatIcsDate(endDate);

  const escapeIcs = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Velem Gyere//HU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:velemgyere-${payload.bookingRef}-${startDate.getTime()}@velemgyere.hu`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(payload.title)}`,
    `DESCRIPTION:${escapeIcs(payload.details)}`,
    `LOCATION:${escapeIcs(payload.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Triggers a browser download of the .ics file
 */
export function downloadIcsFile(payload: CalendarEventPayload): void {
  const content = generateIcsContent(payload);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `VelemGyere-foglalas-${payload.bookingRef}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens Google Calendar directly in a new window/tab
 */
export function openGoogleCalendar(payload: CalendarEventPayload): void {
  const url = generateGoogleCalendarUrl(payload);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Storage key helper for Google Calendar Sync preferences
 */
const SYNC_STORAGE_PREFIX = 'velemgyere_gcal_sync_';

export function getCalendarSyncPreference(userIdOrRole: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(`${SYNC_STORAGE_PREFIX}${userIdOrRole}`);
    if (val !== null) {
      return val === 'true';
    }
  } catch {
    // fallback
  }
  return false;
}

export function setCalendarSyncPreference(userIdOrRole: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${SYNC_STORAGE_PREFIX}${userIdOrRole}`, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}
