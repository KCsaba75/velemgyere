import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  Banknote,
  Wallet,
  CalendarDays,
  User,
  MapPin,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Phone,
  ExternalLink
} from 'lucide-react';
import { Order, Program, ProgramOccurrence, OrderBuyerInfo, OnsitePaymentMethod } from '../types/database';
import { formatPrice, getBookingReference } from '../context/AppContext';
import { buildCalendarEventPayload, openGoogleCalendar } from '../services/googleCalendarService';

interface ProviderBookingsCalendarProps {
  orders: Order[];
  programs: Program[];
  occurrencesMap: Record<string, ProgramOccurrence>;
  buyerInfos: Record<string, OrderBuyerInfo>;
  onConfirmOrder: (orderId: string) => Promise<void>;
  confirmingOrderId: string | null;
  onRescheduleOrder: (orderId: string) => void;
  onOpenProgramDetail?: (slug: string) => void;
  onSelectOrder?: (order: Order) => void;
  onOpenManualBooking?: (programId?: string) => void;
}

const PAYMENT_METHOD_LABEL: Record<OnsitePaymentMethod, string> = {
  cash: 'Készpénz',
  revolut: 'Revolut',
};

const WEEKDAYS = [
  { short: 'H', label: 'Hétfő' },
  { short: 'K', label: 'Kedd' },
  { short: 'Sze', label: 'Szerda' },
  { short: 'Cs', label: 'Csütörtök' },
  { short: 'P', label: 'Péntek' },
  { short: 'Szo', label: 'Szombat' },
  { short: 'V', label: 'Vasárnap' },
];

function getOrderDateStr(order: Order, program?: Program, occurrence?: ProgramOccurrence): string | null {
  const raw = occurrence?.event_date || program?.event_date;
  if (raw) {
    return raw.includes('T') ? raw.split('T')[0] : raw;
  }
  if (order.created_at) {
    return order.created_at.includes('T') ? order.created_at.split('T')[0] : order.created_at;
  }
  return null;
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export const ProviderBookingsCalendar: React.FC<ProviderBookingsCalendarProps> = ({
  orders,
  programs,
  occurrencesMap,
  buyerInfos,
  onConfirmOrder,
  confirmingOrderId,
  onRescheduleOrder,
  onOpenProgramDetail,
  onSelectOrder,
  onOpenManualBooking,
}) => {
  // Programs map
  const programMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach(p => map.set(p.id, p));
    return map;
  }, [programs]);

  // Orders enriched with target date
  const enrichedOrders = useMemo(() => {
    return orders.map(order => {
      const program = programMap.get(order.program_id) || order.program;
      const occ = order.occurrence_id ? occurrencesMap[order.occurrence_id] : undefined;
      const dateStr = getOrderDateStr(order, program, occ);
      const timeStr = occ?.start_time || program?.start_time || null;
      return {
        order,
        program,
        occ,
        dateStr,
        timeStr,
      };
    });
  }, [orders, programMap, occurrencesMap]);

  // Initial month determination: find nearest or current booking date, or current date
  const initialDate = useMemo(() => {
    const today = new Date();
    // Check if there are bookings in the current month or upcoming
    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
    const futureOrPresent = enrichedOrders
      .filter(o => o.dateStr && o.dateStr >= todayStr)
      .sort((a, b) => (a.dateStr! > b.dateStr! ? 1 : -1));

    if (futureOrPresent.length > 0 && futureOrPresent[0].dateStr) {
      const parts = futureOrPresent[0].dateStr.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }

    // Otherwise check latest booking
    const withDate = enrichedOrders.filter(o => !!o.dateStr);
    if (withDate.length > 0) {
      const latest = withDate.sort((a, b) => (b.dateStr! > a.dateStr! ? 1 : -1))[0];
      if (latest.dateStr) {
        const parts = latest.dateStr.split('-');
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }

    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [enrichedOrders]);

  const [currentYear, setCurrentYear] = useState<number>(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => initialDate.getMonth()); // 0-indexed

  // Filters
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter(item => {
      if (selectedProgramId !== 'all' && item.order.program_id !== selectedProgramId) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && item.order.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedOrders, selectedProgramId, selectedStatusFilter]);

  // Group filtered orders by date string YYYY-MM-DD
  const ordersByDate = useMemo(() => {
    const map = new Map<string, typeof filteredOrders>();
    filteredOrders.forEach(item => {
      if (!item.dateStr) return;
      const list = map.get(item.dateStr) || [];
      list.push(item);
      map.set(item.dateStr, list);
    });
    return map;
  }, [filteredOrders]);

  // Default selected date: find first day with bookings in the current view, or today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
    return todayStr;
  });

  // Calculate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Day of week: 0 is Sunday, 1 is Monday... In Hungary Monday is 1, Sunday is 7
    let startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun, 1 is Mon
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 for Mon, 6 for Sun

    const totalDays = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;

    // Fill previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${padZero(prevM + 1)}-${padZero(d)}`;
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Fill current month
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(d)}`;
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Fill next month up to complete weeks (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${padZero(nextM + 1)}-${padZero(d)}`;
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;
    setSelectedDateStr(todayStr);
  };

  // Month name formatting in Hungarian
  const monthName = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    const month = date.toLocaleDateString('hu-HU', { month: 'long' });
    return `${currentYear}. ${month.charAt(0).toUpperCase() + month.slice(1)}`;
  }, [currentYear, currentMonth]);

  // Visible month statistics
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${padZero(currentMonth + 1)}`;
    const monthOrders = filteredOrders.filter(o => o.dateStr?.startsWith(prefix));
    const totalCount = monthOrders.length;
    const confirmedCount = monthOrders.filter(o => o.order.status === 'confirmed').length;
    const pendingCount = monthOrders.filter(o => o.order.status === 'pending').length;
    const totalParticipants = monthOrders
      .filter(o => o.order.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.order.participants_count || 0), 0);
    const totalOnsiteRevenue = monthOrders
      .filter(o => o.order.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.order.onsite_amount || 0), 0);

    return {
      totalCount,
      confirmedCount,
      pendingCount,
      totalParticipants,
      totalOnsiteRevenue,
      hasPending: pendingCount > 0,
    };
  }, [filteredOrders, currentYear, currentMonth]);

  // Selected date bookings
  const selectedDateOrders = useMemo(() => {
    return ordersByDate.get(selectedDateStr) || [];
  }, [ordersByDate, selectedDateStr]);

  // Jump to next booking if available
  const handleJumpToNearestBooking = () => {
    const todayStr = `${new Date().getFullYear()}-${padZero(new Date().getMonth() + 1)}-${padZero(new Date().getDate())}`;
    // Find closest future booking, or any booking
    const sorted = [...filteredOrders]
      .filter(o => !!o.dateStr)
      .sort((a, b) => a.dateStr!.localeCompare(b.dateStr!));

    const future = sorted.find(o => o.dateStr! >= todayStr);
    const target = future || sorted[0];

    if (target && target.dateStr) {
      const parts = target.dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      setCurrentYear(y);
      setCurrentMonth(m);
      setSelectedDateStr(target.dateStr);
    }
  };

  // Format selected date nicely
  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  // Days in this month with bookings
  const daysInMonthWithBookings = useMemo(() => {
    const prefix = `${currentYear}-${padZero(currentMonth + 1)}`;
    const dates = Array.from(ordersByDate.keys())
      .filter(d => d.startsWith(prefix))
      .sort();
    return dates;
  }, [ordersByDate, currentYear, currentMonth]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Navigation Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Előző hónap"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                title="Előző hónap"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Ma
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Következő hónap"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                title="Következő hónap"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0 hidden sm:block" />
              <h3 className="font-display text-lg sm:text-xl font-extrabold text-stone-900">
                {monthName}
              </h3>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Program selector if multiple programs */}
            {programs.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedProgramId}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-stone-800 outline-none cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
                >
                  <option value="all">Minden program</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status pills */}
            <div className="inline-flex items-center p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedStatusFilter === 'all'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'hover:text-stone-900'
                }`}
              >
                Mind ({enrichedOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('confirmed')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatusFilter === 'confirmed'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'hover:text-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Megerősítve</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatusFilter === 'pending'
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'hover:text-amber-800'
                }`}
              >
                <Clock3 className="w-3 h-3" />
                <span>Függőben</span>
              </button>
            </div>

            {/* Külső foglalás rögzítése gomb a naptár fejlécében */}
            {onOpenManualBooking && (
              <button
                type="button"
                onClick={() => onOpenManualBooking(selectedProgramId !== 'all' ? selectedProgramId : undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                title="Telefonos vagy egyéb külső foglalás felvétele erre a programra vagy általánosan"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>+ Új külső foglalás</span>
              </button>
            )}

          </div>
        </div>

        {/* Monthly Summary Bar - 4 doboz pontosan 1 sorban */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 border-t border-stone-100">
          <div className="bg-stone-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 border border-stone-100 text-center sm:text-left min-w-0">
            <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate leading-tight">
              Havi foglalások
            </span>
            <span className="text-xs sm:text-lg font-bold text-stone-900 leading-tight block mt-0.5">
              {monthStats.totalCount} <span className="text-[9px] sm:text-xs font-normal text-stone-500">db</span>
            </span>
          </div>

          <div className="bg-emerald-50/70 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 border border-emerald-100 text-center sm:text-left min-w-0">
            <span className="text-[9px] sm:text-[11px] font-medium text-emerald-800 block truncate leading-tight">
              Megerősítve
            </span>
            <span className="text-xs sm:text-lg font-bold text-emerald-900 leading-tight block mt-0.5">
              {monthStats.confirmedCount} <span className="text-[9px] sm:text-xs font-normal text-emerald-700">db</span>
            </span>
          </div>

          <div className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 border text-center sm:text-left min-w-0 ${
            monthStats.pendingCount > 0
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-stone-50 border-stone-100 text-stone-600'
          }`}>
            <span className="text-[9px] sm:text-[11px] font-medium block truncate leading-tight">
              Visszaigazolásra vár
            </span>
            <span className="text-xs sm:text-lg font-bold leading-tight block mt-0.5">
              {monthStats.pendingCount} <span className="text-[9px] sm:text-xs font-normal opacity-75">db</span>
            </span>
          </div>

          <div className="bg-stone-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 border border-stone-100 text-center sm:text-left min-w-0">
            <span className="text-[9px] sm:text-[11px] font-medium text-stone-500 block truncate leading-tight">
              Helyszínen várható
            </span>
            <span className="text-xs sm:text-lg font-bold text-stone-900 leading-tight block mt-0.5 truncate">
              {formatPrice(monthStats.totalOnsiteRevenue)} <span className="text-[9px] sm:text-xs font-normal text-stone-500">EUR</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar + Day Agenda Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (Columns 1-7 on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 bg-stone-100 border-b border-stone-200 text-center py-2.5">
            {WEEKDAYS.map((day, idx) => (
              <div key={idx} className="text-xs font-bold text-stone-600">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.label}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 border-b border-stone-200">
            {calendarDays.map((dayItem, index) => {
              const dayBookings = ordersByDate.get(dayItem.dateStr) || [];
              const hasBookings = dayBookings.length > 0;
              const hasPending = dayBookings.some(b => b.order.status === 'pending');
              const isSelected = dayItem.dateStr === selectedDateStr;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDateStr(dayItem.dateStr)}
                  className={`min-h-[72px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    !dayItem.isCurrentMonth
                      ? 'bg-stone-50/60 text-stone-400'
                      : isSelected
                      ? 'bg-emerald-50/40 ring-2 ring-emerald-600 ring-inset z-10'
                      : 'bg-white hover:bg-stone-50/80 text-stone-800'
                  }`}
                >
                  {/* Day number header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        dayItem.isToday
                          ? 'bg-stone-900 text-white font-extrabold shadow-xs'
                          : isSelected && dayItem.isCurrentMonth
                          ? 'text-emerald-700 font-extrabold'
                          : !dayItem.isCurrentMonth
                          ? 'text-stone-400'
                          : 'text-stone-700'
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {/* Pending badge alert or booking count badge */}
                    {hasBookings && (
                      <div className="flex items-center gap-1">
                        {hasPending && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                            title="Visszaigazolásra váró foglalás!"
                          />
                        )}
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            hasPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {dayBookings.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Booking pills / preview */}
                  <div className="mt-1 space-y-1">
                    {/* Compact dot indicator for mobile */}
                    <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                      {dayBookings.slice(0, 3).map((item, bIdx) => (
                        <span
                          key={bIdx}
                          className={`w-2 h-2 rounded-full ${
                            item.order.status === 'confirmed'
                              ? 'bg-emerald-500'
                              : item.order.status === 'pending'
                              ? 'bg-amber-500'
                              : 'bg-stone-300'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Desktop booking pills */}
                    <div className="hidden sm:block space-y-1">
                      {dayBookings.slice(0, 2).map((item, bIdx) => {
                        const isPending = item.order.status === 'pending';
                        return (
                          <div
                            key={bIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(dayItem.dateStr);
                              onSelectOrder?.(item.order);
                            }}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border leading-tight cursor-pointer hover:opacity-80 transition-opacity ${
                              isPending
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : item.order.status === 'confirmed'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-stone-100 border-stone-200 text-stone-500'
                            }`}
                            title={`${item.program?.title || 'Program'} - ${item.order.participants_count} fő (Kattints a részletekért)`}
                          >
                            <span className="font-bold mr-1">
                              {item.timeStr || `${item.order.participants_count} fő`}
                            </span>
                            <span>{item.program?.title || 'Program'}</span>
                          </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <div className="text-[9px] font-bold text-stone-500 pl-1">
                          +{dayBookings.length - 2} további
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend and Helper */}
          <div className="p-3 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-3">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Megerősítve</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Visszaigazolásra vár</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <span>Lemondva</span>
              </span>
            </div>

            {daysInMonthWithBookings.length > 0 && (
              <div className="text-[11px] text-stone-500">
                Foglalt napok a hónapban:{' '}
                <span className="font-bold text-stone-700">{daysInMonthWithBookings.length} nap</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Day Details Panel (Columns 8-12 on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Header with selected date */}
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-emerald-400 block uppercase tracking-wider">
                  Kiválasztott Nap
                </span>
                <h4 className="font-display text-base sm:text-lg font-bold capitalize">
                  {formattedSelectedDate}
                </h4>
              </div>
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {selectedDateOrders.length} foglalás
              </span>
            </div>

            {/* List of bookings on the selected date */}
            <div className="p-4 sm:p-5">
              {selectedDateOrders.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateOrders.map(item => {
                    const { order, program, occ, timeStr } = item;
                    const buyer = buyerInfos[order.id];
                    const isPending = order.status === 'pending';

                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder?.(order)}
                        className={`rounded-2xl border p-4 space-y-3 transition-all cursor-pointer hover:border-emerald-400 hover:shadow-xs group ${
                          isPending
                            ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                            : order.status === 'confirmed'
                            ? 'bg-stone-50/50 border-stone-200'
                            : 'bg-stone-100/50 border-stone-200 opacity-70'
                        }`}
                      >
                        {/* Title and reference */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
                                #{getBookingReference(order)}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  order.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : order.status === 'pending'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-stone-100 text-stone-500'
                                }`}
                              >
                                {order.status === 'confirmed'
                                  ? 'Megerősítve'
                                  : order.status === 'pending'
                                  ? 'Visszaigazolásra vár'
                                  : 'Lemondva'}
                              </span>

                              {/* Külső foglalás forrás jelző */}
                              {order.source && order.source !== 'platform' && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                  {order.source === 'phone' && '📞 Telefon'}
                                  {order.source === 'whatsapp' && '💬 WhatsApp'}
                                  {order.source === 'onsite' && '🤝 Személyes'}
                                  {order.source === 'email' && '✉️ Email'}
                                  {order.source === 'external' && '📝 Külső'}
                                </span>
                              )}
                            </div>
                            <h5
                              onClick={(e) => {
                                if (program?.slug && onOpenProgramDetail) {
                                  e.stopPropagation();
                                  onOpenProgramDetail(program.slug);
                                }
                              }}
                              className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              {program?.title || 'Program'}
                            </h5>
                          </div>
                        </div>

                        {/* Timing and location */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                          {timeStr && (
                            <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-bold text-stone-800">{timeStr}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200">
                            <Users className="w-3.5 h-3.5 text-stone-500" />
                            <span className="font-bold text-stone-800">{order.participants_count} fő</span>
                          </span>
                          {program?.location && (
                            <span className="inline-flex items-center gap-1 text-stone-500 text-[11px] truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{program.location}</span>
                            </span>
                          )}
                        </div>

                        {/* Buyer Info */}
                        <div className="bg-white rounded-xl p-3 border border-stone-200/90 text-xs text-stone-700 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-900">
                            <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{order.manual_customer_name || (buyer ? buyer.name : 'Programvadász')}</span>
                            {order.manual_customer_phone && (
                              <span className="text-emerald-700 font-bold ml-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                📞 {order.manual_customer_phone}
                              </span>
                            )}
                            {(order.manual_customer_email || buyer?.email) && (
                              <span className="text-stone-400 font-normal">({order.manual_customer_email || buyer?.email})</span>
                            )}
                          </div>
                          {order.source_notes && (
                            <p className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/70 mt-1">
                              <strong>Megjegyzés:</strong> {order.source_notes}
                            </p>
                          )}
                        </div>

                        {/* Onsite Financial Details */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-stone-500 block">Helyszínen fizetendő:</span>
                            <span className="font-bold text-stone-900 text-sm">
                              {formatPrice(order.onsite_amount)} {order.currency === 'EUR' ? '€' : order.currency}
                            </span>
                            {order.onsite_payment_method && (
                              <span className="inline-flex items-center gap-1 ml-2 text-[11px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                                {order.onsite_payment_method === 'revolut' ? (
                                  <Wallet className="w-3 h-3" />
                                ) : (
                                  <Banknote className="w-3 h-3" />
                                )}
                                {PAYMENT_METHOD_LABEL[order.onsite_payment_method]}
                              </span>
                            )}
                          </div>

                          {order.booking_fee > 0 && (
                            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 self-end">
                              ✓ Kényelmi díj rendezve
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200/60">
                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmOrder(order.id);
                              }}
                              disabled={confirmingOrderId === order.id}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {confirmingOrderId === order.id
                                  ? 'Visszaigazolás...'
                                  : 'Foglalás visszaigazolása'}
                              </span>
                            </button>
                          )}

                          {order.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRescheduleOrder(order.id);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
                              <span>Áthelyezés</span>
                            </button>
                          )}

                          {/* Google Naptár gomb */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const payload = buildCalendarEventPayload(
                                order,
                                program,
                                occ,
                                null,
                                buyer ? { name: buyer.name, email: buyer.email } : null,
                                { isProvider: true }
                              );
                              openGoogleCalendar(payload);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Foglalás megnyitása Google Naptárban"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Google Naptár</span>
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder?.(order);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Megtekintés</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-800 text-sm">
                      Nincs foglalás erre a napra
                    </h5>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Kattints egy másik napra a naptárban, vagy ugorj a legközelebbi aktív időpontra!
                    </p>
                  </div>

                  {daysInMonthWithBookings.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-stone-500 block mb-2">
                        Gyors ugrás e havi foglalt napokra:
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto">
                        {daysInMonthWithBookings.map(dStr => {
                          const dayNum = parseInt(dStr.split('-')[2], 10);
                          const count = (ordersByDate.get(dStr) || []).length;
                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() => setSelectedDateStr(dStr)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              {dayNum}. nap ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
