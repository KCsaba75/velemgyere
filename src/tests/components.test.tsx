import { describe, it, expect } from 'vitest';
import { formatPrice } from '../lib/priceUtils';
import { buildCalendarEventPayload, generateGoogleCalendarUrl, generateIcsContent } from '../services/googleCalendarService';
import { Order, Program } from '../types/database';

describe('Price Formatting Utilities', () => {
  it('correctly formats round numbers without trailing decimal zeros', () => {
    const formatted = formatPrice(15000);
    expect(formatted).toBe('15000');
  });

  it('correctly formats half euro values with .5', () => {
    const formatted = formatPrice(65.4);
    expect(formatted).toBe('65.5');
  });

  it('handles 0 and negative inputs safely', () => {
    expect(formatPrice(0)).toBe('0');
    expect(formatPrice(-5)).toBeDefined();
  });
});

describe('Google Calendar Integration Service', () => {
  const dummyProgram: Program = {
    id: 'prog-1',
    provider_id: 'prov-1',
    category_id: 'cat-1',
    region_id: 'reg-1',
    title: 'Troodos-hegység és borászat túra',
    slug: 'troodos-hegyseg',
    short_description: 'Magyar nyelvű hegyi túra Cipruson.',
    description: 'Hosszú leírás a túráról...',
    location: 'Troodos, Ciprus',
    country: 'Ciprus',
    departure_location: 'Larnaca szálloda előtt',
    event_date: '2026-10-25',
    start_time: '09:00',
    end_time: '17:00',
    duration: '8 óra',
    price: 65,
    currency: 'EUR',
    pricing_mode: 'per_person',
    language: 'Magyar',
    included: ['Transzfer', 'Vezetés'],
    not_included: ['Ebéd'],
    max_participants: 16,
    status: 'published',
    featured: true,
    created_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  };

  const dummyOrder: Order = {
    id: 'ord-123',
    booking_reference: 'VG-2026-888999',
    program_id: 'prog-1',
    user_id: 'usr-1',
    participants_count: 2,
    total_price: 130,
    booking_fee: 13,
    onsite_amount: 130,
    currency: 'EUR',
    status: 'confirmed',
    is_manual: true,
    manual_customer_name: 'Nagy Anna',
    manual_customer_phone: '+36301234567',
    manual_customer_email: 'anna@example.com',
    event_date: '2026-10-25',
    start_time: '09:00',
    created_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  };

  it('builds calendar event payload with correct title and details', () => {
    const payload = buildCalendarEventPayload(dummyOrder, dummyProgram);
    expect(payload.title).toContain('Troodos');
    expect(payload.startDateStr).toBe('2026-10-25');
    expect(payload.startTimeStr).toBe('09:00');
  });

  it('generates a valid Google Calendar URL', () => {
    const payload = buildCalendarEventPayload(dummyOrder, dummyProgram);
    const url = generateGoogleCalendarUrl(payload);
    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain('Troodos');
  });

  it('generates valid iCalendar (.ics) content', () => {
    const payload = buildCalendarEventPayload(dummyOrder, dummyProgram);
    const ics = generateIcsContent(payload);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
