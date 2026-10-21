import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '../components/NotificationBell';
import type { Order, Program, Profile } from '../types/database';

const mockUseApp = vi.fn();
vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
  getBookingReference: (order: Order) => order.booking_reference || order.id,
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    booking_reference: 'VG-2026-111222',
    program_id: 'prog-1',
    user_id: 'user-1',
    participants_count: 2,
    total_price: 130,
    booking_fee: 13,
    status: 'confirmed',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
    ...overrides,
  };
}

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog-1',
    provider_id: 'prov-1',
    category_id: 'cat-1',
    region_id: 'reg-1',
    title: 'Troodos-hegység és borászat túra',
    slug: 'troodos-hegyseg',
    short_description: 'Magyar nyelvű hegyi túra Cipruson.',
    location: 'Troodos, Ciprus',
    country: 'Ciprus',
    event_date: '2026-10-25',
    duration: '8 óra',
    price: 65,
    currency: 'EUR',
    pricing_mode: 'per_person',
    language: 'Magyar',
    status: 'published',
    featured: true,
    created_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
    ...overrides,
  };
}

function baseAppContext(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: true,
    currentUser: { id: 'user-1', role: 'visitor', name: 'Teszt Elek' } as Profile,
    orders: [] as Order[],
    programs: [] as Program[],
    unreadBookingMessageCounts: {} as Record<string, number>,
    totalUnreadBookingMessageCount: 0,
    openLoginModal: vi.fn(),
    setCurrentView: vi.fn(),
    ...overrides,
  };
}

describe('NotificationBell -- fejléc értesítési csengő', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
  });

  it('olvasatlan üzenet nélkül megjeleníti a csengő ikont jelvény nélkül', () => {
    mockUseApp.mockReturnValue(baseAppContext({ totalUnreadBookingMessageCount: 0 }));
    render(<NotificationBell onSelectOrder={() => {}} />);

    const bellBtn = screen.getByRole('button', { name: /Értesítések/i });
    expect(bellBtn).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('ha érkezett szolgáltatói üzenet, piros jelvényben mutatja az olvasatlan üzenetek számát', () => {
    mockUseApp.mockReturnValue(baseAppContext({
      totalUnreadBookingMessageCount: 2,
      unreadBookingMessageCounts: { 'ord-1': 2 },
      orders: [makeOrder()],
      programs: [makeProgram()],
    }));

    render(<NotificationBell onSelectOrder={() => {}} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('a csengőre kattintva lenyílik az értesítési panel és megjeleníti a foglaláshoz tartozó üzenetet', async () => {
    const order = makeOrder();
    const program = makeProgram();
    mockUseApp.mockReturnValue(baseAppContext({
      totalUnreadBookingMessageCount: 1,
      unreadBookingMessageCounts: { 'ord-1': 1 },
      orders: [order],
      programs: [program],
    }));

    const onSelectOrder = vi.fn();
    const user = userEvent.setup();
    render(<NotificationBell onSelectOrder={onSelectOrder} />);

    // Click bell
    const bellBtn = screen.getByRole('button', { name: /Értesítések/i });
    await user.click(bellBtn);

    // Popover is open
    expect(screen.getByText('Értesítések')).toBeInTheDocument();
    expect(screen.getByText('Troodos-hegység és borászat túra')).toBeInTheDocument();
    expect(screen.getByText('#VG-2026-111222')).toBeInTheDocument();
    expect(screen.getAllByText(/1 új üzenet/i)[0]).toBeInTheDocument();

    // Click order item in popover
    await user.click(screen.getByText('Troodos-hegység és borászat túra'));
    expect(onSelectOrder).toHaveBeenCalledWith(order);
  });
});
